# CM-1531 Live Runtime Low-Disclosure Mismatch Diagnosis

## Goal

Diagnose why CM-1530 observed old no-bearer live runtime low-disclosure shapes after CM-1527 source hardening and CM-1529 runner alignment had passed source-side tests.

This is a diagnosis record only. It does not rerun live proof closeout, close the live client evidence blocker, execute effective writes, call provider/API, use bearer-token material, perform raw memory/audit/broad scan, execute confirmed mutation, expand public MCP tools, release/tag/deploy, or claim readiness / `RC_READY`.

## Diagnosis Summary

Decision: `STALE_LIVE_HTTP_RUNTIME_IS_PRIMARY_HYPOTHESIS`

Observed facts:

```text
source no-token JSON-RPC rejection shape: PUBLIC_REQUEST_BLOCKED / rejected / blocked
source memory_overview selected projection: public_selected_overview / version 2
source runner public tools expectation: seven tools
live CM-1530 tools/list: seven tools
live CM-1530 no-token rejection: old NO_TOKEN_* shaped code/reason
live CM-1530 memory_overview projection: old no_token_selected_overview / version 1
```

Runtime inspection found the `7605` listener owned by a Node process running:

```text
scripts/serve-codex-memory-http.js
```

The process creation timestamp predates the CM-1527 and CM-1529 source commits in the local Git history inspected during this diagnosis. The startup helper `scripts/ensure-codex-memory-http.ps1` returns success when `/health` is already healthy, and does not bind the running process to the current Git `HEAD`, source file hash, or commit freshness.

## Route / Path Trace

| Area | Diagnosis |
|---|---|
| `src/adapters/codex-mcp/http.js` no-token JSON-RPC rejection | Current source uses `createForbiddenJsonRpcPayload(...)` with `PUBLIC_REQUEST_BLOCKED`, `status=rejected`, and `reason=blocked`. |
| `src/core/MemoryOverviewService.js` selected overview | Current source uses `getNoTokenSelectedOverview(...)` with `mode=public_selected_overview`, `selectedProjectionVersion=2`, `publicAccess=blocked`, and `detailFieldsReturned=false`. |
| `tests/mcp-http.test.js` coverage | Current HTTP tests exercise in-process `createStreamableHttpServer(...)`, not the long-running `7605` process. |
| `scripts/serve-codex-memory-http.js` runtime entry | Runtime entry requires `src/http-index.js` from the working tree at process startup. Already-running Node processes keep loaded modules until restarted. |
| `scripts/ensure-codex-memory-http.ps1` startup behavior | If `/health` is already healthy, it prints already healthy and exits without restarting or validating current source freshness. |
| CM-1530 live endpoint | The endpoint can expose seven public tools while still serving old no-token/memory_overview code if the live process was started after seven-tool registration but before low-disclosure hardening. |

## Test Evidence

Added `tests/live-runtime-low-disclosure-mismatch-diagnosis.test.js`.

The test is static/source-level and does not execute live client calls. It verifies:

- current source no-token rejection shape uses `PUBLIC_REQUEST_BLOCKED`
- current source `memory_overview` selected projection is v2
- current HTTP tests cover the current source shape
- `ensure-codex-memory-http.ps1` can leave a healthy already-running process in place without current-HEAD/source freshness checks
- `serve-codex-memory-http.js` loads `src/http-index.js` at process startup, so stale loaded modules are plausible until restart

## Finding

`CM-1531_FINDING: LIVE_RUNTIME_PROCESS_FRESHNESS_NOT_PROVEN`

The mismatch is best explained by stale live HTTP runtime process freshness rather than by the current source/tests lacking CM-1527/CM-1529 hardening.

This diagnosis does not authorize restart, watchdog/config changes, or another live proof rerun. A future task may either:

1. create an exact runtime refresh / freshness proof envelope, or
2. add a local freshness diagnostic that exposes only bounded, non-sensitive current-source identity.

## Blocker Effect

```text
live client evidence blocker: STILL_OPEN
effective write reliability blocker: OPEN / DEFERRED
RC_READY: BLOCKED
status: NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED
```

## Boundary Confirmation

```text
live_client_proof_closeout: 0
live_client_blocker_closed: false
effective_write_blocker_closed: false
effective_record_memory_writes: 0
provider_api_calls: 0
bearer_token_use: 0
raw_memory_scan: 0
raw_audit_scan: 0
broad_memory_scan: 0
confirmed_mutation: 0
public_mcp_expansion: 0
release_tag_deploy: 0
readiness_claim: false
rc_ready_claim: false
```

## Next Route

Recommended next route: prepare an exact runtime refresh / no-bearer proof retry envelope that explicitly allows stopping/restarting only the local loopback `codex-memory` HTTP MCP process, or add a bounded runtime freshness probe first. Until then, do not close the live client evidence blocker.
