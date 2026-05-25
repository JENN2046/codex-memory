# CM1082 Proof Memory Retention Tombstone Store-Backed Dry-Run Preview

Status: `PROOF_MEMORY_RETENTION_TOMBSTONE_STORE_BACKED_DRY_RUN_PREVIEW_ACCEPTED_NOT_APPLIED_NOT_READY`
Date: 2026-05-25
Workspace: `A:\codex-memory`

## Purpose

CM-1082 extends the CM-1081 proof-memory tombstone design from pure explicit input into a temp-local store-backed dry-run preview.

The slice is intentionally limited to:

- metadata-only temp-local store reads
- a store-backed dry-run preview helper
- temp-local tests
- no apply gate activation

It does not mutate real memory, tombstone real proof records, start an automatic worker, expand public MCP, call providers, call true `record_memory`, call true `search_memory`, read raw memory, read direct `.jsonl`, read raw audit, apply cleanup, apply rollback, change package/config/watchdog/startup/dependencies, tag, release, deploy, or claim readiness/reliability.

## Design

The helper `ProofMemoryRetentionTombstoneStoreBackedDryRunPreview` accepts only:

```text
mode = store_backed_dry_run_preview_only
scope = temp_local_store_backed_read_only
storeProvenance = temp_local_fixture
previewOnly = true
dryRun = true
target = process
```

Before any store read it fail-closes on:

- tombstone apply
- cleanup apply
- rollback apply
- automatic worker start
- public MCP expansion
- real-store mode
- non-temp-local provenance
- missing `shadowStore.listProofMemoryRetentionCandidates`

When accepted, it asks the injected store for bounded metadata-only proof retention candidates and then delegates to the CM-1081 no-apply planner. The resulting planned actions remain:

```text
action = tombstone_internal_proof_memory
applies = false
requiresSeparateApplyApproval = true
requiresRuntimeValidationBeforeApply = true
auditRequiredBeforeApply = true
```

The new `SqliteShadowStore.listProofMemoryRetentionCandidates(...)` reader returns only metadata required for retention planning:

- `memoryId`
- `target`
- `tags`
- `validated`
- `validationStatus`
- `validatedAt`
- `validatedAtSource`
- `visibility`
- `status`
- `retentionPolicy`

It does not return content, evidence, raw text, diary data, audit data, `.jsonl` lines, chunks, vectors, or candidate-cache payloads.

## Apply Gate

CM-1082 returns an explicit apply gate:

```text
applyAuthorized = false
applyExecuted = false
tombstoneApplyRunsAllowed = 0
cleanupApplyRunsAllowed = 0
rollbackApplyRunsAllowed = 0
nextAllowedAction = request_separate_tombstone_apply_approval
```

The gate is informational only. It does not approve or execute tombstone apply.

## Validation

Temp-local tests cover:

- store-backed metadata-only candidate read omits content/evidence
- eligible validated proof memory produces a no-apply planned tombstone action
- ordinary and recent proof records do not produce planned actions
- store health record count remains unchanged
- apply/worker/public-MCP/real-store attempts block before store reads
- missing temp-local provenance or store helper blocks before store reads
- public MCP tools remain frozen at `memory_overview`, `record_memory`, and `search_memory`

## Status

```text
proof_retention_tombstone_store_backed_dry_run_preview = ACCEPTED_NOT_APPLIED_NOT_READY
tombstone_apply = false
cleanup_apply = false
rollback_apply = false
automatic_worker_started = false
public_mcp_expansion = false
real_memory_mutation = false
raw_memory_read = false
raw_jsonl_read = false
raw_audit_read = false
readiness_claimed = false
reliability_claimed = false
```

## Next

Future CM-1083 may continue the proof retention/tombstone ladder only if it preserves preview-first behavior and stops before tombstone apply, cleanup apply, automatic worker enablement, public MCP expansion, or readiness/reliability claims unless a separate exact approval explicitly authorizes that boundary.
