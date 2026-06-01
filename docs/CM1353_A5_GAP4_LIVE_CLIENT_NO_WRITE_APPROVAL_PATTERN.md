# CM-1353 A5-GAP-4 Live-Client No-Write Approval Pattern

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1353 adds a narrow exact-approval pattern for the task-book Part 4 live-client contract refresh no-writes path.

This change does not execute live client refresh, start services, call MCP, call providers, read real memory, write durable memory/audit, change config/watchdog/startup, expand public MCP tools, push, tag, release, deploy, cut over, or claim readiness.

## Added Approval Shape

The `A5-GAP-4` approval verifier now accepts this exact shape:

```text
I approve A5-GAP-4 live-client no-write contract refresh for codex-memory on branch <BRANCH> at commit <COMMIT>, endpoint <ENDPOINT>, using current-session bearer token if already present, without printing or persisting token material, allow tools/call memory_overview and no-token rejection checks for record_memory/search_memory only, no provider, no durable write, no config/watchdog/startup change.
```

For the current preflight baseline, the rendered line is:

```text
I approve A5-GAP-4 live-client no-write contract refresh for codex-memory on branch main at commit 4fc75d68b79d2fe2bee7bcb576360b508cacb5c6, endpoint http://127.0.0.1:7605, using current-session bearer token if already present, without printing or persisting token material, allow tools/call memory_overview and no-token rejection checks for record_memory/search_memory only, no provider, no durable write, no config/watchdog/startup change.
```

The approval checker normalizes the accepted scope to:

```yaml
endpoint: http://127.0.0.1:7605
authenticatedMcpToolList: false
liveClientNoWriteContract: true
allowsMemoryOverviewToolCall: true
includesNoTokenRejectionChecks: true
noProvider: true
noDurableWrite: true
noConfigWatchdogStartupChange: true
```

## Preserved Boundaries

The existing `A5-GAP-4` patterns remain valid:

- endpoint health/observe with `no config/watchdog/startup change`;
- authenticated MCP `initialize/tools-list` evidence with `no tools/call`.

The new no-write pattern remains fail-closed if the live-client no-write boundary is incomplete. In particular, a live-client refresh line that omits the `memory_overview` allowance, no-token rejection limitation, no-provider boundary, durable-write ban, or config/watchdog/startup ban is rejected.

## Validation

Targeted validation passed:

```text
node --check src\core\A5ApprovalLineVerifier.js
node --check tests\a5-approval-line-verifier.test.js
node --check tests\a5-approval-check-cli.test.js
node --test tests\a5-approval-line-verifier.test.js tests\a5-approval-check-cli.test.js tests\a5-approval-check-package-entry.test.js tests\no-touch-boundary-regression.test.js
npm run a5:approval-check -- --expected-unit A5-GAP-4 --expected-branch main --expected-commit 4fc75d68b79d2fe2bee7bcb576360b508cacb5c6 --approval-line "<current rendered no-write line>" --json --pretty
```

The targeted test run passed `29/29`.

The CLI self-check returned `approvalAccepted=true`, `authorizationGranted=true`, `executesApprovedAction=false`, `callsMcpTools=false`, `runtimeReady=false`, and `rcReady=false`.

## Current Result

```text
approvalPatternAdded=true
liveClientRefreshExecuted=false
mcpCallsExecuted=false
memoryOverviewExecuted=false
recordMemoryExecuted=false
searchMemoryExecuted=false
providerCalls=0
durableMemoryWrites=0
durableAuditWrites=0
configWatchdogStartupChanges=0
publicMcpExpansion=false
runtimeReady=false
finalRcMatrixReady=false
rcReady=false
decision=NOT_READY_BLOCKED
```

`NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` remains controlling.
