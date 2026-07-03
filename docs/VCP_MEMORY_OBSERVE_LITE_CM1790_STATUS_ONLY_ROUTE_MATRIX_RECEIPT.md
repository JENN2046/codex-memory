# VCP Memory Observe-Lite CM1790 Status-Only Route Matrix Receipt

Task id: `M6-OBSERVE-LITE-STATUS-ONLY-ROUTE-MATRIX`
Implementation slice: `CM-1790`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_CM1789_EXTENDED_NO_LOG_STARTUP_WINDOW_RECEIPT.md`
Evidence type: `live-runtime-status-only`, `source-guided-route-map`,
`no-log`, `no-secret`, `no-response-body`, `no-memory-result`,
`no-approval-line`

## Boundary

CM-1790 used the operator-provided local VCPToolBox target as a disposable
integration target and ran one source-guided status-only route matrix.

The agent did not read response bodies, stdout, stderr, runtime logs,
`config.env` contents, `.env` contents, secrets, raw memory, raw stores, raw
runtime responses, or provider responses. It did not call MCP memory tools,
read memory, write memory, change config, change startup/watchdog settings,
expand public MCP tools, release, deploy, cut over, push, or claim readiness.

## Source-Guided Route Findings

| Finding | Result |
|---|---|
| `/health` route in `server.js` | `ABSENT` |
| Generic bearer auth before `/v1/models` handler | `YES` |
| Admin auth before `/admin_api/*` and `/AdminPanel` | `YES` |
| Admin credentials missing branch can return `5xx` | `YES` |
| Provider handler should be avoided without auth | `YES` |

These are source-only findings. No config values were read, so whether admin
credentials are actually configured remains unknown.

## Status-Only Matrix

| Candidate | Source role | Status class |
|---|---|---|
| `health_candidate` | operator health probe candidate; no source route found | `http_4xx` |
| `admin_lifecycle_candidate` | local admin lifecycle route guarded by admin auth | `http_5xx` |
| `admin_panel_candidate` | admin panel route guarded by admin auth / redirect path | `http_5xx` |
| `models_auth_candidate` | provider-facing models route protected by bearer auth | `http_4xx` |
| `unknown_candidate` | unknown non-admin path through bearer auth / fallback | `http_4xx` |

Warmup reached HTTP transport by probe 2 with status class `http_4xx`.

## Evidence

```yaml
cm1790_status_only_route_matrix:
  local_target_is_disposable_integration_target: true
  plan_package_preauthorization_context_applied: true
  source_guided_route_map_performed: true
  runtime_started: true
  service_start_attempted: true
  process_count_started_by_agent: 1
  warmup_probe_count: 2
  warmup_transport_ready: true
  warmup_last_status_class: http_4xx
  route_matrix_executed: true
  route_matrix_candidate_count: 5
  route_matrix_status_classes:
    health_candidate: http_4xx
    admin_lifecycle_candidate: http_5xx
    admin_panel_candidate: http_5xx
    models_auth_candidate: http_4xx
    unknown_candidate: http_4xx
  health_route_present_in_source: false
  provider_route_called_after_auth: false
  provider_api_called: false
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
  memory_read_performed: false
  memory_write_performed: false
  mcp_memory_tool_called: false
  public_mcp_expansion_performed: false
  config_startup_watchdog_changed: false
  release_tag_deploy_cutover_performed: false
  push_performed: false
  readiness_claimed: false
  rc_ready_claimed: false
  complete_v8_claimed: false
  m6_transport_subproof_complete: true
  m6_route_matrix_complete: true
  m6_observe_lite_handshake_complete: false
  m15_unlocked: false
  stop_signal_sent: true
  child_exit_observed: true
  persistent_process_left_running: false
  log_read_required_now: false
  next_action: cm1791_source_only_vcp_memory_capability_endpoint_map
```

## Interpretation

CM-1790 confirms that the operator endpoint is a live HTTP listener and that
candidate routes reach application-level guards or handlers. It also explains
why `/health` is not a reliable proof route: the source does not define it.

The admin route `5xx` classes do not require immediate log escalation because
source shows an admin-disabled branch can return `5xx` when admin credentials
are not configured. This was not confirmed by reading config contents, and no
secret/config value was inspected.

The models route status was collected unauthenticated and status-only. Source
shows generic bearer auth runs before the `/v1/models` handler, so the matrix
does not require a provider call and does not prove provider availability.

This completes only the route-matrix subproof. It does not complete the full M6
observe-lite memory/capability handshake, unlock M7, M8, M15, RC review,
release, deploy, cutover, or readiness.
