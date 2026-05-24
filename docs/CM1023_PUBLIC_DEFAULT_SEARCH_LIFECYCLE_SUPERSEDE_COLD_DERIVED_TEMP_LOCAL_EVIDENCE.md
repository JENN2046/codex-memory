# CM-1023 Public Default Search Lifecycle Supersede Cold-Derived Temp-Local Evidence

Status: `COMPLETED_VALIDATED_TEMP_LOCAL_LIFECYCLE_SUPERSEDE_COLD_DERIVED_NOT_RELIABLE_NOT_READY`

Result label: `CM1023_PUBLIC_DEFAULT_SEARCH_LIFECYCLE_SUPERSEDE_COLD_DERIVED_TEMP_LOCAL_PASSED_NOT_RELIABLE_NOT_READY`

CM-1023 records isolated temp-local evidence for the intersection of:

- default public `search_memory`
- explicit private Codex scope
- lifecycle proposal and superseded filtering
- internal supersede mutation
- app close/reopen
- deletion of temp-local candidate-cache/vector-index derived files

## Evidence

Test: `tests/public-default-search-lifecycle-supersede-cold-derived-temp-local-evidence.test.js`

Marker: `CM1023 public default lifecycle supersede cold derived temp local marker`

The test:

1. Opens an isolated temp-local app with `enableLifecycleReadPolicy=true` and `internalSupersedeRuntimeEntryEnabled=true`.
2. Writes two private Codex-scoped temp records with the same marker.
3. Marks the old record `active` and the replacement record `proposal`.
4. Verifies default public scoped `search_memory` sees only the old active record before supersede.
5. Supersedes the old record through the approved internal supersede runtime entry.
6. Closes the app.
7. Verifies `candidateCachePath` and `vectorIndexPath` resolve under the temp root.
8. Removes only those two temp-local derived files.
9. Reopens a second app on the same temp paths.
10. Runs default public `search_memory` with `include_content=false` and explicit private Codex scope.
11. Verifies only the replacement active record is returned.
12. Verifies the superseded old record is not returned.
13. Verifies read-policy audit applied and did not print the raw workspace id.

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
- one temp internal supersede pair mutation
- two temp scoped `search_memory` calls
- deletion of two temp-local derived files after path verification

The temp app directory is removed by the test harness.

## Interpretation

CM-1023 proves one bounded temp-local fact: after a private scoped old record is superseded by a private scoped replacement record in isolated local state, default public `search_memory` with explicit private Codex scope returns the replacement record and does not return the superseded old record after the app is closed, temp-local candidate/vector derived files are removed, and the app is reopened on the same temp paths.

This strengthens lifecycle pollution-prevention evidence around public/default scoped recall after cold-derived restart.

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
