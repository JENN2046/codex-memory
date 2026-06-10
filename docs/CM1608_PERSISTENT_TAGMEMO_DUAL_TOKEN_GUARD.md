# CM1608 Persistent TagMemo Dual-Token Guard

## Scope

CM-1608 implements the CM-1607 dual-token guard in the persistent TagMemo proof command skeleton.

This is source/test/docs work only. It does not execute persistent tag writes.

```text
operator execution token: APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF_EXECUTION_AFTER_AUDIT
skeleton guard token: APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF
dual-token guard: IMPLEMENTED
apply mode with both tokens: GATED_NO_WRITE
persistent tag write: NOT_EXECUTED
persistent tag enrichment: NOT_STARTED
actual proof execution: NOT_STARTED
public MCP surface: STILL_7_TOOLS
production/release/cutover ready: NO
complete V8: NOT_CLAIMED
```

## Behavior

`apply` now requires both:

```text
--operator-approval APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF_EXECUTION_AFTER_AUDIT
--approval APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF
```

Missing the operator token returns:

```text
status: rejected
reason: missing_operator_execution_token
writeCountExecuted: 0
persistentTagRecordsWritten: 0
```

Missing the skeleton guard token returns:

```text
status: rejected
reason: missing_skeleton_guard_token
writeCountExecuted: 0
persistentTagRecordsWritten: 0
```

Both tokens present returns:

```text
status: gated
reason: ready_for_proof_no_write
writeCountExecuted: 0
persistentTagRecordsWritten: 0
```

## Boundary

The command still:

- calls only the existing dry-run sidecar adapter
- keeps `maxWriteCount=1`
- keeps `temp-local-tagmemo-proof-sidecar` as the only target
- returns redacted / low-disclosure output
- does not write files, DB rows, memory records, tag records, public MCP responses, or provider/API payloads

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
