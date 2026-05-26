# CM1119 Selected Audit Correlation Result Interpretation Matrix

Status: `CM1119_SELECTED_AUDIT_CORRELATION_RESULT_INTERPRETATION_MATRIX_COMPLETED_NOT_EXECUTED_NOT_READY`
Date: 2026-05-26
Workspace: `A:\codex-memory`

## Purpose

CM-1119 defines how any future exact-approved selected audit-correlation observation must be interpreted.

This matrix prevents CM-1118's temp-fixture helper from being overclaimed as true audit evidence, and prevents any future selected audit observation from being overclaimed as write reliability, recall reliability, cleanup safety, rollback safety, or readiness.

CM-1119 does not approve or execute CM-1111, CM-1115, CM-1117, or any audit observation. It does not read true audit logs, raw audit payloads, stores, diary files, `.jsonl` lines, or metadata stores.

## Source Inputs

CM-1119 consumes two current local artifacts:

```text
source_packet=CM-1117-POST-TOMBSTONE-AUDIT-CORRELATION-APPROVAL-001
source_packet_status=DRAFT_BLOCKED_NO_SAFE_READER_NOT_EXECUTED_NOT_READY
source_helper=AuditLogStore.readSelectedWriteAuditCorrelation(...)
source_helper_evidence=CM1118_SELECTED_AUDIT_CORRELATION_READER_TEMP_FIXTURE_EVIDENCE_COMPLETED_NOT_LIVE_NOT_READY
target_head=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
target_memory_id=codex-process-50325be15fdb479d805728fe420b4838
required_prior_result_1=CM-1111:APPLIED_TOMBSTONED_SANITIZED
required_prior_result_2=CM-1115:METADATA_STATUS_TOMBSTONED_EXPECTED_SCOPE
```

CM-1117 remains invalid for execution unless a future separate exact approval exists at execution time. CM-1118 only proves helper behavior in temp fixtures.

## Matrix

| Class | Future Evidence Shape | Interpretation | Allowed Downgrade | Required Stop |
|---|---|---|---|---|
| `DRAFT_ONLY_NO_EVIDENCE` | CM-1117 remains unapproved or unexecuted | No true audit-correlation observation exists. | none | Continue local planning only. |
| `FAIL_CLOSED_PRIOR_RESULTS_MISSING` | CM-1111 or CM-1115 required result classes are absent, stale, mismatched, or invalid | Audit-correlation observation is invalid because the apply and metadata lifecycle preconditions are not established. | none | Stop before true audit read. |
| `FAIL_CLOSED_APPROVAL_INVALID` | Approval line missing, stale head, request hash mismatch, memory id mismatch, selected field mismatch, max reads not exactly `1`, or approval permits any forbidden action | Execution is invalid and must not run. | none | Stop before true audit read. |
| `INVALID_SCOPE_EXPANSION` | Execution adds `record_memory`, `search_memory`, `memory_overview`, `tombstone-memory`, raw store reads, raw audit reads, direct `.jsonl` reads, provider/API calls, apply commands, config/startup/package changes, public MCP expansion, or remote actions | Evidence is invalid for CM-1117. | none | Stop and record scope breach. |
| `INVALID_RAW_OR_SECRET_OUTPUT` | Output exposes title, reason, evidence, raw audit payload, raw `.jsonl` line, memory content, diary content, chunk text, vector data, token, provider key, auth header, database URL, or broad corpus summary | Evidence is invalid and must be treated as a safety breach. | none | Stop; do not summarize raw value. |
| `FAIL_CLOSED_READER_UNAVAILABLE` | `AuditLogStore.readSelectedWriteAuditCorrelation(...)` is missing, changed incompatibly, or no longer returns `selectedFieldsOnly=true` and `rawAuditReturned=false` | The safe selected-field reader precondition is absent. | none | Stop before true audit read. |
| `FAIL_CLOSED_AUDIT_READ_FAILED` | Selected audit observation fails to start, times out, throws, returns malformed output, or cannot be interpreted as the selected field set | No reliable selected audit-correlation observation. | none | Stop; no retry. |
| `AUDIT_CORRELATION_NOT_FOUND` | Reader returns `found=false` with reason `selected_audit_correlation_not_found` | Exact pending+committed audit pair was not observed in the selected recent window. | possible downgrade to exact-id no-correlation observation only | Stop; no broad audit scan. |
| `AUDIT_MEMORY_ID_MISMATCH` | Pending or committed event memory id differs from the target memory id | Evidence does not belong to the target proof memory. | none | Stop before blocker downgrade. |
| `AUDIT_EVENT_FAMILY_MISMATCH` | Event type or tool name differs from `memory_tombstone` | Evidence is not the expected tombstone mutation audit family. | none | Stop before blocker downgrade. |
| `AUDIT_REQUEST_SOURCE_MISMATCH` | Request source differs from `CM-1111-proof-memory-retention-apply` | Evidence cannot be correlated to the expected CM-1111 apply source. | none | Stop before blocker downgrade. |
| `AUDIT_PENDING_MISSING` | Committed event exists in the selected projection but pending is null | No valid pending-before-mutation intent was observed. | none | Stop before blocker downgrade. |
| `AUDIT_COMMITTED_MISSING` | Pending exists but committed is null | Pending intent exists without a selected committed audit pair. | possible downgrade to pending-only observation only | Stop before apply-provenance claim. |
| `AUDIT_CORRELATION_ID_MISMATCH` | Committed `correlationId` does not equal pending `eventId`, or committed `eventId` does not match expected pending event id semantics | Pending and committed records are not a valid selected pair. | none | Stop before blocker downgrade. |
| `AUDIT_PHASE_OR_MUTATION_FLAG_MISMATCH` | Pending phase is not `pending`, pending mutation flag is not false, committed phase is not `committed`, or committed mutation flag is not true | Audit phase semantics are not the expected pending/committed mutation sequence. | none | Stop before blocker downgrade. |
| `AUDIT_LIFECYCLE_TRANSITION_MISMATCH` | From/to statuses do not match expected `active -> tombstoned` for this exact packet | Audit lifecycle metadata does not match the expected CM-1111 proof-memory retention transition. | possible downgrade to mismatched transition observation only | Stop before blocker downgrade. |
| `AUDIT_SELECTED_CORRELATION_OBSERVED` | Reader returns `found=true`, selected fields only, raw audit not returned, exact memory id, event family, request source, pending/committed pair, correlation id, phase flags, mutation flags, actor, and lifecycle transition match | One selected-field audit-correlation observation exists for the exact CM-1100 proof memory and expected tombstone apply source. | from no selected audit-correlation observation to one exact-approved selected-field audit-correlation observation | Stop before recall, durability, cleanup, rollback, or reliability claims. |
| `AUDIT_OBSERVED_BUT_METADATA_LIFECYCLE_MISSING` | Audit pair is favorable but CM-1115 metadata lifecycle observation is missing or stale | Audit metadata alone does not prove current lifecycle projection. | none beyond selected audit observation | Stop; require metadata lifecycle evidence first. |
| `AUDIT_OBSERVED_BUT_RECALL_SUPPRESSION_MISSING` | Audit pair is favorable but public/default recall suppression is not separately observed | Audit metadata is not recall behavior. | none beyond selected audit observation | Use only already-approved public-tool observation or draft a separate packet. |

