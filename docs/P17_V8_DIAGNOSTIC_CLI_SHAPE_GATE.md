# P17.3 V8 Diagnostic CLI Shape Gate

Phase: `P17.3-v8-diagnostic-cli-shape-gate`

Status: completed locally

## Purpose

P17.3 locks the `v8-diagnose` command-line report envelope after P17.2 locked the internal report builder shape.

This phase verifies the CLI boundary only. It does not implement V8 behavior, tune ranking, read real memory, call providers, or change runtime code.

## Gate Coverage

The CLI gate covers:

- `--json` output parses as JSON.
- JSON output preserves `mode=v8-diagnose`.
- JSON output preserves `destructive=false`.
- JSON output includes expected synthetic embedding fingerprint.
- JSON output preserves normalized query, `tagMemo`, `terrain`, `residualPyramid`, `metaThinking`, and `geodesic` surfaces.
- Text output keeps stable operator labels.
- Missing query fails safely with no stdout payload.
- Forbidden fake quality and unsafe fields remain absent.

## Safety Assertions

The fixture declares:

- `mutated=false`
- `providerCalls=0`
- `durableMemoryTouched=false`
- `realMemoryPreview=false`
- `redactionApplied=true`
- `runtimeTuning=false`

The test uses a temporary synthetic base path and does not read project memory data.

## Boundaries

P17.3 does not:

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

- `node --test tests\v8-diagnostic-cli-shape-gate.test.js`
- `npm test`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

Local validation result:

- targeted CLI gate test: `5/5` passed
- full suite: `439/439` passed
- diff check: passed
- docs validation: passed

## Next Phase

Next recommended phase after validation, guarded commit, and safe-push: `P17.4-v8-query-family-fixture-tests`.
