# Memory Recall Temp Workspace Evidence Plan

Status: `MEMORY_RECALL_TEMP_WORKSPACE_EVIDENCE_PLAN_COMPLETED_NOT_READY`
Date: 2026-05-22
Scope: plan-only temp workspace recall evidence design
Baseline: `3d6100aff0520d2863a4c21e33ee9db7fbef7fd5`
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

This plan defines the next bounded memory recall evidence layer after CM-0755 and CM-0756.

The intended future evidence sits between fixture-only in-memory validation and true live real-store `search_memory`. It should use a temporary local workspace with synthetic seed data only. It must not read real memory content, must not read `.jsonl` audit or durable memory content, must not call providers, must not write durable memory or audit state, and must not claim memory recall reliability.

This document is planning only. It does not execute temp workspace recall validation.

## Preconditions

- `MEMORY_RECALL_BOUNDED_EVIDENCE_REVIEW_COMPLETED_SYNCED_NOT_READY` is complete.
- `RC_NOT_READY_BLOCKED` remains the controlling state.
- `memory recall reliable` remains not claimed.
- Public MCP tools remain frozen.
- No provider, real memory, `.jsonl`, durable write, package/config, release, cutover, or readiness action is authorized by this plan.

## Temp Workspace Root Policy

Future execution must create or use one isolated local temp root under an explicit test/temp path such as:

```text
<repo>\tmp\memory-recall-temp-workspace-evidence\CM-0757-<run-id>
```

Root policy:

- The root must be inside the repository workspace or the OS temp directory under a run-specific child directory.
- The root must be freshly created for the run or proven empty before use.
- The root must not point at the real memory store, real audit directory, real diary directory, real shadow store, or user-owned memory content.
- The root must contain only synthetic seed files generated for this evidence packet.
- Any future cleanup must delete only the run-specific temp root after resolving and verifying that it is inside the intended temp parent.
- If the temp root cannot be proven isolated, execution must fail closed.

## Synthetic Memory Seed Shape

Future execution should seed exactly four synthetic records in the temp workspace:

1. Expected current record:
   - `memoryId`: `temp-recall-expected-current`
   - `target`: `process`
   - `folder`: `alpha`
   - `title`: `Temp alpha bounded recall current`
   - `content`: `temp alpha recall expected current content`
   - `tags`: `["temp-alpha", "bounded-recall"]`
   - `createdAt` / `updatedAt`: current synthetic timestamp

2. Older expected record:
   - `memoryId`: `temp-recall-expected-older`
   - `target`: `process`
   - `folder`: `alpha`
   - `title`: `Temp alpha bounded recall older`
   - `content`: `temp alpha recall older content`
   - `tags`: `["temp-alpha", "bounded-recall"]`
   - `createdAt` / `updatedAt`: older synthetic timestamp

3. Irrelevant same-folder record:
   - `memoryId`: `temp-recall-irrelevant-same-folder`
   - `target`: `process`
   - `folder`: `alpha`
   - `title`: `Temp omega unrelated note`
   - `content`: `temp omega unrelated content`
   - `tags`: `["temp-omega"]`

4. Irrelevant different-folder record:
   - `memoryId`: `temp-recall-irrelevant-other-folder`
   - `target`: `process`
   - `folder`: `beta`
   - `title`: `Temp beta unrelated note`
   - `content`: `temp beta unrelated content`
   - `tags`: `["temp-beta"]`

Seed constraints:

- Seeds must be generated inside the temp root only.
- Seeds must be synthetic and non-sensitive.
- Seeds must not be copied from real memory content or real audit content.
- Seeds must be sufficient to exercise expected match, irrelevant suppression, freshness ordering, and folder filtering.

## Query Count

Future execution should run exactly four bounded temp workspace recall queries:

1. Expected-result query:
   - Query: `temp alpha bounded recall`
   - Expected primary ID: `temp-recall-expected-current`
   - Expected accepted IDs: `temp-recall-expected-current`, optionally `temp-recall-expected-older` after the current item.

2. Irrelevant suppression query:
   - Query: `temp alpha bounded recall`
   - Expected absence: `temp-recall-irrelevant-same-folder`, `temp-recall-irrelevant-other-folder`.

3. Folder behavior query:
   - Query: `temp alpha bounded recall`
   - Folder scope: `alpha`
   - Expected absence: `temp-recall-irrelevant-other-folder`.

4. Timeout/error boundary query:
   - Query: `temp alpha bounded recall timeout`
   - Timeout budget: small bounded value chosen by the future packet.
   - Expected error: `SEARCH_MEMORY_TIMEOUT` with JSON-RPC code `-32002`.

No additional queries are allowed without a new exact plan update.

## Expected Result Criteria

Pass criteria:

- Query 1 returns `temp-recall-expected-current`.
- Returned output is sanitized and excludes raw `content`.
- Returned IDs are deterministic for the seeded temp corpus.
- If both expected records are returned, current synthetic timestamp sorts before older synthetic timestamp.

Fail criteria:

- Expected current ID is absent.
- Raw content is returned.
- Output includes non-synthetic IDs.
- Query count exceeds the planned count.

## Irrelevant Suppression Criteria

Pass criteria:

- `temp-recall-irrelevant-same-folder` is absent from expected-result output.
- `temp-recall-irrelevant-other-folder` is absent from expected-result output.
- No result comes from outside the temp root seed set.

Fail criteria:

- Any irrelevant synthetic ID appears in the accepted result set.
- Any real memory ID or unplanned ID appears.
- Any raw memory content appears.

