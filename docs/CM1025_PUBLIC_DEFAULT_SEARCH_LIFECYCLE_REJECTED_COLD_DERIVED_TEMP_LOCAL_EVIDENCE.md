# CM-1025 Public Default Search Lifecycle Rejected Cold-Derived Temp-Local Evidence

Status: `COMPLETED_VALIDATED_TEMP_LOCAL_LIFECYCLE_REJECTED_COLD_DERIVED_NOT_RELIABLE_NOT_READY`

Result label: `CM1025_PUBLIC_DEFAULT_SEARCH_LIFECYCLE_REJECTED_COLD_DERIVED_TEMP_LOCAL_PASSED_NOT_RELIABLE_NOT_READY`

CM-1025 records isolated temp-local evidence for the intersection of:

- default public `search_memory`
- explicit private Codex scope
- lifecycle rejected filtering
- app close/reopen
- deletion of temp-local candidate-cache/vector-index derived files

## Evidence

Test: `tests/public-default-search-lifecycle-rejected-cold-derived-temp-local-evidence.test.js`

Marker: `CM1025 public default lifecycle rejected cold derived temp local marker`

The test:

1. Opens an isolated temp-local app with `enableLifecycleReadPolicy=true`.
2. Writes two private Codex-scoped temp records with the same marker.
3. Marks one record `active` and the other record `rejected` in temp-local lifecycle columns.
4. Verifies default public scoped `search_memory` sees only the active record before restart.
5. Verifies the rejected record is not returned before restart.
6. Verifies the read-policy audit applied lifecycle policy without printing the raw workspace id.
7. Closes the app.
8. Verifies `candidateCachePath` and `vectorIndexPath` resolve under the temp root.
9. Removes only those two temp-local derived files.
10. Reopens a second app on the same temp paths.
11. Runs default public `search_memory` with `include_content=false` and explicit private Codex scope.
12. Verifies only the active record is returned.
13. Verifies the rejected record is not returned.
14. Verifies read-policy audit applied and did not print the raw workspace id.

## Boundary

```text
provider/API calls = 0
real memory reads = 0
real memory writes = 0
real .jsonl reads = 0
raw real memory output = 0
public MCP expansion = false
package/config/watchdog/startup change = false
real cleanup = false
readiness claim = false
reliability claim = false
```

The only mutation is inside the isolated temp-local app state created by the test harness:

- two temp `record_memory` writes
- temp-local lifecycle status marking for one active and one rejected record
- two temp scoped `search_memory` calls
- deletion of two temp-local derived files after path verification

The temp app directory is removed by the test harness.

## Interpretation

CM-1025 proves one bounded temp-local fact: when an active private scoped record and a rejected private scoped record share the same marker, default public `search_memory` with explicit private Codex scope returns only the active record and continues to exclude the rejected record after the app is closed, temp-local candidate/vector derived files are removed, and the app is reopened on the same temp paths.

This strengthens lifecycle terminal-state pollution-prevention evidence around public/default scoped recall after cold-derived restart.

It does not prove:

- broad write reliability
- broad recall reliability
- public/default `search_memory` reliability
- real-store multi-client coverage
- long-run durability
- rollback cleanup sufficiency
- governance closure
- runtime readiness
- RC readiness
- production readiness
- release readiness
- VCP full parity

`memory write reliable`, `memory recall reliable`, public search reliability, governance closure, rollback readiness, and runtime readiness remain not claimed. `RC_NOT_READY_BLOCKED` remains.
