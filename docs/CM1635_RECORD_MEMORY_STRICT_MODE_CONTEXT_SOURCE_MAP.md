# CM-1635 Record Memory Strict Mode Context Source Map

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_RECORD_MEMORY_STRICT_MODE_CONTEXT_SOURCE_MAP_NO_CONFIG_CHANGE`

## Scope

This slice maps the compatibility and context-source requirements before `record_memory` principal/scope strict mode can move beyond temp-local tests.

It does not change runtime configuration.

It does not make strict mode default-on.

## Current Source Reality

### App Boundary

`src/app.js` routes:

```text
callTool('record_memory', args, requestContext) -> writeService.record(args, requestContext)
```

`MemoryWriteService.record(...)` resolves execution context first, checks the current alias-only gate, and then can run the CM-1633 / CM-1634 principal/scope preflight path.

### HTTP MCP Boundary

`src/adapters/codex-mcp/http.js` builds `defaultExecutionContext` from:

- `CODEX_MEMORY_AGENT_ALIAS`
- `CODEX_MEMORY_AGENT_ID`
- `CODEX_MEMORY_REQUEST_SOURCE`
- `baseRequestContext.executionContext`
- config defaults

Current HTTP default context does not derive these required strict fields:

- `projectId`
- `workspaceId`
- `clientId`

Authenticated HTTP also sets bounded request flags:

- `authenticatedBoundedOverview`
- `authenticatedBoundedSearch`
- `noTokenReadOnly`

Those flags are not principal/scope identity.

### Stdio MCP Boundary

`src/adapters/codex-mcp/stdio.js` builds execution context from:

- `CODEX_MEMORY_AGENT_ALIAS`
- `CODEX_MEMORY_AGENT_ID`
- `CODEX_MEMORY_REQUEST_SOURCE`
- `baseRequestContext.executionContext`
- config defaults

Current stdio default context also does not derive:

- `projectId`
- `workspaceId`
- `clientId`

## Compatibility Risk

Turning strict mode on outside temp-local tests would reject current HTTP/stdio `record_memory` writes unless the missing scope fields are supplied.

The biggest unknowns are:

- what value should represent `workspaceId` for Codex Desktop
- what value should represent `workspaceId` for Claude or other MCP clients
- whether `clientId` should come from transport, env, client metadata, or explicit config
- whether `projectId` should be repository-derived, config-derived, or supplied by the client
- whether HTTP and stdio should share one policy source or separate profiles
- whether rejection audit should include bounded principal/scope summaries beyond field names

## Recommended Next Stages

### Stage 1: Docs-only compatibility map

Completed by this slice.

### Stage 2: Disabled-by-default policy object wiring

Future source/test slice only.

Acceptable shape:

- load a principal/scope allowlist from existing app construction options or explicit test overrides
- keep strict mode default-off
- do not add env/config keys yet
- do not change public MCP schemas
- prove default HTTP/stdio behavior is unchanged

### Stage 3: Explicit profile/config preflight

Future docs/test slice before config change.

Must define:

- exact config keys
- default values
- migration notes
- low-disclosure error wording
- compatibility matrix for HTTP and stdio
- rollback path

### Stage 4: Config-gated strict mode

Future source slice only after Stage 3.

Must remain opt-in and validated against:

```text
node --test tests\record-memory-principal-scope-observe-only-integration.test.js tests\record-memory-principal-scope-authorization-preflight.test.js tests\execution-context-resolver.test.js
node --test tests\mcp-http.test.js --test-name-pattern "record_memory|no-token mutation|missing-token"
node --test tests\security-write-policy.test.js
```

Default-on strict mode remains a separate compatibility decision.

## Non-Claims

This slice did not add config keys, env vars, public MCP schema fields, client metadata parsing, provider/API calls, real bearer-token use, real memory reads/writes, raw store scans, broad memory scans, config/watchdog/startup changes, remote actions, release/tag/deploy, production/release/cutover readiness claims, or complete V8 claims.
