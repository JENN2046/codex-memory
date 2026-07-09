# VCP Memory Trusted-Full-Read CM1811 Workflow Harness Boundary Preflight

Task id: `M8-TRUSTED-FULL-READ-WORKFLOW-HARNESS-BOUNDARY-PREFLIGHT`
Implementation slice: `CM-1811`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_FULL_CM1810_READ_SHAPE_RECEIPT_CLOSEOUT_GATE_REVIEW.md`
Evidence type: `docs-only`, `exact-boundary-preflight`, `no-runtime`,
`no-secret`, `no-memory-write`

## Purpose

CM-1811 defines the exact pre-execution boundary for the first M8
trusted-full-read workflow harness candidate.

It does not start VCPToolBox, call a route, generate or submit live request
bodies, read response bodies, read runtime logs, read `config.env` or `.env`
contents, read secrets, read raw memory or raw stores, call providers/APIs,
call MCP memory tools, write memory, expand public MCP tools, release, deploy,
cut over, push, unlock M9, unlock M15, or claim readiness.

## Boundary Source

| Required input | CM-1811 state |
|---|---|
| Accepted M7 read-shape receipt | `docs/VCP_MEMORY_OBSERVE_FULL_CM1810_READ_SHAPE_RECEIPT_CLOSEOUT_GATE_REVIEW.md` |
| Target binding evidence | CM-1806 `/v1/human/tool` status `http_2xx` and CM-1809 read-shape status `http_2xx` |
| Selected component | `DailyNoteSearcher` |
| Selected action | `SearchDailyNote` |
| Route | `/v1/human/tool` |
| M8 profile | `trusted-full-read` narrowed to two-step read-only shape workflow |

The first M8 candidate can demonstrate receipt-chain client scoping for Codex
and Claude aliases. It must not claim VCPToolBox runtime-enforced client
isolation unless a later source or runtime proof shows such enforcement.

## Exact Future Boundary

This packet binds the next executable M8 candidate. It is still not execution
by itself.

```yaml
cm1811_m8_trusted_full_read_workflow_boundary:
  boundary_id: cm1811_m8_trusted_full_read_workflow_harness_boundary
  next_candidate_task: cm1812_m8_trusted_full_read_workflow_low_disclosure_execution
  source_m7_closeout: docs/VCP_MEMORY_OBSERVE_FULL_CM1810_READ_SHAPE_RECEIPT_CLOSEOUT_GATE_REVIEW.md
  m7_read_shape_receipt_accepted: true
  plan_package_preauthorization_context_applied: true
  profile: trusted-full-read
  profile_narrowing: read_only_shape_workflow
  operation_type: sustained_read_only_workflow_probe
  target_alias: local_disposable_vcptoolbox_dailynotesearcher_primary_candidate
  target_kind: local_disposable_vcptoolbox_runtime
  target_locator_value_disclosed: false
  route: /v1/human/tool
  route_value_is_secret: false
  content_type: text_plain_tool_request_block
  component: DailyNoteSearcher
  action: SearchDailyNote
  runtime_client_isolation_claimed: false
  receipt_scope_client_isolation_required: true
  workflow_steps:
    - step_id: codex_scope_read_shape_probe
      client_alias: codex_local_agent
      exact_query: codex_memory_m8_workflow_probe_codex_20260704
      max_results: 1
      context_lines: 0
      output_projection: redacted_shape_metadata_only
    - step_id: claude_scope_read_shape_probe
      client_alias: claude_compatible_client
      exact_query: codex_memory_m8_workflow_probe_claude_20260704
      max_results: 1
      context_lines: 0
      output_projection: redacted_shape_metadata_only
  budgets:
    max_runtime_processes: 1
    max_warmup_probes: 3
    max_route_calls: 2
    max_workflow_steps: 2
    max_results_per_step: 1
    max_duration_seconds: 90
    max_response_body_bytes_consumed_per_step: 32768
    max_output_chars_in_receipt_chain: 3000
    max_provider_api_calls: 0
    max_memory_writes: 0
    max_durable_writes: 0
    max_mcp_memory_tool_calls: 0
  receipt_chain:
    workflow_receipt: required_low_disclosure
    per_step_receipts: required_low_disclosure
    checkpoint_receipt: local_docs_only_no_vcp_memory_write
    handoff_receipt: local_docs_only_no_vcp_memory_write
    audit_receipt: local_docs_only_no_vcp_memory_write
  output_projection:
    disclosure_level: redacted_shape_metadata_only
    allowed:
      - status_class_per_step
      - response_json_parse_status_per_step
      - top_level_type_per_step
      - top_level_key_names_per_step
      - result_container_key_names_per_step
      - item_count_per_step
      - item_value_type_names_per_step
      - receipt_scope_client_alias
      - isolation_policy_decision_code
      - fallback_or_abort_code
    forbidden:
      - raw_response_body
      - raw_memory_content
      - raw_snippet
      - raw_file_path
      - raw_id
      - raw_date
      - raw_title
      - raw_prompt
      - raw_embedding
      - raw_audit_row
      - raw_sqlite_or_jsonl_row
      - token_or_credential
      - provider_payload
      - approval_line_value
  response_body_handling:
    body_may_be_consumed_in_memory_by_harness_only_for_shape_projection: true
    raw_body_must_not_be_printed: true
    raw_body_must_not_be_persisted: true
    raw_private_payload_disclosure_allowed: false
    if_projection_requires_raw_values: abort_without_printing_body
  no_write_rule:
    memory_write_allowed: false
    write_proposal_allowed: false
    durable_mutation_allowed: false
    checkpoint_handoff_vcp_memory_write_allowed: false
    import_export_migration_backfill_allowed: false
  forbidden_actions:
    - broad_scan
    - provider_api_call
    - mcp_memory_tool_call
    - config_or_env_content_read
    - runtime_log_read
    - secret_read
    - raw_store_read_by_agent
    - public_mcp_expansion
    - startup_or_watchdog_config_change
    - release_deploy_cutover_push
    - readiness_claim
    - m9_unlock_claim
    - m15_unlock_claim
  abort_conditions:
    - accepted_m7_receipt_missing_or_stale
    - target_alias_drift
    - any_step_route_not_http_2xx
    - auth_ambiguity_or_prompt
    - response_body_exceeds_budget
    - response_body_not_projectable_without_raw_value_disclosure
    - result_count_exceeds_one
    - raw_private_payload_would_be_printed_or_persisted
    - client_alias_missing_or_mixed
    - runtime_client_isolation_overclaim_requested
    - provider_dependency_suspected
    - write_or_mutation_path_suspected
    - runtime_log_or_config_read_needed_to_continue
  cm1811_runtime_calls_used: 0
  execution_authorized_by_cm1811_itself: false
  next_task_may_execute_only_if_boundary_unchanged_and_fresh_git_preflight_passes: true
