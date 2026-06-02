# CM-1354 Phase F1 Current-Head Approval Packet

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1354 refreshes the Phase F1 live-client no-write contract refresh packet to the current clean synced `main` head.

This packet does not start or ensure HTTP services, call MCP, call providers, read real memory bodies, read raw audit, write durable memory/audit, execute `record_memory`, execute `search_memory`, execute `memory_overview`, change config/watchdog/startup, expand public MCP tools, push, tag, release, deploy, cut over, or claim readiness.

## Fresh Current Facts

Observed before this packet:

```text
branch=main
HEAD=be980d157cbc88b00fc2e641bc66a527538faae9
origin/main=be980d157cbc88b00fc2e641bc66a527538faae9
ahead_behind=0/0
worktree=clean
```

These facts are only the current approval target. They are not live-client evidence and not readiness evidence.

## Current Exact Approval Line

Use this exact line before any Phase F1 live-client no-write execution:

```text
I approve A5-GAP-4 live-client no-write contract refresh for codex-memory on branch main at commit be980d157cbc88b00fc2e641bc66a527538faae9, endpoint http://127.0.0.1:7605, using current-session bearer token if already present, without printing or persisting token material, allow tools/call memory_overview and no-token rejection checks for record_memory/search_memory only, no provider, no durable write, no config/watchdog/startup change.
```

The approval checker accepted this line for the current head with:

```text
approvalAccepted=true
authorizationGranted=true
executesApprovedAction=false
liveClientNoWriteContract=true
allowsMemoryOverviewToolCall=true
includesNoTokenRejectionChecks=true
noProvider=true
noDurableWrite=true
noConfigWatchdogStartupChange=true
runtimeReady=false
finalRcMatrixReady=false
rcReady=false
```

The checker only verifies the line. It does not execute MCP calls or grant readiness.

## Intended Execution Matrix After Approval

If the exact approval is provided, execute only the bounded no-write evidence path:

| Surface | Allowed Evidence | Still Forbidden |
|---|---|---|
| HTTP endpoint | health/observe summary for `http://127.0.0.1:7605` | config/watchdog/startup changes |
| Authenticated MCP initialize | sanitized server/protocol identity | token print or persistence |
| Authenticated MCP tools/list | public tool count and names | public MCP expansion |
| Authenticated `memory_overview` | sanitized shape/selected counts only | raw memory body or raw audit output |
| No-token `memory_overview` | selected low-disclosure projection marker and allowlist facts | full overview disclosure |
| No-token `record_memory` | rejection before durable write | successful write |
| No-token `search_memory` | rejection before unsafe read/raw body path | authenticated search or recall reliability proof |

Required side-effect counters:

```text
providerCalls=0
durableMemoryWrites=0
durableAuditWrites=0
configWatchdogStartupChanges=0
publicMcpExpansion=false
remoteActions=0
readinessClaimed=false
reliabilityClaimed=false
```

## Stop Conditions

Stop before execution if any of these are true:

- current `HEAD` differs from the approval line;
- worktree is dirty;
- local `main` is not synced with `origin/main`;
- approval checker rejects the line;
- endpoint differs from `http://127.0.0.1:7605`;
- token material would need to be printed, copied, persisted, or newly configured;
- the run would execute successful `record_memory`;
- the run would execute authenticated `search_memory`;
- the run would read raw memory, raw audit, stores, or jsonl;
- the run would call providers;
- the run would change config/watchdog/startup;
- the run would expand public MCP tools or schema;
- the run would push, tag, release, deploy, cut over, or claim readiness.

## Validation

Current local validation:

```text
npm run a5:approval-check -- --expected-unit A5-GAP-4 --expected-branch main --expected-commit be980d157cbc88b00fc2e641bc66a527538faae9 --approval-line "<current exact line>" --json --pretty
node --test tests\a5-approval-line-verifier.test.js tests\a5-approval-check-cli.test.js tests\a5-approval-check-package-entry.test.js tests\no-touch-boundary-regression.test.js
```

Results:

```text
approvalAccepted=true
authorizationGranted=true
targeted_tests=29/29 passed
liveClientRefreshExecuted=false
mcpCallsExecuted=false
memoryOverviewExecuted=false
recordMemoryExecuted=false
searchMemoryExecuted=false
providerCalls=0
durableMemoryWrites=0
durableAuditWrites=0
runtimeReady=false
rcReady=false
```

## Current Result

```text
phaseF1CurrentHeadPacketPrepared=true
approvalGrantedByUser=false
liveClientRefreshExecuted=false
decision=NOT_READY_BLOCKED
operatorState=RC_NOT_READY_BLOCKED
nextRequiredAction=exact_A5_GAP_4_user_approval_for_current_head
```
