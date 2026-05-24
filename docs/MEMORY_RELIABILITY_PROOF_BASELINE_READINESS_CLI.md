# Memory Reliability Proof Baseline Readiness CLI

Status: `MEMORY_RELIABILITY_PROOF_BASELINE_READINESS_CLI_REBASE_COMPLETED_NOT_READY`

Task: `CM-0967`

Original candidate lineage: `CM-0935`

## Purpose

`src/cli/memory-reliability-proof-baseline-readiness.js` is a read-only local CLI that runs the existing recall and write current-facts preflight collectors, then combines their outputs with the committed CM-0966 baseline readiness policy.

It is intended to make the recall/write reliability baseline repeatable before any separately bounded live proof step.

## Command

```powershell
node .\src\cli\memory-reliability-proof-baseline-readiness.js --json
```

## Boundary

The CLI may collect current Git facts through the existing read-only lane collectors.

It must not:

- run live recall proof
- run live write proof
- call `search_memory`
- call `record_memory`
- call providers or external APIs
- read raw memory or `.jsonl`
- write durable memory, audit, projection, or cache state
- expand public MCP tools
- change package/config/watchdog/startup
- claim `memory recall reliable`
- claim `memory write reliable`
- claim readiness

Execution-like flags such as `--execute`, `--live-proof`, `--record-memory`, and `--search-memory` are rejected before the lane collectors run.

## Current Result

At the current dirty worktree baseline, the CLI is expected to return:

```text
status=blocked
decision=MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKED_NOT_EXECUTED
baselineReadyForLiveProof=false
dirtyBaselineBlocked=true
```

This is correct. The dirty baseline remains mapped to `CMB-0013` and `CMB-0014`; live proof is still not authorized or executed.

## Validation

Targeted validation:

```powershell
node --check .\src\cli\memory-reliability-proof-baseline-readiness.js
node --check .\tests\memory-reliability-proof-baseline-readiness-cli.test.js
node --test .\tests\memory-reliability-proof-baseline-readiness-cli.test.js
```

The targeted CLI test passed `5/5`.

Adjacent validation:

```powershell
node --test .\tests\memory-reliability-proof-baseline-readiness-policy.test.js .\tests\recall-proof-current-facts-preflight-cli.test.js .\tests\write-proof-current-facts-preflight-cli.test.js .\tests\memory-reliability-proof-baseline-readiness-cli.test.js
```

The adjacent policy/current-facts/CLI regression passed `23/23`.

Current dirty-baseline smoke:

```powershell
node .\src\cli\memory-reliability-proof-baseline-readiness.js --json --pretty
```

The current smoke returned `status=blocked`, `baselineReadyForLiveProof=false`, `dirtyBaselineBlocked=true`, and no live proof or memory tool execution.

Project docs validation:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Non-Claim

This CLI proves only that the two read-only current-facts lanes can be consumed through one repeatable baseline readiness entry.

It does not prove live recall reliability, live write reliability, runtime readiness, RC readiness, production readiness, or VCP full parity.
