# ChatGPT Web R5-M Alias, Result Semantics, And Widget Receipt Projection

## Status

R5-M is a source-only hardening stage based on
`main@aa2d01813406068e410a0776d0295533023104f6`.

It closes four findings from the R5-L private behavioral canary:

1. an explicitly supplied registered alias could be rejected merely because it
   resembled the App, connector, or repository name;
2. an active lease with a mismatched alias, principal, or visibility was
   projected as `unavailable` instead of receipt-bound `denied`;
3. a native candidate without a numeric score was assigned fabricated
   relevance `0.5`;
4. the Widget did not reliably unwrap nested canonical ChatGPT tool-result
   envelopes and could leave its initial placeholder looking like a real
   `missing` result.

R5-M does not activate a runtime, call a provider, read or write memory, change
VCPToolBox core, or make a readiness claim.

## Exact Alias Recognition

Model guidance now distinguishes an explicit alias from an unlabelled display
identity:

- when the user or trusted task context explicitly labels a value as
  `project_alias`, the model copies that value verbatim;
- the value remains valid even when it happens to match an App, connector, or
  repository name;
- an unlabelled App/connector/repository name remains insufficient;
- `current`, `default`, `this-project`, guessed aliases, normalization,
  enumeration, and probing remain forbidden.

This changes guidance only. It does not add alias discovery, a registry-listing
tool, or a public schema field.

## Denied Versus Unavailable

The private session controller now carries two separate internal facts:

- activation lifecycle status such as `active`, `inactive`, `expired`,
  `killed`, or `consumed`;
- the governed public classification, `denied` or `unavailable`.

An active lease with a mismatched principal, project alias, or visibility is an
authorization mismatch and projects `denied`. Inactive, expired, killed,
consumed, duplicate, and capacity states remain `unavailable`.

The low-disclosure activation receipt remains bound. No alias, principal,
mapping value, diary name, or private digest is added to public output.

## Candidate Relevance

`searchProjection` no longer coerces missing, string, null, or non-finite native
scores to `0.5`.

- a candidate must carry an explicit finite numeric score;
- candidates below the existing public relevance floor of `0.5` are excluded;
- an exact `0.5` candidate remains schema-compatible but is explicitly
  described to the model as low-confidence and inconclusive;
- a found candidate remains a retrieval signal, not proof of the requested
  fact by itself.

The same projection rule applies to task-context assembly because
`prepare_memory_context` uses the bounded search projection.

## Widget Receipt Projection

The Widget now unwraps the bounded canonical result envelope used by ChatGPT,
including nested `result`, `call_tool_result`, `mcp_tool_result`,
`structuredContent`, `structured_content`, and `_meta` containers.

Traversal is bounded and only extracts:

- the public structured scope result;
- the categorical `codex-memory/receiptPresentation` object.

Until a governed result is available, the Widget displays
`Waiting for governed result`. It no longer renders an initial `Missing` state
that could be mistaken for a receipt-backed result.

This follows the Apps SDK bridge contract: model-visible data stays in
`structuredContent`, while Widget-only receipt presentation remains in
tool-response metadata.

## Public Contract

R5-M keeps exactly the existing six tools and their exact input/output schema
digests:

```text
resolve_memory_context
memory_overview
search_memory
audit_memory
prepare_memory_context
render_memory_scope
```

No public MCP tool or schema is added.

## Validation

The source matrix covers:

- explicit alias versus unlabelled display-name behavior;
- active scope/principal/alias mismatch as `denied`;
- inactive and lifecycle failure preservation as `unavailable`;
- rejection of missing, null, string, non-finite, and below-floor scores;
- low-confidence boundary guidance at relevance `0.5`;
- canonical nested Widget result and receipt metadata extraction;
- neutral pre-result Widget state;
- exact six-tool schema digest preservation;
- all prior ChatGPT R4/R5 contracts.

Current local results:

```text
R5-M plus affected R4/R5 targeted: 47/47
all ChatGPT R4/R5 contracts: 118/118
default: 5855 pass / 0 fail / 8 skip
hardening: 97/97 + 6/6
```

The final CI-safe and strict-gate results are recorded in `CMV-2237`.

## Non-Claims

R5-M does not claim:

- that ChatGPT will always select a memory tool automatically;
- that the R5-L runtime findings are externally reverified;
- that a relevance score alone proves a fact;
- that the private runtime is active;
- that production, release, deploy, cutover, or readiness gates are satisfied.

The immutable R5-H and R5-L owner-only artifacts remain unchanged.
