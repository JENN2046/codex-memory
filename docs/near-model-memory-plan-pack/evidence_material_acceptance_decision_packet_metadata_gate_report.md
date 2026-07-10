# Evidence Material Acceptance Decision Packet Metadata Gate Report

Task: `CM-2066`
Validation: `CMV-2167`

## Summary

`CM-2066` adds a local evidence material acceptance decision packet metadata
gate contract for the near-model memory plan pack. It consumes only the current
CM-2065 acceptance decision request boundary result and prepares low-disclosure
metadata slots for future reviewed acceptance decision packets.

The gate covers:

- Phase 2 future reviewed acceptance decision packet metadata;
- Phase 8 future reviewed acceptance decision packet metadata;
- Phase 9 / Phase 10 future reviewed acceptance decision packet metadata.

This gate is not a manual review completion, not an acceptance decision, not an
acceptance decision submission, not acceptance decision packet acceptance, not
exact authorization acceptance, not material acceptance, not evidence
acceptance, not evidence application, and not a completion-audit patch.

## Metadata Slots

Each metadata slot records:

- source slot id;
- route id;
- source section;
- required evidence kind;
- required metadata kind;
- required future authorization kind;
- required future low-disclosure material kind;
- requested item count.

Every slot has `acceptanceDecisionPacketRequired=true`,
`lowDisclosureDecisionMetadataRequired=true`,
`reviewedDecisionPacketRequired=true`, `categoryOnly=true`, `bodyFree=true`,
`valueFree=true`, `decisionBodyAllowed=false`,
`decisionValueAllowed=false`, `rawAuthorizationAllowed=false`,
`rawMaterialAllowed=false`, `materialBodyAllowed=false`,
`materialValueAllowed=false`, `canAcceptDecisionPacketNow=false`,
`canSubmitAcceptanceDecisionNow=false`,
`canMakeAcceptanceDecisionNow=false`, `canAcceptEvidenceNow=false`,
`canApplyNow=false`, `acceptedAsEvidenceNow=false`, and
`acceptedAsCompletionEvidenceNow=false`.

## Source Evidence

- `src/core/NearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionPacketMetadataGateContract.js`
- `tests/near-model-memory-plan-pack-evidence-material-acceptance-decision-packet-metadata-gate-contract.test.js`

Focused tests prove:

- metadata slots are prepared from current CM-2065 decision request entries
  only;
- stale CM-2065 source metadata is rejected;
- rejected or stale decision request boundary results are blocked;
- decision request drift is blocked;
- decision packet acceptance, decision submission, exact authorization
  acceptance, low-disclosure material acceptance, evidence application,
  runtime, tag, and readiness drift stop L4;
- raw decision packet metadata fields are rejected by path only without value
  echo;
- the metadata gate does not complete the full completion audit.

## Non-Claims

CM-2066 does not:

- complete manual review;
- make or submit an acceptance decision;
- accept an acceptance decision packet;
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

`await_actual_low_disclosure_reviewed_acceptance_decision_packet_before_any_acceptance`
