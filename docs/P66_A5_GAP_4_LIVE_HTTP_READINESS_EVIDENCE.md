# P66 A5-GAP-4 Live HTTP Readiness Evidence

Date: `2026-05-19`

Decision: `ENDPOINT_BOUND_PASSED_WITH_WARNINGS_NOT_RUNTIME_READY`

Endpoint: `http://127.0.0.1:7605`

Approved target commit: `53554c174b8b270c7bf792a368a3f4c249044b1d`

## Approval

The user provided the exact approval line:

```text
I approve A5-GAP-4 for codex-memory on branch main at commit 53554c174b8b270c7bf792a368a3f4c249044b1d, endpoint http://127.0.0.1:7605, no config/watchdog/startup change.
```

## Scope

This evidence is limited to live HTTP readiness for the approved endpoint and commit.

Allowed:

- read-only `/health` probe
- read-only MCP `initialize`
- read-only MCP `tools/list`
- read-only `http-observe` summary against the approved health URL

Not allowed and not performed:

- config change
- watchdog install, update, start, stop, or repair
- startup item change
- provider/model call
- `record_memory` or any other mutation tool call
- real memory content scan, preview, import, export, or migration
- durable memory or audit write
- public MCP tool expansion
- push, tag, release, deploy, RC cutover, or `RC_READY` claim

## Preflight

```text
branch: main
HEAD: 53554c174b8b270c7bf792a368a3f4c249044b1d
origin/main: a9177d5 fix: tighten review patch safety semantics
ahead: 5 local commits
worktree: clean before execution
diff: empty before execution
```

## Commands

```powershell
git status --short --branch
git rev-parse HEAD
git diff --stat
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health' -Method Get
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/mcp/codex-memory' -Method Post -ContentType 'application/json' -Body <tools/list json-rpc>
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/mcp/codex-memory' -Method Post -ContentType 'application/json' -Body <initialize json-rpc>
node .\src\cli\http-observe.js --json --health-url http://127.0.0.1:7605/health
```

Only sanitized summary fields were retained in this evidence document.

## Evidence Summary

| Check | Result |
|---|---|
| `/health` reachable | `ok=true` |
| service name | `vcp_codex_memory` |
| protocol | `streamable-http` |
| MCP path | `/mcp/codex-memory` |
| auth required on this endpoint | `false` |
| MCP `initialize` | passed |
| negotiated protocol version | `2025-03-26` |
| MCP tools capability | present |
| MCP `tools/list` public count | `3` |
| MCP public tools | `memory_overview`, `record_memory`, `search_memory` |
| public MCP surface frozen | `true` |
| `http-observe` health status | `ok` |
| `http-observe` HTTP status | `200` |
| `http-observe` summary status | `warn` |
| `http-observe` HTTP log errors | `0` |
| `http-observe` watchdog ensure failures | `0` |
| `http-observe` watchdog recoveries | `9` |
| raw workspace id exposed | `false` |

The warning is due to historical watchdog recovery count in the observe summary. It does not indicate a current `/health` failure, HTTP log error, or watchdog ensure failure in this probe.

## Result

`A5-GAP-4` has endpoint-bound live HTTP readiness evidence for:

```text
commit: 53554c174b8b270c7bf792a368a3f4c249044b1d
endpoint: http://127.0.0.1:7605
```

This closes the live HTTP readiness proof for this endpoint and commit as:

```text
ENDPOINT_BOUND_PASSED_WITH_WARNINGS
```

It does not claim:

- production readiness
- config/watchdog/startup readiness
- final RC readiness
- v1.0 RC readiness
- cutover readiness
- `RC_READY`

If the endpoint, target commit, config, startup path, watchdog path, or runtime deployment context changes, this evidence must be refreshed under a new explicit approval.
