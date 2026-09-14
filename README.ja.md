# interactive-diagram-html

[English](README.md) | 日本語 | [中文](README.zh.md)

**構成図・フロー図・開発計画**などを、対話を通じて「クリックで説明が開く」単一ファイルのインタラクティブ HTML にまとめる Claude Code スキルです。

| 項目 | 内容 |
| --- | --- |
| 成果物 | HTML 1 ファイル（外部依存なし。メール添付や共有フォルダにそのまま置けます）と、後から修正するためのデータ JSON |
| 操作 | ブロックをクリックすると右側に説明パネルが開きます。ドラッグで移動、Ctrl + ホイールで拡大縮小。フェーズ範囲（M0 / PoC、P0 / P1 など）の強調切り替え、一覧表の行クリックで図の該当ブロックへ移動。図が収まらないときはスクロールバーを表示 |
| 編集（任意） | 有効にすると、ブラウザ上でブロックの移動・幅の変更・線の追加 / 削除・元に戻すができ、ローカルサーバー経由でデータ JSON に保存します |
| 工数集計（任意） | 開発計画でフェーズごとの機能数・画面数・換算工数を集計し、上部の棒グラフと自動生成のフェーズ概要表に表示します |
| 対応シーン | システム / 環境構成図、処理フロー図、開発計画（タイムライン + マイルストーン）、業務フロー（スイムレーン）、組織・体制図 |
| 品質チェック | ビルドスクリプトがノードの重なり、ノードを貫通する線、文字のはみ出し、ID 参照の誤りを検出します。既存ファイルの上書きは既定で拒否します |
| 必要環境 | Node.js 18 以上。サードパーティの npm パッケージは不要 |

## サンプル

| ファイル | 内容 |
| --- | --- |
| [examples/dev-plan.html](examples/dev-plan.html) | 開発計画：6 スプリント、6 レーン、4 マイルストーン、クリティカルパス、P0 / P1 / P2 の範囲切り替え、機能一覧表 |
| [examples/system-architecture.html](examples/system-architecture.html) | システム構成：コンテナ型レイアウト、ストア関連のドット表示、コンポーネント × ストアの対応表、M0 / PoC 切り替え |

GitHub 上では HTML がプレビューされないため、ダウンロードしてブラウザで開いてください。

## インストール

### Claude Code（プラグインマーケットプレイス）

```
/plugin marketplace add XuGuanghaiGoogle/interactive-diagram-html
/plugin install interactive-diagram-html@interactive-diagram-html
```

ローカルディレクトリをマーケットプレイスとして登録することもできます：`/plugin marketplace add C:\path\to\interactive-diagram-html`。
更新：`/plugin marketplace update interactive-diagram-html`。

### 手動インストール（個人スキル）

`skills/interactive-diagram-html/` を `~/.claude/skills/`（Windows は `%USERPROFILE%\.claude\skills\`）にコピーします。

### Codex / その他のエージェント

| 範囲 | 手順 |
| --- | --- |
| 単一プロジェクト | `skills/interactive-diagram-html/` を対象プロジェクトの `.agents/skills/` にコピーし、プロジェクトの AGENTS.md に登録 |
| グローバル | 固定パスにクローンし、`scripts/build.mjs` を絶対パスで呼び出す |

エージェント向けの指示は [AGENTS.md](AGENTS.md) と [SKILL.md](skills/interactive-diagram-html/SKILL.md) にあります。

## 使い方

インストール後、Claude Code でそのまま依頼してください。例：

- 「このリポジトリのシステムを構成図 HTML にして。PoC の範囲も分かるように」
- 「docs/requirements.md をもとに開発計画を作って。10 月開始、2 週間スプリントで」
- 「経費精算の承認フローをスイムレーン図にして。登場人物は申請者・上長・経理」

スキルは次の順で進め、各段階で確認を取ります。

1. シーンを確認します（図の種類、ページの言語、フェーズ範囲の要否、ブラウザで編集するかどうか）。手元の資料があれば先に読み込みます
2. シーンに合わせて重要事項を質問します（1 回あたり最大 4 問）
3. 骨子（グループ、ノード一覧、主な接続）を提示し、確認を取ります
4. データ JSON を作成し、HTML をビルドして、エラー 0・警告 0 になるまで修正します
5. ファイルのパスと未決事項を報告します

あとから直したいときは「○○を△△に変えて」と伝えるだけです。スキルがデータ JSON を修正し、同じ HTML を作り直します。

## コマンドライン（エージェントを使わない場合）

```bash
node skills/interactive-diagram-html/scripts/build.mjs my-plan.data.json my-plan.html --strict
```

| オプション | 説明 |
| --- | --- |
| `--strict` | 警告も失敗として扱います。納品前に推奨 |
| `--check` | 検証だけを行い、ファイルは生成しません |
| `--force` | 既存の出力ファイルの上書きを許可します。指定しない場合は上書きを拒否します |

データ形式は [references/data-schema.md](skills/interactive-diagram-html/references/data-schema.md)、レイアウトと線の引き方は [references/layout-guide.md](skills/interactive-diagram-html/references/layout-guide.md) を参照してください。`assets/examples/` のサンプルを元に作り始めるのが近道です。

## ディレクトリ構成

```
.claude-plugin/marketplace.json          Claude Code プラグインマーケットプレイスの定義
skills/interactive-diagram-html/
  SKILL.md                               エージェントへの指示（対話の流れ、内容の基準）
  assets/engine.html                     インタラクションエンジン（パネル、移動・拡大縮小、表、凡例）
  assets/examples/*.json                 サンプルデータ（タイムライン型 / コンテナ型）
  scripts/build.mjs                      検証 + 生成。依存なし
  scripts/serve.mjs                      編集モード用のローカルプレビュー + 保存サーバー
  scripts/route-block.js                 線のルーティングの正本（sync-route.mjs が注入）
  scripts/test-route.mjs                 ルーティングの回帰テスト（全ポート組み合わせ）
  references/data-schema.md              データ形式
  references/scenarios.md                シーン別の推奨構成と質問リスト
  references/layout-guide.md             座標、線の引き方、警告への対処
examples/*.html                          サンプルの完成品
```

## ライセンス

MIT
