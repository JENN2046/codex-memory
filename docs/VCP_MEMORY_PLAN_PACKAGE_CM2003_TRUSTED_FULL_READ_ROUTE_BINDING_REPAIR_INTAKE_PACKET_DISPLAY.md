# CM-2003 Trusted-Full-Read Route-Binding / Repair Intake Packet Display

Task id: `CM-2003`
Validation id: `CMV-2105`
Date: 2026-07-08
Evidence type: `docs-status-governance`, `route-binding-repair-intake-packet`,
`jenn-packet-display`, `trusted-full-read`, `non-authorizing`, `no-repair`,
`no-live`, `no-readiness`

## Purpose

CM-2003 consumes CM-2002 and prepares the fresh exact route-binding/repair
intake packet Jenn can supply in a future turn. It matches CM-2002 by selecting
the bounded local source/test repair window rather than a concrete existing
route, because CM-2001/CM-2002 recorded that no CM-2001-capable bounded
trusted-full-read executor is currently available without source repair or
route rebinding.

This is a packet display only. It is not Jenn approval, not approval intake,
not route binding, not source/test repair, not request-body generation, not
target material binding, not runtime execution, and not a trusted-full-read
attempt.

CM-2003 does not reuse CM-1994, CM-1996, CM-2001, or CM-2002 authority; does
not consume the CM-2001 approved attempt; does not grant approval; does not
bind a route; does not edit source/tests; does not generate or submit request
bodies; does not bind target material; does not resolve or disclose endpoints
or locators; does not call runtime, network, VCPToolBox, or MCP memory tools;
does not read or write memory; does not mutate durable state; does not expand
public MCP; does not push, tag, release, deploy, cut over, unlock M15/RC, or
claim readiness.

## Intake Classification

Jenn's current turn identifies the next step as:

```text
CM-2003 fresh exact route-binding/repair intake packet, matching CM-2002
```

The turn is accepted as authorization to prepare this non-authorizing packet
display. It is not accepted as a bindable repair approval because it does not
itself provide the complete fresh/current/single-use/exact packet and does not
explicitly grant a bounded source/test repair attempt.

```yaml
cm2003_current_turn_classification:
  current_turn_requests_packet_display: true
  current_turn_is_bindable_exact_repair_approval: false
  current_turn_is_bindable_route_binding_approval: false
  current_turn_authorizes_source_test_repair_now: false
  current_turn_authorizes_trusted_full_read_execution_now: false
```

## Recommended Jenn Packet Draft

The following packet is the recommended complete packet for Jenn to send in a
future current turn if she wants Codex to attempt the bounded local
source/test repair. It is not active until Jenn supplies it as her own fresh
current exact approval.

```text
Approval:
  I provide fresh current single-use exact approval for Codex to run the CM-2004
  trusted-full-read route-binding/repair intake gate for the CM-2003 packet and,
  only if that gate passes, one bounded local source/test repair attempt to
  create or bind a CM-2001-capable trusted-full-read executor/wrapper.

  Single-use boundary:
  - approval_scope: CM-2004 bounded local source/test repair intake and one
    repair attempt only
  - source_packet: CM-2003 trusted-full-read route-binding/repair intake packet
    display
  - profile: trusted-full-read
  - selected_route_option: bounded local source/test repair window
  - single_use: true
  - approval_reuse_allowed: false
  - reuse_cm1994_cm1996_cm2001_or_cm2002_authority: false
  - max_source_files_changed_for_repair: 2
  - max_test_files_changed_for_repair: 2
  - docs_status_updates_allowed: true
  - max_trusted_full_read_execution_attempts: 0
  - max_runtime_calls_during_repair: 0
  - max_network_calls_during_repair: 0
  - max_vcp_toolbox_calls_during_repair: 0
  - max_mcp_memory_tool_calls: 0
  - max_memory_reads: 0
  - max_memory_writes: 0
  - max_durable_writes: 0

  Target material continuity:
  - target_material_category: target-scoped synthetic empty disposable material
  - prior_evidence_id: CM-2001-JENN-SYNTHETIC-EMPTY-DISPOSABLE-TARGET-20260707
  - target_material_binding_allowed_during_repair: false
  - raw_target_material_output_allowed: false
  - existing_operator_target_reuse_allowed: false
  - non_target_workspace_access_allowed: false
  - private_or_production_or_customer_material_allowed: false
  - real_private_memory_material_allowed_as_target: false
  - persistent_runtime_artifact_allowed: false

  Repair authority:
  - local_source_test_repair_allowed: true
  - allowed_repair_goal: create or bind a CM-2001-capable bounded
    trusted-full-read executor/wrapper that preserves CM-2002 limits
  - allowed_source_scope: src/core and directly related adapter/contract code
    only if needed
  - allowed_test_scope: directly related targeted tests only
  - dependency_changes_allowed: false
  - public_mcp_expansion_allowed: false
  - vcp_toolbox_core_modification_allowed: false
  - startup_watchdog_config_change_allowed: false
  - endpoint_or_locator_resolution_allowed: false
  - endpoint_or_locator_disclosure_allowed: false
  - secret_or_env_content_read_allowed: false
  - data_or_raw_memory_store_access_allowed: false
  - raw_log_or_jsonl_read_allowed: false
  - runtime_network_vcp_toolbox_call_allowed_during_repair: false
  - provider_api_calls_allowed: false

  Execution boundary:
  - request_body_generation_allowed: false during repair
  - target_material_binding_allowed: false during repair
  - runtime_call_allowed: false during repair
  - trusted_full_read_attempt_allowed: false during repair
  - future_execution_requires_separate_exact_approval: true
  - response_consumption_allowed: false during repair
  - raw_response_output_allowed: false
  - raw_error_output_allowed: false
  - raw_log_output_allowed: false

  Output policy:
  - low_disclosure_receipt_only: true
  - allowed_receipt_fields: task_id, boundary_id, profile, selected_route_option,
    repair_status_category, files_changed_buckets, tests_changed_buckets,
    validation_status_category, route_binding_status_category,
    execution_authorized_boolean, runtime_called_boolean,
    trusted_full_read_attempts_used, raw_output_persisted_boolean,
    write_mutation_counters, readiness_claimed_boolean, next_action
  - forbidden_output: approval_line_value, endpoint_or_locator_value,
    concrete_request_body, raw_response_body, raw_error_payload,
    raw_log_or_stdout_stderr, secret_or_env_value, private_memory_content,
    memory_id, raw_store_or_raw_audit_row, provider_payload,
    raw_target_material_value

  Stop conditions:
  - stop if approval is not accepted as fresh/current/single-use/exact
  - stop if packet does not match CM-2002 and CM-2003
  - stop if a concrete existing route is required instead of bounded repair
  - stop if more than two source files or two test files must change
  - stop if endpoint/locator disclosure is required
  - stop if request-body generation, target binding, runtime, network, or
    VCPToolBox calls are required during repair
  - stop if raw output would need to be printed or persisted
  - stop if any secret/env, data store, raw memory, raw audit, raw log/jsonl,
    private memory, production, customer, persistent runtime, or non-target
    material must be read
  - stop if any write/mutation outside local source/test/docs repair is needed
  - stop if dependency changes, public MCP expansion, VCPToolBox core
    modification, startup/watchdog config changes, provider/API calls, push,
    tag, release, deploy, cutover, M15/RC unlock, RC_READY, complete V8,
    full bridge completion, or readiness claim would be required

  Readiness:
  - readiness_claim_allowed: false
  - rc_ready_claim_allowed: false
  - complete_v8_claim_allowed: false
  - full_bridge_completion_claim_allowed: false
```

