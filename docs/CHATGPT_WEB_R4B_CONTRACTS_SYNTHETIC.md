# ChatGPT Web R4-B Contracts And Synthetic Harness

Status: `IMPLEMENTED_LOCAL_CANDIDATE_EXTERNAL_RUNTIME_FALSE`

Architecture reference: `codex-memory-chatgpt-web-r4-v1`

Task / validation: `CM-2136` / `CMV-2221`

Date / timezone: `2026-07-18` / `Asia/Shanghai`

R4-B turns the frozen architecture into import-fenced, non-activated contract
modules and a zero-memory synthetic proof. It does not start or expose an Edge,
Relay, OAuth flow, MCP endpoint, provider, VCP runtime, or real memory path.

```yaml
primary_archetype: interactive_decoupled
candidate_profile_default: false
candidate_profile_activated: false
edge_service_implemented: false
relay_service_implemented: false
external_runtime_used: false
real_memory_read_performed: false
provider_call_performed: false
public_tool_surface_expanded: false
production_ready: false
release_ready: false
deploy_ready: false
cutover_ready: false
```

## Implemented Boundaries

```text
packages/chatgpt-r4-contracts
  canonical JSON + SHA-256
  Ed25519 signing and verification
  principal assertion and opaque project-context contracts
  request/response envelope builders and validators
  TTL, size, replay, disclosure, receipt, and counter gates

apps/chatgpt-edge
  non-default read-only candidate tool descriptors
  signed request-envelope construction only

apps/local-recall-relay
  injected verify-and-forward processor only
  no listener, mapping, provider, storage, or scope authority

apps/chatgpt-memory-scope-widget
  MCP Apps resource metadata, bounded DTO, and bridge messages
  no business-data API, raw memory, or authorization authority

src/adapters/chatgpt-r4
  injected local governance adapter
  project context is resolved locally and never from public ACL fields
```

The public tools accept a safe project alias or an opaque
`project_context_ref`. Public arguments containing client, project, workspace,
mapping, diary, partition, trusted-scope, or visibility-allowlist authority are
rejected. The internal signed project-context claim binds principal, ChatGPT
client identity, project, workspace, allowed visibility, registry, mapping,
time, and nonce; its internal project and mapping values are not returned.

## Candidate Tool Profile

The candidate profile contains five data tools and one render-only tool:

```text
resolve_memory_context
memory_overview
search_memory
audit_memory
prepare_memory_context
render_memory_scope
```

Every descriptor is read-only, non-destructive, and closed-world. The five data
tools are intentionally non-idempotent because requests and opaque project
contexts are one-shot replay-guarded contracts. Only the render tool is marked
idempotent and links the versioned widget resource. The candidate profile is not
imported by the active runtime and does not alter the existing default MCP tool
list.

## Synthetic Proof

The in-memory harness uses ephemeral Ed25519 identities and synthetic project
metadata. It performs exactly two request paths:

```text
resolve_memory_context
  -> Relay validation
  -> injected UDS boundary
  -> local context issuance

memory_overview
  -> Relay validation
  -> injected UDS boundary
  -> local governed synthetic empty result
```

The proof and focused matrix verify request/response digest binding, principal binding, opaque
context resolution, mapping-binding flags, signed response receipt-chain
digests, Widget DTO parsing, duplicate request rejection, context reuse
rejection, forged public authority rejection, and request/response byte ceilings.

```yaml
provider_calls: 0
native_invocations: 0
local_fallbacks: 0
primary_memory_writes: 0
derived_index_writes: 0
other_durable_mutations: 0
unrestricted_native_searches: 0
raw_disclosure: false
```

## Import Fences

The static gate rejects:

- Edge imports of local config, storage, recall, VCP adapters, or arbitrary
  packages;
- Relay imports of governance, mapping, provider, memory storage, or node I/O;
- Widget imports outside the shared DTO/contracts boundary;
- governance-adapter direct imports of existing core services in R4-B;
- dynamic imports, runtime environment reads, listeners, network calls,
  durable file mutation, and body logging in candidate packages;
- any active runtime entrypoint that imports the R4 candidate.

## Official Contract Basis

R4-B follows the current official Apps SDK surfaces for MCP Apps resource MIME,
`structuredContent`, `outputSchema`, `_meta.ui.resourceUri`, read-only tool
annotations, `ui/notifications/tool-result`, and `tools/call`:

- <https://developers.openai.com/apps-sdk/build/mcp-server>
- <https://developers.openai.com/apps-sdk/build/chatgpt-ui>
- <https://developers.openai.com/apps-sdk/plan/tools>
- <https://developers.openai.com/apps-sdk/reference>

No upstream example code was copied. The official examples were used only to
confirm current contract shape; the implementation remains dependency-free and
bounded by the frozen repository manifest.

## Next Gate

R4-C may add loopback-only Edge/Relay integration with temporary UDS and a
strict synthetic governance double. It may not read active config, start the
active memory service, expose a public endpoint, configure OAuth, call a
provider, or access real memory.
