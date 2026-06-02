# Phase G G1 Governance Runtime Inventory

更新时间：2026-06-02

Task: `CM-1391`

Validation: `CMV-1509`

Status: `COMPLETED_VALIDATED`

Decision: `INVENTORY_ONLY_NOT_RUNTIME_PROOF`

## Purpose

This document is the G1.1 inventory artifact for `PHASE_G_MEMORY_GOVERNANCE_RUNTIME_BOUNDARY_PLAN.md`.

It maps current source, tests, fixtures, and docs for memory proposal, validation, supersession, tombstone, forget/exclusion, lifecycle audit, read policy, shadow projection, and candidate-cache invalidation.

This is not a runtime apply proof, readiness claim, migration, real-memory scan, public MCP expansion, or durable mutation.

## Scope

Allowed work:

- source, test, fixture, and docs inspection
- docs-only inventory
- `.agent_board` status and validation records
- local docs validation

Blocked work:

- real memory scan or broad raw `.jsonl` / audit read
- `record_memory`, `search_memory`, or `memory_overview` tool execution
- durable memory or audit write
- runtime apply of tombstone, supersede, validate, forget, or exclusion
- provider or model calls
- public MCP tool/schema expansion
- config, watchdog, startup, dependency, push, PR, release, deploy, or readiness action

## Current Source Inventory

| Capability | Primary Source | Current Boundary | Notes |
|---|---|---|---|
| Proposal / approval packet contracts | `src/core/MemoryGovernanceApprovalPacketContract.js`; `src/core/V11WriteGovernanceApprovalPacketBoundary.js`; `src/core/A5ApprovalLineVerifier.js` | contract / approval-surface only | Existing helpers normalize approval packet shape and exact approval language. They do not authorize execution by themselves. |
| Governance review surface | `src/core/MemoryGovernanceReviewSurfaceContract.js`; `src/cli/governance-report.js`; `src/cli/dashboard.js` | review / admin summary surface | Review surfaces support low-disclosure summaries. They are not public MCP mutations. |
| Deferred forget / exclusion planning | `src/core/DeferredGovernanceMutationPlanningService.js` | internal dry-run planning | Supports `memory_exclude` and `memory_forget` families with `dryRun=true`, `confirm=false`, `mutated=false`, and public MCP tools frozen. |
| Deferred runtime entry adapter | `src/core/DeferredGovernanceRuntimeEntryAdapter.js` | internal runtime-entry adapter candidate | Existing tests cover adapter behavior, but Phase G still treats real apply as blocked without exact approval. |
| Deferred policy gates | `src/core/DeferredGovernance*Policy.js` family | policy / review-only helpers | Covers exact execution approval, append-only audit plan, no-hard-delete, changed memory ids, revision, scope-pollution read policy, shadow projection, candidate-cache invalidation, and runtime readiness review. |
| Durable mutation packet contract | `src/core/DurableGovernanceMutationPacketContract.js`; `src/core/DurableGovernanceMutationDryRunHelper.js` | explicit-input dry-run helper | Produces no-side-effect mutation packet summaries and keeps `executionApproved=false`, `runtimeIntegrated=false`, `mutated=false`. |
| Shadow projection preview | `src/core/DurableGovernanceShadowProjectionPreview.js` | projection preview only | Shapes projected lifecycle/status changes and changed-memory-id output without durable projection apply. |
| Tombstone runtime prep | `src/core/DurableGovernanceTombstoneRuntimePrepHelper.js`; `src/core/TombstoneMemoryService.js` | runtime-prep plus internal service | Runtime prep builds audit/shadow/invalidation plans for `memory_tombstone`; actual service mutation remains outside G1.1 scope. |
| Supersede runtime prep | `src/core/MemorySupersedeRuntimePrepHelper.js`; `src/core/SupersedeMemoryService.js`; `src/core/MemorySupersedePairOutcomeHelper.js`; `src/core/MemorySupersedeShadowSeamContract.js` | runtime-prep plus internal service | Supersede is pair-shaped and requires shadow seam, pair outcome, audit, rollback, and invalidation planning. Real pair apply is not part of this inventory. |
| Lifecycle governance contract | `src/core/MemoryLifecycleScopeGovernanceContract.js`; `src/core/MemoryGovernanceLifecycleContract.js`; `src/core/MemoryWriteLifecycleDedupSuppressionPreflight.js` | contract / read-preflight / suppression policy | Existing code distinguishes lifecycle statuses and suppression behavior, mostly through tests and helper contracts. |
| Read policy / suppression | `src/core/DeferredGovernanceScopePollutionReadPolicy.js`; `src/recall/RecallPrecisionPolicy.js`; `src/app.js` | policy plus runtime read filtering elsewhere | Deferred policy states suppressed records must be blocked from normal recall, candidate generation, and cache-hit projection, while governance review contexts remain limited. |
| Audit evidence / lifecycle audit | `src/core/MemoryGovernanceAuditEvidenceContract.js`; `src/core/GovernanceRuntimeApprovalAuditLoop.js`; `src/storage/AuditLogStore.js`; `src/recall/RecallAuditService.js` | audit contract, selected audit readers, and no-apply loop proof surfaces | Existing audit helpers support pending/committed/cancelled/failure-style evidence shapes. Raw audit scanning remains blocked for Phase G default work. |
| Shadow store projection | `src/storage/SqliteShadowStore.js`; `src/core/DurableGovernanceShadowProjectionPreview.js` | storage seam plus preview | Shadow-store durable updates exist elsewhere, but G1.1 only inventories the seam and preview contracts. |
| Candidate cache invalidation | `src/core/DeferredGovernanceCandidateCacheInvalidationPolicy.js`; `src/storage/CandidateCacheStore.js`; `src/recall/CandidateGenerator.js` | policy plus cache/storage seams | Policy requires changed memory ids, governance revision, dependent candidate entry clearing, fallback, and cache-hit projection recheck. Actual invalidation apply is not selected in G1.1. |
| Forget / exclusion public boundary | `src/core/DeferredGovernanceMutationPlanningService.js`; `src/core/DeferredGovernanceInternalServiceSurfacePolicy.js`; `src/core/DeferredGovernanceInternalRuntimeEntrySurfacePolicy.js` | internal-only, public MCP frozen | No public `forget`, `exclude`, `tombstone`, `supersede`, or `validate` MCP tool is exposed. Public tools remain `record_memory`, `search_memory`, `memory_overview`. |

