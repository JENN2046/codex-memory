# CM-1991 Real Disposable Target Material Evidence Preparation

Task id: `CM-1991`
Validation id: `CMV-2094`
Date: 2026-07-06
Evidence type: `source-test-docs`, `real-disposable-target-material-evidence`,
`local-no-live`, `no-runtime`, `no-request-body`, `no-target-binding`,
`no-read-shape`, `no-readiness`

## Purpose

CM-1991 consumes the CM-1990 pre-execution abort receipt and adds a
machine-verifiable local contract for future real disposable target material
evidence preparation.

CM-1991 does not supply, bind, print, persist, or prove real disposable target
material. It only defines the fail-closed preparation shape that must remain in
place before a later route can accept separately evidenced real target material.

## Added Surfaces

- `src/core/VcpNativeRealDisposableTargetMaterialEvidencePreparationContract.js`
- `tests/vcp-native-real-disposable-target-material-evidence-preparation-contract.test.js`
- this document

## Contract Summary

The CM-1991 contract accepts only category-level evidence that:

- consumes a CM-1990 abort receipt with `statusClass=boundary_blocked`,
  `routeStatusCategory=not_executed`, target binding attempts `0`, request body
  generation false, runtime/network false, response consumption false,
  `readShapeUnlocked=false`, and `readinessClaimed=false`;
- records `realDisposableTargetMaterialRequired=true`;
- records `separateEvidenceRequired=true`;
- records `materialMustBeTargetScoped=true`;
- records `materialMayBeDiscardedAfterProbe=true`;
- records `materialProvenPresent=false`;
- records `targetMaterialBound=false`;
- records `targetBindingProven=false`;
- records `existingOperatorReferenceIsSufficient=false`;
- records no existing operator target reuse, non-target workspace access, Jenn
  private information, production secrets, customer data, real private memory,
  or persistent runtime artifacts;
- requires a future exact approval before target material use, target binding,
  request-body generation, resolver/transport invocation, runtime execution, or
  read-shape probing.

Accepted output is a low-disclosure preparation result only. It includes no raw
target material values, endpoint/locator values, request body, raw response,
raw error, logs, secrets, private memory content, or memory ids.

## Rejection Rules

The contract rejects:

- missing CM-1991 fields;
- stale or contradicted CM-1990 abort facts;
- any claim that target material is already present, bound, persisted, or
  sufficient through the existing operator reference;
- existing operator target reuse;
- private, production, customer, real-memory, or persistent runtime target
  posture;
- raw target material, endpoint/locator, request, response, raw error, log,
  secret, private-memory, or memory-id fields without echoing submitted values;
- future boundary drift that would allow runtime, target binding, request-body
  output, field-name disclosure, retry without new evidence, raw value
  persistence, or readiness;
- nonzero execution, write, provider, public MCP, VCPToolBox core, release, or
  readiness counters.

## Boundary Ledger

```yaml
cm1991_mode: local_no_live_source_test_docs
prior_abort_required: CM-1990
target_reference_name: operator-vcp-toolbox-service-ref
component: KnowledgeBaseManager
action: knowledge_base.search
material_evidence_category: target_material_requirements_prepared_no_material_bound
material_scope_category: target_scoped_disposable_material_category_only
separately_evidenced_real_target_material_required: true
separately_evidenced_real_target_material_present: false
target_material_bound: false
target_binding_proven: false
existing_operator_reference_is_sufficient: false
request_body_generated: false
resolver_transport_invoked: false
runtime_called: false
network_called: false
response_body_consumed: false
endpoint_locator_disclosed: false
raw_values_persisted: false
memory_read: false
memory_written: false
durable_write: false
provider_api_call: false
dependency_change: false
public_mcp_expansion: false
vcp_toolbox_core_modified: false
push_tag_release_deploy_cutover: false
m15_unlocked: false
rc_gate_unlocked: false
read_shape_unlocked: false
readiness_claimed: false
```

## Validation Evidence

Targeted CM-1991 tests cover acceptance, target-material-present drift,
CM-1990 abort drift, raw-value rejection without echo, nonzero counter
rejection, and unchanged public MCP surface.

This is local contract evidence only. It is not runtime evidence, target binding
evidence, trusted-full-read evidence, production readiness, release readiness,
deploy readiness, cutover readiness, `RC_READY`, complete V8, or full bridge
completion.

## Route Decision

CM-1991 prepares the target-material evidence boundary but keeps the route
blocked before target binding or runtime. Next route:

`CM-1992 exact real disposable target material boundary packet / approval
request readiness review`, still local and no-live unless a future exact
approval also supplies separately evidenced real disposable target material.
