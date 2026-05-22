# Next Runtime Gap Selection

Status: `NEXT_RUNTIME_GAP_SELECTION_COMPLETED_NOT_READY`
Date: 2026-05-22
Scope: selection and planning only
Baseline: `08d13685c7c0375ae4e562d0e1de311eec956698`

This document selects the next runtime/readiness gap from the v1 Mainline Candidate package and the current runtime gap truth table. It does not execute runtime validation, call `record_memory` or `search_memory`, call a provider, scan real memory, write durable memory or audit state, apply migration/import/export/backup/restore work, expand public MCP, change config/watchdog/startup, push a release, or claim readiness.

## Inputs Reviewed

- `docs/V1_MAINLINE_CANDIDATE_PACKAGE.md`
- `docs/V1_MAINLINE_CANDIDATE_PACKAGE_REVIEW.md`
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- `STATUS.md`
- `MAINTENANCE_BACKLOG.md`
- `.agent_board/*`

## Remaining Blockers

| Rank | Blocker | Risk level | A5 hard stop? | Can enter A5 compact batch? | Selection note |
|---:|---|---|---|---|---|
| 1 | `memory recall reliable` is not claimed | A5 bounded runtime/readiness evidence | yes for true memory recall evidence | yes, with exact bounded scope | Highest-priority gap because the candidate package and truth table both put recall reliability first after RC_PRECHECK_003 repaired pass. |
| 2 | `memory write reliable` is not claimed | A5 bounded write-path evidence | yes for true write execution | yes, but lower priority | `CM-0737` proves only exact-approved bounded execution happened once accepted after one rejected attempt; it is exact-approval-only evidence, not general write reliability. |
| 3 | ValidationAggregator full implementation remains incomplete | A2/A5 depending on scope | no for local implementation; yes if consuming runtime evidence | yes if separately scoped | Collector progress is accepted, but full aggregator implementation is not complete and should not be used to claim readiness. |
| 4 | Real rollback apply remains blocked | A5 real-state operation | yes | no, unless separately exact-approved | Existing compare/rollback harness evidence is strong, but real rollback apply remains a hard stop. |
| 5 | Migration/import/export/backup/restore apply remains blocked | A5 real-data operation | yes | no, unless separately exact-approved | Fixture/dry-run evidence does not authorize real apply/import/export/backup/restore work. |
| 6 | Runtime / RC / production / release / cutover readiness remains blocked | A5 release/cutover boundary | yes | no | Requires zero open runtime gaps, fresh approved evidence, and explicit release/cutover authorization. |
| 7 | V8 not implemented and VCP full parity not claimed | strategic implementation | depends on exact slice | not as next runtime evidence batch | Important long-term work, but not the next narrow runtime/readiness evidence gap. |

## Selected Gap

Selected unique next gap:

```text
MEMORY_RECALL_RELIABILITY_BOUNDED_EVIDENCE_BATCH
```

Rationale:

- It addresses the top-ranked remaining blocker: `memory recall reliable` is not claimed.
- It is closer to the Mainline Memory Spine runtime/readiness gap than additional governance/autopilot documentation.
- It can be bounded as an exact A5 compact batch with sanitized output and explicit non-claims.
- It can preserve existing hard stops by avoiding provider calls, broad real-memory scans, durable writes, migration/backup apply, public MCP expansion, config/watchdog/startup changes, and readiness wording.

## Future Batch Boundary

A future exact-approved `MEMORY_RECALL_RELIABILITY_BOUNDED_EVIDENCE_BATCH` should define:

- exact allowed recall/read commands before execution;
- exact query count, target scope, and timeout budget;
- sanitized evidence output shape with no raw memory content;
- side-effect boundary for provider, cache, audit, and durable writes;
- target baseline and drift rule;
- warning handling rule;
- no-readiness wording.

It should forbid:

- true `record_memory` writes unless separately named and approved;
- provider calls;
- broad real-memory scan/export/import;
- durable memory or audit writes unless separately named and approved;
- migration/import/export/backup/restore apply;
- public MCP expansion;
- config/watchdog/startup changes;
- package or lockfile changes;
- force push, tag, release, deploy, or cutover;
- any `memory recall reliable`, runtime, RC, production, V8, or VCP full parity claim.

## Why Not More Governance Or Autopilot Surface

The current package already records that autopilot / authorization surface growth is frozen. More governance/autopilot documents would increase surface area while the highest remaining blockers are runtime/readiness evidence gaps. The next useful step is to test a narrow Mainline Memory Spine recall reliability boundary, not to add another operator surface.

## Why `RC_NOT_READY_BLOCKED` Remains

`RC_NOT_READY_BLOCKED` remains because:

- this task is selection and planning only;
- no runtime validation was executed;
- `memory recall reliable` is not claimed;
- `memory write reliable` is not claimed;
- ValidationAggregator full implementation is not complete;
- real rollback and migration/import/export/backup/restore apply remain A5 hard stops;
- runtime/RC/production/release/cutover readiness remains blocked;
- V8 is not implemented and VCP full parity is not claimed.

Result: `NEXT_RUNTIME_GAP_SELECTION_COMPLETED_NOT_READY`
