# Evidence Material Acceptance Preflight Report

Task: `CM-2061`
Validation: `CMV-2162`

## Summary

`CM-2061` adds a local evidence material acceptance preflight contract for the
near-model memory plan pack. It consumes only the current CM-2060 evidence
material metadata packet result and prepares the required preconditions before
any future material acceptance.

The preflight covers:

- Phase 2 exact authorization and low-disclosure exact receipt material;
- Phase 8 exact authorization and low-disclosure native-write receipt material;
- Phase 9 / Phase 10 review or tag-approval authorization and low-disclosure
  external-review or tag-approval material.

This preflight is not exact authorization, not evidence material acceptance, not
receipt acceptance, not external review acceptance, not tag approval, not
evidence application, and not a completion-audit patch.

## Acceptance Requirements

Each requirement records:

- source slot id;
- route id;
- source section;
- required evidence kind;
- required metadata kind;
- required future authorization kind;
- required future low-disclosure material kind;
- requested item count.

Every requirement has `exactAuthorizationRequired=true`,
`lowDisclosureEvidenceMaterialRequired=true`, `materialBodyAllowed=false`,
`materialValueAllowed=false`, `canAcceptNow=false`, `canApplyNow=false`,
`acceptedAsEvidenceNow=false`, and
`acceptedAsCompletionEvidenceNow=false`.

## Source Evidence

- `src/core/NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract.js`
- `tests/near-model-memory-plan-pack-evidence-material-acceptance-preflight-contract.test.js`

Focused tests prove:

- exact authorization and material acceptance requirements are prepared from
  current CM-2060 packet entries only;
- stale CM-2060 source metadata is rejected;
- rejected or stale metadata packet results are blocked;
- metadata entry drift is blocked;
- exact authorization acceptance, low-disclosure material acceptance, evidence
  application, runtime, tag, and readiness drift stop L4;
- raw authorization and material fields are rejected by path only without value
  echo;
- acceptance preflight does not complete the full completion audit.

## Non-Claims

CM-2061 does not:

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

`await_separate_exact_authorization_packet_and_low_disclosure_evidence_material_before_acceptance`
