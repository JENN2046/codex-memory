# Evidence Material Intake Boundary Report

Task: `CM-2062`
Validation: `CMV-2163`

## Summary

`CM-2062` adds a local evidence material intake boundary contract for the
near-model memory plan pack. It consumes only the current CM-2061 evidence
material acceptance preflight result and prepares the intake requirements for
future separate exact-authorization packets and low-disclosure evidence material.

The boundary covers:

- Phase 2 exact authorization and low-disclosure exact receipt material;
- Phase 8 exact authorization and low-disclosure native-write receipt material;
- Phase 9 / Phase 10 review or tag-approval authorization and low-disclosure
  external-review or tag-approval material.

This boundary is not exact authorization, not material intake acceptance, not
evidence acceptance, not evidence application, and not a completion-audit patch.

## Intake Requirements

Each requirement records:

- source slot id;
- route id;
- source section;
- required evidence kind;
- required metadata kind;
- required future authorization kind;
- required future low-disclosure material kind;
- requested item count.

Every requirement has `separateExactAuthorizationPacketRequired=true`,
`separateLowDisclosureMaterialPacketRequired=true`, `intakeMetadataOnly=true`,
`rawAuthorizationAllowed=false`, `rawMaterialAllowed=false`,
`materialBodyAllowed=false`, `materialValueAllowed=false`,
`canAcceptAuthorizationNow=false`, `canAcceptMaterialNow=false`,
`canAcceptEvidenceNow=false`, `canApplyNow=false`,
`acceptedAsEvidenceNow=false`, and
`acceptedAsCompletionEvidenceNow=false`.

## Source Evidence

- `src/core/NearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract.js`
- `tests/near-model-memory-plan-pack-evidence-material-intake-boundary-contract.test.js`

Focused tests prove:

- intake requirements are prepared from current CM-2061 preflight entries only;
- stale CM-2061 source metadata is rejected;
- rejected or stale acceptance preflight results are blocked;
- acceptance requirement drift is blocked;
- exact authorization acceptance, low-disclosure material acceptance, evidence
  application, runtime, tag, and readiness drift stop L4;
- raw authorization and material intake fields are rejected by path only without
  value echo;
- the intake boundary does not complete the full completion audit.

## Non-Claims

CM-2062 does not:

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

`await_actual_exact_authorization_packet_and_low_disclosure_material_for_manual_review_before_acceptance`
