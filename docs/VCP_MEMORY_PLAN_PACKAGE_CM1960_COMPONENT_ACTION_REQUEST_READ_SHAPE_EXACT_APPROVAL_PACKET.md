# CM-1960 Component/Action Request/Read-Shape Exact Approval Packet

Status: `COMPLETED_VALIDATED_COMPONENT_ACTION_REQUEST_READ_SHAPE_EXACT_APPROVAL_PACKET_NON_AUTHORIZING_NO_APPROVAL_LINE_NO_LIVE`

Date: 2026-07-05

## Scope

CM-1960 prepares a non-authorizing exact approval packet shape for one future
component/action request/read-shape probe after CM-1959 locked the local
request/read-shape preparation contract.

This packet is not authorization. It does not grant approval, generate an
approval line, generate a concrete request body, serialize or submit a request
payload, execute runtime, call VCPToolBox, retry CM-1956, inspect process
state, start runtime, stop runtime, restart runtime, recheck listener
reachability, resolve or disclose an endpoint or locator value, read
config/env, read secrets, read logs, read stdout/stderr, read response bodies,
read raw error material, inspect response shape, read memory, write memory,
change configuration, change startup/watchdog state, expand public MCP, push,
release, deploy, cut over, claim readiness, or prove read shape.

## Current Evidence Boundary

CM-1960 consumes only low-disclosure CM-1959 evidence:

```yaml
current_evidence:
  source_contract_task: CM-1959
  source_preflight_task: CM-1958
  source_route_decision_task: CM-1957
  source_route_receipt_task: CM-1956
  target_reference_name: operator-vcp-toolbox-service-ref
  component: KnowledgeBaseManager
  action: knowledge_base.search
  request_body_shape_category: minimal_component_action_route_status_payload_category_only
  component_action_route_probe_category: route_status_known
  route_status_category: status_only_known
  status_class: client_error
  request_body_generated_by_prior_probe: true
  concrete_request_body_output: false
  request_body_persisted: false
  response_body_read: false
  raw_error_payload_read: false
  response_shape_known: false
  endpoint_disclosed: false
  locator_value_disclosed: false
  memory_read: false
  memory_written: false
  retry_allowed: false
  action_success_proven: false
  read_shape_unlocked: false
  readiness_claimed: false
```

These facts do not prove that `knowledge_base.search` succeeded. They do not
diagnose the `client_error`, prove response shape, prove memory read behavior,
or unlock trusted-full-read workflow.

## Packet State

```yaml
packet_state:
  packet_id: cm1960_component_action_request_read_shape_exact_approval_packet
  purpose: component_action_request_read_shape_probe
  packet_authorizes_execution: false
  approval_granted: false
  approval_line_present: false
  approval_line_generated: false
  approval_line_value_disclosed: false
  approval_request_submitted: false
  concrete_request_body_generated_now: false
  concrete_request_body_output_allowed: false
  request_body_persistence_allowed: false
  live_execution_allowed_now: false
  response_body_read_allowed_now: false
  raw_error_payload_read_allowed_now: false
  response_shape_inspection_allowed_now: false
  memory_read_allowed_now: false
  memory_write_allowed: false
  durable_write_allowed: false
  provider_api_call_allowed: false
  public_mcp_expansion_allowed: false
  readiness_claim_allowed: false
  exact_fields_complete: false
```

The packet is preparation material only. It cannot be pasted or treated as
Jenn approval.

## Required Future Exact Approval Fields

A future approval must be current, exact, and narrower than or equal to this
packet. Missing, stale, inferred, broad, or mismatched approval is invalid.

| Field | Current CM-1960 state | Future approval requirement |
|---|---|---|
| `purpose` | `component_action_request_read_shape_probe` | exact same purpose or narrower |
| `target_reference_name` | `operator-vcp-toolbox-service-ref` | safe reference name only |
| `component` | `KnowledgeBaseManager` | exact component |
| `action` | `knowledge_base.search` | exact action |
| `required_pre_live_contract` | `CM-1959` | `VcpNativeComponentActionRequestReadShapePreparationContract` accepted |
| `prior_status_class` | `client_error` | status-only prior evidence; not success |
| `request_body_shape_category` | `minimal_component_action_route_status_payload_category_only` | category only |
| `exact_query_or_query_category` | `EXACT_REQUIRED_FROM_JENN` | exact bounded query or exact query category supplied by Jenn |
| `max_component_action_request_read_shape_attempts` | `1` | exact integer no greater than one |
| `max_network_calls` | `1` | exact integer no greater than one |
| `max_runtime_calls` | `1` | exact integer no greater than one |
| `max_result_count` | `1` | exact integer no greater than one |
| `max_process_state_inspections` | `0` | must remain zero |
| `max_service_start_stop_restart_attempts` | `0` | must remain zero |
| `max_listener_recheck_attempts` | `0` | must remain zero |
| `response_body_handling` | `EXACT_REQUIRED_FROM_JENN` | in-memory shape projection only, no raw output or persistence |
| `response_shape_projection` | `metadata/category only` | exact low-disclosure projection fields |
| `field_name_disclosure_policy` | `EXACT_REQUIRED_FROM_JENN` | no field names unless Jenn explicitly approves that projection |
| `output_disclosure_limit` | `low_disclosure_shape_metadata_only` | no raw private output |
| `zero_write_rule` | `true` | memory and durable writes remain forbidden |
| `broad_scan_allowed` | `false` | broad scan forbidden |
| `provider_api_allowed` | `false` | provider/API calls forbidden |
| `public_mcp_expansion_allowed` | `false` | public MCP expansion forbidden |
| `release_deploy_cutover_push` | `false` | release/deploy/cutover/push forbidden |
| `readiness_claim` | `false` | no readiness, `RC_READY`, complete V8, or full bridge claim |

