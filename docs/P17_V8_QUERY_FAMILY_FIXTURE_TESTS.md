# P17.4 V8 Query Family Fixture Tests

Phase: `P17.4-v8-query-family-fixture-tests`

Status: completed locally

## Purpose

P17.4 expands V8 diagnostic evidence from single report-shape checks to synthetic query-family coverage.

This phase verifies that existing `v8-diagnose` signals remain structurally stable across technical, governance, quality, semantic, and safety query families. It does not claim runtime recall quality and does not tune ranking behavior.

## Fixture Families

The fixture covers:

- technical migration / geodesic intent
- governance lifecycle / policy
- recall-quality ranking evidence
- semantic association
- privacy / safety / redaction

Each family asserts:

- normalized query
- expected TagMemo mode
- expected geodesic intent flags
- required core tags
- allowed primary terrain axes
- finite terrain metrics
- residual pyramid levels
- meta-thinking shape
- absence of fake `hitRate` / `qualityScore`
- absence of unsafe output keys

## Boundaries

P17.4 does not:

- modify `src/`
- tune runtime ranking
- implement V8 behavior
- call providers
- run provider smoke or benchmark
- read real memory
- write durable memory
- change MCP tools or schema
- expose `validate_memory` as a public MCP tool
- run SQLite migration or `ALTER TABLE`
- apply import/export
- change package or lock files
- add UI
- tag, release, or deploy

Public MCP tools remain:

- `record_memory`
- `search_memory`
- `memory_overview`

`validate_memory` remains internal-only.

## Validation

Required validation:

- `node --test tests\v8-query-family-fixture.test.js`
- `npm test`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

Local validation result:

- targeted query-family test: `4/4` passed
- full suite: `443/443` passed
- diff check: passed
- docs validation: passed

## Next Phase

Next recommended phase after validation, guarded commit, and safe-push: `P17.5-v8-evidence-gate-summary`.
