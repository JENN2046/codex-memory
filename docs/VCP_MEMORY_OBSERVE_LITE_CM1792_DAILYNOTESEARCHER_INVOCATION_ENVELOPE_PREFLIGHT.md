# VCP Memory Observe-Lite CM1792 DailyNoteSearcher Invocation Envelope Preflight

Task id: `M6-OBSERVE-LITE-DAILYNOTESEARCHER-INVOCATION-ENVELOPE-PREFLIGHT`
Implementation slice: `CM-1792`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_CM1791_SOURCE_ONLY_MEMORY_CAPABILITY_ENDPOINT_MAP.md`
Evidence type: `source-only`, `exact-envelope-preflight`,
`non-authorizing`, `no-runtime`, `no-log`, `no-secret`,
`no-response-body`, `no-memory-result`, `no-approval-line`

## Boundary

CM-1792 selects one future memory capability surface and defines the exact
invocation envelope that must exist before any later live call. It does not
start the VCPToolBox runtime, call an HTTP route, generate a real request body,
execute a VCPToolBox plugin, read a response body, read stdout/stderr, read
runtime logs, read `config.env` contents, read `.env` contents, read secrets,
read raw memory, read raw stores, read raw runtime responses, read provider
responses, or read memory results.

It does not call MCP memory tools, run a real memory query, write memory,
change config, change startup/watchdog settings, expand public MCP tools,
release, deploy, cut over, push, generate an approval line, or claim readiness.

## Source Review Result

CM-1792 compared two source-only candidate surfaces from CM-1791 and selected
`DailyNoteSearcher.SearchDailyNote` for the next envelope.

| Candidate | Useful property | Blocking risk | Decision |
|---|---|---|---|
| `LightMemo.SearchRAG` | Primary semantic recall surface | Source shows query embedding is required; rerank, TagMemo, vector, and formatted memory snippet output can cross provider or raw-result boundaries | `DEFERRED_PENDING_PROVIDER_AND_OUTPUT_CLASSIFICATION` |
| `DailyNoteSearcher.SearchDailyNote` | Direct search surface with text/BM25 search and bounded result parameters | Can read memory files, can return raw snippets, and may use an internal local search service | `SELECTED_FOR_ENVELOPE_PREFLIGHT_ONLY` |

Source facts used:

- `/v1/human/tool` accepts a plain-text tool request block, parses `tool_name`
  and field arguments, calls `pluginManager.processToolCall(...)`, and returns
  the plugin result as JSON.
- `ToolCallParser` requires a tool request block and parses fields into
  `tool_name` plus argument keys.
- `DailyNoteSearcher` is a direct hybrid service with command
  `SearchDailyNote`.
- `DailyNoteSearcher` source includes local text/regex/BM25 search parameters,
  `max_results`, `context_lines`, extension filtering, and ignored-folder
  controls.
- The reviewed `DailyNoteSearcher` path did not show a provider/API call
  requirement for the selected search surface.

These are source-only findings. No runtime config values, endpoint values,
memory contents, logs, or response bodies were read.

## Future Invocation Envelope

This envelope is a non-authorizing preflight. It is not a request body and must
not be pasted into a live client.

```yaml
cm1792_future_invocation_envelope:
  boundary_id: cm1792_dailynote_searcher_observe_lite_preflight
  profile: observe-lite
  operation_type: memory_capability_observe_probe
  route_alias: vcp_human_tool_direct_route
  route_value_disclosed: false
  content_type: text_plain_tool_request_block
  request_body_generated: false
  request_body_value_disclosed: false
  target_component: DailyNoteSearcher
  target_action: SearchDailyNote
  target_kind: local_disposable_vcptoolbox_runtime
  target_locator_hash_present: true
  target_locator_value_disclosed: false
  required_tool_fields:
    tool_name: DailyNoteSearcher
    query: safe_nonce_query_value_to_be_generated_only_at_execution_time
    max_results: 1
    context_lines: 0
    is_regex: false
    case_sensitive: true
    whole_word: true
  forbidden_tool_fields:
    - root_path_absolute_value
    - raw_path
    - file_url
    - token
    - credential
    - provider_key
    - write_command
    - delete_command
    - update_command
  optional_scope_fields:
    folder_alias: exact_safe_alias_only_if_needed
    root_path_alias: default_daily_note_root_only
  output_policy:
    first_live_probe_disclosure_level: status_only_no_body
    response_body_read_allowed: false
    memory_result_read_allowed: false
    raw_private_payload_allowed: false
    secret_value_allowed: false
    provider_response_allowed: false
  budgets:
    max_runtime_calls: 1
    max_route_calls: 1
    max_duration_seconds: 60
    max_response_body_bytes_read: 0
    max_provider_api_calls: 0
    max_memory_writes: 0
    max_durable_writes: 0
    max_mcp_memory_tool_calls: 0
  stop_conditions:
    - missing_exact_target_alias
    - request_body_would_disclose_locator_or_secret
    - response_body_needed_to_continue
    - runtime_log_needed_to_continue
    - config_or_env_content_needed_to_continue
    - provider_call_required_or_suspected
    - write_or_mutation_intent_detected
    - raw_memory_result_requested
    - broad_scan_or_export_requested
    - route_status_suggests_auth_or_runtime_drift
  receipt_required: true
  not_authorization: true
