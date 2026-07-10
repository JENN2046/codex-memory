# Evidence Application Router Report

Task: `CM-2058`
Validation: `CMV-2159`

## Summary

`CM-2058` adds a local evidence application router contract for the
near-model memory plan pack. It consumes only the current CM-2057 evidence
request packet and prepares the future application order for:

- Phase 2 exact receipt evidence before completion-audit patch;
- Phase 8 exact native-write receipt evidence before completion-audit patch;
- Phase 9 / Phase 10 observation, external review, tag approval, and review
  bundle application evidence before completion-audit patch.

The router is not evidence material, not approval, not exact receipt evidence,
not external review evidence, not tag approval, and not a completion-audit patch.

## Application Routes

- `phase2_exact_receipts_before_completion_audit_patch`
- `phase8_exact_receipts_before_completion_audit_patch`
- `phase9_phase10_external_review_before_completion_audit_patch`

Each route is `canApplyNow=false` and requires separate future evidence material
before any completion-audit application can be considered.

## Boundary

The contract requires current CM-2057 source metadata and an accepted CM-2057
request packet result. It verifies the packet shape, source task ids, next gate,
future request sections, and request counts. It rejects stale packet metadata,
rejected packet results, packet count drift, raw evidence material fields,
secret-shaped fields, runtime-shaped fields, and readiness-shaped fields.

The contract stops L4 if input attempts or claims:

- approval acceptance;
- receipt acceptance or application;
- review evidence acceptance;
- tag approval acceptance;
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

- `src/core/NearModelMemoryPlanPackEvidenceApplicationRouterContract.js`
- `tests/near-model-memory-plan-pack-evidence-application-router-contract.test.js`

Focused tests prove:

- route order is prepared from the current CM-2057 packet only;
- stale CM-2057 source metadata is rejected;
- rejected or stale packet results are blocked;
- packet count drift is blocked;
- evidence application, runtime, tag, and readiness drift stop L4;
- raw evidence material fields are rejected by path only without value echo;
- the router does not complete the full completion audit.

## Non-Claims

CM-2058 does not:

- accept Jenn approval;
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

`await_separate_evidence_material_before_application_or_completion_audit_patch`
