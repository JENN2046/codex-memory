# P17.2 V8 Diagnostic Fixture Shape Tests

Phase: `P17.2-v8-diagnostic-fixture-shape-tests`

Status: completed locally

## Purpose

P17.2 adds synthetic fixture shape tests for the existing `v8-diagnose` report surface.

This phase locks the report envelope before any V8 implementation or runtime tuning. It verifies that the diagnostic surface is read-only, redacted, and free of fake quality metrics.

## Locked Shape

The fixture locks these top-level report fields:

- `mode`
- `destructive`
- `embeddingProfile`
- `query`
- `terrain`
- `residualPyramid`
- `tagMemo`
- `metaThinking`
- `geodesic`

It also locks stable nested shapes for:

- `embeddingProfile`
- `query`
- `terrain`
- `residualPyramid`
- `tagMemo`
- `metaThinking`
- `geodesic`

## Safety Assertions

The fixture and test assert:

- `destructive=false`
- `mutated=false`
- `providerCalls=0`
- `durableMemoryTouched=false`
- `realMemoryPreview=false`
- `redactionApplied=true`
- `rawWorkspaceIdExposed=false`
- `rawSecretExposed=false`
- no fake `hitRate`
- no fake `qualityScore`
- no provider keys
- no authorization header or cookie surfaces
- no production memory snippets

## Error Shape

The fixture includes a missing-query case. The test represents the current CLI error safely without changing runtime code:

- `ok=false`
- `code=QUERY_REQUIRED`
- `destructive=false`
- `mutated=false`
- `providerCalls=0`
- `durableMemoryTouched=false`
- `realMemoryPreview=false`
- `redactionApplied=true`

## Boundaries

P17.2 does not:

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

- `node --test tests\v8-diagnostic-shape.test.js`
- `npm test`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

Local validation result:

- targeted fixture test: `5/5` passed
- full suite: `434/434` passed
- diff check: passed
- docs validation: passed

## Next Phase

Next recommended phase after validation, guarded commit, and safe-push: `P17.3-v8-diagnostic-cli-shape-gate`.
