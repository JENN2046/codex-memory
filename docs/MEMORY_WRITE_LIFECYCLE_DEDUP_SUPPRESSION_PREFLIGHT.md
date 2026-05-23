# Memory Write Lifecycle Dedup Suppression Preflight

Date: 2026-05-23
Task: CM-0836
Status: MEMORY_WRITE_LIFECYCLE_DEDUP_SUPPRESSION_PREFLIGHT_COMPLETED_NOT_READY
Scope: fixture-only explicit-input helper and targeted tests; no real memory store

## Boundary

This slice extends the write reliability evidence ladder after CM-0835 by adding a bounded governance preflight helper:

- `src/core/MemoryWriteLifecycleDedupSuppressionPreflight.js`
- `tests/memory-write-lifecycle-dedup-suppression-preflight.test.js`

The helper is pure explicit-input code. It does not read files, scan real memory, read `.jsonl`, call providers, write durable memory, write audit logs, expand public MCP tools, change config/watchdog/startup, or execute `record_memory` / `search_memory`.

It is not wired into the runtime `record_memory` path. It is preflight contract evidence for lifecycle / dedup / scope / pollution suppression, not proof that default runtime writes are reliable.

## Evidence

Targeted validation:

```text
node --check src\core\MemoryWriteLifecycleDedupSuppressionPreflight.js
node --check tests\memory-write-lifecycle-dedup-suppression-preflight.test.js
node --test tests\memory-write-lifecycle-dedup-suppression-preflight.test.js
```

Observed result:

```text
8/8 tests passed
```

Covered behavior:

| Dimension | Evidence | Limit |
|---|---|---|
| Clean synthetic write preflight | accepts a synthetic process write with exact allowed scope and no existing duplicates | not runtime write acceptance |
| Duplicate suppression | suppresses a same-scope active duplicate by canonical hash | helper is not yet integrated into `MemoryWriteService` |
| Terminal lifecycle duplicate | rejects same-scope duplicate of tombstoned / superseded / rejected / forgotten memory for review | does not implement durable lifecycle mutation |
| Scope mismatch | rejects proposed writes outside the exact allowed project/workspace/client/task/conversation/visibility/retention scope | exact allowed scope must be supplied by caller |
| Pollution rejection | rejects synthetic secret-like payload through existing `SecretScanner` before write preflight acceptance | one bounded secret-like class in this test |
| Schema metadata rejection | rejects schema/version metadata before preflight acceptance | mirrors runtime boundary at helper level only |
| Lifecycle action approval | gates supersede / tombstone / forget on exact approval plus required reason/id fields | approval is explicit input only; no approval issuance |
| No side effects | helper reports no file reads, provider calls, real memory scans, durable writes, audit writes, public MCP expansion, or readiness claim | fixture-only evidence |

## Current Limits

This evidence still does not prove:

- `memory write reliable`;
- runtime idempotence in `record_memory`;
- default unattended write reliability;
- true live accepted-write reliability;
- durable lifecycle proposal / approval / supersession / tombstone / forget mutation behavior;
- real rollback cleanup;
- long-run durability;
- VCP full parity.

## Closeout

`CM-0836` narrows the write reliability gap by turning duplicate/idempotence, scope mismatch, lifecycle state, and pollution suppression into a targeted executable preflight contract. It is a bounded helper and targeted test layer only. It does not alter public MCP, does not change the runtime write path, and does not claim readiness.

`memory write reliable` remains exact approval required and not claimed. Runtime ready, RC ready, production ready, V8 implemented, and VCP full parity remain not claimed.

Controlling state remains `RC_NOT_READY_BLOCKED`; no row changes to `complete? = yes`.
