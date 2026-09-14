# AGENTS.md

这个工具用对话生成交互式图解 HTML，面向 Codex、Claude Code 以及任何能执行 shell 的编码 agent。

## 正本

行为指令的正本是 [skills/interactive-diagram-html/SKILL.md](skills/interactive-diagram-html/SKILL.md)，本文件不重复其中的内容。

| 文件 | 作用 |
| --- | --- |
| `skills/interactive-diagram-html/SKILL.md` | agent 行为指令：何时使用、提问顺序、内容要求、交付前检查 |
| `skills/interactive-diagram-html/assets/engine.html` | 交互引擎。不要按单次需求修改它 |
| `skills/interactive-diagram-html/scripts/build.mjs` | 校验数据并生成 HTML，零第三方依赖 |
| `skills/interactive-diagram-html/scripts/serve.mjs` | 编辑模式的本地预览 + 保存服务（只监听 127.0.0.1） |
| `skills/interactive-diagram-html/scripts/route-block.js` | 走线算法正本，由 `sync-route.mjs` 注入 engine.html 与 build.mjs |
| `skills/interactive-diagram-html/scripts/test-route.mjs` | 走线回归测试，覆盖全部端口组合与相对位置 |
| `skills/interactive-diagram-html/references/*.md` | 数据格式、场景指南、布局指南 |
| `.claude-plugin/marketplace.json` | Claude Code 插件市场清单 |

## 触发条件

用户想把构成图、架构图、流程图、开发计划、路线图、泳道图、体制图等，做成能点开查看说明的 HTML 时使用。

不适用：只需要静态图片；需要数据图表（柱状图、折线图）；需要幻灯片。

## 执行

前置条件：Node.js ≥ 18。`$TOOL` 表示本仓库中 `skills/interactive-diagram-html` 的路径。

```bash
node "$TOOL/scripts/build.mjs" <name>.data.json <name>.html --strict   # 校验并生成
node "$TOOL/scripts/build.mjs" <name>.data.json --check                # 只校验
node "$TOOL/scripts/serve.mjs" <HTML 所在目录> [端口]                    # 编辑模式：打开 http://localhost:8765/<name>.html
```

## 约束

| 情形 | 要求 |
| --- | --- |
| 输出文件已存在 | 换一个文件名。只有用户明确要求更新本次生成的文件时，才可以加 `--force` |
| 校验警告 | 修到 0 再交付。修法见 references/layout-guide.md 的「校验警告对照」 |
| 页面文字 | 只用一种语言；不写"根据××补全"之类的元说明 |
| 成本、工数 | 只写量级，并注明需要复核 |
| 引擎不支持的效果 | 先告诉用户，由用户决定是否扩展引擎 |
| 修改走线算法 | 只改 `scripts/route-block.js`，再运行 `sync-route.mjs` 与 `test-route.mjs`，并用 `--check --strict` 校验两个示例 |
| 编辑模式 | 第一轮提问时询问是否需要；需要则在数据里加 `"editable": true`。用户保存过后，任何修改都先重新读取 data.json |
