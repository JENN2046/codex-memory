# P53 ValidationAggregator Evidence Inventory

Status: inventory contract only.

P53-T1 defines the evidence inventory that a future ValidationAggregator full implementation must consume. This slice does not execute the aggregator, a helper, a gate, a runner, live MCP, provider code, runtime stores, or real memory scans.

## Scope

P53-T1 is limited to:

- existing committed report-shape evidence
- explicit local validation ledger references
- machine-readable evidence source classes
- freshness and failure semantics for future aggregation
- current known gaps and blockers

P53-T1 does not:

- implement the full ValidationAggregator
- execute the final RC matrix runner
- collect evidence by scanning files or directories
- read diary, SQLite, vector, candidate cache, recall audit, or real memory content
- start services or refresh live MCP
- call providers or models
- expand the public MCP surface
- perform durable memory or audit writes
- apply migration/import/export/backup/restore
- claim runtime readiness or v1.0 RC readiness

## Evidence Classes

The future aggregator must keep these classes distinct:

| Class | Meaning | Readiness authority |
|---|---|---|
| `committed_evidence` | Evidence represented by committed code, docs, fixtures, or tests | None by itself |
| `local_validation` | Explicit validation results supplied by the caller or ledger | None by itself |
| `runtime_evidence` | Future explicit runtime boundary evidence object | None until runtime gates exist and pass |
| `final_rc_matrix_evidence` | Future final RC matrix runner output | None until runner executes and critical gates pass |

Fixture evidence and local validation evidence can support planning, but they cannot be represented as runtime enforcement or RC readiness.

## Status Semantics

The inventory uses the following exact statuses:

- `fresh`: explicit evidence is present, supported, non-sensitive, and within the freshness window.
- `stale`: evidence exists but is outside the freshness window or tied to an older baseline.
- `missing`: required evidence is absent.
- `unsupported`: source type or shape is not allowed.
- `blocked`: the source would require an A5 action or unsafe runtime path.
- `not_executed`: the source exists only as a planned or static posture and has not been run.

For critical evidence, `stale`, `missing`, `unsupported`, `blocked`, and `not_executed` all keep the report `NOT_READY_BLOCKED`.

## Current Inventory

Current safe evidence is limited to committed/static posture and explicit validation records:

- P36-P40 boundary, policy, isolation, migration dry-run, and local readiness fixtures
- P41-P45 evidence manifest, explicit-input helpers, isolation helper, aggregator posture, and evaluator skeleton
- P46-P50 redaction, evidence bridge, consistency guard, P45 posture bridge, and no-touch regressions
- P51-P52 post-push reconciliation, schema/version boundary contract, and minimal explicit-input helper

The following remain unavailable or non-authoritative:

- live schema/version runtime enforcement
- final RC matrix runner execution
- runtime governance review/approval/audit loop
- runtime recall isolation proof
- migration/import-export/backup-restore approval execution
- live HTTP runtime observability evidence for RC

## Decision

P53-T1 is accepted as an inventory contract only. The future ValidationAggregator full implementation must consume explicit safe inputs, keep unsupported or stale evidence fail-closed, and preserve `NOT_READY_BLOCKED` until runtime gates and the final RC runner actually pass.
