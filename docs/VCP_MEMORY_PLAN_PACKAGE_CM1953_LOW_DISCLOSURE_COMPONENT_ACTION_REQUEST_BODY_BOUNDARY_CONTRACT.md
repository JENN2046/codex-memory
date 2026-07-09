# CM-1953 Low-Disclosure Component/Action Request-Body Boundary Contract

## Purpose

CM-1953 turns the CM-1952 component/action request-body boundary preflight into
a local source/test/docs contract.

The contract is not a live executor. It does not generate, serialize, print,
store, or submit a concrete request body. It does not perform network/runtime
calls, inspect process state, start/stop/restart runtime, recheck listeners,
read response bodies, read raw error payloads, read logs/stdout/stderr, read
config/env/secrets, read raw memory/raw stores/raw audit rows, write memory,
change runtime/config/startup/watchdog/dependencies, expand public MCP, push,
release, deploy, cut over, claim readiness, or enter read-shape proof.

## Files

```text
src/core/VcpNativeComponentActionRequestBodyBoundaryContract.js
tests/vcp-native-component-action-request-body-boundary-contract.test.js
docs/VCP_MEMORY_PLAN_PACKAGE_CM1953_LOW_DISCLOSURE_COMPONENT_ACTION_REQUEST_BODY_BOUNDARY_CONTRACT.md
```

## Accepted Contract Scope

The contract accepts only low-disclosure category/boolean/zero-counter inputs:

```yaml
accepted_scope:
  targetReferenceName: operator-vcp-toolbox-service-ref
  component: KnowledgeBaseManager
  action: knowledge_base.search
  requestBodyShapeCategory: minimal_component_action_route_status_payload_category_only
  concreteRequestBodyGenerated: false
  serializedPayloadAvailable: false
  queryTextBound: false
  memoryContentBound: false
  providerPayloadBound: false
  endpointOrLocatorBound: false
  componentActionRouteProbeAuthorizedNow: false
  liveExecutionAllowedNow: false
  futureExactApprovalRequired: true
  responseBodyReadAllowed: false
  rawErrorPayloadReadAllowed: false
  readShapeUnlocked: false
  readinessClaimed: false
```

Accepted output keeps a low-disclosure projection only:

```yaml
low_disclosure_projection:
  taskId: CM-1953
  targetReferenceName: operator-vcp-toolbox-service-ref
  component: KnowledgeBaseManager
  action: knowledge_base.search
  requestBodyShapeCategory: minimal_component_action_route_status_payload_category_only
```

## Rejection Scope

The contract fails closed for:

- missing required lane fields
- unknown fields
- nonzero or unknown counters
- unsafe or mismatched safe target references
- invalid component/action identifiers
- endpoint or locator values
- config/env/secrets/tokens/credentials
- concrete request bodies
- serialized payloads
- query text
- memory content
- provider payloads
- response bodies or raw error payloads
- response shape keys
- memory IDs or raw memory text
- logs/stdout/stderr
- raw plugin config
- runtime payloads
- approval lines
- live execution claims
- route probe execution claims
- read-shape claims
- memory/write claims
- runtime/config/startup/watchdog/dependency changes
- public MCP expansion claims
- readiness claims

Private submitted values are not echoed in rejected outputs.

## Validation

```text
node --check src/core/VcpNativeComponentActionRequestBodyBoundaryContract.js
node --check tests/vcp-native-component-action-request-body-boundary-contract.test.js
node --test tests/vcp-native-component-action-request-body-boundary-contract.test.js
```

Targeted test result:

```yaml
tests:
  total: 7
  passed: 7
```

Covered cases:

- accepts low-disclosure request-body boundary contract
- rejects sensitive concrete request-body material without echo
- rejects live route probe, request-body, read-shape, and readiness drift
- rejects unknown fields and nonzero counters
- rejects unsafe target and invalid component/action identifiers without echo
- reports missing required lane fields
- confirms public MCP surface remains unchanged

## Decision

```yaml
decision:
  cm1952_preflight_consumed: true
  source_contract_added: true
  targeted_tests_added: true
  targeted_tests_passed: true
  request_body_boundary_contract_locked: true
  concrete_request_body_generated: false
  live_execution_allowed_now: false
  component_action_route_probe_allowed_now: false
  response_body_read_allowed_now: false
  raw_error_payload_read_allowed_now: false
  endpoint_locator_disclosure_allowed_now: false
  read_shape_unlocked: false
  readiness_claimed: false
  next_route: cm1954_component_action_route_probe_exact_approval_request_packet
```

## Next Route

CM-1954 should prepare a non-authorizing exact approval request packet for one
future component/action route-status probe.

The packet should remain non-executing and should request only the narrow
authority needed for a future route-status probe:

```yaml
future_packet_shape:
  purpose: component_action_route_status_probe
  target_reference_name: operator-vcp-toolbox-service-ref
  component: KnowledgeBaseManager
  action: knowledge_base.search
  required_pre_live_contract: CM-1953 VcpNativeComponentActionRequestBodyBoundaryContract
  max_component_action_route_probe_attempts: 1
  max_network_calls: 1
  max_runtime_calls: 1
  max_process_state_inspections: 0
  max_service_start_attempts: 0
  max_service_stop_attempts: 0
  max_service_restart_attempts: 0
  max_listener_recheck_attempts: 0
  request_body_generation: true
  concrete_request_body_output: false
  response_body_byte_budget: 0
  raw_error_payload_budget: 0
  log_read_budget: 0
  read_shape_probe: false
```

CM-1954 must not grant approval, generate an approval line, execute runtime,
generate a concrete request body, read response/raw/log/config/secret/raw memory
material, write memory, or claim readiness.