```

## Future Receipt Requirements

Any future execution using this envelope must record at least:

- `task_id`
- `boundary_id`
- `profile`
- `route_alias`
- `target_component`
- `target_action`
- `request_body_generated`
- `request_body_value_disclosed`
- `runtime_started_by_agent`
- `route_called`
- `status_class`
- `response_body_read`
- `memory_result_read`
- `runtime_logs_read`
- `config_env_content_read`
- `env_content_read`
- `secrets_read`
- `raw_memory_read`
- `raw_store_read`
- `provider_api_called`
- `mcp_memory_tool_called`
- `vcp_plugin_executed`
- `memory_read_performed`
- `memory_write_performed`
- `durable_write_count`
- `public_mcp_expansion_performed`
- `approval_line_present`
- `approval_line_generated`
- `approval_granted`
- `readiness_claimed`
- `m6_observe_lite_handshake_complete`
- `m15_unlocked`
- `next_action`

The first future live probe under this envelope may prove only route/tool
invocation status class if response body reading remains forbidden. It must
not claim memory recall quality, memory result correctness, full M6 handshake,
M7/M8/M15 unlock, release, deploy, cutover, `RC_READY`, complete V8, or full
bridge completion.

## Evidence

```yaml
cm1792_dailynote_searcher_invocation_envelope_preflight:
  local_target_is_disposable_integration_target: true
  plan_package_preauthorization_context_applied: true
  source_only: true
  selected_surface: DailyNoteSearcher.SearchDailyNote
  route_alias_selected: vcp_human_tool_direct_route
  request_body_generated: false
  real_request_body_disclosed: false
  runtime_started: false
  service_start_attempted: false
  route_called: false
  response_body_read: false
  stdout_read: false
  stderr_read: false
  runtime_logs_read: false
  config_env_content_read: false
  env_content_read: false
  secrets_read: false
  raw_memory_read: false
  raw_store_read: false
  raw_runtime_response_read: false
  provider_api_called: false
  mcp_memory_tool_called: false
  vcp_plugin_executed: false
  memory_read_performed: false
  memory_write_performed: false
  memory_result_returned: false
  public_mcp_expansion_performed: false
  config_startup_watchdog_changed: false
  release_tag_deploy_cutover_performed: false
  push_performed: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  readiness_claimed: false
  rc_ready_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
  exact_invocation_envelope_preflight_complete: true
  m6_observe_lite_handshake_complete: false
  m15_unlocked: false
  next_action: cm1793_status_only_no_body_dailynote_searcher_probe_decision_or_abort_boundary
```

## Interpretation

CM-1792 turns the broad CM-1791 capability map into one exact future invocation
envelope. It does not authorize execution and does not prove live memory
capability.

The safest next route is CM-1793: review whether a status-only/no-body
`DailyNoteSearcher.SearchDailyNote` probe can be executed under the existing
preauthorized local disposable target boundary. If the probe would require
reading a response body, runtime logs, config/env contents, raw memory, or
provider output, CM-1793 must abort and record the blocker instead of
escalating silently.
