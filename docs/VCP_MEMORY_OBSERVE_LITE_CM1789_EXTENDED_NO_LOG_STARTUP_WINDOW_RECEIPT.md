# VCP Memory Observe-Lite CM1789 Extended No-Log Startup Window Receipt

Task id: `M6-OBSERVE-LITE-EXTENDED-NO-LOG-STARTUP-WINDOW`
Implementation slice: `CM-1789`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_CM1788_STARTUP_FAILURE_SOURCE_DIAGNOSIS.md`
Evidence type: `live-runtime-status-only`, `no-log`, `no-secret`,
`no-response-body`, `no-memory-result`, `no-approval-line`

## Boundary

CM-1789 used the operator-provided local VCPToolBox target as a disposable
integration target for the `codex-memory` plan package. The runtime action was
bounded to one no-log startup window with status-only HTTP probes.

The agent did not read stdout, stderr, runtime logs, response bodies,
`config.env` contents, `.env` contents, secrets, raw memory, raw stores, raw
runtime responses, or provider responses. It did not call MCP memory tools,
read memory, write memory, change config, change startup/watchdog settings,
expand public MCP tools, release, deploy, cut over, push, or claim readiness.

## Startup Window Result

| Field | Result |
|---|---|
| Pre-start local status class | `connection_failed` |
| Runtime start attempted | `YES` |
| Process count started by agent | `1` |
| Maximum window | `10 minutes` |
| Probe interval | `10 seconds` |
| Actual probes | `2` |
| Transport reachable | `YES` |
| Last observed status class | `http_4xx` |
| Response body read | `NO` |
| Runtime logs read | `NO` |
| stdout/stderr read | `NO` |
| Process early exit | `NO` |
| Timeout | `NO` |
| Stop signal sent | `YES` |
| Child exit observed | `YES` |
| Persistent process intentionally left running | `NO` |

## Evidence

```yaml
cm1789_extended_no_log_startup_window:
  local_target_is_disposable_integration_target: true
  plan_package_preauthorization_context_applied: true
  pre_start_status_class: connection_failed
  runtime_started: true
  service_start_attempted: true
  process_count_started_by_agent: 1
  max_window_minutes: 10
  probe_interval_seconds: 10
  probe_count: 2
  endpoint_transport_reachable: true
  last_status_class: http_4xx
  health_route_ok_proven: false
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
  provider_api_called: false
  mcp_memory_tool_called: false
  public_mcp_expansion_performed: false
  config_startup_watchdog_changed: false
  release_tag_deploy_cutover_performed: false
  push_performed: false
  readiness_claimed: false
  rc_ready_claimed: false
  complete_v8_claimed: false
  m6_transport_subproof_complete: true
  m6_observe_lite_handshake_complete: false
  m15_unlocked: false
  log_read_required_now: false
  next_action: cm1790_status_only_observe_lite_route_matrix
```

## Interpretation

CM-1789 validates the CM-1788 diagnosis that CM-1787's twelve-second startup
window was too short to prove startup failure. In an extended no-log window,
the local VCPToolBox target accepted HTTP traffic by the second status-only
probe.

The observed `http_4xx` status class is enough to prove that the operator
endpoint reached an HTTP listener. It is not enough to prove that `/health` is a
valid health endpoint, that the application is healthy, or that the observe-lite
handshake route is complete.

No runtime log-read escalation is required for startup reachability at this
point. The next safe step is a status-only observe-lite route matrix or
source-guided route selection that still avoids response bodies and logs. If a
later milestone requires reading a low-disclosure response shape, that must be
bounded separately before any body content is inspected.

This completes only the transport-reachable subproof. It does not complete the
full M6 observe-lite handshake proof, unlock M7, M8, M15, RC review, release,
deploy, cutover, or readiness.
