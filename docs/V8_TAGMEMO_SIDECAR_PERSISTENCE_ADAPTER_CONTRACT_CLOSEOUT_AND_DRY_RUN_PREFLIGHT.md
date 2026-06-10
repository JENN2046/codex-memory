# V8 TagMemo Sidecar Persistence Adapter Contract Closeout And Dry-Run Preflight

## Scope

This document closes the Sprint E sidecar persistence adapter contract baseline and prepares a future dry-run/no-op adapter implementation preflight.

This is docs/preflight only.

```text
sidecar persistence adapter contract: BASELINE_COMPLETED_TEST_ONLY
persistence adapter implementation: NOT_STARTED
persistent tag enrichment: NOT_STARTED
persistent tag write: NOT_EXECUTED
second effective record_memory write: NOT_EXECUTED
public MCP surface: STILL_7_TOOLS
production/release/cutover ready: NO
complete V8: NOT_CLAIMED
```

## Closed Baseline

The sidecar persistence adapter contract is now a fixture/test-only baseline.

Evidence:

```text
tests/fixtures/tagmemo-sidecar-persistence-adapter-sprint-e-v1.json
tests/tagmemo-sidecar-persistence-adapter-contract.test.js
docs/V8_TAGMEMO_SIDECAR_PERSISTENCE_ADAPTER_CONTRACT.md
```

Accepted baseline coverage:

- adapter input uses bounded tag projection only
- adapter output is dry-run / contract-only
- output excludes raw/private/provider/token/API-shaped information
- rollback plan is reproducible from bounded metadata
- cleanup plan is reproducible from bounded metadata
- tombstone sync state is reproducible and fail-closed when unsafe
- public MCP surface remains seven tools

This evidence does not prove implementation readiness or persistent write readiness.

## Dry-Run / No-Op Adapter Boundary

Future implementation may add a source module only if it stays dry-run/no-op.

Proposed future module:

```text
src/tagmemo/sidecar-persistence-adapter.js
```

Allowed future behavior:

- Accept bounded sidecar adapter input.
- Validate `schemaVersion`, `adapterMode`, `sourceVersion`, bounded projection ids, projection hash, rollback token, cleanup plan reference, and tombstone sync state.
- Return a low-disclosure dry-run plan.
- Set `wouldPersist=false`.
- Set `persisted=false`.
- Set `publicResponse=false`.
- Set `publicMcpExpansion=0`.
- Fail closed on forbidden raw/private/provider/token/API-shaped fields.
- Fail closed on tombstoned or unknown lifecycle state.
- Keep rollback and cleanup selectors bounded.

Forbidden future behavior:

- Import storage adapters.
- Import runtime write services.
- Open DB handles.
- Write sidecar rows.
- Mutate memory records.
- Call provider/API paths.
- Read bearer tokens.
- Read raw stores or broad memory surfaces.
- Change public MCP tools or public response contracts.

## Acceptance Criteria For Future Dry-Run Source Slice

Future dry-run source implementation must prove:

- same input produces same dry-run output
- valid bounded input produces accepted dry-run row ids only
- invalid source version rejects without leakage
- forbidden raw/private fields reject without leakage
- rollback selector contains only `sourceVersion`, `rollbackToken`, and `cleanupPlanRef`
- cleanup plan remains dry-run only
- tombstone sync suppresses unsafe rows
- no persistence imports are present in the changed source
- public MCP surface remains seven tools

## Exact Approval Gate Draft

Any future non-dry-run persistent tag write remains separately approval-bound.

Minimum gate:

- Dedicated task explicitly authorizes non-dry-run persistence.
- Fresh synced Git state.
- Clean worktree.
- Dry-run adapter source and tests complete.
- Independent source audit complete.
- Exact target store declared.
- Exact row count and source version declared.
- Exact rollback selector declared.
- Cleanup dry-run reviewed.
- Explicit approval for one bounded persistent tag write operation.
- Post-write verification and rollback plan prepared.

Without this gate, the adapter must remain dry-run/no-op.

## Rollback / Cleanup Acceptance

Future dry-run adapter output must include:

```text
rollbackPlan.selector.sourceVersion
rollbackPlan.selector.rollbackToken
rollbackPlan.selector.cleanupPlanRef
rollbackPlan.dryRunOnly: true
rollbackPlan.destructiveCleanupApproved: false
cleanupPlan.dryRunOnly: true
cleanupPlan.wouldDeleteRows: false
```

No cleanup plan may expose raw/private fields.

## Tombstone Sync Acceptance

Future dry-run adapter output must include:

```text
tombstoneSyncPlan.tombstoneSyncState
tombstoneSyncPlan.failClosed
tombstoneSyncPlan.writeAllowedInContract: false
```

Unsafe tombstone states must reject or suppress rows before persistence.

## Explicit Non-Goals

```text
implement real persistence adapter: NO
execute persistent tag write: NO
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
