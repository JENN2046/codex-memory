# V8 TagMemo Sidecar Persistence Adapter Contract

## Scope

This document records Sprint E sidecar persistence adapter contract coverage.

This is fixture/test-only coverage.

```text
persistence adapter: CONTRACT_ONLY / TEST_ONLY
persistence adapter implementation: NOT_STARTED
persistent tag enrichment: NOT_STARTED
persistent tag write: NOT_EXECUTED
second effective record_memory write: NOT_EXECUTED
public MCP surface: STILL_7_TOOLS
production/release/cutover ready: NO
complete V8: NOT_CLAIMED
```

## Contract Purpose

The contract validates the planned dry-run adapter boundary before any implementation exists.

It does not add a persistence adapter module, does not import storage, does not connect to runtime write services, and does not authorize persistent tag writes.

## Fixture Evidence

```text
tests/fixtures/tagmemo-sidecar-persistence-adapter-sprint-e-v1.json
tests/tagmemo-sidecar-persistence-adapter-contract.test.js
```

The fixture covers:

- bounded tag projection input
- dry-run adapter output
- rollback plan determinism
- cleanup plan determinism
- tombstone sync state determinism
- forbidden raw/private/provider/token/API-shaped input rejection
- low-disclosure output
- seven-tool public MCP surface preservation

## Adapter Input Contract

Allowed input fields:

```text
schemaVersion
adapterMode
sourceVersion
boundedTagProjection
rollbackToken
cleanupPlanRef
tombstoneSyncState
```

The `boundedTagProjection` may include only bounded sidecar tag record fields such as ids, label, confidence score, and projection hash. It must not contain raw memory records, provider payloads, storage handles, tokens, file paths, raw audit rows, or public MCP response payloads.

## Adapter Output Contract

Expected output remains dry-run only:

```text
schemaVersion
adapterMode: dry_run
acceptedRows[]
rejectedRows[]
rejectionReasons[]
rollbackPlan
cleanupPlan
tombstoneSyncPlan
wouldPersist: false
persisted: false
publicResponse: false
publicMcpExpansion: 0
```

Rollback selector shape:

```text
sourceVersion
rollbackToken
cleanupPlanRef
```

Cleanup plan remains dry-run only and must not approve destructive cleanup.

## Tombstone Sync Contract

The adapter contract keeps persistence fail-closed:

- active rows may enter accepted dry-run output
- tombstoned rows are rejected / suppressed
- rejected rows set tombstone sync fail-closed
- all outputs keep `writeAllowedInContract=false`

## Explicit Non-Goals

```text
implement real persistence adapter: NO
execute persistent tag write: NO
execute second effective record_memory write: NO
provider/API: NOT_USED
bearer token: NOT_USED
raw scan / broad memory scan: NOT_RUN
live proof: NOT_EXECUTED
confirmed mutation: NOT_EXECUTED
public MCP expansion: NOT_EXECUTED
release/tag/deploy: NOT_EXECUTED
production/release/cutover ready claim: NO
complete V8 ready claim: NO
```

## Validation

```powershell
node --test tests\tagmemo-sidecar-persistence-adapter-contract.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
changed-scope review
staged diff check
```
