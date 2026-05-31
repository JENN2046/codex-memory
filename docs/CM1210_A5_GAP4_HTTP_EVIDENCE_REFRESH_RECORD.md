# CM1210 A5-GAP-4 HTTP Evidence Refresh Record

Date: 2026-05-31

Status: `PARTIAL_BLOCKED_AUTH_REQUIRED_NOT_READY`

## Scope

User-approved `A5-GAP-4` for:

```text
branch = main
commit = db5a4d66cf472d35e80b12d512816cda5de09220
endpoint = http://127.0.0.1:7605
config/watchdog/startup change = no
```

No remote write, config change, watchdog/startup change, provider call, public MCP expansion, durable memory write, durable audit write, real memory scan, tag, release, deploy, cutover, or readiness claim was authorized or executed.

## Fresh Preflight

Fresh preflight matched the approval:

- branch: `main`
- `HEAD`: `db5a4d66cf472d35e80b12d512816cda5de09220`
- tracked worktree: clean
- untracked and untouched: `CLAUDE.md`, `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md`

## Commands Executed

```powershell
git status --short --branch
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git log --oneline --decorate -n 8
git diff --stat
git diff --check
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health' -Method Get
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/mcp/codex-memory' -Method Post -ContentType 'application/json' -Body <initialize-json>
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/mcp/codex-memory' -Method Post -ContentType 'application/json' -Body <tools-list-json>
npm run observe:http -- --json --health-url http://127.0.0.1:7605/health --tail 1 --audit-tail 1
```

## Evidence Summary

Health:

- `ok=true`
- service name: `vcp_codex_memory`
- protocol: `streamable-http`
- MCP path: `/mcp/codex-memory`
- auth required: `true`
- write reconcile worker field available: `true`
- write reconcile worker running: `false`
- timer scheduled: `false`
- tick in flight: `false`
- run count: `0`

HTTP observe:

- status: `ok`
- message: HTTP MCP runtime looks healthy
- health status: `ok`
- HTTP log error count: `0`
- watchdog recovery count: `0`
- watchdog ensure failure count: `0`
- watchdog log exists: `false`
- governance status: `ok`
- governance review level: `nominal`
- read policy status: `config_only_no_recent_audit`
- `noProvider=true`
- `mutated=false`
- `migrationApplied=false`

MCP initialize and tools/list:

- unauthenticated requests returned Unauthorized
- response reason: missing or invalid bearer token
- no bearer token was read, printed, or used
- public tool list was not obtained in this run

## Decision

This is partial endpoint-bound HTTP evidence only.

`A5-GAP-4` remains blocked for authenticated MCP tool-list evidence because the approval did not authorize reading or using token material.

This record does not prove runtime readiness, RC readiness, production readiness, cutover readiness, write reliability, recall reliability, or `RC_READY`.

## Next Exact Approval Candidate

If authenticated MCP `initialize` / `tools/list` evidence is required, use a separate approval that explicitly allows using an already-present current-session bearer token without printing or persisting it.

Example shape:

```text
I approve A5-GAP-4 authenticated MCP initialize/tools-list evidence for codex-memory on branch main at commit <COMMIT>, endpoint http://127.0.0.1:7605, using current-session bearer token if already present, without printing or persisting token material, no config/watchdog/startup change, no tools/call.
```