## Future Action Boundary

If Jenn later provides exact approval, the future action may only attempt a
single bounded component/action request/read-shape probe. The future harness may
generate a request body in memory only when the exact approval explicitly says
so, but it must not print, persist, or disclose the concrete request body.

The only future response handling allowed by this packet is shape projection:

```yaml
future_shape_projection_boundary:
  response_body_may_be_consumed_in_memory_by_harness_only_for_shape_projection: true
  raw_response_body_printed: false
  raw_response_body_persisted: false
  raw_error_payload_printed: false
  raw_error_payload_persisted: false
  private_memory_content_disclosed: false
  memory_ids_disclosed: false
  endpoint_or_locator_disclosed: false
  config_env_secret_disclosed: false
  logs_stdout_stderr_disclosed: false
  approval_line_disclosed: false
  allowed_projection_candidates:
    - statusClass
    - routeStatusCategory
    - componentActionRequestReadShapeProbeCategory
    - responseShapeCategory
    - topLevelKindCategory
    - itemCountBucket
    - fieldNameDisclosurePolicy
    - memoryContentDisclosed=false
    - rawResponseBodyPersisted=false
    - rawErrorPayloadPersisted=false
```

If deriving the projection would require printing or persisting raw values, raw
memory content, memory IDs, endpoint/locator values, config/env/secret
material, logs, stdout/stderr, provider payloads, or approval-line material,
the future attempt must abort with a low-disclosure receipt.

## Required Future Receipt Projection

Any future exact-approved attempt may record only category, boolean, budget, and
bucket evidence:

```yaml
future_receipt_allowed:
  - targetReferenceName
  - purpose
  - component
  - action
  - requestBodyShapeCategory
  - componentActionRequestReadShapeProbeCategory
  - routeStatusCategory
  - statusClass
  - responseShapeCategory
  - topLevelKindCategory
  - itemCountBucket
  - fieldNameDisclosurePolicy
  - durationBucket
  - zeroWriteCounters
  - requestBodyGeneratedByHarness
  - concreteRequestBodyOutput=false
  - requestBodyPersisted=false
  - responseBodyConsumedForShapeProjection
  - rawResponseBodyPrinted=false
  - rawResponseBodyPersisted=false
  - rawErrorPayloadPrinted=false
  - rawErrorPayloadPersisted=false
  - endpointDisclosed=false
  - locatorValueDisclosed=false
  - configEnvRead=false
  - secretRead=false
  - logRead=false
  - stdoutStderrRead=false
  - memoryWritten=false
  - readShapeUnlocked
  - readinessClaimed=false
```

Allowed bucket vocabulary:

```yaml
componentActionRequestReadShapeProbeCategory:
  - not_attempted
  - shape_projected
  - status_only_known
  - client_error_status_only
  - request_body_shape_rejected
  - response_shape_projection_blocked
  - boundary_blocked
  - transport_error
  - unknown
responseShapeCategory:
  - unknown
  - object_shape_metadata_only
  - array_shape_metadata_only
  - scalar_shape_metadata_only
  - empty_result_shape
  - blocked_before_shape_projection
  - non_json_or_unprojectable
topLevelKindCategory:
  - unknown
  - object
  - array
  - string
  - number
  - boolean
  - null
  - non_json
itemCountBucket:
  - zero
  - one
  - more_than_one_abort
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
concrete request bodies, query text, private memory content, memory IDs,
approval lines, or readiness claims.

## Stop Conditions

Stop before execution or abort during a future approved attempt if:

- Jenn's current exact approval is missing, stale, broad, ambiguous, or
  mismatched;
- CM-1959 contract evidence is missing, stale, or contradicted;
- target reference, component, action, request-body category, query boundary,
  output projection, result budget, runtime-call budget, network-call budget, or
  abort rule is missing or ambiguous;
- the action would retry CM-1956 outside the new exact boundary;
- the action would diagnose `client_error` by reading raw response or raw error
  material;
- a concrete request body would be printed, persisted, or disclosed;
- raw response, raw error, private memory text, memory IDs, endpoint/locator,
  config/env/secret, logs, stdout/stderr, provider payload, or approval-line
  material would be printed or persisted;
- result count exceeds the approved budget;
- broad scan, cross-client leakage, visibility expansion, provider/API call,
  memory write, durable write, public MCP expansion, runtime/config/startup or
  watchdog mutation, dependency change, release, deploy, cutover, push,
  readiness, `RC_READY`, complete V8, or full bridge completion is requested.

## Decision

```yaml
decision:
  cm1959_contract_present: true
  cm1959_contract_required: true
  request_read_shape_packet_prepared: true
  packet_authorizes_execution: false
  approval_granted: false
  approval_line_generated: false
  concrete_request_body_generated: false
  concrete_request_body_output: false
  live_execution_allowed: false
  response_body_read_allowed_now: false
  response_shape_inspection_allowed_now: false
  memory_read_allowed_now: false
  memory_write_allowed_now: false
  read_shape_unlocked: false
  readiness_claimed: false
  next_route: cm1961_exact_approval_request_readiness_review_jenn_boundary_display
```

## Validation Boundary

CM-1960 validation is docs/status/governance only:

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
CM-1961 exact approval request readiness review / Jenn boundary display
```

CM-1961 must remain non-authorizing and no-live. It may review this packet for
Jenn boundary display, but it must not generate an approval line, generate or
persist a concrete request body, execute runtime, call VCPToolBox, read
response bodies, inspect response shape, read memory, write memory, or claim
readiness.
