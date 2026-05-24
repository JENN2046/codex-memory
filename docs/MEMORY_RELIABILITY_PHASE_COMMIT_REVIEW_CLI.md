# Memory Reliability Phase Commit Review CLI

Status: `MEMORY_RELIABILITY_PHASE_COMMIT_REVIEW_CLI_COMPLETED_NOT_READY`

Task: `CM-0939`

## Purpose

`src/cli/memory-reliability-phase-commit-review.js` reruns the CM-0938 isolation review and reads current `git status --short`.

It exists to make the current stage/commit/push decision auditable before any future phase commit:

- current live recall proof remains blocked
- current live write proof remains blocked
- current local commit remains blocked while ownership is mixed or unverified
- push remains blocked because no safe stage/commit candidate exists
- recall/write reliability and readiness remain unclaimed

## Command

```powershell
node .\src\cli\memory-reliability-phase-commit-review.js --json
```

Pretty JSON:

```powershell
node .\src\cli\memory-reliability-phase-commit-review.js --json --pretty
```

Candidate-path dry-run:

```powershell
node .\src\cli\memory-reliability-phase-commit-review.js --json --worktree-ownership verified_intended_scope --shared-state-hunks-isolated --proposed-path src/core/MemoryReliabilityPhaseCommitReview.js --verified-path src/core/MemoryReliabilityPhaseCommitReview.js
```

Scoped candidate dry-run:

```powershell
node .\src\cli\memory-reliability-phase-commit-review.js --json --scoped-candidate --worktree-ownership verified_intended_scope --proposed-path src/cli/memory-reliability-phase-commit-review.js --verified-path src/cli/memory-reliability-phase-commit-review.js
```

Text summary:

```powershell
node .\src\cli\memory-reliability-phase-commit-review.js
```

## Behavior

The CLI:

- runs the CM-0938 isolation review path
- runs read-only `git status --short`
- classifies dirty paths into shared state, reliability baseline, reliability preflight, runtime/test surface, untracked files, and other files
- can optionally evaluate explicit `--proposed-path` / `--verified-path` candidates without staging them
- can evaluate a scoped candidate subset with `--scoped-candidate`, while still reporting unrelated dirty paths for operator review
- reports `commitCandidateReady=false` for the current mixed/unverified dirty baseline
- reports `safeToStage=false`
- reports `safeToCommit=false`
- reports `safeToPush=false`
- keeps recall/write reliability unclaimed

If an explicit candidate covers the dirty tree and ownership has been separately verified, the CLI may return `MEMORY_RELIABILITY_PHASE_COMMIT_REVIEW_CANDIDATE_READY_NOT_EXECUTED`.
With `--scoped-candidate`, the candidate does not need to cover every dirty path. It must still be a non-empty dirty path set, every proposed path must be verified, and any proposed shared-state path requires `--shared-state-hunks-isolated`.
That is only a review result. It still reports `safeToStage=false`, `safeToCommit=false`, and `safeToPush=false`; any future Git action must be a separate guarded step after staged diff inspection and validation.

The current blocked review means the next safe action is not to stage or commit. The next safe action is to verify ownership, isolate shared-state hunks, propose exact commit paths, and rerun this review before any future stage/commit.

## Rejected Flags

The CLI rejects execution-like and Git-write flags before it builds the isolation review or reads Git status:

```text
--execute
--run
--live-proof
--search-memory
--record-memory
--provider
--write
--apply
--mutate
--start-service
--stage
--commit
--push
```

Rejected flags return:

```text
MEMORY_RELIABILITY_PHASE_COMMIT_REVIEW_REJECTED_EXECUTION_FLAG
```

## Safety Boundary

This CLI does not:

- stage files
- commit
- push
- call `search_memory`
- call `record_memory`
- call providers or APIs
- start services
- run live recall proof
- run live write proof
- read raw memory
- read `.jsonl`
- write durable memory
- write durable audit
- expand public MCP tools
- change package/config/watchdog/startup files
- claim recall reliability
- claim write reliability
- claim readiness

It may execute the existing CM-0938 read-only path, read-only `git status --short`, and evaluate explicit candidate path arguments.
Scoped candidate mode does not hide unrelated dirty files; it only avoids treating them as part of the current candidate.

## Validation

CM-0939 validation:

```powershell
node --check src\core\MemoryReliabilityPhaseCommitReview.js
node --check src\cli\memory-reliability-phase-commit-review.js
node --check tests\memory-reliability-phase-commit-review.test.js
node --check tests\memory-reliability-phase-commit-review-cli.test.js
node --test tests\memory-reliability-phase-commit-review.test.js
node --test tests\memory-reliability-phase-commit-review-cli.test.js
```

Required adjacent regression checks:

```powershell
node --test tests\memory-reliability-proof-baseline-isolation-review.test.js
node --test tests\memory-reliability-proof-baseline-isolation-review-cli.test.js
```

Current runtime state remains `RC_NOT_READY_BLOCKED`.
