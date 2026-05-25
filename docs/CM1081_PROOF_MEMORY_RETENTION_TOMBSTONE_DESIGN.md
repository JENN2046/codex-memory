# CM1081 Proof Memory Retention Tombstone Design

Status: `PROOF_MEMORY_RETENTION_TOMBSTONE_DESIGN_PREVIEW_PASSED_NOT_IMPLEMENTED`
Date: 2026-05-25
Workspace: `A:\codex-memory`

## Purpose

CM-1081 designs proof memory retention/tombstone automation without applying tombstone or cleanup.

The implementation in this slice is intentionally limited to:

- design doc
- pure helper
- temp-local tests only

It does not mutate real memory, tombstone real proof records, start an automatic worker, expand public MCP, call providers, call true `record_memory`, call true `search_memory`, read raw memory, read direct `.jsonl`, read raw audit, apply cleanup, apply rollback, change package/config/watchdog/startup/dependencies, tag, release, deploy, or claim readiness/reliability.

## Design

The helper `ProofMemoryRetentionTombstonePlan` accepts explicit temp-local input only:

```text
mode = design_preview_only
scope = temp_local_explicit_input_only
records = synthetic proof-memory records
```

It identifies proof memories by existing internal proof markers:

- `visibility = internal_proof`
- `retentionPolicy = short_lived_or_tombstone_after_validation`
- `tags` includes `proof`

It can produce planned tombstone actions only when all conditions are true:

- record has a non-empty `memoryId`
- record is internal proof memory
- record is not already `tombstoned`
- validation status is accepted/passed/validated/complete
- `validatedAt` is present
- retention window has elapsed

Every planned action is non-applying:

```text
action = tombstone_internal_proof_memory
applies = false
requiresSeparateApplyApproval = true
requiresRuntimeValidationBeforeApply = true
auditRequiredBeforeApply = true
```

## Fail-Closed Boundaries

The helper blocks if input attempts any of these:

- tombstone apply
- cleanup apply
- rollback apply
- automatic worker start
- public MCP expansion
- real-store mode
- unsupported mode/scope

Blocked output still reports all safety flags as non-mutating.

## Validation

Temp-local tests cover:

- eligible validated proof memory yields a planned tombstone action with `applies=false`
- ordinary, unvalidated, recent, and already tombstoned records do not produce planned actions
- apply/worker/public-MCP/real-store attempts fail closed
- public MCP tools remain frozen at `memory_overview`, `record_memory`, and `search_memory`

## Status

```text
proof_retention_tombstone_automation = NOT_IMPLEMENTED
tombstone_apply = false
cleanup_apply = false
automatic_worker_started = false
public_mcp_expansion = false
real_memory_mutation = false
readiness_claimed = false
reliability_claimed = false
```

## Next

Future CM-1082 may design a store-backed dry-run preview adapter. That future step must still stop before apply and must not start an automatic worker or mutate real proof records without separate explicit approval.
