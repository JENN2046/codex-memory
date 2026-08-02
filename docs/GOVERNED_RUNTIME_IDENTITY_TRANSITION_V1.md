# Governed Runtime Identity Transition v1

`governed_runtime_identity_transition.v1` is a dormant, transport-neutral
source contract for changing an accepted runtime source identity while the
runtime remains stopped and held. It is not wired to the lifecycle controller,
an MCP tool, a CLI, or a live identity store.

## Identity separation

The contract keeps two identities distinct:

- Controller authority identity proves who may authorize a transition. Its
  stable `authority_id` and `authority_lineage_digest` are independent of a
  repository checkout, source head, and runtime manifest.
- Runtime source identity identifies the exact accepted source through its
  source head, manifest schema and digest, profile schema, endpoint identity,
  protocol versions, runtime lineage, and accepted identity digest.

An authority may manage a runtime identity. A checkout, candidate tree, or
runtime manifest cannot establish authority by itself, and the authority proof
is bound to one transition request. The coordinator requires an atomic
authority-proof replay store; a live adapter must persist it across coordinator
or process restarts. The included in-memory adapter is synthetic but retains
consumption across coordinator recreation when the same store is reused.
The coordinator separately requires an atomic transition-record store that
reserves each `transition_ref` with its request digest and retains the terminal
protocol. Active reservations use a bounded admission set; finalization moves
the complete protocol into a separate durable archive whose replay marker is
still consulted on every reservation. Archived terminals do not count against
the active-reservation limit. Observer-acknowledged coordinator loss likewise
moves a reservation to a protocol-free `lost` replay marker, freeing admission
capacity without fabricating a terminal. A live adapter must persist both tiers and back
the terminal archive with scalable storage or an equivalent compacted replay
index. Expired requests are rejected before reservation and cannot consume
either tier.

## Canonical request and digests

Every request uses protocol `governed_runtime_identity_transition.v1` and a
`grit_...` transition reference. The canonical digest includes all request
fields:

- stable authority ID, authority lineage, and proof digest;
- the complete `from_runtime` identity;
- the complete candidate source and manifest binding;
- stopped/held lifecycle state, zero running components, and the exact
  safe-stop receipt digest;
- creation time, expiry, and nonce; and
- when required, the exact legacy migration evidence tuple.

The authority proof context binds the full request with the proof value
replaced by `null`. This prevents a proof from approving itself while retaining
all other transition bindings. Verifier output is reduced to a canonical,
allowlisted authority-evidence projection before the one-shot proof is
consumed. Candidate-verifier output is likewise reduced to its canonical
allowlisted manifest-evidence projection before receipt hashing or commit-time
revalidation. Preview validation also binds the request,
authority context, expected store version, and ordered receipt digests.

## State machine

The only successful path is:

```text
CREATED
-> AUTHORITY_VERIFIED
-> SAFE_STOP_VERIFIED
-> FROM_IDENTITY_VERIFIED
-> CANDIDATE_MANIFEST_VERIFIED
-> TRANSITION_PREPARED
-> TRANSITION_COMMITTED
-> POST_IDENTITY_VERIFIED
-> TERMINAL_SUCCESS
```

A failure may terminate at any non-terminal stage, but must use the canonical
failure registry and produce a canonical `TERMINAL_FAILURE`. Receipt order,
origin, predecessor digest, transition reference, and evidence state are
validated. Unknown evidence remains `unknown`; it is never upgraded to
verified. A missing terminal is an Observer protocol violation, not a synthetic
default failure terminal.

A replay of an existing `transition_ref` returns a separate canonical replay
failure without replacing or emitting over the authoritative prepared or
terminal record for that reference. Coordinator recreation cannot make a
reserved or terminal reference reusable.

## Atomic commit

The dormant coordinator prepares a complete next state and submits it through
one versioned compare-and-swap. The CAS candidate simultaneously contains:

