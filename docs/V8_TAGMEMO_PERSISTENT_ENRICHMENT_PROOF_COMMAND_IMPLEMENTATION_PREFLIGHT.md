# V8 TagMemo Persistent Enrichment Proof Command Implementation Preflight

## Scope

This document prepares the source/test implementation boundary for the proof command defined by `docs/V8_TAGMEMO_PERSISTENT_ENRICHMENT_PROOF_COMMAND_ENVELOPE.md`.

This step is docs-only. It does not implement the proof command, execute persistent tag writes, or run any proof path.

```text
proof command envelope: COMPLETED
proof command implementation: NOT_STARTED
actual proof execution: NOT_STARTED
persistent tag enrichment: NOT_STARTED
persistent tag write: STILL_BLOCKED
max write count: 1 only after later exact execution approval
temp-local sidecar target: ONLY
production persistence: NO
public MCP surface: STILL_7_TOOLS
production/release/cutover ready: NO
complete V8: NOT_CLAIMED
```

## Proposed Source Map

Future source implementation may add:

```text
src/tagmemo/persistent-enrichment-proof-runner.js
src/cli/tagmemo-persistent-enrichment-proof.js
tests/tagmemo-persistent-enrichment-proof-runner.test.js
tests/tagmemo-persistent-enrichment-proof-cli.test.js
```

Optional fixture expansion may add:

```text
tests/fixtures/tagmemo-persistent-enrichment-proof-cm1604-v1.json
```

Do not add a package script in the first implementation slice. The command envelope already uses direct `node .\src\cli\...` invocation.

## Runner Boundary

The runner must be internal and local-only.

Allowed runner modes:

```text
dry-run
apply
rollback
tombstone-sync-proof
```

Mode requirements:

- `dry-run` may call `createTagMemoSidecarPersistenceDryRunPlan(...)` and compute a redacted plan hash.
- `apply` must require exact approval and must remain limited to one temp-local sidecar row.
- `rollback` must require exact approval and must affect only the proof-written temp-local sidecar row.
- `tombstone-sync-proof` must use suppressed input and `maxWriteCount=0`.

Implementation must not import storage, diary, SQLite shadow store, vector index, candidate cache, MCP adapters, provider clients, HTTP clients, or runtime memory write services.

## Temp-Local Sidecar Target Contract

The only allowed future sidecar target is:

```text
temp-local-tagmemo-proof-sidecar
```

The target must be in-memory or temp-local test state owned by the proof runner. It must not be production persistence.

The target must expose only bounded counts and redacted identifiers:

```text
sidecarTarget
writeCountRequested
writeCountExecuted
persistentTagRecordsWritten
rollbackPlanHash
cleanupPlanHash
tombstoneSyncState
```

It must not expose raw memory text, local file paths, SQLite rows, vector payloads, provider payloads, bearer tokens, public MCP response payloads, or private lifecycle state.

## Max Write Count Guard

The future implementation must enforce:

```text
maxWriteCount: 1
```

Rules:

- missing max write count rejects
- non-numeric max write count rejects
- `0` rejects for `apply`
- values greater than `1` reject
- selected input yielding more than one candidate rejects
- write count mismatch between dry-run and apply rejects
- tombstone sync proof must use `maxWriteCount=0`

The guard remains proof-local and does not authorize production persistence.

## Input Selection Boundary

First implementation route should support fixture-bounded input only:

```text
tests/fixtures/tagmemo-sidecar-persistence-dry-run-sprint-e-v1.json
case: valid-active-dry-run-plan
```

Selected-memory bounded input remains future work and must not be implemented in the first proof runner slice.

No broad memory scan, raw store scan, raw audit read, provider/API call, bearer-token path, or public MCP call may be used for input selection.

## Output Contract

Future output must be redacted JSON.

Allowed high-level fields:

```text
status
executionMode
approvalStringExactMatch
boundedInputSource
dryRunPlanHash
writeCountLimit
writeCountRequested
writeCountExecuted
persistentTagRecordsWritten
rollbackPlanHash
cleanupPlanHash
tombstoneSyncState
sidecarTarget
boundaryCounters
redacted
```

Required boundary counters:

```text
providerApiCalls: 0
bearerTokenUse: 0
rawScanRun: false
broadMemoryScanRun: false
secondEffectiveRecordMemoryWrite: 0
confirmedMutation: 0
publicMcpExpansion: 0
productionReadyClaim: false
releaseReadyClaim: false
cutoverReadyClaim: false
completeV8Claim: false
```

## Rollback / Cleanup / Tombstone Plan

Future rollback implementation must:

- require exact approval
- require `rollback:cm1596:route-001` for the fixture baseline
- require `cleanup-plan:cm1596:sidecar-v1`
- require target sidecar `temp-local-tagmemo-proof-sidecar`
- no-op fail closed when no proof-written row exists
- never affect more than one sidecar row

Future tombstone sync proof must:

- run against `tombstone-suppressed-dry-run-plan`
- use `maxWriteCount=0`
- return no persistent writes
- report fail-closed tombstone state

## Fixture / Test Plan

Future source/test implementation should validate:

- dry-run computes deterministic redacted plan hash
- apply rejects without exact approval
- apply rejects when max write count is missing, zero, or greater than one
- apply writes exactly one temp-local sidecar row after exact approval
- apply rejects provider/API/token/raw/path-shaped fields
- apply does not call `record_memory`
- apply does not write production stores
- rollback removes only the proof row
- rollback no-ops fail closed when the row is absent
- tombstone sync proof writes zero rows
- output is low-disclosure and omits forbidden fields
- public MCP surface remains seven tools

Targeted validation for a future implementation slice:

```powershell
node --test tests\tagmemo-persistent-enrichment-proof-runner.test.js
node --test tests\tagmemo-persistent-enrichment-proof-cli.test.js
node --test tests\tagmemo-sidecar-persistence-dry-run-adapter.test.js
node --test tests\tagmemo-sidecar-persistence-adapter-contract.test.js
node --test tests\tagmemo-sidecar-schema-contract.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Abort Criteria

Abort implementation before commit if:

- any source imports production persistence or runtime memory write services
- any source imports provider/API clients
- CLI reads bearer token, `.env`, raw memory, raw audit, SQLite, vector, or cache state
- CLI changes public MCP tools or schemas
- tests require live proof or confirmed mutation outside temp-local sidecar state
- max write count guard is missing
- rollback / cleanup / tombstone mode is untested
- evidence is not redacted
- docs imply production/release/cutover readiness
- docs imply complete V8 readiness

## Forbidden In This Step

```text
implement proof command: NO
execute persistent tag write: NO
second effective record_memory write: NO
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

## Next Safe Route

```text
CM-1604 persistent TagMemo enrichment proof command fixture/test coverage
```

The next route should start with fixture/test coverage for the proof runner contract before adding source implementation.

## Validation

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
staged diff check
changed-scope review
```
