# Governed Context Resolution Characterization

Status: source-only synthetic evidence; no live-runtime or readiness claim

Task: `CM-2159 / governed_read_attempt_refactor`

Base: merged `main` commit `3172db701bc181faa396d179446427f3ed2c048a`

## Purpose

This characterization isolates `resolve_memory_context` before any governed
read. It verifies the production source boundaries used by this chain:

```text
signed resolve request
-> transient Edge broker
-> Relay processor
-> Governance resolver
-> project registry and mapping
-> project_context_ref issuance
-> signed ChatGPT Edge data response v2
-> independent external-MCP response validation
```

The harness uses only generated signing identities, synthetic registry and
mapping data, in-memory state, and production contract/runtime modules. It does
not start or inspect the accepted schema-v6 runtime, call a provider, invoke a
read tool, hydrate a store, read memory, or perform a lifecycle action.

## Characterized paths

| Path | Source-level result |
|---|---|
| Successful mapped scope | one syntactically valid, unexpired context ref in a signed v2 response |
| Mapping not matched | signed low-disclosure `denied`; no context ref |
| Requested scope not allowed | signed low-disclosure `denied`; no context ref |
| Issuer reports unavailable | signed low-disclosure `unavailable`; no context ref |
| Issuer throws a coded failure | signed canonical `context_issuance_failed`; no context ref |
| Issuer returns an invalid result | signed canonical `context_issue_result_invalid`; no context ref |
| Response projection drops the ref | exact `response_structured_content_shape_invalid` rejection at Edge and external-MCP validation |
| Response projection carries a malformed ref | exact `project_context_ref_invalid` rejection at Edge and external-MCP validation |
| Response projection carries an expired ref | exact `response_context_expired` rejection at Edge and external-MCP validation |

All paths assert that the read bridge remains uncalled. Successful, denied, and
unavailable resolver results retain zero legacy provider, native, fallback,
primary-write, and derived-write counters.

## Finding repaired in this phase

Before this characterization, a signed response containing a correctly shaped
but already expired `project_context_ref` projection passed public response
validation. Context claims were checked during Governance issuance, but the
Edge/client response verifier checked only that the projected `expires_at` was
a canonical timestamp. The verifier now rejects a successful resolve response
when that projected expiry is not later than both its validation clock and the
response issuance time.

This is a validation tightening only. The later resolver-terminal projection
adds only the authorized v2 `resolution` output object; it does not add a tool,
change an input schema, add a provider path or fallback, or read memory.

## Resolver terminal evidence

The active source keeps `resolve_memory_context` outside
`governed_read_attempt.v1`, as intended. It now has an immutable
`resolution_ref`, ordered resolver receipts, canonical terminal envelope,
first-terminal CAS, and an independent Observer. Relay signs the terminal's
binding to both the exact request and public structured-content digest. Edge
and external MCP independently re-derive that binding before public output.

The authorized public projection carries only low-disclosure terminal facts.
It distinguishes context creation, Relay response inclusion, and Edge-verified
delivery through `context_ref_issued`, `context_ref_entered_response`, and
`context_ref_delivered`. Response-finalization failure can prove issuance while
retaining inclusion and delivery false. Status-only v2 resolver output cannot
pretend to have canonical evidence. The explicit Edge terminal-result and
confirmed transport-loss paths project incomplete evidence as `unavailable`
with null reason/category/origin; `terminal_missing` remains an Observer
violation that does not manufacture a canonical failure.

## Validation

```bash
node --check packages/chatgpt-r4-contracts/validators.js
node --check tests/chatgpt-r4/governed-context-resolution-characterization.test.js
node --test tests/chatgpt-r4/governed-context-resolution-characterization.test.js
```

This evidence is synthetic and source-only. It does not establish R5-O, R5-H,
private-memory relevance, runtime health, deployment, release, or readiness.
