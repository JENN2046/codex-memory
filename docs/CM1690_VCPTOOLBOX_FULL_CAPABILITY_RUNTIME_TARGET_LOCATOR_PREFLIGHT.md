# CM-1690 VCPToolBox Full-Capability Runtime Target Locator Preflight

Date: 2026-06-12

Status: `COMPLETED_VALIDATED_VCPTOOLBOX_RUNTIME_TARGET_LOCATOR_PREFLIGHT_SOURCE_ONLY_NO_SECRET_NO_RUNTIME`

## Purpose

CM-1690 solidifies the no-secret runtime target locator preflight for the
future full-capability VCPToolBox bridge.

The preflight can represent discovered or operator-provided VCPToolBox targets
without storing locator values, endpoint values, secret material, or raw memory
content. It can produce a sanitized target object that the CM-1689 call-plan
contract can consume.

Added:

- `src/core/VcpToolBoxRuntimeTargetLocatorPreflight.js`
- `tests/vcp-toolbox-runtime-target-locator-preflight.test.js`

## Contract

The preflight accepts candidate target references only.

Required candidate fields:

```text
kind
referenceName
discoverySource
locatorHashPresent=true
locatorValueIncluded=false
secretMaterialIncluded=false
configEnvRead=false
runtimeCalled=false
observedPresent
```

Supported discovery sources:

```text
default_path_probe
operator_provided
service_registry_reference
mcp_server_name
cli_name
plugin_api_name
ipc_name
```

Supported target kinds are inherited from CM-1689:

```text
local_checkout
service_url
mcp_server
cli
plugin_api
ipc
```

## Discovery Behavior

The helper supports a default-path probe receipt where no target is found. This
is the current local state from CM-1688:

```text
A:\VCP\VCPToolBox not found
```

When a sanitized candidate is marked `observedPresent=true`, the helper returns
an `acceptedTargets` entry shaped for the CM-1689 call-plan contract:

```json
{
  "kind": "local_checkout",
  "referenceName": "operator-vcp-toolbox-checkout",
  "locatorHashPresent": true,
  "locatorValueIncluded": false,
  "secretMaterialIncluded": false
}
```

The helper does not resolve or echo the actual path, URL, token, or config file
location.

## Forbidden Inputs

The helper rejects:

- locator values
- absolute paths
- endpoint or URL values
- `config.env` paths or content
- `.env` shaped content
- bearer tokens, API keys, shared secrets, private keys, passwords
- raw DailyNote, RAG, vector, prompt, or conversation content
- positive counters for config/env/secret reads
- runtime calls
- network/MCP/provider calls
- raw store reads
- broad filesystem scans
- memory writes
- public MCP expansions

Rejected output stays low-disclosure and does not echo forbidden values.

## Validation

Targeted validation:

```text
node --test tests\vcp-toolbox-runtime-target-locator-preflight.test.js
```

Result:

```text
10/10 passed
```

Coverage:

- accepts default-path probe receipt when no VCPToolBox target is found
- accepts operator-provided sanitized local checkout target
- proves accepted targets feed the CM-1689 call-plan contract
- accepts service and MCP target references without endpoint values
- rejects locator values, secret values, config-env paths, and raw memory fields
  without echoing values
- rejects policies that allow secret/runtime/provider/broad-scan behavior
- rejects candidates that claim config env read or runtime call
- rejects positive execution counters
- rejects missing candidate fields and unknown discovery vocabulary
- proves the helper never performs runtime, provider, memory, or public MCP
  actions

## Boundary

CM-1690 did not:

- find a live VCPToolBox target
- read `config.env`
- read `.env`
- read a real endpoint value or token
- start or call VCPToolBox
- call MCP
- call providers
- read raw memory stores
- scan broad filesystem areas
- write memory
- wire runtime behavior
- expand public MCP tools
- claim production/release/cutover readiness

## Next Step

Recommended next task:

```text
CM-1691 VCPToolBox full-capability runtime target operator packet
```

That task should define the exact operator-provided fields needed to bind a real
VCPToolBox target without committing the path, endpoint, token, or config/env
values.
