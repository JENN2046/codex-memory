# ChatGPT Web R5-N Runtime Capability Preflight And Deterministic Failure Projection

## Status

R5-N is a source-only hardening stage based on
`main@f1dea016a7a167898d77be6575403e7a7d28c8d5`.

It closes the runtime ambiguity exposed by the R5-M exact-head private
behavioral verification:

1. a loopback listener could be bound into the private Governance environment
   without proving that it had loaded the exact diary-scope mapping and exposed
   only the expected selected-diary read capabilities;
2. a verified pre-provider mapping rejection could collapse into a generic
   Governance exception and later appear to ChatGPT as an Edge transport
   timeout;
3. the scope Widget did not consume the host `openai:set_globals` update path,
   so a completed resolve result could leave the placeholder visible.

R5-N does not activate a runtime, call a provider, read or write memory, modify
private configuration, change VCPToolBox core, or make a readiness claim.

## Capability Preflight Before Binding

Private runtime preparation is now asynchronous and performs two zero-read MCP
calls against the exact observed loopback target before it changes the
in-memory Governance binding:

```text
initialize
→ tools/list
→ validate exact capability fingerprint
→ recompute Governance binding digest
```

The preflight requires:

- an owner-only caller-injected existing Bearer value, used only in request
  memory and never returned in the preparation receipt;
- the exact governed shim server and protocol identity;
- `diary_allowlist_v1`;
- a loaded mapping whose reference and digest jointly match the trusted
  expected binding fingerprint;
- read-only mode;
- exactly `knowledge_base.search`, `memory_overview`, and `audit_memory`;
- exact governance metadata for each selected-diary read capability;
- no provider call, native invocation, memory write, or unrestricted search.

Missing mapping, binding mismatch, write enablement, missing tools, extra tools,
or governance-metadata drift fail closed before the target is bound.

The capability response is private loopback control-plane data. The resulting
low-disclosure preparation receipt records only categorical pass/fail facts;
it does not return the endpoint, target reference, mapping reference, mapping
digest, mapping fingerprint, Bearer value, raw tool list, or raw response.

## Exact Mapping Binding Fingerprint

The shim exposes a domain-separated SHA-256 capability fingerprint calculated
from both the full mapping reference and the full mapping digest. Runtime
preparation independently computes the expected fingerprint and requires an
exact match in both `initialize` and `tools/list`.

Changing either the reference or digest changes the fingerprint. The exact
mapping reference and digest remain undisclosed, and the fingerprint is not
copied into the public MCP result or Widget receipt projection.

This is a capability binding check, not a replacement for Governance
authorization or native result source post-checking.

## Deterministic Failure Projection

A native delegation rejection is projected as receipt-backed
`unavailable` only when the complete low-disclosure evidence proves all of the
following:

- the rejection occurred before provider and native invocation;
- the failure category is exact mapping missing or mapping binding mismatch;
- no memory read or write occurred;
- no derived-index or source-partition mutation occurred;
- no legacy, ambiguous, or unregistered partition was accessed;
- no global or unrestricted search occurred;
- a low-disclosure bridge audit receipt was appended;
- no endpoint, token, raw request, raw response, runtime output, or raw memory
  was disclosed.

The same deterministic projection applies to `search_memory`,
`memory_overview`, `audit_memory`, and `prepare_memory_context`.

If any required receipt fact is missing, contradictory, or unsafe, the
Governance runtime still fails closed. Genuine network, HTTP, JSON-RPC, expiry,
or Edge timeout failures remain terminal transport failures and are never
relabelled as `empty`, `denied`, or `unavailable`.

## Widget Host Updates

The scope Widget now supports both:

- the MCP Apps `ui/notifications/tool-result` message path;
- the ChatGPT host `openai:set_globals` event and `window.openai` globals.

It renders public structured content from `toolOutput` and Widget-only
categorical receipt presentation from `toolResponseMetadata`. It does not read
authorization state from the Widget, and it does not move private receipt
values into model-visible output.

This follows the official Apps SDK host bridge contract:

- <https://developers.openai.com/apps-sdk/build/chatgpt-ui#use-the-mcp-apps-bridge-recommended>
- <https://developers.openai.com/apps-sdk/reference#capabilities>

## Public Contract

R5-N keeps exactly the existing six tools and their exact input/output schema
digests:

```text
resolve_memory_context
memory_overview
search_memory
audit_memory
prepare_memory_context
render_memory_scope
```

No public MCP tool, input field, output field, or schema is added.

## Validation

The source matrix covers:

- exact six-tool schema digest preservation;
- `initialize` then `tools/list` ordering before binding;
- exact mapping reference-plus-digest fingerprint binding;
- missing, mismatched, writable, missing-tool, extra-tool, and metadata-drift
  rejection;
- missing or malformed injected transport authorization rejection and
  non-disclosure;
- transport, HTTP, JSON-RPC, and capability failure separation;
- deterministic receipt-backed `unavailable` projection for all four governed
  read tools;
- refusal to downgrade unsafe or incomplete failure evidence;
- terminal transport-failure preservation;
- Widget `openai:set_globals` and tool-result update paths;
- all prior ChatGPT R4/R5 contracts.

Current local results:

```text
R5-K/R5-N targeted: 16/16
all ChatGPT R4/R5 contracts: 126/126
default: 5863 pass / 0 fail / 8 skip
hardening: 97/97 + 6/6
CI-safe: 5954/5962 pass / 0 fail / 703 files
strict offline: 112 + 5863 + 43 + 43 pass
strict health: UNAVAILABLE_SERVICE_INACTIVE
```

Strict overall remains non-pass because no loopback service was started. The
complete source-validation result is recorded in `CMV-2238`.

## Non-Claims

R5-N does not claim:

- that a runtime has been activated or externally reverified;
- that ChatGPT always selects a memory tool automatically;
- that every native failure is safe to project as `unavailable`;
- that capability preflight grants read authorization;
- that production, release, deploy, cutover, or readiness gates are satisfied.

The R5-H, R5-L, and R5-M owner-only runtime artifacts remain unchanged.
