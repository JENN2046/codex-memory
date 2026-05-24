# Memory Lifecycle Scope Internal Runtime Entry Supersede Shadow Seam Contract

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_SUPERSEDE_SHADOW_SEAM_CONTRACT_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

`CM-0989` closes the missing shadow-seam contract prerequisite before any bounded supersede runtime-prep helper is committed.

Instead of staying at prose-only storage-seam review, this slice fixes the future supersede pair seam into a reusable internal contract helper.

This slice is still bounded:

- no runtime mutation
- no shadow-store write
- no public MCP expansion
- no readiness claim

## Added Contract Surface

Added:

- [MemorySupersedeShadowSeamContract.js](/A:/codex-memory/src/core/MemorySupersedeShadowSeamContract.js)
- [memory-supersede-shadow-seam-v1.json](/A:/codex-memory/tests/fixtures/memory-supersede-shadow-seam-v1.json)
- [memory-supersede-shadow-seam-contract.test.js](/A:/codex-memory/tests/memory-supersede-shadow-seam-contract.test.js)

The helper is explicit-input only and fail-closed.

It does not execute anything.

It only normalizes and summarizes the minimum shape that a future supersede pair seam must satisfy.

## What The Contract Now Fixes

The contract now locks these truths:

1. `memory_supersede` future runtime apply is pair-shaped, not one-record shaped.
2. Two independent single-record lifecycle updates are not sufficient.
3. The future seam must require:
   - old record expectation bundle
   - replacement record expectation bundle
   - both lifecycle transitions
   - both link writes
   - shared actor/timestamp/correlation shape
4. The future seam must speak both supersession link columns:
   - `supersedes_memory_id`
   - `superseded_by_memory_id`
5. Current state remains blocked:
   - no runtime implementation
   - no runtime-prep helper mounted into app/runtime
   - no internal supersede service
   - no public MCP expansion

## Exact Required Pair Fields

The fixture/helper now locks these required pair fields:

- `oldMemoryId`
- `newMemoryId`
- `oldExpectedStatus`
- `newExpectedStatus`
- `oldExpectedClientId`
- `newExpectedClientId`
- `oldExpectedVisibility`
- `newExpectedVisibility`
- `oldToStatus`
- `newToStatus`
- `supersededByLink`
- `supersedesLink`
- `statusReason`
- `actorClientId`
- `updatedAt`
- `pairCorrelationId`

This is intentionally stricter than the current one-record lifecycle helpers.

## Exact Required Seam Properties

The fixture/helper now also locks these seam properties:

- `requiresTwoRecordGuard=true`
- `singleRecordReuseAllowed=false`
- `oldRecordLifecycleWriteRequired=true`
- `newRecordLifecycleWriteRequired=true`
- `bidirectionalLinkWriteRequired=true`
- `sharedPolicyGuardRequired=true`
- `sharedCorrelationIdRequired=true`
- `atomicPairOutcomeRequired=true`
- `rollbackPreviewRequired=true`

This means future supersede work is no longer free to quietly collapse back into two unrelated one-record writes.

## Validation

Validated:

- `node --check src\core\MemorySupersedeShadowSeamContract.js`
- `node --check tests\memory-supersede-shadow-seam-contract.test.js`
- `node --test tests\memory-supersede-shadow-seam-contract.test.js` through `8/8`
- public MCP freeze scan over app/adapters
- readiness/no-overclaim scan over the scoped packet

The targeted test now proves:

- fixture top-level blocked state
- accepted-for-planning summary behavior
- exact pair-field and link-column coverage
- rejection of `singleRecordReuseAllowed=true`
- rejection when required pair fields are missing
- normalization of malformed input
- no raw secret / Windows-path leak in fixture text

## Boundary

This slice does not:

- implement the two-record shadow seam
- mount or execute a supersede runtime-prep helper
- add an internal supersede service
- add a supersede CLI/runtime entry
- add `memory_supersede` to the shared internal runtime-entry gate
- add `memory_supersede` to MCP
- execute true live memory actions
- call providers or external APIs
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC ready` or production readiness

## Next Safe Step

The next smallest safe step is a bounded runtime-prep helper slice that consumes this contract plus the committed CM-0988 pair-outcome helper.

That next slice should still remain internal-only, explicit-input, and not mounted into app/runtime.
