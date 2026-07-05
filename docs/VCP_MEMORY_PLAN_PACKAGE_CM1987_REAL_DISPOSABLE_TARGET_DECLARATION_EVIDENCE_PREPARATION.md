# CM-1987 Real Disposable Target Declaration Evidence Preparation

Task id: `CM-1987`
Validation id: `CMV-2090`
Date: 2026-07-06
Evidence type: `source-test-docs`, `local-no-live`,
`real-disposable-target-declaration`, `evidence-preparation-contract`,
`no-runtime`, `no-request-body`, `no-read-shape`, `no-readiness`

## Purpose

CM-1987 consumes the CM-1986 pre-execution abort and prepares a local
fail-closed declaration/evidence contract for a future real disposable target
binding route.

CM-1987 does not prove that a real target exists. It does not bind or resolve
endpoint/locator values. It does not generate a request body, invoke
resolver/transport, call runtime, consume responses, write memory, mutate
durable state, expand public MCP, or claim readiness.

The purpose is narrower: define exactly what low-disclosure declaration shape
must be present before a future exact approval packet can safely reference real
disposable target material again.

## Added Local Contract

CM-1987 adds:

- `src/core/VcpNativeRealDisposableTargetDeclarationEvidencePreparationContract.js`
- `tests/vcp-native-real-disposable-target-declaration-evidence-preparation-contract.test.js`

The contract accepts only category-level declaration evidence:

```yaml
accepted_declaration_shape:
  task_id: CM-1987
  target_reference_name: operator-vcp-toolbox-service-ref
  component: KnowledgeBaseManager
  action: knowledge_base.search
  prior_abort_source_task: CM-1986
  prior_abort_status_class: boundary_blocked
  prior_route_status_category: not_executed
  declaration_kind: real_disposable_target_declaration_preparation
  target_class: real_disposable_target
  target_lifecycle_category: new_or_disposable_target_scoped
  real_disposable_target_required: true
  new_or_disposable_target: true
  target_scope_only: true
  existing_operator_target_reuse_allowed: false
  non_target_workspace_access_allowed: false
  contains_jenn_private_information: false
  contains_production_secrets: false
  contains_customer_data: false
  contains_real_private_memory: false
  contains_persistent_runtime_artifacts: false
  may_be_discarded_after_probe: true
  binding_evidence_category: declaration_prepared_binding_not_proven
  target_binding_proven: false
  future_target_material_must_be_separately_evidenced: true
  existing_operator_reference_is_sufficient: false
  exact_approval_required_before_probe: true
```

## Rejection Rules

The contract fails closed when:

- CM-1986 abort facts are missing, stale, or contradicted;
- the declaration attempts existing operator target reuse;
- the target posture contains Jenn private information, production secrets,
  customer data, real private memory, or persistent runtime artifacts;
- the declaration tries to treat the existing operator reference as sufficient
  evidence;
- target binding is claimed as proven;
- request-body generation, runtime probing, response field-name disclosure, or
  retry without new evidence is allowed;
- endpoint, locator, request body, response body, raw error, raw log, secret,
  private memory, memory id, approval line, provider payload, or similar raw
  value fields enter the contract;
- any runtime, network, process/listener/service, memory write/read, durable
  write, provider/API, dependency, public MCP, VCPToolBox core, release/deploy,
  push/tag, or readiness counter is nonzero.

Rejected results include only field paths and reason codes. They do not echo
raw submitted material.

## Validation Evidence

Targeted CM-1987 tests passed `6/6`:

- accepts category-only real disposable target declaration preparation without
  live binding;
- rejects existing operator reuse and private/persistent target posture;
- rejects stale or contradicted CM-1986 abort facts;
- rejects raw values without echoing submitted material;
- rejects live execution counters and readiness drift;
- confirms the public MCP surface remains unchanged.

## Boundary Ledger

```yaml
cm1987_boundary:
  cm1986_abort_receipt_consumed: true
  source_contract_added: true
  targeted_tests_added: true
  targeted_tests_passed: 6
  real_disposable_target_declaration_preparation_present: true
  real_disposable_target_binding_proven: false
  target_material_bound: false
  endpoint_locator_values_bound: false
  endpoint_locator_values_persisted: false
  existing_operator_target_reuse_allowed: false
  existing_operator_reference_sufficient: false
  request_body_generated: false
  request_body_output: false
  request_body_persisted: false
  resolver_transport_invoked: false
  component_action_invoked: false
  runtime_called: false
  network_called: false
  response_body_consumed: false
  raw_value_persisted: false
  private_memory_content_persisted: false
  memory_ids_persisted: false
  memory_read_performed: false
  memory_write_performed: false
  durable_write_performed: false
  provider_api_called: false
  dependency_changed: false
  public_mcp_expansion_performed: false
  vcp_toolbox_core_modified: false
  push_performed: false
  tag_release_deploy_cutover_performed: false
  read_shape_unlocked: false
  trusted_full_read_completed: false
  m15_opened: false
  readiness_claimed: false
```

## Route Decision

CM-1987 prepares local no-live evidence rules only. It does not retry CM-1986.

Next route: CM-1988 exact real disposable target binding boundary packet /
approval request readiness review, still no-live unless a future exact approval
also supplies separately evidenced real disposable target material.
