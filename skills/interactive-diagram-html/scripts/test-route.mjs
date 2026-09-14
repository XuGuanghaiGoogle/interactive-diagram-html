#!/usr/bin/env node
// 走线回归测试：16 种端口组合 × 多种相对位置，检查端口朝向、直角、不穿过两端方块、端点准确。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const block = fs.readFileSync(path.join(HERE, 'route-block.js'), 'utf8');
const N = new Map();
function port(ref) {
  const [id, s = 'r'] = String(ref).split(':'); const n = N.get(id);
  if (!n) return null;
  if (s === 'l') return { x: n.x, y: n.cy };
  if (s === 'r') return { x: n.x + n.w, y: n.cy };
  if (s === 't') return { x: n.cx, y: n.y };
  return { x: n.cx, y: n.y + n.h };
}
const nodeOf = id => N.get(id);
const route = new Function('port', 'nodeOf', block + '\nreturn route;')(port, nodeOf);

const W = 260, H = 50;
const put = (id, x, y) => N.set(id, { x, y, w: W, h: H, cx: x + W / 2, cy: y + H / 2 });
// B 相对 A 的位置：同列上下（紧贴 / 有间距）、同行左右、斜向、部分重叠列
const POS = {
  '同列下方(间距8)': [0, 58], '同列上方(间距8)': [0, -58], '同列下方(间距100)': [0, 150],
  '同行右侧': [300, 0], '同行左侧': [-300, 0], '同行右侧(间距8)': [268, 0], '同行左侧(间距8)': [-268, 0], '同列下方(间距30)': [0, 80],
  '右下': [300, 120], '左下': [-300, 120], '右上': [300, -120], '左上': [-300, -120],
  '错位下方': [100, 80], '错位上方': [-100, -80]
};
const SIDES = ['l', 'r', 't', 'b'];
const dirOk = (p, n, s) => s === 'r' ? n.x > p.x : s === 'l' ? n.x < p.x : s === 'b' ? n.y > p.y : n.y < p.y;
function hits(u, v, b) {
  const x0 = b.x + 1, x1 = b.x + b.w - 1, y0 = b.y + 1, y1 = b.y + b.h - 1;
  if (u.y === v.y) return u.y > y0 && u.y < y1 && Math.max(u.x, v.x) > x0 && Math.min(u.x, v.x) < x1;
  return u.x > x0 && u.x < x1 && Math.max(u.y, v.y) > y0 && Math.min(u.y, v.y) < y1;
}
let fail = 0, total = 0;
for (const [name, [dx, dy]] of Object.entries(POS)) {
  put('A', 1000, 1000); put('B', 1000 + dx, 1000 + dy);
  for (const sa of SIDES) for (const sb of SIDES) {
    total++;
    const e = { from: `A:${sa}`, to: `B:${sb}` };
    const pts = route(e); const p1 = port(e.from), p2 = port(e.to);
    const probs = [];
    if (!pts || pts.length < 2) probs.push('无路线');
    else {
      if (pts[0].x !== p1.x || pts[0].y !== p1.y) probs.push('起点不在所选端口');
      const z = pts[pts.length - 1]; if (z.x !== p2.x || z.y !== p2.y) probs.push('终点不在所选端口');
      if (!dirOk(p1, pts[1], sa)) probs.push('离开方向与起点端口不符');
      if (!dirOk(p2, pts[pts.length - 2], sb)) probs.push('进入方向与终点端口不符');
      for (let i = 0; i < pts.length - 1; i++) {
        const u = pts[i], v = pts[i + 1];
        if (u.x !== v.x && u.y !== v.y) probs.push(`第${i + 1}段非直角`);
        for (const id of ['A', 'B']) if (hits(u, v, N.get(id))) probs.push(`第${i + 1}段穿过${id}`);
      }
    }
    if (probs.length) { fail++; console.log(`✗ ${name} A:${sa}→B:${sb}  ${probs.join('、')}  ${JSON.stringify(pts)}`); }
  }
}
console.log(`${fail ? '✗' : '✓'} 走线测试 ${total - fail}/${total} 通过`);
process.exit(fail ? 1 : 0);
