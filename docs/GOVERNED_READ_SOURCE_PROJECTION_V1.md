# Governed Read Source Projection v1

## Status

`governed_read_source_projection.v1` is the dormant source-projection contract
for the second ordered `CM-2159` delivery. It does not activate
`governed_read_attempt.v1` in the live path, start a service, call a real
provider, read real memory, change the public MCP surface, cut over Edge
responses, or claim readiness.

The schema-v6 stack remains stopped. Lease-worker process isolation and the
provider-between-passes runtime wiring belong to the next ordered delivery.

## Production API

`src/runtime/vcp-native/production-selected-diary-hydrator.js` exposes:

```js
const projection =
  createProductionSelectedDiarySourceProjection({
    sourceKnowledgeBaseStorePath,
    vcpToolBoxRoot,
    sourceDatabaseConstructor: ExactVcpDatabase
  });

const projectionPlan = projection.preflight({
  allowedDiaryNames,
  dimension
});

// The governed provider call may occur here. It is not owned by this module.

const receipt = projection.materialize({
  allowedDiaryNames,
  knowledgeBaseManager,
  knowledgeBaseRootPath,
  knowledgeBaseStorePath,
  projectionPlan
});
```

The controller injects the exact VCP SQLite constructor at factory creation.
`preflight()` therefore opens the canonical source independently and does not
require the later controller-owned derived `knowledgeBaseManager`.

`createProductionSelectedDiaryRuntimeHydrator()` remains as a compatibility
adapter. It executes the same preflight and materialization methods back to
back; it does not restore the former full-projection array path.

## ProjectionPlan

The plan is immutable, canonical-digest-bound, and limited to 4 KiB. It
contains only:

- exact sorted diary allowlist;
- expected vector dimension;
- bounded file/chunk/byte counters;
- source file-identity digest;
- selected-projection digest;
- plan digest.

It contains no memory content, vector, file path, source locator, provider
response, secret, token, or separate workflow/attempt identity. It is internal
execution state and must not be copied into public output, Observer records, or
logs.

Preflight also limits the canonical UTF-8 representation of the complete diary
scope to 3 KiB. Oversized multi-byte or heavily escaped allowlists fail at
`SOURCE_PREFLIGHT` as `source_scope_invalid`, before source open or provider
execution, so the internally generated plan cannot cross its 4 KiB limit.

## First pass: preflight

Preflight:

1. validates the canonical VCP root and canonical `VectorStore` database;
2. opens only that regular file using a read-only database handle;
3. enables and verifies SQLite `query_only`;
4. begins a read transaction;
5. validates the exact `files` and `chunks` schema;
6. applies the exact diary allowlist in every selected-row query;
7. checks file/chunk/metadata/content/vector budgets before row streaming;
8. streams files and chunks in stable order;
9. validates path scope, sparse-but-strict `chunk_index`, vector dimension,
   finite values, and nonzero vectors;
10. computes the selected-projection digest without retaining the projection;
11. commits the read transaction and closes the source handle.

The maximum approximately 272 MiB selected projection is never represented as
resident `files[]` / `chunks[]` arrays. Only bounded counters, file ids, the
last chunk index per selected file, and the current streamed row are retained.

## Second pass and materialization

Materialization:

1. revalidates the immutable plan and exact derived-runtime boundary;
2. reopens the same source file identity as read-only plus `query_only`;
3. begins one source read transaction;
4. recomputes the complete selected-projection digest;
5. returns `source_snapshot_changed_after_preflight` before any derived
   transaction if identity, schema, budget, rows, or digest changed;
6. keeps that verified source snapshot open;
7. begins one `BEGIN IMMEDIATE` transaction on the controller-owned derived
   SQLite;
8. streams the verified snapshot directly into derived `files` and `chunks`;
9. verifies counts, digest, exact scope, and empty secondary tables before
   commit;
10. commits once or rolls back once.

The source and primary memory databases are never write targets. Attempt-v1
does not use local fallback.

The R4 import fence permits exactly two passive contract imports from this
hydrator: canonical digest utilities and the governed-read failure registry.
It still rejects contract barrels, profiles, Edge/Relay modules, dynamic
imports, and the same imports from any other active runtime file.

## Counter facts

A materialization receipt owns only these safe groups:

```yaml
primary_memory:
  write_attempts: 0
  writes_committed: 0
derived_transaction:
  started: 0 | 1
  committed: 0 | 1
  rolled_back: 0 | 1
```

Complete evidence permits exactly:

```text
started=1, committed=1, rolled_back=0
started=1, committed=0, rolled_back=1
started=0, committed=0, rolled_back=0
```

If SQLite cannot attest that rollback completed, the module omits the unknown
`rolled_back` field instead of inventing zero or one. The later attempt
receipt/terminal path must therefore remain evidence-incomplete and fail
closed.

## Exact production-writer authority

The isolated CI job `Exact VCP writer authority`:

- checks out VCPToolBox commit
  `555b3b538f6eb736e530c2912de678c5941f9985`;
- verifies the exact SHA and rejects tracked VCP modifications;
- requires no secret and calls no external provider;
- runs a loopback-only synthetic embedding endpoint;
- runs the unmodified exact `KnowledgeBaseManager.initialize` singleton;
- exercises real `pendingFiles/_flushBatch`, update, and delete paths;
- verifies writer-null-vector omission and writer-produced sparse
  `chunk_index`;
- runs production preflight and streaming materialization;
- writes a fourth valid but unauthorized diary through the exact writer and
  proves that neither the derived database nor the raw native search result
  contains its path or sentinel content;
- uses the production native adapter for exactly one query embedding, index
  recovery, vector search, and scope postcheck;
- verifies primary database bytes do not change during governed reads;
- derives vectorless, duplicate-index, NaN, Infinity, dimension, cross-scope,
  and between-pass-mutation negatives only by minimally corrupting copies of
  writer output.

The two dormant-runtime passive contract imports are accepted only when their
allowlisted targets are canonical regular files whose `realpath` is the exact
expected contract path. A symlinked contract target fails the import fence.

Default local tests do not clone VCPToolBox, install its dependencies, access
the network, start a real service, or call a provider. The exact authority job
is the cross-repository gate.

## Non-claims

This source delivery does not establish a lease-scoped child worker, live
attempt receipts, public data-response v2, rebind, `_005`, R5-O acceptance,
production readiness, release readiness, deploy readiness, cutover readiness,
or `RC_READY`.
