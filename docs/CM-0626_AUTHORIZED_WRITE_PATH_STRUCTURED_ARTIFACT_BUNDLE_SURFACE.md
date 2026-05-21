# CM-0626 Authorized Write-Path Structured Artifact Bundle Surface

Status: COMPLETED_VALIDATED_NOT_READY
Decision: STRUCTURED_ARTIFACT_BUNDLE_EXPOSED_READ_ONLY
Date: 2026-05-20

## Purpose

`CM-0625` exposed prefilled machine-readable drafts for future issuance, routing, and widening records.

One operator gap still remained:

- future operators could read the exact line preview
- read the current stage
- read the future record previews
- read the prefilled record drafts
- but they still had to assemble the current actionable packet from several separate fields

`CM-0626` closes only that gap.

It adds one stage-aware, read-only artifact bundle surface:

```text
artifactBundleDraft
```

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

The evaluator and normal read-only control surfaces now expose a single bundle that answers:

- which governance stage the chain is currently in
- which artifact is current
- which refs belong to the current bundle
- which prefilled draft objects belong to the current bundle

Current bundle kinds are:

- `assertion_record_only`
- `assertion_contract_only`
- `cm0601_reuse_ready_bundle`
- `widening_review_ready_bundle`
- `fail_closed_sequence_only`

## Current Runtime Truth

Default truth remains unchanged:

```text
allowedGovernanceOutput = NO_AUTO_APPROVAL_ISSUED
decision = RC_NOT_READY_BLOCKED
currentBlockedOn = external_token_assertion_not_accepted
artifactBundleDraft.bundleKind = assertion_record_only
```

So the new bundle surface is available now, but it still only packages blocked governance artifacts until explicit future input changes the governing result.

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
3. read one stage-aware artifact bundle instead of assembling the same packet from separate preview/draft fields
4. decide whether the chain stays blocked, reuses `CM-0601`, or escalates into widening review

Until then, keep `RC_NOT_READY_BLOCKED`.
