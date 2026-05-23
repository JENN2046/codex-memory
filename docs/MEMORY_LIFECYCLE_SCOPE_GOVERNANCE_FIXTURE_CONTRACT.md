# Memory Lifecycle Scope Governance Fixture Contract

Status: `MEMORY_LIFECYCLE_SCOPE_GOVERNANCE_FIXTURE_CONTRACT_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0844`

## Purpose

This evidence packet implements the first fixture-only contract from `CM-0843`.

It proves, with explicit synthetic inputs only, that lifecycle and scope governance decisions can fail closed before normal recall or future governance transitions:

- active exact-scope records may be eligible for normal recall;
- proposal, rejected, preflight-rejected, superseded, tombstoned, forgotten, excluded, stale, and quarantined records are excluded from normal recall by default;
- out-of-scope records are excluded and report exact mismatching scope fields;
- malformed lifecycle/scope metadata and unresolved bad-write remediation fail closed;
- governance transitions require exact approval plus target memory id, reason, actor, timestamp, and exact scope;
- supersession requires a replacement memory id;
- accepted transition fixtures are append-only and non-destructive.

This is fixture-only. It does not execute true live `record_memory`, true live `search_memory`, real memory scan, raw memory read, direct `.jsonl` or durable memory content read, provider/API call, durable memory/audit write, cleanup apply, rollback apply, migration/import/export/backup/restore apply, public MCP expansion, package/config/watchdog/startup change, push, release, deploy, cutover, or readiness/reliability claim.

## Artifacts

- `src/core/MemoryLifecycleScopeGovernanceContract.js`
- `tests/memory-lifecycle-scope-governance-contract.test.js`

## Fixture Contract

The helper exposes two explicit-input functions:

- `evaluateRecallEligibility(record, currentScope)`;
- `evaluateGovernanceTransition(input)`.

Both return:

- `schemaVersion=memory-lifecycle-scope-governance-contract-v1`;
- `sourceMode=explicit_fixture_input`;
- deterministic decision labels;
- explicit blockers;
- zero side-effect safety counters.

The helper is intentionally not connected to `record_memory`, `search_memory`, public MCP, storage, audit, providers, candidate cache, vector index, cleanup, or rollback apply.

## Covered Scenarios

| scenario | expected result | evidence |
|---|---|---|
| active exact-scope record | `included_for_normal_recall` | targeted test 1 |
| proposal/rejected/preflight/terminal/stale/quarantined states | `excluded_from_normal_recall` | targeted test 2 |
| out-of-scope project/agent/folder | `scope_mismatch_excluded` with exact mismatch list | targeted test 3 |
| malformed lifecycle/scope/unresolved remediation | fail-closed exclusion blockers | targeted test 4 |
| governance transition missing approval/receipt fields | rejected by contract | targeted test 5 |
| exact-approved append-only transition fixture | accepted for fixture only, no durable mutation | targeted test 6 |
| supersession without replacement id | rejected by contract | targeted test 7 |
| filesystem side-effect guard | helper does not read files or write state | targeted test 8 |

## Validation

Executed:

```text
node --check src\core\MemoryLifecycleScopeGovernanceContract.js
node --check tests\memory-lifecycle-scope-governance-contract.test.js
node --test tests\memory-lifecycle-scope-governance-contract.test.js
```

Result:

```text
tests=8
pass=8
fail=0
```

## Remaining Gaps

This evidence does not prove:

- runtime `record_memory` lifecycle enforcement;
- runtime `search_memory` read-policy filtering;
- durable governance write behavior;
- real audit or storage behavior;
- temp-local lifecycle persistence;
- true live recall pollution prevention;
- true live write reliability;
- memory recall reliable;
- memory write reliable;
- runtime readiness;
- RC readiness;
- production readiness;
- V8 implementation;
- VCP full parity.

## Next Minimal Gate

The next safe gate is `MEMORY_LIFECYCLE_SCOPE_READ_POLICY_FIXTURE_EVIDENCE`.

That future gate should prove, using fixture-only recall candidates, that inactive/out-of-scope records are suppressed from normal recall while sanitized audit/history metadata remains explainable.

`RC_NOT_READY_BLOCKED` remains the controlling state.
