# CM-0994 Deferred Governance App Apply-Plan Preview Readiness Boundary Review

Date: 2026-05-24

Status: `MEMORY_LIFECYCLE_SCOPE_DEFERRED_GOVERNANCE_APP_APPLY_PLAN_PREVIEW_READINESS_REVIEW_POLICY_COMPLETED_NOT_READY`

## Scope

This slice hardens the pure explicit-input review helper for the CM-0931 app-level apply-plan preview entries:

- `previewInternalMemoryExcludeApplyPlan`
- `previewInternalMemoryForgetApplyPlan`

The helper verifies that app-level preview evidence remains internal-only, preview-only, default-disabled, non-ready, and bound to the CM-0992 closure-evidence boundary before it can be accepted as review evidence.

## Acceptance Shape

The review accepts only when evidence shows:

- exact public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`
- exact app preview methods are present for `memory_exclude` and `memory_forget`
- app preview methods route only to the adapter preview methods
- adapter preview routing is enabled only by a separate explicit flag
- approved context and runtime-surface evidence are required
- preview-only apply-plan evidence is accepted
- execution approval remains false
- runtime apply remains blocked
- durable audit and projection writes remain false
- candidate-cache clearing remains false
- readiness remains unclaimed
- `closureEvidenceBoundary` is accepted
- app preview evidence is committed, validation-passed, internal-only, default-disabled, public-MCP-frozen, not runtime-applied, and not readiness/reliability-claiming

## Validation

Passed:

- `node --check src\core\DeferredGovernanceAppApplyPlanPreviewReadinessReviewPolicy.js`
- `node --check tests\deferred-governance-app-apply-plan-preview-readiness-review-policy.test.js`
- `node --check src\core\DeferredGovernanceClosureEvidenceBoundaryPolicy.js`
- `node --test tests\deferred-governance-app-apply-plan-preview-readiness-review-policy.test.js`
- `node --test tests\deferred-governance-closure-evidence-boundary-policy.test.js`
- `node --test tests\deferred-governance-app-runtime-entry.test.js` (`7/7`)
- `node --test tests\deferred-governance-runtime-entry-adapter.test.js` (`12/12`)
- `node --test tests\deferred-governance-bounded-apply-plan-preview.test.js` (`6/6`)
- Public MCP freeze scan over `src\app.js`, `src\core\constants.js`, `src\index.js`, and `src\http-index.js`
- `git diff --check -- src\core\DeferredGovernanceAppApplyPlanPreviewReadinessReviewPolicy.js tests\deferred-governance-app-apply-plan-preview-readiness-review-policy.test.js`

## Not Proven

This does not prove live `memory_exclude`, live `memory_forget`, durable governance mutation, candidate-cache clearing, HTTP MCP behavior, donor compatibility changes, `memory recall reliable`, `memory write reliable`, runtime readiness, RC readiness, or VCP full parity.
