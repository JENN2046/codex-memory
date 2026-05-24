# CM-1044 HTTP Observe Current-Source Refresh Worker Status

Status: `COMPLETED_VALIDATED_HTTP_OBSERVE_CURRENT_SOURCE_REFRESH_WORKER_STATUS_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Purpose

Add controlled current-source HTTP refresh evidence for the CM-1042/CM-1043 worker-status path without touching the existing 7605 service, startup, watchdog, config, public MCP tools, real memory stores, or readiness claims.

## Change

- `tests/http-observe-cli.test.js` now starts a temporary current-source `createStreamableHttpServer(...)` on port `0`.
- The test points `http-observe` at that temporary port with isolated runtime artifact paths.
- The temporary current-source `/health` response includes `runtime.writeReconcileWorker`.
- `observe:http` verifies the worker field is available, the worker is stopped, run count is `0`, no timer or in-flight tick is present, and no `memoryId` appears in the summarized runtime surface.
- The test verifies the health/observe path does not start the internal worker.

## Validation

- `node --check .\tests\http-observe-cli.test.js`
- `node --test .\tests\http-observe-cli.test.js` passed `18/18`
- Adjacent HTTP observe/MCP/worker bundle passed `53/53`
- Full `npm test` passed `2494/2494`

## Boundary

This is controlled test-runtime evidence only. The test starts and closes a temporary current-source HTTP server on an ephemeral local port. It does not restart, replace, or mutate the existing 7605 process.

```text
existing 7605 service changed = false
startup/watchdog/config change = false
public MCP expansion = false
public memory_write_reconcile_worker tool = false
worker starts by health = false
worker starts by observe = false
worker starts by default = false
true live record_memory calls = 0
true live search_memory calls = 0
provider/API calls = 0
package/dependency change = false
readiness claim = false
reliability claim = false
```

## Impact

CM-1044 closes the narrow CM-1042/CM-1043 evidence gap between fixture health payloads and current-source HTTP behavior by proving a freshly started current-source HTTP server exposes the bounded worker health field and `observe:http` consumes it safely.

It does not prove broad write reliability, automatic degraded recovery, startup reconcile safety, long-running worker durability, real cleanup safety, real rollback safety, governance closure, rollback readiness, runtime readiness, RC readiness, production readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
