# Phase E Mainline Rollback Drill 01

## Summary

- Drill type: real reversible rollback drill
- Current mainline before drill: `http://127.0.0.1:7605/mcp/codex-memory`
- Rollback target: `http://127.0.0.1:6005/mcp/codex-memory`
- Config file: `C:\Users\617\.codex\config.toml`
- Backup file: `C:\Users\617\.codex\config.toml.rollback-drill-20260423-180107.bak`

## Steps

1. Backed up `C:\Users\617\.codex\config.toml`
2. Replaced `[mcp_servers.vcp_codex_memory]` URL from `7605` to `6005`
3. Verified donor MCP `initialize`
4. Verified donor MCP `tools/list`
5. Restored `[mcp_servers.vcp_codex_memory]` URL from `6005` to `7605`
6. Re-verified mainline MCP `initialize`
7. Ran `npm run gate:mainline`

## Donor Validation

- `initialize`
  - HTTP status: `200`
  - server name: `vcp_codex_memory`
  - protocol version: `2025-03-26`
  - session header: present
- `tools/list`
  - HTTP status: `200`
  - tools: `record_memory`, `search_memory`, `memory_overview`

## Restore Validation

- `config.toml` restored to `http://127.0.0.1:7605/mcp/codex-memory`
- mainline `initialize`
  - HTTP status: `200`
  - server name: `vcp_codex_memory`
  - protocol version: `2025-03-26`
  - session header: present
- `npm run gate:mainline`
  - status: `ok`
  - compare: `25/25 matched`
  - rollback: `25/25 rollback-safe`

## Result

- The rollback path is no longer only documented or probeable.
- A real config switch to donor and a real switch back to mainline have both been executed successfully.
- No residual config drift remained after restore.
