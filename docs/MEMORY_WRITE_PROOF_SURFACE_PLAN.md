# Memory Write Proof Surface Plan

Status: `MEMORY_WRITE_PROOF_SURFACE_PLAN_COMPLETED_SYNCED_NOT_READY`
Date: 2026-05-22
Task: `CM-0786`
Decision: `RC_NOT_READY_BLOCKED`
Scope: plan a future bounded write proof surface; no durable write

## Purpose

This plan defines the smallest safe future proof surface for narrowing the `memory write reliable` gap after `CM-0785`.

It does not execute `record_memory`. It does not create or approve a durable write. It does not read raw memory or audit content. It does not claim `memory write reliable`.

The goal is to make a later exact-approved write proof reviewable without expanding public MCP tools or turning one accepted write into a broad reliability claim.

## Current Blocker

Current classification remains:

```text
memory write reliable = exact approval required
complete? = no
```

Current evidence proves only:

- one separately exact-approved rejected `StoreWAsk` attempt;
- one preflight repair and exact-only approval packet surface;
- one separately exact-approved accepted repaired write with `memory_writes=1`;
- no-token mutation rejection as bounded boundary evidence.

Current evidence does not prove default unattended write reliability, broad `record_memory` reliability, multi-client behavior, production behavior, rollback cleanup, migration/import/export/backup/restore behavior, or long-run durability.

## Future Proof Surface

The future proof surface should be a one-time, exact-approved, subject-bound write proof with a deterministic sanitized payload.

Recommended future proof label:

```text
MEMORY_WRITE_BOUNDED_PROOF_EXECUTION_ONCE
```

Recommended future result labels:

- `MEMORY_WRITE_BOUNDED_PROOF_PASSED_NOT_READY`
- `MEMORY_WRITE_BOUNDED_PROOF_FAILED_NOT_READY`
- `MEMORY_WRITE_BOUNDED_PROOF_BLOCKED_BOUNDARY`
- `MEMORY_WRITE_BOUNDED_PROOF_BLOCKED_SCOPE_DRIFT`

No future result label may claim `memory write reliable`, runtime ready, RC ready, production ready, release ready, or cutover ready.

## Exact Approval Boundary

Future execution must require a separately supplied exact approval line. The approval must be tied to the fresh synced `main` head at execution time.

Suggested future approval line template:

```text
I approve MEMORY_WRITE_BOUNDED_PROOF_EXECUTION_ONCE for codex-memory at the current synced main head, limited to exactly one sanitized subject-bound record_memory write using the payload and output boundaries in docs/MEMORY_WRITE_PROOF_SURFACE_PLAN.md, with no search_memory call, no provider call, no direct .jsonl read, no raw durable memory/audit read, no second write, no migration/import/export/backup/restore apply, no config/watchdog/startup change, no public MCP expansion, no package/lockfile change, no tag/release/deploy/cutover, and no readiness claim.
```

Any missing, edited, paraphrased, bundled, stale, broader, or ambiguous approval must fail closed before execution.

## Proposed Payload Shape

The future proof should use one deterministic process-scoped payload:

```json
{
  "target": "process",
  "title": "Checkpoint: bounded write proof for codex-memory mainline spine",
  "content": "Type: bounded-write-proof\nCheckpoint: exact-approved single-write proof for codex-memory mainline spine.\nPurpose: verify one sanitized write path can accept a deterministic process checkpoint payload under exact approval only.\nBoundary: exactly one record_memory write; no search_memory, provider, broad scan, config change, public MCP expansion, second write, release, cutover, or readiness claim.",
  "evidence": "bounded_write_proof cm0786_plan payload_v1 exact_one_write",
  "validated": true,
  "reusable": false,
  "tags": ["codex-memory", "mainline-health", "bounded-write-proof"],
  "sensitivity": "none",
  "client_id": "codex",
  "visibility": "project",
  "retention_policy": "keep"
}
```

The future executor must validate the payload with the same process-memory validation path that rejected the first CM-0737 malformed attempt.

## Execution Preconditions

Before any future execution, automation must freshly verify:

