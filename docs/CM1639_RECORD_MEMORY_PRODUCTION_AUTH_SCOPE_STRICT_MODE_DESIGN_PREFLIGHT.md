# CM-1639 record_memory production auth/scope strict-mode design preflight

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_RECORD_MEMORY_PRODUCTION_AUTH_SCOPE_STRICT_MODE_DESIGN_PREFLIGHT_DOCS_ONLY_NO_CONFIG_CHANGE`

## Scope

This slice closes the P2-2 design preflight for future production-style
`record_memory` principal/scope strict mode.

It is docs/status only. It does not add env vars, config keys, profile fields,
HTTP/stdio context parsing, bearer-token behavior, default strict mode, runtime
authorization changes, live MCP traffic, provider/API calls, real memory reads
or writes, raw store scans, broad memory scans, config/watchdog/startup changes,
public MCP expansion, release/tag/deploy, production/release/cutover readiness,
or any complete V8 claim.

## Current Source Reality

Current source and test evidence already provide these pieces:

- `ExecutionContextResolver.resolve(...)` can normalize `agentAlias`, `agentId`,
  `requestSource`, `projectId`, `workspaceId`, and `clientId`.
- `ExecutionContextResolver.isWritableByCodex(...)` still authorizes writes by
  `agentAlias` only.
- `RecordMemoryPrincipalScopeAuthorizationPreflight` models a future fail-closed
  policy requiring exact `agentAlias` plus allowlisted `agentId`,
  `requestSource`, `projectId`, `workspaceId`, and `clientId`.
- `MemoryWriteService` has disabled-by-default injection points for the preflight,
  policy, observer, and strict-mode rejection.
- `createCodexMemoryApplication(...)` can pass those disabled-by-default overrides
  to `MemoryWriteService`.
- `createConfig(...)` currently exposes only identity-adjacent write defaults:
  `allowedAgentAlias`, `defaultAgentId`, `defaultRequestSource`, and
  `enableWritePreflight`.
- HTTP and stdio default contexts currently supply `agentAlias`, `agentId`, and
  `requestSource`, but not `projectId`, `workspaceId`, or `clientId`.

Therefore production-style strict mode cannot be enabled safely from current
config/profile defaults. If strict mode were turned on now for current HTTP/stdio
defaults, ordinary `record_memory` writes would fail closed because required
scope fields are missing.

## Future Config/Profile Contract

A future source slice may add a default-off config/profile object with this
logical shape:

```text
recordMemoryPrincipalScopeAuthorization:
  mode: off | observe | strict
  allowedAgentAlias: string
  allowedAgentIds: string[]
  allowedRequestSources: string[]
  allowedProjectIds: string[]
  allowedWorkspaceIds: string[]
  allowedClientIds: string[]
  lowDisclosureRejection: true
```

Required defaults:

- `mode=off`
- no allowlist grants implied by empty arrays
- no public MCP tool schema expansion
- no request payload field may authorize itself
- no raw mismatched principal/scope value in public result, audit, logs, docs, or
  validation output

`observe` may report low-disclosure summaries without rejecting writes.

`strict` must reject before persistence when any required principal/scope field
is missing or mismatched.

## Trusted Context Source Rules

Future HTTP and stdio strict-mode implementation must define trusted sources for
all strict-required fields:

| Field | Current source | Future strict source requirement |
|---|---|---|
| `agentAlias` | env/base/config default context | trusted runtime/config context |
| `agentId` | env/base/config default context | trusted runtime/config context |
| `requestSource` | env/base/config default context | trusted runtime/config context |
| `projectId` | not derived by default | explicit trusted config/profile or trusted client metadata |
| `workspaceId` | not derived by default | explicit trusted config/profile or trusted client metadata |
| `clientId` | not derived by default | explicit trusted config/profile or trusted client metadata |

Public `record_memory` payload scope may be persisted or used as candidate scope
data, but it must not be the authority that authorizes the same write.

Bearer-token presence is also not enough by itself. Bearer auth can prove the
transport was accepted, but strict principal/scope authorization still needs the
trusted context fields and configured allowlists above.

## Acceptance Matrix For Future Source Work

Any future implementation slice that exposes this through config/profile should
add or update tests proving:

| Case | Expected result |
|---|---|
| No strict config/profile object | current default behavior unchanged |
| `mode=off` with allowlists present | current default behavior unchanged |
| `mode=observe` with complete matching context | write accepted; low-disclosure observer only |
| `mode=observe` with missing scope fields | write accepted; low-disclosure missing-field summary only |
| `mode=strict` with missing `projectId`, `workspaceId`, or `clientId` | rejected before persistence |
| `mode=strict` with mismatched `agentId`, `projectId`, `workspaceId`, or `clientId` | rejected before persistence |
| `mode=strict` with all configured fields matching | accepted in temp-local tests only |
| HTTP/stdio default context without new scope sources | still default-off; no accidental strict rejection |
| public MCP surface | remains exactly seven tools |
| rejection output | field names / booleans only; no raw mismatched values |

Minimum future validation set:

```powershell
node --test tests\record-memory-principal-scope-observe-only-integration.test.js tests\record-memory-principal-scope-authorization-preflight.test.js tests\execution-context-resolver.test.js
node --test tests\security-write-policy.test.js
node --test tests\mcp-http.test.js --test-name-pattern "record_memory|no-token mutation|missing-token"
```

## Formal Closure Decision

P2-2 remains not implemented as production runtime enforcement.

This slice closes the design-preflight gap by making the future strict-mode
contract explicit:

- source of truth for strict-required fields is trusted execution context, not
  caller-supplied payload scope alone
- strict mode is default-off
- observe and strict behavior are separated by `mode`
- missing/mismatched strict fields reject before persistence only in explicit
  strict mode
- HTTP/stdio compatibility must be preserved by default
- public MCP surface must remain frozen at seven tools
- production/release/cutover readiness remains unclaimed

## Next Safe Route

The next safe local route is a source/test slice that adds a default-off config
profile parser or constructor-level policy normalizer, with tests for `off`,
`observe`, and `strict` using temp-local stores only.

Do not proceed directly to default-on strict mode, bearer-token live proof,
production runtime enforcement, real memory writes, provider/API calls,
config/watchdog/startup changes, public MCP expansion, release/tag/deploy, or
production/release/cutover readiness claims without a separate exact task and
approval boundary.