## Freshness And Folder Behavior Criteria

Freshness pass criteria:

- When both expected synthetic alpha records match, `temp-recall-expected-current` sorts before `temp-recall-expected-older`.
- Freshness evidence is reported as ordering metadata only, not as real store freshness.

Folder behavior pass criteria:

- A folder-scoped alpha query excludes beta-folder records.
- Folder evidence is reported as temp workspace behavior only, not as VCP full parity.

Fail criteria:

- Older synthetic record sorts above the current synthetic record without a documented deterministic tie-breaker.
- Beta-folder synthetic record appears in an alpha-scoped result.
- Any real folder, real diary path, or real memory directory is inspected.

## Timeout/Error Criteria

Pass criteria:

- Timeout query returns `SEARCH_MEMORY_TIMEOUT`.
- JSON-RPC code remains `-32002`.
- Timeout output is sanitized.
- Timeout side-effect counters remain zero.

Fail criteria:

- Timeout returns a generic or unbounded error.
- Timeout path writes durable memory/audit state.
- Timeout path reads real memory, `.jsonl`, or provider-backed data.

## No-Provider Rule

Future execution must force provider calls to zero.

Acceptable provider posture:

- Use local hash, deterministic synthetic vectors, stubs, or disabled-provider config.
- Assert provider call counter equals `0`.
- Fail closed if external embedding or rerank provider configuration would be used.

## No-Real-Memory Rule

Future execution must not execute true live `search_memory` against the real store.

Allowed:

- Local temp workspace recall over synthetic seed data only.
- In-process helpers or CLI paths that are explicitly pointed at the temp root.

Forbidden:

- Real memory broad scan.
- Real diary store lookup.
- Real shadow store lookup.
- Real user memory content read.
- Any output containing real memory IDs or raw memory content.

## No-.jsonl-Read Rule

Future execution must not read `.jsonl` audit or durable memory content.

Allowed:

- Synthetic non-`.jsonl` seed files if needed.
- In-memory seed data generated during the run.

Forbidden:

- Reading real recall audit `.jsonl`.
- Reading real write audit `.jsonl`.
- Reading durable memory `.jsonl`.
- Copying `.jsonl` content into the temp root.

## Cleanup Expectation

Future execution must declare cleanup behavior before running:

- Cleanup target must be exactly the run-specific temp root.
- Cleanup must occur only after resolving the target path and verifying it is under the intended temp parent.
- Cleanup must not use broad destructive commands.
- If cleanup cannot be safely verified, leave the temp root in place and report the path for manual review rather than deleting outside scope.

This plan does not perform cleanup because it does not create a temp workspace.

## Evidence Output Shape

Future execution should emit one sanitized evidence object:

```json
{
  "taskId": "MEMORY_RECALL_TEMP_WORKSPACE_EVIDENCE_EXECUTION",
  "baseline": "<commit>",
  "evidenceClass": "temp_workspace_bounded_recall",
  "tempWorkspaceRoot": "<sanitized-temp-root>",
  "seedRecordCount": 4,
  "queryCount": 4,
  "expectedResultMatched": true,
  "expectedPrimaryId": "temp-recall-expected-current",
  "irrelevantResultsSuppressed": true,
  "freshnessOrderingAccepted": true,
  "folderScopeAccepted": true,
  "timeoutErrorCode": "SEARCH_MEMORY_TIMEOUT",
  "timeoutJsonRpcCode": -32002,
  "providerCalls": 0,
  "realMemoryReads": 0,
  "jsonlReads": 0,
  "durableMemoryWrites": 0,
  "durableAuditWrites": 0,
  "rawContentOutput": false,
  "readinessClaimAllowed": false,
  "decision": "TEMP_WORKSPACE_RECALL_EVIDENCE_ACCEPTED_NOT_READY"
}
```

## Pass/Fail Result Labels

Allowed future result labels:

- `MEMORY_RECALL_TEMP_WORKSPACE_EVIDENCE_COMPLETED_NOT_READY`
- `MEMORY_RECALL_TEMP_WORKSPACE_EVIDENCE_FAILED_NOT_READY`
- `BLOCKED_SCOPE_DRIFT`
- `BLOCKED_VALIDATION_FAILED`
- `BLOCKED_HARD_STOP_REQUIRED`

No result label may claim recall reliability, runtime readiness, RC readiness, production readiness, release readiness, or cutover readiness.

## No-Readiness Wording

Required wording for future execution:

- `memory recall reliable`: not claimed.
- `memory write reliable`: not claimed.
- Runtime ready: not claimed.
- RC ready: not claimed.
- Production ready: not claimed.
- V8 implemented: not claimed.
- VCP full parity: not claimed.
- `RC_NOT_READY_BLOCKED` remains.

## Forbidden Actions

- Execute true live `search_memory` against the real store.
- Read real memory content.
- Read `.jsonl` audit or durable memory content.
- Call providers.
- Broad scan real memory.
- Write durable memory or durable audit state.
- Apply migration/import/export/backup/restore.
- Expand public MCP tools.
- Change config/watchdog/startup.
- Change package or lockfile.
- Tag, release, deploy, cutover, or claim readiness.

## Closeout

This plan defines the next bounded temp workspace evidence layer only.

It does not execute recall validation.

`memory recall reliable`: not claimed.

`RC_NOT_READY_BLOCKED` remains.

Result: `MEMORY_RECALL_TEMP_WORKSPACE_EVIDENCE_PLAN_COMPLETED_NOT_READY`.
