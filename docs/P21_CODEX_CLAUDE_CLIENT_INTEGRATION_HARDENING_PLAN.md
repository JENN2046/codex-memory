# P21 Codex / Claude Client Integration Hardening Plan

Phase: `P21-Codex-Claude-client-integration-hardening-planning`

Status: planning

## Purpose

Plan Codex / Claude client integration hardening without mutating real client configuration or changing runtime behavior.

P21 should make client-specific behavior measurable and safer to maintain while preserving the single `vcp_codex_memory` kernel. The goal is not to fork behavior by client, but to harden scope, visibility, acceptance, and configuration guidance for Codex and Claude users.

This phase is docs-only. It does not edit Codex config, edit Claude config, start HTTP MCP, install startup/watchdog tasks, change MCP schema, expand public MCP tools, call providers, read real memory content, run migration, apply import/export, or enter release-candidate work.

## Current Baseline

Existing evidence before P21:

| Surface | Current evidence |
|---|---|
| Client scope model | [CLIENT_SCOPE_MODEL.md](../CLIENT_SCOPE_MODEL.md) |
| Scope schema design | [SCOPE_SCHEMA_EXTENSION.md](./SCOPE_SCHEMA_EXTENSION.md) |
| Scope acceptance | [SCOPE_ACCEPTANCE.md](./SCOPE_ACCEPTANCE.md) |
| Claude MCP acceptance | [CLAUDE_MCP_ACCEPTANCE.md](../CLAUDE_MCP_ACCEPTANCE.md) |
| Local production safety | [P20_LOCAL_PRODUCTION_HARDENING_CLOSEOUT_REVIEW.md](./P20_LOCAL_PRODUCTION_HARDENING_CLOSEOUT_REVIEW.md) |

Known current facts:

- Public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`.
- `validate_memory` remains internal-only.
- `search_memory` supports optional `scope`.
- Scope acceptance covers project, workspace, client, visibility, strict negatives, SQL candidate pushdown, recall audit annotation, overview aggregation, and dashboard / `http-observe` rendering.
- Claude Code local HTTP MCP minimal acceptance has previous evidence, but interactive `/mcp` panel verification remains manual.
- P20 closed local production hardening as evidence-ready but blocked for apply.

## Client Surfaces

P21 should plan and harden these surfaces:

| Surface | P21 concern |
|---|---|
| Codex Desktop HTTP MCP | Default local client path; must keep HTTP endpoint stable. |
| Claude Code HTTP MCP | Local MCP acceptance and config guidance must stay accurate. |
| Claude Desktop / remote connector notes | Must not imply `127.0.0.1` remote connector works from Anthropic cloud. |
| `record_memory` | Public schema must stay frozen unless a dedicated approved phase changes it. |
| `search_memory` | Scope behavior and private visibility expectations need fixture/acceptance evidence. |
| `memory_overview` | Low-risk summaries must not leak raw `workspace_id` or secrets. |
| Scope audit / observability | Client/scope dimensions should remain low-risk and reviewable. |
| MCP config docs | Must separate read-only checks from real config mutation. |

## Gate Categories

Future P21 gates should cover:

- client identity preservation
- scope filter acceptance
- cross-client private visibility behavior
- workspace/project/client strict negatives
- low-risk audit and overview summaries
- Claude acceptance documentation drift
- Codex HTTP MCP guidance drift
- MCP public tool freeze
- config mutation boundary
- local production safety compatibility

## Proposed Subphases

| Phase | Target | Allowed work | Validation |
|---|---|---|---|
| P21 planning | This plan and status/board handoff | docs/status/board only | `git diff --check`; docs validation |
| P21.1 client integration inventory | Inventory Codex / Claude client docs, commands, and acceptance gaps | docs/status/board only | docs validation |
| P21.2 client scope acceptance fixture review | Review existing scope tests and identify Codex/Claude-specific fixture gaps | tests-design/docs only | targeted scope tests if needed; docs validation |
| P21.3 Claude acceptance evidence refresh plan | Plan safe refresh of Claude MCP acceptance without mutating config by default | docs/evidence planning only | docs validation |
| P21.4 client privacy boundary fixture tests | Add fixture-only tests for cross-client private visibility and low-risk summaries | tests/fixtures/docs only | targeted tests; `npm test`; docs validation |
| P21.5 client integration standing gate summary | Summarize scope/client acceptance evidence and remaining manual checks | docs/status/board only | docs validation |
| P21.x closeout | Judge readiness for P22 release-candidate planning | docs/status/board only | docs validation |

Runtime changes, config mutation, and release-candidate work remain deferred unless a later explicit phase authorizes them.

## Validation Strategy

Docs-only phases:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Fixture / test phases, when reached:

```powershell
node --test tests\scope-filter.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

MCP / HTTP runtime validation remains explicit and scoped:

```powershell
npm run gate:mainline:strict
```

Claude CLI or config checks may read or write local user configuration depending on command. Any command that edits real Claude config requires explicit approval and rollback instructions.

## Safety Rules

P21 planning keeps these rules:

- no real Codex config mutation
- no real Claude config mutation
- no startup/watchdog install
- no service or watchdog start by default
- no provider smoke / benchmark
- no broad real memory preview
- no durable DB / memory / diary write
- no SQLite migration or `ALTER TABLE`
- no import/export apply
- no MCP schema change
- no public MCP tool expansion
- no package or lockfile change
- no release candidate, tag, release, or deploy

## Non-Goals

P21 planning does not:

- make Claude a durable writer
- expose `validate_memory` as a public MCP tool
- add `update_memory`, `supersede_memory`, `forget_memory`, `audit_memory`, `checkpoint_memory`, or `handoff_memory`
- change `record_memory` public schema
- change `search_memory` runtime behavior
- change `memory_overview` runtime behavior
- edit real client configuration
- implement UI
- start P22 release candidate work

## P21 Planning Result

Result: `P21_CLIENT_INTEGRATION_HARDENING_PLANNED`

P21 can proceed to client integration inventory.

It is not sufficient to authorize config edits, runtime changes, MCP public tool expansion, provider calls, migration/import-export apply, or release-candidate work.

## Next Recommended Phase

`P21.1-client-integration-inventory`
