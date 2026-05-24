# Memory Reliability Proof Baseline Blocker Plan

Status: `MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKER_PLAN_COMPLETED_NOT_READY`

Task: `CM-0968`

## Purpose

`src/core/MemoryReliabilityProofBaselineBlockerPlan.js` is a pure explicit-input helper for the current reliability proof blocker state.

It consumes the combined CM-0967 baseline CLI report shape and turns the current dirty-baseline result into a deterministic resolution plan.

## Accepted Current Blocker Shape

The helper accepts only when the input proves:

- source report is `CM-0967`
- source mode is explicit input
- baseline decision is `MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKED_NOT_EXECUTED`
- `baselineReadyForLiveProof=false`
- `dirtyBaselineBlocked=true`
- recall blocker is `CMB-0013`
- write blocker is `CMB-0014`
- both lanes report `dirty_worktree`
- both lanes report `dirtyStatusLineCount > 0`
- no execution drift
- no safety drift
- no live proof authorization
- no readiness claim
- no reliability claim
- worktree ownership is still `mixed_or_unverified`
- commit scope is not isolated

## Required Next Actions

The helper requires this exact next-action set:

- `isolate_or_commit_only_verified_intended_changes`
- `rerun_memory_reliability_baseline_cli`
- `require_clean_synced_main_before_live_proof`
- `keep_recall_write_reliability_unclaimed`

## Denied Actions

The helper denies:

- live recall proof
- live write proof
- `record_memory`
- `search_memory`
- provider calls
- raw memory reads
- `.jsonl` reads
- durable memory writes
- durable audit writes
- public MCP expansion
- package/config/watchdog/startup changes
- readiness claims
- reliability claims
- unscoped commit

## Non-Claim

This is blocker-resolution planning only.

It does not:

- run commands
- inspect Git
- start services
- call providers
- call MCP tools
- read real memory
- write durable memory/audit
- authorize a commit
- authorize live proof
- claim `memory recall reliable`
- claim `memory write reliable`
- claim readiness

## Interpretation

The accepted current result means:

```text
Do not run live proof.
Do not claim reliability.
Do not claim readiness.
Do not perform an unscoped commit.
Only isolate or commit verified intended changes, then rerun CM-0967.
```

This keeps `CMB-0013`, `CMB-0014`, and `RC_NOT_READY_BLOCKED` intact until a fresh clean/synced baseline is actually observed.
