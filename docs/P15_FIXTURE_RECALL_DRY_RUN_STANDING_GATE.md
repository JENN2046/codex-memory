# P15.4 Fixture Recall Dry-Run Standing Gate

## Purpose

P15.4 promotes fixture recall dry-run from an optional query command flag into a standing CI-safe signal.

This phase does not change query runtime behavior, ranking, providers, public MCP tools, MCP schemas, import/export behavior, SQLite schema, durable memory data, or `validate_memory` mutation surface.

## Standing Gate Surface

`gate:ci` now includes fixture recall dry-run evidence inside `checks.queries.detail.fixtureRecallDryRun`.

The standing gate is fixture-only and must report:

- `enabled=true`
- `caseCount=14`
- `passedCount=14`
- `failedCount=0`
- `mutated=false`
- `providerCalls=0`
- `durableMemoryTouched=false`

The text output also includes the compact standing-gate count:

```text
fixture recall 14/14
```

## JSON Shape

`checks.queries.detail.fixtureRecallDryRun` must expose exactly:

- `enabled`
- `mutated`
- `providerCalls`
- `durableMemoryTouched`
- `caseCount`
- `passedCount`
- `failedCount`

This shape matches the P15.3 report shape tests for `real-query-suite` and `query:quality`.

## Failure Boundary

The standing gate must fail if fixture recall dry-run reports:

- any failed fixture recall case
- `mutated=true`
- `providerCalls` not equal to `0`
- `durableMemoryTouched=true`
- disabled fixture recall summary

The gate must not invent `hitRate` or `qualityScore`.

## Safety Boundaries

Confirmed boundaries for this phase:

- no query runtime ranking change
- no provider smoke or provider benchmark
- no real DB, diary, vector index, audit log, or durable memory write
- no fixture data change
- no package or lockfile change
- no public MCP tool expansion
- no public `validate_memory` MCP tool
- no `validate_memory` mutation-surface expansion
- no SQLite migration or `ALTER TABLE`
- no import/export apply
- no release, tag, deploy, or push without separate authorization

## Validation

Required validation:

```powershell
node --test tests\gate-ci-cli.test.js
node --test tests\real-query-suite.test.js tests\query-quality-report.test.js
npm run real-query-suite -- --json --fixture-recall-dry-run
npm run query:quality -- --json --dry-run --fixture-recall-dry-run
npm run gate:ci
npm run gate:ci -- --json
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Next Recommended Phase

`P15.5-real-memory-query-dry-run-planning`

P15.5 must remain planning-only unless an explicit approval packet authorizes any real local memory read preview. It must not perform import/export apply, migration, provider calls, or durable memory writes.
