# CM1613 Persistent TagMemo Write-Capable Implementation Gap Decision

## Scope

CM-1613 reviews why CM-1612 reached `GATED_NO_WRITE / ready_for_proof_no_write` even after both exact approval tokens were supplied, and decides whether the lane should move toward a separate write-capable implementation preflight.

This is a docs / status / board decision record only.

It does not execute persistent tag write.

## Inputs Reviewed

```text
CM-1612 receipt: docs/CM1612_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF_EXECUTION_UNDER_DUAL_TOKEN_GATE.md
source: src/tagmemo/persistent-enrichment-proof-command.js
tests: tests/tagmemo-persistent-enrichment-proof-command.test.js
current command mode reviewed: apply
```

## Gap Finding

CM-1612 is not persistent write success.

The current command accepts bounded dry-run planning and dual-token apply guard validation, but the `apply` branch intentionally stops before mutation. After both tokens pass, it returns:

```text
status: gated
reason: ready_for_proof_no_write
writeCountExecuted: 0
persistentTagRecordsWritten: 0
```

The source reason is direct: `src/tagmemo/persistent-enrichment-proof-command.js` validates the input boundary, validates `maxWriteCount`, checks both tokens, and then returns `gated / ready_for_proof_no_write` in `apply` mode. There is no write-capable persistence adapter call after the token checks. The rollback branch likewise returns `blocked / rollback_stub_no_mutation_executed` because no mutation has occurred.

## Decision

```text
decision: WRITE_CAPABLE_IMPLEMENTATION_PREFLIGHT_REQUIRED
current command supports dry-run: YES
current command supports gated no-write apply: YES
current command supports actual persistent tag write: NO
write-capable implementation: NOT_STARTED
persistent tag write: STILL_BLOCKED
persistent enrichment success: NOT_CLAIMED
complete V8: NOT_CLAIMED
production/release/cutover ready: NO
```

The next safe route is a separate source-change preflight for a temp-local write-capable proof path. That future work must be independently audited before any future proof execution can be requested.

## Future Implementation Boundary

Any future write-capable implementation must stay inside this envelope:

```text
target: temp-local TagMemo proof sidecar only
maxWriteCount: 1
input: fixture-bounded or explicitly selected-memory-bounded projection only
public MCP surface: unchanged at 7 tools
output: redacted, low-disclosure counters and hashes only
provider/API: forbidden
bearer token: forbidden in this lane
raw scan / broad memory scan: forbidden
confirmed mutation: forbidden in this lane
second effective record_memory write: forbidden
release/tag/deploy: forbidden
production/release/cutover ready claim: forbidden
complete V8 ready claim: forbidden
```

The implementation must not silently convert the current no-write skeleton into an always-writable command. It must require a new source/test task, changed-scope source audit, and a later fresh exact proof execution approval.

## Proof Success Criteria

A future persistent TagMemo proof can only be considered a success candidate if all of these are true:

```text
fresh source/test implementation exists
independent source audit passed
fresh exact proof execution approval is present
dry-run plan hash matches the applied plan
writeCountLimit == 1
writeCountRequested == 1
writeCountExecuted == 1
persistentTagRecordsWritten == 1
target is temp-local sidecar proof store
rollback plan hash is recorded
cleanup plan hash is recorded
tombstone sync state is deterministic
forbidden boundary counters are zero
public MCP surface remains 7 tools
evidence is redacted and low-disclosure
```

Even then, the result would be scoped proof evidence only. It would not prove broad persistent enrichment reliability, production write reliability, confirmed mutation readiness, release readiness, cutover readiness, or complete V8 readiness.

## Rollback / Cleanup / Tombstone Criteria

Future write-capable work must define and test:

```text
rollback target selector: exact proof record id or redacted proof receipt id only
rollback default: no destructive cleanup unless separately approved
cleanup default: dry-run or planned-only unless separately approved
tombstone sync: fail-closed when target memory is tombstoned or suppressed
tombstone proof: zero-write case must remain supported
negative control: active write request with maxWriteCount=0 must reject fail-closed
evidence: no raw path, token, provider/API, memory content, or broad scan output
```

## Boundary Confirmation

```text
persistent tag write: NOT_EXECUTED
persistent tag enrichment: NOT_STARTED
write-capable implementation: NOT_STARTED
future proof execution: REQUIRES_SEPARATE_EXACT_APPROVAL
second effective record_memory write: NOT_EXECUTED
provider/API: NOT_USED
bearer token: NOT_USED
raw scan / broad memory scan: NOT_RUN
confirmed mutation: NOT_EXECUTED
public MCP expansion: NOT_EXECUTED
release/tag/deploy: NOT_EXECUTED
production/release/cutover ready claim: NO
complete V8 ready claim: NO
```

## Validation

Required validation for this decision record:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
staged diff check
changed-scope review
```

## Next Route

Recommended next task:

```text
CM-1614 persistent TagMemo write-capable proof implementation preflight
```

CM-1614 should remain preflight-only unless a separate task explicitly authorizes source changes. Future proof execution remains a later exact approval boundary after source implementation and source audit.
