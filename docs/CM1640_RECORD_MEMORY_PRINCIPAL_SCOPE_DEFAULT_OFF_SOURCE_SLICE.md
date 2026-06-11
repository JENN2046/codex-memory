# CM-1640 record_memory principal/scope default-off source slice

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_RECORD_MEMORY_PRINCIPAL_SCOPE_DEFAULT_OFF_SOURCE_SLICE_NO_PRODUCTION_ENFORCEMENT`

## Scope

This slice implements the default-off source/test step after CM-1639.

It adds a local config normalizer for future `record_memory` principal/scope
authorization modes:

```text
off | observe | strict
```

Default remains `off`.

This slice does not add env vars, profile files, public MCP schema fields,
HTTP/stdio context parsing, bearer-token behavior, default strict rejection,
live MCP traffic, provider/API calls, real memory reads or writes, raw store
scans, broad memory scans, config/watchdog/startup changes, public MCP expansion,
release/tag/deploy, production/release/cutover readiness, or any complete V8
claim.

## Source Changes

- Added `src/core/RecordMemoryPrincipalScopeAuthorizationConfig.js`.
- Updated `src/config/createConfig.js` to include
  `recordMemoryPrincipalScopeAuthorization`, normalized from explicit overrides
  only.
- Updated `src/app.js` so `createCodexMemoryApplication(...)` wires the
  normalized config into `MemoryWriteService` only when mode is `observe` or
  `strict`.
- Existing direct constructor overrides still work and remain higher priority
  than normalized config wiring.

## Default-Off Behavior

With no explicit config:

- `config.recordMemoryPrincipalScopeAuthorization.mode = off`
- `writeService.recordMemoryPrincipalScopeAuthorizationPreflight = null`
- `writeService.recordMemoryPrincipalScopeAuthorizationPolicy = null`
- `writeService.recordMemoryPrincipalScopeAuthorizationStrictMode = false`
- current alias-only `record_memory` write behavior remains unchanged

Invalid mode values normalize to `off` to avoid accidental enforcement.

## Explicit Observe Mode

With explicit `mode=observe` and a policy:

- app wiring injects the existing principal/scope preflight helper
- missing or mismatched principal/scope fields are observed
- accepted writes are not rejected by this preflight
- observer summaries remain low-disclosure

## Explicit Strict Mode

With explicit `mode=strict` and a policy:

- app wiring injects the existing principal/scope preflight helper
- missing or mismatched required fields reject before persistence
- public rejection output contains field names and booleans only
- raw mismatched workspace/client/agent values are not exposed

This strict path is still temp-local source/test evidence only. It is not
production runtime enforcement because HTTP/stdio default context still does not
derive `projectId`, `workspaceId`, or `clientId`.

## Validation

Targeted validation:

```powershell
node --test tests\record-memory-principal-scope-authorization-config.test.js tests\record-memory-principal-scope-observe-only-integration.test.js tests\record-memory-principal-scope-authorization-preflight.test.js tests\execution-context-resolver.test.js
```

Expected result: `19/19`.

Broader affected validation:

```powershell
node --test tests\security-write-policy.test.js
node --test tests\mcp-http.test.js --test-name-pattern "record_memory|no-token mutation|missing-token"
```

Expected results: `3/3` and `27/27`.

Full-suite check:

```powershell
npm test
```

Observed result: `3251/3252`. The single failing case was
`tests/public-default-search-lifecycle-tombstone-cold-derived-temp-local-evidence.test.js`,
which hit a Windows temp-local vector-index `EPERM` rename. The same test passed
when rerun alone `1/1`; this was not in the CM-1640 changed scope.

## Non-Claims

CM-1640 does not claim production readiness, release readiness, cutover readiness,
complete V8, broad `record_memory` reliability, production write reliability,
live bearer-token principal/scope proof, or compatibility for enabling strict
mode against current HTTP/stdio defaults.

The next safe route is HTTP/stdio trusted context source implementation or
config documentation for real deployment operators, still default-off and still
separate from production/release/cutover readiness.
