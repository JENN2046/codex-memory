# CM-0560 Search Memory Timeout Boundary

Status: CM_0560_COMPLETED_NOT_RECALL_READY
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-20

## Purpose

This note records the CM-0560 targeted runtime boundary for the previously observed `search_memory` timeout.

It does not claim memory recall reliability, runtime readiness, production readiness, RC readiness, or cutover readiness.

It does not call true live `search_memory`.

It does not read `.jsonl` audit files or real memory content.

It does not run provider calls, broad real memory scans, durable memory writes, durable audit writes, config switches, watchdog/startup changes, migration/import/export/backup/restore apply, public MCP expansion, push, tag, release, deploy, or cutover.

## What Changed

CM-0560 adds an app-level timeout boundary around the `search_memory` tool dispatch.

Changed runtime surface:

```text
src/core/SearchMemoryTimeoutPolicy.js
src/config/createConfig.js
src/adapters/codex-mcp/server.js
src/app.js
```

Changed test surface:

```text
tests/mcp-contract.test.js
```

The timeout boundary:

- defaults to `30000` ms
- can be overridden by `CODEX_MEMORY_SEARCH_TIMEOUT_MS` or `searchMemoryTimeoutMs`
- preserves the public MCP tool set
- returns a JSON-RPC compatible error through the MCP server
- avoids exposing raw query text, raw request, path, env, token, provider metadata, or private memory content in timeout error data

The timeout JSON-RPC error shape is:

```json
{
  "jsonrpc": "2.0",
  "id": "<request id>",
  "error": {
    "code": -32002,
    "message": "Search memory timeout",
    "data": {
      "code": "SEARCH_MEMORY_TIMEOUT",
      "reason": "search_memory exceeded the configured timeout.",
      "timeoutMs": 30000
    }
  }
}
```

## Validation Evidence

Commands run:

```powershell
node --check .\src\core\SearchMemoryTimeoutPolicy.js
node --check .\src\config\createConfig.js
node --check .\src\app.js
node --check .\src\adapters\codex-mcp\server.js
node --check .\tests\mcp-contract.test.js
node --test .\tests\mcp-contract.test.js
node --test .\tests\phase-b-passive-recall.test.js
```

Observed results:

```text
SearchMemoryTimeoutPolicy syntax: passed
createConfig syntax: passed
app syntax: passed
MCP server syntax: passed
MCP contract test syntax: passed
MCP contract tests: 8/8 passed
Phase B passive recall tests: 4/4 passed
```

The new timeout test uses a mocked `passiveRecallService.search` that never resolves and a 5 ms local timeout override. It verifies:

- the MCP response stays JSON-RPC compatible
- the request id is preserved
- `error.code` is `-32002`
- `error.message` is `Search memory timeout`
- `error.data.code` is `SEARCH_MEMORY_TIMEOUT`
- timeout data includes only the configured timeout value and sanitized reason
- raw query content is not present in the serialized error response

## Remaining Risks

CM-0560 controls the client-visible timeout failure shape, but it does not prove full recall reliability.

Known remaining limits:

- the underlying in-flight recall promise is not cancelled by this wrapper
- deeper recall layers may still need their own timeout, cancellation, or side-effect isolation boundaries
- candidate cache, embedding cache, and recall audit side effects still require separate bounded evidence
- true live `search_memory` validation remains an exact-approval action
- broad real-memory recall proof remains blocked

## Current State

```text
memory write reliable: not claimed
memory recall reliable: not claimed
runtime ready: not claimed
RC ready: not claimed
production ready: not claimed
controlling status: RC_NOT_READY_BLOCKED
```

## Next Safe Action

Continue Phase 1 Foundation Reliability by deciding whether CM-0561 should add a deeper cancellation/AbortSignal policy for the recall path, or prepare an exact-approval packet for bounded recall validation.

Do not execute true live recall validation without exact approval.
