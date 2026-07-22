# ChatGPT Web R5-E Vector Retrieval Fail-Closed Diagnostics

R5-E makes the selected-diary vector retrieval boundary observable without
changing VCPToolBox core, expanding the public MCP surface, or disclosing raw
memory and private mapping values.

## Why R5-E Exists

The bounded R5-D runtime read returned a safe empty result after the provider,
native, and derived-runtime lifecycle counters completed truthfully. VCP's
normal fail-soft behavior can reduce several different lower-level conditions
to the same empty array, including an empty index, index recovery failure,
vector-search failure, or a legitimate no-match result. That ambiguity is safe
for disclosure but insufficient for diagnosis and receipt integrity.

R5-E moves the distinguishing checks into the governed native shim. It does
not reinterpret an empty result as success and it does not claim that the
earlier R5-D runtime proof passed.

The diagnosis was calibrated against frozen VCP source identity: commit
`555b3b538f6eb736e530c2912de678c5941f9985`, `KnowledgeBaseManager.js` blob
`9b28fff0f32ad709c79a7d6f0d31cae0dda485c9`, and the Linux x64 Vexus binding
blob `35696cf8d57451739801b03d14336894ad12f53a`. A read-only in-memory
conformance check confirmed that the selected index methods used by the shim
can be wrapped and restored. No VCP source or runtime store was modified.

## Governed Retrieval Order

The selected-diary path now performs these checks in order:

```text
trusted scope and exact diary allowlist
-> provider embedding
-> query-vector shape/dimension/finite/nonzero validation
-> selected-diary hydration
-> explicit selected-index load and aggregate vector-count inspection
-> instrumented selected-index vector search
-> ghost-candidate detection
-> existing result-source post-check
-> low-disclosure projection and receipt chain
```

The governed path continues to call only the diary-array search signature.
Global or unscoped native search remains forbidden.

## Failure Classification

| Low-disclosure category | Conditions that fail closed |
|---|---|
| `invalid_query_vector` | invalid shape, missing expected dimension, dimension mismatch, non-finite component, or zero vector |
| `index_recovery_failed` | selected index cannot load, has invalid stats, or reports zero vectors after non-empty hydration |
| `vector_search_failed` | selected-index search is not executed, throws beneath VCP's fail-soft layer, or encounters a ghost candidate |

These categories are stable public-safe classifications. Exact query values,
vector components, diary names, internal paths, provider responses, and
private mapping digests are never included.

## Receipt Contract

Successful governed selected-diary reads bind the following evidence through
the native, bridge, and R4 Governance receipt chain:

```yaml
vectorRetrievalDiagnosticsMode: fail_closed_v1
hydratedChunkCount: non_negative_integer
loadedIndexVectorCount: non_negative_integer
queryVectorShapeValid: true
queryVectorExpectedDimensionKnown: true
queryVectorDimensionMatched: true
queryVectorFinite: true
queryVectorNonzero: true
indexSearchCalled: boolean
indexSearchSucceeded: boolean
rawCandidateCount: non_negative_integer
ghostCandidateCount: 0
vectorRetrievalOutcome: empty_index | empty | found
vectorRetrievalRawDetailsDisclosed: false
```

The receipt differentiates three valid outcomes:

- `empty_index`: hydration and index inspection completed and the authorized
  selected index contains no vectors.
- `empty`: an authorized selected-index search executed successfully and found
  no candidate.
- `found`: an authorized selected-index search executed successfully and
  returned one or more post-checked results.

Missing or contradictory R5-E evidence is rejected by the R4 governed
live-read runtime. Older non-R5-E receipt fixtures remain readable outside
that exact live-read contract.

## Negative Matrix

The offline matrix covers:

- non-array and zero-length query vectors;
- unknown and mismatched dimensions;
- `NaN`, infinity, and zero-norm vectors;
- selected-index recovery exceptions and invalid stats;
- non-empty hydration followed by a false zero-vector recovery;
- a Vexus search exception swallowed by the VCP manager;
- a loaded non-empty index whose search method was never invoked;
- ghost candidates removed during search;
- forged or missing diagnostic receipt evidence;
- legitimate empty index, legitimate empty search, and successful found paths;
- zero local fallback for every R5-E failure category.

## Boundaries And Current Verdict

R5-E is a source-and-offline-diagnostics delivery. No service was started, no
provider was called, and no real memory was read or written. VCPToolBox core,
the public six-tool MCP surface, and public input schemas are unchanged.

The retained private-development Edge remains `zero_memory`; the R5-D
owner-only artifact remains immutable. A new bounded live retry is not part of
R5-E and requires a separate exact provider/read budget after this source is
merged.

```yaml
r5_e_source_implemented: true
r5_e_offline_negative_matrix: pass
r5_e_runtime_proof_performed: false
primary_memory_write: false
derived_runtime_mutation: false
provider_calls: 0
real_memory_reads: 0
vcp_core_change: false
public_mcp_expansion: false
production_ready_claimed: false
release_ready_claimed: false
deploy_ready_claimed: false
cutover_ready_claimed: false
final_verdict: R5_E_SOURCE_VALIDATED_RUNTIME_NOT_RUN
```
