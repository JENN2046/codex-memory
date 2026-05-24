# CM-1024 Public Default Search Lifecycle Validate Cold-Derived Temp-Local Evidence

Status: `COMPLETED_VALIDATED_TEMP_LOCAL_LIFECYCLE_VALIDATE_COLD_DERIVED_NOT_RELIABLE_NOT_READY`

Result label: `CM1024_PUBLIC_DEFAULT_SEARCH_LIFECYCLE_VALIDATE_COLD_DERIVED_TEMP_LOCAL_PASSED_NOT_RELIABLE_NOT_READY`

CM-1024 records isolated temp-local evidence for the intersection of:

- default public `search_memory`
- explicit private Codex scope
- lifecycle proposal filtering
- internal validate mutation from `proposal` to `active`
- app close/reopen
- deletion of temp-local candidate-cache/vector-index derived files

## Evidence

Test: `tests/public-default-search-lifecycle-validate-cold-derived-temp-local-evidence.test.js`

Marker: `CM1024 public default lifecycle validate cold derived temp local marker`

The test:

1. Opens an isolated temp-local app with `enableLifecycleReadPolicy=true` and `internalValidateRuntimeEntryEnabled=true`.
2. Writes one private Codex-scoped temp record.
3. Marks the record `proposal`.
4. Verifies default public scoped `search_memory` returns no results before validation.
5. Verifies the read-policy audit recorded lifecycle filtering for the proposal record.
6. Validates the record through the approved internal validate runtime entry.
7. Verifies the validate result transitions `proposal -> active`.
8. Closes the app.
9. Verifies `candidateCachePath` and `vectorIndexPath` resolve under the temp root.
10. Removes only those two temp-local derived files.
11. Reopens a second app on the same temp paths.
12. Runs default public `search_memory` with `include_content=false` and explicit private Codex scope.
13. Verifies only the validated active record is returned.
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

- one temp `record_memory` write
- one temp internal validate mutation
- two temp scoped `search_memory` calls
- deletion of two temp-local derived files after path verification

The temp app directory is removed by the test harness.

## Interpretation

CM-1024 proves one bounded temp-local fact: a private scoped proposal record is hidden from default public `search_memory` before validation, then returned after the record is validated to `active`, the app is closed, temp-local candidate/vector derived files are removed, and the app is reopened on the same temp paths.

This strengthens lifecycle pollution-prevention and approval-flow evidence around public/default scoped recall after cold-derived restart.

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
