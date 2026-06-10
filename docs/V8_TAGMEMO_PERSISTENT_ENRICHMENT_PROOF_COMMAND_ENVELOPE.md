# V8 TagMemo Persistent Enrichment Proof Command Envelope

## Scope

This document completes the bounded command envelope for a future persistent TagMemo enrichment proof.

This step is docs-only. It defines command shape, input boundary, write limit, sidecar target boundary, rollback / cleanup / tombstone proof boundary, and abort criteria. It does not implement or execute the proof command.

```text
proof command envelope: COMPLETED
proof command implementation: NOT_STARTED
actual proof execution: NOT_STARTED
persistent tag enrichment: NOT_STARTED
persistent tag write: STILL_BLOCKED
provider/API: NOT_USED
bearer token: NOT_USED
raw scan / broad memory scan: NOT_RUN
public MCP surface: STILL_7_TOOLS
production/release/cutover ready: NO
complete V8: NOT_CLAIMED
```

## Command Implementation Boundary

The command names below are the required future execution envelope. They are not authorized to run by this document and may not be executed until a future source/test task implements and audits the CLI or equivalent local proof runner.

The future proof runner must fail closed when:

- the command is run without `APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF`
- the input source is not one explicitly bounded fixture or one explicitly selected bounded memory projection
- `--max-write-count` is missing, zero, greater than `1`, or inconsistent with the selected input
- dry-run preview has not produced a matching redacted plan hash
- rollback, cleanup, or tombstone proof command is missing
- output would include raw/private/provider/token/API-shaped material
- public MCP surface would change

## Exact Future Command List

Fresh Git preflight:

```powershell
git rev-parse HEAD
git rev-parse origin/main
git status --short
git rev-list --left-right --count origin/main...HEAD
```

Dry-run preview:

```powershell
node .\src\cli\tagmemo-persistent-enrichment-proof.js --mode dry-run --input .\tests\fixtures\tagmemo-sidecar-persistence-dry-run-sprint-e-v1.json --case valid-active-dry-run-plan --max-write-count 1 --redacted --json
```

Apply proof, still blocked until a future execution task explicitly authorizes it:

```powershell
node .\src\cli\tagmemo-persistent-enrichment-proof.js --mode apply --approval APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF --input .\tests\fixtures\tagmemo-sidecar-persistence-dry-run-sprint-e-v1.json --case valid-active-dry-run-plan --max-write-count 1 --target-sidecar temp-local-tagmemo-proof-sidecar --redacted --json
```

Rollback / cleanup proof:

```powershell
node .\src\cli\tagmemo-persistent-enrichment-proof.js --mode rollback --approval APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF --rollback-token rollback:cm1596:route-001 --cleanup-plan-ref cleanup-plan:cm1596:sidecar-v1 --target-sidecar temp-local-tagmemo-proof-sidecar --redacted --json
```

Tombstone sync proof:

```powershell
node .\src\cli\tagmemo-persistent-enrichment-proof.js --mode tombstone-sync-proof --input .\tests\fixtures\tagmemo-sidecar-persistence-dry-run-sprint-e-v1.json --case tombstone-suppressed-dry-run-plan --max-write-count 0 --target-sidecar temp-local-tagmemo-proof-sidecar --redacted --json
```

Post-proof validation:

```powershell
node --test tests\tagmemo-sidecar-persistence-dry-run-adapter.test.js
node --test tests\tagmemo-sidecar-persistence-adapter-contract.test.js
node --test tests\tagmemo-sidecar-schema-contract.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Input Contract

Default proof input is fixture-bounded only:

```text
input fixture: tests/fixtures/tagmemo-sidecar-persistence-dry-run-sprint-e-v1.json
allowed case: valid-active-dry-run-plan
max write count: 1
source version: deterministic_tagmemo_projection_v1
sidecar target: temp-local-tagmemo-proof-sidecar
```

Future selected-memory proof input remains blocked unless a later task supplies:

- exact `memoryId`
- bounded memory text projection, not raw memory record
- bounded metadata projection, not lifecycle/raw storage metadata
- bounded tag projection
- precomputed projection hash
- rollback token
- cleanup plan reference
- tombstone sync state

No broad memory scan or raw store scan may be used to find inputs.

## Output Contract

Future proof output must be low-disclosure JSON with these fields only:

```text
approvalStringExactMatch
executionMode
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
publicMcpSurfaceCount
providerApiCalls
bearerTokenUse
rawScanRun
broadMemoryScanRun
secondEffectiveRecordMemoryWrite
confirmedMutation
productionReadyClaim
releaseReadyClaim
cutoverReadyClaim
completeV8Claim
```

The output must not include raw text, raw memory records, raw audit, provider payloads, bearer tokens, file paths, SQLite/vector/cache payloads, public MCP response payloads, or private lifecycle state.

## Sidecar Target Boundary

The future proof may only target a local temp proof sidecar named:

```text
temp-local-tagmemo-proof-sidecar
```

The proof must not write to:

- production memory store
- diary memory record
- SQLite shadow memory record
- vector index
- chunk index
- candidate cache
- public MCP response
- public MCP schema
- provider/API payload

## Rollback / Cleanup / Tombstone Boundary

Future rollback and cleanup must be defined before apply execution. The proof must record only bounded hashes, rollback tokens, cleanup plan refs, and tombstone states.

Rollback must be limited to the exact sidecar tag record written by the proof.

Cleanup must be fail-closed when:

- rollback token is missing
- cleanup plan ref is missing
- target sidecar is not `temp-local-tagmemo-proof-sidecar`
- more than one tag record would be affected
- tombstone state is unavailable
- proof evidence is not redacted

Tombstone sync proof must use a suppressed fixture case and `--max-write-count 0`.

## Abort Criteria

Abort before apply if:

- worktree is dirty with unrelated changes
- `HEAD` and `origin/main` are not cleanly understood
- dry-run preview did not run first in the same future proof task
- dry-run plan hash is missing or mismatched
- input is raw, unbounded, provider-shaped, token-shaped, path-shaped, or private-field shaped
- max write count is greater than `1`
- selected source requires broad memory scan
- rollback / cleanup / tombstone proof command is missing
- public MCP surface would change from seven tools
- provider/API or bearer-token path is requested
- evidence would include raw/private data
- execution would imply production/release/cutover readiness
- execution would imply complete V8 readiness

## Forbidden In This Step

```text
execute persistent tag write: NO
implement proof CLI: NO
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

## Validation

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
staged diff check
changed-scope review
```
