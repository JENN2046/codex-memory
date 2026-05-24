# CM-0905 Recall Proof Execution Preflight CLI

Date: 2026-05-24

Status: `RECALL_PROOF_EXECUTION_PREFLIGHT_CLI_COMPLETED_NOT_EXECUTED_NOT_READY`

Decision: `RC_NOT_READY_BLOCKED`

## Purpose

CM-0905 adds a non-executing operator CLI around the CM-0904 explicit-input preflight helper.

The CLI makes the future `CM-0814` recall proof execution boundary reviewable from a JSON fixture without running live proof.

It does not add a public MCP tool.

It does not change `package.json`.

It does not execute `search_memory`.

## Implementation

Added:

- [recall-proof-execution-preflight.js](/A:/codex-memory/src/cli/recall-proof-execution-preflight.js)
- [recall-proof-execution-preflight-cli.test.js](/A:/codex-memory/tests/recall-proof-execution-preflight-cli.test.js)
- [recall-proof-execution-preflight-v1.json](/A:/codex-memory/tests/fixtures/recall-proof-execution-preflight-v1.json)

The CLI supports:

```powershell
node .\src\cli\recall-proof-execution-preflight.js --json
node .\src\cli\recall-proof-execution-preflight.js --json --pretty
node .\src\cli\recall-proof-execution-preflight.js --fixture .\tests\fixtures\recall-proof-execution-preflight-v1.json
```

The default fixture intentionally models the current dirty-worktree blocker and therefore reports:

```text
RECALL_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED
```

## Safety

The CLI rejects execution-like flags:

- `--execute`
- `--run`
- `--live-proof`
- `--search-memory`
- `--record-memory`
- `--provider`
- `--write`
- `--apply`
- `--mutate`
- `--start-service`

The CLI does not run Git commands, start services, call providers, call MCP tools, read raw memory, read `.jsonl`, write durable memory, write durable audit, expand public MCP, or change config/watchdog/startup.

## Validation

Passed:

```powershell
node --check .\src\cli\recall-proof-execution-preflight.js
node --check .\tests\recall-proof-execution-preflight-cli.test.js
node --test .\tests\recall-proof-execution-preflight-cli.test.js
```

Targeted CLI test result: `5/5`.

Covered behavior:

- default dirty-worktree fixture reports blocked and not executed
- explicit clean fixture reports preflight-ready and not executed
- text mode renders non-executing safety fields
- execution/live-proof/provider/search/write flags return error
- help exits successfully

## What This Proves

This proves only that operators now have a local, explicit-input, non-executing CLI surface for reviewing the `CM-0814` recall proof preflight boundary.

## What This Does Not Prove

This does not prove:

- live `search_memory` behavior
- `memory recall reliable`
- public/default `search_memory` reliability
- write reliability
- lifecycle/scope governance closure
- `RC_READY`

## Next Safe Step

Future live proof remains blocked while `CMB-0013` is open.

The next safe local step is either:

- keep this CLI as the mandatory operator preflight surface for later clean-baseline review
- or continue write/governance closure work without live proof
