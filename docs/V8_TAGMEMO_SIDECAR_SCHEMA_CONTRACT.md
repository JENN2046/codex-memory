# V8 TagMemo Sidecar Schema Contract

## Scope

This document records the Sprint E sidecar tag store schema contract.

This is contract-only / test-only coverage.

```text
persistent tag enrichment: NOT_STARTED
persistent tag write: NOT_EXECUTED
sidecar schema: CONTRACT_ONLY / TEST_ONLY
public MCP surface: STILL_7_TOOLS
production/release/cutover ready: NO
complete V8: NOT_CLAIMED
```

## Contract Purpose

Persistent TagMemo enrichment remains future work. This contract defines the bounded sidecar row shape and the fixture-only validation rules that a future implementation must satisfy before any persistent tag write can be considered.

The contract does not add storage, does not connect to a runtime write path, and does not authorize persistent enrichment.

## Sidecar Record Shape

Required fixture schema fields:

```text
schemaVersion
tagRecordId
memoryId
tagId
tagLabel
confidenceScore
sourceVersion
derivedFromProjectionHash
createdAt
updatedAt
tombstoneSyncState
rollbackToken
cleanupPlanRef
```

Bounded requirements:

- `tagRecordId`, `memoryId`, `tagId`, `rollbackToken`, and `cleanupPlanRef` are bounded ids, not paths.
- `confidenceScore` stays within `0..1`.
- `sourceVersion` is deterministic and fixture-declared.
- `derivedFromProjectionHash` is a bounded hash pointer, not raw projected content.
- `createdAt` and `updatedAt` are bounded day buckets in UTC fixture form.
- `tombstoneSyncState` is one of `active`, `suppressed_by_tombstone`, or `sync_pending_fail_closed`.

## Forbidden Surface

Sidecar rows and cleanup selectors must not contain:

```text
raw memory text
raw content
snippets
file paths
workspace paths
provider/API fields
API keys
bearer tokens
authorization headers
raw audit payload
raw JSONL rows
raw SQLite rows
vector payloads
private lifecycle state
public MCP response payloads
```

## Rollback / Cleanup Contract

Fixture coverage locks cleanup selector shape to low-disclosure metadata:

```text
sourceVersion
rollbackToken
cleanupPlanRef
```

Cleanup remains dry-run only in this contract. Destructive cleanup or real store modification requires a separate exact approval and future implementation task.

## Tombstone Sync Contract

Fixture coverage requires fail-closed behavior before persistence:

- `active` lifecycle may produce an active contract row, but fixture write remains disallowed.
- `tombstoned` lifecycle maps to `suppressed_by_tombstone`.
- `unknown` lifecycle maps to `sync_pending_fail_closed`.

No tombstone sync write is executed in this slice.

## Test Evidence

Fixture/test coverage:

```text
tests/fixtures/tagmemo-sidecar-schema-sprint-e-v1.json
tests/tagmemo-sidecar-schema-contract.test.js
```

Targeted validation:

```powershell
node --test tests\tagmemo-sidecar-schema-contract.test.js
```

## Explicit Non-Goals

```text
implement persistent tag enrichment: NO
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
