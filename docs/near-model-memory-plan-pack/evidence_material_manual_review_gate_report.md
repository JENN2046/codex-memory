# Evidence Material Manual Review Gate Report

Task: `CM-2063`
Validation: `CMV-2164`

## Summary

`CM-2063` adds a local evidence material manual review gate contract for the
near-model memory plan pack. It consumes only the current CM-2062 evidence
material intake boundary result and prepares the manual-review checklist for
future separate exact-authorization packets and low-disclosure evidence material.

The gate covers:

- Phase 2 exact authorization and low-disclosure exact receipt material;
- Phase 8 exact authorization and low-disclosure native-write receipt material;
- Phase 9 / Phase 10 review or tag-approval authorization and low-disclosure
  external-review or tag-approval material.

This gate is not a manual review completion, not exact authorization, not
material acceptance, not evidence acceptance, not evidence application, and not
a completion-audit patch.

## Manual Review Checklist

Each checklist row records:

- source slot id;
- route id;
- source section;
- required evidence kind;
- required metadata kind;
- required future authorization kind;
- required future low-disclosure material kind;
- requested item count.

Every row has `exactAuthorizationPacketRequiredForReview=true`,
`lowDisclosureMaterialRequiredForReview=true`,
`operatorManualReviewRequired=true`, `reviewPacketBodyAllowed=false`,
`rawAuthorizationAllowed=false`, `rawMaterialAllowed=false`,
`materialBodyAllowed=false`, `materialValueAllowed=false`,
`canCompleteManualReviewNow=false`, `canAcceptAuthorizationNow=false`,
`canAcceptMaterialNow=false`, `canAcceptEvidenceNow=false`,
`canApplyNow=false`, `manualReviewCompletedNow=false`,
`acceptedAsEvidenceNow=false`, and
`acceptedAsCompletionEvidenceNow=false`.

## Source Evidence

- `src/core/NearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract.js`
- `tests/near-model-memory-plan-pack-evidence-material-manual-review-gate-contract.test.js`

Focused tests prove:

- the manual-review checklist is prepared from current CM-2062 intake entries
  only;
- stale CM-2062 source metadata is rejected;
- rejected or stale intake results are blocked;
- intake requirement drift is blocked;
- manual review completion, exact authorization acceptance, low-disclosure
  material acceptance, evidence application, runtime, tag, and readiness drift
  stop L4;
- raw review, authorization, and material fields are rejected by path only
  without value echo;
- the manual review gate does not complete the full completion audit.

## Non-Claims

CM-2063 does not:

- complete manual review;
- accept Jenn approval or exact authorization;
- accept low-disclosure evidence material;
- accept or apply exact receipts;
- accept external review evidence;
- accept tag approval;
- apply evidence;
- apply completion-audit patches;
- call VCPToolBox/runtime/provider surfaces;
- execute native read or native write proof;
- mutate durable state;
- expand public MCP or default runtime;
- create/push tags, publish releases, deploy, or cut over;
- complete any phase or the full plan pack;
- claim readiness.

## Next Gate

`await_actual_reviewed_exact_authorization_and_low_disclosure_material_before_any_acceptance`
