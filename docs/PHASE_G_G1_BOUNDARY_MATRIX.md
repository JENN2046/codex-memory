# Phase G G1 Boundary Matrix

更新时间：2026-06-02

Task: `CM-1392`

Validation: `CMV-1510`

Status: `COMPLETED_VALIDATED`

Decision: `BOUNDARY_MATRIX_AND_NO_APPLY_SLICE_SELECTED`

## Purpose

This document converts the `CM-1391` governance runtime inventory into a boundary matrix for `PHASE_G_MEMORY_GOVERNANCE_RUNTIME_BOUNDARY_PLAN.md`.

It marks each governance capability as one of:

- `implemented`
- `fixture-only`
- `dry-run-only`
- `runtime-prep`
- `exact-approval-required`
- `blocked`

This is a docs/no-apply planning artifact. It does not execute runtime governance actions, call memory tools, scan real memory, write durable memory/audit state, expand public MCP tools, or claim readiness.

## Boundary Matrix

| Capability | Current Boundary | Primary Surfaces | Evidence Level | Phase G Classification | Next Safe Movement |
|---|---|---|---|---|---|
| Governance proposal fixtures | Proposal records for governance and lifecycle states exist as fixtures | `tests/fixtures/phase-f-memory-governance-proposal-v1.json`; `tests/fixtures/phase-f-memory-lifecycle-proposal-states-v1.json`; `tests/phase-f-memory-governance-proposal-fixture.test.js` | fixture-only | `fixture-only` | Reuse as input examples for preview-shape tests only. |
| Approval packet and exact authorization | Approval packet contracts and exact line verifier exist | `src/core/MemoryGovernanceApprovalPacketContract.js`; `src/core/V11WriteGovernanceApprovalPacketBoundary.js`; `src/core/A5ApprovalLineVerifier.js` | contract / fixture | `implemented` for approval parsing; `exact-approval-required` for execution | Keep as authorization gate; do not infer approval from packet existence. |
| Governance review surface | Low-disclosure review/admin surfaces exist | `src/core/MemoryGovernanceReviewSurfaceContract.js`; `src/cli/governance-report.js`; `src/cli/dashboard.js` | fixture / schema | `implemented` for review summary; `blocked` for runtime mutation | May summarize no-apply preview output later without adding public MCP tools. |
| Deferred forget/exclusion planning | Internal planning supports `memory_exclude` and `memory_forget` dry-run families | `src/core/DeferredGovernanceMutationPlanningService.js`; `tests/deferred-governance-mutation-planning-service.test.js` | dry-run-only | `dry-run-only` | Keep unmounted; use as policy reference for no-apply preview consistency. |
| Deferred runtime entry adapter | Internal adapter candidates exist for deferred governance | `src/core/DeferredGovernanceRuntimeEntryAdapter.js`; `tests/deferred-governance-runtime-entry-adapter.test.js` | internal helper / tests | `runtime-prep` | Treat as no-apply planning surface unless exact-approved runtime proof is requested. |
| Deferred policy gates | Policy helpers cover no-hard-delete, exact execution approval, revision, changed ids, read pollution, shadow projection, and cache invalidation | `src/core/DeferredGovernance*Policy.js`; `tests/deferred-governance-*policy.test.js` | policy / fixture | `implemented` for policy summaries; `blocked` for apply | Use policy flags as matrix acceptance criteria. |
| Durable mutation packet contract | Packet contract and dry-run summary normalize mutation shape | `src/core/DurableGovernanceMutationPacketContract.js`; `src/core/DurableGovernanceMutationDryRunHelper.js` | dry-run-only | `dry-run-only` | Best base for G1.3 shared preview consistency. |
| Shadow projection preview | Preview helper computes projected lifecycle/status changes and changed ids without applying them | `src/core/DurableGovernanceShadowProjectionPreview.js`; `tests/durable-governance-shadow-projection-preview.test.js` | preview / fixture | `dry-run-only` | Include in shared preview field set. |
| Tombstone runtime prep | Tombstone prep can shape audit, shadow update, and invalidation plans | `src/core/DurableGovernanceTombstoneRuntimePrepHelper.js`; `src/core/TombstoneMemoryService.js`; `tests/durable-governance-tombstone-runtime-prep-helper.test.js`; `tests/tombstone-memory-runtime*.test.js` | runtime-prep / temp-local tests | `runtime-prep` plus `exact-approval-required` for real mutation | Candidate input for G1.3 preview consistency; no real tombstone. |
| Supersede runtime prep | Supersede prep can shape pair outcome, seam, audit, rollback, shadow, and invalidation plans | `src/core/MemorySupersedeRuntimePrepHelper.js`; `src/core/SupersedeMemoryService.js`; `tests/memory-supersede-runtime-prep-helper.test.js`; `tests/supersede-memory-runtime*.test.js` | runtime-prep / temp-local tests | `runtime-prep` plus `exact-approval-required` for real pair apply | Candidate input for G1.3 preview consistency; no real supersede. |
| Validate memory runtime entry | Internal validation runtime entry exists in lifecycle docs/tests | `src/core/ValidateMemoryService.js`; `tests/validate-memory-runtime.test.js`; `docs/MEMORY_LIFECYCLE_SCOPE_INTERNAL_VALIDATE_RUNTIME_ENTRY.md` | internal runtime tests | `runtime-prep` | Not selected for first slice; keep as later matrix row for validation semantics. |
| Lifecycle read policy | Lifecycle read filtering and status policy are represented in tests and app path | `src/core/MemoryLifecycleScopeGovernanceContract.js`; `src/app.js`; `tests/memory-lifecycle-scope-runtime-integration.test.js`; `tests/lifecycle-read-policy-runtime.test.js` | fixture / runtime-integration tests | `implemented` for selected read filtering; `blocked` for broad reliability claim | Use as constraint for unsafe state read suppression. |
| Scope-pollution read policy | Suppressed records must be blocked from normal recall, candidate generation, and cache-hit projection | `src/core/DeferredGovernanceScopePollutionReadPolicy.js`; `tests/deferred-governance-scope-pollution-read-policy.test.js` | policy / fixture | `implemented` for policy acceptance | Use in G1.3 acceptance checklist. |
| Lifecycle audit evidence | Audit evidence contracts and selected correlation readers exist | `src/core/MemoryGovernanceAuditEvidenceContract.js`; `src/storage/AuditLogStore.js`; `tests/memory-governance-audit-evidence-*.test.js`; `tests/audit-log-store-selected-correlation.test.js` | fixture / selected-reader | `implemented` for selected evidence shape; `blocked` for raw audit scan | G1.3 should include audit plan shape only, not durable audit write. |
| Governance runtime approval loop | In-memory loop proof surface exists | `src/core/GovernanceRuntimeApprovalAuditLoop.js`; `tests/governance-runtime-approval-audit-loop.test.js` | no-apply proof / exact-approved historical evidence | `dry-run-only` unless separately exact-approved | Not selected for G1.3 because it is approval-loop focused, not preview consistency. |
| Candidate-cache invalidation | Policy requires changed ids, governance revision, dependent entry clearing, fallback, and projection recheck | `src/core/DeferredGovernanceCandidateCacheInvalidationPolicy.js`; `src/storage/CandidateCacheStore.js`; `src/recall/CandidateGenerator.js`; `tests/deferred-governance-candidate-cache-invalidation-policy.test.js` | policy / seam | `implemented` for policy; `blocked` for real invalidation apply | G1.3 should include invalidation plan fields only. |
| Public MCP governance tools | No public tombstone, supersede, validate, forget, or exclude tools are exposed | `src/core/DeferredGovernanceMutationPlanningService.js`; MCP public contract docs/tests | contract / hard stop | `blocked` | Remain blocked unless a later explicit phase approves public schema expansion. |
| Real memory scan/export/import | Broad raw memory or audit access is blocked by Phase G | Phase G hard stops | no evidence by design | `blocked` | Do not use for G1.3. |
| Durable mutation proof | Real mutation requires exact bounded approval | Phase G hard stops; A5 approval model | exact approval only | `exact-approval-required` | Out of scope for G1 docs/no-apply work. |

