# Evidence Material Metadata Gate Report

Task: `CM-2059`
Validation: `CMV-2160`

## Summary

`CM-2059` adds a local evidence material metadata gate for the near-model memory
plan pack. It consumes only the current CM-2058 evidence application router and
prepares low-disclosure metadata slots for future evidence material.

The metadata slots cover:

- Phase 2 exact receipt metadata;
- Phase 8 exact native-write receipt metadata;
- Phase 9 / Phase 10 external review or tag approval metadata.

This gate is not evidence material, not exact receipt evidence, not external
review evidence, not tag approval, and not a completion-audit patch.

## Metadata Slots

- `phase2_exact_receipts_before_completion_audit_patch_metadata_slot`
- `phase8_exact_receipts_before_completion_audit_patch_metadata_slot`
- `phase9_phase10_external_review_before_completion_audit_patch_metadata_slot`

Each slot is low-disclosure, category-only, body-free, value-free,
`canAcceptMaterialNow=false`, `acceptedAsEvidenceNow=false`, and
`acceptedAsCompletionEvidenceNow=false`.

## Boundary

The contract requires current CM-2058 source metadata and an accepted CM-2058
router result. It verifies the three route ids, route source sections,
requested item count presence, required evidence kinds, `canApplyNow=false`,
and router next gate. It rejects stale router metadata, rejected router results,
route drift, raw evidence material fields, secret-shaped fields, runtime-shaped
fields, and readiness-shaped fields.

The contract stops L4 if input attempts or claims:

- approval acceptance;
- receipt acceptance or application;
- review evidence acceptance;
- tag approval acceptance;
- evidence material acceptance;
- evidence application;
- completion-audit patch application;
- native read or native write execution;
- durable mutation;
- default runtime expansion;
- tag creation or push;
- release publication;
- deployment or cutover;
- Phase 2, Phase 8, Phase 9, Phase 10, or full plan-pack completion;
- readiness.

## Source Evidence

- `src/core/NearModelMemoryPlanPackEvidenceMaterialMetadataGateContract.js`
- `tests/near-model-memory-plan-pack-evidence-material-metadata-gate-contract.test.js`

Focused tests prove:

- low-disclosure material metadata slots are prepared from the current CM-2058
  router only;
- stale CM-2058 source metadata is rejected;
- rejected or stale router results are blocked;
- route drift and current application attempts are blocked;
- material acceptance, evidence application, runtime, tag, and readiness drift
  stop L4;
- raw evidence material fields are rejected by path only without value echo;
- metadata slots do not complete the full completion audit.

## Non-Claims

CM-2059 does not:

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

`await_separate_low_disclosure_evidence_material_metadata_before_any_acceptance_or_application`