## Current Test And Fixture Inventory

| Capability | Tests / Fixtures | Evidence Level |
|---|---|---|
| Approval and exact authorization | `tests\a5-approval-line-verifier.test.js`; `tests\a5-approval-check-cli.test.js`; `tests\memory-governance-approval-packet-helper.test.js`; `tests\memory-governance-approval-packet-fixture.test.js`; `tests\v1-1-write-governance-approval-packet-boundary.test.js` | fixture / contract |
| Governance review/admin surface | `tests\memory-governance-review-surface-helper.test.js`; `tests\memory-governance-review-surface-fixture.test.js`; `tests\governance-report-cli.test.js`; `tests\admin-review-surface-shape.test.js`; `tests\admin-review-schema-snapshot-gate.test.js` | fixture / schema |
| Deferred governance planning and policies | `tests\deferred-governance-mutation-planning-service.test.js`; `tests\deferred-governance-*policy.test.js`; `tests\deferred-governance-runtime-entry-adapter.test.js`; `tests\deferred-governance-app-runtime-entry.test.js` | dry-run / policy |
| Durable mutation dry-run and packet shape | `tests\durable-governance-mutation-packet-helper.test.js`; `tests\durable-governance-mutation-packet-fixture.test.js`; `tests\durable-governance-mutation-dry-run-helper.test.js` | dry-run |
| Shadow projection preview | `tests\durable-governance-shadow-projection-preview.test.js` | preview |
| Tombstone | `tests\durable-governance-tombstone-runtime-prep-helper.test.js`; `tests\tombstone-memory-runtime.test.js`; `tests\tombstone-memory-runtime-entry.test.js`; `tests\tombstone-memory-cli.test.js`; `tests\tombstone-memory-temp-local-evidence.test.js` | runtime-prep / temp-local / internal runtime tests |
| Supersede | `tests\memory-supersede-runtime-prep-helper.test.js`; `tests\memory-supersede-pair-outcome-helper.test.js`; `tests\memory-supersede-pair-outcome-contract.test.js`; `tests\memory-supersede-shadow-seam-contract.test.js`; `tests\supersede-memory-runtime.test.js`; `tests\supersede-memory-runtime-entry.test.js`; `tests\supersede-memory-cli.test.js`; `tests\supersede-memory-temp-local-evidence.test.js` | runtime-prep / temp-local / internal runtime tests |
| Lifecycle read policy and governance | `tests\memory-lifecycle-scope-governance-contract.test.js`; `tests\memory-lifecycle-scope-read-policy-fixture.test.js`; `tests\memory-lifecycle-scope-runtime-integration.test.js`; `tests\lifecycle-read-policy-runtime.test.js`; `tests\lifecycle-read-policy-fixture.test.js`; `tests\lifecycle-schema.test.js`; `tests\lifecycle-sqlite-dry-run-cli.test.js` | fixture / runtime-integration tests |
| Audit evidence and selected correlation | `tests\memory-governance-audit-evidence-helper.test.js`; `tests\memory-governance-audit-evidence-fixture.test.js`; `tests\audit-log-store-selected-correlation.test.js`; `tests\mutation-audit-shape.test.js` | fixture / selected-reader |
| Candidate cache and invalidation | `tests\deferred-governance-candidate-cache-invalidation-policy.test.js`; `tests\public-default-search-lifecycle-cache-mutation-temp-local-evidence.test.js`; `tests\phase-b-sync-cache-rerank.test.js` | policy / temp-local / cache regression |
| Phase F proposal fixtures | `tests\fixtures\phase-f-memory-governance-proposal-v1.json`; `tests\fixtures\phase-f-memory-lifecycle-proposal-states-v1.json`; `tests\phase-f-memory-governance-proposal-fixture.test.js`; `tests\phase-f-memory-lifecycle-proposal-states-fixture.test.js` | fixture-only |

