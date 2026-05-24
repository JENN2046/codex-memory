# MEMORY_RELIABILITY_PROOF_BASELINE_READINESS_POLICY

Status: `MEMORY_RELIABILITY_PROOF_BASELINE_READINESS_POLICY_COMPLETED_NOT_READY`

Task: `CM-0934`

Date: 2026-05-24

## Purpose

`CM-0934` adds one explicit-input policy helper that combines the recall and write current-facts preflight reports into a single baseline-readiness decision.

This exists because both reliability lanes already have dedicated preflight tooling:

- recall: `CM-0904` / `CM-0906`, blocked by `CMB-0013`
- write: `CM-0907` / `CM-0908`, blocked by `CMB-0014`

The new helper does not run those commands. It consumes their reports and answers whether both lanes are clean enough for a future separate live proof step.

## Added

- [MemoryReliabilityProofBaselineReadinessPolicy.js](/A:/codex-memory/src/core/MemoryReliabilityProofBaselineReadinessPolicy.js)
- [memory-reliability-proof-baseline-readiness-policy.test.js](/A:/codex-memory/tests/memory-reliability-proof-baseline-readiness-policy.test.js)

## Accepted Inputs

The helper accepts only:

- schema `memory-reliability-proof-baseline-readiness-policy-v1`
- source mode `explicit_input`
- `reviewOnly=true`
- `currentFactsOnly=true`
- `liveProofAuthorized=false`
- exact denied action list
- one recall current-facts preflight report
- one write current-facts preflight report

Each lane must prove:

- source is `current_git_facts_readonly`
- decision matches ready or blocked preflight status
- no execution started
- no live proof started
- no `record_memory` / `search_memory` / provider call
- no raw memory or `.jsonl` read
- no durable memory/audit write
- no public MCP expansion
- no config/watchdog/startup change
- no readiness or reliability claim

## Dirty Baseline Handling

When either lane reports `dirty_worktree` or nonzero `dirtyStatusLineCount`, the helper returns:

- `baselineReadyForLiveProof=false`
- `dirtyBaselineBlocked=true`
- recall blocker id `CMB-0013`
- write blocker id `CMB-0014`

This keeps the next step crisp: resolve dirty-baseline blockers, rerun current-facts preflights, then review a new baseline packet before any separate live proof.

## Validation

Passed:

- `node --check src\core\MemoryReliabilityProofBaselineReadinessPolicy.js`
- `node --check tests\memory-reliability-proof-baseline-readiness-policy.test.js`
- `node --test tests\memory-reliability-proof-baseline-readiness-policy.test.js` (`6/6`)

Coverage includes clean baseline acceptance, dirty-baseline blocking, execution/tool safety drift, readiness/reliability overclaim rejection, denied-action drift, lane decision mismatch, and sensitive explicit-input redaction.

Follow-up validation for any runtime consumer should include recall/write preflight regressions, public MCP freeze scan, `git diff --check`, docs validation, and changed-scope re-review.

## Boundary

No live recall proof was run.

No live write proof was run.

No true `record_memory` or `search_memory` call was run.

No real memory store or raw `.jsonl` was read.

No provider/API call was made.

No durable memory/audit/projection write was made.

No candidate cache was cleared.

No public MCP tool or `callTool()` contract was expanded.

No package/config/watchdog/startup file was changed.

No push/tag/release/deploy/cutover happened.

`memory write reliable`, `memory recall reliable`, runtime readiness, and `RC_READY` remain unclaimed.

## Result

`CM-0934` makes the current reliability-proof blocker state machine-checkable without executing live proof.

The next safe local step is to rerun or consume fresh current-facts preflight outputs only after the dirty baseline is resolved, or continue local reliability/governance work that stays below live proof and durable mutation boundaries.
