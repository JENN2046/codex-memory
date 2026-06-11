# CM-1634 Record Memory Principal Scope Strict Temp-Local

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_RECORD_MEMORY_PRINCIPAL_SCOPE_STRICT_TEMP_LOCAL_NO_DEFAULT_BEHAVIOR_CHANGE`

## Scope

This slice adds an opt-in strict rejection mode for the CM-1633 observe-only `record_memory` principal/scope preflight.

Changed source:

- `src/core/MemoryWriteService.js`

Updated test:

- `tests/record-memory-principal-scope-observe-only-integration.test.js`

The strict mode is not default-on.

Strict enforcement is active only when:

- a principal/scope preflight function is injected, and
- `recordMemoryPrincipalScopeAuthorizationStrictMode` is explicitly `true` on the service or request context.

## Behavior

Default behavior:

- unchanged
- current alias-only `record_memory` write authorization remains the default gate
- no strict principal/scope rejection runs without explicit opt-in

Opt-in strict behavior:

- exact matching temp-local principal/scope is accepted
- mismatched principal/scope is rejected before persistence
- rejection reason contains blocker field names only
- rejection result includes bounded `principalScopeAuthorization` metadata
- rejected result and audit text do not echo raw workspace, agent id, or client id values

## Evidence

Validation:

```text
node --test tests\record-memory-principal-scope-observe-only-integration.test.js tests\record-memory-principal-scope-authorization-preflight.test.js tests\execution-context-resolver.test.js
node --test tests\security-write-policy.test.js
node --test tests\mcp-http.test.js --test-name-pattern "record_memory|no-token mutation|missing-token"
git diff --check
```

Results:

```text
10/10 passed
3/3 passed
27/27 passed
```

During validation, the first strict rejection test caught that the generic rejected result would echo the mismatched `agentId`. The implementation was repaired so principal/scope strict rejection clears `agentId` in the public rejected result and keeps audit text low-disclosure.

## Non-Claims

This slice does not make strict principal/scope authorization default-on.

This slice does not change `ExecutionContextResolver.isWritableByCodex(...)`.

This slice does not change public MCP schemas, execute live MCP traffic outside temp-local tests, use real bearer-token material, call provider/API paths, read/write real memory, scan raw stores, run broad memory scans, change production config/watchdog/startup behavior, expand public MCP tools, claim production/release/cutover readiness, or complete V8.
