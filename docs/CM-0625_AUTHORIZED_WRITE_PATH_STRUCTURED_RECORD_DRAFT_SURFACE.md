# CM-0625 Authorized Write-Path Structured Record Draft Surface

Status: COMPLETED_VALIDATED_NOT_READY
Decision: STRUCTURED_RECORD_DRAFTS_EXPOSED_READ_ONLY
Date: 2026-05-20

## Purpose

`CM-0624` exposed the future record skeletons as structured preview metadata.

The next remaining operator gap was narrower:

- future operators could see the shape
- but they still could not read a prefilled first draft derived from the current governance result

`CM-0625` closes only that gap.

It adds structured read-only draft objects for:

- `CM-0614` issuance
- `CM-0615` routing outcome
- `CM-0616` widening review

## Scope

This work remains governance-only and fail-closed.

It does not:

- prove token presence
- issue approval
- execute `CM-0601`
- widen to `CM-0595`
- call `record_memory`
- touch runtime/config/provider state

## Result

The evaluator and normal read-only control surfaces now expose:

```text
recordDrafts.cm0614Issuance
recordDrafts.cm0615RoutingOutcome
recordDrafts.cm0616WideningReview
```

These drafts are intentionally bounded:

- they are machine-readable
- they are prefilled from the current governance result
- they remain preview/draft only
- they do not mutate docs or runtime

## Current Runtime Truth

Default truth remains unchanged:

```text
allowedGovernanceOutput = NO_AUTO_APPROVAL_ISSUED
decision = RC_NOT_READY_BLOCKED
currentBlockedOn = external_token_assertion_not_accepted
```

So the draft surfaces are available now, but their usable-now flags still remain fail-closed unless future explicit input changes the governance result.

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
2. evaluate the chain through the existing helper/control surfaces
3. read current stage, exact line preview, future record previews, and now prefilled record drafts from one place
4. decide whether the chain stays blocked, reuses `CM-0601`, or escalates into widening review

Until then, keep `RC_NOT_READY_BLOCKED`.
