# CM-1636 record_memory strict mode app override wiring

## Scope

This slice wires the existing principal/scope authorization preflight controls through
`createCodexMemoryApplication(...)` overrides into `MemoryWriteService`.

The wiring is disabled by default. It does not add env vars, config keys, HTTP/stdio
context extraction, public MCP schema fields, client metadata parsing, or default
runtime strict mode.

## Changed Behavior

`createCodexMemoryApplication(...)` can now pass these local constructor overrides to
`MemoryWriteService`:

- `recordMemoryPrincipalScopeAuthorizationPreflight`
- `recordMemoryPrincipalScopeAuthorizationPolicy`
- `recordMemoryPrincipalScopeAuthorizationObserver`
- `recordMemoryPrincipalScopeAuthorizationStrictMode`

If these overrides are not supplied, the default public `record_memory` behavior remains
unchanged.

## Temp-Local Proof

`tests/record-memory-principal-scope-observe-only-integration.test.js` now covers:

- app-level observe-only override accepts a matching temp-local principal/scope and records one low-disclosure observer summary
- app-level strict override rejects mismatched temp-local `agentId`, `workspaceId`, and `clientId`
- strict rejection returns field names and booleans only
- public rejection output and write audit do not echo raw mismatched workspace, agent id, or client id values

## Validation

Passed:

```powershell
node --test tests\record-memory-principal-scope-observe-only-integration.test.js tests\record-memory-principal-scope-authorization-preflight.test.js tests\execution-context-resolver.test.js
node --test tests\security-write-policy.test.js
node --test tests\mcp-http.test.js --test-name-pattern "record_memory|no-token mutation|missing-token"
git diff --check
scripts\validate-local.ps1 -Area docs
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS_JSON_OK')"
```

Result:

- principal/scope integration subset: `12/12` passed
- security write policy: `3/3` passed
- HTTP MCP record/no-token/missing-token subset: `27/27` passed
- diff check, docs validation, and `CURRENT_FACTS.json` parse passed

## Non-Claims

This slice does not claim production readiness, release readiness, cutover readiness,
complete V8, live MCP traffic, real bearer-token flow, provider/API calls, real memory
read/write, raw store scan, broad memory scan, config/watchdog/startup change, public
MCP expansion, default strict mode, or compatibility for current HTTP/stdio clients
without additional principal/scope context.
