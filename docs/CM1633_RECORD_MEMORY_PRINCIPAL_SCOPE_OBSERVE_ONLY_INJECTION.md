# CM-1633 Record Memory Principal Scope Observe-Only Injection

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_RECORD_MEMORY_PRINCIPAL_SCOPE_OBSERVE_ONLY_INJECTION_NO_DEFAULT_BEHAVIOR_CHANGE`

## Scope

This slice implements the first source step from CM-1632: a disabled-by-default observe-only injection point for future `record_memory` principal/scope authorization.

Changed source:

- `src/core/MemoryWriteService.js`

Added test:

- `tests/record-memory-principal-scope-observe-only-integration.test.js`

The new injection point is disabled unless a caller explicitly installs `recordMemoryPrincipalScopeAuthorizationPreflight`.

Default runtime behavior remains unchanged.

## Behavior

When no preflight function is configured:

- `record_memory` keeps the existing alias-only authorization gate.
- no principal/scope preflight runs
- no new rejection path exists
- public MCP output is unchanged

When a test or future internal caller explicitly injects a preflight function:

- `MemoryWriteService.record(...)` runs it after the current alias-only gate
- the result is sent only to an optional observer
- the result does not block writes
- the result is not added to public `record_memory` output
- the observed result marks runtime observe-only integration while keeping `currentRuntimeAuthorizationChanged=false`
- the result records no provider/API calls, real-memory scans, durable mutation, public MCP expansion, or runtime auth change

## Evidence

Validation:

```text
node --test tests\record-memory-principal-scope-observe-only-integration.test.js tests\record-memory-principal-scope-authorization-preflight.test.js tests\execution-context-resolver.test.js
node --test tests\security-write-policy.test.js
node --test tests\mcp-http.test.js --test-name-pattern "record_memory|no-token mutation|missing-token"
git diff --check
scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
```

Results:

```text
8/8 passed
3/3 passed
27/27 passed
```

The observe-only integration regression uses a temp-local app and an injected preflight/observer. It confirms:

- accepted `record_memory` remains accepted
- the injected preflight is observed exactly once
- the observed summary is low-disclosure
- the public result does not expose the observe-only preflight summary
- the current runtime authorization model is not changed

## Non-Claims

This slice does not implement strict principal/scope rejection.

This slice does not make principal/scope authorization default-on.

This slice does not change `ExecutionContextResolver.isWritableByCodex(...)`, public MCP tool schemas, HTTP MCP default write behavior, config/watchdog/startup behavior, provider/API behavior, real memory state, raw store scanning, production/release/cutover readiness, or complete V8.