## First Slice Selection

Selected G1.3 slice:

```text
governance mutation preview consistency
```

Selection rationale:

- It uses existing no-apply helpers instead of creating public tools or runtime mutation paths.
- It can compare tombstone and supersede preview shapes without touching real memory.
- It improves maintainability before any future exact-approved durable mutation proof.
- It directly supports Phase G exit criteria around no-apply preview paths, audit event distinction, shadow projection, and candidate-cache invalidation planning.

## G1.3 Proposed Acceptance Shape

The first no-apply slice should define a shared preview summary shape across tombstone and supersede runtime-prep helpers.

Minimum shared fields:

| Field Group | Required Meaning |
|---|---|
| `decision` | Must remain no-apply and not-ready; accepted preview must not imply execution approval. |
| `mutationFamily` | Must identify `memory_tombstone`, `memory_supersede`, or later supported families. |
| `targeting` | Must expose sanitized target memory ids and changed memory ids. |
| `lifecycleTransition` | Must expose from/to status expectations where applicable. |
| `auditPlan` | Must distinguish intent, committed, and cancelled/failed event shapes without writing durable audit. |
| `projectionPlan` | Must distinguish previewed shadow updates from durable projection apply. |
| `invalidationPlan` | Must expose changed ids and projected revision/cache invalidation needs without applying cache mutation. |
| `approval` | Must state execution approval is false and exact approval is required for any apply. |
| `safety` | Must keep side-effect counters false/zero: no provider, no service start, no real memory scan, no durable write, no public MCP expansion, no readiness claim. |
| `blockers` | Must preserve missing runtime-surface capabilities and unsupported family findings. |

## Explicit Non-Goals

- No source/runtime implementation in CM-1392.
- No runtime apply, real tombstone, real supersede, validation apply, forget, exclude, or delete action.
- No public MCP tool/schema expansion.
- No raw memory, broad `.jsonl`, raw audit, or private content scan.
- No provider/model call.
- No durable memory/audit write.
- No config/watchdog/startup/dependency change.
- No readiness, reliability, release, deployment, or cutover claim.

## Recommended Next Task

```text
CM-1393 Phase G G1.3 governance mutation preview consistency
```

Recommended local-safe scope:

- inspect `DurableGovernanceTombstoneRuntimePrepHelper` and `MemorySupersedeRuntimePrepHelper`
- add or adjust a shared no-apply preview summary helper only if existing code shape supports it
- add targeted fixture tests for tombstone/supersede shared preview consistency
- keep all tests temp-local / explicit-input only
- run targeted `node --check`, targeted tests, `git diff --check`, ledger consistency, and docs validation

Stop before any runtime apply, durable write, public MCP expansion, provider call, real memory scan, or readiness claim.

## Validation

Run for CM-1392:

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

`CM-1392` is completed as a docs/no-apply boundary matrix and first-slice selection after validation. It does not change runtime behavior, expand public MCP tools, write durable state, or claim readiness.
