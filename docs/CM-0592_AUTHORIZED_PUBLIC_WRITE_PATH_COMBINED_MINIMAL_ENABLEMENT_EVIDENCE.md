# CM-0592 Authorized Public Write-Path Combined Minimal Enablement Evidence

Phase: `CM-0592-authorized-public-write-path-combined-minimal-enablement`

Mode: `A5-approved bounded prerequisite enablement`

Risk: `A5-approved local startup-and-health evidence without write validation`

Decision: `AUTHORIZED_PUBLIC_WRITE_PATH_MINIMAL_ENABLEMENT_NOT_READY`

## Approval Boundary

User approval:

```text
授权执行 CM-0590，target baseline = 017eda4930c5add4b824c162c46868f75c91ea0f，只允许 AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_001，只允许在当前 session 内检查或绑定 CODEX_MEMORY_HTTP_TOKEN（不得打印、不得持久化）、执行 exactly one `npm run start:http:ensure`、并对 loopback `/health` 做 exactly one bounded probe；禁止 record_memory / search_memory / marker search / observe:http / .jsonl read / provider / config change / watchdog or startup persistence / public MCP expansion / durable write / readiness claim。
```

Verified target baseline before execution:

```text
branch: main
HEAD: 017eda4930c5add4b824c162c46868f75c91ea0f
origin/main: 017eda4930c5add4b824c162c46868f75c91ea0f
remote main: 017eda4930c5add4b824c162c46868f75c91ea0f
```

## Approved Checks and Actions

The approved execution performed only:

```yaml
token_presence_check:
  tokenPresent: false
  tokenLength: 0
token_session_bound_during_execution: false
start_http_ensure:
  attempted: true
  exitCode: 0
  resultSummary: "codex-memory HTTP MCP started (pid=14152) at http://127.0.0.1:7605/health"
loopback_health_probe:
  endpoint: "http://127.0.0.1:7605/health"
  reachable: true
```

No token value was printed.

No token was persisted.

## Result

```yaml
unit: AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_001
targetBaseline: 017eda4930c5add4b824c162c46868f75c91ea0f
tokenPresentBefore: false
tokenSessionBoundDuringExecution: false
startupAttempted: true
endpointHealthyAfterEnsure: true
recordMemoryCalled: false
searchMemoryCalled: false
jsonlReadPerformed: false
providerCalled: false
readinessClaimed: false
result: AUTHORIZED_PUBLIC_WRITE_PATH_MINIMAL_ENABLEMENT_NOT_READY
remainingBlockers:
  - AUTHORIZED_PUBLIC_WRITE_PATH_BLOCKED_TOKEN_MISSING
clearedByThisExecution:
  - AUTHORIZED_PUBLIC_WRITE_PATH_BLOCKED_ENDPOINT_MISSING
  - AUTHORIZED_PUBLIC_WRITE_PATH_BLOCKED_STARTUP_OR_INJECTION_APPROVAL_MISSING
```

Interpretation:

- the endpoint is now healthy on the approved loopback boundary
- the startup-or-injection approval boundary was consumed for the bounded local startup step
- the current session still has no `CODEX_MEMORY_HTTP_TOKEN`
- therefore the authorized public write path is still not ready for write validation

## Safety Boundary

```yaml
record_memory_called: false
search_memory_called: false
marker_search_called: false
observe_http_called: false
provider_called: false
token_persisted: false
config_changed: false
startup_persistence_changed: false
jsonl_read_performed: false
public_mcp_expanded: false
durable_memory_written: false
durable_audit_written: false
remote_write: false
runtime_ready: false
final_rc_matrix_ready: false
v1_rc_ready: false
rc_ready: false
```

## Next Safe Step

Keep `RC_NOT_READY_BLOCKED`.

Do not execute write validation from this evidence alone.

The remaining missing prerequisite is now the current-session token boundary only.
