# CM-1662 Record Memory Strict Auth Stage 3 Local Stdio Runtime Candidate Evidence

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_RECORD_MEMORY_STRICT_AUTH_STAGE3_LOCAL_STDIO_RUNTIME_CANDIDATE_EVIDENCE_NO_PRODUCTION_ENABLEMENT`

## Scope

This slice adds local stdio MCP stage 3 strict runtime candidate evidence for `record_memory`.

It remains local and temp-backed. It does not edit `.env`, does not change runtime defaults, does not change startup/watchdog configuration, does not deploy, and does not enable strict auth in production.

## Added

- `tests/record-memory-strict-auth-stdio-runtime-candidate.test.js`

## Verified Behavior

The test uses temp-local application state plus in-memory stdio streams.

Accepted path:

- complete env policy sets `CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE=strict`
- trusted stdio env context provides all six fields
- app config effective mode is `strict`
- write service strict mode is `true`
- stdio `tools/call record_memory` succeeds when trusted context matches policy

Rejected path:

- trusted env `workspaceId` and `clientId` mismatch policy
- payload includes allowed-looking `project_id`, `workspace_id`, and `client_id`
- stdio `tools/call record_memory` rejects before persistence
- rejection reports field names only: `workspaceId`, `clientId`
- rejection returns `memoryId=null`, `filePath=null`, and `shadowWrite.status=skipped`
- public JSON-RPC response does not echo trusted or payload workspace/client values

## Boundaries

- local temp-backed runtime evidence: `YES`
- production strict mode enabled: `NO`
- default runtime changed: `NO`
- `.env` edit: `NO`
- startup/watchdog/config changed: `NO`
- provider/API called: `NO`
- raw/broad memory scan: `NO`
- public MCP expansion: `NO`
- push/PR/release/deploy/cutover: `NO`
- production/release/cutover ready: `NO`
- complete V8 claimed: `NO`

## Validation

Passed:

```text
node --test tests\record-memory-strict-auth-stdio-runtime-candidate.test.js
  pass 2/2
node --test tests\mcp-http.test.js
  pass 32/32
node --test tests\record-memory-principal-scope-authorization-config.test.js tests\record-memory-principal-scope-observe-only-integration.test.js
  pass 21/21
git diff --check
  pass
CURRENT_FACTS.json parse and latest validation check
  pass
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
  pass
npm run gate:mainline
  pass: health ok; compare 43/43; rollback 43/43
```

Changed-scope review: added explicit rejected no-persistence-shape assertions for `memoryId=null`, `filePath=null`, and `shadowWrite.status=skipped`. No further actionable finding in the CM-1662 test/doc/board/status scope. The stdio candidate remains temp-local and does not enable production strict auth.