1. the new accepted runtime identity;
2. the stable authority-to-runtime management binding;
3. the advanced runtime lineage;
4. the consumed one-time legacy migration marker when applicable;
5. the transition protocol and terminal digests; and
6. explicit false values for runtime start, repository change, resolver,
   search, provider, and memory effects.

The CAS state retains the complete canonical protocol as well as its digests.
State validation requires that retained protocol to be a success and
independently re-derives its accepted runtime and stable authority binding;
neither a failure protocol nor a self-consistent protocol from another branch
can serve as `last_transition`. Stable binding authority IDs use the same
canonical `grauth_...` format as requests. A stable controller binding without
that matching `last_transition` is invalid; only the initial legacy-coupled
state may omit it.
The transition-record store is a secondary durable replay index: coordinator
construction and every new preview/commit boundary verify or reconstruct that
index from the atomically committed protocol. No later transition is admitted
while the preceding CAS terminal is missing from the secondary index, closing
the crash window between state CAS and index finalization.
Coordinator-loss reporting enumerates durable reservations, reports each
missing terminal, and never fabricates a default failure terminal. Once its
missing event is synchronously acknowledged, the reservation is atomically
archived as `lost`, so reconstruction cannot emit it again or wedge the global
Observer outbox. While that event remains unacknowledged, repeated loss audits
detect the pending envelope and do not enqueue duplicates.

Immediately before CAS, the coordinator revalidates store version, exact
`from_runtime`, stopped/held state, safe-stop receipt, and candidate manifest.
It checks request expiry again after candidate revalidation and state
construction, directly before establishing commit context and invoking CAS, so
a slow verifier cannot carry expired authority into the atomic write.
Because commit-context persistence may itself block, expiry is checked once
more after that write returns and immediately before `compareAndSwap()`.
When the current controller binding already uses the stable authority model,
the request authority ID and lineage must match it both during preview and
immediately before CAS. Authority rotation requires a separate protocol.
CAS loss leaves the old state unchanged. A store that reports a write without
the exact committed state is classified as fatal
`partial_transition_detected`. A successful transition never starts the
runtime. If the store atomically commits the exact candidate but loses its
acknowledgement, the subsequent exact snapshot comparison recognizes the
commit as success and completes the same terminal instead of writing a
conflicting failure.

## One-time legacy migration

The compatibility route exists only for a store still using
`legacy_source_coupled`. It requires one exact evidence tuple:

```yaml
safe_stop_receipt_digest:
accepted_runtime_identity_digest:
accepted_runtime_lineage_digest:
accepted_runtime_manifest_digest:
current_controller_client_identity_digest:
candidate_manifest_digest:
```

All six values must match the current store and request, and an independent
stable-authority verifier must still approve the request context. The migration
marker is committed atomically and cannot be consumed twice. Neither the
current controller checkout nor the candidate source can register itself as an
authority.

## Observer and failure registry

