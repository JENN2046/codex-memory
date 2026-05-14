# VCP Memory Object Mapping Dry-Run Plan

Updated: 2026-05-14

## Purpose

P13.3 plans the dry-run mapping path from existing `codex-memory` SQLite / diary records into the VCP-compatible memory object model vNext. It does not implement a runtime mapper, CLI, import/export flow, or migration.

The goal is to define how a future read-only scan can safely preview mappings from current SQLite and DailyNote-compatible diary records into `MemoryRecord` vNext envelopes, while reporting missing fields, risk, and rollback requirements.

P13.3 does not:

- migrate real data
- write SQLite
- rewrite diary markdown
- rebuild vectors or chunks
- write audit logs
- generate import/export files
- change MCP tools or schemas
- expose `validate_memory` as a public MCP tool

The future dry-run must be report-first and must keep `mutated=false`.

## Mapping Sources

Future dry-run mapping may inspect these sources in read-only mode only:

- SQLite `memory_records`
- diary markdown / DailyNote-compatible records
- write audit logs and recall audit logs
- chunk metadata and vector metadata
- scope fields such as `project_id`, `workspace_id`, `client_id`, `agent_id`, `task_id`, `conversation_id`, and `visibility`
- lifecycle fields such as `status`, `lifecycle_status`, `supersedes_memory_id`, and `superseded_by_memory_id`
- tag metadata if available in current rows, chunks, audit events, or future tag indexes

The dry-run report must not print raw secret-like content. Low-risk summaries must not print raw `workspace_id`.

## Proposed Dry-Run Output Shape

The future dry-run report should expose a stable summary shape:

```json
{
  "status": "ok|warn|error",
  "mutated": false,
  "scannedRecordCount": 0,
  "mappedRecordCount": 0,
  "unmappedRecordCount": 0,
  "missingRequiredFieldCounts": {
    "memory_id": 0,
    "schema_version": 0,
    "kind": 0,
    "title": 0,
    "content_ref": 0,
    "source": 0,
    "created_at": 0
  },
  "missingOptionalFieldCounts": {
    "content_hash": 0,
    "provenance": 0,
    "agent_id": 0,
    "supersedes_memory_id": 0,
    "superseded_by_memory_id": 0,
    "tag_refs": 0,
    "chunk_refs": 0
  },
  "unknownFieldCounts": {
    "kind": 0,
    "source": 0,
    "visibility": 0,
    "lifecycle_status": 0,
    "retention_policy": 0
  },
  "lifecycleStatusCoverage": {
    "active": 0,
    "stale": 0,
    "proposal": 0,
    "rejected": 0,
    "superseded": 0,
    "tombstoned": 0,
    "unknown": 0
  },
  "scopeCoverage": {
    "project_id": { "present": 0, "missing": 0 },
    "workspace_id": { "present": 0, "missing": 0, "manualReviewRequired": 0 },
    "client_id": { "present": 0, "missing": 0 },
    "agent_id": { "present": 0, "missing": 0, "unknown": 0 },
    "task_id": { "present": 0, "missing": 0 },
    "visibility": { "present": 0, "missing": 0, "unknown": 0 }
  },
  "auditRefCoverage": {
    "present": 0,
    "missing": 0,
    "ambiguous": 0
  },
  "chunkRefCoverage": {
    "present": 0,
    "missing": 0,
    "ambiguous": 0
  },
  "tagRefCoverage": {
    "present": 0,
    "missing": 0,
    "ambiguous": 0
  },
  "importExportSafeCount": 0,
  "riskLevel": "low|medium|high|blocked",
  "rollbackRequirement": "none|backup-required|manual-review-required|blocked",
  "nextStep": "review-missing-fields"
}
```

Detailed record previews should be separate from low-risk summaries. If future previews include record-level samples, they must redact content and avoid raw `workspace_id`.

## Mapping Rules

- Existing `memory_id` is preserved.
- Missing vNext fields normalize to `null` or `unknown`.
- No silent inference is allowed.
- No raw secret output is allowed.
- No raw `workspace_id` is allowed in low-risk summaries.
- `MemoryProposal` remains inactive by default.
- `Tombstone` remains hidden by default.
- Audit refs preserve event identity where an audit event or log reference is available.
- Scope fields preserve `project_id`, `workspace_id`, `client_id`, `agent_id`, `task_id`, `conversation_id`, and `visibility` where available.
- Lifecycle fields preserve current status where available.
- `content_ref` and `content_hash` may be derived only in dry-run/report context.
- Derived `content_ref` and `content_hash` must not be written back during dry-run.
- Chunk refs and tag refs are included only when evidence exists.
- Supersession refs are preserved when present and reported as missing or ambiguous when not available.