- local branch is `main`;
- worktree is clean;
- local `HEAD`, tracking `origin/main`, and remote `refs/heads/main` are equal;
- this plan is present and unchanged in meaning;
- `docs/MEMORY_WRITE_RELIABILITY_BOUNDED_REVIEW.md` is present;
- no package/lockfile/config/watchdog/startup/public MCP drift occurred after this plan that affects write boundaries;
- the exact approval line was supplied for this execution;
- the payload is exactly the planned shape except for a future run id if explicitly included in the approval packet;
- `record_memory` is called exactly once;
- `search_memory` is not called;
- provider/model/API calls are not required;
- direct `.jsonl` or raw durable memory/audit reads are not required;
- no migration/import/export/backup/restore apply is required.

If any precondition fails, do not execute.

## Required Counters

The future proof output should include a complete side-effect counter set:

- `recordMemoryCalls=1`
- `acceptedMemoryWrites` is `0` or `1`
- `rejectedMemoryWrites` is `0` or `1`
- `durableMemoryWrites` is `0` or `1`
- `durableAuditWrites` is `0` or `1`
- `searchMemoryCalls=0`
- `providerCalls=0`
- `apiCalls=0`
- `directJsonlReads=0`
- `rawDurableMemoryReads=0`
- `rawAuditReads=0`
- `memoryOverviewCalls=0`
- `publicMcpExpansion=0`
- `migrationImportExportBackupRestoreApply=0`
- `configWatchdogStartupChanges=0`
- `packageLockfileChanges=0`
- `tagReleaseDeployCutoverActions=0`
- `readinessClaims=0`

Missing, partial, malformed, non-finite, negative, unknown-positive, or contradictory counters must fail closed.

## Allowed Output Shape

Future output may contain only sanitized evidence:

```text
taskId
baselineCommit
proofRunId
approvalMatched
payloadHash
target
decision
accepted
memoryIdHashOrOpaqueId
shadowWriteStatus
writeAuditSummary:
  status
  appendedCount
  sanitizedOnly
elapsedMs
sideEffectCounters
readinessClaimAllowed=false
memoryWriteReliableClaimed=false
rcNotReadyBlocked=true
```

The output must not include raw content, raw audit lines, raw durable memory records, raw file paths, secrets, tokens, env values, provider credentials, broad dumps, screenshots, or transcripts containing private memory.

## Acceptance Boundary

The future proof can pass only if:

- approval matched exactly;
- exactly one `record_memory` call occurred;
- the payload matched the approved sanitized payload;
- the runtime returned either a reviewable accepted or rejected decision;
- no second write occurred;
- no `search_memory` call occurred;
- no provider/model/API call occurred;
- no direct `.jsonl` or raw durable memory/audit read occurred;
- all required counters are complete and coherent;
- output remains sanitized;
- no readiness or reliability claim is made.

If the write is accepted, the result is still only `MEMORY_WRITE_BOUNDED_PROOF_PASSED_NOT_READY`. It is one additional bounded data point, not broad reliability.

If the write is rejected for a reviewable validation reason, the result may still be useful fail-closed evidence, but the write gap remains open.

## Validation Plan

Before future execution:

```text
git status --short --branch
git log --oneline --decorate -n 10
git rev-parse HEAD
git rev-parse origin/main
git ls-remote origin refs/heads/main
node --test tests\store-freshness-write-preflight-cli.test.js tests\smart-standing-authorization-v3-receipts-cli.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

After future execution, rerun the same targeted tests and docs validation, then update `STATUS.md`, `MAINTENANCE_BACKLOG.md`, `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`, and `.agent_board/*`.

Do not run broad memory scans, provider smoke, package installs, config/watchdog/startup commands, migration/import/export/backup/restore apply, release, tag, deploy, or cutover.

## Current Slice Boundary

This plan slice did not execute true live `record_memory`, true live `search_memory`, provider/model/API calls, real memory broad scans, real memory content reads, `.jsonl` or durable memory content reads, durable memory/audit writes, migration/import/export/backup/restore apply, public MCP expansion, package/lockfile changes, config/watchdog/startup changes, tag/release/deploy/cutover, force push, branch rewrite, or readiness claims.

## Closeout

Result: `MEMORY_WRITE_PROOF_SURFACE_PLAN_COMPLETED_SYNCED_NOT_READY`.

`memory write reliable` remains not claimed.

`RC_NOT_READY_BLOCKED` remains.
