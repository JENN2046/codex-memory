# CM-1646 VCP Bridge trusted context adapter skeleton

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_VCP_BRIDGE_TRUSTED_CONTEXT_ADAPTER_SKELETON_DEFAULT_OFF_FIXTURE_ONLY`

## Scope

This slice adds a default-off, fixture-only VCP Bridge trusted context adapter
skeleton. The adapter normalizes future bridge-owned runtime/static context into
the trusted `executionContext` shape consumed by codex-memory strict
principal/scope authorization:

```text
agentAlias
agentId
requestSource
projectId
workspaceId
clientId
```

This is not a live bridge integration. The adapter is not wired into HTTP,
stdio, app runtime, config defaults, VCP runtime, MCP tools, or `record_memory`.

## Implemented Files

```text
src/core/VcpBridgeTrustedExecutionContext.js
tests/vcp-bridge-trusted-context-contract.test.js
docs/CM1646_VCP_BRIDGE_TRUSTED_CONTEXT_ADAPTER_SKELETON.md
```

## Adapter Contract

The exported helper is:

```text
buildVcpBridgeTrustedExecutionContext({
  bridgeRuntimeContext,
  bridgeStaticConfig,
  bridgeAllowlist
})
```

Accepted input authority is limited to:

- `bridgeRuntimeContext`
- `bridgeStaticConfig`
- `bridgeAllowlist`

Rejected authority sources:

- `toolPayload`
- `publicToolArgs`
- `promptContext`
- `prompt`
- `payloadExecutionContext`

Accepted output includes:

```text
accepted: true
executionContext: { agentAlias, agentId, requestSource, projectId, workspaceId, clientId }
lowDisclosureRejection: null
missingFields: []
mismatchedFields: []
sourceAuthority: bridge_runtime_or_static_config
payloadAuthorityUsed: false
publicMcpExpanded: false
recordMemoryCalled: false
providerApiCalled: false
```

Rejected output is fail-closed and low-disclosure:

```text
accepted: false
executionContext: {}
lowDisclosureRejection: { reason, code, lowDisclosure, missingFields, mismatchedFields }
payloadAuthorityUsed: false
publicMcpExpanded: false
recordMemoryCalled: false
providerApiCalled: false
```

## Fail-Closed Behavior

The helper rejects when:

- `bridgeRuntimeContext` is not a plain object
- `bridgeStaticConfig` is not a plain object
- `bridgeAllowlist` is missing or incomplete
- any required field is missing
- a required field is not present in the static allowlist
- `requestSource` is not the fixed bridge-owned source `vcp-bridge`
- prompt, tool payload, public args, or payload execution context are supplied
  as possible authority sources

The rejection projection does not echo raw `agentId`, `workspaceId`, or
`clientId` values.

## Validation Coverage

`tests/vcp-bridge-trusted-context-contract.test.js` covers:

- complete trusted runtime context plus allowlist accepts
- missing `projectId`, `workspaceId`, and `clientId` rejects
- mismatched `agentId`, `workspaceId`, and `clientId` rejects
- tool payload identity/scope is rejected as authority
- rejection output does not echo raw workspace/client/agent values
- non-plain runtime context rejects
- missing allowlist rejects
- non-bridge-owned request source rejects
- adapter reports no `record_memory` call
- adapter reports no provider/API call
- public MCP surface remains seven tools

## Default-Off Boundary

CM-1646 does not change production behavior:

```text
app/runtime wiring: NOT_ADDED
HTTP/stdio wiring: NOT_ADDED
config/env/profile default: NOT_ADDED
VCPBridgeServer integration: NOT_ADDED
strict production default: NOT_ENABLED
record_memory call path: NOT_CALLED
```

Future work may add fixture-only config wiring or bridge-side signed context
proof, but live bridge proof and production candidate movement require separate
exact approval.

## Non-Claims

```text
strict default changed: NO
production strict mode enabled: NO
runtime auth behavior changed: NO
real record_memory write occurred: NO
live VCP Bridge proof occurred: NO
live MCP proof occurred: NO
provider/API occurred: NO
bearer token material used: NO
raw scan / broad scan occurred: NO
confirmed mutation occurred: NO
public MCP expansion occurred: NO
persistent tag write occurred: NO
release/tag/deploy occurred: NO
production ready: NO
release ready: NO
cutover ready: NO
complete V8: NOT_CLAIMED
```
