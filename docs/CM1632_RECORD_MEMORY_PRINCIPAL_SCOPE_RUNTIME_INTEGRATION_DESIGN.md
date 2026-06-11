# CM-1632 Record Memory Principal Scope Runtime Integration Design

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_RECORD_MEMORY_PRINCIPAL_SCOPE_RUNTIME_INTEGRATION_DESIGN_NO_BEHAVIOR_CHANGE`

## Scope

This slice turns the CM-1631 no-apply helper into a guarded runtime integration design packet.

It does not change runtime authorization.

Current source reality:

- `src/app.js` routes public `record_memory` calls to `writeService.record(args, requestContext)`.
- `src/core/MemoryWriteService.js` resolves execution context at the start of `record(...)`.
- The current first write gate is `ExecutionContextResolver.isWritableByCodex(executionContext)`.
- `src/core/ExecutionContextResolver.js` currently grants write authority by `agentAlias` only.
- Existing authenticated HTTP MCP test coverage accepts `record_memory` with the current request context shape.

## Risk

Directly requiring principal/scope match in `MemoryWriteService.record(...)` would be behavior-changing.

Likely compatibility risks:

- Existing temp-local HTTP tests may not supply all of `agentId`, `requestSource`, `projectId`, `workspaceId`, and `clientId`.
- Existing local clients may rely on current alias-only write acceptance.
- Rejection output must stay low-disclosure and must not echo raw workspace or client values.
- Audit records must not expose raw secrets, bearer material, or private scope payloads.
- A default-on strict gate would be a runtime auth behavior change and should not happen in a docs/design slice.

## Recommended Staged Integration

### Stage 1: Disabled-by-default injection point

Add an optional `recordMemoryPrincipalScopeAuthorizationPreflight` dependency to `MemoryWriteService`.

Default behavior:

- no helper configured
- current alias-only gate remains unchanged
- no new rejection path
- existing HTTP MCP accepted write tests continue to pass

Validation:

```text
node --test tests\mcp-http.test.js --test-name-pattern "record_memory|no-token mutation|missing-token"
node --test tests\security-write-policy.test.js
```

### Stage 2: Observe-only internal projection

When explicitly enabled in tests, run the preflight after `executionContext` resolution but before durable writes.

Observe-only behavior:

- records summary fields internally for assertion
- never blocks writes
- never changes public MCP output
- never writes additional durable audit rows unless separately designed
- keeps `recordMemoryRuntimeIntegrated=false` in public-visible surfaces

Validation:

```text
node --test tests\record-memory-principal-scope-authorization-preflight.test.js tests\execution-context-resolver.test.js
node --test tests\security-write-policy.test.js
```

### Stage 3: Feature-flagged strict rejection in temp-local tests

Only after observe-only evidence passes, add an explicit test-only / config-gated strict mode.

Strict mode should:

- require `agentAlias`
- require allowlisted `agentId`
- require allowlisted `requestSource`
- require allowlisted `projectId`
- require allowlisted `workspaceId`
- require allowlisted `clientId`
- fail closed on missing policy or missing context
- return low-disclosure rejection
- keep raw workspace value out of result and audit text

Validation:

```text
node --test tests\record-memory-principal-scope-authorization-preflight.test.js tests\execution-context-resolver.test.js
node --test tests\mcp-http.test.js --test-name-pattern "record_memory|no-token mutation|missing-token"
node --test tests\security-write-policy.test.js
git diff --check
scripts\validate-local.ps1 -Area docs
```

### Stage 4: Default policy decision

Changing strict mode from opt-in to default-on should be a separate Red/Amber decision.

Required before default-on:

- compatibility impact review for Codex Desktop / Claude / local MCP clients
- request context population map for HTTP MCP and stdio MCP
- migration note for local clients
- audit redaction review
- full targeted HTTP/MCP write validation
- no production/release/cutover readiness claim unless separately proven

## Stop Conditions

Stop before implementation if any of these are unknown:

- how `projectId`, `workspaceId`, or `clientId` should be derived for existing clients
- whether default HTTP MCP sessions can supply required scope without config changes
- whether low-disclosure rejection text is acceptable for all callers
- whether audit rows should include a bounded principal/scope summary

## Non-Claims

This slice did not integrate the helper into `MemoryWriteService`.

This slice did not change `ExecutionContextResolver.isWritableByCodex(...)`.

This slice did not change public MCP behavior, execute live MCP traffic, use bearer-token material, call provider/API paths, read/write real memory, scan raw stores, run broad memory scans, execute durable mutations, modify config/watchdog/startup behavior, expand public MCP tools, claim production/release/cutover readiness, or complete V8.
