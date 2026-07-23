# ChatGPT Web R5-K Scope Clarification, Receipt Presentation, And Terminal-Stop Closure

## Status

R5-K is a source-only hardening stage based on
`main@1663dd0dbd79f42146ad18cede153dbb4c7b8f30`.

It closes five behavior and presentation defects observed during the R5-J
private canary and replaces the temporary isolated-shim endpoint repair with a
formal private runtime-preparation contract.

This stage does not activate a runtime, call a provider, read or write memory,
change VCPToolBox core, or make a readiness claim.

## Five Closed Behavior Defects

### 1. Missing scope is clarified, not guessed

The first 512 characters of the MCP server instructions now carry the complete
selection boundary:

- memory-irrelevant tasks must not select a memory tool;
- both an exact registered project alias and an exact visibility are required;
- when either value is missing, the model must ask one concise clarification
  and call no tool;
- `current`, `default`, `this-project`, App/connector names, URLs, client names,
  workspace names, opaque references, and inferred repository names are not
  valid substitutes;
- `task_start_context` is never presented as a default or minimal-disclosure
  choice.

The resolve descriptor repeats the same boundary. The public input schema is
unchanged; a client that still omits visibility receives the existing
receipt-bound fail-closed result.

### 2. One read result is terminal

After the first bounded read attempt, every governed status and every transport
failure is described as terminal. The model is instructed to answer from that
single result and not call another read tool, resolve again, switch tools, or
invoke the render helper.

This improves model behavior. The one-read lease remains the security
enforcement boundary.

### 3. Result receipt and context issuance are presented separately

The Widget no longer displays a receipt-bound denial as
`Receipt not_available`. It now presents two independent low-disclosure fields:

- `Result receipt`: whether the governed result is receipt-bound;
- `Context reference`: whether a usable project context was issued.

Only these categorical fields are placed in tool-result `_meta`, which is
available to the Widget but not added to model-visible structured content.
Raw receipt values, mapping digests, diary names, paths, and authorization
material are never projected.

The scope Widget is attached directly to `resolve_memory_context`, and its URI
is versioned as `memory-scope-widget-v2.html` so clients do not reuse stale
cached presentation code.

### 4. The render helper cannot influence model selection

`render_memory_scope` remains one of the frozen six public MCP tools for
compatibility, but its descriptor now declares `_meta.ui.visibility: ["app"]`.
It is a component-only helper and is not model-visible. The model-visible
resolve tool carries the Widget resource instead.

This uses the Apps SDK component/tool separation without changing a public tool
name or input/output schema.

### 5. Governed failures and transport failures are unambiguous

Receipt-bound `denied`, `unavailable`, and other governed outcomes explicitly
state that a result receipt exists and whether a context reference was issued.
They are not described as transport failures.

A real transport timeout, cancellation, or expiry explicitly states that no
receipt-bound memory result was returned. It remains terminal and must not be
reported as an invented number of retries.

## Formal Private Runtime Preparation

`src/runtime/chatgpt-r4/private-runtime-preparation.js` is the formal
preparation seam for a bounded private Governance launch.

It accepts an observed isolated-shim target only when:

- the target shape is exact and versioned;
- the listener was observed before preparation;
- the listener is loopback-only;
- native write is disabled;
- the port and exact `/mcp/vcp-native` path are valid;
- the target reference is non-placeholder and low-risk.

The preparation step derives the endpoint from those observed listener facts,
replaces any stale target reference and endpoint in the private environment,
and recomputes the Governance binding digest. It does not trust or copy a
caller-supplied endpoint string.

The returned receipt reports only categorical binding facts. It does not
return the endpoint, target reference, private digest, token, or secret.

No private target value or runtime configuration is committed by R5-K.

## Public Contract

R5-K keeps exactly these six tools:

```text
resolve_memory_context
memory_overview
search_memory
audit_memory
prepare_memory_context
render_memory_scope
```

Their exact input/output schema digests are unchanged from the R5-I merged
baseline. No public MCP tool or schema is added.

## Validation

The source validation matrix covers:

- first-512-character clarification and negative abstention;
- exact alias/visibility selection and no identity probing;
- app-only render visibility and direct resolve Widget attachment;
- six-tool name and exact schema-digest preservation;
- terminal receipt-bound result and transport-failure projection;
- low-disclosure Widget receipt presentation;
- stale private target replacement from an observed isolated listener;
- rejection of unobserved, writable, non-loopback, malformed, and
  shape-expanded targets;
- all prior R4/R5 contracts.

Current focused and contract results:

```text
R5-B/R5-I/R5-K targeted: 19/19
all ChatGPT R4/R5 contracts: 112/112
default: 5849 pass / 0 fail / 8 skip
hardening: 97/97 + 6/6
CI-safe: 5940/5948 pass / 0 fail (701 files; reported skipped count 9)
```

The default, CI-safe, strict-offline, documentation, current-facts, ledger, and
diff checks are recorded in `CMV-2236`.

Strict contract/test/compare/rollback subgates pass
`112 + 5849 + 43 + 43`. Strict overall remains non-pass only because the
source-only stage did not start the inactive loopback health service at
`127.0.0.1:7605`.

## Non-Claims

R5-K does not claim:

- that ChatGPT will always select a memory tool automatically;
- that every model will obey terminal guidance;
- that the private runtime has been activated or externally verified;
- that any memory result was read;
- that production, release, deploy, cutover, or readiness gates are satisfied.

The immutable R5-H 20-session artifact and its incomplete matrix remain
unchanged.
