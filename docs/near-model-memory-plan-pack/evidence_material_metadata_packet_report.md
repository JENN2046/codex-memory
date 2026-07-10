# Evidence Material Metadata Packet Report

Task: `CM-2060`
Validation: `CMV-2161`

## Summary

`CM-2060` adds a local evidence material metadata packet contract for the
near-model memory plan pack. It consumes only the current CM-2059 evidence
material metadata gate result and validates a low-disclosure metadata packet
shape for future evidence material.

The packet covers:

- Phase 2 exact receipt metadata;
- Phase 8 exact native-write receipt metadata;
- Phase 9 / Phase 10 external review or tag approval metadata.

This packet is metadata-only. It is not evidence material, not exact receipt
evidence, not external review evidence, not tag approval, not evidence
application, and not a completion-audit patch.

## Packet Boundary

The packet must be low-disclosure, category-only, body-free, value-free, and
metadata-only. It records that exact authorization and separate evidence
material are still required before any acceptance or application.

The packet entries mirror the CM-2059 slots by:

- slot id;
- route id;
- source section;
- required evidence kind;
- required metadata kind;
- requested item count.

Each entry has `materialBodyPresent=false`, `materialValuePresent=false`,
`canAcceptMaterialNow=false`, `acceptedAsEvidenceNow=false`,
`acceptedAsCompletionEvidenceNow=false`, and `canApplyNow=false`.

## Source Evidence

- `src/core/NearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract.js`
- `tests/near-model-memory-plan-pack-evidence-material-metadata-packet-contract.test.js`

Focused tests prove:

- low-disclosure metadata packet entries are validated from current CM-2059
  slots only;
- stale CM-2059 source metadata is rejected;
- rejected or stale metadata gate results are blocked;
- slot and packet entry drift is blocked;
- material acceptance, evidence application, runtime, tag, and readiness drift
  stop L4;
- raw material fields are rejected by path only without value echo;
- metadata packets do not complete the full completion audit.

## Non-Claims

CM-2060 does not:

- accept Jenn approval;
- accept or apply exact receipts;
- accept external review evidence;
- accept tag approval;
- accept evidence material;
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

`await_separate_exact_authorization_and_low_disclosure_evidence_material_before_acceptance_or_application`