The Observer consumes only the canonical request, ordered receipt stream,
governed atomic-state projection, atomic commit event, and terminal. It
independently derives the accepted runtime identity and stable controller
binding from the recorded request, validates the governed state projection,
binds its lifecycle receipt to the request, verifies one-shot legacy migration
consumption when applicable, and recomputes its digest instead of trusting a
shaped digest string. Across verified atomic commits it also retains the last
authoritative store version, state digest, and accepted runtime. The next
commit must advance the version by exactly one and its `from_runtime` must
equal that accepted runtime, so mutually exclusive CAS forks cannot both be
reported as verified. The one-time legacy migration marker must also remain
unchanged on later non-migration commits. It then
reconstructs the terminal and requires it to equal the terminal already bound
to the verified atomic commit. It rejects spliced transitions, incorrect
receipt order or origin, duplicate atomic commits, terminal mismatch, missing
terminals, and post-terminal events. Terminal records move out of the bounded
active set into a bounded reconciliation history, so completed transitions do
not permanently consume admission capacity while cumulative governance
counters remain intact.
Compact terminal replay markers remain after full reconciliation records rotate
out, and can be snapshotted into a rebuilt Observer. A live Observer adapter
must persist or safely compact these markers so a rotated `transition_ref`
cannot be admitted again.
Observer reconstruction also takes the last complete governed atomic state,
revalidates it, and restores its version, canonical state digest, accepted
runtime, stable controller binding, legacy marker, and terminal replay marker
before consuming new events. Later commits must retain the same stable
authority ID and lineage; ordinary transitions cannot rotate authority.
Process restart therefore does not reset atomic-chain verification.
Persisted legacy migration state is valid only when `consumed: true` carries
its exact evidence digest; unconsumed state must carry no evidence digest.
Numeric protocol versions are positive safe integers (symbolic bounded version
strings remain supported), so zero or negative bindings fail closed.
Authority-proof replay markers use an expandable snapshot-backed index rather
than the active-reservation admission bound; reconstructing the store preserves
all consumed markers without making the 4097th proof unavailable. Observer
reconstruction accepts the authoritative version-zero state and binds the first
commit to its exact canonical state digest.
Restored success protocols must bind the current lifecycle safe-stop receipt;
when the retained success performed the one-shot legacy migration, its evidence
digest is recomputed from the retained canonical request before acceptance.
Transient state readback failure after a successful CAS is recovered without
writing a contradictory failure terminal. Once a terminal is durably indexed,
the coordinator releases its local working record and protocol lookup uses the
persistent terminal archive.
If other coordinators commit one or more successors before the first
coordinator reads back its winning CAS, the first commit remains a success only
when the durable archive reconstructs every intervening state from exact
previous-state digests, consecutive store versions, canonical protocols, and
matching `from_runtime` identities. An unrelated, ambiguous, incomplete, or
malformed later state is still a fatal partial transition.
The same chain reconstruction applies when an original coordinator retries
after post-CAS readback failure: a later legal transition does not hide or
invalidate the earlier durable success, and the retry returns the earlier
transition's own runtime, binding, and state digest.
It also applies when CAS committed but threw instead of acknowledging: a
successor committed before the exception readback is verified through the
durable chain and cannot turn the earlier success into a conflicting failure.
If crash recovery finalizes a success that had not yet reached observers, the
coordinator replays the missing post-preview receipts, atomic commit, and
terminal event from the authoritative state before releasing the local record.
Observer transport exceptions and explicit `false` acknowledgements retain an
ordered outbox inside the transition record store. Its snapshot carries pending
envelopes and sequence numbers across coordinator reconstruction; delivery ack
removes only the exact head event. The acknowledged-event ledger retains each
complete canonical envelope with its verified digest; bare or mismatched digest
claims are rejected, and recovery compares full envelopes before suppressing
redelivery. Delivered entries retain their original sequence. If any later
event is still pending during reconstruction, the store restores the complete
delivered prefix ahead of that suffix: an existing Observer consumes exact
replays idempotently, while a fresh Observer rebuilds the active transition in
canonical order. Active reservations also restore their delivered prefix when
the outbox is empty, ensuring a later coordinator-loss report has an active
Observer record to close. Archived protocol lookup validates and
returns the durable terminal before consulting identity state as a fallback.
Persisted envelopes use a closed event registry with exact payload shapes.
Unknown event names, missing required payloads, invalid receipt chains, and
malformed atomic projections are rejected during store reconstruction and
before live enqueue, so they cannot wedge the global FIFO.
`transition_preview_formed` persists the complete canonical preview rather
than an unauditable standalone digest, allowing reconstruction to validate its
request, receipt prefix, expected store version, and context digest together.
An unacknowledged new admission is discarded from the outbox and terminalized
without Observer emission, so it cannot head-block terminal events for already
active transitions. Event sinks must explicitly declare
`synchronous_ack.v1`; declared async functions are rejected before use, while
an undeclared thenable response raises
`transition_observer_async_ack_invalid` and leaves its durable outbox entry for
synchronous recovery. A post-reservation initial-state read fault closes the
reservation with a canonical durable failure.
Observer commit anchors retain the complete lifecycle projection, so later
versions cannot replace the safe-stop receipt. A consumed
`transition_terminal_missing` remains a recorded protocol violation but returns
delivery acknowledgement, preventing its durable outbox entry from wedging the
stream.
Before CAS, the reserved record persists the exact previous-state digest and
retains validated delivered event envelopes. Reconstruction can therefore regenerate only
missing post-CAS receipts, atomic commit, and terminal envelopes from the
authoritative state even without a local preview record. Protocol lookup during
event dispatch skips outbox flushing, so a synchronous Observer callback cannot
recursively redeliver the queue head.
A persisted success terminal without that previous-state digest is invalid;
only uncommitted reservations, lost markers, or failure terminals may omit the
anchor. The atomic `last_transition` stores the same digest, allowing a missing
secondary record to recover its commit context before success finalization.
The Observer acknowledges an exact canonical event replay idempotently without
incrementing counters or replaying state changes. A changed envelope for the
same transition remains a protocol violation. This closes the crash window
where the sink accepted an event but durable outbox acknowledgement failed.
The shared record store likewise treats a repeated acknowledgement as success
only when that exact digest is already present with its full delivered
envelope. This serializes cross-coordinator dispatch races without accepting a
different or out-of-order event.
Event creation is independent of transport availability. When no `eventSink`
is attached, acceptance, receipts, atomic commit, and terminal envelopes remain
queued in full; a later synchronous Observer can consume the stream from its
canonical beginning.
When an Observer starts from a committed authoritative state, it derives the
exact canonical event set for that state's `last_transition` and acknowledges
matching pending envelopes idempotently. Events that do not match the state
remain subject to ordinary validation and rejection.
For every atomic event, the top-level `previous_state_digest` must also equal
`state_projection.last_transition.previous_state_digest`; the Observer never
anchors a projection to a different predecessor than the event it verified.
If an offline outbox contains successful commits older than the Observer's
initial authoritative state, they are accepted only as a provisional strictly
monotonic prefix. No atomic or terminal success is counted as verified until
that prefix reaches the exact predecessor digest and `from_runtime` bound by
the initial state's `last_transition`; the current state itself remains the
live successor anchor. Provisional terminals move out of the bounded active
admission set, so a history longer than the live retention window cannot block
the commit that closes the prefix. Acceptance also requires its envelope
`transition_ref` to equal the canonical request reference. The Observer applies
the same closed event registry and exact envelope shapes to direct delivery as
the durable record store applies during enqueue and reconstruction.

