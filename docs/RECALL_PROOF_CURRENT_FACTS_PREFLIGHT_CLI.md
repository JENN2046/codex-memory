# CM-0906 Recall Proof Current-Facts Preflight CLI

Date: 2026-05-24

Status: `RECALL_PROOF_CURRENT_FACTS_PREFLIGHT_CLI_COMPLETED_NOT_EXECUTED_NOT_READY`

Decision: `RC_NOT_READY_BLOCKED`

## Purpose

CM-0906 adds a read-only current-facts collector CLI around the CM-0904 / CM-0905 recall proof execution preflight boundary.

The CLI collects current local Git facts, builds the exact `CM-0814` preflight packet, and evaluates it with the existing `RecallProofExecutionPreflight` helper.

It does not execute live proof.

It does not add a public MCP tool.

It does not change `package.json`.

## Implementation

Added:

- [recall-proof-current-facts-preflight.js](/A:/codex-memory/src/cli/recall-proof-current-facts-preflight.js)
- [recall-proof-current-facts-preflight-cli.test.js](/A:/codex-memory/tests/recall-proof-current-facts-preflight-cli.test.js)

The CLI supports:

```powershell
node .\src\cli\recall-proof-current-facts-preflight.js --json
node .\src\cli\recall-proof-current-facts-preflight.js --json --pretty
```

The CLI collects only these read-only Git facts:

```powershell
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git status --short
```

The collected facts are passed to the existing CM-0904 preflight evaluator with:

- exact `CM-0814` basis id
- exact approval line
- exact four-query stricter negative-control family
- exact internal proof seam
- exact no-provider/no-audit/no-raw/sanitized-output boundary flags

## Current Local Result

On the current worktree, the CLI reports:

```text
RECALL_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED
```

The current blockers are:

```text
local_origin_head_mismatch
dirty_worktree
```

That is expected. The current branch is locally ahead of `origin/main`, and the current worktree remains too dirty to serve as clean executable recall proof baseline evidence.

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

The CLI does not start services, call providers, call MCP tools, read raw memory, read `.jsonl`, write durable memory, write durable audit, expand public MCP, change package manifests, or change config/watchdog/startup.

## Validation

Passed:

```powershell
node --check .\src\cli\recall-proof-current-facts-preflight.js
node --check .\tests\recall-proof-current-facts-preflight-cli.test.js
node --test .\tests\recall-proof-current-facts-preflight-cli.test.js
node .\src\cli\recall-proof-current-facts-preflight.js --json --pretty
```

Targeted CLI test result: `6/6`.

Covered behavior:

- clean fake Git facts report preflight-ready and not executed
- dirty fake Git facts report blocked and not executed
- missing `origin/main` facts fail closed
- rejected execution/provider flags do not collect Git facts
- Git command failures are recorded as preflight evidence
- CLI help and rejected flag behavior remain stable

## What This Proves

This proves only that operators now have a read-only current-Git-facts collector that can feed the existing recall proof execution preflight boundary without manually preparing a fixture.

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

- keep this CLI as the current-facts preflight gate for a later clean-baseline review
- or continue write/governance closure work without live proof
