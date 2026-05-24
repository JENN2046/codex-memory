# Write Proof Execution Preflight CLI

Status: `WRITE_PROOF_EXECUTION_PREFLIGHT_CLI_COMPLETED_NOT_EXECUTED_NOT_READY`

Date: `2026-05-24`

Scope: `CM-0907` explicit-input helper/CLI/test/docs/board slice only.

## Purpose

This slice converts the `CM-0895` / `CM-0896` / `CM-0897` write-proof guidance into a local, machine-checkable preflight surface.

It answers one narrow question:

If a future live write proof tries to consume the `CM-0737` candidate family, can the execution packet prove that all required preconditions are bound before any write starts?

The answer is now checked by:

- [WriteProofExecutionPreflight.js](/A:/codex-memory/src/core/WriteProofExecutionPreflight.js)
- [write-proof-execution-preflight.js](/A:/codex-memory/src/cli/write-proof-execution-preflight.js)
- [write-proof-execution-preflight.test.js](/A:/codex-memory/tests/write-proof-execution-preflight.test.js)
- [write-proof-execution-preflight-cli.test.js](/A:/codex-memory/tests/write-proof-execution-preflight-cli.test.js)
- [write-proof-execution-preflight-v1.json](/A:/codex-memory/tests/fixtures/write-proof-execution-preflight-v1.json)

## What It Checks

The helper accepts only explicit input. It does not inspect the repository, run Git, start a service, or call MCP.

It requires:

- clean synced `main`
- matching local `HEAD`, `origin/main`, and remote `refs/heads/main` values
- exact write approval line
- exact `CM-0737` basis family
- accepted basis event `repaired_second_attempt`
- accepted basis memory id `codex-process-1ef539a197d747e199e12fe1c0d69731`
- target `process`
- payload family `repaired_checkpoint_shaped_process_payload`
- exact opt-in app seam `createCodexMemoryApplication -> enableWritePreflight=true -> callTool(record_memory)`
- scope derivation from payload and execution context
- prebound duplicate basis
- no broad discovery
- exactly one `record_memory` call
- zero `search_memory` calls
- zero provider/API calls
- no raw memory / `.jsonl` / raw durable audit read
- no second write
- no public MCP expansion
- no config/watchdog/startup change
- sanitized output
- no readiness or write-reliability claim

## CLI Behavior

Command:

```powershell
node .\src\cli\write-proof-execution-preflight.js --json --pretty
```

Default input:

```text
tests/fixtures/write-proof-execution-preflight-v1.json
```

The default fixture intentionally preserves the current dirty-worktree blocker and reports:

```text
WRITE_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED
```

The CLI rejects execution-oriented flags:

```text
--execute
--run
--live-proof
--record-memory
--search-memory
--provider
--write
--apply
--mutate
--start-service
```

## Safety Boundary

This slice does not:

- run `record_memory`
- run `search_memory`
- start HTTP MCP
- run providers or external APIs
- read true memory stores
- read `.jsonl`
- read raw durable memory or audit content
- write durable memory
- write durable audit
- expand public MCP tools
- change package scripts
- change config/watchdog/startup
- perform cleanup, rollback, migration, import, export, push, release, or deploy
- claim `memory write reliable`
- claim `memory recall reliable`
- claim readiness

## Validation

Validated with:

```powershell
node --check .\src\core\WriteProofExecutionPreflight.js
node --check .\src\cli\write-proof-execution-preflight.js
node --check .\tests\write-proof-execution-preflight.test.js
node --check .\tests\write-proof-execution-preflight-cli.test.js
node --test .\tests\write-proof-execution-preflight.test.js
node --test .\tests\write-proof-execution-preflight-cli.test.js
node .\src\cli\write-proof-execution-preflight.js --json --pretty
```

Observed targeted test result:

- helper test: `5/5`
- CLI test: `5/5`

Observed default CLI smoke:

- status: `blocked`
- decision: `WRITE_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED`
- blocker: `dirty_worktree`
- `executionStarted=false`
- `recordMemoryStarted=false`

## Interpretation

This is not a live write proof.

It is a preflight gate for a possible later live write proof.

It makes the future proof harder to accidentally over-widen because execution must first bind the exact baseline, basis, seam, scope assumptions, and one-write-only boundaries.

Current safe interpretation remains:

- `memory write reliable = not claimed`
- `memory recall reliable = not claimed`
- `RC_NOT_READY_BLOCKED`

## Next Safe Step

The next safe step is either:

- keep this CLI as the explicit-input operator preflight for a later clean-baseline write proof review, or
- add a read-only current Git facts collector around this write preflight, mirroring `CM-0906`, without running `record_memory`.

Do not run live write proof while the current dirty-worktree proof baseline remains ambiguous.
