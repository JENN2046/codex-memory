# P21.1 Client Integration Inventory

Phase: `P21.1-client-integration-inventory`

Status: inventory

## Purpose

Inventory existing Codex / Claude client integration surfaces, commands, acceptance evidence, gaps, and hard-stop boundaries before adding new fixtures or changing runtime behavior.

This phase is docs-only. It does not edit Codex or Claude configuration, start HTTP MCP, install startup/watchdog tasks, change MCP schema, expand public MCP tools, call providers, read real memory content, run migration, apply import/export, or enter release-candidate work.

## Current Documents

| Document | Role | P21 inventory note |
|---|---|---|
| [P21_CODEX_CLAUDE_CLIENT_INTEGRATION_HARDENING_PLAN.md](./P21_CODEX_CLAUDE_CLIENT_INTEGRATION_HARDENING_PLAN.md) | P21 plan | Defines subphase order, safety rules, and non-goals. |
| [CLIENT_SCOPE_MODEL.md](../CLIENT_SCOPE_MODEL.md) | Scope model | Defines `client_id`, `workspace_id`, `project_id`, `task_id`, `conversation_id`, `visibility`, and `retention_policy`. |
| [SCOPE_SCHEMA_EXTENSION.md](./SCOPE_SCHEMA_EXTENSION.md) | Scope schema design | Historical schema design; later implementation has already added scope behavior. |
| [SCOPE_ACCEPTANCE.md](./SCOPE_ACCEPTANCE.md) | Scope acceptance summary | Lists project/workspace/client/visibility positives and strict negatives. |
| [SCOPE_RECALL_AUDIT_DESIGN.md](./SCOPE_RECALL_AUDIT_DESIGN.md) | Scope audit semantics | Records low-risk scope audit / overview / dashboard summary boundaries. |
| [CLAUDE_MCP_ACCEPTANCE.md](../CLAUDE_MCP_ACCEPTANCE.md) | Claude local HTTP MCP acceptance | Documents previous configured Claude Code path and remaining interactive `/mcp` manual check. |
| [P20_LOCAL_PRODUCTION_HARDENING_CLOSEOUT_REVIEW.md](./P20_LOCAL_PRODUCTION_HARDENING_CLOSEOUT_REVIEW.md) | Local production safety boundary | Keeps startup/watchdog/config/backup/apply operations blocked without approval. |

## Current Command Surfaces

| Command | Role | Side-effect boundary |
|---|---|---|
| `npm run scope:acceptance -- --json` | Scope acceptance summary | Intended local validation; should be safe and read-oriented, but still uses project runtime code and fixtures/state expected by the command. |
| `node --test tests\scope-filter.test.js` | Scope filter regression tests | Test-only; safe for future P21 fixture review. |
| `node --test tests\scope-acceptance-cli.test.js` | Scope acceptance CLI tests | Test-only; safe for future P21 fixture review. |
| `node --test tests\mcp-contract.test.js` | Public MCP contract regression | Test-only; protects public tools and schema. |
| `node --test tests\mcp-http.test.js` | HTTP MCP regression | Test-only; safe as a validation target, but does not replace live client acceptance. |
| `npm run gate:ci -- --json` | Fixture-only CI-safe gate | Safe readiness gate; `noNetwork/noDaemon/noProvider` expectations remain important. |
| `npm run gate:mainline:strict` | Broader local mainline gate | Live/local runtime adjacent; use deliberately when a phase scopes it. |
| `npm run observe:http -- --json` | Live HTTP observation | Read-only but probes local HTTP/log/audit state; not run in P21.1. |
| `claude mcp list` / `claude mcp get` | Claude CLI config observation | Reads local Claude state; should be scoped deliberately. |
| `claude mcp add` / `claude mcp remove` | Claude CLI config mutation | Hard stop without explicit approval and rollback story. |

## Public MCP Tool Boundary

P21 starts with the public MCP tool set frozen:

