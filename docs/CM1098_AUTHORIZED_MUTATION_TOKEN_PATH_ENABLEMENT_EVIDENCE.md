# CM1098 Authorized Mutation Token Path Enablement Evidence

Status: `AUTHORIZED_MUTATION_TOKEN_PATH_ENABLED_NO_MEMORY_WRITE_NOT_READY`

Date: 2026-05-25

## Scope

CM-1098 fixes the local Codex Desktop MCP connector / HTTP MCP bearer authorization path after CM-1097 diagnosed the active runtime as no-token mutation gate.

This evidence records configuration shape and runtime health only. It does not authorize or execute `record_memory`.

## Actions Performed

- Created a backup of user-level Codex config:
  - `C:\Users\617\.codex\config.toml.bak-cm1098-20260525-175037`
- Updated user-level Codex config:
  - `C:\Users\617\.codex\config.toml`
  - Added `bearer_token_env_var = "CODEX_MEMORY_HTTP_TOKEN"` under `[mcp_servers.vcp_codex_memory]`
- Created `CODEX_MEMORY_HTTP_TOKEN` in Windows user environment because it was absent.
- Did not print, persist in repo, or copy the token value into docs/status/board.
- Restarted the local loopback HTTP MCP process through the existing repository ensure script.
- Verified `/health` reports:
  - `ok=true`
  - `name=vcp_codex_memory`
  - `auth.required=true`
  - `auth.warning` absent
- Performed direct bearer-authenticated HTTP MCP read-only handshake:
  - `initialize` succeeded
  - `tools/list` succeeded
  - tools visible: `record_memory`, `search_memory`, `memory_overview`

## Explicit Non-Actions

- No `record_memory` call.
- No `search_memory` call.
- No raw memory, direct `.jsonl`, or raw audit read.
- No provider/API call.
- No dependency change.
- No public MCP expansion.
- No watchdog install/update/remove.
- No scheduled task or HKCU Run startup change.
- No push/tag/release/deploy.
- No readiness or reliability claim.

## Result

The service-side and user-level connector configuration now point at the same bearer token environment variable:

```text
CODEX_MEMORY_HTTP_TOKEN
```

Current local HTTP MCP runtime is no longer in no-token mode:

```text
auth.required=true
```

The current Codex Desktop process may need a restart or connector reload before its already-open MCP tool session picks up the new user environment variable. A future `record_memory` write still requires a fresh exact approval packet and exactly one approved write attempt.
