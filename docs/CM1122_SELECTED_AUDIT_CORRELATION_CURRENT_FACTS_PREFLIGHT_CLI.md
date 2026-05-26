# CM1122 Selected Audit Correlation Current-Facts Preflight CLI

Status: `CM1122_SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_PREFLIGHT_CLI_COMPLETED_BLOCKED_NOT_EXECUTED_NOT_READY`
Date: 2026-05-26
Workspace: `A:\codex-memory`

## Purpose

CM-1122 adds a read-only current-facts CLI wrapper for the CM-1121 selected audit-correlation observation preflight helper.

The CLI is designed to stop before any true audit observation. It collects local Git facts with read-only `git` commands, builds the CM-1120 preflight input, and evaluates it through `evaluateSelectedAuditCorrelationObservationPreflight(...)`.

## Changed Source

```text
source_file=src/cli/selected-audit-correlation-current-facts-preflight.js
test_file=tests/selected-audit-correlation-current-facts-preflight-cli.test.js
```

The CLI supports:

```text
--json
--pretty
--with-satisfied-prior-results
--help
```

It rejects execution or mutation flags before collecting Git facts:

```text
--execute
--run
--observe
--audit-read
--read-audit
--jsonl
--raw
--record-memory
--search-memory
--memory-overview
--tombstone-memory
--provider
--write
--apply
--mutate
--start-service
```

## Current Real CLI Smoke

Command:

```powershell
node .\src\cli\selected-audit-correlation-current-facts-preflight.js --json --pretty
```

Observed result:

```text
status=blocked
decision=SELECTED_AUDIT_CORRELATION_OBSERVATION_PREFLIGHT_BLOCKED_NOT_EXECUTED
acceptedForExecutionPreflight=false
executionStarted=false
auditObservationStarted=false
preflightOnly=true
separateExactApprovalRequired=true
implicitAuditReadAuthorizationGranted=false
exactApprovalLineMatched=true
requestHashMatched=true
cleanTargetHead=false
requiredPriorResultsBound=false
currentArtifactsBound=true
observationSurfaceBound=true
boundaryFlagsBound=true
dirtyStatusLineCount=35
blockerReasons=dirty_worktree,prior_result_CM-1111_missing,prior_result_CM-1115_missing
readsTrueAuditLog=false
readsRawAudit=false
callsRecordMemory=false
callsSearchMemory=false
callsMemoryOverview=false
callsProvider=false
readinessClaimAllowed=false
memoryWriteReliableClaimed=false
memoryRecallReliableClaimed=false
```

The current smoke is intentionally blocked. It confirms the wrapper does not convert CM-1120 into authorization, and it does not assume CM-1111/CM-1115 are satisfied.

## Test Coverage

Targeted tests cover:

- default blocked result when CM-1111/CM-1115 prior results are not supplied
- synthetic all-prior-results shape can reach preflight-ready without execution
- dirty worktree and target head drift fail closed
- read-only Git command failures are surfaced
- rejected execution flags do not collect Git facts
- CLI help output
- rejected flag CLI behavior

## Validation

Passed:

```powershell
node --check .\src\cli\selected-audit-correlation-current-facts-preflight.js
node --check .\tests\selected-audit-correlation-current-facts-preflight-cli.test.js
node --test .\tests\selected-audit-correlation-current-facts-preflight-cli.test.js
node .\src\cli\selected-audit-correlation-current-facts-preflight.js --json --pretty
```

Results:

```text
selected-audit-correlation-current-facts-preflight-cli.test.js: 7/7 passed
real_cli_smoke=blocked_not_executed
```

## Boundary

CM-1122 performed:

- local CLI implementation
- local targeted tests
- real read-only CLI smoke over current Git facts
- docs/status/board update

CM-1122 did not perform:

- CM-1111 approval
- CM-1111 execution
- CM-1115 approval
- CM-1115 execution
- CM-1120 approval
- CM-1120 execution
- `tombstone-memory` run
- `record_memory`
- `search_memory`
- `memory_overview`
- true audit log read
- raw audit read
- direct `.jsonl` read
- raw memory, raw store, diary, or metadata store read
- durable project memory/audit write
- tombstone apply
- cleanup apply
- rollback apply
- migration/import/export/backup/restore apply
- provider/API/model call
- worker start
- public MCP expansion
- config/watchdog/startup/package/lockfile change
- push/tag/release/deploy/cutover
- readiness or reliability claim

## Decision

`CM1122_SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_PREFLIGHT_CLI_COMPLETED_BLOCKED_NOT_EXECUTED_NOT_READY`

CM-1122 adds an operator-facing preflight surface. It does not approve or execute the selected audit-correlation observation.
