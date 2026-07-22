# ChatGPT Web R5-F Exact-Head Vector Retrieval Live Proof

R5-F closes the runtime gap left by the R5-D safe-empty result and the R5-E
source-only diagnostics. It proves one bounded, selected-diary vector read from
the exact merged `codex-memory` head while preserving the private-development
zero-memory default.

## Bound Identities And Scope

The run was bound before any provider call to:

- `codex-memory` commit `6783c434f0fa5484b878cbdfe3a83b1fc26d15c5`
  and tree `c0daf9ed614edd2979cd340f52ce18f936f44d59`;
- frozen VCPToolBox commit
  `555b3b538f6eb736e530c2912de678c5941f9985` and
  `KnowledgeBaseManager.js` blob
  `9b28fff0f32ad709c79a7d6f0d31cae0dda485c9`;
- the existing owner-only project registry, 12-entry diary mapping, canonical
  mapping binding, and retained zero-memory rollback reference.

Only the registered `codex-memory` project with `project` visibility was
eligible. Client-private, legacy, ambiguous, unregistered, cross-project, and
global/unscoped routes remained forbidden. Exact mapping values, diary names,
private digests, credentials, provider responses, paths, and raw memory are not
included in this document.

## Controlled Attempts

R5-F used three fresh isolated runtime stores and stayed within the authorized
maximum of three provider attempts and six authenticated read-tool calls.

The first two attempts failed closed after
`resolve_memory_context -> search_memory`. Their native calls were rejected as
low-disclosure client errors; Governance consumed the lease and returned no
memory result. Both attempts used a private proof-harness override that reduced
VCP's normal derived startup cooldown from five minutes to one second, causing
the background matrix refresh window to coincide with the bounded read.

Before the final attempt, offline structural probes confirmed that the selected
index had a positive vector count, its vector search executed successfully, and
its source paths were compatible with the result-scope post-check. No provider
call or raw-memory projection was used by those probes.

The final attempt restored VCP's normal five-minute startup cooldown. This was
the only runtime-control change. The bounded read then passed. This controlled
comparison is strong evidence that the earlier failures were caused by the
proof harness's premature background-refresh timing, not by missing selected
vectors or an unavailable VCP search implementation.

## Successful Read Evidence

The successful sequence was exactly:

```text
resolve_memory_context
-> search_memory(limit=1)
```

Low-disclosure evidence recorded:

```yaml
result_count: 1
relevance_passed: true
successful_attempt_provider_calls: 1
successful_attempt_native_invocations: 1
vector_retrieval_outcome: found
loaded_index_vector_count_positive: true
raw_candidate_count_positive: true
ghost_candidate_count: 0
index_search_called: true
index_search_succeeded: true
result_scope_postcheck_passed: true
local_fallbacks: 0
unrestricted_native_searches: 0
primary_memory_writes: 0
```

The successful read receipt accounted five isolated derived-runtime lifecycle
events. Final shutdown drain reported the same five events complete, zero
failed, and trigger categories limited to startup, hydration, cache, and
vector maintenance.

Across all three attempts, final drain accounted 17 isolated derived-runtime
events. All 17 completed. Primary-memory writes, source-partition mutations,
legacy/ambiguous/unregistered access, and unrestricted/global searches stayed
at zero. The first two failed attempts remain part of the evidence; they were
not deleted or rewritten.

## Shutdown, Rollback, And Evidence

The successful lease was consumed and a `verification_complete` kill was
issued. Governance UDS, outbound Relay, and the loopback native shim were then
stopped. Shutdown drained background work before producing final counters.

The private-development Edge was never changed from the retained `zero_memory`
binding. Post-run checks confirmed HTTPS health and protected-resource metadata
remain available, while anonymous MCP access remains rejected.

An immutable owner-only, non-Git artifact binds source/VCP identities, private
mapping and registry references, activation/context/bridge/native receipt
digests, all-attempt counter accounting, successful vector evidence, and
rollback checks. Earlier R5-C and R5-D artifacts remain unchanged.

## Verdict And Non-Claims

```yaml
r5_f_exact_head_live_proof: pass
result_count: 1
relevance_passed: true
provider_call_attempts_conservative_total: 3
authenticated_memory_tool_calls_total: 6
aggregate_isolated_derived_runtime_mutations: 17
aggregate_derived_runtime_failures: 0
primary_memory_writes: 0
source_partition_mutations: 0
legacy_ambiguous_unregistered_accesses: 0
unrestricted_native_searches: 0
rollback_to_zero_memory: pass
independent_runtime_artifact: present
vcp_core_change: false
public_mcp_schema_expansion: false
production_ready_claimed: false
release_ready_claimed: false
deploy_ready_claimed: false
cutover_ready_claimed: false
final_verdict: R5_F_BOUNDED_VECTOR_RETRIEVAL_PASS
```

R5-F proves a bounded private-development vector retrieval path. It does not
authorize continuous activation, production deployment, release, cutover,
public write access, or a readiness claim.
