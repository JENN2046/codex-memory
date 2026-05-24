# CM-1019 Public Default Search Scope Temp-Local Evidence

Status: `CM1019_PUBLIC_DEFAULT_SEARCH_SCOPE_TEMP_LOCAL_PASSED_NOT_RELIABLE_NOT_READY`
Date: 2026-05-25
Scope: isolated temp-local public/default `search_memory` client-scope evidence
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

CM-1019 extends CM-1018 from default public search visibility to scoped default public search isolation.

It proves, in an isolated temp-local app, that default `search_memory` with an explicit `scope.client_id + scope.visibility` filter does not return another client's private record even when both records share the same query marker.

This is temp-local evidence only. It does not read broad real memory, does not scan real `.jsonl`, does not mutate the real runtime store, and does not claim broad public search reliability or readiness.

## Runtime Path

The test uses real local app/storage classes under a temporary directory:

```text
createCodexMemoryApplication(temp paths)
-> app.callTool('record_memory') twice with private scoped records
-> app.callTool('search_memory', include_content=false, scope={ project_id, workspace_id, client_id, visibility })
```

The two records use the same marker phrase, same project, same workspace, and `visibility=private`, but different client ids:

```text
client_id = codex
client_id = claude
```

The write execution context remains Codex-authorized; the scoped client dimension is carried in the memory payload.

## Evidence

Test artifact:

- [public-default-search-scope-temp-local-evidence.test.js](/A:/codex-memory/tests/public-default-search-scope-temp-local-evidence.test.js)

Evidence shape:

```text
proofMarker = CM1019 public default scoped search temp local marker
project_id = cm1019-project
workspace_id = cm1019-workspace
visibility = private
include_content = false
```

Accepted facts:

- Codex-scoped search returned exactly the Codex private record id.
- Claude-scoped search returned exactly the Claude private record id.
- Manual-scoped search returned no results.
- Codex-scoped results did not include the Claude private record id.
- Claude-scoped results did not include the Codex private record id.
- Scope post-filter map lookup ran for result-bearing scoped searches.
- Public MCP tools were not expanded.
- Temp directory cleanup is part of the test harness.

No raw real memory content, real source paths, secret values, real private data, or broad store scan output is printed.

## Validation

Targeted validation passed:

```text
node --check .\tests\public-default-search-scope-temp-local-evidence.test.js
node --test .\tests\public-default-search-scope-temp-local-evidence.test.js
node --test .\tests\public-default-search-scope-temp-local-evidence.test.js .\tests\memory-lifecycle-scope-runtime-integration.test.js .\tests\mcp-contract.test.js
node --test .\tests\public-default-search-coverage-boundary.test.js .\tests\public-default-search-scope-temp-local-evidence.test.js
```

Results:

```text
CM-1019 test: 1/1 passed
scope/MCP regression bundle: 13/13 passed
CM-1018 adjacent bundle: 7/7 passed
```

The runs emitted Node's SQLite experimental warning. That warning does not change the proof result, temp-local isolation, or public MCP boundary.

## Interpretation

CM-1019 proves one bounded multi-client/scope fact: default public `search_memory` can respect private client scope in an isolated temp-local app path.

It improves the mainline evidence beyond CM-1018 by covering Codex/Claude private-client separation in the default search path.

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
