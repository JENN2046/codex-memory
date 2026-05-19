# Phase F Readonly VCP Parity Gap Inventory

Status: `READONLY_INVENTORY_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `19cbe941e968034d69018822378654cbc070f191`

Workspace: `A:\codex-memory`

Branch: `main`

## Purpose

Inventory the remaining VCP practical parity work after `RC_PRECHECK_001` readonly precheck and A5-GAP-6 evidence aggregation, using only existing docs and source-referenced project state. This is a planning and routing document. It does not execute runtime checks, read real memory stores, expand public MCP tools, or claim readiness.

## Readonly Inputs

This inventory uses existing repository documents only:

- [docs/PHASE_F_LOCAL_SAFE_PREP.md](/A:/codex-memory/docs/PHASE_F_LOCAL_SAFE_PREP.md)
- [docs/VCP_MEMORY_PARITY_ROADMAP.md](/A:/codex-memory/docs/VCP_MEMORY_PARITY_ROADMAP.md)
- [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)
- [MAINTENANCE_BACKLOG.md](/A:/codex-memory/MAINTENANCE_BACKLOG.md)
- [docs/P66_RUNTIME_GAP_TRUTH_TABLE.md](/A:/codex-memory/docs/P66_RUNTIME_GAP_TRUTH_TABLE.md) as the current runtime-gap dashboard reference

No real diary, SQLite, vector index, candidate cache, recall audit, provider, HTTP runtime, migration, backup, restore, or config surface was inspected by this inventory.

## Current Protected Baseline

The project already protects these VCP-facing surfaces:

- MCP service identity: `vcp_codex_memory`
- Public MCP tools: `record_memory`, `search_memory`, `memory_overview`
- HTTP MCP and stdio MCP entrypoints
- Diary-compatible writes
- SQLite shadow store, vector index, write audit, recall audit, candidate cache
- Active-memory compatibility, compare harness, rollback harness
- DeepMemo and TopicMemo donor-compatible CLI surfaces
- Mainline gate, HTTP observe, rollback plan, provider/profile diagnostic commands
- Public MCP freeze: no new public tool without a dedicated approved phase

## Gap Inventory

| Gap ID | Area | Current signal | Local-safe next step | Blocked boundary |
|---|---|---|---|---|
| F-GAP-01 | TagMemo / semantic association parity | Roadmap names P16 as near-term parity focus after policy, lifecycle, object model, donor parity, and quality gates. | Prepare fixture/test-only matrix for TagMemo association strength, semantic grouping, query expansion, and ordering expectations. | Runtime recall behavior changes, real recall observation, provider-backed quality, and broad memory scans require separate plan/approval. |
| F-GAP-02 | Donor behavior parity maintenance | P14 standing compare/rollback gates exist and recent RC precheck compare/rollback passed. | Refresh docs-only coverage inventory for DeepMemo/TopicMemo/TagMemo edge categories and intentional differences. | New donor runtime semantics or public contract changes require targeted tests and likely gate-level validation. |
| F-GAP-03 | Query-quality confidence | P15 fixture recall dry-run and query-quality direction exist; provider-backed quality remains opt-in. | Draft fixture-only query-quality evidence matrix and classify which checks are safe dry-run vs provider/A5. | Provider calls and real memory broad scans remain blocked. |
| F-GAP-04 | Memory lifecycle/governance maturity | P10-P12/P8 surfaces exist, but governance proposal/supersession/tombstone/forget flow remains strategic. | Draft governance proposal flow design covering proposal, review, supersession, tombstone, stale, and forget boundaries. | Durable writes, real governance report execution, public write tools, and approval runtime loops require exact approval. |
| F-GAP-05 | VCP object model / migration safety | P13/P18 object-model and migration-readiness directions exist; migration apply remains blocked. | Draft object-model parity checklist and import/export dry-run fixture criteria. | Real migration/import/export/backup/restore apply remains A5 blocked. |
| F-GAP-06 | Observability/admin review surface | P19 and Phase F prep allow design drafts; public MCP remains frozen. | Draft CLI/JSON/Markdown review surface requirements and schema snapshot guard plan. | Public MCP expansion, service startup, HTTP live checks, and config/watchdog/startup changes remain blocked. |
| F-GAP-07 | Client-scoped Codex/Claude governance | P21 direction exists; current project protects scope and MCP contract. | Draft client-scope parity checklist for visibility, leakage prevention, and acceptance docs. | Real client config changes and cross-client live validation require explicit approval. |
| F-GAP-08 | Runtime-gap closure evidence | P66 local proof chain and RC_PRECHECK evidence exist, but remaining runtime gaps still keep `NOT_READY_BLOCKED`. | Keep dashboard linked and prepare exact approval packets only when a specific runtime proof is chosen. | Runtime proof execution, recall observation, durable writes, public MCP expansion, cutover, and readiness claims remain blocked. |
| F-GAP-09 | Local production hardening | P20 direction exists; local operations and watchdog/startup remain sensitive. | Draft local ops hardening checklist and rollback/health documentation map. | Startup/watchdog install, config mutation, service lifecycle changes, push/tag/release/deploy/cutover remain blocked. |

## Prioritized Local-Safe Slices

Recommended order:

1. `CM-0526` - Phase F fixture/test-only parity hardening matrix, starting with `F-GAP-01` TagMemo / semantic association parity.
2. `CM-0527` - Observability/admin review surface design draft for `F-GAP-06`.
3. `CM-0528` - Memory governance proposal draft for `F-GAP-04`.
4. Future task - object-model and migration dry-run fixture checklist for `F-GAP-05`.
5. Future task - client-scope parity checklist for `F-GAP-07`.

## Recommended First Implementation Candidate

The smallest useful next slice is docs/fixture/test-only planning for TagMemo / semantic association parity:

```text
CM-0526 Phase F fixture/test-only parity hardening matrix
```

Target output should be a matrix that names fixture categories before any source/runtime changes:

- association strength
- semantic grouping
- query expansion
- EPA / ResidualPyramid interaction
- deterministic ordering and tie-breakers
- donor-compatible intentional differences
- compare/rollback category mapping
- forbidden readiness claims

## Explicit Non-Goals

This inventory does not:

- run `npm test`, strict gate, HTTP observe, compare, rollback, provider smoke, or benchmark
- execute recall path observation
- read real memory stores or audit logs
- mutate durable memory/audit state
- change runtime, source, tests, dependencies, config, or `.env`
- expand public MCP tools
- push, tag, release, deploy, or cut over
- declare `RC_READY`, runtime readiness, final RC readiness, production readiness, or cutover readiness

## Result

`CM-0525` completes as a readonly inventory. The project remains:

```text
NOT_READY_BLOCKED
```
