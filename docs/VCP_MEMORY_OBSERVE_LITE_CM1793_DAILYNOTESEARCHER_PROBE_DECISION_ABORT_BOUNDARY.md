# VCP Memory Observe-Lite CM1793 DailyNoteSearcher Probe Decision Abort Boundary

Task id: `M6-OBSERVE-LITE-DAILYNOTESEARCHER-PROBE-DECISION-ABORT-BOUNDARY`
Implementation slice: `CM-1793`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_CM1792_DAILYNOTESEARCHER_INVOCATION_ENVELOPE_PREFLIGHT.md`
Evidence type: `source-only`, `abort-boundary`, `no-runtime`,
`no-log`, `no-secret`, `no-response-body`, `no-memory-result`,
`no-approval-line`

## Boundary

CM-1793 decides whether the CM-1792 `DailyNoteSearcher.SearchDailyNote`
status-only/no-body probe can execute safely under the existing local
disposable VCPToolBox target boundary.

It does not start the VCPToolBox runtime, call an HTTP route, generate a real
request body, execute a VCPToolBox plugin, read a response body, read
stdout/stderr, read runtime logs, read `config.env` contents, read `.env`
contents, read secrets, read raw memory, read raw stores, read raw runtime
responses, read provider responses, or read memory results.

It does not call MCP memory tools, run a real memory query, write memory,
change config, change startup/watchdog settings, expand public MCP tools,
release, deploy, cut over, push, generate an approval line, or claim readiness.

## Decision

Decision: `ABORT_RUNTIME_PROBE_BEFORE_EXECUTION`.

Reason:

- Source review shows the general bearer-token authentication middleware is
  mounted before the `/v1/human/tool` route.
- `/v1/human/tool` calls `pluginManager.processToolCall(...)` only after the
  request passes that authentication layer.
- A meaningful `DailyNoteSearcher.SearchDailyNote` probe would therefore need
  a valid bearer credential or an explicit temporary auth boundary.
- Reading or deriving that credential from `config.env`, `.env`, process env,
  logs, runtime output, or config files would cross the current secret/config
  boundary.
- An unauthenticated status-only route call would at most prove the auth guard.
  It would not prove `DailyNoteSearcher` invocation, memory capability, or M6
  memory/capability handshake.

Therefore the correct CM-1793 action is to stop before the runtime probe and
record the abort boundary.

## Source Facts

| Fact | Result |
|---|---|
| Generic bearer auth middleware exists before `/v1/human/tool` | `YES` |
| `/v1/human/tool` source route exists after that middleware | `YES` |
| Route invokes `pluginManager.processToolCall(...)` after parsing | `YES` |
| Route can reach `DailyNoteSearcher` without auth | `NOT_PROVEN` |
| Bearer credential value known to agent | `NO` |
| Secret/config/env content read in CM-1793 | `NO` |
| Meaningful status-only no-body probe can execute now | `NO` |

## Rejected Actions

| Candidate action | Decision | Reason |
|---|---|---|
| Start VCPToolBox and call `/v1/human/tool` without bearer auth | `REJECTED` | Would prove only auth guard, not tool or memory capability |
| Read `config.env`, `.env`, process env, logs, or config to obtain bearer auth | `REJECTED` | Secret/config boundary |
| Generate a real tool request body now | `REJECTED` | No route execution is allowed without auth boundary |
| Execute `DailyNoteSearcher.SearchDailyNote` now | `REJECTED` | Would require auth boundary and could cross memory result boundary |
| Claim M6 memory/capability handshake complete | `REJECTED` | No plugin invocation occurred |

## Next Safe Route

Next safe route:

`CM-1794 temporary disposable auth boundary packet for status-only no-body tool
probe`.

That future packet must decide whether to use a temporary non-production
auth boundary for this disposable local target without reading or exposing
existing secrets. It must still forbid response-body reads, runtime-log reads,
raw memory reads, provider/API calls, memory writes, public MCP expansion,
release, deploy, cutover, `RC_READY`, complete V8, and readiness claims.

## Evidence

```yaml
cm1793_dailynote_searcher_probe_decision_abort_boundary:
  local_target_is_disposable_integration_target: true
  plan_package_preauthorization_context_applied: true
  source_only: true
  selected_surface: DailyNoteSearcher.SearchDailyNote
  route_alias_selected: vcp_human_tool_direct_route
  bearer_auth_required_before_route: true
  bearer_credential_value_known: false
  request_body_generated: false
  real_request_body_disclosed: false
  runtime_started: false
  service_start_attempted: false
  route_called: false
  unauthenticated_probe_executed: false
  authenticated_probe_executed: false
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
  runtime_probe_aborted_before_execution: true
  abort_reason: bearer_auth_required_secret_boundary
  m6_observe_lite_handshake_complete: false
  m15_unlocked: false
  next_action: cm1794_temporary_disposable_auth_boundary_packet_for_status_only_no_body_tool_probe
```

## Interpretation

CM-1793 prevents a misleading probe. The local endpoint is alive from CM-1789
and CM-1790, and the memory-capability route is mapped from CM-1791 and
CM-1792, but a direct tool probe cannot prove useful memory capability without
crossing the bearer-auth boundary.

This abort boundary does not complete M6, does not unlock M7/M8/M15, and does
not claim release, deploy, cutover, `RC_READY`, complete V8, or full bridge
completion.
