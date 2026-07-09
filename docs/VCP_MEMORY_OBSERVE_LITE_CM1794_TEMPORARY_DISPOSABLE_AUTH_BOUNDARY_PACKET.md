# VCP Memory Observe-Lite CM1794 Temporary Disposable Auth Boundary Packet

Task id: `M6-OBSERVE-LITE-TEMPORARY-DISPOSABLE-AUTH-BOUNDARY-PACKET`
Implementation slice: `CM-1794`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_CM1793_DAILYNOTESEARCHER_PROBE_DECISION_ABORT_BOUNDARY.md`
Evidence type: `source-only`, `boundary-packet`, `no-runtime`,
`no-log`, `no-secret`, `no-response-body`, `no-memory-result`,
`no-approval-line`

## Boundary

CM-1794 defines the temporary disposable auth boundary needed before a future
status-only/no-body `DailyNoteSearcher.SearchDailyNote` probe can pass the
VCPToolBox `/v1/human/tool` bearer-auth gate.

It does not start the VCPToolBox runtime, call an HTTP route, generate a real
tool request body, execute a VCPToolBox plugin, read a response body, read
stdout/stderr, read runtime logs, read `config.env` contents, read `.env`
contents, read process environment values, read secrets, read raw memory, read
raw stores, read raw runtime responses, read provider responses, or read memory
results.

It does not write or edit VCPToolBox files, write `config.env`, change startup
or watchdog settings, call MCP memory tools, run a real memory query, write
memory, expand public MCP tools, release, deploy, cut over, push, generate an
approval line, or claim readiness.

## Source Facts

| Fact | Result |
|---|---|
| VCPToolBox loads `config.env` through dotenv | `YES` |
| VCPToolBox bearer auth compares `Authorization` with `Bearer ${serverKey}` | `YES` |
| `serverKey` is sourced from `process.env.Key` | `YES` |
| `/v1/human/tool` is behind the generic bearer middleware | `YES` |
| VCPToolBox docs identify `Key` as the chat/API bearer secret | `YES` |
| Existing `Key` value known to agent | `NO` |
| Existing `Key` value read from config/env/log/runtime output | `NO` |
| Safe future auth path requires a new disposable value | `YES` |

## Decision

Decision: `TEMPORARY_DISPOSABLE_AUTH_PACKET_READY_NOT_EXECUTED`.

The future probe must not reuse, reveal, derive, or validate any existing
VCPToolBox bearer secret. It may only use a new disposable test auth value
created at execution time for the local integration child process.

The disposable value must:

- be generated only at execution time
- be scoped only to the disposable local VCPToolBox child process
- be passed through a child-process environment override for `Key`
- never be written to `config.env`, `.env`, project files, logs, receipts, or
  Git history
- never be printed in shell output, final reports, docs, request traces, or
  validation artifacts
- never be used against a cloud, production, shared, or stable VCPToolBox
  service

This packet is not an approval line and does not authorize release, deploy,
cutover, broad memory read, memory write, provider/API calls, public MCP
expansion, or readiness claims.

## Future Execution Envelope

Future execution may proceed only under a later `CM-1795` exact envelope if all
of these remain true:

| Field | Required value |
|---|---|
| `target` | local disposable VCPToolBox checkout only |
| `auth_source` | newly generated disposable value only |
| `auth_persistence` | no file write, no config write, no log write, no receipt value |
| `service_start` | one local child process at most |
| `stdout_stderr_policy` | discarded, not read |
| `runtime_log_policy` | not read |
| `request_body_policy` | exact minimal tool request generated only at execution time |
| `route_budget` | one `/v1/human/tool` call at most |
| `response_policy` | status-only, body bytes read `0` |
| `query_policy` | low-disclosure nonce query, max result `1`, context lines `0` |
| `write_policy` | no memory write/update/delete/supersede/tombstone |
| `provider_policy` | no provider/API call intentionally invoked |
| `raw_data_policy` | no raw memory/store/runtime response disclosure |
| `cleanup_policy` | stop child process and leave no persistent process intentionally running |

If the future probe cannot avoid printing the bearer value, reading response
body bytes, reading logs, reading config/env contents, or writing memory, it
must abort before execution.

## Rejected Actions

| Candidate action | Decision | Reason |
|---|---|---|
| Read existing `config.env` or `.env` to obtain `Key` | `REJECTED` | Secret/config boundary |
| Print or persist a bearer value in docs, receipts, command output, or Git | `REJECTED` | Secret disclosure boundary |
| Modify VCPToolBox `config.env` for the probe | `REJECTED` | Persistent config mutation |
| Use the cloud or stable VCPToolBox service | `REJECTED` | Target must remain disposable local integration target |
| Read response body to inspect plugin output | `REJECTED` | Observe-lite low-disclosure boundary |
| Claim M6 memory/capability handshake complete from this packet | `REJECTED` | No runtime probe occurred |

## Evidence

```yaml
cm1794_temporary_disposable_auth_boundary_packet:
  local_target_is_disposable_integration_target: true
  plan_package_preauthorization_context_applied: true
  source_only: true
  boundary_packet_ready: true
  packet_executed: false
  selected_surface: DailyNoteSearcher.SearchDailyNote
  route_alias_selected: vcp_human_tool_direct_route
  bearer_auth_required_before_route: true
  server_key_source: process_env_key
  existing_bearer_credential_value_known: false
  existing_bearer_credential_read: false
  disposable_auth_required_for_future_probe: true
  disposable_auth_value_generated_now: false
  disposable_auth_value_disclosed: false
  disposable_auth_value_persisted: false
  config_env_content_read: false
  env_content_read: false
  secrets_read: false
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
  raw_memory_read: false
  raw_store_read: false
  raw_runtime_response_read: false
  provider_api_called: false
  mcp_memory_tool_called: false
  vcp_plugin_executed: false
  runtime_memory_query_executed: false
  memory_read_performed_by_agent: false
  memory_write_performed: false
  memory_result_returned_to_agent: false
  public_mcp_expansion_performed: false
  config_startup_watchdog_changed: false
  vcptoolbox_files_modified: false
  release_tag_deploy_cutover_performed: false
  push_performed: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  readiness_claimed: false
  rc_ready_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
  m6_observe_lite_handshake_complete: false
  m15_unlocked: false
  next_action: cm1795_exact_temporary_auth_status_only_dailynote_probe_execution_envelope
```

## Interpretation

CM-1794 turns the CM-1793 abort into an executable next boundary without
weakening the secret rule. The next meaningful step is not to read the existing
VCPToolBox `Key`; it is to run a disposable local child process with a new
one-shot `Key` value that is never disclosed or persisted, then perform a
status-only `/v1/human/tool` probe under a separate exact execution envelope.

This packet does not complete M6, does not unlock M7/M8/M15, and does not
claim release, deploy, cutover, `RC_READY`, complete V8, or full bridge
completion.
