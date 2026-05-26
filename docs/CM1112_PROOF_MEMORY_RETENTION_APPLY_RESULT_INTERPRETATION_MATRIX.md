# CM1112 Proof Memory Retention Apply Result Interpretation Matrix

Status: `CM1112_PROOF_MEMORY_RETENTION_APPLY_RESULT_INTERPRETATION_MATRIX_COMPLETED_NOT_EXECUTED_NOT_READY`
Date: 2026-05-25
Workspace: `A:\codex-memory`

## Purpose

CM-1112 defines how any future CM-1111 proof-memory retention tombstone apply result must be interpreted.

This matrix exists to prevent overclaiming from a possible future apply. It does not approve CM-1111, execute CM-1111, run `tombstone-memory`, read stores, read audit logs, or verify post-apply recall behavior.

## Source Packet

CM-1112 consumes the draft-only CM-1111 packet as input:

```text
source_packet=CM-1111-PROOF-MEMORY-RETENTION-APPLY-APPROVAL-001
source_packet_status=DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY
target_head=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
target_memory_id=codex-process-50325be15fdb479d805728fe420b4838
request_sha256=a4c569b83f69ca1f2743321eb6d4fa6749edad5a7e0e8184d670964380c08338
```

## Matrix

| Class | Future Evidence Shape | Interpretation | Allowed Downgrade | Required Stop |
|---|---|---|---|---|
| `DRAFT_ONLY_NO_EVIDENCE` | CM-1111 remains unapproved or unexecuted | No apply evidence exists. | none | Continue local planning only. |
| `FAIL_CLOSED_APPROVAL_INVALID` | Approval line missing, stale head, request hash mismatch, memory id mismatch, command mismatch, or max runs not exactly `1` | Execution is invalid and must not run. | none | Stop before command. |
| `INVALID_SCOPE_EXPANSION` | Execution adds `record_memory`, `search_memory`, `memory_overview`, broad store scan, cleanup/rollback/migration apply, worker start, config/startup/package change, public MCP expansion, or remote action | Evidence is invalid for CM-1111. | none | Stop and record scope breach. |
| `INVALID_RAW_OR_SECRET_OUTPUT` | Output exposes raw memory, evidence, diary, raw audit, direct `.jsonl`, token, provider key, auth header, database URL, or broad corpus summary | Evidence is invalid and must be treated as a safety breach. | none | Stop; do not summarize raw value. |
| `FAIL_CLOSED_COMMAND_FAILED` | CLI fails to start, times out, exits with malformed output, or emits non-JSON when JSON is required | No reliable apply result. | none | Stop; no retry. |
| `REJECTED_NOT_FOUND` | Sanitized result says memory not found | The exact proof memory was not tombstoned. | none | Stop; no broad search. |
| `REJECTED_ALREADY_TOMBSTONED` | Sanitized result says current status is already `tombstoned` | CM-1111 did not prove a new apply; prior tombstone state would need separate provenance. | possible downgrade from unknown lifecycle state to sanitized already-tombstoned observation only | Stop; no retry. |
| `REJECTED_FORBIDDEN_SOURCE_STATUS` | Sanitized result rejects `proposal`, `rejected`, `tombstoned`, or other disallowed source state | CM-1111 did not apply. Lifecycle state needs separate review. | possible downgrade from unknown lifecycle state to sanitized rejected status observation only | Stop; no retry. |
| `REJECTED_SCHEMA_OR_POLICY_UNAVAILABLE` | Sanitized result rejects missing lifecycle status column, missing tombstone reason column, cross-client private guard, secret-like text, or policy guard | Apply safety guard worked, but no tombstone apply happened. | possible downgrade for fail-closed guard behavior only | Stop; no retry. |
| `REJECTED_AUDIT_INTENT_FAILED` | Sanitized result says audit intent append failed before mutation | Mutation did not apply because audit-first guard failed. | possible downgrade for audit-before-mutation guard only | Stop; no retry. |
| `REJECTED_AFTER_PENDING_CANCELLED` | Sanitized result includes pending audit intent and cancelled audit after lifecycle guard changed before mutation | Mutation did not apply; audit cancellation path was observed. | possible downgrade for pending/cancelled audit behavior only | Stop; no retry. |
| `APPLIED_WITH_COMMIT_AUDIT_WARNING` | Sanitized result says mutation applied but committed audit append failed after pending audit | Tombstone may have applied, but audit closure is incomplete. | at most partial lifecycle apply evidence with audit warning | Stop; require separate review before any blocker downgrade. |
| `APPLIED_TOMBSTONED_SANITIZED` | Sanitized result says `decision=tombstoned`, `mutated=true`, exact memory id, expected from/to status, `auditIntentStatus=appended`, `auditCommitStatus=appended`, lifecycle/scope/redaction policies true, and no forbidden output | One exact-approved local lifecycle tombstone apply result exists for the proof memory. | from no exact proof-memory tombstone apply result to one sanitized exact proof-memory tombstone apply result | Stop before any post-apply verification. |
| `POST_APPLY_VERIFICATION_MISSING` | Apply appears successful but no separate post-apply recall/overview/read-policy verification has run | Apply evidence does not prove live/default suppression. | none beyond exact apply result | Draft separate post-apply verification packet if needed. |

## Maximum Possible Downgrade

Even in the strongest valid future CM-1111 outcome, the maximum downgrade is:

```text
from: no exact-approved proof-memory retention tombstone apply result exists
to: one exact-approved sanitized local tombstone apply result exists for the exact CM-1100 proof memory
```

It still does not prove:

- post-apply public/default recall suppression
- post-apply `memory_overview` projection
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

## Follow-Up If CM-1111 Later Applies

If a future CM-1111 execution returns `APPLIED_TOMBSTONED_SANITIZED`, the next safe step is not a reliability claim. The next safe step is a separate exact approval packet for bounded post-apply verification, likely limited to sanitized public-tool or approved metadata-only observations.

That future packet must decide whether it needs:

- sanitized `search_memory` / `memory_overview` public-tool observation
- metadata-only exact-id lifecycle status observation
- bounded audit correlation observation
- no raw memory/audit/diary/`.jsonl` output
- no cleanup/rollback apply
- no readiness/reliability claim

## Boundary

CM-1112 performed:

- local interpretation matrix drafting
- docs/status/board update

CM-1112 did not perform:

- CM-1111 approval
- CM-1111 execution
- `tombstone-memory` run
- `record_memory`
- `search_memory`
- `memory_overview`
- raw memory, raw store, raw audit, diary, or `.jsonl` read
- metadata store read
- durable memory/audit write
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

`CM1112_PROOF_MEMORY_RETENTION_APPLY_RESULT_INTERPRETATION_MATRIX_COMPLETED_NOT_EXECUTED_NOT_READY`

CM-1112 is a no-execution matrix only.
