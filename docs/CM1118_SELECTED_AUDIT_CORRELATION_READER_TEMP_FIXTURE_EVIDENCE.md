# CM1118 Selected Audit Correlation Reader Temp Fixture Evidence

Status: `CM1118_SELECTED_AUDIT_CORRELATION_READER_TEMP_FIXTURE_EVIDENCE_COMPLETED_NOT_LIVE_NOT_READY`
Date: 2026-05-26
Workspace: `A:\codex-memory`

## Purpose

CM-1118 closes the local source gap identified by CM-1117: current code now has a selected-field audit-correlation projection helper, with temp-fixture coverage proving it can return pending/committed mutation audit metadata without projecting raw audit fields.

This is source/test/temp-fixture evidence only. It does not execute CM-1111, CM-1115, CM-1117, or any true audit observation.

## Changed Source

```text
source_file=src/storage/AuditLogStore.js
method=AuditLogStore.readSelectedWriteAuditCorrelation(...)
```

The helper accepts:

```text
memoryId
eventType
toolName
requestSource
maxLines
maxBytes
```

It returns selected metadata only:

```text
found
reason
selectedFieldsOnly
rawAuditReturned
inspectedEntryCount
matchedEventCount
memoryId
eventType
toolName
requestSource
pending.eventId
pending.correlationId
pending.auditPhase
pending.mutationApplied
pending.memoryId
pending.eventType
pending.toolName
pending.actorClientId
pending.requestSource
pending.fromStatus
pending.toStatus
pending.tombstoneReason
committed.eventId
committed.correlationId
committed.auditPhase
committed.mutationApplied
committed.memoryId
committed.eventType
committed.toolName
committed.actorClientId
committed.requestSource
committed.fromStatus
committed.toStatus
committed.tombstoneReason
```

It does not project:

```text
title
reason
evidence
raw audit payload
raw memory content
diary content
chunk text
vector data
direct .jsonl lines
```

## Temp Fixture Evidence

```text
test_file=tests/audit-log-store-selected-correlation.test.js
fixture_scope=isolated temp audit log only
real_audit_log_read=false
real_memory_read=false
durable_project_audit_write=false
```

Covered behavior:

- returns `found=true` for a matching pending+committed `memory_tombstone` pair
- requires committed correlation to match the pending event id
- returns `selectedFieldsOnly=true`
- returns `rawAuditReturned=false`
- does not include raw `title`, `reason`, or `evidence` strings in serialized output
- fails closed with `memory_id_required` when `memoryId` is missing
- fails closed with `selected_audit_correlation_not_found` when the committed pair is absent
- does not return an uncorrelated committed event when pending intent is absent

## Validation

Passed:

```powershell
node --check .\src\storage\AuditLogStore.js
node --check .\tests\audit-log-store-selected-correlation.test.js
node --test .\tests\audit-log-store-selected-correlation.test.js
node --test .\tests\tombstone-memory-runtime.test.js
```

Results:

```text
audit-log-store-selected-correlation.test.js: 3/3 passed
tombstone-memory-runtime.test.js: 14/14 passed
```

## Boundary

CM-1118 performed:

- local source helper implementation
- isolated temp-fixture test implementation
- targeted syntax and runtime tests
- docs/status/board update

CM-1118 did not perform:

- CM-1111 approval
- CM-1111 execution
- CM-1115 approval
- CM-1115 execution
- CM-1117 approval
- CM-1117 execution
- `tombstone-memory` run against current project data
- `record_memory`
- `search_memory`
- `memory_overview`
- true audit log read
- raw audit read
- direct `.jsonl` read against project logs
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

## Remaining Gap

CM-1118 makes CM-1117's source gap smaller:

```text
from: no selected-field audit-correlation reader exists
to: selected-field audit-correlation reader exists with temp-fixture coverage
```

It still does not prove:

- the CM-1100 proof memory has a durable tombstone audit pair
- CM-1111 apply happened
- CM-1115 metadata lifecycle observation happened
- true audit-log correlation for current project data
- public/default recall suppression
- cleanup safety
- rollback safety
- long-run durability
- automatic retention worker safety
- startup/watchdog enforcement
- public/default write reliability
- public/default recall reliability
- `memory write reliable`
- `memory recall reliable`
- runtime readiness
- RC readiness
- production readiness
- release/cutover readiness

Any true use of `readSelectedWriteAuditCorrelation(...)` against current project audit logs still requires a future separate exact approval packet, fresh preflight, selected output only, and no readiness/reliability claim.

## Decision

`CM1118_SELECTED_AUDIT_CORRELATION_READER_TEMP_FIXTURE_EVIDENCE_COMPLETED_NOT_LIVE_NOT_READY`
