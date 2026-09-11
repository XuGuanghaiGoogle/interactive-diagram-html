# 数据 JSON 格式

`scripts/build.mjs` 读取这份 JSON，校验后注入 `assets/engine.html`。坐标单位是 SVG 像素，原点在左上角。

## 目录

- [顶层结构](#顶层结构)
- [meta](#meta)
- [categories](#categories)
- [phase](#phase)
- [groups](#groups)
- [timeline](#timeline)
- [nodes](#nodes)
- [edges](#edges)
- [bands / labels](#bands--labels)
- [tables](#tables)
- [notes](#notes)
- [其他可选项](#其他可选项)
- [最小示例](#最小示例)

## 顶层结构

| 键 | 必填 | 说明 |
| --- | --- | --- |
| `meta` | ✓ | 标题、导语、语言 |
| `canvas` | ✓ | `{ "w": 1780, "h": 1300 }`，即画布大小 |
| `categories` | ✓ | 节点类别，决定节点颜色，图例也按它生成 |
| `nodes` | ✓ | 方块（节点） |
| `groups` |  | 容器框或泳道 |
| `edges` |  | 连线 |
| `phase` |  | 阶段范围（节点右侧的色条和顶部的开关） |
| `timeline` |  | 时间轴列头和纵向网格线（开发计划用） |
| `bands` |  | 工具栏上的跳转按钮 |
| `labels` |  | 自由文字 |
| `tables` |  | 图下方的表格 |
| `notes` |  | 图下方的说明卡片 |
| `panelLabels` / `uiText` / `tagLegend` |  | 见[其他可选项](#其他可选项) |

## meta

```json
{ "title": "浏览器标签页标题", "heading": "页面大标题（省略时用 title）",
  "lead": "导语，可以写 HTML", "lang": "ja", "hint": "操作提示（省略时用默认文案）" }
```

`lang` 可以是 `ja`、`zh` 或 `en`，它决定按钮文字和面板小标题的默认语言。

## categories

```json
{ "app": { "name": "アプリ", "fill": "#fff1e3", "stroke": "#ED7100" } }
```

矩形节点左侧的色条使用 `stroke`，填充色使用 `fill`。`fill` 应该取比 `stroke` 浅很多的同色系颜色。

## phase

```json
{ "label": "M0 / PoC",
  "levels": [ { "key": "必須", "color": "#2e7d32", "desc": "M0 で構築" },
              { "key": "簡略", "color": "#d79b00" },
              { "key": "対象外", "color": "#98a2b3", "desc": "M1 以降" } ],
  "dim": ["対象外"] }
```

打开开关后，`dim` 里列出的等级对应的节点会变淡。`dim` 为空时，不显示开关。

## groups

```json
{ "id": "vpc", "x": 590, "y": 140, "w": 720, "h": 800, "label": "VPC",
  "stroke": "#248814", "fill": "#f8fdf7", "dash": false }
```

标签显示在框的左上角，大约占 24px 高，所以节点至少要离框顶 30px。`id` 可以用作连线的端点。泳道要叠在时间轴网格上时，`fill` 用带透明度的 8 位十六进制颜色（例如 `#0078D40a`），这样网格线不会被遮住。

## timeline

```json
{ "x0": 200, "colW": 260, "y": 60, "h": 36, "bottom": 1175,
  "labels": ["S1（10/1〜10/14）", "S2", "S3"] }
```

第 i 列的范围是 `x0 + i·colW` 到 `x0 + (i+1)·colW`。列头画在 `y` 处，纵向虚线一直画到 `bottom`。

## nodes

| 键 | 说明 |
| --- | --- |
| `id` | 唯一 ID。连线、表格和 `uses` 都用它来引用节点 |
| `x` `y` `w` `h` | 位置和大小 |
| `cat` | `categories` 里的键 |
| `shape` | `rect`（默认）、`diamond`（判断或里程碑）、`cylinder`（存储）、`note`（虚线说明框） |
| `d` | 图上显示的文字，是一个字符串数组，每个元素占一行。第 1 行加粗 12px，其余行 10px；放不下时会自动缩小字号，但不会小于 8px |
| `t` / `s` | 面板的标题和副标题 |
| `role` | 作用（HTML） |
| `fn` | 功能要点，字符串数组（每项可写 HTML） |
| `io` | 输入、输出和连接对象（HTML） |
| `rel` | 补充说明，或与其他文档的对应关系（HTML） |
| `kv` | 显示在面板顶部的键值表，例如 `[["担当","受注チーム"],["工数","15 人日"]]` |
| `sections` | 追加的小节，例如 `[{ "h": "受入基準", "items": ["…"] }]`；也可以写成 `{ "h": "…", "text": "…" }` |
| `phase` | `{ "level": "P0", "text": "这个阶段做到哪一步" }` |
| `uses` | 这个节点"使用"的其他节点 ID。点击节点时，相关节点会被强调；面板里会列出使用和被使用的节点 |
| `dot` | 颜色值。设置了 `dot` 的节点被 `uses` 引用时，引用方的右下角会画一个这个颜色的圆点，常用于标记存储 |
| `tags` | 显示在左下角的短标签，例如团队名或所用模型的缩写，3～4 个字符最合适 |

没有 `role`、`fn`、`sections` 或 `kv` 的节点不能点击。说明框（`note`）通常就是这种情况。

尺寸参考：矩形节点常用 150～240 宽、50～64 高；有 `tags` 或圆点时，高度至少 50。菱形节点常用 140～150 宽、64～76 高。存储节点常用 160～240 宽、80～96 高。

## edges

```json
{ "from": "api:r", "to": "db:l", "mx": 980, "label": "検索", "lx": 980, "ly": 560, "dash": false, "bold": false }
```

| 键 | 说明 |
| --- | --- |
| `from` / `to` | `节点ID:方位`，方位写 `l`、`r`、`t` 或 `b`。省略方位时，起点默认 `r`，终点默认 `l` |
| `mx` | 左右连接（`r→l` 或 `l→r`）时，竖直段所在的 x 坐标，默认取两端的中点 |
| `my` | 上下连接（`b→t` 或 `t→b`）时，水平段所在的 y 坐标 |
| `via` | 自定义拐点，写成 `[[x,y],[x,y]]`。拐点必须让每一段都保持水平或竖直 |
| `d1` / `d2` | 起点、终点的偏移量 `[dx,dy]`。多条线接到同一个端口时，用它把线错开 |
| `label` `lx` `ly` `lp` | 标签文字和位置。`lp` 是标签所在的线段序号，从 0 开始；给了 `lx`、`ly` 时直接用坐标 |
| `dash` | 画成虚线（绿色），表示可选、异步或回流 |
| `bold` | 画成粗线（橙色），表示关键路径 |

## bands / labels

```json
"bands":  [ { "label": "VPC", "rect": [575, 125, 750, 830] } ],
"labels": [ { "x": 1565, "y": 962, "text": "並列実行", "size": 11, "bold": true, "anchor": "middle" } ]
```

`bands` 会在工具栏上各生成一个按钮，点击后跳转到对应区域。

## tables

有三种类型，点击任意一行，都会让图居中到对应的节点，并打开它的面板。

```json
{ "type": "phase", "title": "M0 構成要件", "caption": "…",
  "columns": ["コンポーネント", "判定", "内容"],
  "groups": [ { "label": "アプリ層", "ids": ["api", "wk"] } ] }
```

`phase` 表自动读取各节点的 `t`、`phase.level` 和 `phase.text`。

```json
{ "type": "uses", "title": "処理 × ストア", "targets": ["vol", "meta"],
  "firstColumn": "処理", "groups": [ { "label": "取り込み", "ids": ["ing"] } ] }
```

`uses` 表是一个矩阵：行是处理节点，列是 `targets`，处理节点的 `uses` 里包含某个 target 时，对应单元格显示 ●。

```json
{ "type": "custom", "title": "機能一覧", "columns": ["ID", "機能名", "工数"],
  "rows": [ { "group": "受注" }, { "go": "o1", "cells": ["O-01", "受注登録", "15"] } ] }
```

`custom` 表由你自己写行，每行的 `cells` 数必须和 `columns` 一致。写 `{ "group": "…" }` 的行是分组标题行；带 `go` 的行可以点击。

## notes

```json
{ "title": "前提条件", "items": ["…", "…"], "wide": true, "ordered": false }
```

`wide: true` 的卡片会占满整行。

## 其他可选项

- `panelLabels`：改面板里的小节标题，例如开发计划写 `{ "role": "目的", "fn": "機能説明", "io": "入出力・区分", "rel": "備考" }`。
- `uiText`：覆盖按钮、提示等界面文字，键名参考 engine.html 中的 `I18N`。
- `tagLegend`：图例里说明标签的含义，例如 `{ "FE": "フロントエンド" }`。

## 最小示例

```json
{
  "meta": { "title": "Sample", "lang": "ja" },
  "canvas": { "w": 700, "h": 260 },
  "categories": { "app": { "name": "アプリ", "fill": "#fff1e3", "stroke": "#ED7100" },
                  "db":  { "name": "データ", "fill": "#fdeafe", "stroke": "#C925D1" } },
  "nodes": [
    { "id": "api", "x": 60, "y": 90, "w": 200, "h": 60, "cat": "app", "uses": ["db"],
      "d": ["API サーバー", "問い合わせ受付"], "t": "API サーバー",
      "role": "外部からの問い合わせを受け付ける。", "fn": ["認証", "入力検証", "レート制限"] },
    { "id": "db", "x": 420, "y": 80, "w": 200, "h": 90, "cat": "db", "shape": "cylinder", "dot": "#C925D1",
      "d": ["データベース"], "t": "データベース",
      "role": "業務データを保持する。", "fn": ["日次バックアップ", "暗号化", "読み取りレプリカ"] }
  ],
  "edges": [ { "from": "api:r", "to": "db:l", "label": "SQL" } ]
}
```
