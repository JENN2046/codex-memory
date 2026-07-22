# ChatGPT Web R5-G Bounded Retrieval Reliability Window

R5-G tested repeated project-scoped selected-diary retrieval from exact merged
`main` in the private-development environment. It did not change the public
MCP surface, VCPToolBox core, primary memory, source partitions, or the retained
zero-memory Edge binding.

## Result

The authorized reliability window completed five fresh positive sessions. Each
session followed:

```text
resolve_memory_context -> search_memory(limit=1)
```

All five returned one result and met the minimum relevance threshold. The
native diagnostics confirmed a loaded selected index, a non-empty candidate
set, successful vector search, zero ghost candidates, result-source
post-checking, and no unrestricted search.

| Gate | Result |
|---|---:|
| Positive sessions | `5/5` |
| Result count per positive session | `1` |
| Minimum accepted relevance | `0.5` |
| Timeouts | `0` |
| Provider calls | `5/5` |
| Native invocations | `5/5` |
| Authenticated read-only MCP calls | `16/16` |
| Primary-memory writes | `0` |
| Source-partition mutations | `0` |
| Legacy/ambiguous/unregistered accesses | `0` |
| Unrestricted/global native searches | `0` |

Inactive access, consumed-lease replay, expiry, and restart-inactive paths
failed closed without adding provider or native calls. Four explicit
post-consumption replay attempts were rejected. Verification-complete kill ran
before shutdown.

## Derived Runtime Lifecycle

VCP used its normal five-minute startup cooldown; no proof-only cooldown
override was present. The isolated runtime reported six authorized derived
lifecycle events, all completed and none failed. These covered only bounded
startup, hydration, cache, vector, and matrix maintenance inside the isolated
runtime store.

`derived_index_writes` and `other_durable_mutations` remain distinct counters:
the former counts derived-runtime lifecycle units, while the latter counts
Governance audit/receipt appends. Neither counter represents a primary-memory
write.

Shutdown drain reached zero active background tasks. Primary memory, source
partitions, and excluded partitions were not mutated.

## Harness Recovery And Latency Evidence

The first proof harness stopped after its first successful read because it
incorrectly required `other_durable_mutations` to equal
`derived_index_writes`. Existing contracts and tests define them as different
dimensions. That first session and its snapshot were preserved unchanged.

The continuation reused neither the completed provider call nor its session.
It started from a new default-inactive Governance process and completed the
remaining four fresh sessions within the original aggregate budgets. A second
harness assertion then rejected the safe expired projection after all four
positive reads and all four replay checks had already completed. No read was
repeated. A control-only recovery performed the required verification kill.

The immutable owner-only artifact aggregates the two preserved snapshots, five
receipt chains, five native diagnostics, the kill receipt, and final shim
drain. It records one exact first-session end-to-end latency and classifies the
remaining four as completed within the transport budget with no timeout. Exact
per-session latency projection for those four was not persisted because the
continuation fragment stopped at the expiry projection assertion. Diagnostic
completion spacing remains available as low-disclosure supporting evidence,
but is not represented as full end-to-end latency.

The final runtime verdict is therefore:

```text
R5_G_BOUNDED_RETRIEVAL_RELIABILITY_PASS_WITH_HARNESS_RECOVERY
```

## Shutdown And Non-Claims

Governance, outbound Relay, and the isolated shim are stopped. The isolated
loopback port is closed. Public HTTPS health and protected-resource metadata
remain available, anonymous MCP remains rejected, and the retained Edge stays
on the existing zero-memory posture.

The owner-only artifact is not in Git. No raw memory, diary name, private
mapping, exact private digest, token, provider response, or internal private
path is included here.

Production readiness, release readiness, deploy readiness, cutover readiness,
continuous activation, and automatic first-task tool-use remain false.
