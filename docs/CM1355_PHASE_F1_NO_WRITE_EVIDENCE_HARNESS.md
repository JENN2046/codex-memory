# CM-1355 Phase F1 No-Write Evidence Harness

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1355 adds a local Phase F1 harness for the future approved live-client no-write evidence capture.

This change does not execute live client refresh, start services, call MCP, call providers, read real memory bodies, read raw audit, write durable memory/audit, change config/watchdog/startup, expand public MCP tools, push, tag, release, deploy, cut over, or claim readiness.

## Added Local Surfaces

- `src/core/PhaseF1LiveClientNoWriteEvidenceRunner.js`
- `src/cli/phase-f1-live-client-no-write.js`
- `tests/phase-f1-live-client-no-write-runner.test.js`

The CLI default mode is plan-only. It validates the exact A5-GAP-4 approval line and returns the planned request matrix without executing HTTP.

Real execution requires:

- explicit `--execute`;
- exact A5-GAP-4 approval line;
- matching branch/commit/endpoint;
- current Git facts: branch, HEAD, origin HEAD, and dirty status count;
- an already-present `CODEX_MEMORY_HTTP_TOKEN`;
- no token printing or persistence.

## Harness Contract

Plan-only mode returns:

```text
status=PHASE_F1_LIVE_CLIENT_NO_WRITE_PLAN_READY_NOT_EXECUTED
liveClientRefreshExecuted=false
runtimeReady=false
rcReady=false
```

Execution mode is fail-closed before network if:

- approval is stale or not exact;
- endpoint mismatches;
- current Git facts are missing;
- current branch/head differs from the approved branch/commit;
- local `main` is not synced with `origin/main`;
- dirty status count is not zero;
- bearer token is missing;
- the requested action escapes the no-write matrix.

When execution is later approved, the harness captures only sanitized evidence for:

- health;
- authenticated initialize;
- authenticated tools/list;
- authenticated `memory_overview`;
- no-token selected `memory_overview`;
- no-token `record_memory` rejection;
- no-token `search_memory` rejection.

It keeps side-effect counters at:

```text
providerCalls=0
durableMemoryWrites=0
durableAuditWrites=0
configWatchdogStartupChanges=0
publicMcpExpansion=false
readinessClaimed=false
reliabilityClaimed=false
```

## Validation

Current local validation:

```text
node --check src\core\PhaseF1LiveClientNoWriteEvidenceRunner.js
node --check src\cli\phase-f1-live-client-no-write.js
node --check tests\phase-f1-live-client-no-write-runner.test.js
node --test tests\phase-f1-live-client-no-write-runner.test.js
node src\cli\phase-f1-live-client-no-write.js --branch main --commit be980d157cbc88b00fc2e641bc66a527538faae9 --endpoint http://127.0.0.1:7605 --approval-line "<current exact line>" --json --pretty
```

Results:

```text
targeted_tests=6/6 passed
cli_status=PHASE_F1_LIVE_CLIENT_NO_WRITE_PLAN_READY_NOT_EXECUTED
executionMode=plan_only
liveClientRefreshExecuted=false
mcpCallsExecuted=false
providerCalls=0
durableMemoryWrites=0
durableAuditWrites=0
runtimeReady=false
rcReady=false
```

Injected execution tests use fake clients only. They do not call the live service.

Current-facts fail-closed tests also use injected clients only and verify missing, dirty, or origin-drifted facts block before network.

## Current Result

```text
phaseF1HarnessAdded=true
phaseF1PlanOnlyCliReady=true
phaseF1LiveExecutionApproved=false
phaseF1LiveExecutionRun=false
decision=NOT_READY_BLOCKED
operatorState=RC_NOT_READY_BLOCKED
nextRequiredAction=exact_A5_GAP_4_user_approval_for_live_execution
```
