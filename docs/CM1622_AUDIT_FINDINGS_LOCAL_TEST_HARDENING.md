# CM-1622 Audit Findings Local Test Hardening

Date: 2026-06-11

## Decision

`CM-1622` implements local source/test hardening for findings from the 2026-06-11 full-repository audit review.

This is a Green local test-hardening slice. It does not execute live MCP traffic, `record_memory`, provider/API calls, bearer-token paths, raw scans, broad memory scans, confirmed mutation, public MCP expansion, release/tag/deploy, production readiness, release readiness, cutover readiness, or complete V8 readiness.

## Implemented Coverage

Controlled mutation public dry-run coverage was added for:

- `validate_memory`
- `tombstone_memory`
- `supersede_memory`

The tests assert that authenticated public valid dry-run payloads:

- pass through the public dry-run wrapper into the service preview path
- remain projected as low-disclosure public controlled-mutation output
- keep `dryRun=true`
- keep `mutated=false`
- keep `durableMutationPerformed=false`
- keep `confirmedMutationAllowed=false`
- leave the temp SQLite lifecycle rows unchanged
- append no mutation audit entries

Persistent TagMemo proof command coverage was added for the source-level injected proofStore success path.

The new test asserts:

- exact dual-token apply plus `writeCapableProofFlag=true`
- exact `temp-local-tagmemo-proof-sidecar`
- matching dry-run plan hash
- `executeWriteCapableProof=true`
- injected in-memory proofStore boundary
- exactly one proof row accepted by the fake proofStore
- output `status=applied`
- `writeCountExecuted=1`
- `persistentTagRecordsWritten=1`
- `boundaryCounters.persistentTagWrites=1`
- provider/API, bearer token, raw scan, broad scan, confirmed mutation, and public MCP expansion counters remain zero/false
- forbidden raw/private/provider/token fragments remain absent from output and fake proof rows

## Non-Claims

This slice does not claim:

- a second real persistent TagMemo proof write
- production persistent TagMemo enrichment
- runtime/public MCP persistent enrichment
- broad `record_memory` reliability
- production write reliability
- public confirmed mutation release
- raw audit support
- public MCP expansion
- production/release/cutover readiness
- complete V8

The injected proofStore used by the new test is an in-memory test double. It is not a durable store, not a public MCP path, and not production persistence.

## Validation

Targeted validation run during implementation:

```text
node --test tests\validate-memory-runtime-entry.test.js tests\tombstone-memory-runtime-entry.test.js tests\supersede-memory-runtime-entry.test.js
```

Result: `15/15` passed.

```text
node --test tests\tagmemo-persistent-enrichment-proof-command.test.js tests\tagmemo-write-capable-proof-contract.test.js
```

Result: `19/19` passed after aligning the success-path assertion with the existing source contract where applied output has `reason=null`.

Final validation for this slice is tracked as `CMV-1726`.

## Next Safe Route

Continue with local-only hardening from the audit plan:

1. decide `/health.runtimeFreshness.sourceFingerprint` threat-model wording or bearer-only projection behavior
2. add query-quality fixture/regression coverage for V8/TagMemo recall behavior
3. keep production/public persistent enrichment and public confirmed mutation behind separate exact approval
