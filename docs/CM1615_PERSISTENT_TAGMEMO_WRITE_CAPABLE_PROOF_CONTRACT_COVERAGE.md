# CM1615 Persistent TagMemo Write-Capable Proof Contract Coverage

## Scope

CM-1615 adds fixture/test-only coverage for the future persistent TagMemo write-capable proof path selected by CM-1614.

It does not implement write capability.

It does not execute proof.

It does not execute persistent tag write.

## Added Evidence

```text
fixture: tests/fixtures/tagmemo-write-capable-proof-contract-cm1615-v1.json
test: tests/tagmemo-write-capable-proof-contract.test.js
validation: node --test tests\tagmemo-write-capable-proof-contract.test.js
```

The fixture locks the future contract for:

```text
dual-token guard
explicit write-capable proof flag
maxWriteCount=1
writeCountRequested=1
expected dry-run plan hash match
temp-local sidecar proof target
bounded TagMemo sidecar projection
active tombstone state for the one future proof write candidate
low-disclosure output
rollback/cleanup/tombstone hashes
forbidden raw/private/provider/token/API-shaped input rejection
unchanged seven-tool public MCP surface
```

## Current Compatibility Check

The test also checks the current command behavior:

```text
current command: src/tagmemo/persistent-enrichment-proof-command.js
mode: apply
dual tokens: exact-match placeholders through exported constants
result: gated / ready_for_proof_no_write
writeCountExecuted: 0
persistentTagRecordsWritten: 0
boundaryCounters.persistentTagWrites: 0
confirmedMutation: 0
publicMcpExpansion: 0
```

This confirms CM-1615 did not turn the current command into a write-capable implementation.

## Future Success Candidate Wording

The fixture represents any future one-write success only as candidate wording:

```text
writeCountExecutedCandidate: one_bounded_sidecar_write
persistentTagRecordsWrittenCandidate: one_bounded_sidecar_write
```

CM-1615 does not record those candidate fields as executed counts.

## Boundary Confirmation

```text
fixture/test coverage: ADDED
source implementation: NOT_STARTED
write-capable implementation: NOT_STARTED
proof execution: NOT_EXECUTED
persistent tag write: NOT_EXECUTED
persistent tag enrichment: NOT_STARTED
confirmed mutation: NOT_EXECUTED
second effective record_memory write: NOT_EXECUTED
provider/API: NOT_USED
bearer token: NOT_USED
raw scan / broad memory scan: NOT_RUN
live MCP proof: NOT_EXECUTED
public MCP expansion: NOT_EXECUTED
release/tag/deploy: NOT_EXECUTED
production/release/cutover ready claim: NO
complete V8 ready claim: NO
```

## Validation

```powershell
node --test tests\tagmemo-write-capable-proof-contract.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
staged diff check
changed-scope review
```

## CM-1615 Decision

```text
decision: WRITE_CAPABLE_PROOF_CONTRACT_BASELINE_COMPLETED_TEST_ONLY
next route: CM-1616 persistent TagMemo write-capable proof source implementation
source implementation in CM-1615: NOT_STARTED
proof execution in CM-1615: NOT_EXECUTED
persistent tag write in CM-1615: NOT_EXECUTED
```

CM-1616, if selected, should implement only the temp-local sidecar proof path behind the CM-1615 contract and should still not execute a persistent proof write.
