# CM-0623 Authorized Write-Path Operator Action Plan Surface

Status: COMPLETED_VALIDATED_NOT_READY
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-20

## Purpose

Turn the current `CM-0612` runbook from prose-only guidance into structured, machine-readable operator action output.

This slice does not:

- prove token presence
- issue approval
- execute `CM-0601`
- authorize `CM-0595`
- call `record_memory`
- call `search_memory`
- bind token material
- start HTTP
- probe `/health`
- read `.jsonl`

Its scope is narrower:

- expose the current operator stage as structured governance output
- expose the next record / next gate refs for the current stage
- keep the existing `NO_AUTO_APPROVAL_ISSUED` / `AUTO_REUSE_CM0601_LINE_ONLY` / `ESCALATE_FOR_FUTURE_WIDENING_REVIEW` ceiling unchanged
- let normal read-only control surfaces say not only "what the result is" but also "which step comes next"

## Implemented Local Artifacts

- updated `src/core/AuthorizedWritePathAutoAuthorizationPreflight.js`
- updated `src/cli/authorized-write-path-auto-authorization.js`
- updated `src/cli/governance-report.js`
- updated `src/cli/dashboard.js`
- updated `src/cli/http-observe.js`
- updated `tests/authorized-write-path-auto-authorization-preflight.test.js`
- updated `tests/authorized-write-path-auto-authorization-cli.test.js`
- updated `tests/governance-report-cli.test.js`
- updated `tests/dashboard-cli.test.js`
- updated `tests/http-observe-cli.test.js`

## Structured Output

The current governance output now includes:

- `operatorActionPlan.sequenceRef`
- `operatorActionPlan.orderedSequenceRefs`
- `operatorActionPlan.wideningPathRefs`
- `operatorActionPlan.futureWriteBoundaryRef`
- `operatorActionPlan.currentStage`
- `operatorActionPlan.currentStageReason`
- `operatorActionPlan.nextStepRef`
- `operatorActionPlan.nextStepRefs`

Current stage values are intentionally narrow:

- `await_cm0611_assertion_record`
- `await_cm0610_contract_acceptance`
- `prerequisite_drift_fail_closed`
- `scope_drift_fail_closed`
- `cm0601_line_reuse_ready`
- `cm0604_widening_review_ready`
- `keep_rc_not_ready_blocked`

## Current Result

Current default fixture-backed result remains:

```text
allowedGovernanceOutput = NO_AUTO_APPROVAL_ISSUED
decision = RC_NOT_READY_BLOCKED
operatorActionPlan.currentStage = await_cm0611_assertion_record
operatorActionPlan.nextStepRef = docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md
```

With accepted explicit assertion input and token-missing rebound class, the current stage becomes:

```text
AUTO_REUSE_CM0601_LINE_ONLY
cm0601_line_reuse_ready
```

With accepted explicit assertion input and token-present rebound class, the current stage becomes:

```text
ESCALATE_FOR_FUTURE_WIDENING_REVIEW
cm0604_widening_review_ready
```

None of those outcomes issue approval or reach `CM-0595`.

## Validation

- `node --check .\src\core\AuthorizedWritePathAutoAuthorizationPreflight.js`
- `node --check .\src\cli\authorized-write-path-auto-authorization.js`
- `node --check .\src\cli\governance-report.js`
- `node --check .\src\cli\dashboard.js`
- `node --check .\src\cli\http-observe.js`
- `node --test .\tests\authorized-write-path-auto-authorization-preflight.test.js`
- `node --test .\tests\authorized-write-path-auto-authorization-cli.test.js`
- `node --test .\tests\governance-report-cli.test.js`
- `node --test .\tests\dashboard-cli.test.js`
- `node --test .\tests\http-observe-cli.test.js`

## Result

`CM-0623` makes the current governance chain operationally stronger without widening authority:

- the runbook is now visible as structured action state instead of prose alone
- normal read-only control surfaces can now show both the current governance result and the next required artifact
- current authority still does not widen beyond `CM-0601`
- runtime state still remains `RC_NOT_READY_BLOCKED`
- `CM-0595` still remains outside automatic authorization