## CM-2003 Packet Display Boundary

```yaml
cm2003_trusted_full_read_route_binding_repair_intake_packet_display:
  boundary_id: cm2003_trusted_full_read_route_binding_repair_intake_packet_display
  source_boundary: docs/VCP_MEMORY_PLAN_PACKAGE_CM2002_TRUSTED_FULL_READ_ROUTE_BINDING_REPAIR_BOUNDARY_PREPARATION.md
  profile: trusted-full-read
  packet_display_non_authorizing: true
  selected_recommended_option: bounded_local_source_test_repair_window
  current_turn_bindable_exact_approval: false
  approval_granted_by_cm2003: false
  approval_intake_performed_by_cm2003: false
  approval_line_generated_by_cm2003: false
  route_binding_authorized_by_cm2003: false
  source_repair_authorized_by_cm2003: false
  execution_authorized_by_cm2003: false
  cm2001_approved_attempt_consumed: false
  repair_window_display:
    max_source_files_changed: 2
    max_test_files_changed: 2
    docs_status_updates_allowed: true
    dependency_changes_allowed: false
    public_mcp_expansion_allowed: false
    vcp_toolbox_core_modification_allowed: false
    startup_watchdog_config_change_allowed: false
    secret_or_env_content_read_allowed: false
    data_or_raw_memory_store_access_allowed: false
    raw_log_or_jsonl_read_allowed: false
    runtime_network_vcp_toolbox_call_allowed_during_repair: false
    future_execution_requires_separate_exact_approval: true
  cm2003_side_effect_counters:
    approval_reused: 0
    approval_granted: 0
    approval_intakes_performed: 0
    approval_line_generated: 0
    route_bindings_performed: 0
    source_files_changed_for_repair: 0
    test_files_changed_for_repair: 0
    request_bodies_generated: 0
    request_bodies_submitted: 0
    target_material_bindings: 0
    endpoint_locator_disclosures: 0
    runtime_calls: 0
    network_calls: 0
    vcp_toolbox_calls: 0
    response_bodies_consumed: 0
    mcp_memory_tool_calls: 0
    memory_reads: 0
    memory_writes: 0
    durable_writes: 0
    provider_api_calls: 0
    dependency_changes: 0
    public_mcp_expansions: 0
    vcp_toolbox_core_modifications: 0
    pushes_tags_releases_deploys_cutovers: 0
    readiness_claims: 0
```

## Decision

Decision:

```text
trusted_full_read_route_binding_repair_intake_packet_displayed_non_authorizing
```

CM-2003 displays the recommended fresh exact packet and chooses the bounded
local source/test repair path for a future Jenn approval. It does not accept
that approval now and does not make any route executable. The next route is
CM-2004 exact intake gate only if Jenn supplies the CM-2003 packet as a fresh
current exact approval in a future turn.

## Non-Actions

CM-2003 performed no:

- approval intake, approval grant, or approval acceptance;
- approval line generation, persistence, or submission;
- CM-1994, CM-1996, CM-2001, or CM-2002 authority reuse;
- source/test repair;
- route binding;
- target material binding;
- request body generation, output, persistence, or submission;
- endpoint or locator resolution/disclosure;
- runtime, network, VCPToolBox, process, listener, service start, service
  stop, or service restart action;
- response consumption;
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
COMPLETED_VALIDATED_TRUSTED_FULL_READ_ROUTE_BINDING_REPAIR_INTAKE_PACKET_DISPLAY_NON_AUTHORIZING_NO_REPAIR_NO_LIVE_NO_READINESS
```
