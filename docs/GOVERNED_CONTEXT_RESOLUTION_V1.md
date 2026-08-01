# Governed Context Resolution v1

Status: resolver terminal wiring and public terminal projection active in
source; runtime rebind and readiness claims remain pending

Task: `CM-2159 / governed_read_attempt_refactor`

Protocol: `governed_context_resolution.v1`

Base: `e7f8e233b7455ea913d7f7d574d72ec67b7dec79`

## Boundary

`resolve_memory_context` is a setup operation, not a governed memory read. This
protocol therefore uses one immutable `resolution_ref` and never creates an
`attempt_ref`. It is intentionally separate from `governed_read_attempt.v1`.

The contract is wired through the source-level Edge broker, Relay processor,
Governance resolver, and context issuer. Each resolver operation receives one
internal terminal candidate under this protocol. The source-level public
`resolve_memory_context` output now adds its low-disclosure terminal projection;
tool names and resolver input schema remain unchanged. This change does not
rebind runtime source, change lifecycle state, call a provider, or enter a
memory path.

## Ordered evidence

The resolver stage order is:

```text
CREATED
-> EDGE_VALIDATED
-> RELAY_CLAIMED
-> REGISTRY_RESOLVED
-> SCOPE_RESOLVED
-> CONTEXT_ISSUED
-> RESPONSE_FINALIZED
-> TERMINAL_SUCCESS / TERMINAL_FAILURE
```

`ResolutionHeader` contains the protocol identity, operation, request digest,
creation time, deadline, and fixed Edge coordinator role. It has no mutable
state or current-stage field.

Each non-terminal stage appends one bounded hash-chain receipt. A receipt binds
the unchanged `resolution_ref`, sequence, stage, fixed origin, outcome, prior
digest, resolver-owned safe facts, and one canonical reason when it fails.
Sequence gaps or duplicates, stage gaps or regression, origin substitution,
cross-request receipt splicing, unknown reasons, oversize values, and digest
tampering fail closed.

## Terminal evidence

The terminal envelope is derived from the immutable header and accepted receipt
chain. It projects only resolver evidence:

```yaml
protocol: governed_context_resolution.v1
resolution_ref: gcr_...
outcome: success | failure
last_completed_stage: stage | null
failed_stage: stage | null
reason_code: safe_code | null
failure_category: safe_category | null
failure_origin: safe_origin | null
fallback_policy: forbidden
evidence_complete: true | false
mapping_resolved: true | false | null
scope_resolved: true | false | null
context_ref_issued: true | false | null
context_ref_shape_valid: true | false | null
context_ref_unexpired: true | false | null
context_ref_entered_response: true | false | null
context_ref_delivered: true | false | null
read_attempt_created: false
```

Missing evidence remains `null`; a registry property never turns missing
evidence into zero or false. In particular, absence of a `CONTEXT_ISSUED`
receipt cannot prove that issuance failed. A success terminal requires the
complete ordered chain and explicit true evidence for mapping, scope, issuance,
shape, and expiry. A malformed or expired context ref can only form a failure
terminal.

Resolver terminals contain no provider, native invocation, primary-memory,
derived-transaction, fallback, or read-attempt counters. Exact-shape validation
rejects attempts to add them.

## Canonical failure registry

`packages/chatgpt-r4-contracts/governed-failure-registry.js` supplies the shared
transport-neutral registry definition and lookup helpers. The resolver's sole
reason/category/stage/origin/fallback mapping lives in
`packages/chatgpt-r4-contracts/governed-context-resolution.js`; the coordinator
and Observer derive or validate against it instead of maintaining local
allowlists.

`terminal_missing` is registered for safe Observer attribution but cannot be a
terminal candidate. It records a protocol violation only.

Each failure-registry entry also declares whether its canonical
reason/category/stage/origin facts are safe for this public projection. Edge
and Relay use that one registry declaration; they do not maintain a second
public-reason allowlist.

## Public response-v2 projection

The signed `resolve_memory_context` response now contains its existing context
fields plus the following low-disclosure `resolution` object:

```yaml
resolution:
  protocol: governed_context_resolution.v1
  outcome: success | failure
  last_completed_stage: STAGE | null
  failed_stage: STAGE | null
  reason_code: safe_code | null
  failure_category: safe_category | null
  failure_origin: safe_origin | null
  context_ref_issued: true | false | null
  context_ref_entered_response: true | false | null
  context_ref_delivered: true | false | null
  evidence_complete: true | false
```

It excludes `resolution_ref`, terminal and receipt digests, project mapping,
context token contents, paths, registry internals, counters, provider facts,
and raw response data. A successful response requires `context_status:
resolved`, a syntactically valid unexpired `project_context_ref`,
`context_ref_issued: true`, `context_ref_entered_response: true`, and
`context_ref_delivered: true`. Governance proves issuance, Relay proves that
the ref entered public content, and Edge verifies the signed content/binding,
clones it, records low-disclosure digest evidence, and only then permits
terminal CAS. For a response finalization or projection failure, issuance
remains true while inclusion and delivery are explicitly false at
`RESPONSE_FINALIZED`; it is never relabelled as issuance failure.

