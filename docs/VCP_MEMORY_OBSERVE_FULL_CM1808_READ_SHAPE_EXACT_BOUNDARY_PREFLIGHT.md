# VCP Memory Observe-Full CM1808 Read-Shape Exact Boundary Preflight

Task id: `M7-OBSERVE-FULL-READ-SHAPE-EXACT-BOUNDARY-PREFLIGHT`
Implementation slice: `CM-1808`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_CM1807_M6_SUCCESSFUL_PROOF_CLOSEOUT_NEXT_STAGE_GATE_REVIEW.md`
Evidence type: `docs-only`, `exact-boundary-preflight`, `no-runtime`,
`no-secret`, `no-memory-write`

## Purpose

CM-1808 converts the accepted M6 observe-lite proof into a bounded M7
observe-full read-shape execution boundary.

It does not start VCPToolBox, call a route, generate or submit a live request
body, read a response body, read runtime logs, read `config.env` or `.env`
contents, read secrets, read raw memory or raw stores, call providers/APIs,
call MCP memory tools, write memory, expand public MCP tools, release, deploy,
cut over, push, unlock M8, unlock M15, or claim readiness.

## Boundary Source

| Required input | CM-1808 state |
|---|---|
| Accepted M6 observe-lite receipt | `docs/VCP_MEMORY_OBSERVE_LITE_CM1807_M6_SUCCESSFUL_PROOF_CLOSEOUT_NEXT_STAGE_GATE_REVIEW.md` |
| Target binding evidence | CM-1806 `/v1/human/tool` status `http_2xx` under no-body/no-log/no-secret/no-write boundary |
| Selected component | `DailyNoteSearcher` |
| Selected action | `SearchDailyNote` |
| Route | `/v1/human/tool` |
| Transport profile | local disposable VCPToolBox runtime, temporary child-process auth only |
| M7 profile | `observe-full` narrowed to read-shape only |

The target is represented by a safe alias in receipts. Locator values,
endpoint values, tokens, credentials, and config values must not be printed in
the M7 receipt.

## Exact Future Boundary

This packet binds the next executable M7 candidate. It is still not execution
by itself.

```yaml
cm1808_m7_read_shape_exact_boundary:
  boundary_id: cm1808_m7_observe_full_read_shape_exact_boundary
  next_candidate_task: cm1809_m7_observe_full_read_shape_low_disclosure_execution
  source_m6_closeout: docs/VCP_MEMORY_OBSERVE_LITE_CM1807_M6_SUCCESSFUL_PROOF_CLOSEOUT_NEXT_STAGE_GATE_REVIEW.md
  m6_observe_lite_receipt_accepted: true
  plan_package_preauthorization_context_applied: true
  profile: observe-full
  profile_narrowing: read_shape_only
  operation_type: read_shape_probe
  target_alias: local_disposable_vcptoolbox_dailynotesearcher_primary_candidate
  target_kind: local_disposable_vcptoolbox_runtime
  target_locator_value_disclosed: false
  route: /v1/human/tool
  route_value_is_secret: false
  content_type: text_plain_tool_request_block
  component: DailyNoteSearcher
  action: SearchDailyNote
  request_body_generation_allowed_next_task: true
  request_body_print_or_persist_allowed: false
  exact_query: codex_memory_m7_read_shape_probe_cm1809_no_private_match_20260704
  tool_fields:
    tool_name: DailyNoteSearcher
    query: codex_memory_m7_read_shape_probe_cm1809_no_private_match_20260704
    max_results: 1
    context_lines: 0
    is_regex: false
    case_sensitive: true
    whole_word: true
  budgets:
    max_runtime_processes: 1
    max_warmup_probes: 3
    max_route_calls: 1
    max_results: 1
    max_duration_seconds: 60
    max_response_body_bytes_consumed_by_harness: 32768
    max_output_chars_in_receipt: 2000
    max_provider_api_calls: 0
    max_memory_writes: 0
    max_durable_writes: 0
    max_mcp_memory_tool_calls: 0
  output_projection:
    disclosure_level: redacted_shape_metadata_only
    allowed:
      - status_class
      - response_json_parse_status
      - top_level_type
      - top_level_key_names
      - result_container_key_names
      - item_count
      - item_value_type_names
      - field_count_per_item
      - normalization_gap_codes
      - policy_decision_codes
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
    - m8_unlock_claim
    - m15_unlock_claim
  abort_conditions:
    - accepted_m6_receipt_missing_or_stale
    - target_alias_drift
    - route_not_http_2xx_after_single_call
    - auth_ambiguity_or_prompt
    - response_body_exceeds_budget
    - response_body_not_projectable_without_raw_value_disclosure
    - result_count_exceeds_one
    - raw_private_payload_would_be_printed_or_persisted
    - cross_client_or_visibility_leakage_indicator
    - provider_dependency_suspected
    - write_or_mutation_path_suspected
    - runtime_log_or_config_read_needed_to_continue
  cm1808_runtime_calls_used: 0
  execution_authorized_by_cm1808_itself: false
  next_task_may_execute_only_if_boundary_unchanged_and_fresh_git_preflight_passes: true
```

## Receipt Schema For CM-1809

Any future execution under this boundary must emit a low-disclosure receipt
with at least:

- `task_id`
- `boundary_id`
- `profile`
- `operation_type`
- `target_alias`
- `route`
- `component`
- `action`
- `exact_query_id_or_value`
- `runtime_started_by_agent`
- `warmup_probe_count`
- `route_called`
- `status_class`
- `response_body_consumed_by_harness`
- `response_body_printed_or_persisted`
- `response_body_bytes_consumed`
- `response_json_parse_status`
- `top_level_type`
- `top_level_key_names`
- `result_container_key_names`
- `item_count`
- `item_value_type_names`
- `field_count_per_item`
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
- `m8_unlocked`
- `m15_unlocked`
- `final_endpoint_status_after_stop`
- `final_node_server_process_count`
- `final_dailynotesearcher_process_count`
- `next_action`

## Gate Result

| Gate | Result |
|---|---|
| M6 observe-lite receipt accepted | `YES` |
| M7 exact target alias selected | `YES` |
| M7 exact route selected | `YES` |
| M7 exact component/action selected | `YES` |
| M7 exact query selected | `YES` |
| M7 result budget selected | `YES` |
| M7 output projection selected | `YES` |
| M7 abort rules selected | `YES` |
| CM-1808 runtime action performed | `NO` |
| M8 unlocked | `NO` |
| M15 unlocked | `NO` |
| Readiness or `RC_READY` claimed | `NO` |

## Evidence

```yaml
cm1808_m7_observe_full_read_shape_exact_boundary_preflight:
  no_runtime_action_performed: true
  m6_observe_lite_receipt_accepted: true
  target_alias_selected: local_disposable_vcptoolbox_dailynotesearcher_primary_candidate
  route_selected: /v1/human/tool
  component_selected: DailyNoteSearcher
  action_selected: SearchDailyNote
  exact_query_selected: codex_memory_m7_read_shape_probe_cm1809_no_private_match_20260704
  max_results_selected: 1
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
  m7_execution_performed: false
  m8_unlocked: false
  m15_unlocked: false
  readiness_claimed: false
  rc_ready_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
  next_action: cm1809_m7_observe_full_read_shape_low_disclosure_execution
```