## Missing Field Policy

- Required fields missing -> report, not infer.
- Optional fields missing -> safe `null` / `unknown`.
- `workspace_id` missing -> manual review required.
- `provenance` missing -> warning.
- `lifecycle_status` missing -> warning / `unknown`, not `active` by silent default.
- `audit_refs` missing -> report as missing coverage, not fabricated.
- `chunk_refs` missing -> report as missing coverage, not fabricated.
- `tag_refs` missing -> report as missing coverage, not fabricated.
- Unknown `visibility` -> `unknown`, not `project` by silent default.
- Unknown `kind` -> `unknown` unless the source explicitly identifies the object family.

## Safety Rules

- Dry-run first.
- Always report `mutated=false`.
- No SQLite write.
- No diary rewrite.
- No vector rebuild.
- No audit-log write.
- No import/export file generation unless later approved.
- No migration until separately approved.
- No `ALTER TABLE`.
- No provider calls.
- No `.env` or secret changes.
- No MCP public tool expansion.
- No MCP schema change.
- No runtime mapper in P13.3.

## Future Implementation Sequence

1. `P13.4-object-mapping-fixture-tests`
   - Completed as fixture-only tests for mapping SQLite-like rows, diary-like records, audit refs, chunks, tags, scope, and lifecycle into object mapping previews.
   - Fixture-only; no real data scan, runtime mapper, import/export runtime, or migration.
2. `P13.5-SQLite-diary-mapping-dry-run-CLI`
   - Add a local read-only dry-run CLI after fixture tests exist.
   - Must report `mutated=false`.
   - Must reject `--confirm`, `--apply`, `--write`, and migration-like flags.
3. `P13.6-import-export-safe-JSON-shape-tests`
   - Define import/export-safe JSON shapes and redaction expectations with fixtures first.
   - No broad export of real memory.
4. `P13.7-migration-readiness-report`
   - Produce a readiness report with counts, missing fields, risks, backup requirements, and rollback requirements.
   - No real migration until explicit approval.

No real migration, SQLite schema change, `ALTER TABLE`, diary rewrite, import/export runtime, or durable memory mutation is approved by this sequence.

## P13.4 Object Mapping Fixture Tests

P13.4 adds the first fixture-only object mapping preview tests:

- fixture: `tests/fixtures/vcp-memory-object-mapping-v1.json`
- test: `tests/vcp-memory-object-mapping-fixture.test.js`

The fixture models synthetic SQLite, diary, audit, chunk, and tag metadata. It does not read real SQLite records, real diary markdown, provider data, or durable memory.

The test-local helpers are intentionally limited to the test file:

- `buildMappingPreview()`
- `normalizeMissingFields()`
- `buildLowRiskSummary()`

The tests prove that a future mapping preview can preserve:

- `memory_id`, title, `schema_version`, and object kind
- internal scope fields: `project_id`, `workspace_id`, `client_id`, and `visibility`
- lifecycle status, including missing lifecycle status as `unknown`, not silently `active`
- audit refs, chunk refs, and tag refs
- deterministic fixture-only `content_hash`
- fixture-only `content_ref`
- required-field missing reports without inference
- optional-field fallback to `null` / `unknown`
- `importExportSafe=false` when source/provenance is missing
- inactive proposal default and hidden tombstone default
- no raw secret or raw `workspace_id` in low-risk output
- `mutated=false` and no side effects

This remains a fixture/test phase only:

- no runtime mapper
- no import/export CLI
- no MCP public tool expansion
- no MCP schema change
- no SQLite migration or `ALTER TABLE`
- no real DB read, diary read, DB write, diary rewrite, vector rebuild, audit-log write, or durable memory write

## Validation Plan

Future implementation should use:

- mapping fixture tests
- dry-run CLI tests
- object model fixture tests
- round-trip fixture tests
- `npm test`
- `npm run gate:ci`
- `npm run lifecycle:sqlite:dry-run -- --json`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

P13.4 validation:

```powershell
node --test tests\vcp-memory-object-mapping-fixture.test.js
node --test tests\vcp-memory-object-model-fixture.test.js
node --test tests\vcp-memory-object-round-trip.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Current P13.3 validation is docs-only:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Non-Goals

- No runtime mapper.
- No SQLite migration.
- No diary rewrite.
- No import/export implementation.
- No MCP tool expansion.
- No provider call.
- No P14 / P15 / P16 work yet.
- No real DB/memory write.
- No real data migration.
- No broad export of durable memory.

## Next Recommended Phase

`P13.5-SQLite-diary-mapping-dry-run-CLI`
