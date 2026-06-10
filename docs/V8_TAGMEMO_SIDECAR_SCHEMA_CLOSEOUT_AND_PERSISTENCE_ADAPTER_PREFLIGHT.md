# V8 TagMemo Sidecar Schema Closeout And Persistence Adapter Preflight

## Scope

This document closes the Sprint E sidecar schema contract baseline and prepares a future persistence adapter preflight.

This is docs/preflight only.

```text
sidecar schema: BASELINE_COMPLETED_TEST_ONLY
persistence adapter: NOT_STARTED
persistent tag enrichment: NOT_STARTED
persistent tag write: NOT_EXECUTED
second effective record_memory write: NOT_EXECUTED
public MCP surface: STILL_7_TOOLS
production/release/cutover ready: NO
complete V8: NOT_CLAIMED
```

## Closed Baseline

The sidecar schema contract is now a fixture/test-only baseline.

Evidence:

```text
tests/fixtures/tagmemo-sidecar-schema-sprint-e-v1.json
tests/tagmemo-sidecar-schema-contract.test.js
docs/V8_TAGMEMO_SIDECAR_SCHEMA_CONTRACT.md
```

Accepted baseline coverage:

- bounded sidecar tag record shape
- confidence score range
- deterministic `sourceVersion`
- bounded `derivedFromProjectionHash`
- bounded `createdAt` / `updatedAt` metadata
- tombstone sync state enum
- rollback token and cleanup plan reference
- forbidden raw/private field rejection
- provider/API/token-shaped value rejection
- rollback / cleanup selector low-disclosure rule
- tombstone sync fail-closed rule
- seven-tool public MCP surface preservation

This evidence is contract-only / test-only. It does not prove persistent write readiness.

## Persistence Adapter Boundary

Future adapter purpose:

```text
translate an already-audited bounded TagMemo sidecar projection into a persistence-intent plan
```

The first adapter slice should be dry-run only.

Allowed future dry-run inputs:

- bounded sidecar tag records matching `tagmemo-sidecar-tag-record-v1`
- deterministic projection hash
- bounded lifecycle bucket
- rollback token
- cleanup plan reference

Forbidden future adapter inputs:

- raw memory record
- raw memory text
- raw audit payload
- raw JSONL row
- raw SQLite row
- raw vector payload
- provider/API payload
- bearer token
- client secret
- public MCP response payload
- unbounded lifecycle metadata

## Proposed Adapter Output

Future dry-run adapter output should stay low-disclosure:

```text
adapterMode: dry_run
schemaVersion
acceptedRows[]
rejectedRows[]
rejectionReasons[]
rollbackSelector
cleanupPlanRef
wouldPersist: false
persisted: false
publicResponse: false
publicMcpExpansion: 0
```

No output should include raw/private source fields or public MCP response payloads.

## Exact Approval Gate Draft

Any future non-dry-run persistence attempt requires a separate exact approval.

Minimum gate:

- Fresh synced Git state.
- Clean worktree.
- Current source/test validation.
- Adapter dry-run result reviewed.
- Exact target store declaration.
- Exact row count limit.
- Exact `sourceVersion`.
- Exact `rollbackToken` / `cleanupPlanRef`.
- Rollback dry-run selector reviewed.
- Explicit approval for one bounded persistent tag write operation.
- Post-write verification plan.
- Public MCP surface remains seven tools.

Without every item above, future adapter behavior must fail closed before persistence.

## Rollback / Cleanup Plan

Future rollback must be designed before write approval.

Required selector:

```text
sourceVersion
rollbackToken
cleanupPlanRef
```

Future cleanup behavior:

- dry-run list before any destructive cleanup
- low-disclosure cleanup output only
- no raw/private field exposure
- exact approval before destructive cleanup
- no original memory record mutation
- post-cleanup public MCP surface check

## Tombstone Sync Strategy

Current baseline is fail-closed before persistence.

Future adapter preflight should preserve:

- `active` may be eligible for dry-run persistence intent only
- `tombstoned` maps to suppressed output
- `unknown` maps to sync-pending fail-closed output
- no tombstone sync write without separate source/test/audit slice

## Test Plan For Future Adapter Preflight

Future fixture/test-only adapter coverage should include:

- dry-run accepts valid bounded sidecar rows
- dry-run rejects forbidden raw/private fields
- dry-run rejects provider/API/token-shaped values
- dry-run rejects unsupported source versions
- dry-run rejects unknown lifecycle buckets
- dry-run emits rollback selector only from bounded metadata
- dry-run emits `wouldPersist=false` and `persisted=false`
- dry-run does not import storage or runtime write services
- dry-run keeps public MCP surface at seven tools

## Explicit Non-Goals

```text
implement persistence adapter: NO
execute tag write: NO
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
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
changed-scope review
staged diff check
```
