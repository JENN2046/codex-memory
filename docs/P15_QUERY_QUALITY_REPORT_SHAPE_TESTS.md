# P15.3 Query Quality Report Shape Tests

## Purpose

P15.3 locks the JSON report shapes that CI and future dashboard consumers depend on after the P15.2 fixture expansion.

This phase is tests/docs only. It does not change query runtime behavior, ranking, providers, public MCP tools, MCP schemas, import/export apply behavior, SQLite schema, durable memory data, or `validate_memory` mutation surface.

## Locked Shapes

`real-query-suite --json --fixture-recall-dry-run` must expose exactly these top-level fields:

- `status`
- `suiteFile`
- `version`
- `caseCount`
- `invalidCount`
- `placeholderCount`
- `fixtureOnlyCount`
- `validCount`
- `realCount`
- `assertedCount`
- `passedCount`
- `failedCount`
- `fixtureFile`
- `fixtureRecallDryRun`

`query:quality --json --dry-run --fixture-recall-dry-run` must expose exactly these top-level fields:

- `status`
- `caseCount`
- `runnableCount`
- `placeholderCount`
- `fixtureOnlyCount`
- `invalidCount`
- `realCount`
- `assertedCount`
- `passedCount`
- `failedCount`
- `mutated`
- `fixtureRecallDryRun`

The shared `fixtureRecallDryRun` shape must expose exactly:

- `enabled`
- `mutated`
- `providerCalls`
- `durableMemoryTouched`
- `caseCount`
- `passedCount`
- `failedCount`

Failure details must keep assertion failures shaped as:

- `id`
- `target`
- `issues`

## Current Baseline

P15.3 keeps the P15.2 baseline:

- `caseCount=14`
- `assertedCount=14`
- `passedCount=14`
- `failedCount=0`
- `fixtureRecallDryRun.passedCount=14`
- `fixtureRecallDryRun.failedCount=0`
- `mutated=false`
- `providerCalls=0`
- `durableMemoryTouched=false`

## Explicit Non-Metrics

P15.3 continues to forbid synthetic scores until a later phase defines a metric and threshold:

- no `hitRate`
- no `qualityScore`

## Tests

Updated tests:

- `tests/real-query-suite.test.js`
  - locks `real-query-suite` JSON top-level keys
  - locks `fixtureRecallDryRun` keys
  - locks assertion failure shape
  - verifies no synthetic `hitRate` / `qualityScore`
- `tests/query-quality-report.test.js`
  - locks `query:quality` JSON top-level keys
  - locks `fixtureRecallDryRun` keys
  - locks assertion failure shape
  - verifies no synthetic `hitRate` / `qualityScore`

## Safety Boundaries

Confirmed boundaries for this phase:

- no `src/` changes
- no fixture data changes
- no package or lockfile changes
- no public MCP tool expansion
- no public `validate_memory` MCP tool
- no `validate_memory` mutation-surface expansion
- no SQLite migration or `ALTER TABLE`
- no import/export apply
- no real DB, diary, vector index, audit log, or durable memory write
- no provider smoke or provider benchmark
- no release, tag, deploy, or push without separate authorization

## Validation

Required validation:

```powershell
node --test tests\real-query-suite.test.js tests\query-quality-report.test.js
npm run real-query-suite -- --json --fixture-recall-dry-run
npm run query:quality -- --json --dry-run --fixture-recall-dry-run
npm test
npm run gate:ci
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Next Recommended Phase

`P15.4-fixture-recall-dry-run-standing-gate`

P15.4 should document and gate the fixture recall dry-run as a standing CI-safe signal without changing runtime ranking or calling providers.
