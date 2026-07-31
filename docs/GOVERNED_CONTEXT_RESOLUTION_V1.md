# Governed Context Resolution v1

Status: dormant source contract; no live resolver or readiness claim

Task: `CM-2159 / governed_read_attempt_refactor`

Protocol: `governed_context_resolution.v1`

Base: `e7f8e233b7455ea913d7f7d574d72ec67b7dec79`

## Boundary

`resolve_memory_context` is a setup operation, not a governed memory read. This
protocol therefore uses one immutable `resolution_ref` and never creates an
`attempt_ref`. It is intentionally separate from `governed_read_attempt.v1`.

This delivery is dormant. The contract, transient coordinator, and Observer
are not imported by the live Edge broker, Relay processor, Governance resolver,
or governed-read runtime. It does not alter a tool descriptor, public input or
output schema, runtime binding, lifecycle state, provider path, or memory path.

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

## First-terminal CAS

`apps/chatgpt-edge/governed-context-resolution-coordinator.js` is an isolated,
in-memory first-terminal-wins coordinator. It is not exported by the live Edge
application.

- the first valid downstream terminal, timeout, or cancellation commits;
- a candidate at or after the immutable deadline loses to timeout;
- late completion and duplicate terminal candidates are rejected;
- a committed terminal immediately releases active admission capacity;
- active capacity is independent from bounded terminal retention;
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
at the deadline remains valid while replayed accepted/receipt/terminal chains
cannot increment the Observer's accepted business counters twice.

## Bounds

```yaml
header_max_bytes: 2048
receipt_max_bytes: 1024
receipt_max_count: 7
terminal_max_bytes: 4096
complete_protocol_max_bytes: 16384
ttl_max_seconds: 60
replay_tombstones_default: 4096
replay_tombstones_max: 65536
pending_observer_events_default: 256
pending_observer_events_max: 4096
```

## Synthetic evidence

The source-only tests cover the complete success chain, every registered
stage-failure path, first-terminal competition, deadline ordering, cancellation,
timeout, active-capacity reuse beyond 64 lifetime operations, coordinator loss,
Observer retention-window divergence and tamper rejection, malformed and
expired refs, post-eviction ref replay, missing issuance evidence,
cross-request receipt splicing, and fake read-counter injection.

The dormancy test also pins all six existing ChatGPT Edge tool input/output
schema digests and asserts that no live resolver or governed-read module imports
this protocol.

## Non-claims

This dormant source contract does not:

- activate resolver terminal receipts or add them to public Edge response v2;
- call `resolve_memory_context`, a provider, a search tool, or private memory;
- rebind, start, stop, restart, deploy, release, or publish a runtime;
- create or authorize a governed read attempt;
- establish R5-O, R5-H, readiness, or `RC_READY`; or
- authorize a later resolver-only diagnostic or memory read.
