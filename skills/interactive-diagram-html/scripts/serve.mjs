#!/usr/bin/env node
// 本地预览 + 保存服务：静态托管图解 HTML 所在目录，并接收页面「保存」写回 <名称>.data.json 后重新生成 HTML。
// 只监听 127.0.0.1，仅供本机编辑使用。
//
// 用法：node serve.mjs [目录，默认为当前目录] [端口，默认 8765]

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.argv[2] || process.cwd());
const PORT = Number(process.argv[3] || 8765);
const BUILD = path.join(HERE, 'build.mjs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function handleSave(req, res, url) {
  // 只接受同目录下的 html 文件名，防止路径穿越
  const page = path.basename(url.searchParams.get('page') || '');
  if (!/\.html?$/i.test(page)) return send(res, 400, JSON.stringify({ error: 'page 必须是 .html 文件名' }));
  const htmlPath = path.join(ROOT, page);
  const dataPath = path.join(ROOT, page.replace(/\.html?$/i, '.data.json'));
  if (!fs.existsSync(dataPath)) return send(res, 404, JSON.stringify({ error: `找不到 ${path.basename(dataPath)}` }));

  let body = '';
  req.on('data', c => { body += c; if (body.length > 20 * 1024 * 1024) req.destroy(); });
  req.on('end', () => {
    try { JSON.parse(body); } catch { return send(res, 400, JSON.stringify({ error: 'JSON 无法解析' })); }
    fs.copyFileSync(dataPath, dataPath + '.bak');
    fs.writeFileSync(dataPath, body, 'utf8');
    const r = spawnSync(process.execPath, [BUILD, dataPath, htmlPath, '--force'], { encoding: 'utf8' });
    const lines = ((r.stdout || '') + (r.stderr || '')).split(/\r?\n/);
    const warnings = lines.filter(l => /^[⚠✗]/.test(l));
    console.log(`保存: ${path.basename(dataPath)}（退出码 ${r.status}，警告 ${warnings.length}）`);
    send(res, 200, JSON.stringify({ ok: r.status === 0, warnings }));
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'POST' && url.pathname === '/__save') return handleSave(req, res, url);
  if (req.method !== 'GET') return send(res, 405, '{}');
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'Not found', 'text/plain');
  send(res, 200, fs.readFileSync(file), TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
}).listen(PORT, '127.0.0.1', () => {
  console.log(`图解编辑服务: http://localhost:${PORT}/  （目录 ${ROOT}）`);
});
