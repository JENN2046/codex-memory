# CM-1691 VCPToolBox Full-Capability Runtime Target Operator Packet

Date: 2026-06-12

Status: `COMPLETED_VALIDATED_VCPTOOLBOX_RUNTIME_TARGET_OPERATOR_PACKET_SOURCE_ONLY_NO_SECRET_NO_RUNTIME`

## Purpose

CM-1691 defines the non-secret operator packet for binding a real VCPToolBox
target to the future full-capability bridge.

The packet is for user/operator-provided target references only. It must not
contain a real path, endpoint, token, config file path, secret value, or raw
memory content.

Added:

- `src/core/VcpToolBoxRuntimeTargetOperatorPacket.js`
- `tests/vcp-toolbox-runtime-target-operator-packet.test.js`

## Required Non-Secret Fields

Top-level fields:

```text
schemaVersion
sourceSystem=VCPToolBox
packetId
operatorIntent
target
intendedProfile
requestedActions
principalScope
nonSecretAssertions
```

Target fields:

```text
target.kind
target.referenceName
target.discoverySource
target.locatorHashPresent=true
target.locatorValueIncluded=false
target.secretMaterialIncluded=false
target.configEnvRead=false
target.runtimeCalled=false
target.observedPresent
target.runtimeEntrypointKnown
```

Principal/scope fields:

```text
principalScope.agentAlias=Codex
principalScope.agentIdPresent=true
principalScope.projectIdPresent=true
principalScope.workspaceIdPresent=true
principalScope.clientIdPresent=true
principalScope.sessionIdPresent=true
```

Required non-secret assertions:

```text
pathValueOmitted=true
endpointValueOmitted=true
tokenValueOmitted=true
configEnvValueOmitted=true
rawMemoryValueOmitted=true
locatorHashOnly=true
operatorOwnsTargetReference=true
```

## Supported Target References

The packet accepts the same sanitized target kinds used by CM-1689 and CM-1690:

```text
local_checkout
service_url
mcp_server
cli
plugin_api
ipc
```

The packet accepts these discovery sources:

```text
default_path_probe
operator_provided
service_registry_reference
mcp_server_name
cli_name
plugin_api_name
ipc_name
```

The packet emits a `locatorPreflightInput` that can be passed to
`buildVcpToolBoxRuntimeTargetLocatorPreflight(...)`.

## Profile And Action Binding

The packet binds the operator's intended profile to requested actions:

| Profile | Allowed action class |
|---|---|
| `observe-lite` | read actions only |
| `observe-full` | read actions only |
| `trusted-full-read` | read actions only |
| `trusted-write-proposal` | read and write-proposal actions |
| `trusted-full` | read, write-proposal, and durable write call-plan actions |

Durable write actions under read-only profiles fail closed.

## Forbidden Values

The packet rejects:

- locator values
- filesystem paths
- endpoint or URL values
- `config.env` paths or contents
- `.env` shaped content
- bearer tokens, API keys, shared secrets, private keys, passwords
- raw DailyNote, RAG, vector, prompt, or conversation content
- claims that `config.env` was read
- claims that runtime was called
- target packets that include locator values or secret material

Rejected output is low-disclosure and does not echo forbidden values.

## Validation

Targeted validation:

```text
node --test tests\vcp-toolbox-runtime-target-operator-packet.test.js
```

Result:

```text
9/9 passed
```

Coverage:

- accepts a non-secret operator packet
- proves packet -> CM-1690 locator preflight -> CM-1689 call plan chain
- accepts service target packet using reference name only
- rejects missing target, principal, and assertion fields
- rejects path, endpoint, token, config-env, and raw memory values without echo
- rejects locator/secret/material flags
- rejects durable write actions under full-read profile
- rejects false non-secret assertions
- locks required non-secret and forbidden field vocabulary
- proves the helper never performs runtime, provider, memory, or public MCP
  actions

## Boundary

CM-1691 did not:

- receive or persist a real VCPToolBox path
- receive or persist a real endpoint
- receive or persist a token or secret
- read `config.env`
- read `.env`
- start or call VCPToolBox
- call MCP
- call providers
- read raw memory stores
- write memory
- wire runtime behavior
- expand public MCP tools
- claim production/release/cutover readiness

## Next Step

Recommended next task:

```text
CM-1692 VCPToolBox full-capability target packet focused review
```

That task should review CM-1689 through CM-1691 for low-disclosure gaps before
any live target proof or runtime wiring is considered.
