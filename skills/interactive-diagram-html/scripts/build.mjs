#!/usr/bin/env node
// 校验图解数据 JSON，并注入 assets/engine.html 生成单文件 HTML。零第三方依赖（Node ≥ 18）。
//
// 用法：
//   node build.mjs <data.json> <out.html> [--force] [--strict] [--check]
//     --force   允许覆盖已存在的输出文件（默认拒绝，防止误覆盖）
//     --strict  把警告当作错误（交付前用）
//     --check   只校验，不生成文件
//
// 路由算法必须与 assets/engine.html 中 ROUTE-BEGIN〜ROUTE-END 之间的 route() 保持一致，否则"连线穿过节点"的检测会失真。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.join(HERE, '..', 'assets', 'engine.html');

const argv = process.argv.slice(2);
const flags = new Set(argv.filter(a => a.startsWith('--')));
const [dataPath, outPath] = argv.filter(a => !a.startsWith('--'));
if (!dataPath || (!outPath && !flags.has('--check'))) {
  console.error('用法: node build.mjs <data.json> <out.html> [--force] [--strict] [--check]');
  process.exit(2);
}

// ---------- 读取 ----------
let raw, data;
try { raw = fs.readFileSync(dataPath, 'utf8'); }
catch (e) { console.error(`✗ 读不到数据文件: ${dataPath}`); process.exit(2); }
try { data = JSON.parse(raw.replace(/^\uFEFF/, '')); }
catch (e) {
  const m = /position (\d+)/.exec(e.message);
  if (m) {
    const pos = +m[1]; const before = raw.slice(0, pos);
    const line = before.split('\n').length; const col = pos - before.lastIndexOf('\n');
    console.error(`✗ JSON 语法错误（第 ${line} 行第 ${col} 列）: ${e.message}`);
  } else console.error(`✗ JSON 语法错误: ${e.message}`);
  process.exit(1);
}

const errors = [], warnings = [];
const err = m => errors.push(m), warn = m => warnings.push(m);

// ---------- 结构 ----------
if (!data.canvas || !(data.canvas.w > 0) || !(data.canvas.h > 0)) err('canvas.w / canvas.h 必须为正数');
const CW = data.canvas?.w || 0, CH = data.canvas?.h || 0;
const cats = data.categories || {};
const phaseLevels = new Set((data.phase?.levels || []).map(l => l.key));
if (data.phase) {
  if (!data.phase.label) warn('phase.label 为空，开关按钮会没有文字');
  (data.phase.dim || []).forEach(k => { if (!phaseLevels.has(k)) err(`phase.dim 中的 "${k}" 不在 phase.levels 里`); });
}

const N = new Map(); // id -> {x,y,w,h,cx,cy,group,node}
const ids = new Set();
function reg(id, o, kind) {
  if (!id) { err(`${kind} 缺少 id`); return; }
  if (ids.has(id)) err(`id 重复: "${id}"`);
  ids.add(id); N.set(id, o);
}
(data.groups || []).forEach(g => {
  ['x', 'y', 'w', 'h'].forEach(k => { if (typeof g[k] !== 'number') err(`group "${g.id}" 缺少数值 ${k}`); });
  reg(g.id, { x: g.x, y: g.y, w: g.w, h: g.h, cx: g.x + g.w / 2, cy: g.y + g.h / 2, group: true }, 'group');
});
const nodes = data.nodes || [];
if (!nodes.length) err('nodes 为空');
nodes.forEach(n => {
  ['x', 'y', 'w', 'h'].forEach(k => { if (typeof n[k] !== 'number') err(`node "${n.id}" 缺少数值 ${k}`); });
  if (!Array.isArray(n.d) || !n.d.length) err(`node "${n.id}" 缺少 d（图上显示的文字行）`);
  if (!n.t && (n.role || n.fn || n.sections || n.kv)) warn(`node "${n.id}" 缺少 t（面板标题）`);
  if (n.cat && !cats[n.cat]) err(`node "${n.id}" 的 cat "${n.cat}" 未在 categories 中定义`);
  if (n.phase && data.phase && !phaseLevels.has(n.phase.level)) err(`node "${n.id}" 的 phase.level "${n.phase.level}" 未在 phase.levels 中定义`);
  if (n.phase && !data.phase) warn(`node "${n.id}" 有 phase，但没有定义顶层 phase`);
  const clickable = n.role || n.fn || n.sections || n.kv;
  if (!clickable && n.shape !== 'note') warn(`node "${n.id}" 没有 role / fn，点击不会打开面板`);
  if (n.fn && n.fn.length && n.fn.length < 3) warn(`node "${n.id}" 的 fn 只有 ${n.fn.length} 条，说明可能过于单薄`);
  reg(n.id, { x: n.x, y: n.y, w: n.w, h: n.h, cx: n.x + n.w / 2, cy: n.y + n.h / 2, node: n }, 'node');
});

