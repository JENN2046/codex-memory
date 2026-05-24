# CM-1028 Public Default Search Lifecycle Cache-Mutation Temp-Local Evidence

Status: `COMPLETED_VALIDATED_TEMP_LOCAL_LIFECYCLE_CACHE_MUTATION_NOT_RELIABLE_NOT_READY`

Result label: `CM1028_PUBLIC_DEFAULT_SEARCH_LIFECYCLE_CACHE_MUTATION_TEMP_LOCAL_PASSED_NOT_RELIABLE_NOT_READY`

CM-1028 records isolated temp-local evidence for the intersection of:

- default public `search_memory`
- explicit private Codex scope
- lifecycle status mutation after candidate-cache population
- lifecycle read-policy pollution prevention

## Evidence

Test: `tests/public-default-search-lifecycle-cache-mutation-temp-local-evidence.test.js`

Marker: `CM1028 public default lifecycle cache mutation temp local marker`

The test:

1. Opens an isolated temp-local app with `enableLifecycleReadPolicy=true`.
2. Writes two private Codex-scoped temp records with the same marker.
3. Marks one record `active` and the other record `stale` in temp-local lifecycle columns.
4. Runs default public scoped `search_memory` with `include_content=false`.
5. Verifies the first search returns both active and stale records.
6. Verifies the read-policy audit records lifecycle policy application and stale retention.
7. Verifies the candidate cache is enabled, has at least one entry, records at least one miss, and resolves under the temp root.
8. Mutates the formerly active record to `tombstoned` in temp-local lifecycle columns.
9. Runs the same default public scoped `search_memory` again.
10. Verifies the second search returns only the stale record and does not return the lifecycle-mutated tombstoned record.
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
- three temp-local lifecycle status marks
- two temp scoped `search_memory` calls
- candidate-cache population under the temp root

The temp app directory is removed by the test harness.

## Interpretation

CM-1028 proves one bounded temp-local fact: after default public scoped search has populated a candidate cache entry, changing one visible private scoped record from `active` to `tombstoned` prevents that record from being returned by the same public scoped search. The retained `stale` record remains visible.

This is cache-present lifecycle mutation evidence. It does not by itself prove whether the second search used a cache hit or was protected by governance-state cache invalidation; it proves the user-facing default scoped result was not polluted by stale cached visibility.

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
