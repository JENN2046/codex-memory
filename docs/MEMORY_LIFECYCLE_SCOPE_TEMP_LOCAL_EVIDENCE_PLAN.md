# Memory Lifecycle Scope Temp Local Evidence Plan

Status: `MEMORY_LIFECYCLE_SCOPE_TEMP_LOCAL_EVIDENCE_PLAN_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0846`

## Purpose

This plan defines the next governance-closure evidence layer after `CM-0845`.

The goal is to move lifecycle/scope read-policy evidence from pure explicit fixture candidates into an isolated temp-local runtime-like workspace, while still avoiding true live memory actions, real memory content, direct `.jsonl` reads, provider calls, durable real writes, cleanup apply, rollback apply, public MCP expansion, or readiness/reliability claims.

## Evidence Boundary

The future execution may use only a run-specific isolated temp root created for the test. All records must be synthetic and disposable.

Allowed future inputs:

- synthetic lifecycle records;
- synthetic governance transition records;
- synthetic scope metadata;
- synthetic recall candidate projections;
- temporary local store files under the exact test temp root.

Forbidden future inputs:

- true live `record_memory`;
- true live `search_memory`;
- real user/project memory content;
- direct real `.jsonl` or durable memory content reads;
- provider/model/API calls;
- broad real-memory scans;
- durable real memory or audit writes;
- cleanup apply;
- rollback apply;
- migration/import/export/backup/restore apply;
- public MCP expansion;
- package/config/watchdog/startup changes;
- readiness or reliability claims.

## Temp Root Policy

The future test must create one run-specific temp root under the platform temp directory and verify cleanup after execution.

The test must fail closed if any path escapes the temp root. Evidence output may include only sanitized path labels such as `temp_root_created=true` and `cleanup_verified=true`, not absolute temp paths when avoidable.

## Synthetic Record Shape

Use a small fixed synthetic corpus:

| record | lifecycle | scope | expected normal recall effect |
|---|---|---|---|
| `active-exact-current` | active | exact current scope | included |
| `proposal-exact` | proposal | exact current scope | suppressed |
| `tombstoned-exact` | tombstoned | exact current scope | suppressed |
| `active-other-project` | active | project mismatch | suppressed |
| `preflight-rejected-exact` | preflight_rejected | exact current scope | suppressed |
| `malformed-scope` | active + malformed scope marker | malformed | suppressed |

The exact current scope should include:

- `userId`;
- `projectId`;
- `workspaceId`;
- `clientId`;
- `agentId`;
- `taskId`;
- `conversationId`;
- `folder`;
- `visibility`;
- `retentionPolicy`.

## Query Count

The future temp-local execution should use exactly four bounded read-policy checks:

1. mixed lifecycle suppression;
2. scope mismatch suppression;
3. malformed lifecycle/scope fail-closed behavior;
4. sanitized output and cleanup verification.

No true live `search_memory` query is allowed.

## Expected Result Criteria

The future evidence passes only if:

- active exact-scope synthetic records are included;
- proposal / preflight-rejected / tombstoned records are suppressed;
- out-of-scope records are suppressed with exact mismatch metadata;
- malformed lifecycle/scope records fail closed;
- unresolved bad-write remediation records are suppressed when present;
- suppressed output excludes raw `content`, `text`, `title`, `snippet`, file path, and raw storage fields;
- side-effect counters remain zero;
- cleanup is verified.

## Irrelevant Suppression Criteria

The future execution must prove that irrelevant or unsafe records do not appear in accepted normal recall output:

- inactive lifecycle states;
- out-of-scope records;
- malformed metadata;
- unresolved remediation;
- records outside the exact temp root.

Suppressed records may appear only as sanitized explanatory metadata.

## Freshness And Folder Criteria

The future execution should include synthetic timestamps or rank hints only to verify deterministic ordering among accepted exact-scope candidates. It must not infer real recency quality.

Folder behavior must prove that exact current folder scope is honored and mismatched folder records are suppressed.

## Timeout And Error Criteria

The future test should include one bounded error fixture or simulated timeout branch. The expected output is a bounded failed-not-ready label with zero side-effect counters and no cleanup leakage.

## Evidence Output Shape

The future execution document should record:

- task id;
- temp root policy result;
- synthetic record count;
- exact check count;
- accepted count;
- suppressed count;
- blocker categories;
- raw content exposure flag;
- side-effect counters;
- cleanup verification;
- pass/fail label;
- no-readiness wording.

Allowed labels:

- `MEMORY_LIFECYCLE_SCOPE_TEMP_LOCAL_EVIDENCE_COMPLETED_NOT_READY`;
- `MEMORY_LIFECYCLE_SCOPE_TEMP_LOCAL_EVIDENCE_FAILED_NOT_READY`;
- `BLOCKED_VALIDATION_FAILED`;
- `BLOCKED_SCOPE_DRIFT`;
- `BLOCKED_HARD_STOP_REQUIRED`.

## No-Readiness Wording

Passing this future temp-local evidence must not claim:

- runtime lifecycle governance implemented;
- runtime read-policy integrated;
- memory recall reliable;
- memory write reliable;
- runtime readiness;
- RC readiness;
- production readiness;
- V8 implemented;
- VCP full parity.

`RC_NOT_READY_BLOCKED` remains the controlling state.

## Next Minimal Gate

The next safe executable gate is `MEMORY_LIFECYCLE_SCOPE_TEMP_LOCAL_EVIDENCE_EXECUTION`.

That future gate should add a targeted temp-local test and execution evidence document while preserving all no-real-memory, no-provider, no-durable-write, no-apply, and no-readiness boundaries.
