# Memory Reliability Proof Baseline Blocker Plan CLI

Status: `MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKER_PLAN_CLI_COMPLETED_NOT_READY`

Task: `CM-0968`

## Purpose

`src/cli/memory-reliability-proof-baseline-blocker-plan.js` turns the current CM-0967 baseline readiness report into the CM-0968 blocker-plan report.

It exists so an operator can rerun the current dirty-baseline blocker review as one local command without reconstructing the helper packet by hand.

## Command

```powershell
node .\src\cli\memory-reliability-proof-baseline-blocker-plan.js --json
```

Pretty JSON:

```powershell
node .\src\cli\memory-reliability-proof-baseline-blocker-plan.js --json --pretty
```

Text summary:

```powershell
node .\src\cli\memory-reliability-proof-baseline-blocker-plan.js
```

## Behavior

The CLI:

- runs the CM-0967 read-only baseline readiness CLI path
- consumes that report through `MemoryReliabilityProofBaselineBlockerPlan`
- accepts only the current fail-closed dirty-baseline shape
- reports `baselineReadyForLiveProof=false`
- reports `unscopedCommitBlocked=true` while ownership remains mixed or unverified
- keeps recall/write reliability unclaimed

The accepted dirty-baseline plan means:

- `CMB-0013` still blocks recall proof execution
- `CMB-0014` still blocks write proof execution
- live proof remains separate and blocked
- the next safe action is to isolate or commit only verified intended changes, rerun CM-0967, and require a clean synced baseline before any future live proof

## Rejected Flags

The CLI rejects execution-like flags before it builds the baseline report:

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
--commit
--push
```

Rejected flags return:

```text
MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKER_PLAN_REJECTED_EXECUTION_FLAG
```

## Safety Boundary

This CLI does not:

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
- clear candidate cache
- expand public MCP tools
- change package/config/watchdog/startup files
- commit or push
- claim recall reliability
- claim write reliability
- claim readiness

It may execute the existing CM-0967 read-only Git fact collection path.

## Validation

CM-0968 validation:

```powershell
node --check src\cli\memory-reliability-proof-baseline-blocker-plan.js
node --check tests\memory-reliability-proof-baseline-blocker-plan-cli.test.js
node --test tests\memory-reliability-proof-baseline-blocker-plan-cli.test.js
```

Targeted CLI test result: `4/4`.

Required adjacent regression checks:

```powershell
node --test tests\memory-reliability-proof-baseline-blocker-plan.test.js
node --test tests\memory-reliability-proof-baseline-readiness-cli.test.js
node --test tests\memory-reliability-proof-baseline-readiness-policy.test.js
```

Current runtime state remains `RC_NOT_READY_BLOCKED`.
