# Diary scope evidence integrity v1

This contract keeps three evidence strengths separate. None of them is a
production, release, cutover, or readiness claim.

## Evidence layers

1. The codex-memory CI contract uses a strict native-search double. Any search
   call whose first argument is not a non-empty diary array fails immediately.
   This proves only the codex-memory call contract.
2. VCP source identity binds a SHA-40 commit and tree plus the exact
   `KnowledgeBaseManager.js` blob OID, byte count, SHA-256, and the declared
   selected-diary search capability. It proves source identity, not execution.
3. Synthetic VCP conformance runs single- and multi-diary searches in a unique
   temporary root with synthetic data. It records index loads, rejects global
   search, and verifies that an unauthorized synthetic index is not loaded.

The synthetic harness does not read an existing VCP config, store, or log, does
not call a provider, and does not start a public service. Running it against a
real external VCP checkout remains a separately governed runtime action; CI
uses an isolated synthetic implementation and does not claim live conformance.

## Frozen Git verification

`evidence:verify:frozen` now:

- removes inherited `GIT_*` variables and sets `GIT_NO_REPLACE_OBJECTS=1`;
- rejects dangerous Git environment variables before invoking Git;
- rejects replace refs, grafts, alternates, external object directories, and
  untrusted common directories;
- requires SHA-40 identities and validates commit, tree, parent, and blob object
  types;
- validates merge ancestry, exact artifact bytes and hashes, task and validation
  identifiers, consumed-authorization state, non-claims, verdict, authority,
  and revalidation side-effect semantics;
- derives its reported counters from the manifest rather than printing fixed
  zero values.

## Proof artifacts

Read-only proof artifacts are generated around an actual invoker callback. The
generator owns the counters; caller-supplied final counters are rejected. The
native, bridge, and context receipts form a SHA-256 chain, and durable mutation
facts must match observed invoker events.

Each run receives a unique UUID and an immutable canonical artifact digest.
Duplicate run IDs are detectable by a consumer registry. This deliberately does
not claim universal non-replayability. One-shot authorization use counts remain
separate and are represented as `null` in this read-only artifact.

Artifacts contain receipt digests and aggregate counters, not diary names,
paths, raw memory, provider responses, tokens, or credentials. Historical proof
without an original artifact is not reconstructed retroactively.

## Non-claims

```yaml
vcp_core_change: false
isolation_granularity: diary_partition
record_file_chunk_acl: false
scope_id_diary_acl: false
corrupt_index_unauthorized_hydration_guarantee: not_claimed
legacy_unclassified_diaries: excluded
production_ready: false
release_ready: false
cutover_ready: false
```
