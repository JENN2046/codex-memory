# CM-1952 Component/Action Request-Body Boundary Preflight

## Purpose

CM-1952 defines the non-live request-body boundary needed after CM-1951
confirmed that CM-1950 stopped at `request_body_required_boundary_blocked`.

CM-1952 does not generate a request body. It does not bind concrete endpoint,
locator, config, auth, memory, provider, payload, or response values. It does
not perform runtime, network, process, listener, memory, provider, release, or
readiness actions.

## Inputs

```yaml
inputs:
  source_route: CM-1951
  prior_receipt: CM-1950
  targetReferenceName: operator-vcp-toolbox-service-ref
  component: KnowledgeBaseManager
  action: knowledge_base.search
  prior_status_category: component_action_status_probe_boundary_blocked
  prior_route_status_category: request_body_required_boundary_blocked
  read_shape_unlocked: false
  retry_allowed: false
```

## Preflight Lanes

```yaml
preflight_lanes:
  request_body_shape_boundary:
    question: what request-body class would be needed to ask only whether the component/action route exists?
    current_status: category_only_defined
    allowed_now:
      - requestBodyShapeCategory
      - requiredFieldCategory
      - forbiddenValuePolicy
      - no concrete payload values
    forbidden_now:
      - generated request body
      - serialized payload
      - query text
      - memory content
      - auth material
      - provider payload
      - endpoint or locator value

  component_action_route_probe_boundary:
    question: what future probe could test route status without reading response body or read-shape?
    current_status: not_authorized
    future_exact_approval_required: true
    future_budget_upper_bound:
      max_component_action_route_probe_attempts: 1
      max_network_calls: 1
      max_runtime_calls: 1
      max_process_state_inspections: 0
      max_service_start_attempts: 0
      max_service_stop_attempts: 0
      max_service_restart_attempts: 0
      max_listener_recheck_attempts: 0
      response_body_byte_budget: 0
      raw_error_payload_budget: 0
      log_read_budget: 0

  output_projection_boundary:
    question: what may be recorded after a future route-status probe?
    current_status: category_only
    allowed_future_projection:
      - targetReferenceName
      - component
      - action
      - purpose
      - requestBodyShapeCategory
      - componentActionRouteProbeCategory
      - routeStatusCategory
      - statusClass
      - durationBucket
      - zeroWriteCounters
      - requestBodyGenerated=true_or_false
      - responseBodyRead=false
      - rawErrorPayloadRead=false
      - readShapeUnlocked=false
      - readinessClaimed=false
    forbidden_future_projection:
      - concrete request body
      - raw response body
      - raw error payload
      - response shape keys
      - memory IDs
      - raw memory text
      - endpoint URL
      - locator value
      - config/env
      - token or secret
      - logs/stdout/stderr
      - provider payload
      - approval line

  read_shape_separation:
    question: does a route-status probe unlock read-shape?
    current_status: locked
    route_probe_may_read_shape: false
    route_probe_may_read_memory_content: false
    separate_exact_approval_required_for_read_shape: true
```

## Request-Body Shape Category

CM-1952 defines only this category:

```yaml
request_body_shape_category:
  name: minimal_component_action_route_status_payload_category_only
  concrete_payload_generated: false
  serialized_payload_available: false
  query_text_bound: false
  memory_content_bound: false
  provider_payload_bound: false
  endpoint_or_locator_bound: false
```

This category is not executable. It is only the boundary label for a future
contract and a future exact approval request.

## Decision

```yaml
decision:
  cm1951_route_consumed: true
  request_body_boundary_preflight_defined: true
  concrete_request_body_generated: false
  component_action_route_probe_authorized_now: false
  live_execution_allowed_now: false
  response_body_read_allowed_now: false
  raw_error_payload_read_allowed_now: false
  read_shape_unlocked: false
  readiness_claimed: false
  next_route: cm1953_low_disclosure_component_action_request_body_boundary_contract
```

## CM-1953 Expected Contract

CM-1953 should turn this preflight into a local source/test/docs contract.

The contract should accept only:

- safe target reference name
- safe component/action identifiers
- category-only request-body shape boundary
- future single-attempt route probe budget
- zero response/raw/log/config/secret/memory/write/readiness counters
- read-shape separation

The contract should reject:

- concrete request body values
- serialized payloads
- query text
- endpoint or locator values
- config/env/secrets
- logs/stdout/stderr
- raw response or raw error payloads
- memory IDs or raw memory text
- provider payloads
- approval lines
- live execution claims
- read-shape claims
- readiness claims

## Stop Conditions

Stop before any future action that would:

- retry CM-1950
- execute live/network/runtime
- generate, serialize, print, store, or submit a concrete request body
- read response body or raw error payload
- inspect response shape
- disclose endpoint or locator values
- read config/env/secrets/logs/stdout/stderr/raw memory/raw stores/raw audit
  rows
- write memory or durable state
- change runtime/config/startup/watchdog/dependencies
- expand public MCP tools or schemas
- push, tag, release, deploy, or cut over
- claim readiness, `RC_READY`, complete V8, or full bridge completion
- enter read-shape proof
