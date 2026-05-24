# CM-1020 Public Default Search Restart Durability Temp-Local Evidence

Status: `CM1020_PUBLIC_DEFAULT_SEARCH_RESTART_DURABILITY_TEMP_LOCAL_PASSED_NOT_RELIABLE_NOT_READY`
Date: 2026-05-25
Scope: isolated temp-local restart durability evidence for scoped default public `search_memory`
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

CM-1020 extends CM-1019 from same-process scoped default public search isolation to one close/reopen durability boundary.

It proves, in an isolated temp-local app, that two private scoped records written before app close remain visible through default `search_memory` after a new app instance reopens the same temp paths, while still respecting `scope.client_id + scope.visibility`.

This is temp-local restart evidence only. It does not read broad real memory, does not scan real `.jsonl`, does not mutate the real runtime store, and does not claim broad public search reliability, long-run durability, or readiness.

## Runtime Path

The test uses real local app/storage classes under a temporary directory:

```text
createCodexMemoryApplication(temp paths)
-> app.callTool('record_memory') twice with private scoped records
-> app.close()
-> createCodexMemoryApplication(same temp paths)
-> app.callTool('search_memory', include_content=false, scope={ project_id, workspace_id, client_id, visibility })
```

The two records use the same marker phrase, same project, same workspace, and `visibility=private`, but different client ids:

```text
client_id = codex
client_id = claude
```

The write execution context remains Codex-authorized; the scoped client dimension is carried in the memory payload. The restart app instance uses the same temp-local paths only.

## Evidence

Test artifact:

- [public-default-search-restart-durability-temp-local-evidence.test.js](/A:/codex-memory/tests/public-default-search-restart-durability-temp-local-evidence.test.js)

Evidence shape:

```text
proofMarker = CM1020 public default scoped restart durability temp local marker
project_id = cm1020-project
workspace_id = cm1020-workspace
visibility = private
include_content = false
restart = close first app, open second app on same temp paths
```

Accepted facts:

- Codex-scoped post-restart search returned exactly the Codex private record id written before close.
- Claude-scoped post-restart search returned exactly the Claude private record id written before close.
- Manual-scoped post-restart search returned no results.
- Codex-scoped results did not include the Claude private record id.
- Claude-scoped results did not include the Codex private record id.
- Scope post-filter map lookup ran for result-bearing scoped searches after restart.
- Public MCP tools were not expanded.
- Temp directory cleanup is part of the test harness.

No raw real memory content, real source paths, secret values, real private data, or broad store scan output is printed.

## Validation

Targeted validation passed:

```text
node --check .\tests\public-default-search-restart-durability-temp-local-evidence.test.js
node --test .\tests\public-default-search-restart-durability-temp-local-evidence.test.js
node --test .\tests\public-default-search-restart-durability-temp-local-evidence.test.js .\tests\public-default-search-scope-temp-local-evidence.test.js .\tests\memory-lifecycle-scope-runtime-integration.test.js .\tests\mcp-contract.test.js
node --test .\tests\public-default-search-restart-durability-temp-local-evidence.test.js .\tests\memory-write-reliability-temp-local-evidence.test.js
```

Results:

```text
CM-1020 test: 1/1 passed
restart/scope/MCP regression bundle: 14/14 passed
restart/write-temp-local adjacent bundle: 5/5 passed
```

The runs emitted Node's SQLite experimental warning. That warning does not change the proof result, temp-local isolation, restart boundary, or public MCP boundary.

## Interpretation

CM-1020 proves one bounded restart fact: default public `search_memory` can still respect private client scope after an isolated temp-local app close/reopen cycle.

It improves the mainline evidence beyond CM-1019 by covering persistence across a fresh app instance on the same temp-local paths.

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

`memory write reliable`, `memory recall reliable`, public search reliability, and runtime readiness remain not claimed. `RC_NOT_READY_BLOCKED` remains.
