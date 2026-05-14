# P18 Export Envelope Fixture Expansion

Phase: `P18.2-export-envelope-fixture-expansion`

Status: completed locally

## Purpose

P18.2 adds synthetic fixture/test coverage for expanded export envelope shape before any import/export runtime, real memory preview, file generation, or migration work.

This phase is fixture/test/docs only.

## Added Evidence

- `tests/fixtures/p18-export-envelope-v1.json`
- `tests/p18-export-envelope-fixture.test.js`

The fixture locks:

- multi-record export envelope shape
- deterministic `memory_id` ordering
- deterministic fixture checksum
- lifecycle variants: `active`, `stale`, `proposal`, `rejected`, `superseded`, `tombstoned`
- supersession refs across exported records
- import conflict preview shape
- backup/rollback manifest requirements
- redaction and low-risk workspace summary flags
- `mutated=false`
- `providerCalls=0`
- `durableMemoryTouched=false`
- `realMemoryPreview=false`
- public MCP tools frozen at `record_memory`, `search_memory`, and `memory_overview`

## Boundaries

P18.2 does not:

- implement import/export runtime
- generate export files
- read real memory
- apply imports
- run migrations
- change SQLite schema
- change MCP tools or schema
- call providers
- touch dependencies
- tag, release, or deploy

## Validation

```powershell
node --test tests\p18-export-envelope-fixture.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Next Phase

Next recommended phase: `P18.3-import-mapping-dry-run-evidence-gate`.
