# Memory Reliability Proof Baseline Isolation Review CLI

Status: `MEMORY_RELIABILITY_PROOF_BASELINE_ISOLATION_REVIEW_CLI_COMPLETED_NOT_READY`

Task: `CM-0969`

## Purpose

`src/cli/memory-reliability-proof-baseline-isolation-review.js` reruns the CM-0968 dirty-baseline blocker-plan path and reads current `git status --short`.

It exists to make the current isolation decision auditable:

- live recall proof remains blocked
- live write proof remains blocked
- unscoped local commit remains blocked while ownership is mixed or unverified
- recall/write reliability and readiness remain unclaimed

## Command

```powershell
node .\src\cli\memory-reliability-proof-baseline-isolation-review.js --json
```

Pretty JSON:

```powershell
node .\src\cli\memory-reliability-proof-baseline-isolation-review.js --json --pretty
```

Text summary:

```powershell
node .\src\cli\memory-reliability-proof-baseline-isolation-review.js
```

## Behavior

The CLI:

- runs the CM-0968 blocker-plan CLI path
- runs read-only `git status --short`
- classifies dirty paths into shared state, runtime/test surface, reliability-baseline files, untracked files, and other files
- reports `safeForLiveProof=false`
- reports `safeForCommit=false`
- keeps recall/write reliability unclaimed

An accepted blocked review means the next safe action is still to isolate or commit only verified intended changes, then rerun CM-0968 and CM-0969 from a clean synced baseline before any separate live proof.

## Rejected Flags

The CLI rejects execution-like and Git-write flags before it builds the blocker plan or reads Git status:

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
MEMORY_RELIABILITY_PROOF_BASELINE_ISOLATION_REVIEW_REJECTED_EXECUTION_FLAG
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

It may execute the existing CM-0968 read-only path and read-only `git status --short`.

## Validation

CM-0969 validation:

```powershell
node --check src\core\MemoryReliabilityProofBaselineIsolationReview.js
node --check src\cli\memory-reliability-proof-baseline-isolation-review.js
node --check tests\memory-reliability-proof-baseline-isolation-review.test.js
node --check tests\memory-reliability-proof-baseline-isolation-review-cli.test.js
node --test tests\memory-reliability-proof-baseline-isolation-review.test.js
node --test tests\memory-reliability-proof-baseline-isolation-review-cli.test.js
```

Required adjacent regression checks:

```powershell
node --test tests\memory-reliability-proof-baseline-blocker-plan-cli.test.js
node --test tests\memory-reliability-proof-baseline-blocker-plan.test.js
```

Current runtime state remains `RC_NOT_READY_BLOCKED`.