## Current Docs Inventory

| Area | Docs |
|---|---|
| Current Phase G route | `PHASE_G_MEMORY_GOVERNANCE_RUNTIME_BOUNDARY_PLAN.md`; `CODEX_MEMORY_NEXT_PHASE_PLAN.md`; `PHASE_NAVIGATION.md`; `STATUS.md` |
| Governance model | `MEMORY_GOVERNANCE_MODEL.md`; `CLIENT_SCOPE_MODEL.md`; `docs\PROPOSAL_TOMBSTONE_SUPERSESSION_SCHEMA.md`; `docs\POLICY_LAYER_PROPOSAL_SCOPE_INTEGRATION.md` |
| P31-P34 safe-scope closeouts | `docs\P31_MEMORY_GOVERNANCE_CLOSEOUT_REVIEW.md`; `docs\P32_MEMORY_GOVERNANCE_APPROVAL_PACKET_CLOSEOUT_REVIEW.md`; `docs\P33_MEMORY_GOVERNANCE_AUDIT_EVIDENCE_CLOSEOUT_REVIEW.md`; `docs\P34_GOVERNANCE_REVIEW_SURFACE_CLOSEOUT_REVIEW.md` |
| Lifecycle and deferred governance scope | `docs\MEMORY_LIFECYCLE_SCOPE_*`; `docs\MEMORY_LIFECYCLE_READ_POLICY_*`; `docs\MEMORY_LIFECYCLE_CORE_PLAN.md` |
| Tombstone / supersede runtime prep | `docs\MEMORY_LIFECYCLE_SCOPE_DURABLE_GOVERNANCE_TOMBSTONE_RUNTIME_PREP.md`; `docs\MEMORY_LIFECYCLE_SCOPE_INTERNAL_TOMBSTONE_*`; `docs\MEMORY_LIFECYCLE_SCOPE_INTERNAL_SUPERSEDE_*` |
| Alias and audit preservation sequence | `docs\CM1287_LIFECYCLE_RUNTIME_PREP_PROJECTION_FALLBACK_NORMALIZATION.md`; `docs\CM1288_SUPERSEDE_PAIR_SCOPE_FALLBACK_NORMALIZATION.md`; `docs\CM1320_*` through `docs\CM1327_*` |
| Candidate cache / read policy | `docs\MEMORY_LIFECYCLE_SCOPE_CANDIDATE_CACHE_INVALIDATION_REVIEW.md`; `docs\MEMORY_LIFECYCLE_SCOPE_DEFERRED_CANDIDATE_CACHE_INVALIDATION_POLICY.md`; `docs\MEMORY_LIFECYCLE_SCOPE_DEFERRED_SCOPE_POLLUTION_READ_POLICY.md` |

## Boundary Findings

- Proposal, approval packet, review surface, lifecycle, shadow projection, tombstone prep, supersede prep, read policy, audit evidence, and candidate cache invalidation all have existing local source and test surfaces.
- The clearest current no-apply implementation cluster is `DurableGovernanceMutationDryRunHelper` plus `DurableGovernanceShadowProjectionPreview`, then either `DurableGovernanceTombstoneRuntimePrepHelper` or `MemorySupersedeRuntimePrepHelper`.
- `memory_exclude` and `memory_forget` currently appear as deferred internal dry-run planning families, not public tools and not runtime-applied mutation paths.
- Tombstone and supersede have internal service/runtime tests, but G1.1 does not treat those as current authorization to mutate real memory.
- Candidate-cache invalidation is policy-shaped and seam-aware, but a current Phase G boundary matrix still needs to distinguish policy acceptance from applied invalidation.
- Audit evidence has selected-reader and contract surfaces, but broad raw audit scanning remains blocked by Phase G hard stops.

## First Slice Candidate For G1.2

Recommended next minimum task:

```text
CM-1392 Phase G G1 boundary matrix and first slice selection
```

Preferred first slice remains:

```text
governance mutation preview consistency
```

Suggested focus:

- compare tombstone and supersede runtime-prep output shapes
- identify shared preview fields for mutation family, target ids, lifecycle transition, audit plan, projection plan, invalidation plan, safety flags, and blockers
- keep all evidence no-apply / fixture / temp-local only
- avoid public MCP expansion and durable mutation

## Validation

Run for CM-1391:

```powershell
git diff --check
node .\scripts\validate_current_facts_drift.js
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Not run:

- `npm test`
- `npm run gate:mainline`
- `npm run gate:mainline:strict`
- HTTP observe
- provider smoke or benchmark
- real memory tools

## Result

`CM-1391` is completed as docs-only inventory after validation. It does not change runtime behavior, expand public MCP tools, write durable memory/audit state, or claim readiness.
