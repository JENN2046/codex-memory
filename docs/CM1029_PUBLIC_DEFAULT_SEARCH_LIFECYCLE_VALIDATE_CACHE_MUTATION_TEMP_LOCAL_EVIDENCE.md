# CM-1029 Public Default Search Lifecycle Validate Cache-Mutation Temp-Local Evidence

Status: `COMPLETED_VALIDATED_TEMP_LOCAL_LIFECYCLE_VALIDATE_CACHE_MUTATION_NOT_RELIABLE_NOT_READY`

Result label: `CM1029_PUBLIC_DEFAULT_SEARCH_LIFECYCLE_VALIDATE_CACHE_MUTATION_TEMP_LOCAL_PASSED_NOT_RELIABLE_NOT_READY`

CM-1029 records isolated temp-local evidence for the intersection of:

- default public `search_memory`
- explicit private Codex scope
- lifecycle validation after candidate-cache population
- lifecycle read-policy visibility refresh

## Evidence

Test: `tests/public-default-search-lifecycle-validate-cache-mutation-temp-local-evidence.test.js`

Marker: `CM1029 public default lifecycle validate cache mutation temp local marker`

The test:

1. Opens an isolated temp-local app with `enableLifecycleReadPolicy=true` and `internalValidateRuntimeEntryEnabled=true`.
2. Writes two private Codex-scoped temp records with the same marker.
3. Marks one record `active` and the other record `proposal` in temp-local lifecycle columns.
4. Runs default public scoped `search_memory` with `include_content=false`.
5. Verifies the first search returns only the active record and hides the proposal record.
6. Verifies the read-policy audit records lifecycle policy application and hidden lifecycle count.
7. Verifies the candidate cache is enabled, has at least one entry, records at least one miss, and resolves under the temp root.
8. Validates the proposal record through the approved internal validate runtime entry.
9. Runs the same default public scoped `search_memory` again.
10. Verifies the second search returns both the original active record and the newly validated record.
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
- one approved temp internal validate runtime-entry mutation
- two temp scoped `search_memory` calls
- candidate-cache population under the temp root

The temp app directory is removed by the test harness.

## Interpretation

CM-1029 proves one bounded temp-local fact: after default public scoped search has populated a candidate cache entry while a matching proposal record is hidden by lifecycle read policy, validating that proposal record through the approved internal validate runtime entry makes it visible to the same public scoped search.

This is cache-present lifecycle validate mutation evidence. It does not by itself prove whether the second search used a cache hit or was protected by governance-state cache invalidation; it proves the user-facing default scoped result was refreshed after proposal-to-active validation.

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