The unique failure registry includes:

```text
authority_unverified
authority_lineage_mismatch
safe_stop_receipt_invalid
runtime_not_stopped
runtime_not_held
from_identity_changed
from_manifest_changed
candidate_manifest_invalid
candidate_manifest_scope_dirty
profile_schema_mismatch
endpoint_identity_mismatch
protocol_binding_invalid
transition_expired
transition_replayed
transition_cas_lost
transition_record_store_unavailable
post_identity_mismatch
partial_transition_detected
terminal_missing
```

## Synthetic attack coverage

The fixture suite covers receipt splicing, lineage mixing, stale safe-stop
receipts, resumed runtimes, all `from_runtime` drift, candidate digest/content
mismatch, dirty scope, checkout and candidate authority impersonation,
cross-transition proof replay, late candidates, CAS competition, partial-write
detection, stopped-after-success, prohibited side effects, independent Observer
reconstruction, missing terminals, unknown evidence, and one-shot legacy
migration.

## Non-claims

This source construction does not:

- repair the current controller or accepted runtime identity;
- accept the candidate source or execute a real transition;
- modify a checkout, profile, identity record, or runtime manifest;
- call `rebind-source`, `start`, `restart`, resolver, search, provider, or
  memory;
- expand the public MCP surface; or
- establish runtime readiness, R5-O completion, deployability, or release
  readiness.