Relay signs a binding digest over the request digest, `resolution_ref`,
terminal digest, and public structured-content digest. Edge re-derives that
binding before terminal CAS and emits low-disclosure response-verification
evidence. Observer independently reconciles that evidence with the terminal
and public projection without retaining a context ref or response body. The
external MCP validator verifies the Relay signature and independently
re-derives the protocol, projection, status, and binding before exposing
output. A relayed v2 resolver response without canonical terminal evidence,
and every v1 response, is rejected.

When evidence is genuinely incomplete, only the external Edge's explicit
terminal-result wrapper or confirmed transport-loss path can locally emit the
low-disclosure fallback: `context_status: unavailable`,
`evidence_complete: false`, and `reason_code`, category, and origin all
`null`. It is unconfirmed rather than Relay-signed/bound. Callers must not
infer a likely canonical reason. `terminal_missing` remains an Observer
violation and never becomes a fabricated public terminal.

## First-terminal CAS

`apps/chatgpt-edge/governed-context-resolution-coordinator.js` is an isolated,
in-memory first-terminal-wins coordinator used by the Edge broker. It does not
introduce a new public Edge surface.

- the first valid downstream terminal, timeout, or cancellation commits;
- a candidate at or after the immutable deadline loses to timeout;
- late completion and duplicate terminal candidates are rejected;
- a committed terminal immediately releases active admission capacity;
- active capacity is independent from bounded terminal retention;
- when retained terminal payload capacity is full, the oldest closed payload is
  evicted while its replay tombstone remains authoritative;
- terminal payloads may expire early, but a bounded lightweight replay
  tombstone rejects the same `resolution_ref` through its immutable deadline
  plus one shared bounded asynchronous-delivery grace;
- coordinator and Observer replay-tombstone capacity use that same expiry,
  fail closed while retained, and reclaim together after the grace;
- synchronous Observer callbacks cannot reenter coordinator mutations;
- promise-returning Observer sinks are serialized in emission order without
  delaying or changing the coordinator's terminal CAS;
- asynchronous delivery retains at most 256 events by default (4096 maximum),
  records low-disclosure queue drops, thrown/rejected sinks, or explicit
  synchronous/asynchronous `false` refusal, and blocks new admission after any
  delivery loss; and
- coordinator loss emits `terminal_missing`, fabricates no terminal, and
  permanently closes that coordinator to subsequent mutation.

## Independent observation

`apps/local-recall-relay/governed-context-resolution-observer.js` independently
validates headers, receipt identity, origin, sequence, hash chain, failed-stage
reason binding, and terminal derivation. Its snapshot exposes aggregate counts
and one safe violation code only. It projects no resolution identifier, context
reference, response body, provider/native inference, raw memory, or secret.
Before rejecting a new accepted resolution at its retention bound, it evicts the
oldest terminal or missing record. Active chains are never evicted, so a shorter
coordinator terminal-retention window cannot poison Observer admission.
Eviction preserves a bounded lightweight replay tombstone through the immutable
deadline plus one bounded transport TTL, including only enough closure state to
validate a later coordinator terminal rejection. `accepted_at_ms` proves
coordinator-side admission before the deadline, so a serialized event delivered
at the deadline remains valid. Expired records and tombstones are pruned before
every recognized coordinator event, so post-grace terminal-rejection replay
cannot increment accepted business counters or retain identifiers indefinitely.

## Bounds

```yaml
header_max_bytes: 2048
receipt_max_bytes: 1024
receipt_max_count: 7
terminal_max_bytes: 4096
complete_protocol_max_bytes: 16384
ttl_max_seconds: 60
replay_tombstones_default: 4096
replay_tombstones_max: 8388608
pending_observer_events_default: 256
pending_observer_events_max: 4096
```

The live broker derives replay-tombstone capacity from `maxRecords` and the
configured retention window. Configurations requiring more than the bounded
maximum are rejected at construction rather than failing later during valid
resolver turnover.

## Synthetic evidence

The source-level tests cover the complete success chain, every registered
stage-failure path (including final issuance denial), first-terminal competition,
deadline ordering, cancellation, timeout, active-capacity reuse beyond 64
lifetime operations, coordinator loss, Observer retention-window divergence
and tamper rejection, malformed and expired refs, post-eviction ref replay,
missing issuance evidence, cross-request receipt splicing, and fake read-counter
injection.

Characterization and external-MCP tests pin all six ChatGPT Edge tool input
schemas, the five non-resolver outputs, and the resolver's deliberate output
projection. They cover terminal/public-content splicing, request/ref injection,
terminal-digest tampering, response-content tampering, v1/status-only
downgrade rejection, first-terminal competition, and Observer missing-terminal
non-fabrication.

## Non-claims

This source-level terminal wiring and public projection do not:

- call `resolve_memory_context`, a provider, a search tool, or private memory;
- rebind, start, stop, restart, deploy, release, or publish a runtime;
- create or authorize a governed read attempt;
- establish R5-O, R5-H, readiness, or `RC_READY`; or
- authorize a later resolver-only diagnostic or memory read.
