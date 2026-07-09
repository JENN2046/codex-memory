# VCP Memory Observe-Lite CM1788 Startup Failure Source Diagnosis

Task id: `M6-OBSERVE-LITE-STARTUP-FAILURE-SOURCE-DIAGNOSIS`
Implementation slice: `CM-1788`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_CM1787_SERVICE_START_HANDSHAKE_RECEIPT.md`
Evidence type: `source-only-diagnosis`, `no-log`, `no-secret`,
`no-memory-result`, `no-approval-line`

## Boundary

CM-1788 diagnoses the CM-1787 startup result using source-only and low-disclosure
inspection.

It did not start VCPToolBox, read runtime logs, read `config.env` contents, read
secrets, read raw memory, read raw stores, call MCP memory tools, write memory,
call providers/APIs, expand public MCP tools, change config, release, deploy,
cut over, push, or claim readiness.

## Source-Only Checks

| Check | Result | Notes |
|---|---|---|
| `node --check server.js` | pass | Syntax is not the observed blocker |
| root package metadata summary | pass | dependencies and `node_modules` are present |
| selected dependency resolution | pass | key startup dependencies resolve |
| Rust Vexus bridge load check | pass | exports `VexusIndex` and `VexusWatcher` |
| `config.env` presence metadata | present | content was not read |
| `AdminPanel` root presence metadata | absent | source redirects `/AdminPanel` to a separate port; this is not proven fatal for main API |
| startup order review | complete | `app.listen` occurs only after heavy async initialization |

## Source Findings

```yaml
cm1788_source_diagnosis:
  source_only: true
  runtime_started: false
  runtime_logs_read: false
  config_env_content_read: false
  secrets_read: false
  raw_memory_read: false
  raw_store_read: false
  server_js_syntax_ok: true
  key_dependencies_resolve: true
  rust_vexus_loads: true
  config_env_file_present_metadata_only: true
  actual_port_value_known: false
  admin_panel_root_absent_metadata_only: true
  app_listen_before_initialization: false
  app_listen_after_initialization: true
  cm1787_probe_window_seconds: 12
  cm1787_probe_count: 3
  cm1787_process_stopped_by_agent: true
  primary_source_diagnosis: cm1787_window_too_short_to_prove_startup_failure
  secondary_source_risk: actual_port_may_differ_from_operator_endpoint
  log_read_required_now: false
  next_action: cm1789_extended_no_log_startup_window_before_log_read
```

## Key Source Evidence

`server.js` binds `const port = process.env.PORT` and calls `app.listen(port,
...)` only after `startServer()` finishes multiple asynchronous setup steps:
blacklist load, directory checks, model redirect config, semantic model router,
Agent manager, TVS manager, Toolbox manager, SarPrompt manager,
`knowledgeBaseManager.initialize()`, `tdbKnowledgeManager.initialize()`,
dynamic tool registry, plugin loading, service plugin initialization, static
plugin initialization, Python prewarm scheduling, emoji list cache loading, task
scheduler initialization, and `node-fetch` prewarm.

Therefore CM-1787's three status-only probes over approximately twelve seconds
do not prove startup failure. They prove only that the service did not become
reachable on the probed endpoint before the agent stopped the child process.

## Diagnosed Risks

| Risk | Status | Why it matters |
|---|---|---|
| Short startup window | likely | VCPToolBox performs heavy pre-listen initialization |
| Unknown actual port value | unresolved | actual `PORT` was not read from `config.env`; endpoint may be stale or mismatched |
| Pre-listen initialization exception | unresolved | source has multiple async initialization gates before `listen` |
| Missing Rust bridge | not supported by source check | bridge loads and exports expected symbols |
| Missing key dependencies | not supported by source check | selected dependencies resolve |
| AdminPanel root missing | low confidence as main blocker | main server redirects AdminPanel rather than serving it directly |

## Decision

CM-1788 does not need a log-read boundary yet. The best next step is an
extended no-log observe-lite startup window that allows the existing startup
sequence enough time to reach `app.listen`.

If the process exits early during that extended window, or remains unreachable
after the full window, then the next escalation should be an exact
low-disclosure log-read boundary limited to startup error class and final
startup phase, with no secrets, no raw memory, and no raw response bodies.

This does not complete M6 live target/handshake proof. It does not unlock M7,
M8, M15, RC review, release, deploy, cutover, or readiness.
