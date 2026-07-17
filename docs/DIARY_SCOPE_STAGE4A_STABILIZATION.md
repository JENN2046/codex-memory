# Diary scope Stage 4A stabilization

This low-disclosure record covers the authorized local stabilization and
recovery drill after diary-partition v1 Stage 3B. It does not publish diary
names, mapping contents, the exact mapping digest, runtime credentials, raw
memory, provider responses, or private runtime logs.

## Stabilization result

```yaml
baseline_main: 97608a6b7789a474748b3af4878fe981f259ca65
local_service_restart: pass
health_after_restart: pass
controlled_http_mcp_timeout_ms: 60000
mapping_mismatch_fail_closed: pass
mismatch_provider_calls: 0
rollback_binding_restore: pass
task_start_recall_after_restore: non_empty
accelerated_soak_runs: 3
accelerated_soak_live_reads: 30
accelerated_soak_passed: true
codex_claude_isolation: pass
project_workspace_shared_behavior: pass
unscoped_native_search_count: 0
live_primary_memory_writes: 0
public_native_write_surface_enabled: false
raw_disclosure: false
```

The mismatch drill first demonstrated that a native JSON-RPC scope-binding
rejection could be treated as local-fallback eligible by the bridge. The repair
now makes governance, scope authorization, mapping binding, and result
post-check failures ineligible for local fallback. A mismatch rejects the
task-start request before provider use; restoring the retained startup binding
returns the same probe to non-empty native recall.

Native failures now use bounded categories for transport timeout, unavailable
transport, HTTP failure, invalid response, provider embedding, runtime
initialization, selected-diary search, and result-scope post-check. Receipts do
not include raw error messages, provider bodies, endpoints, tokens, mapping
values, diary names, or paths.

## Evidence boundary

The three-run soak is an accelerated local stability sample, not a 24–72 hour
unattended observation claim. Private per-run artifacts remain outside Git.
The four governed partitions and the 13 excluded legacy partitions were not
modified. No VCPToolBox core code, public MCP schema, production service,
release, deploy, migration, or cutover was changed.

```yaml
production_ready_claimed: false
release_ready_claimed: false
deploy_ready_claimed: false
cutover_ready_claimed: false
long_duration_soak_claimed: false
```
