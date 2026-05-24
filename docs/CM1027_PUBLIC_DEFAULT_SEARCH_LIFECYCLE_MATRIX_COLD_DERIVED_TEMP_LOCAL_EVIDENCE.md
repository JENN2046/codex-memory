# CM-1027 Public Default Search Lifecycle Matrix Cold-Derived Temp-Local Evidence

Status: `COMPLETED_VALIDATED_TEMP_LOCAL_LIFECYCLE_MATRIX_COLD_DERIVED_NOT_RELIABLE_NOT_READY`

Result label: `CM1027_PUBLIC_DEFAULT_SEARCH_LIFECYCLE_MATRIX_COLD_DERIVED_TEMP_LOCAL_PASSED_NOT_RELIABLE_NOT_READY`

CM-1027 records isolated temp-local evidence for the intersection of:

- default public `search_memory`
- explicit private Codex scope
- lifecycle matrix read-policy behavior
- app close/reopen
- deletion of temp-local candidate-cache/vector-index derived files

## Evidence

Test: `tests/public-default-search-lifecycle-matrix-cold-derived-temp-local-evidence.test.js`

Marker: `CM1027 public default lifecycle matrix cold derived temp local marker`

The test:

1. Opens an isolated temp-local app with `enableLifecycleReadPolicy=true`.
2. Writes six private Codex-scoped temp records with the same marker.
3. Marks the records in temp-local lifecycle columns as `active`, `stale`, `proposal`, `rejected`, `superseded`, and `tombstoned`.
4. Verifies default public scoped `search_memory` returns exactly the `active` and `stale` records before restart.
5. Verifies `proposal`, `rejected`, `superseded`, and `tombstoned` records are not returned before restart.
6. Verifies the read-policy audit records included statuses `active/stale`, excluded statuses `proposal/rejected/superseded/tombstoned`, stale retention, lifecycle policy application, and no raw workspace value.
7. Closes the app.
8. Verifies `candidateCachePath` and `vectorIndexPath` resolve under the temp root.
9. Removes only those two temp-local derived files.
10. Reopens a second app on the same temp paths.
11. Runs default public `search_memory` with `include_content=false` and explicit private Codex scope.
12. Verifies cold-derived restart search still returns exactly the `active` and `stale` records and excludes all four hidden statuses.
13. Verifies the cold-restart read-policy audit applied and did not print the raw workspace id.

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

- six temp `record_memory` writes
- six temp-local lifecycle status marks
- two temp scoped `search_memory` calls
- deletion of two temp-local derived files after path verification

The temp app directory is removed by the test harness.

## Interpretation

CM-1027 proves one bounded temp-local fact: when six private scoped records with the same marker cover the current lifecycle read-policy matrix, default public `search_memory` with explicit private Codex scope returns only `active` and `stale` records before and after the app is closed, temp-local candidate/vector derived files are removed, and the app is reopened on the same temp paths.

This consolidates CM-1022 through CM-1026 into one matrix-style cold-derived restart check, while preserving the narrower per-status evidence packets.

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
