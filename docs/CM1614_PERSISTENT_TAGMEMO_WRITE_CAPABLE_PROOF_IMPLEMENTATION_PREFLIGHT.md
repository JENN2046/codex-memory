# CM1614 Persistent TagMemo Write-Capable Proof Implementation Preflight

## Scope

CM-1614 prepares the implementation boundary for a future write-capable persistent TagMemo proof path after CM-1613 confirmed the current command remains `GATED_NO_WRITE`.

This is a docs / status / board preflight only.

It does not implement write capability.

It does not execute persistent tag write.

## Starting Point

```text
CM-1612 result: GATED_NO_WRITE / ready_for_proof_no_write
CM-1613 decision: WRITE_CAPABLE_IMPLEMENTATION_PREFLIGHT_REQUIRED
current apply branch: dual-token guard then no-write gated return
current rollback branch: rollback_stub_no_mutation_executed
write-capable implementation: NOT_STARTED
persistent tag write: STILL_BLOCKED
persistent enrichment success: NOT_CLAIMED
```

## Future Implementation Strategy

Use a staged route:

```text
1. fixture/test contract coverage for write-capable proof behavior
2. source implementation behind explicit write-capable proof gate
3. independent changed-scope source audit
4. exact approval gate for one future proof execution
5. bounded proof execution only after fresh approval
```

CM-1614 performs step 0 only: the preflight.

## Proposed Source Landing Points

Future source work may touch only the minimal surfaces required for a bounded proof path:

```text
src/tagmemo/persistent-enrichment-proof-command.js
scripts/tagmemo-enrichment-proof.js
tests/fixtures/tagmemo-persistent-enrichment-proof-command-sprint-e-v1.json
tests/tagmemo-persistent-enrichment-proof-command.test.js
```

If a dedicated internal proof-store helper is needed, it should be introduced as an internal module only, for example:

```text
src/tagmemo/sidecar-persistence-proof-store.js
```

That helper must remain outside public MCP surface and must not connect to production memory stores, diary, SQLite shadow memory tables, vector indexes, provider adapters, raw audit stores, or external services.

## Required Future Guards

A future write-capable source change must fail closed unless all of these are true:

```text
mode == apply
operator execution token exact-match: true
skeleton guard token exact-match: true
explicit write-capable proof flag: true
maxWriteCount == 1
writeCountRequested == 1
expected dry-run plan hash is supplied
expected dry-run plan hash matches the applied plan
target == temp-local-tagmemo-proof-sidecar
bounded input contains no forbidden raw/private/provider/token/API-shaped fields
tombstone state permits the one proof write
public MCP surface remains unchanged
```

Missing any guard must return a low-disclosure rejection or no-write gated result with zero writes.

## Future Output Contract

Future successful proof execution may report only bounded counters and hashes:

```text
futureStatusCandidate: applied
futureWriteCountLimitCandidate: one bounded sidecar write
futureWriteCountRequestedCandidate: one bounded sidecar write
futureWriteCountExecutedCandidate: one bounded sidecar write
futurePersistentTagRecordsWrittenCandidate: one bounded sidecar write
dryRunPlanHash: sha256:...
rollbackPlanHash: sha256:...
cleanupPlanHash: sha256:...
tombstoneSyncState: active
redacted: true
lowDisclosure: true
publicMcpResponse: false
```

It must not print or persist raw memory content, raw paths, provider/API material, bearer token material, raw audit data, raw JSONL, raw SQLite rows, vector payloads, cache records, or full proof-store paths.

## Future Proof Store Boundary

Future implementation must use a temp-local proof sidecar target only.

Allowed proof data:

```text
proof record id or redacted selector
bounded memory id linkage or redacted memory selector
TagMemo minimal schema compatible tag fields
confidence score
evidence source id
dry-run plan hash
rollback plan hash
cleanup plan hash
tombstone sync state
created proof timestamp
```

Forbidden proof data:

```text
raw memory content
raw private fields
provider/API payloads
token or bearer values
raw audit rows
raw JSONL rows
raw SQLite rows
vector payloads
candidate-cache payloads
full filesystem paths in output
public MCP response payload changes
```

## Rollback / Cleanup / Tombstone Plan

Future source implementation must include testable rollback and cleanup contracts before proof execution:

```text
rollback default: planned-only or proof-row-scoped
cleanup default: dry-run unless separately approved
destructive cleanup: not allowed in this lane
tombstone sync active case: one proof write can be planned only when not suppressed
tombstone suppressed case: zero-write proof remains planned and fail-closed
negative control: active write request with maxWriteCount=0 rejects fail-closed
rollback after no mutation: remains blocked / no-op
```

## Validation Plan For Future Source Work

Future implementation should add or update targeted coverage before execution:

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

Before any future proof execution, a separate source audit must additionally confirm:

```text
write capability is limited to temp-local sidecar proof target
maxWriteCount=1 is enforced
dry-run plan hash must match apply plan
dual-token guard remains required
low-disclosure output is preserved
forbidden fields are rejected
rollback/cleanup/tombstone behavior is deterministic
public MCP surface remains 7 tools
no provider/API, bearer token, raw scan, broad scan, confirmed mutation, or record_memory write path was introduced
```

## Boundary Confirmation

```text
write-capable implementation: NOT_STARTED
persistent tag write: NOT_EXECUTED
persistent tag enrichment: NOT_STARTED
proof execution: NOT_EXECUTED
confirmed mutation: NOT_EXECUTED
second effective record_memory write: NOT_EXECUTED
provider/API: NOT_USED
bearer token: NOT_USED
raw scan / broad memory scan: NOT_RUN
public MCP expansion: NOT_EXECUTED
release/tag/deploy: NOT_EXECUTED
production/release/cutover ready claim: NO
complete V8 ready claim: NO
```

## CM-1614 Decision

```text
decision: PREPARE_FIXTURE_TEST_CONTRACT_BEFORE_SOURCE_IMPLEMENTATION
next route: CM-1615 persistent TagMemo write-capable proof fixture/test contract coverage
source implementation in CM-1614: NOT_STARTED
proof execution in CM-1614: NOT_EXECUTED
persistent tag write in CM-1614: NOT_EXECUTED
```

CM-1615 should lock the future write-capable proof behavior in fixtures/tests before any source implementation attempts to write a temp-local sidecar proof record.
