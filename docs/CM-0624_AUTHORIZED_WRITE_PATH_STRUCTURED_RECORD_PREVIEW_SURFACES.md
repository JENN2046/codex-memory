# CM-0624 Authorized Write-Path Structured Record Preview Surfaces

Status: COMPLETED_VALIDATED_NOT_READY
Decision: STRUCTURED_RECORD_PREVIEW_SURFACES_EXPOSED_READ_ONLY
Date: 2026-05-20

## Purpose

This note records the next narrow step after:

- `CM-0620` exact approval-line preview
- `CM-0623` operator action-plan surface

The remaining prose-only gap was not the current decision or stage.

It was the future record shapes that still had to be read manually from:

- `docs/CM-0614_CM0601_AUTO_REUSE_APPROVAL_ISSUANCE_RECORD_TEMPLATE.md`
- `docs/CM-0615_CM0605_ROUTING_OUTCOME_RECORD_TEMPLATE.md`
- `docs/CM-0616_WIDENING_REVIEW_OUTCOME_RECORD_TEMPLATE.md`

`CM-0624` closes only that governance gap.

It does so by exposing three structured read-only preview surfaces through the same fail-closed evaluator and normal control surfaces:

- `issuanceRecordPreview`
- `routingOutcomePreview`
- `wideningReviewPreview`

## Scope

This work is governance-only.

It does not:

- prove token presence
- issue approval
- execute `CM-0601`
- widen to `CM-0595`
- call `record_memory`
- read runtime stores
- touch provider/config/startup persistence

## Result

The current evaluator now exposes:

1. exact future `CM-0601` line preview
2. current operator stage and next-artifact refs
3. future issuance-record preview
4. future routing-outcome preview
5. future widening-review preview

These surfaces are available through:

- `src/cli/authorized-write-path-auto-authorization.js`
- `src/cli/governance-report.js`
- `src/cli/dashboard.js`
- `src/cli/http-observe.js`

## Current Runtime Truth

This work does not change runtime truth.

Current default output remains:

```text
allowedGovernanceOutput = NO_AUTO_APPROVAL_ISSUED
decision = RC_NOT_READY_BLOCKED
currentBlockedOn = external_token_assertion_not_accepted
```

So the new previews are available now, but not yet usable for real chain advancement.

## Validation

Validated with:

- targeted helper / CLI / control-surface tests
- full `npm test`
- `git diff --check`
- local docs validation

## Next Safe Action

Wait for token material to independently exist in the current session.

After that, future operators can:

1. record the external assertion with `CM-0611`
2. feed it into the evaluator/control surfaces
3. read not only the current stage, but also the structured future record previews
4. decide whether the chain stays blocked, reuses `CM-0601`, or escalates into widening review

Until then, keep `RC_NOT_READY_BLOCKED`.
