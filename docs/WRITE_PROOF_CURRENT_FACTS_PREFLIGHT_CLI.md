# Write Proof Current-Facts Preflight CLI

Status: `WRITE_PROOF_CURRENT_FACTS_PREFLIGHT_CLI_COMPLETED_NOT_EXECUTED_NOT_READY`

Date: `2026-05-24`

Scope: `CM-0908` read-only current Git facts CLI/test/docs/board slice only.

## Purpose

`CM-0907` made the future `CM-0737` write proof execution packet machine-checkable, but it still required explicit Git facts in a fixture.

`CM-0908` adds a current-facts collector around that helper.

The command:

```powershell
node .\src\cli\write-proof-current-facts-preflight.js --json --pretty
```

collects only current local Git facts and feeds them into the existing `CM-0907` evaluator.

It does not execute a live write proof.

## Read-Only Git Facts

The CLI runs only these local Git commands:

```text
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git rev-parse refs/remotes/origin/main
git status --short
```

These commands are read-only and local. They do not fetch, push, merge, rebase, or contact the remote.

## What It Checks

The generated preflight input binds:

- basis family: `CM-0737`
- exact write approval line from `WriteProofExecutionPreflight`
- exact accepted basis event and memory id
- exact opt-in app seam `createCodexMemoryApplication -> enableWritePreflight=true -> callTool(record_memory)`
- exact scope assumptions and prebound duplicate basis
- one-write-only / no-search / no-provider / no-raw / no-second-write boundaries
- current local branch/head/origin/status facts

The helper then returns either:

```text
WRITE_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED
```

or:

```text
WRITE_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED
```

## Current Local Result

The current local smoke result is blocked:

```text
WRITE_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED
```

Observed blockers on the current local branch:

```text
local_origin_head_mismatch
local_remote_main_head_mismatch
dirty_worktree
```

This is expected. A local-ahead or dirty workspace is intentionally not treated as clean executable proof evidence.

## Safety Boundary

This slice does not:

- run `record_memory`
- run `search_memory`
- start HTTP MCP
- run providers or external APIs
- fetch/push/write remote Git state
- read true memory stores
- read `.jsonl`
- read raw durable memory or audit content
- write durable memory
- write durable audit
- expand public MCP tools
- change package scripts
- change config/watchdog/startup
- perform cleanup, rollback, migration, import, export, release, deploy, or cutover
- claim `memory write reliable`
- claim `memory recall reliable`
- claim readiness

## Validation

Validated with:

```powershell
node --check .\src\cli\write-proof-current-facts-preflight.js
node --check .\tests\write-proof-current-facts-preflight-cli.test.js
node --test .\tests\write-proof-current-facts-preflight-cli.test.js
node .\src\cli\write-proof-current-facts-preflight.js --json --pretty
```

Observed targeted test result:

- CLI test: `6/6`

Observed current-worktree smoke:

- status: `blocked`
- decision: `WRITE_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED`
- blockers include `local_origin_head_mismatch`, `local_remote_main_head_mismatch`, and `dirty_worktree` when local `HEAD` is ahead of `origin/main`
- `executionStarted=false`
- `recordMemoryStarted=false`
- `callsRecordMemory=false`

## Interpretation

This is not a live write proof.

It is the current-facts preflight gate for a possible later live write proof.

Current safe interpretation remains:

- `memory write reliable = not claimed`
- `memory recall reliable = not claimed`
- `RC_NOT_READY_BLOCKED`

## Next Safe Step

Use this command only as read-only preflight evidence if a later clean baseline exists.

Do not run live write proof while the dirty-worktree baseline blocker remains open.
