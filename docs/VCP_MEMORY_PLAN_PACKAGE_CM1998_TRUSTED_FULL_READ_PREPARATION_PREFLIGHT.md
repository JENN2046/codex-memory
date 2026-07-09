# CM-1998 Trusted-Full-Read Preparation Preflight

Task id: `CM-1998`
Validation id: `CMV-2100`
Date: 2026-07-07
Evidence type: `docs-status-governance`, `trusted-full-read-preflight`,
`non-authorizing`, `no-live`, `no-readiness`

## Purpose

CM-1998 prepares the next trusted-full-read boundary after CM-1997. It is
local and non-authorizing. It defines what a future trusted-full-read request
would need to prove, what prior evidence may be accepted, what must remain
blocked, and what low-disclosure receipt shape is allowed.

CM-1998 does not reuse the CM-1994 approval, retry CM-1996, generate or
persist an approval line, generate or persist a request body, bind target
material, resolve endpoint or locator values, call runtime, call VCPToolBox,
inspect process state, recheck listeners, start/stop/restart services, consume
responses, read raw response or error payloads, read logs, read secrets, read
private memory, call MCP memory tools, write memory, mutate durable state,
expand public MCP, push, tag, release, deploy, cut over, unlock M15/RC, or
claim readiness.

## Accepted Source Evidence

CM-1998 accepts these committed evidence records only as preparation inputs:

- CM-1811 through CM-1813 record the older M8 trusted-full-read workflow
  harness boundary, low-disclosure receipt, and closeout. That chain remains
  historical local disposable target evidence, not current authority for a new
  live run.
- CM-1959 through CM-1964 define local component/action request/read-shape
  preparation, resolver/transport boundary, and executor behavior.
- CM-1981 and CM-1982 prove only the fixture-backed injected-transport
  read-shape route.
- CM-1994 through CM-1997 prove only the exact-approved temp-local disposable
  material request/read-shape route and close it as not trusted-full-read.
- CM-1996 low-disclosure shape evidence remains scoped to:
  `statusClass=success`, `responseShapeCategory=array_item_count_bucket_only`,
  `topLevelKindCategory=array`, `itemCountBucket=zero`,
  `durationBucket=lt_100ms`, and `readShapeUnlocked=true`.

Accepted source evidence does not create fresh execution authority. It does
not prove live VCPToolBox target binding, existing operator target reuse,
endpoint/locator values, real private memory read, trusted-full-read
completion, M15 opening, RC readiness, release/deploy/cutover readiness,
`RC_READY`, complete V8, or full bridge completion.

## Prepared Future Boundary

Any future trusted-full-read attempt must be requested under a separate
current exact approval. CM-1998 prepares only this boundary shape:

