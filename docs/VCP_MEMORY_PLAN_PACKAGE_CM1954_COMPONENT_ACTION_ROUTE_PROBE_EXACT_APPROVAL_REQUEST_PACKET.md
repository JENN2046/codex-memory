# CM-1954 Component/Action Route Probe Exact Approval Request Packet

Status: `COMPLETED_VALIDATED_COMPONENT_ACTION_ROUTE_PROBE_EXACT_APPROVAL_REQUEST_PACKET_NON_AUTHORIZING_NO_APPROVAL_LINE`

Date: 2026-07-05

## Scope

CM-1954 prepares a non-authorizing exact approval request packet for one future
component/action route-status probe after CM-1953 locked the local
request-body boundary contract.

This packet is not authorization. It does not grant approval, generate an
approval line, generate a concrete request body, serialize a request payload,
submit a request body, execute runtime, call VCPToolBox, inspect process state,
start runtime, stop runtime, restart runtime, recheck listener reachability,
resolve or disclose an endpoint or locator value, read config/env, read
secrets, read logs, read stdout/stderr, read response bodies, read raw error
material, read raw memory, write memory, change configuration, change
startup/watchdog state, expand public MCP, push, release, deploy, cut over,
claim readiness, or enter read-shape proof.

## Approval Request Boundary

Jenn exact approval is required before any future component/action route-status
probe execution.

```yaml
approval_request:
  purpose: component_action_route_status_probe
  target_reference_name: operator-vcp-toolbox-service-ref
  component: KnowledgeBaseManager
  action: knowledge_base.search
  diagnostic_lanes:
    - target_safe_reference_binding
    - component_action_identifier_binding
    - request_body_shape_boundary
    - component_action_route_status_probe
    - route_outcome_receipt
    - read_shape_separation
    - component_action_request_body_boundary_contract
  required_pre_live_contract:
    task: CM-1953
    contract: VcpNativeComponentActionRequestBodyBoundaryContract
    request_body_boundary_contract_locked: true
    request_body_shape_category: minimal_component_action_route_status_payload_category_only
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
  request_body_persistence: false
  response_body_byte_budget: 0
  raw_error_payload_budget: 0
  log_read_budget: 0
  stdout_stderr_read: false
  config_env_read: false
  secret_read: false
  memory_read: false
  memory_write: false
  durable_write: false
  endpoint_disclosure: false
  locator_value_disclosure: false
  provider_api_call: false
  public_mcp_expansion: false
  config_startup_watchdog_change: false
  dependency_change: false
  release_deploy_cutover_push: false
  readiness_claim: false
  read_shape_probe: false
  output_projection:
    - targetReferenceName
    - purpose
    - component
    - action
    - requestBodyShapeCategory
    - componentActionRouteProbeCategory
    - routeStatusCategory
    - targetSafeReferenceBindingCategory
    - transportWrapperShapeCategory
    - statusClass
    - durationBucket
    - zeroWriteCounters
    - requestBodyGenerated=true
    - concreteRequestBodyOutput=false
    - requestBodyPersisted=false
    - responseBodyRead=false
    - rawErrorPayloadRead=false
    - endpointDisclosed=false
    - locatorValueDisclosed=false
    - configEnvRead=false
    - secretRead=false
    - logRead=false
    - stdoutStderrRead=false
    - memoryRead=false
    - memoryWritten=false
    - readShapeUnlocked=false
    - readinessClaimed=false
```

The target remains a safe reference name only. CM-1954 does not resolve the
reference to a locator, disclose endpoint URL, read config/env, or prove the
target is reachable.

## Request Body Boundary Meaning

The future approval request includes `request_body_generation: true` only
because CM-1950 proved that a no-body/no-request component/action status probe
is boundary-blocked by the route. It does not authorize this task to create a
concrete request body.

The only allowed future request-body evidence is category-level:

```yaml
request_body_boundary:
  requestBodyShapeCategory: minimal_component_action_route_status_payload_category_only
  concreteRequestBodyOutput: false
  requestBodyPersisted: false
  queryTextDisclosed: false
  memoryContentDisclosed: false
  providerPayloadDisclosed: false
  endpointOrLocatorDisclosed: false
```

## Required Jenn Exact Approval Fields

A future approval must explicitly cover:

- `purpose=component_action_route_status_probe`
- target reference name
- component/action identifiers
- diagnostic lanes
- CM-1953 component/action request-body boundary contract as a required pre-live boundary
- request-body shape category only
- max component/action route probe attempt count
- max network call count
- max runtime call count
- zero process-state inspection count
- zero service-start, service-stop, service-restart, and listener-recheck counts
- request-body generation allowed only inside the approved route probe
- no concrete request-body output, persistence, or disclosure
- zero response-body budget
- zero raw-error budget
- zero log-read budget
- no stdout/stderr read
- no config/env read
- no secret read
- no memory read
- no memory write
- no durable write
- no endpoint disclosure
- no locator value disclosure
- no provider/API call
- no public MCP expansion
- no config/startup/watchdog mutation
- no dependency change
- no read-shape probe
- allowed output projection
- stop conditions

