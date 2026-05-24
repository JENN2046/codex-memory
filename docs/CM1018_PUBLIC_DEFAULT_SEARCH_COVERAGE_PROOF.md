# CM-1018 Public Default Search Coverage Proof

Status: `CM1018_PUBLIC_DEFAULT_SEARCH_COVERAGE_PASSED_NOT_RELIABLE_NOT_READY`
Date: 2026-05-25
Scope: two bounded public/default `search_memory` calls over known process-write marker families
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

CM-1018 extends CM-1017 by checking the default public `search_memory` behavior instead of the internal no-raw read-only adapter.

It uses:

```text
createCodexMemoryApplication({ enableWritePreflight: true })
-> app.callTool('search_memory', { include_content: false })
```

No internal `noTokenReadOnly` request context was used.

This matters because the public/default path has normal local search side effects. It can sync target state, read durable records internally to build default results, append recall audit entries, and update local cache/index state. CM-1018 records those side effects explicitly instead of treating the public path as equivalent to CM-1017's read-only no-raw adapter seam.

This is not broad `memory write reliable`, not broad `memory recall reliable`, not public/default `search_memory` reliable, not governance closure, not runtime ready, not RC ready, not production ready, not release ready, and not cutover ready.

## Boundary Added

CM-1018 adds `PublicDefaultSearchCoverageBoundary`.

The boundary is pure explicit-input review logic. It does not read files, execute commands, call `record_memory`, call `search_memory`, call providers, call APIs, read raw memory, read `.jsonl`, write durable memory, expand public MCP, change config/watchdog/startup state, or claim reliability/readiness.

It accepts only complete bounded public/default search coverage evidence with:

- 2 to 5 prebound markers
- `target=process`
- `includeContent=false`
- `publicDefaultSearch=true`
- `internalNoRawAdapterUsed=false`
- `requestContextNoTokenReadOnly=false`
- no raw output printed
- exactly one `search_memory` call per marker
- exactly one sync call, internal durable record read, and durable recall-audit write per marker
- bounded local cache/vector/embedding flush counters
- zero `record_memory`, provider/API, public MCP, package/config/watchdog/startup, release/cutover, readiness, and reliability counters
- raw-output flags all false
- `memoryWriteReliableClaimed=false`
- `memoryRecallReliableClaimed=false`
- `publicSearchReliableClaimed=false`
- `readinessClaimAllowed=false`
- `rcNotReadyBlocked=true`

## Configuration Facts

Before the proof, sanitized configuration facts were checked:

```json
{
  "embeddingEndpointCount": 0,
  "embeddingProvider": "",
  "embeddingModelSet": false,
  "embeddingUrlSet": false,
  "rerankConfigured": false,
  "enableCandidateCache": true,
  "enableEmbeddingCache": true,
  "enableLifecycleReadPolicy": false,
  "enableSoftReadPolicy": false,
  "embeddingFingerprint": "local-hash__64__v1"
}
```

Interpretation:

- no external embedding provider endpoint was configured for this proof
- no external rerank provider was configured for this proof
- local hash embedding behavior was used
- candidate and embedding caches were enabled
- lifecycle/soft read policies were not enabled

## Execution Evidence

Proof facts:

```text
proofBaselineCommit = bdd10bdb904b124eb1a4d412df7e46462e5358a7
proofRunId = CM1018-bdd10bd-public-default-search-coverage
decision = PUBLIC_DEFAULT_SEARCH_COVERAGE_PASSED_NOT_READY
markerCount = 2
boundaryStatus = PUBLIC_DEFAULT_SEARCH_COVERAGE_ACCEPTED_NOT_READY
acceptedForCoverageReview = true
blockerReasons = []
```

Marker 1:

```text
markerId = CM-1015-proof-marker
matchMode = top_result_matches_expected
queryHash = 0cc54d5233908bd06538410258c5cc61c123a632dda48acce84881913ffb59ce
resultCount = 4
topResultIdHashOrStableOpaqueId = 6b158de28cb1166e
resultIdHashesOrStableOpaqueIds = 6b158de28cb1166e, 449633a01f7c2db6, 3b9263b32c973db5, 2e5ef202f9aa0e19
matchedExpectedIds = 6b158de28cb1166e
rawOutputPrinted = false
```

Marker 2:

```text
markerId = store-freshness-family
matchMode = all_expected_ids_present_in_results
queryHash = 600625c230a3583330de24bb98c3821dd851de8f06c9377600f61de9c5293965
resultCount = 4
topResultIdHashOrStableOpaqueId = 449633a01f7c2db6
resultIdHashesOrStableOpaqueIds = 449633a01f7c2db6, 3b9263b32c973db5, 6b158de28cb1166e, 2e5ef202f9aa0e19
matchedExpectedIds = 449633a01f7c2db6, 3b9263b32c973db5
rawOutputPrinted = false
```

No raw result text, title, snippet, content, source path, direct `.jsonl` line, durable raw memory, raw audit entry, secret value, or raw file path was printed.

## Side-Effect Counters

```json
{
  "searchMemoryCalls": 2,
  "recordMemoryCalls": 0,
  "providerCalls": 0,
  "apiCalls": 0,
  "syncCalls": 2,
  "rawDurableMemoryReads": 2,
  "durableRecallAuditWrites": 2,
  "candidateCacheWrites": 2,
  "candidateCacheFlushes": 4,
  "vectorFlushes": 10,
  "embeddingCacheWrites": 8,
  "publicMcpExpansion": 0,
  "configWatchdogStartupChanges": 0,
  "packageLockfileChanges": 0,
  "tagReleaseDeployCutoverActions": 0,
  "readinessClaims": 0,
  "reliabilityClaims": 0
}
```

The nonzero sync/read/audit/cache/vector/embedding counters are expected for this default public path and are the reason CM-1018 is separate from CM-1017. They are local runtime side effects, not `record_memory` writes, not provider/API calls, not public MCP expansion, not config/startup changes, and not readiness evidence.

The run emitted Node's SQLite experimental warning. That warning does not change the proof result, counters, or no-raw-output boundary.

## Validation

Targeted validation passed:

```text
node --check .\src\core\PublicDefaultSearchCoverageBoundary.js
node --check .\tests\public-default-search-coverage-boundary.test.js
node --test .\tests\public-default-search-coverage-boundary.test.js .\tests\write-to-recall-continuity-coverage-boundary.test.js .\tests\mcp-contract.test.js
```

Result:

```text
20/20 passed
```

## Interpretation

CM-1018 proves one bounded default-public-path fact: two known process-write marker families are visible through default `search_memory` with `include_content=false`, and the proof output can be recorded without printing raw search result content.

It is stronger than CM-1017 for public/default behavior, but weaker than reliability:

- it covers two prebound marker queries only
- it does not prove broad query quality
- it does not prove long-run cache/index freshness
- it does not prove multi-client behavior
- it does not prove governance lifecycle closure
- it does not prove rollback cleanup sufficiency
- it does not prove public/default `search_memory` reliability

`memory write reliable`, `memory recall reliable`, public search reliability, and runtime readiness remain not claimed. `RC_NOT_READY_BLOCKED` remains.