// uses 引用
nodes.forEach(n => (n.uses || []).forEach(k => { if (!N.has(k) || N.get(k).group) err(`node "${n.id}" 的 uses 指向不存在的节点 "${k}"`); }));

// ---------- 几何：越界 / 重叠 / 文字溢出 ----------
const tw = (s, size) => { let w = 0; for (const ch of String(s)) w += /[\u0020-\u00ff]/.test(ch) ? 0.58 : 1; return w * size; };
nodes.forEach(n => {
  if (n.x < 0 || n.y < 0 || n.x + n.w > CW || n.y + n.h > CH) warn(`node "${n.id}" 超出画布 (${CW}×${CH})`);
  const maxW = n.shape === 'diamond' ? n.w * 0.62 : n.w - 18;
  (n.d || []).forEach((line, i) => {
    if (tw(line, 8) > maxW) warn(`node "${n.id}" 第 ${i + 1} 行文字即使缩到 8px 仍放不下："${line}"（请缩短或加宽节点）`);
  });
  const lines = (n.d || []).length;
  if (lines * 15 + ((n.uses?.length || n.tags?.length) ? 14 : 0) > n.h) warn(`node "${n.id}" 高度 ${n.h} 放不下 ${lines} 行文字和标记`);
});
const inter = (a, b, pad = 2) => a.x < b.x + b.w - pad && b.x < a.x + a.w - pad && a.y < b.y + b.h - pad && b.y < a.y + a.h - pad;
for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
  if (inter(nodes[i], nodes[j])) warn(`节点重叠: "${nodes[i].id}" 与 "${nodes[j].id}"`);
}

// ---------- 连线 ----------
function port(ref) {
  const [id, s = 'r'] = String(ref).split(':'); const n = N.get(id);
  if (!n) return null;
  if (s === 'l') return { x: n.x, y: n.cy };
  if (s === 'r') return { x: n.x + n.w, y: n.cy };
  if (s === 't') return { x: n.cx, y: n.y };
  return { x: n.cx, y: n.y + n.h };
}
const nodeOf = id => N.get(id);
/* ROUTE-BEGIN：由 scripts/sync-route.mjs 从 scripts/route-block.js 注入 engine.html 与 build.mjs，两处必须一致，勿直接改 */
/* 直角走线：始终从起点端口的外侧出发、从终点端口的外侧进入，不改用户选的端口。
   手写 via / mx / my 优先；否则在候选路线中选不穿过两端方块、拐点最少、最短的一条。 */
