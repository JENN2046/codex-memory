# CM-1547 V8 Deep Recall / TagMemo Capability Lane Activation

## Scope

CM-1547 activates the post-scoped-RC V8 deep recall / TagMemo capability lane.

This is a docs/status/board baseline and gap-map step only. It does not implement complex V8 algorithms, tune runtime ranking, call providers or APIs, use bearer-token paths, run raw scans, execute confirmed mutation, expand public MCP tools, perform a second effective `record_memory` write, release, tag, deploy, cut over, or claim production/release/cutover readiness.

## Route Result

```text
CM-1547_RESULT: V8_DEEP_RECALL_TAGMEMO_CAPABILITY_LANE_ACTIVATED_DOCS_ONLY
scoped RC milestone: CLOSED / READY
SCOPED_RC_READY: YES
production ready: NO
release ready: NO
cutover ready: NO
next lane: V8 deep recall / TagMemo capability lane
complex_algorithm_implementation: NOT_STARTED
```

## Source Baseline Reviewed

Current baseline is source-and-fixture based, not live proof or provider evidence.

| Surface | Current baseline |
|---|---|
| `src/recall/TagMemoEngine.js` | Query-side TagMemo analysis, core tag selection, dynamic tag/core weights, record scoring, and `metaThinking` score surface. |
| `src/recall/EPAModule.js` | Query energy axes, terrain basis, resonance, semantic width, entropy, and energy signature. |
| `src/recall/ResidualPyramid.js` | Residual token levels, coverage, novelty, breadth, and TagMemo activation features. |
| `src/recall/CandidateGenerator.js` | Candidate scoring combines vector, lexical, TagMemo boost, structural bias, context bias, diary bias, and time-source bias. |
| `src/recall/KnowledgeBaseRecallPipeline.js` | Recall chain parses directives/time ranges, builds query analysis, applies active context, syncs candidates, reranks, applies precision policy, aggregates, enhances, and audits when not read-only. |
| `src/recall/RerankService.js` | Local rerank, RRF, geodesic scoring, and optional remote rerank adapter path; CM-1547 does not call remote providers. |
| `src/core/RecallEnhancer.js` | Deduplication, time-range filtering, TagMemo/rerank enhancement, semantic grouping, and time-query freshness scoring. |
| `src/recall/ContextVectorManager.js` | Active context vector construction, message-history aggregation, context segmentation, and decay-weighted context windows. |
| `src/recall/RecallPrecisionPolicy.js` | Bounded precision evaluation and negative-control rejection using sanitized metadata only. |
| P16 / P17 evidence docs and fixtures | Prior TagMemo semantic association and V8 diagnostic evidence are fixture-backed and diagnostic-only; they do not authorize runtime V8 implementation. |

## Capability Map And Gap Table

| Capability | Current codex-memory baseline | Gap to V8 lane | Priority | Next safe evidence step |
|---|---|---|---:|---|
| TagMemo / tag extraction | Query analysis produces `coreTags`; candidate scoring uses existing record tags, titles, content, and evidence tokens. | No selected write-time or consolidation-time tag extraction route is active for V8; persistent extracted-tag policy remains undefined. | 1 | Fixture inventory for tag extraction inputs, accepted outputs, redaction rules, and no-write boundaries. |
| Memory importance scoring | Candidate score currently combines vector, lexical, TagMemo, structural, context, diary, and source/time signals. | No durable or explicit V8 memory-importance score is defined; importance is implicit in recall scoring only. | 2 | Define a bounded importance evidence shape over sanitized fixture candidates. |
| Recall ranking | Existing ranking includes candidate score, local rerank, RRF, geodesic scoring, TagMemo rerank, and precision policy. | V8 ranking criteria are not consolidated into a stable capability matrix; broad ranking reliability is not claimed. | 3 | Build a ranking-signal matrix and fixture assertions before tuning weights. |
| Time decay / recency weighting | Time directives produce time candidates; `RecallEnhancer` can apply freshness for time queries; `ContextVectorManager` decays context vectors. | No general V8 time-decay model exists for importance, consolidation, or non-time queries. | 4 | Draft fixture cases separating time-filter, freshness, and decay semantics. |
| Relation graph / association recall | TagMemo, semantic grouping, context vectors, and query terrain provide association signals. | No durable relation graph or graph traversal recall layer is implemented or selected. | 5 | Design graph-free association fixtures first; defer graph storage and traversal. |
| Deep recall query expansion | Passive/active query syntax, core tag derivation, EPA terrain, and residual tokens provide expansion-like signals. | No explicit deep-recall expansion pipeline, expansion budget, or low-disclosure evidence shape exists. | 6 | Define query-expansion proposal shape with bounded projection and no provider dependency. |
| Memory consolidation | Deduplication, lifecycle/governance helpers, supersede/tombstone surfaces, and recall isolation exist. | No V8 consolidation algorithm is selected; no automatic merge, summarize, or reflection write route is approved. | 7 | Create no-apply consolidation design and fixture acceptance criteria. |
| Reflection / metacognitive memory | `TagMemoEngine.evaluateMetaThinking()` exposes a bounded `metaThinking` score and reasons. | No reflection memory loop, reflective write, or metacognitive durable record is implemented or approved. | 8 | Document reflection signal contract and keep reflective writes forbidden by default. |
| Recall quality evaluation | Search quality fixtures, precision policy, query-quality reports/gates, and P16/P17 diagnostics exist. | No broad live quality benchmark, provider semantic benchmark, or production quality claim exists. | 9 | Extend fixture-quality matrix before any live/provider quality proof. |
| Bounded projection compatibility | Public `memory_overview` selected projection v2 and low-disclosure proof evidence are established; precision policy rejects raw fields. | Future V8 evidence must preserve bounded output and avoid raw path/token/provider/API leakage. | 10 | Add a V8 evidence projection checklist before any source implementation. |

## Priority Order

1. Capability fixture inventory for TagMemo / tag extraction.
2. Importance, recency, and ranking evidence matrix.
3. Deep recall query expansion contract with bounded projection.
4. Relation / association recall design without durable graph writes.
5. Consolidation no-apply design and fixture criteria.
6. Reflection / metacognitive signal contract without durable reflection writes.
7. Recall quality evaluation matrix expansion.
8. Source implementation proposal only after the above docs/fixture evidence is reviewed.

## Boundaries

CM-1547 preserves these boundaries:

```text
release/tag/deploy: NOT_EXECUTED
production ready: NO
release ready: NO
cutover ready: NO
provider/API calls: 0
bearer token use: 0
raw scan: 0
confirmed mutation: 0
public MCP expansion: 0
second effective record_memory write: 0
complex V8 algorithm implementation: 0
runtime ranking tuning: 0
```

## Next Candidate Slice

Recommended next local-safe slice:

```text
CM-1548 TagMemo / V8 capability fixture inventory
```

That slice should remain fixture/docs-first unless explicitly scoped otherwise.
