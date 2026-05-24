# CM-1030 Public Default Search Lifecycle Supersede Cache-Mutation Temp-Local Evidence

Status: `COMPLETED_VALIDATED_TEMP_LOCAL_LIFECYCLE_SUPERSEDE_CACHE_MUTATION_NOT_RELIABLE_NOT_READY`

Result label: `CM1030_PUBLIC_DEFAULT_SEARCH_LIFECYCLE_SUPERSEDE_CACHE_MUTATION_TEMP_LOCAL_PASSED_NOT_RELIABLE_NOT_READY`

CM-1030 records isolated temp-local evidence for the intersection of:

- default public `search_memory`
- explicit private Codex scope
- lifecycle supersede after candidate-cache population
- lifecycle read-policy replacement visibility refresh

## Evidence

Test: `tests/public-default-search-lifecycle-supersede-cache-mutation-temp-local-evidence.test.js`

Marker: `CM1030 public default lifecycle supersede cache mutation temp local marker`

The test:

1. Opens an isolated temp-local app with `enableLifecycleReadPolicy=true` and `internalSupersedeRuntimeEntryEnabled=true`.
2. Writes two private Codex-scoped temp records with the same marker.
3. Marks the old record `active` and the replacement record `proposal` in temp-local lifecycle columns.
4. Runs default public scoped `search_memory` with `include_content=false`.
5. Verifies the first search returns only the old active record and hides the proposal replacement.
6. Verifies the read-policy audit records lifecycle policy application and hidden lifecycle count.
7. Verifies the candidate cache is enabled, has at least one entry, records at least one miss, and resolves under the temp root.
8. Supersedes the old record with the replacement record through the approved internal supersede runtime entry.
9. Runs the same default public scoped `search_memory` again.
10. Verifies the second search returns only the replacement record and does not return the superseded old record.
11. Verifies the second read-policy audit applied and did not print the raw workspace id.

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
- two temp-local lifecycle status marks
- one approved temp internal supersede runtime-entry mutation
- two temp scoped `search_memory` calls
- candidate-cache population under the temp root

The temp app directory is removed by the test harness.

## Interpretation

CM-1030 proves one bounded temp-local fact: after default public scoped search has populated a candidate cache entry while an old active record is visible and a proposal replacement is hidden by lifecycle read policy, superseding the old record with the replacement through the approved internal supersede runtime entry makes only the replacement visible to the same public scoped search.

This is cache-present lifecycle supersede mutation evidence. It does not by itself prove whether the second search used a cache hit or was protected by governance-state cache invalidation; it proves the user-facing default scoped result was refreshed after old-active to superseded and replacement-proposal to active lifecycle mutation.

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
