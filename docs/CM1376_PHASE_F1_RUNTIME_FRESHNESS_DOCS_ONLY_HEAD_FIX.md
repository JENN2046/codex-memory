# CM-1376 Phase F1 Runtime Freshness Docs-Only Head Fix

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_NOT_READY`

Decision: `NOT_READY_BLOCKED`

## Problem

CM-1375 exposed a flow bug:

1. The local HTTP runtime was refreshed successfully.
2. Runtime freshness accepted the listener for the approved runtime-affecting commit.
3. Recording the evidence created a newer docs/board commit.
4. The old freshness rule compared listener start time to `HEAD` commit time, so the docs-only evidence commit made the runtime look stale again.

That created a needless push/refresh loop.

## Fix

`phase-f1-runtime-freshness` now compares listener start time against the latest runtime-affecting commit time, not arbitrary `HEAD` time.

Runtime-affecting paths used by the CLI:

```text
src
scripts/serve-codex-memory-http.js
package.json
package-lock.json
```

Docs/status/board-only commits can still make Git unsynced, but they no longer imply the already-refreshed runtime is stale.

## Validation

- `node --check src\core\PhaseF1RuntimeFreshnessDiagnostic.js`
- `node --check src\cli\phase-f1-runtime-freshness.js`
- `node --check tests\phase-f1-runtime-freshness-diagnostic.test.js`
- `node --test tests\phase-f1-runtime-freshness-diagnostic.test.js`
- `node src\cli\phase-f1-runtime-freshness.js --json --pretty`
- `node --test tests\mcp-http.test.js tests\http-no-token-search-rejection.test.js`
- `git diff --check`
- `node .\scripts\validate_autopilot_ledger_consistency.js`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

The current CLI self-check still fails closed while this development worktree is dirty and local branch is ahead, but it no longer reports runtime stale for the docs-only evidence HEAD.

## Boundary

CM-1376 does not restart services, call MCP, call providers, read or write memory, write durable audit, change config/watchdog/startup, push, or claim readiness.

F1 still requires synced Git state and exact A5-GAP-4 approval before live no-write rerun.