```yaml
cm1998_trusted_full_read_preparation_preflight:
  boundary_id: cm1998_trusted_full_read_preparation_preflight
  profile: trusted-full-read
  authorization_state: not_authorized_by_cm1998
  execution_state: not_executed_by_cm1998
  accepted_prior_evidence:
    cm1811_cm1813_historical_m8_workflow: planning_input_only
    cm1959_cm1964_request_read_shape_chain: local_contract_input_only
    cm1981_cm1982_fixture_read_shape: fixture_backed_only
    cm1994_cm1997_temp_local_read_shape: temp_local_disposable_material_only
  future_exact_approval_required: true
  fresh_approval_must_not_reuse_cm1994: true
  future_target_requirement:
    target_material_required: true
    target_material_must_be_separately_evidenced: true
    target_material_must_be_target_scoped: true
    existing_operator_target_reuse_allowed: false
    non_target_workspace_access_allowed: false
    private_or_production_or_customer_material_allowed: false
    real_private_memory_material_allowed_as_target: false
    persistent_runtime_artifact_allowed: false
  future_request_boundary:
    approval_line_generation_allowed_now: false
    request_body_generation_allowed_now: false
    request_body_output_or_persistence_allowed_now: false
    request_submission_allowed_now: false
    endpoint_locator_resolution_allowed_now: false
    runtime_or_network_call_allowed_now: false
    vcp_toolbox_call_allowed_now: false
    response_consumption_allowed_now: false
    memory_read_by_agent_allowed_now: false
    mcp_memory_tool_call_allowed_now: false
    memory_write_allowed_now: false
    durable_mutation_allowed_now: false
  future_low_disclosure_receipt_projection:
    allowed:
      - task_id
      - boundary_id
      - profile
      - status_class
      - route_status_category
      - response_shape_category
      - top_level_kind_category
      - item_count_bucket
      - duration_bucket
      - read_shape_unlocked_boolean
      - raw_output_persisted_boolean
      - write_mutation_counters
      - readiness_claimed_boolean
      - next_action
    forbidden:
      - approval_line_value
      - endpoint_or_locator_value
      - concrete_request_body
      - raw_response_body
      - raw_error_payload
      - raw_log_or_stdout_stderr
      - secret_or_env_value
      - private_memory_content
      - memory_id
      - raw_store_or_raw_audit_row
      - provider_payload
      - raw_target_material_value
  cm1998_side_effect_counters:
    approval_reused: 0
    approval_line_generated: 0
    request_bodies_generated: 0
    request_bodies_submitted: 0
    endpoint_locator_disclosures: 0
    runtime_calls: 0
    network_calls: 0
    vcp_toolbox_calls: 0
    process_listener_service_actions: 0
    response_bodies_consumed: 0
    mcp_memory_tool_calls: 0
    memory_reads: 0
    memory_writes: 0
    durable_writes: 0
    provider_api_calls: 0
    dependency_changes: 0
    public_mcp_expansions: 0
    pushes_tags_releases_deploys_cutovers: 0
    readiness_claims: 0
```

## Stop Conditions

Future trusted-full-read work must stop before execution if any of these are
true:

- the request tries to reuse CM-1994 or CM-1996 authority;
- the request needs an approval line, request body, endpoint, locator, target
  material value, response body, raw error, log, secret, private memory,
  memory id, raw store row, raw audit row, or provider payload to be printed or
  persisted;
- the future target is an existing operator target, non-target workspace,
  production system, customer data surface, real private memory source, or
  persistent runtime artifact;
- the future proof needs runtime, network, VCPToolBox, process/listener/service
  action, response consumption, or memory read before a fresh exact approval;
- the future proof requires memory write/update/supersede/tombstone, durable
  mutation, provider/API call, dependency change, public MCP expansion, VCPToolBox
  core modification, push, tag, release, deploy, or cutover;
- the result would imply M15/RC unlock, readiness, `RC_READY`, complete V8, or
  full bridge completion from preparation evidence alone.

## Prepared Decision

Decision:

```text
trusted_full_read_preparation_preflight_completed_no_authority_no_live
```

CM-1998 prepares the future exact boundary but does not make the boundary
executable. The next safe route is a non-authorizing exact approval request
readiness review / Jenn boundary display for trusted-full-read, unless Jenn
instead supplies a fresh current exact approval with separately evidenced
target-scoped disposable material matching this preflight. Even then, execution
must remain blocked until the approval, target material evidence, and
low-disclosure output policy are revalidated against the future boundary.

## Non-Actions

CM-1998 performed no:

- CM-1996 retry;
- CM-1994 approval reuse;
- approval line generation;
- request body generation, output, persistence, or submission;
- target material binding;
- runtime, network, VCPToolBox, process, listener, service start, service stop,
  or service restart action;
- endpoint or locator disclosure;
- config, env, secret, log, stdout, stderr, raw response, raw error, raw
  memory, raw store, raw audit, private memory, memory-id, or raw target
  material read;
- MCP memory tool call;
- memory read or write;
- durable mutation;
- provider/API call;
- dependency change;
- public MCP expansion;
- VCPToolBox core modification;
- push, tag, release, deploy, or cutover;
- M15 unlock, RC gate unlock, readiness claim, `RC_READY` claim, complete V8
  claim, or full bridge completion claim.

## Status

```text
COMPLETED_VALIDATED_TRUSTED_FULL_READ_PREPARATION_PREFLIGHT_NON_AUTHORIZING_NO_LIVE_NO_READINESS
```
