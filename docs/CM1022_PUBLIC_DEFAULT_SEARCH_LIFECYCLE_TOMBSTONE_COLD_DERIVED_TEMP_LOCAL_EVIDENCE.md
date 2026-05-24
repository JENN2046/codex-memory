# CM1022 Public Default Search Lifecycle Tombstone Cold-Derived Temp-Local Evidence

Date: 2026-05-25

Result: `CM1022_PUBLIC_DEFAULT_SEARCH_LIFECYCLE_TOMBSTONE_COLD_DERIVED_TEMP_LOCAL_PASSED_NOT_RELIABLE_NOT_READY`

## Scope

CM-1022 records isolated temp-local evidence for the intersection of:

- default public `search_memory`
- private `client_id=codex` scope
- lifecycle tombstone filtering
- app close/reopen
- temp-local candidate-cache and vector-index removal before reopen

It uses only an isolated temp root and does not touch real memory stores.

## Execution Shape

The test:

1. Creates an isolated temp-local app with `enableLifecycleReadPolicy=true` and the internal tombstone runtime entry enabled only for the test app.
2. Writes two private Codex-scoped temp records with the same marker, same project, and same workspace.
3. Marks both records `active` in the temp-local shadow store lifecycle columns.
4. Verifies the same default public scoped search can see both records before tombstone.
5. Tombstones one record through `executeInternalTombstone` with the approved internal execution context.
6. Verifies `candidateCachePath` and `vectorIndexPath` resolve under the temp root.
7. Closes the first app, removes only those two temp-local derived files, and reopens a second app on the same temp paths.
8. Runs default public `search_memory` with `include_content=false` and explicit private Codex scope.
9. Verifies only the retained active record is returned and the tombstoned record is not returned.
10. Verifies the read-policy recall audit is present, lifecycle policy is applied, lifecycle column is available, and raw workspace value is not printed.

## Evidence

- Test: `tests/public-default-search-lifecycle-tombstone-cold-derived-temp-local-evidence.test.js`
- Marker: `CM1022 public default lifecycle tombstone cold derived temp local marker`
- Temp records: 2
- Internal temp tombstone mutations: 1
- Searches: 2
  - before tombstone: both active records visible
  - after tombstone + cold-derived restart: only retained active record visible
- App reopens: 1
- Temp derived files removed: `candidateCachePath`, `vectorIndexPath`

## Boundaries

- No real memory store read/write.
- No real `.jsonl` read.
- No provider/API call.
- No public MCP tool or schema expansion.
- No dependency, config, watchdog, startup, tag, release, deploy, or cutover change.
- No broad real memory scan/export/import/migration.
- No readiness, reliability, rollback-readiness, production-readiness, or RC-ready claim.

The internal tombstone operation mutates only the isolated temp-local app state created by the test. It is not a real governance runtime execution and does not make tombstone governance ready.

## Interpretation

CM-1022 proves one bounded temp-local fact: after a private scoped record is tombstoned in isolated local state, default public `search_memory` with explicit private Codex scope does not return that tombstoned record after the app is closed, temp-local candidate/vector derived files are removed, and the app is reopened on the same temp paths.

This strengthens the lifecycle pollution-prevention edge around the CM-1019 to CM-1021 scoped-search evidence chain.

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
