# CM-1042 HTTP Health Write Reconcile Worker Status

Status: `COMPLETED_VALIDATED_HTTP_HEALTH_WRITE_RECONCILE_WORKER_STATUS_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Purpose

Expose a bounded internal write reconcile worker status summary through HTTP `/health` without adding a public MCP tool, starting the worker, changing startup/watchdog/config, or claiming runtime readiness.

## Change

- `src/adapters/codex-mcp/http.js` now includes `runtime.writeReconcileWorker` in `/health`.
- The status summary is limited to:
  - `available`
  - `running`
  - `timerScheduled`
  - `tickInFlight`
  - `runCount`
  - `intervalMs`
  - `limit`
  - `dryRun`
  - `maxRuns`
  - `lastResultSummary`
- Missing worker/status support returns a safe unavailable snapshot instead of throwing.
- `tests/mcp-http.test.js` verifies `/health` exposes the bounded shape from a current-source HTTP server and does not start the worker.

## Validation

- `node --check .\src\adapters\codex-mcp\http.js`
- `node --check .\tests\mcp-http.test.js`
- `node --test .\tests\mcp-http.test.js` passed `16/16`
- Adjacent HTTP observe/MCP/worker bundle passed `52/52`
- Full `npm test` passed `2493/2493`
- `npm run start:http:ensure` reported the existing local HTTP MCP service healthy at `http://127.0.0.1:7605/health`
- `npm run observe:http -- --json` reported summary status `ok`, health status `ok`, HTTP status `200`, and service name `vcp_codex_memory`

## HTTP Observe Boundary

The current 7605 live service was already running before this change. Its observed `/health` payload did not include `runtime.writeReconcileWorker`, so CM-1042 does not claim live deployed new-field evidence from that existing process.

CM-1042's new field is validated by the current-source HTTP test server in `tests/mcp-http.test.js`. The live observe result only proves the existing local HTTP MCP process remained healthy during the slice.

## Boundary

```text
public MCP expansion = false
public memory_write_reconcile_worker tool = false
worker starts by health probe = false
worker starts by default = false
startup reconcile execution = false
watchdog/startup/config change = false
true live record_memory calls = 0
true live search_memory calls = 0
provider/API calls = 0
real memory writes = 0
package/dependency change = false
readiness claim = false
reliability claim = false
```

## Impact

CM-1042 improves operator visibility for the existing internal default-disabled write reconcile worker surface. It does not prove broad write reliability, automatic degraded recovery, startup reconcile safety, long-running worker durability, rollback readiness, governance closure, runtime readiness, RC readiness, production readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
