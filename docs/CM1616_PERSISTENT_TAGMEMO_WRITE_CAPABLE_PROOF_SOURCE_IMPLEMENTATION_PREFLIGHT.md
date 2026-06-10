# CM1616 Persistent TagMemo Write-Capable Proof Source Implementation Preflight

## Scope

CM-1616 prepares the source implementation boundary for a future persistent TagMemo write-capable proof path after CM-1615 completed fixture/test-only contract coverage.

This is a docs / status / board preflight only.

It does not change source behavior.

It does not implement write capability.

It does not execute proof.

It does not execute persistent tag write.

## Current Source Facts

Reviewed source:

```text
src/tagmemo/persistent-enrichment-proof-command.js
tests/tagmemo-write-capable-proof-contract.test.js
tests/fixtures/tagmemo-write-capable-proof-contract-cm1615-v1.json
```

Current command behavior:

```text
mode dry-run: deterministic redacted plan only
mode apply: validates input and maxWriteCount, then requires both tokens
dual-token apply: gated / ready_for_proof_no_write
writeCountExecuted: 0
persistentTagRecordsWritten: 0
boundaryCounters.persistentTagWrites: 0
rollback after no mutation: blocked / rollback_stub_no_mutation_executed
```

CM-1616 does not alter that behavior.

## Future Source Implementation Boundary

Future source implementation may touch only:

```text
src/tagmemo/persistent-enrichment-proof-command.js
tests/tagmemo-persistent-enrichment-proof-command.test.js
tests/tagmemo-write-capable-proof-contract.test.js
tests/fixtures/tagmemo-write-capable-proof-contract-cm1615-v1.json
docs/CM1617_PERSISTENT_TAGMEMO_WRITE_CAPABLE_PROOF_SOURCE_IMPLEMENTATION.md
```

If an internal proof-store helper is required, it must be a temp-local proof target only:

```text
src/tagmemo/sidecar-persistence-proof-store.js
tests/tagmemo-sidecar-persistence-proof-store.test.js
```

That helper must not connect to diary memory, SQLite shadow memory, vector index, write audit, recall audit, candidate cache, provider adapters, external services, public MCP responses, or production stores.

## Required Future Apply Gates

A future write-capable apply branch must require all of:

```text
mode == apply
operator execution token exact-match: true
skeleton guard token exact-match: true
explicit write-capable proof flag: true
maxWriteCount == 1
writeCountRequested == 1
expected dry-run plan hash supplied
expected dry-run plan hash matches actual dry-run plan hash
sidecarTarget == temp-local-tagmemo-proof-sidecar
bounded input contains no forbidden raw/private/provider/token/API-shaped fields
tombstoneSyncState == active
public MCP surface unchanged at 7 tools
```

Missing or mismatched gates must fail closed with low-disclosure wording and zero writes.

## Future Output Boundary

Future source implementation must keep current outputs low-disclosure.

Allowed output fields:

```text
status
reason
writeCountLimit
writeCountRequested
writeCountExecuted
persistentTagRecordsWritten
dryRunPlanHash
rollbackPlanHash
cleanupPlanHash
tombstoneSyncState
redacted
lowDisclosure
publicMcpResponse
boundaryCounters
```

Forbidden output material:

```text
raw memory content
raw private fields
raw local paths
provider/API payloads
token or bearer values
raw audit rows
raw JSONL rows
raw SQLite rows
vector payloads
candidate-cache payloads
public MCP response changes
readiness / production / release / cutover claims
```

## Test Plan For Future Source Implementation

Future source implementation should run at minimum:

```powershell
node --test tests\tagmemo-persistent-enrichment-proof-command.test.js
node --test tests\tagmemo-write-capable-proof-contract.test.js
node --test tests\tagmemo-sidecar-persistence-dry-run-adapter.test.js
node --test tests\tagmemo-sidecar-persistence-adapter-contract.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
staged diff check
changed-scope review
```

If a proof-store helper is added, include:

```powershell
node --test tests\tagmemo-sidecar-persistence-proof-store.test.js
```

## Source Audit Requirement

After future source implementation and before any future proof execution, an independent changed-scope audit must confirm:

```text
write-capable branch remains internal and temp-local only
dual-token guard remains mandatory
explicit write-capable proof flag remains mandatory
dry-run plan hash match is enforced before writing
maxWriteCount=1 is enforced
tombstone suppression blocks writes
forbidden raw/private/provider/token/API-shaped inputs fail closed
rollback and cleanup are proof-row-scoped or dry-run by default
current no-flag dual-token apply does not silently write
public MCP surface remains 7 tools
no provider/API, bearer token, raw scan, broad memory scan, record_memory write path, confirmed mutation, public MCP expansion, release/tag/deploy, or readiness claim was introduced
```

## Boundary Confirmation

```text
source implementation preflight: RECORDED
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

## CM-1616 Decision

```text
decision: PREPARE_SOURCE_IMPLEMENTATION_WITHOUT_PROOF_EXECUTION
next route: CM-1617 persistent TagMemo write-capable proof source implementation no-execution
source implementation in CM-1616: NOT_STARTED
proof execution in CM-1616: NOT_EXECUTED
persistent tag write in CM-1616: NOT_EXECUTED
```

CM-1617, if selected, may implement source behavior behind the CM-1615 contract, but must still not execute persistent proof write or claim persistent enrichment success.
