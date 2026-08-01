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
all other transition bindings. Preview validation also binds the request,
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
terminal record for that reference.

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

Immediately before CAS, the coordinator revalidates store version, exact
`from_runtime`, stopped/held state, safe-stop receipt, and candidate manifest.
CAS loss leaves the old state unchanged. A store that reports a write without
the exact committed state is classified as fatal
`partial_transition_detected`. A successful transition never starts the
runtime.

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
atomic commit event, and terminal. It independently reconstructs the terminal
and rejects spliced transitions, incorrect receipt order or origin, duplicate
atomic commits, terminal mismatch, missing terminals, and post-terminal
events.

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
