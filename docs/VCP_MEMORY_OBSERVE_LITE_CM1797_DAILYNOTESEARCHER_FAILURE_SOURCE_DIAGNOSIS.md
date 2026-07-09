# VCP Memory Observe-Lite CM1797 DailyNoteSearcher Failure Source Diagnosis

Task id: `M6-OBSERVE-LITE-DAILYNOTESEARCHER-FAILURE-SOURCE-DIAGNOSIS`
Implementation slice: `CM-1797`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_CM1796_WHITELIST_TEMP_AUTH_STATUS_ONLY_PROBE_RECEIPT.md`
Evidence type: `source-only`, `metadata-only`, `no-runtime`,
`no-log`, `no-response-body`, `no-secret`, `no-write`

## Boundary

CM-1797 diagnoses the CM-1796 `/v1/human/tool` `http_5xx` status without
reading runtime logs, stdout/stderr, response bodies, `config.env`, `.env`,
raw daily-note contents, raw knowledge contents, raw stores, provider
responses, or memory results.

It does not start VCPToolBox, call HTTP routes, generate a bearer value, print
or persist a request body, change file permissions, modify VCPToolBox files,
write memory, expand public MCP tools, release, deploy, cut over, push, create
an approval line, or claim readiness.

## Findings

| Check | Result |
|---|---|
| Exact CM-1796 request-body shape parses through `ToolCallParser` | `YES` |
| Parsed tool name | `DailyNoteSearcher` |
| Parsed required argument keys present | `YES` |
| Parser accepts final field without trailing comma | `YES` |
| `DailyNoteSearcher` source exports `processToolCall` | `YES` |
| `DailyNoteSearcher` source starts a local service executable | `YES` |
| Executable candidate `DailyNoteSearcher` exists | `NO` |
| Executable candidate `DailyNoteSearcher-aarch64-unknown-linux-musl` exists | `YES` |
| `DailyNoteSearcher-aarch64-unknown-linux-musl` has executable bit | `NO` |
| Release/debug target executable candidates exist | `NO` |
| Source `findExecutable()` checks candidate existence | `YES` |
| Source `findExecutable()` checks executable permission | `NO` |

## Diagnosis

Primary diagnosis:

`DAILYNOTESEARCHER_EXECUTABLE_BIT_MISSING`.

The request body shape is not the likely cause of the CM-1796 `http_5xx`
status. The parser extracts the tool name and argument keys correctly.

The likely failure path is:

1. `DailyNoteSearcher.js` searches for local executable candidates.
2. The only present candidate is `DailyNoteSearcher-aarch64-unknown-linux-musl`.
3. Source `findExecutable()` accepts a candidate by existence check only.
4. The candidate lacks executable permission on this Linux target.
5. The later service `spawn(...)` likely fails, causing the direct human-tool
   route to return `http_5xx`.

This is a source/metadata diagnosis. The exact runtime error string is not
known because logs and response bodies were not read.

## Next Safe Route

Next safe route:

`CM-1798 exact executable-bit repair and rerun status-only probe`.

The repair should be exactly scoped to:

```text
chmod +x Plugin/DailyNoteSearcher/DailyNoteSearcher-aarch64-unknown-linux-musl
```

Constraints:

- no `config.env` or `.env` read/edit
- no runtime logs or response bodies read
- no raw daily-note/knowledge/raw-store read
- no memory write/update/delete/supersede/tombstone
- no provider/API call by agent
- no public MCP expansion
- no release/deploy/cutover/push
- no readiness or M6 success claim unless the rerun returns a success status
  under the same low-disclosure rules

Rollback:

```text
chmod -x Plugin/DailyNoteSearcher/DailyNoteSearcher-aarch64-unknown-linux-musl
```

## Evidence

```yaml
cm1797_dailynotesearcher_failure_source_diagnosis:
  local_target_is_disposable_integration_target: true
  plan_package_preauthorization_context_applied: true
  source_only: true
  metadata_only: true
  parser_marker_extracted: true
  parser_tool_name: DailyNoteSearcher
  parser_arg_keys_present: true
  request_body_printed: false
  request_body_persisted: false
  runtime_started: false
  service_start_attempted: false
  route_called: false
  authenticated_probe_executed: false
  response_body_read: false
  stdout_read: false
  stderr_read: false
  runtime_logs_read: false
  config_env_content_read: false
  env_content_read: false
  secrets_read: false
  raw_memory_read_by_agent: false
  raw_store_read_by_agent: false
  provider_api_called_by_agent: false
  mcp_memory_tool_called: false
  memory_write_performed: false
  vcptoolbox_files_modified: false
  executable_candidate_present: true
  executable_candidate_has_execute_bit: false
  source_find_executable_checks_execute_permission: false
  primary_diagnosis: dailynotesearcher_executable_bit_missing
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
  m6_observe_lite_handshake_complete: false
  m15_unlocked: false
  next_action: cm1798_exact_executable_bit_repair_and_rerun_status_only_probe
```
