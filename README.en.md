# interactive-diagram-html

[中文](README.md) | [日本語](README.ja.md) | English

A Claude Code skill that turns **architecture diagrams, process flows, development plans** and similar documents into single-file interactive HTML through a guided conversation. Every block in the diagram can be clicked to open its details.

| Item | Description |
| --- | --- |
| Output | One HTML file with no external dependencies, so you can email it or drop it on a shared drive as is, plus a data JSON for later edits |
| Interaction | Click a block to open a details panel on the right. Drag to pan, Ctrl + wheel to zoom. Toggle a phase scope (M0 / PoC, P0 / P1, and so on). Click a table row to jump to its block in the diagram |
| Use cases | System / environment architecture, process flows, development plans (timeline + milestones), business flows (swimlanes), organization charts |
| Quality checks | The build script detects overlapping nodes, edges that pass through nodes, text overflow, and broken ID references. It refuses to overwrite existing files by default |
| Requirements | Node.js 18 or later. No third-party npm packages |

## Examples

| File | Contents |
| --- | --- |
| [examples/dev-plan.html](examples/dev-plan.html) | Development plan: 6 sprints, 6 lanes, 4 milestones, critical path, P0 / P1 / P2 scope toggle, feature list |
| [examples/system-architecture.html](examples/system-architecture.html) | System architecture: container layout, store-usage dots, component × store matrix, M0 / PoC toggle |

GitHub does not preview HTML files. Download them and open them in a browser.

## Installation

### Claude Code (plugin marketplace)

```
/plugin marketplace add XuGuanghaiGoogle/interactive-diagram-html
/plugin install interactive-diagram-html@interactive-diagram-html
```

You can also register a local directory as the marketplace: `/plugin marketplace add C:\path\to\interactive-diagram-html`.
To update: `/plugin marketplace update interactive-diagram-html`.

### Manual installation (personal skill)

Copy `skills/interactive-diagram-html/` into `~/.claude/skills/` (on Windows, `%USERPROFILE%\.claude\skills\`).

### Codex / other agents

| Scope | How |
| --- | --- |
| Single project | Copy `skills/interactive-diagram-html/` into the project's `.agents/skills/` and register it in the project's AGENTS.md |
| Global | Clone this repository to a fixed path and call `scripts/build.mjs` by its absolute path |

Instructions for agents are in [AGENTS.md](AGENTS.md) and [SKILL.md](skills/interactive-diagram-html/SKILL.md).

## Usage

After installing, just ask Claude Code. For example:

- "Turn this repository's system into an architecture diagram HTML, and mark the PoC scope."
- "Create a development plan from docs/requirements.md. Start in October, two-week sprints."
- "Draw the expense approval flow as a swimlane diagram. Roles: applicant, manager, finance."

The skill works through these steps and checks with you at each one:

1. Confirms the scenario: diagram type, page language, and whether a phase scope is needed. If you point it to existing material, it reads that first
2. Asks the key questions for that scenario, at most 4 per round
3. Presents an outline (groups, node list, main connections) for you to confirm
4. Writes the data JSON, builds the HTML, and fixes issues until there are 0 errors and 0 warnings
5. Reports the file paths and any open items

To change something later, just say "change X to Y". The skill edits the data JSON and rebuilds the same HTML.

## Command line (without an agent)

```bash
node skills/interactive-diagram-html/scripts/build.mjs my-plan.data.json my-plan.html --strict
```

| Option | Description |
| --- | --- |
| `--strict` | Treats warnings as failures. Recommended before delivery |
| `--check` | Validates only; does not write a file |
| `--force` | Allows overwriting an existing output file. Without it, the script refuses to overwrite |

See [references/data-schema.md](skills/interactive-diagram-html/references/data-schema.md) for the data format and [references/layout-guide.md](skills/interactive-diagram-html/references/layout-guide.md) for coordinates and edge routing. The quickest way to start is to copy one of the samples in `assets/examples/`.

## Repository layout

```
.claude-plugin/marketplace.json          Claude Code plugin marketplace manifest
skills/interactive-diagram-html/
  SKILL.md                               Agent instructions (conversation flow, content standards)
  assets/engine.html                     Interaction engine (panel, pan / zoom, tables, legends)
  assets/examples/*.json                 Sample data (timeline type / container type)
  scripts/build.mjs                      Validation + generation, no dependencies
  references/data-schema.md              Data format
  references/scenarios.md                Recommended structure and question list per scenario
  references/layout-guide.md             Coordinates, edge routing, how to fix each warning
examples/*.html                          Finished samples
```

## License

MIT
