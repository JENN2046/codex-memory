# CM-1017 Multi-Marker Write-To-Recall Coverage Proof

Status: `CM1017_MULTI_MARKER_WRITE_TO_RECALL_COVERAGE_PASSED_NOT_RELIABLE_NOT_READY`
Date: 2026-05-25
Scope: two read-only internal no-raw continuity queries over three known accepted process-write ids
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

CM-1017 extends CM-1016 from one exact marker to a bounded multi-marker continuity check.

It checks whether known accepted process writes are recall-visible through the existing internal no-raw read-only recall adapter seam without printing raw memory content:

```text
createCodexMemoryApplication({ enableWritePreflight: true })
-> createTrueLiveRecallExecutorAdapter({ app })
-> app.callTool('search_memory', include_content=false, noTokenReadOnly=true)
```

This is not broad `memory write reliable`, not broad `memory recall reliable`, not public/default `search_memory` reliability, not governance closure, not runtime ready, not RC ready, not production ready, not release ready, and not cutover ready.

## Boundary Added

CM-1017 adds `WriteToRecallContinuityCoverageBoundary`.

The boundary is pure explicit-input review logic. It does not read files, execute commands, call `record_memory`, call `search_memory`, call providers, read raw memory, read `.jsonl`, write durable memory/audit state, expand public MCP, change config/watchdog/startup state, or claim reliability/readiness.

It accepts only complete bounded coverage evidence with:

- 2 to 5 prebound markers
- `target=process`
- `includeContent=false`
- `noRawContentRead=true`
- sanitized output only
- exactly one `search_memory` call per marker
- zero `record_memory` calls
- zero provider/API/raw-read/durable-write/audit/config/package/public-MCP/release counters
- raw-output flags all false
- `memoryWriteReliableClaimed=false`
- `memoryRecallReliableClaimed=false`
- `writeToRecallReliableClaimed=false`
- `readinessClaimAllowed=false`
- `rcNotReadyBlocked=true`

## Source Write Ids

CM-1017 uses only prebound known accepted write ids already recorded by prior stages:

```text
CM-1015 accepted proof marker id hash = 6b158de28cb1166e
CM-1005 store freshness id hash = 449633a01f7c2db6
CM-0737 store freshness id hash = 3b9263b32c973db5
```

No broad scan was used to discover these ids.

## Execution Evidence

Proof facts:

```text
proofBaselineCommit = ea12485b77279767410e10f9671af046c79293d0
coverageProofRunId = CM1017-ea12485-multi-marker-continuity
decision = WRITE_TO_RECALL_CONTINUITY_COVERAGE_PASSED_NOT_READY
markerCount = 2
boundaryStatus = WRITE_TO_RECALL_CONTINUITY_COVERAGE_ACCEPTED_NOT_READY
acceptedForCoverageReview = true
blockerReasons = []
```

Marker 1:

```text
markerId = CM-1015-proof-marker
matchMode = top_result_matches_expected
queryHash = 0cc54d5233908bd06538410258c5cc61c123a632dda48acce84881913ffb59ce
resultCount = 3
topResultIdHashOrStableOpaqueId = 6b158de28cb1166e
resultIdHashesOrStableOpaqueIds = 6b158de28cb1166e, 449633a01f7c2db6, 3b9263b32c973db5
matchedExpectedIds = 6b158de28cb1166e
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
```

No raw result text, title, snippet, content, source path, direct `.jsonl` line, durable raw memory, raw audit entry, secret value, or raw file path was printed.

## Side-Effect Counters

```json
{
  "searchMemoryCalls": 2,
  "recordMemoryCalls": 0,
  "providerCalls": 0,
  "apiCalls": 0,
  "directJsonlReads": 0,
  "rawDurableMemoryReads": 0,
  "rawAuditReads": 0,
  "memoryOverviewCalls": 0,
  "durableMemoryWrites": 0,
  "durableAuditWrites": 0,
  "candidateCacheWrites": 0,
  "candidateCacheFlushes": 0,
  "syncCalls": 0,
  "vectorFlushes": 0,
  "embeddingCacheWrites": 0,
  "publicMcpExpansion": 0,
  "configWatchdogStartupChanges": 0,
  "packageLockfileChanges": 0,
  "tagReleaseDeployCutoverActions": 0,
  "readinessClaims": 0,
  "reliabilityClaims": 0
}
```

The run emitted Node's SQLite experimental warning. That warning does not change the proof result, counters, mutation boundary, or no-raw-output boundary.

## Validation

Targeted validation passed:

```text
node --check .\src\core\WriteToRecallContinuityCoverageBoundary.js
node --check .\tests\write-to-recall-continuity-coverage-boundary.test.js
node --test .\tests\write-to-recall-continuity-coverage-boundary.test.js .\tests\write-to-recall-continuity-proof-result-boundary.test.js .\tests\true-live-recall-executor-adapter.test.js
node --test .\tests\mcp-contract.test.js
```

Result:

```text
18/18 passed
MCP contract 9/9 passed
```

## Interpretation

CM-1017 proves one bounded coverage fact: three known accepted process-write ids across two prebound query families are recall-visible through the current internal no-raw, read-only recall adapter seam.

It is stronger than CM-1016 because it covers:

- one exact CM-1015 proof marker with top-result match
- the store-freshness write family with both CM-1005 and CM-0737 expected ids present in sanitized results

It still does not prove:

- broad `record_memory` reliability
- broad `search_memory` reliability
- public/default `search_memory` reliability
- broader query-family recall quality
- multi-client behavior
- long-run durability
- rollback cleanup sufficiency
- governance lifecycle closure
- production readiness

`memory write reliable`, `memory recall reliable`, and write-to-recall reliability remain not claimed. `RC_NOT_READY_BLOCKED` remains.