function route(e){
  const G=20;
  const ia=String(e.from).split(':'),ib=String(e.to).split(':');
  const sa=ia[1]||'r',sb=ib[1]||'l';
  let p1=port(e.from),p2=port(e.to);if(!p1||!p2)return null;
  if(e.d1)p1={x:p1.x+(e.d1[0]||0),y:p1.y+(e.d1[1]||0)};
  if(e.d2)p2={x:p2.x+(e.d2[0]||0),y:p2.y+(e.d2[1]||0)};
  if(e.via)return[p1].concat(e.via.map(function(v){return{x:v[0],y:v[1]};})).concat([p2]);
  if(e.mx!=null)return[p1,{x:e.mx,y:p1.y},{x:e.mx,y:p2.y},p2];
  if(e.my!=null)return[p1,{x:p1.x,y:e.my},{x:p2.x,y:e.my},p2];
  const na=nodeOf(ia[0]),nb=nodeOf(ib[0]);
  /* 外伸段默认 G；若正前方紧挨着另一端的方块，缩短到空隙的一半，避免伸进对方 */
  function out(p,s,other){let d=G;
    if(other){
      if((s==='b'||s==='t')&&p.x>other.x&&p.x<other.x+other.w){const gap=s==='b'?other.y-p.y:p.y-(other.y+other.h);if(gap>=0&&gap<2*G)d=Math.max(1,gap/2);}
      if((s==='r'||s==='l')&&p.y>other.y&&p.y<other.y+other.h){const gap=s==='r'?other.x-p.x:p.x-(other.x+other.w);if(gap>=0&&gap<2*G)d=Math.max(1,gap/2);}
    }
    return{x:p.x+(s==='r'?d:s==='l'?-d:0),y:p.y+(s==='b'?d:s==='t'?-d:0)};}
  const o=out(p1,sa,nb),q=out(p2,sb,na);
  const boxes=[na,nb].filter(Boolean);
  const L=Math.min.apply(null,boxes.map(function(b){return b.x;}).concat([o.x,q.x]))-G;
  const R=Math.max.apply(null,boxes.map(function(b){return b.x+b.w;}).concat([o.x,q.x]))+G;
  const T=Math.min.apply(null,boxes.map(function(b){return b.y;}).concat([o.y,q.y]))-G;
  const B=Math.max.apply(null,boxes.map(function(b){return b.y+b.h;}).concat([o.y,q.y]))+G;
  const mx=(o.x+q.x)/2,my=(o.y+q.y)/2;
  /* 同为 4 点时先出现的优先：中线折线在前，保持 mx / my 默认取中点的旧行为 */
  const mids=[
    [{x:mx,y:o.y},{x:mx,y:q.y}],[{x:o.x,y:my},{x:q.x,y:my}],
    [{x:q.x,y:o.y}],[{x:o.x,y:q.y}],
    [{x:R,y:o.y},{x:R,y:q.y}],[{x:L,y:o.y},{x:L,y:q.y}],
    [{x:o.x,y:B},{x:q.x,y:B}],[{x:o.x,y:T},{x:q.x,y:T}]
  ];
  function simplify(pts){
    const a=[];pts.forEach(function(p){const l=a[a.length-1];if(!l||l.x!==p.x||l.y!==p.y)a.push(p);});
    for(let i=a.length-2;i>0;i--){const u=a[i-1],v=a[i],w=a[i+1];
      if((u.x===v.x&&v.x===w.x)||(u.y===v.y&&v.y===w.y))a.splice(i,1);}
    return a;
  }
  function hits(u,v,b){
    const x0=b.x+1,x1=b.x+b.w-1,y0=b.y+1,y1=b.y+b.h-1;
    if(u.y===v.y)return u.y>y0&&u.y<y1&&Math.max(u.x,v.x)>x0&&Math.min(u.x,v.x)<x1;
    return u.x>x0&&u.x<x1&&Math.max(u.y,v.y)>y0&&Math.min(u.y,v.y)<y1;
  }
  function ok(pts){
    for(let i=0;i<pts.length-1;i++){const u=pts[i],v=pts[i+1];
      if(u.x!==v.x&&u.y!==v.y)return false;
      for(let k=0;k<boxes.length;k++)if(hits(u,v,boxes[k]))return false;}
    /* 离开起点、进入终点的方向必须与端口朝向一致 */
    const s1=pts[1],s2=pts[pts.length-2];
    const dirOk=function(p,n,s){return s==='r'?n.x>p.x:s==='l'?n.x<p.x:s==='b'?n.y>p.y:n.y<p.y;};
    return dirOk(p1,s1,sa)&&dirOk(p2,s2,sb);
  }
  function len(pts){let s=0;for(let i=0;i<pts.length-1;i++)s+=Math.abs(pts[i].x-pts[i+1].x)+Math.abs(pts[i].y-pts[i+1].y);return s;}
  let best=null;
  mids.forEach(function(m){
    const pts=simplify([p1,o].concat(m,[q,p2]));
    if(pts.length<2||!ok(pts))return;
    if(!best||pts.length<best.length||(pts.length===best.length&&len(pts)<len(best)))best=pts;
  });
  return best||simplify([p1,o,{x:R,y:o.y},{x:R,y:q.y},q,p2]);
}
/* ROUTE-END */
const SIDES = new Set(['l', 'r', 't', 'b']);
(data.edges || []).forEach((e, idx) => {
  const tag = `edge #${idx + 1} (${e.from} → ${e.to})`;
  for (const ref of [e.from, e.to]) {
    const [id, s] = String(ref || '').split(':');
    if (!N.has(id)) { err(`${tag}: 端点 "${id}" 不存在`); return; }
    if (s && !SIDES.has(s)) err(`${tag}: 方位 "${s}" 只能是 l / r / t / b`);
  }
  const pts = route(e); if (!pts) return;
  const ends = new Set([String(e.from).split(':')[0], String(e.to).split(':')[0]]);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (a.x !== b.x && a.y !== b.y) { warn(`${tag}: 第 ${i + 1} 段不是直角走线（${a.x},${a.y}）→（${b.x},${b.y}），请补 via 拐点`); continue; }
    for (const n of nodes) {
      if (ends.has(n.id)) continue;
      const r = { x: n.x + 3, y: n.y + 3, w: n.w - 6, h: n.h - 6 };
      const hit = a.y === b.y
        ? (a.y > r.y && a.y < r.y + r.h && Math.max(a.x, b.x) > r.x && Math.min(a.x, b.x) < r.x + r.w)
        : (a.x > r.x && a.x < r.x + r.w && Math.max(a.y, b.y) > r.y && Math.min(a.y, b.y) < r.y + r.h);
      if (hit) warn(`${tag}: 穿过节点 "${n.id}"，请调整 mx / my / via 让它走空隙`);
    }
  }
  if (e.label) {
    const m = e.lp ?? Math.max(0, Math.floor(pts.length / 2) - 1);
    const A = pts[m], B = pts[m + 1] || pts[m];
    const lx = e.lx ?? (A.x + B.x) / 2, ly = e.ly ?? (A.y + B.y) / 2, lw = tw(e.label, 11) + 12;
    const lr = { x: lx - lw / 2, y: ly - 9, w: lw, h: 18 };
    for (const n of nodes) if (inter(lr, n, 1)) warn(`${tag}: 标签 "${e.label}" 压在节点 "${n.id}" 上，请用 lx / ly 挪开`);
  }
});

