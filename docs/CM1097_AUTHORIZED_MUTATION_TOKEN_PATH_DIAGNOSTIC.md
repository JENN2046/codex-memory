# CM1097 Authorized Mutation Token Path Diagnostic

Status: `AUTHORIZED_MUTATION_TOKEN_PATH_DIAGNOSTIC_ACCEPTED_NO_TOKEN_RUNTIME_NOT_WRITTEN_NOT_READY`

Date: 2026-05-25

## Scope

CM-1097 is a local read-only diagnostic boundary after the CM-1096 rejected `record_memory` attempt.

It does not retry `record_memory`, does not call `search_memory`, does not read raw stores or raw audit logs, does not read or print token values, and does not edit config/watchdog/startup/dependency files.

## Source Finding

`src/adapters/codex-mcp/http.js` has two separate auth paths:

- If `bearerToken` is configured, invalid or missing `Authorization` is rejected as HTTP 401 before JSON-RPC handling.
- If `bearerToken` is not configured, local no-token mode is allowed for read-only use, but `validateNoTokenJsonRpcRequest(...)` rejects mutation tools such as `record_memory` with `NO_TOKEN_MUTATION_REJECTED`.

Therefore the CM-1096 returned error shape `-32001 / NO_TOKEN_MUTATION_REJECTED` is diagnostic evidence that the active runtime path used by the MCP tool was still the no-token HTTP MCP mutation gate.

## Diagnostic Result

Accepted diagnosis:

```text
active_runtime_token_path: no_token_http_mcp_mutation_gate
bearer_authorized_tool_request_confirmed: false
bearer_token_configured_on_active_runtime_confirmed: false
write_accepted: false
retry_allowed: false
required_next_boundary: fresh_bearer_authorized_tool_path_then_fresh_exact_write_approval
```

## Boundary

CM-1097 does not authorize:

- `record_memory` retry
- `search_memory`
- provider/API calls
- raw memory, direct `.jsonl`, or raw audit reads
- token value read/print/injection
- `.env`, Codex config, Claude config, startup, watchdog, or dependency changes
- public MCP expansion
- push/tag/release/deploy
- readiness or reliability claim

## Required Next

Before any future write attempt:

1. Establish a bearer-authorized MCP mutation path that the actual tool request will use.
2. Verify that path without printing token values or mutating memory.
3. Generate a fresh exact approval packet.
4. Receive fresh exact approval.

CM-1096 must not be reused.