```

## Receipt Schema For CM-1812

Any future execution under this boundary must emit a low-disclosure receipt
chain with at least:

- `task_id`
- `boundary_id`
- `profile`
- `operation_type`
- `target_alias`
- `route`
- `component`
- `action`
- `workflow_step_count`
- `per_step_client_alias`
- `per_step_query_id_or_value`
- `per_step_status_class`
- `per_step_response_json_parse_status`
- `per_step_shape_projection`
- `receipt_scope_client_isolation_result`
- `runtime_client_isolation_claimed`
- `response_body_printed_or_persisted`
- `raw_private_payload_disclosed`
- `runtime_logs_read`
- `config_env_content_read`
- `env_content_read`
- `secrets_read`
- `raw_memory_read_by_agent`
- `raw_store_read_by_agent`
- `provider_api_called_by_agent`
- `mcp_memory_tool_called`
- `memory_write_performed`
- `public_mcp_expansion_performed`
- `release_tag_deploy_cutover_performed`
- `push_performed`
- `readiness_claimed`
- `rc_ready_claimed`
- `m9_unlocked`
- `m15_unlocked`
- `final_endpoint_status_after_stop`
- `final_node_server_process_count`
- `final_dailynotesearcher_process_count`
- `next_action`

## Gate Result

| Gate | Result |
|---|---|
| M7 read-shape receipt accepted | `YES` |
| M8 exact target alias selected | `YES` |
| M8 exact route selected | `YES` |
| M8 exact component/action selected | `YES` |
| M8 workflow steps selected | `YES` |
| M8 client aliases selected | `YES` |
| M8 output projection selected | `YES` |
| M8 abort rules selected | `YES` |
| CM-1811 runtime action performed | `NO` |
| Runtime client isolation claimed | `NO` |
| M9 unlocked | `NO` |
| M15 unlocked | `NO` |
| Readiness or `RC_READY` claimed | `NO` |

## Evidence

```yaml
cm1811_m8_trusted_full_read_workflow_harness_boundary_preflight:
  no_runtime_action_performed: true
  m7_read_shape_receipt_accepted: true
  target_alias_selected: local_disposable_vcptoolbox_dailynotesearcher_primary_candidate
  route_selected: /v1/human/tool
  component_selected: DailyNoteSearcher
  action_selected: SearchDailyNote
  workflow_step_count: 2
  client_aliases_selected:
    - codex_local_agent
    - claude_compatible_client
  runtime_client_isolation_claimed: false
  receipt_scope_client_isolation_required: true
  output_projection_selected: redacted_shape_metadata_only
  response_body_may_be_consumed_by_future_harness_for_shape_only: true
  response_body_print_or_persist_allowed: false
  memory_write_allowed: false
  broad_scan_allowed: false
  provider_api_allowed: false
  mcp_memory_tool_allowed: false
  runtime_logs_read: false
  config_env_content_read: false
  env_content_read: false
  secrets_read: false
  raw_memory_read_by_agent: false
  raw_store_read_by_agent: false
  provider_api_called_by_agent: false
  mcp_memory_tool_called: false
  memory_write_performed: false
  public_mcp_expansion_performed: false
  release_tag_deploy_cutover_performed: false
  push_performed: false
  m8_execution_performed: false
  m9_unlocked: false
  m15_unlocked: false
  readiness_claimed: false
  rc_ready_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
  next_action: cm1812_m8_trusted_full_read_workflow_low_disclosure_execution
```
