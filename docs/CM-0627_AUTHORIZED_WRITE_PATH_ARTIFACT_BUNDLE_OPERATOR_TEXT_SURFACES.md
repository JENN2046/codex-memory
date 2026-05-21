# CM-0627 Authorized Write-Path Artifact-Bundle Operator Text Surfaces

Status: COMPLETED_VALIDATED_NOT_READY
Decision: ARTIFACT_BUNDLE_TEXT_SUMMARY_EXPOSED_READ_ONLY
Date: 2026-05-20

## Purpose

`CM-0626` already exposed one stage-aware `artifactBundleDraft` through the governance-only evaluator and normal read-only JSON control surfaces.

One operator gap still remained:

- JSON consumers could read the current bundle directly
- but default text surfaces still only emphasized blocked/reuse/escalate
- operators still had to open JSON or several fields to see the current bundle and next artifact together

`CM-0627` closes only that gap.

It pushes the same bundle state into the normal text/readout layer of:

- `dashboard`
- `governance-report`
- `http-observe`

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

The normal operator-facing text surfaces now directly summarize:

- current `artifactBundleDraft.bundleKind`
- current `operatorActionPlan.nextStepRef`
- the combined packet digest `bundle=<kind>, next=<ref>`

So future operators no longer need to switch to JSON just to answer:

- which current bundle is active
- which artifact comes next

## Current Runtime Truth

Default truth remains unchanged:

```text
allowedGovernanceOutput = NO_AUTO_APPROVAL_ISSUED
decision = RC_NOT_READY_BLOCKED
currentBlockedOn = external_token_assertion_not_accepted
artifactBundleDraft.bundleKind = assertion_record_only
operatorActionPlan.nextStepRef = docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md
```

So the new text surfaces are available now, but they still only summarize blocked governance artifacts until explicit future input changes the governing result.

## Validation

Validated with:

- targeted `dashboard` / `governance-report` / `http-observe` tests
- full `npm test`
- `git diff --check`
- local docs validation

## Next Safe Action

Wait for token material to independently exist in the current session.

After that, future operators can:

1. record the external assertion with `CM-0611`
2. evaluate the chain through the existing helper/control surfaces
3. read the current bundle and next artifact directly from normal text output
4. decide whether the chain stays blocked, reuses `CM-0601`, or escalates into widening review

Until then, keep `RC_NOT_READY_BLOCKED`.
