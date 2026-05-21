# CM-0630 Authorized Write-Path Early Assertion Preview And Draft Surface

Status: COMPLETED_VALIDATED_NOT_READY
Decision: EARLY_ASSERTION_SURFACE_EXPOSED_READ_ONLY
Date: 2026-05-21

## Purpose

`CM-0629` already exposed one current-stage `operatorPacketDraft`.

But the chain still had one automation-facing gap at the very first blocked stage:

- later `CM-0614/0615/0616` records already had structured preview and draft data
- the current `CM-0611` external assertion layer did not
- direct-input preflight also did not preserve `assertedNoStartupHealthWriteRecallRequested`

So future operators or automation could see that the chain was blocked on `CM-0611`, but still had to reconstruct the first assertion record from prose.

`CM-0630` closes only that early-stage gap.

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

- `assertionRecordPreview`
- `recordDrafts.cm0611AssertionRecord`

and the current blocked-stage packet now carries those same early-stage artifacts through:

- `artifactBundleDraft.selectedArtifacts`
- `operatorPacketDraft.selectedPayload`

This means the currently blocked first step is now structured in the same way as the later issuance/routing/widening layers.

## Direct-Input Tightening

`externalAssertion` normalization and evaluation now also preserve and require:

```text
assertedNoStartupHealthWriteRecallRequested
```

for direct-input `C6` acceptance.

That makes the explicit-input path match the already prepared `CM-0610` / `CM-0611` contract more closely instead of leaving one required boolean outside the structured model.

## Current Runtime Truth

Default truth remains unchanged:

```text
allowedGovernanceOutput = NO_AUTO_APPROVAL_ISSUED
decision = RC_NOT_READY_BLOCKED
currentBlockedOn = external_token_assertion_not_accepted
operatorActionPlan.currentStage = await_cm0611_assertion_record
assertionRecordPreview.previewUsableNow = true
recordDrafts.cm0611AssertionRecord.draftUsableNow = true
```

So the new surface makes the first blocked step machine-readable, but it still does not prove token presence or move the chain past `CM-0611/CM-0610`.

## Validation

Validated with:

- targeted helper / CLI / control-surface tests
- full `npm test`
- `git diff --check`
- local docs validation

## Next Safe Action

Wait for token material to independently exist in the current session.

After that, future operators can:

1. fill `CM-0611` from the exposed early-stage draft instead of re-reading prose
2. pass the resulting assertion record through the existing governance-only evaluation path
3. decide whether the chain stays blocked, reuses `CM-0601`, or escalates into widening review

Until then, keep `RC_NOT_READY_BLOCKED`.