// ---------- 其他引用 ----------
(data.bands || []).forEach(b => { if (!Array.isArray(b.rect) || b.rect.length !== 4) err(`band "${b.label}" 的 rect 必须是 [x,y,w,h]`); });
(data.tables || []).forEach((tb, ti) => {
  const tag = `table #${ti + 1}「${tb.title || ''}」`;
  if (tb.type === 'phase' || tb.type === 'uses') {
    (tb.groups || []).forEach(g => (g.ids || []).forEach(id => {
      if (!N.has(id) || N.get(id).group) err(`${tag}: ids 中的 "${id}" 不是节点`);
      else if (tb.type === 'phase' && !N.get(id).node.phase) warn(`${tag}: 节点 "${id}" 没有 phase，不会出现在表里`);
    }));
    if (tb.type === 'uses') (tb.targets || []).forEach(k => { if (!N.has(k)) err(`${tag}: targets 中的 "${k}" 不存在`); });
  } else {
    const cols = (tb.columns || []).length;
    (tb.rows || []).forEach((r, ri) => {
      if (r.go && !N.has(r.go)) err(`${tag}: 第 ${ri + 1} 行 go "${r.go}" 不存在`);
      if (r.cells && r.cells.length !== cols) warn(`${tag}: 第 ${ri + 1} 行有 ${r.cells.length} 列，表头是 ${cols} 列`);
    });
  }
});

// ---------- 报告 ----------
for (const m of errors) console.error('✗ ' + m);
for (const m of warnings) console.warn('⚠ ' + m);
const summary = `节点 ${nodes.length} / 连线 ${(data.edges || []).length} / 分组 ${(data.groups || []).length} / 表格 ${(data.tables || []).length} — 错误 ${errors.length}，警告 ${warnings.length}`;
if (errors.length || (flags.has('--strict') && warnings.length)) {
  console.error(`✗ 校验未通过：${summary}`);
  process.exit(1);
}
if (flags.has('--check')) { console.log(`✓ 校验通过：${summary}`); process.exit(0); }

// ---------- 生成 ----------
const abs = path.resolve(outPath);
if (fs.existsSync(abs) && !flags.has('--force')) {
  console.error(`✗ 输出文件已存在，拒绝覆盖: ${abs}\n  如确认要覆盖，请加 --force；否则换一个文件名。`);
  process.exit(1);
}
const tpl = fs.readFileSync(ENGINE, 'utf8');
const title = String(data.meta?.title || data.meta?.heading || 'Diagram').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const html = tpl
  .replace('<title>__TITLE__</title>', `<title>${title}</title>`)
  .replace('<html lang="ja">', `<html lang="${data.meta?.lang || 'ja'}">`)
  .replace('/*__DATA__*/null', () => json);
fs.mkdirSync(path.dirname(abs), { recursive: true });
fs.writeFileSync(abs, html, 'utf8');
console.log(`✓ 已生成：${abs}\n  ${summary}`);
