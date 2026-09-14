#!/usr/bin/env node
// 把 route-block.js 注入 engine.html 与 build.mjs 的 ROUTE-BEGIN〜ROUTE-END 之间，保证两处走线算法一致。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const block = fs.readFileSync(path.join(HERE, 'route-block.js'), 'utf8').trim();
const RE = /\/\* ROUTE-BEGIN[\s\S]*?\/\* ROUTE-END \*\//;
for (const f of [path.join(HERE, '..', 'assets', 'engine.html'), path.join(HERE, 'build.mjs')]) {
  const src = fs.readFileSync(f, 'utf8');
  if (!RE.test(src)) { console.error(`✗ ${path.basename(f)} 中找不到 ROUTE-BEGIN / ROUTE-END`); process.exit(1); }
  fs.writeFileSync(f, src.replace(RE, () => block));
  console.log(`✓ 已同步 ${path.basename(f)}`);
}
