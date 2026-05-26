# CM1121 Selected Audit Correlation Observation Preflight

Status: `CM1121_SELECTED_AUDIT_CORRELATION_OBSERVATION_PREFLIGHT_ACCEPTED_NOT_EXECUTED_NOT_READY`
Date: 2026-05-26
Workspace: `A:\codex-memory`

## Purpose

CM-1121 adds a pure explicit-input preflight helper for the CM-1120 selected audit-correlation observation packet.

The helper exists to fail closed before any future selected audit-correlation observation can run. It validates approval shape, target head, request hash, required prior results, current helper evidence, observation surface, and forbidden side-effect flags without reading files, running commands, or touching true audit logs.

## Changed Source

```text
source_file=src/core/SelectedAuditCorrelationObservationPreflight.js
test_file=tests/selected-audit-correlation-observation-preflight.test.js
```

The helper exports:

```text
evaluateSelectedAuditCorrelationObservationPreflight(...)
normalizePreflightInput(...)
EXACT_APPROVAL_LINE
REQUEST_SHA256
REQUIRED_PRIOR_RESULTS
REQUIRED_CURRENT_ARTIFACTS
REQUIRED_OBSERVATION_SURFACE
REQUIRED_BOUNDARY_FLAGS
```

## Accepted Preflight Shape

A clean accepted preflight requires:

```text
packet_id=CM-1120-SELECTED-AUDIT-CORRELATION-OBSERVATION-APPROVAL-001
target_head=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
request_sha256=dfe4edcece5d561bbcdcdf38764679f6822cad77939dea06d68788a9840bad8e
branch=main
localHead=target_head
originHead=target_head
remoteMainHead=target_head
dirtyStatusLineCount=0
CM-1111=APPLIED_TOMBSTONED_SANITIZED
CM-1115=METADATA_STATUS_TOMBSTONED_EXPECTED_SCOPE
CM-1118=selected helper evidence
CM-1119=interpretation matrix
surface=AuditLogStore.readSelectedWriteAuditCorrelation
maxSelectedAuditCorrelationReads=1
memoryId=codex-process-50325be15fdb479d805728fe420b4838
eventType=memory_tombstone
toolName=memory_tombstone
requestSource=CM-1111-proof-memory-retention-apply
```

The helper returns:

```text
executionStarted=false
auditObservationStarted=false
preflightOnly=true
separateExactApprovalRequired=true
implicitAuditReadAuthorizationGranted=false
```

## Fail-Closed Coverage

Targeted tests cover:

- exact CM-1120 packet shape accepted without execution
- missing/mismatched approval line
- request hash drift
- dirty worktree
- missing prior result
- mismatched prior result class
- stale or mismatched CM-1118 helper evidence
- missing CM-1119 matrix evidence
- unexpected extra artifact
- widened observation surface
- raw audit output
- memory tool calls
- durable audit write
- tombstone apply
- readiness or reliability claim
- alias normalization without implicit file/command reads

## Validation

Passed:

```powershell
node --check .\src\core\SelectedAuditCorrelationObservationPreflight.js
node --check .\tests\selected-audit-correlation-observation-preflight.test.js
node --test .\tests\selected-audit-correlation-observation-preflight.test.js
```

Result:

```text
selected-audit-correlation-observation-preflight.test.js: 5/5 passed
```

## Boundary

CM-1121 performed:

- local source helper implementation
- local targeted tests
- docs/status/board update

CM-1121 did not perform:

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

`CM1121_SELECTED_AUDIT_CORRELATION_OBSERVATION_PREFLIGHT_ACCEPTED_NOT_EXECUTED_NOT_READY`

CM-1121 makes a future CM-1120 execution safer to preflight, but it does not approve or execute any true audit observation.
