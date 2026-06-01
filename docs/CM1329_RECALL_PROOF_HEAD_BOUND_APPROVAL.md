# CM-1329 Recall Proof Head-Bound Approval

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Purpose

Tighten the true-live recall proof entry path before any Red-line/A5 execution by making the approval line bind to a concrete `main` commit.

CM-1328 identified that the implemented preflight still accepted a legacy approval phrase that referred to the "current synced main head" without naming the commit in the approval text. CM-1329 keeps the legacy phrase accepted for compatibility, but adds a fresh-head-bound approval form and makes the current-facts preflight generate it from the observed local `HEAD`.

## Changed Behavior

- `buildHeadBoundApprovalLine(commit)` renders an exact approval line containing `on branch main at commit <40hex>`.
- `parseHeadBoundApprovalLine(...)` accepts only the exact head-bound wording and extracts the commit.
- `RecallProofExecutionPreflight` accepts head-bound approval only when the approval commit equals the normalized local `HEAD`.
- `TrueLiveRecallReadonlyProofRunner.assertExactApproval(...)` accepts head-bound approval only when the approval commit matches the supplied `baselineCommit`, if a valid baseline commit is supplied.
- The head-bound profile requires the four CM-0814 stricter negative-control queries.
- `recall-proof-current-facts-preflight` now builds the head-bound approval line from current read-only Git facts.

## Current Read-Only Preflight

Command run:

```powershell
node src\cli\recall-proof-current-facts-preflight.js --json --pretty
```

Result:

```text
status=blocked
decision=RECALL_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED
approvalBinding.type=head_bound_commit
approvalBinding.commit=5c8aeb63f3fb2beb695d00d7151b58178aa6de08
blockerReasons=local_origin_head_mismatch, dirty_worktree
executionStarted=false
liveProofStarted=false
```

Interpretation:

- Approval binding is now concrete and commit-bound.
- Live proof remains blocked because local `main` is not synced to `origin/main` and the worktree is dirty from the current local source/test/docs work.
- This change does not execute `search_memory`, `record_memory`, provider/model/API calls, service startup, raw memory reads, `.jsonl` reads, durable memory/audit writes, migration/import/export/backup/restore apply, config/watchdog/startup changes, public MCP expansion, push, release, deploy, cutover, or readiness/reliability claims.

## Validation

- `node --check` passed for changed source, CLI, and tests.
- Targeted recall proof/preflight/reliability tests passed `38/38`.
- Current-facts preflight remained blocked-not-executed with head-bound approval binding.

## Next Step

Before any live recall proof:

1. Stabilize and, if separately authorized, push local commits so local `HEAD` can equal `origin/main`.
2. Reach a clean worktree under the implemented preflight requirement.
3. Re-run `node src\cli\recall-proof-current-facts-preflight.js --json --pretty`.
4. Execute live proof only if the preflight returns `acceptedForExecutionPreflight=true` and a separate exact approval is present for the bounded proof path.
