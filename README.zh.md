# interactive-diagram-html

[English](README.md) | [日本語](README.ja.md) | 中文

在对话中把**构成图、流程图、开发计划**等生成为可点击查看说明的单文件交互式 HTML。

| 项 | 说明 |
| --- | --- |
| 产出 | 单个 HTML 文件和一份数据 JSON。HTML 不依赖任何外部资源，可以直接用邮件发送或放到共享盘；数据 JSON 用于后续修改 |
| 交互 | 点击方块，右侧打开说明面板；拖拽平移，Ctrl + 滚轮缩放，图放不下时出现滚动条；阶段范围开关（M0 / PoC、P0 / P1 等）；点击一览表的行，图会定位到对应方块 |
| 编辑（可选） | 开启后可在浏览器里拖动方块、调整宽度、画 / 删连线、撤销，并经本地服务保存回数据 JSON |
| 工作量统计（可选） | 开发计划按期统计机能数、画面数、换算工数，顶部柱形图 + 自动生成的阶段概要表 |
| 场景 | 系统 / 环境构成图、处理流程图、开发计划（时间轴 + 里程碑）、业务流程（泳道）、组织体制图 |
| 质量保障 | 构建脚本会检查节点重叠、连线穿过节点、文字溢出和 ID 引用错误，并默认拒绝覆盖已有文件 |
| 依赖 | Node.js ≥ 18，不需要第三方 npm 包 |

## 示例

| 文件 | 内容 |
| --- | --- |
| [examples/dev-plan.html](examples/dev-plan.html) | 开发计划：6 个 Sprint、6 条泳道、4 个里程碑、关键路径、P0 / P1 / P2 范围开关、功能一览表 |
| [examples/dev-plan-editable.html](examples/dev-plan-editable.html) | 布局编辑：开启编辑的开发计划（拖动、改宽度、连线；演示页中「保存」会下载 JSON） |
| [examples/system-architecture.html](examples/system-architecture.html) | 系统构成：容器布局、存储关联圆点、组件 × 存储矩阵、M0 / PoC 开关 |

**在线演示：** https://xuguanghaigoogle.github.io/interactive-diagram-html/

GitHub 不会渲染 HTML 预览，请打开在线演示，或下载后用浏览器打开。

## 安装

### Claude Code（插件市场）

```
/plugin marketplace add XuGuanghaiGoogle/interactive-diagram-html
/plugin install interactive-diagram-html@interactive-diagram-html
```

也可以把本地目录作为市场源：`/plugin marketplace add C:\path\to\interactive-diagram-html`。
更新：`/plugin marketplace update interactive-diagram-html`。

### 手动安装（个人 skill）

把 `skills/interactive-diagram-html/` 复制到 `~/.claude/skills/` 下（Windows 为 `%USERPROFILE%\.claude\skills\`）。

### Codex / 其他 agent

| 范围 | 做法 |
| --- | --- |
| 单个项目 | 把 `skills/interactive-diagram-html/` 复制到该项目的 `.agents/skills/`，并在项目的 AGENTS.md 中登记 |
| 全局 | 克隆到固定路径，用绝对路径调用 `scripts/build.mjs` |

agent 的行为指令见 [AGENTS.md](AGENTS.md) 和 [SKILL.md](skills/interactive-diagram-html/SKILL.md)。

## 使用方法

安装后，在 Claude Code 里直接说出需求即可，例如：

- 「把这个仓库的系统做成构成图 HTML，标出 PoC 范围」
- 「根据 docs/requirements.md 做一份开发计划，10 月开始，两周一个 Sprint」
- 「把报销审批流程画成泳道图，角色有申请人、主管、财务」

skill 会按以下顺序推进，每一步都会征求你的确认：

1. 确认场景：选择图的类型、页面语言，确认是否需要阶段范围、是否需要在浏览器里编辑，并读取你提供的素材
2. 按场景追问关键信息，每轮最多 4 个问题
3. 给出大纲（分组、节点清单、主要连线），请你确认
4. 生成数据 JSON，构建 HTML 并校验到 0 错误、0 警告
5. 报告文件路径和待定事项

之后想修改时，直接说「把 ○○ 改成 △△」。skill 会修改数据 JSON，然后重新生成同一个 HTML。

## 命令行（不经过 agent）

```bash
node skills/interactive-diagram-html/scripts/build.mjs my-plan.data.json my-plan.html --strict
```

| 参数 | 说明 |
| --- | --- |
| `--strict` | 把警告也视为失败，交付前建议使用 |
| `--check` | 只校验，不生成文件 |
| `--force` | 允许覆盖已存在的输出文件；不加时脚本拒绝覆盖 |

数据格式见 [references/data-schema.md](skills/interactive-diagram-html/references/data-schema.md)，布局和走线的写法见 [references/layout-guide.md](skills/interactive-diagram-html/references/layout-guide.md)。可以从 `assets/examples/` 里的示例改起。

## 目录结构

```
.claude-plugin/marketplace.json          Claude Code 插件市场清单
skills/interactive-diagram-html/
  SKILL.md                               agent 行为指令（交互流程、内容要求）
  assets/engine.html                     交互引擎（面板、平移缩放、表格、图例）
  assets/examples/*.json                 示例数据（时间轴型 / 容器型）
  scripts/build.mjs                      校验 + 生成，零依赖
  scripts/serve.mjs                      编辑模式用的本地预览 + 保存服务
  scripts/route-block.js                 走线算法正本（sync-route.mjs 注入引擎与 build.mjs）
  scripts/test-route.mjs                 走线回归测试（全部端口组合）
  references/data-schema.md              数据格式
  references/scenarios.md                各场景的推荐结构与追问清单
  references/layout-guide.md             坐标、走线、校验警告对照
examples/*.html                          示例成品
```

## 许可

MIT
