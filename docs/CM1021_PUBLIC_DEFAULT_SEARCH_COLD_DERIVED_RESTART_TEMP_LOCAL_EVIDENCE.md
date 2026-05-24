# CM-1021 Public Default Search Cold-Derived Restart Temp-Local Evidence

Status: `CM1021_PUBLIC_DEFAULT_SEARCH_COLD_DERIVED_RESTART_TEMP_LOCAL_PASSED_NOT_RELIABLE_NOT_READY`
Date: 2026-05-25
Scope: isolated temp-local restart evidence after deleting derived candidate-cache and vector-index files
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

CM-1021 extends CM-1020 from one normal close/reopen cycle to a colder derived-state restart boundary.

It proves, in an isolated temp-local app, that two private scoped records written before app close remain visible through default `search_memory` after the app closes, the temp-local candidate cache and vector index files are deleted, and a new app instance reopens the same temp paths.

This is temp-local derived-state evidence only. It does not read broad real memory, does not scan real `.jsonl`, does not mutate the real runtime store, and does not claim broad public search reliability, long-run durability, rollback readiness, or runtime readiness.

## Runtime Path

The test uses real local app/storage classes under a temporary directory:

```text
createCodexMemoryApplication(temp paths)
-> app.callTool('record_memory') twice with private scoped records
-> app.close()
-> delete temp-local candidateCachePath file
-> delete temp-local vectorIndexPath file
-> createCodexMemoryApplication(same temp paths)
-> app.callTool('search_memory', include_content=false, scope={ project_id, workspace_id, client_id, visibility })
```

The two records use the same marker phrase, same project, same workspace, and `visibility=private`, but different client ids:

```text
client_id = codex
client_id = claude
```

The write execution context remains Codex-authorized; the scoped client dimension is carried in the memory payload. Only derived files under the test temp root are deleted.

## Evidence

Test artifact:

- [public-default-search-cold-derived-restart-temp-local-evidence.test.js](/A:/codex-memory/tests/public-default-search-cold-derived-restart-temp-local-evidence.test.js)

Evidence shape:

```text
proofMarker = CM1021 public default scoped cold derived restart temp local marker
project_id = cm1021-project
workspace_id = cm1021-workspace
visibility = private
include_content = false
derived files removed = candidateCachePath, vectorIndexPath
restart = close first app, open second app on same temp paths
```

Accepted facts:

- The test verifies both derived file paths resolve under the temp root before removal.
- Codex-scoped cold-restart search returned exactly the Codex private record id written before close.
- Claude-scoped cold-restart search returned exactly the Claude private record id written before close.
- Manual-scoped cold-restart search returned no results.
- Codex-scoped results did not include the Claude private record id.
- Claude-scoped results did not include the Codex private record id.
- Scope post-filter map lookup ran for result-bearing scoped searches after cold restart.
- Public MCP tools were not expanded.
- Temp directory cleanup is part of the test harness.

No raw real memory content, real source paths, secret values, real private data, or broad store scan output is printed.

## Validation

Targeted validation passed:

```text
node --check .\tests\public-default-search-cold-derived-restart-temp-local-evidence.test.js
node --test .\tests\public-default-search-cold-derived-restart-temp-local-evidence.test.js
node --test .\tests\public-default-search-cold-derived-restart-temp-local-evidence.test.js .\tests\public-default-search-restart-durability-temp-local-evidence.test.js .\tests\public-default-search-scope-temp-local-evidence.test.js .\tests\memory-lifecycle-scope-runtime-integration.test.js .\tests\mcp-contract.test.js
node --test .\tests\public-default-search-cold-derived-restart-temp-local-evidence.test.js .\tests\memory-write-reliability-temp-local-evidence.test.js
```

Results:

```text
CM-1021 test: 1/1 passed
cold-derived/restart/scope/MCP regression bundle: 15/15 passed
cold-derived/write-temp-local adjacent bundle: 5/5 passed
```

The runs emitted Node's SQLite experimental warning. That warning does not change the proof result, temp-local isolation, cold-derived restart boundary, or public MCP boundary.

## Interpretation

CM-1021 proves one bounded derived-state restart fact: default public `search_memory` can still respect private client scope after isolated temp-local candidate-cache and vector-index files are removed and a new app instance reopens the same durable temp paths.

It improves the mainline evidence beyond CM-1020 by covering recall from a colder derived state rather than a normal warm restart.

It still does not prove:

- broad public/default `search_memory` reliability
- broad recall reliability
- broad write reliability
- real-store multi-client coverage
- long-run durability
- rollback cleanup sufficiency
- governance lifecycle closure
- runtime readiness
- RC readiness
- production readiness

`memory write reliable`, `memory recall reliable`, public search reliability, rollback readiness, and runtime readiness remain not claimed. `RC_NOT_READY_BLOCKED` remains.