Jenn approval must be current, exact, and narrower than or equal to this packet.
A broad approval, stale approval, inferred approval, or approval that adds
read-shape, memory read, memory write, runtime expansion, endpoint disclosure,
or raw output authority is not valid for the future live attempt.

## Forbidden Under This Packet

This request packet does not permit:

- route-status probe execution without a later exact approval
- read-shape proof
- concrete request body output, persistence, or disclosure
- response body read or persistence
- raw error read or persistence
- endpoint URL disclosure
- locator value disclosure
- config/env path or value read
- secret, token, credential, key, or auth material read
- runtime logs, stdout, stderr, or process output read
- process-state inspection
- service start, stop, restart, or listener recheck
- raw memory, private memory content, raw store, or raw audit row read
- approval line generation, exposure, storage, or submission
- memory read
- memory write
- durable write
- provider/API call
- public MCP expansion
- runtime binding mutation
- config, startup, or watchdog persistence
- package or dependency change
- release, deploy, cutover, push, or readiness claim

## Allowed Future Receipt Projection

If Jenn later approves a future component/action route-status probe, the
execution receipt may record only:

```yaml
future_receipt_allowed:
  - targetReferenceName
  - purpose
  - component
  - action
  - requestBodyShapeCategory
  - componentActionRouteProbeCategory
  - routeStatusCategory
  - targetSafeReferenceBindingCategory
  - transportWrapperShapeCategory
  - statusClass
  - durationBucket
  - zeroWriteCounters
  - requestBodyGenerated=true
  - concreteRequestBodyOutput=false
  - requestBodyPersisted=false
  - responseBodyRead=false
  - rawErrorPayloadRead=false
  - endpointDisclosed=false
  - locatorValueDisclosed=false
  - configEnvRead=false
  - secretRead=false
  - logRead=false
  - stdoutStderrRead=false
  - memoryRead=false
  - memoryWritten=false
  - readShapeUnlocked=false
  - readinessClaimed=false
```

Allowed bucket vocabulary:

```yaml
componentActionRouteProbeCategory:
  - not_attempted
  - route_status_known
  - route_not_found
  - request_body_shape_rejected
  - boundary_blocked
  - transport_error
  - unknown
routeStatusCategory:
  - unknown
  - status_only_known
  - blocked_before_route
  - route_not_found
  - request_body_shape_rejected
  - request_body_required_boundary_blocked
  - transport_error
targetSafeReferenceBindingCategory:
  - reference_name_only
  - listener_level_reachable_reference_only
  - safe_reference_binding_category_only
transportWrapperShapeCategory:
  - component_action_route_status_transport_category_only
  - category_only
  - unknown
statusClass:
  - success
  - client_error
  - server_error
  - transport_error
  - boundary_blocked
  - unknown
durationBucket:
  - lt_100ms
  - lt_1s
  - lt_5s
  - ge_5s
  - unknown
```

The receipt must not include endpoint URLs, locator values, config paths or
values, env values, logs, stdout, stderr, response bodies, raw error material,
provider payloads, tokens, secrets, raw memory, raw stores, raw audit rows,
concrete request bodies, approval lines, or read-shape details.

## Decision

```yaml
decision:
  cm1953_contract_present: true
  cm1953_contract_required: true
  request_packet_prepared: true
  packet_authorizes_execution: false
  approval_granted: false
  approval_line_generated: false
  concrete_request_body_generated: false
  concrete_request_body_output: false
  live_execution_allowed: false
  component_action_route_probe_allowed_now: false
  response_body_read_allowed_now: false
  raw_error_read_allowed_now: false
  read_shape_unlocked: false
  readiness_claimed: false
  next_route: cm1955_exact_approval_request_readiness_review_jenn_boundary_display
```

## Validation Boundary

CM-1954 validation is docs/status/governance only:

- docs/status review
- `git diff --check`
- `bash scripts/validate-local.sh docs`
- `.agent_board/CURRENT_FACTS.json` parse
- current-facts drift validation
- autopilot ledger consistency validation
- targeted endpoint/locator/approval-line/secret/raw-output/readiness scan over changed files
- changed-scope re-review

## Next Route

Next route:

```text
CM-1955 exact approval request readiness review / Jenn boundary display
```

CM-1955 must remain non-authorizing and no-live. It may display the exact
boundary Jenn would need to approve, but it must not generate an approval line,
create a concrete request body, execute runtime, call VCPToolBox, inspect
response shape, or unlock read-shape proof.