## Maximum Possible Downgrade

Even in the strongest valid future selected audit-correlation outcome, the maximum downgrade is:

```text
from: no exact-approved selected audit-correlation observation exists
to: one exact-approved selected-field audit-correlation observation reports pending and committed memory_tombstone audit metadata for the exact CM-1100 proof memory and expected CM-1111 request source
```

It still does not prove:

- raw audit payload safety beyond the selected reader output
- raw store absence
- chunk/vector/cache absence
- current metadata lifecycle projection unless CM-1115 separately exists
- public/default recall suppression
- cleanup safety
- rollback safety
- long-run durability
- automatic retention worker safety
- startup/watchdog enforcement
- public/default write reliability
- public/default recall reliability
- `memory write reliable`
- `memory recall reliable`
- runtime readiness
- RC readiness
- production readiness
- release/cutover readiness
- truth-table `complete? = yes`

## Follow-Up If A Future Observation Is Favorable

If a future exact-approved selected audit observation returns `AUDIT_SELECTED_CORRELATION_OBSERVED`, the next safe step is still not a reliability or readiness claim.

The next possible evidence gaps remain:

- public/default recall suppression for the exact proof memory
- post-apply metadata lifecycle observation if not already established
- cleanup/rollback safety review
- long-run durability / restart behavior
- automatic retention worker safety

Each future gap requires its own separate boundary or approval packet.

## Boundary

CM-1119 performed:

- local interpretation matrix drafting
- docs/status/board update

CM-1119 did not perform:

- CM-1111 approval
- CM-1111 execution
- CM-1115 approval
- CM-1115 execution
- CM-1117 approval
- CM-1117 execution
- `tombstone-memory` run
- `record_memory`
- `search_memory`
- `memory_overview`
- true audit log read
- raw audit read
- direct `.jsonl` read
- raw memory, raw store, diary, or metadata store read
- durable project memory/audit write
- tombstone apply
- cleanup apply
- rollback apply
- migration/import/export/backup/restore apply
- provider/API/model call
- worker start
- public MCP expansion
- config/watchdog/startup/package/lockfile change
- push/tag/release/deploy/cutover
- readiness or reliability claim

## Decision

`CM1119_SELECTED_AUDIT_CORRELATION_RESULT_INTERPRETATION_MATRIX_COMPLETED_NOT_EXECUTED_NOT_READY`

CM-1119 is a no-execution matrix only.
