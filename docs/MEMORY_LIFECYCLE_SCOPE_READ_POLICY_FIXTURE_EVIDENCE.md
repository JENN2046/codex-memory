# Memory Lifecycle Scope Read Policy Fixture Evidence

Status: `MEMORY_LIFECYCLE_SCOPE_READ_POLICY_FIXTURE_EVIDENCE_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0845`

## Purpose

This evidence packet implements the read-policy fixture layer selected by `CM-0844`.

It proves, with explicit synthetic candidates only, that lifecycle/scope governance can suppress records from normal recall while keeping sanitized explanatory metadata:

- active exact-scope candidates remain eligible for normal recall output;
- proposal / rejected / preflight-rejected / superseded / tombstoned / forgotten / excluded / stale / quarantined candidates are suppressed;
- out-of-scope candidates are suppressed with exact mismatch reporting;
- malformed scope/lifecycle and unresolved remediation states fail closed;
- suppressed candidate metadata omits raw `content`, `text`, `title`, and `snippet`;
- read-policy execution has zero file read, real memory scan, direct `.jsonl` read, provider, durable write, audit write, cleanup apply, rollback apply, public MCP expansion, and readiness side-effect counters.

This is fixture-only. It does not execute true live `record_memory`, true live `search_memory`, real memory scan, raw memory read, direct `.jsonl` or durable memory content read, provider/API call, durable memory/audit write, cleanup apply, rollback apply, migration/import/export/backup/restore apply, public MCP expansion, package/config/watchdog/startup change, push, release, deploy, cutover, or readiness/reliability claim.

## Artifacts

- `src/core/MemoryLifecycleScopeGovernanceContract.js`
- `tests/memory-lifecycle-scope-read-policy-fixture.test.js`

## Read-Policy Contract

The helper now exposes:

```text
filterRecallCandidatesByLifecycleScope({ currentScope, candidates })
```

It returns:

- `readPolicyMode=normal_recall`;
- `acceptedCandidates`;
- `suppressedCandidates`;
- `sanitizedAuditMetadata`;
- `rawContentExposed=false`;
- zero side-effect safety counters.

Accepted candidates retain only fixture-safe metadata: `memoryId`, `lifecycleStatus`, `rankHint`, and normalized `scope`.

Suppressed candidates retain only sanitized explanatory metadata: `memoryId`, `lifecycleStatus`, `decision`, `blockers`, and `scopeMismatches`.

## Covered Scenarios

| scenario | expected result | evidence |
|---|---|---|
| mixed active/proposal/tombstoned/out-of-scope candidates | one accepted, three suppressed | targeted test 1 |
| suppressed raw fields present on candidate | raw synthetic content not present in sanitized metadata | targeted test 2 |
| preflight rejected / malformed scope / scope drift | blocker explanation preserved without raw content | targeted test 3 |
| incomplete current scope | all candidates fail closed | targeted test 4 |
| side-effect counters | all zero | targeted test 5 |
| filesystem side-effect guard | helper does not read files | targeted test 6 |

## Validation

Executed:

```text
node --check src\core\MemoryLifecycleScopeGovernanceContract.js
node --check tests\memory-lifecycle-scope-read-policy-fixture.test.js
node --test tests\memory-lifecycle-scope-governance-contract.test.js tests\memory-lifecycle-scope-read-policy-fixture.test.js
```

Result:

```text
tests=14
pass=14
fail=0
```

## Remaining Gaps

This evidence does not prove:

- runtime `search_memory` read-policy filtering;
- runtime candidate generator integration;
- real corpus recall pollution prevention;
- durable governance state;
- temp-local lifecycle persistence;
- true live recall reliability;
- true live write reliability;
- memory recall reliable;
- memory write reliable;
- runtime readiness;
- RC readiness;
- production readiness;
- V8 implementation;
- VCP full parity.

## Next Minimal Gate

The next safe gate is `MEMORY_LIFECYCLE_SCOPE_TEMP_LOCAL_EVIDENCE_PLAN`.

That future plan should define isolated temp-root lifecycle records, synthetic governance state, read-policy projection, sanitized output, cleanup verification, and zero real-memory / provider / `.jsonl` / durable-write side effects before any controlled live packet is considered.

`RC_NOT_READY_BLOCKED` remains the controlling state.
