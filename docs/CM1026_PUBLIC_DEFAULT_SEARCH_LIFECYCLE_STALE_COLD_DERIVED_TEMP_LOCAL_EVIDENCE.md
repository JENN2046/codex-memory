# CM-1026 Public Default Search Lifecycle Stale Cold-Derived Temp-Local Evidence

Status: `COMPLETED_VALIDATED_TEMP_LOCAL_LIFECYCLE_STALE_COLD_DERIVED_NOT_RELIABLE_NOT_READY`

Result label: `CM1026_PUBLIC_DEFAULT_SEARCH_LIFECYCLE_STALE_COLD_DERIVED_TEMP_LOCAL_PASSED_NOT_RELIABLE_NOT_READY`

CM-1026 records isolated temp-local evidence for the intersection of:

- default public `search_memory`
- explicit private Codex scope
- lifecycle stale retention
- app close/reopen
- deletion of temp-local candidate-cache/vector-index derived files

## Evidence

Test: `tests/public-default-search-lifecycle-stale-cold-derived-temp-local-evidence.test.js`

Marker: `CM1026 public default lifecycle stale cold derived temp local marker`

The test:

1. Opens an isolated temp-local app with `enableLifecycleReadPolicy=true`.
2. Writes two private Codex-scoped temp records with the same marker.
3. Marks one record `active` and the other record `stale` in temp-local lifecycle columns.
4. Verifies default public scoped `search_memory` returns both records before restart.
5. Verifies the read-policy audit reports at least one stale result without printing the raw workspace id.
6. Closes the app.
7. Verifies `candidateCachePath` and `vectorIndexPath` resolve under the temp root.
8. Removes only those two temp-local derived files.
9. Reopens a second app on the same temp paths.
10. Runs default public `search_memory` with `include_content=false` and explicit private Codex scope.
11. Verifies both active and stale records are returned.
12. Verifies read-policy audit applied and did not print the raw workspace id.

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
- temp-local lifecycle status marking for one active and one stale record
- two temp scoped `search_memory` calls
- deletion of two temp-local derived files after path verification

The temp app directory is removed by the test harness.

## Interpretation

CM-1026 proves one bounded temp-local fact: when an active private scoped record and a stale private scoped record share the same marker, default public `search_memory` with explicit private Codex scope returns both records and continues to retain the stale record after the app is closed, temp-local candidate/vector derived files are removed, and the app is reopened on the same temp paths.

This complements the terminal-state pollution-prevention evidence by proving the included lifecycle state `stale` is not over-filtered by the cold-derived path.

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