- `record_memory`
- `search_memory`
- `memory_overview`

P21.1 does not add:

- `validate_memory`
- `update_memory`
- `supersede_memory`
- `forget_memory`
- `audit_memory`
- `checkpoint_memory`
- `handoff_memory`
- `import_memory`
- `export_memory`

`validate_memory` remains internal-only.

## Existing Test Coverage

Current relevant local tests:

| Test | Coverage note |
|---|---|
| `tests\scope-filter.test.js` | Scope SQL pushdown, post-filter fallback, strict negatives, audit annotation, overview / observability summaries. |
| `tests\scope-acceptance-cli.test.js` | Scope acceptance CLI output shape and summary behavior. |
| `tests\scope-backfill-dry-run.test.js` | Scope backfill dry-run policy and missing-field reporting. |
| `tests\mcp-contract.test.js` | Public MCP tools and schema contract. |
| `tests\mcp-http.test.js` | HTTP MCP transport / endpoint behavior. |

P21.1 does not add or run new tests. It identifies P21.2/P21.4 fixture-review targets.

## Acceptance Evidence Inventory

| Evidence | Current status |
|---|---|
| Scope positives | `project_id`, `workspace_id`, `client_id`, `visibility`, and combined filters documented as PASS in scope acceptance. |
| Scope strict negatives | Wrong project/workspace/client and wrong visibility documented as PASS. |
| Candidate pushdown | `scope + limit=1` underfill regression documented as PASS. |
| Low-risk audit annotation | `scopeApplied`, `scopeMode`, `scopeDimensions`, `strict`, and presence-style workspace handling documented as PASS. |
| `memory_overview` scope summary | Low-risk scope aggregation documented as PASS. |
| dashboard / `http-observe` scope rendering | Low-risk scoped recall summary documented as PASS. |
| Claude HTTP MCP local acceptance | Previous configured local path documented as connected and model-mediated `memory_overview` successful. |
| Claude interactive `/mcp` panel | Still manual / incomplete; non-interactive `/mcp` was not suitable. |

## Gaps For P21.2+

P21 inventory identifies these follow-up gaps:

- No consolidated Codex / Claude client integration fixture matrix yet.
- Cross-client private visibility should get fixture-only targeted coverage before runtime behavior changes.
- Claude acceptance docs need a drift review that separates read-only CLI checks from config mutation commands.
- Codex Desktop config guidance should be inventoried without editing real `C:\Users\617\.codex\config.toml`.
- `scope:acceptance` coverage should be mapped to P21 gate categories.
- Public MCP tool freeze should remain part of every P21 validation summary.
- Low-risk summaries must continue avoiding raw `workspace_id`.
- P22 release-candidate planning must not begin from P21.1 inventory alone.

## Hard Stops

P21.1 keeps these blocked:

- Codex config edit
- Claude config edit
- `claude mcp add`
- `claude mcp remove`
- startup/watchdog install
- service or watchdog start by default
- provider smoke / benchmark
- real memory preview
- durable DB / memory / diary write
- SQLite migration or `ALTER TABLE`
- import/export apply
- MCP schema/tool expansion
- package or lockfile change
- release candidate, tag, release, or deploy

## Validation

Docs-only inventory validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## P21.1 Result

Result: `P21_CLIENT_INTEGRATION_INVENTORY_READY`

P21.1 is sufficient to proceed to fixture/test-design review.

It is not sufficient to authorize config mutation, runtime behavior changes, MCP public tool expansion, provider calls, migration/import-export apply, or release-candidate work.

## Next Recommended Phase

P21.2 client scope acceptance fixture review is captured in [P21_CLIENT_SCOPE_ACCEPTANCE_FIXTURE_REVIEW.md](./P21_CLIENT_SCOPE_ACCEPTANCE_FIXTURE_REVIEW.md).

`P21.3-Claude-acceptance-evidence-refresh-plan`
