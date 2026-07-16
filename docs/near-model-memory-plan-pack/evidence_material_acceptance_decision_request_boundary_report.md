# Evidence Material Acceptance Decision Request Boundary Report

Task: `CM-2065`
Validation: `CMV-2166`

## Summary

`CM-2065` adds a local evidence material acceptance decision request boundary
contract for the near-model memory plan pack. It consumes only the current
CM-2064 acceptance eligibility gate result and prepares future acceptance
decision request entries for actual reviewed acceptance decision packets.

The boundary covers:

- Phase 2 exact authorization, reviewed low-disclosure material, and future
  acceptance decision packet requirements;
- Phase 8 exact authorization, reviewed low-disclosure material, and future
  acceptance decision packet requirements;
- Phase 9 / Phase 10 review or tag-approval authorization, reviewed
  low-disclosure material, and future acceptance decision packet requirements.

This boundary is not a manual review completion, not an acceptance decision,
not an acceptance decision submission, not exact authorization acceptance, not
material acceptance, not evidence acceptance, not evidence application, and not
a completion-audit patch.

## Acceptance Decision Requests

Each request row records:

- source slot id;
- route id;
- source section;
- required evidence kind;
- required metadata kind;
- required future authorization kind;
- required future low-disclosure material kind;
- requested item count.

Every row has `acceptanceDecisionPacketRequired=true`,
`reviewedExactAuthorizationRequired=true`,
`reviewedLowDisclosureMaterialRequired=true`, `operatorDecisionRequired=true`,
`decisionBodyAllowed=false`, `decisionValueAllowed=false`,
`rawAuthorizationAllowed=false`, `rawMaterialAllowed=false`,
`materialBodyAllowed=false`, `materialValueAllowed=false`,
`canSubmitAcceptanceDecisionNow=false`,
`canMakeAcceptanceDecisionNow=false`, `canAcceptAuthorizationNow=false`,
`canAcceptMaterialNow=false`, `canAcceptEvidenceNow=false`,
`canApplyNow=false`, `acceptedAsEvidenceNow=false`, and
`acceptedAsCompletionEvidenceNow=false`.

## Source Evidence

- `src/core/NearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract.js`
- `tests/near-model-memory-plan-pack-evidence-material-acceptance-decision-request-boundary-contract.test.js`

Focused tests prove:

- acceptance decision request entries are prepared from current CM-2064
  eligibility output only;
- stale CM-2064 source metadata is rejected;
- rejected or stale acceptance eligibility results are blocked;
- acceptance eligibility checklist drift is blocked;
- decision submission, acceptance decision, exact authorization acceptance,
  low-disclosure material acceptance, evidence application, runtime, tag, and
  readiness drift stop L4;
- raw acceptance decision, reviewed decision, and decision receipt fields are
  rejected by path only without value echo;
- the acceptance decision request boundary does not complete the full
  completion audit.

## Non-Claims

CM-2065 does not:

- complete manual review;
- make or submit an acceptance decision;
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

`await_actual_reviewed_acceptance_decision_packet_before_any_evidence_acceptance_or_application`
