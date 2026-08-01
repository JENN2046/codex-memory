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
| Issuer throws a coded failure | exact boundary error code is preserved; no signed resolver terminal |
| Issuer returns an invalid result | exact `context_issue_result_invalid` boundary failure |
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

This is a validation tightening only. It does not add a tool, input, output
field, public schema variant, provider path, fallback, or memory-read path.

## Terminal evidence gap

The active source keeps `resolve_memory_context` outside
`governed_read_attempt.v1`, as intended. Governance currently creates context
and governance receipts, but Relay and Edge receive only their digests.
Resolver failures therefore have either:

- a signed status-only public projection (`denied` or `unavailable`); or
- an exact boundary error code rejected before a signed resolver result exists.

The tests preserve this distinction: they prove exact coded-error propagation
at the boundary and prove by exact shape checks that status-only projections do
not invent a reason. They do not relabel either form as a resolver terminal.

There is no immutable resolver operation identity, ordered resolver receipt
chain, canonical resolver terminal envelope, or protocol-level first-terminal
CAS. The existing transient request state prevents a normal late completion
from replacing a completed/cancelled/expired transport record, but that state is
not a resolver terminal receipt and does not preserve a canonical resolver
reason for Observer verification.

This gap means the consumed R5-O `_005` result cannot be reconstructed or
attributed to activation, mapping, scope, issuance, projection, or expiry from
the available low-disclosure facts.

## Follow-on dormant contract

The independent follow-on source change introduces a dormant,
transport-neutral `governed_context_resolution.v1` contract. It shares neutral
failure-registry infrastructure and the governed Observer verification model,
while retaining a separate operation identity and a resolver-specific evidence
model with no read counters. See `GOVERNED_CONTEXT_RESOLUTION_V1.md`.

Any change that adds its terminal projection to the public ChatGPT Edge v2
output schema remains outside this characterization and requires the applicable
current exact authorization before implementation.

## Validation

```bash
node --check packages/chatgpt-r4-contracts/validators.js
node --check tests/chatgpt-r4/governed-context-resolution-characterization.test.js
node --test tests/chatgpt-r4-governed-context-resolution-characterization.test.js
```

This evidence is synthetic and source-only. It does not establish R5-O, R5-H,
private-memory relevance, runtime health, deployment, release, or readiness.
