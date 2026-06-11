# CM-1637 record_memory strict mode config/profile preflight

## Scope

This slice records the compatibility preflight required before `record_memory`
principal/scope strict mode can be exposed through config/profile controls.

It is docs-only. It does not add env vars, config keys, profile fields, HTTP/stdio
context parsing, public MCP schema fields, client metadata parsing, default strict mode,
or runtime behavior changes.

## Current Source Reality

Current config supports these write-identity-adjacent defaults:

- `allowedAgentAlias`
- `defaultAgentId`
- `defaultRequestSource`
- `enableWritePreflight`

Current HTTP and stdio entrypoints construct execution context with:

- `agentAlias`
- `agentId`
- `requestSource`

Current strict principal/scope preflight requires more than that for strict acceptance:

- `agentAlias`
- `agentId`
- `requestSource`
- `projectId`
- `workspaceId`
- `clientId`

Therefore, wiring strict mode to config/profile without a context-source plan would make
current HTTP/stdio `record_memory` clients fail closed.

## Future Config/Profile Gate Requirements

Before a config/profile strict mode source change, the project needs an exact design for:

- strict-mode enable flag name and default value
- whether observe-only and strict modes are separate flags
- policy source shape for allowed agent ids, request sources, project ids, workspace ids, and client ids
- whether HTTP and stdio share one policy profile or use separate profiles
- how `projectId`, `workspaceId`, and `clientId` are derived for HTTP
- how `projectId`, `workspaceId`, and `clientId` are derived for stdio
- whether requestContext override remains higher priority than app/config policy
- low-disclosure rejection fields and audit wording
- rollback path that returns to observe-only/default-off behavior

## Compatibility Matrix

| Entry path | Current strict-required context completeness | Config-gated strict risk |
|---|---|---|
| app constructor override tests | complete when explicitly supplied | low; temp-local only |
| direct `app.callTool(...)` with explicit requestContext | complete when explicitly supplied | low if caller supplies all fields |
| HTTP MCP default context | missing `projectId`, `workspaceId`, `clientId` | high; would reject current writes |
| stdio MCP default context | missing `projectId`, `workspaceId`, `clientId` | high; would reject current writes |

## Minimum Future Acceptance Tests

Any later source slice that adds config/profile strict mode should prove:

```powershell
node --test tests\record-memory-principal-scope-observe-only-integration.test.js tests\record-memory-principal-scope-authorization-preflight.test.js tests\execution-context-resolver.test.js
node --test tests\security-write-policy.test.js
node --test tests\mcp-http.test.js --test-name-pattern "record_memory|no-token mutation|missing-token"
```

It should also add targeted coverage for:

- default config remains strict-off
- observe-only config does not reject accepted writes
- strict config rejects missing `projectId`, `workspaceId`, or `clientId` before persistence
- strict config accepts only when all configured principal/scope fields match
- rejection output and audit show field names and booleans only, not raw mismatched values

## Non-Claims

This slice does not implement config/profile strict mode. It does not claim production
readiness, release readiness, cutover readiness, complete V8, live MCP traffic,
provider/API calls, real bearer-token flow, real memory read/write, raw store scan,
broad memory scan, config/watchdog/startup change, public MCP expansion, or compatibility
for current HTTP/stdio clients under strict mode.
