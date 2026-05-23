# CM-0821 Feature Branch Review And Mainline Integration Plan

Status: `CM0821_FEATURE_BRANCH_REVIEW_READY_NOT_RELIABLE_NOT_READY`
Date: 2026-05-23
Branch reviewed: `codex/true-live-recall-raw-read-boundary`
Reviewed branch head: `f9e7e13fbccbd46b6483863d4b966d653d5f755b`
Mainline baseline: `origin/main = remote refs/heads/main = 20e7a9d7b26b0f5cabb70a908c0ea7ce83c50712`
Decision: `RC_NOT_READY_BLOCKED`

## Scope

CM-0821 reviews the already pushed CM-0820 feature branch and decides whether it is suitable for PR or explicit mainline integration planning.

This review does not merge the branch, does not create a PR, does not execute true live `search_memory`, does not read real memory content or `.jsonl`, does not call providers, does not write durable memory or audit state, and does not claim `memory recall reliable`.

## Reviewed Commits

- `5a86869 fix: harden live recall raw read boundary`
- `f9e7e13 docs: record raw read boundary branch push review`

Reviewed changed scope against `origin/main`:

- `src/core/TrueLiveRecallExecutorAdapter.js`
- `src/app.js`
- `src/recall/KnowledgeBaseRecallPipeline.js`
- `tests/true-live-recall-executor-adapter.test.js`
- `tests/true-live-recall-precision-policy-path.test.js`
- `tests/recall-precision-hardening-bounded.test.js`
- `docs/TRUE_LIVE_RECALL_EXECUTOR_RAW_READ_BOUNDARY_PATCH.md`
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- `STATUS.md`
- `MAINTENANCE_BACKLOG.md`
- `.agent_board/*`

No package, lockfile, public MCP schema, config, watchdog, startup, migration, provider, durable-store, or release surface is in scope.

## Review Findings

No blocking finding was found in the changed scope.

Acceptance points:

- The executor adapter scans raw `search_memory` response results before runner projection.
- Upstream raw result fields now fail closed before sanitization instead of being silently stripped into a successful response.
- The adapter forwards `executionContext.noRawContentRead=true` on the approved internal runner path.
- `src/app.js` only accepts `noRawContentRead` for `noTokenReadOnly=true` and `requestSource=internal-true-live-recall-readonly-proof-runner`.
- Public or non-approved injected `noRawContentRead` fails before passive recall search.
- `KnowledgeBaseRecallPipeline` requires direct `noRawContentRead` usage to be boolean, read-only, and `includeContent=false`.
- Pipeline metadata-only aggregation under `noRawContentRead=true` skips `shadowStore.getRecordsByIds`, avoids `record.rawText` / `record.content`, and omits raw-derived result fields.
- The feature branch reclassifies CM-0801 / CM-0814 `rawMemoryContentReads=0` as pre-patch sanitized-output boundary evidence until a future exact-approved proof runs through the patched metadata-only path.

Validation already evidenced on the feature branch:

- adapter targeted test passed `7/7`
- approved app path targeted test passed `5/5`
- internal proof runner targeted test passed `8/8`
- bounded precision pipeline targeted test passed `9/9`
- `git diff --check` passed
- docs validation passed

## Mainline Integration Plan

Recommended next action: create a PR or request explicit mainline integration review for `codex/true-live-recall-raw-read-boundary`.

Mainline integration conditions:

1. The branch head to integrate should be `f9e7e13fbccbd46b6483863d4b966d653d5f755b` or a reviewed descendant with the same boundary behavior.
2. `origin/main` should be rechecked before integration for behind/remote drift.
3. The target diff should remain limited to CM-0820/CM-0821 source, tests, docs, status, and `.agent_board` surfaces.
4. Re-run targeted validation before merge:
   - `node --check src\core\TrueLiveRecallExecutorAdapter.js`
   - `node --check src\recall\KnowledgeBaseRecallPipeline.js`
   - `node --check src\app.js`
   - `node --test tests\true-live-recall-executor-adapter.test.js`
   - `node --test tests\true-live-recall-precision-policy-path.test.js`
   - `node --test tests\true-live-recall-internal-proof-runner.test.js`
   - `node --test tests\recall-precision-hardening-bounded.test.js`
   - `git diff --check`
   - docs validation
5. After mainline integration, run CM-0822 post-mainline reconciliation before using CM-0820 as a mainline baseline.

## Residual Risks

- The branch is not merged into `main` yet.
- CM-0820 is a boundary patch, not a true live proof replay.
- Existing CM-0801 / CM-0814 `rawMemoryContentReads=0` evidence remains pre-patch sanitized-output boundary evidence.
- A future proof must explicitly run through the patched metadata-only path before `rawMemoryContentReads=0` can be stronger no-raw-content-read evidence.
- `memory recall reliable` remains not claimed.
- `RC_NOT_READY_BLOCKED` remains.

## Next Step

CM-0822 should run only after CM-0820 is integrated into `main`.

If mainline integration is not yet approved, the next local-safe step is CM-0823: review the patched metadata-only proof path in more detail and prepare the exact approval packet preconditions without executing live proof.
