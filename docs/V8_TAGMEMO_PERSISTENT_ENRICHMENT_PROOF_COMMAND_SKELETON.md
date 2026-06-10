# V8 TagMemo Persistent Enrichment Proof Command Skeleton

## Scope

CM-1604 adds a bounded command skeleton for the persistent TagMemo enrichment proof command.

This is source/test skeleton work only. It can build redacted dry-run plans and fail-closed apply / rollback / tombstone proof envelopes, but it does not execute persistent tag writes.

```text
proof command skeleton: IMPLEMENTED
dry-run planning: IMPLEMENTED
apply mode: FAIL_CLOSED_STUB
rollback / cleanup / tombstone plan skeleton: IMPLEMENTED
actual proof execution: NOT_STARTED
persistent tag write: NOT_EXECUTED
persistent tag enrichment: NOT_STARTED
public MCP surface: STILL_7_TOOLS
production/release/cutover ready: NO
complete V8: NOT_CLAIMED
```

## Files

```text
src/tagmemo/persistent-enrichment-proof-command.js
scripts/tagmemo-enrichment-proof.js
tests/tagmemo-persistent-enrichment-proof-command.test.js
tests/fixtures/tagmemo-persistent-enrichment-proof-command-sprint-e-v1.json
```

## Boundary

The skeleton:

- calls only the existing dry-run sidecar adapter
- accepts bounded fixture-shaped inputs
- enforces `maxWriteCount=1` for apply-shaped modes
- enforces `maxWriteCount=0` for tombstone sync proof
- returns `writeCountExecuted=0`
- returns `persistentTagRecordsWritten=0`
- keeps output redacted / low-disclosure
- preserves `temp-local-tagmemo-proof-sidecar` as the only sidecar target
- keeps public MCP surface unchanged

The skeleton does not import storage, SQLite, vector index, candidate cache, MCP adapters, provider clients, HTTP clients, or runtime memory write services.

## Apply Guard

`apply` mode requires exact approval token recognition, but still returns:

```text
status: blocked
reason: apply_stub_no_persistent_tag_write_executed
writeCountExecuted: 0
persistentTagRecordsWritten: 0
```

This preserves the later proof execution gate. The exact approval token is not treated as permission to write in CM-1604.

## Validation

```powershell
node --test tests\tagmemo-persistent-enrichment-proof-command.test.js
node --test tests\tagmemo-sidecar-persistence-dry-run-adapter.test.js
node --test tests\tagmemo-sidecar-persistence-adapter-contract.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
staged diff check
changed-scope review
```

## Forbidden Boundary Confirmation

```text
persistent tag write: NOT_EXECUTED
second effective record_memory write: NOT_EXECUTED
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
