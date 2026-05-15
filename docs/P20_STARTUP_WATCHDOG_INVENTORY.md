# P20.1 Startup / Watchdog Inventory

Phase: `P20.1-startup-watchdog-inventory`

Status: inventory

## Purpose

Inventory existing startup, HTTP MCP, and watchdog surfaces before any local production hardening implementation.

This phase is docs/status/board only. It does not install services, create scheduled tasks, edit HKCU Run, mutate Codex or Claude configuration, start long-running services, call providers, read real memory previews, create backups, run migrations, apply import/export, or change runtime behavior.

## Current Entrypoints

| Surface | File or script | Current role | Side effects when executed |
|---|---|---|---|
| `npm run start:http` | `src/http-index.js` | Starts HTTP MCP in the current process. | Starts a foreground Node process; initializes app stores according to normal runtime configuration. |
| `npm run start:http:ensure` | `scripts/ensure-codex-memory-http.ps1` | Checks `/health`; starts HTTP MCP only if unhealthy. | May start hidden Node process via `Start-Process`; does not install startup entries. |
| `npm run start:http:install-task` | `scripts/install-codex-memory-http-task.ps1` | Installs per-user logon startup for HTTP MCP ensure script. | Writes Windows scheduled task or HKCU Run fallback. Hard stop without explicit approval. |
| `npm run start:http:watchdog:once` | `scripts/watch-codex-memory-http.ps1 -Once` | Runs one watchdog loop around the ensure script. | May start HTTP MCP if unhealthy; writes `logs/codex-memory-http-watchdog.log`. |
| `npm run start:http:watchdog:ensure` | `scripts/ensure-codex-memory-http-watchdog.ps1` | Starts watchdog if not already running. | Starts hidden PowerShell watchdog process. Not an install, but it creates a long-running local process. |
| `npm run start:http:watchdog:install` | `scripts/install-codex-memory-http-watchdog.ps1` | Installs per-user logon startup for watchdog. | Writes Windows scheduled task or HKCU Run fallback. Hard stop without explicit approval. |
| `scripts/serve-codex-memory-http.js` | Node wrapper | Bootstraps selected user environment variables, changes cwd to repo root, then loads `src/http-index.js`. | Reads HKCU environment values through `reg.exe`; starts HTTP MCP runtime. |

## HTTP MCP Runtime Surface

Current HTTP MCP runtime facts from source:

- Default host: `127.0.0.1`.
- Default port: `7605`.
- MCP path defaults to `/mcp/codex-memory`.
- Health path is `/health`.
- Non-loopback host without `CODEX_MEMORY_HTTP_TOKEN` fails fast.
- Loopback host without bearer token is allowed with a local-development warning.
- Public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`.

## Script Behavior Notes

`ensure-codex-memory-http.ps1`:

- checks health before starting anything
- locates `node`
- starts `scripts/serve-codex-memory-http.js` hidden when health fails
- waits up to 20 seconds for health

`watch-codex-memory-http.ps1`:

- uses mutex `CodexMemoryHttpMcpWatchdog` to avoid duplicate watchdog instances
- enforces minimum interval of 15 seconds
- writes watchdog log lines
- can run once or loop forever
- delegates service recovery to `ensure-codex-memory-http.ps1`

Install scripts:

- first try `schtasks.exe /Create /F /TN ... /SC ONLOGON`
- fall back to `HKCU:\Software\Microsoft\Windows\CurrentVersion\Run`
- write user startup state and therefore require explicit approval

## Risk Register

| Risk | Surface | Current boundary |
|---|---|---|
| Hidden long-running process | `start:http:ensure`, `start:http:watchdog:ensure` | Allowed only when explicitly scoped as runtime validation or operation; not part of this inventory. |
| User startup mutation | `start:http:install-task`, `start:http:watchdog:install` | Hard stop; requires explicit approval and rollback story. |
| HKCU Run fallback mutation | install scripts | Hard stop; must not run casually. |
| Real Codex / Claude config mutation | external config paths | Hard stop; not part of P20.1. |
| Log writes | watchdog script | Acceptable only in runtime validation phases; this inventory does not run watchdog. |
| Provider calls | provider smoke/benchmark | Out of scope. |
| Real data mutation | memory, DB, diary, import/export, migration | Out of scope. |

## Safe Read-Only Review Surfaces

The following are appropriate for P20.2 planning/evidence, if explicitly scoped:

- inspect scripts and package scripts
- `git diff --check`
- docs validation
- optional `npm run observe:http -- --json` only when runtime observation is explicitly in scope
- optional `npm run rollback:mainline:plan -- --json` only as read-only planning
- optional `npm run gate:ci -- --json` as fixture-only CI-safe validation

P20.1 did not run runtime observation, watchdog, install scripts, provider commands, backup commands, migration commands, or real-memory preview commands.

## Approval Requirements Before Any Install

Any future startup/watchdog installation phase must include:

- exact phase name
- exact command to run
- target scheduled task or HKCU Run value
- rollback command or manual removal path
- expected log path
- validation commands
- stop conditions
- explicit user approval

## Inventory Gaps

- No checked-in uninstall script is currently identified for startup/watchdog tasks.
- No dry-run mode is available for install scripts.
- Current install scripts overwrite the named scheduled task with `/F`.
- HKCU Run fallback is documented as risky and must preserve existing startup entries.
- P20.2 should focus on health/readiness evidence before any install or config mutation is considered.

## Validation

Docs-only inventory validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Next Recommended Phase

`P20.2-health-readiness-dry-run-evidence`
