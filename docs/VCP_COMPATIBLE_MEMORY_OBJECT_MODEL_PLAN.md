# P13 VCP-Compatible Memory Object Model Plan

Updated: 2026-05-14

## Purpose

P13 defines the practical object model that `codex-memory` needs in order to keep moving toward VCP-compatible memory parity without turning the current local runtime into a migration project.

The goal is a VCP-compatible practical object model, not a full donor clone and not a new storage rewrite. The model must explain how durable memories, chunks, scopes, lifecycle state, proposals, handoffs, tombstones, audit events, and future migration records fit together.

This phase is planning only:

- no runtime change
- no SQLite migration
- no diary rewrite
- no vector or chunk rebuild
- no import/export implementation
- no public MCP tool expansion
- no durable memory mutation

The object model must remain compatible with the existing diary, SQLite shadow store, audit log, vector index, chunk index, recall pipeline, dashboard, governance report, and controlled-write boundaries.

P12 is closed at an internal-only `validate_memory` state. `validate_memory` remains internal-only in P13, and public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`.

## Design Principles

- Local-first: every object shape must work without a remote service, cloud account, provider call, or live donor runtime.
- Backward-compatible: existing diary records, SQLite rows, chunks, vectors, and audit logs must remain readable.
- Migration-safe: missing vNext fields are treated as unknown or null with safe fallback; no immediate migration is required.
- Audit-first: durable changes must be explainable by audit events before future mutation paths expand.
- Scope-aware: project, workspace, client, agent, task, and visibility boundaries must be explicit.
- Lifecycle-aware: proposal, active, stale, rejected, superseded, and tombstoned state must map predictably.
- Import/export-safe: future JSON shapes must preserve identity, scope, lifecycle, source, audit, and redaction flags.
- No silent data mutation: mapping, import, export, and migration plans must be dry-run-first.
- No raw secrets: content and metadata surfaces must respect SecretScanner and redaction boundaries.
- No raw `workspace_id` in low-risk summaries: reports may show presence, counts, hashes, or scoped dimensions, but not raw workspace identifiers in low-risk summaries.

## Object Families

### MemoryRecord

The durable memory envelope. It represents a remembered fact, preference, checkpoint, handoff, policy note, or governed memory object independently of how content is stored.

Minimum useful fields:

- `memory_id`
- `kind`
- `title`
- `content_ref`
- `content_hash`
- `source`
- `provenance`
- `created_at`
- `updated_at`
- `schema_version`
- `project_id`
- `workspace_id`
- `client_id`
- `agent_id`
- `task_id`
- `visibility`
- `lifecycle_status`
- `retention_policy`
- `audit_refs`
- `tag_refs`
- `chunk_refs`

### MemoChunk

A chunk derived from a diary-compatible memory note or short memo-like source. It is optimized for recall and traceability back to the parent `MemoryRecord`.

Minimum useful fields:

- `chunk_id`
- `memory_id`
- `content_hash`
- `text_ref`
- `offset_start`
- `offset_end`
- `created_at`
- `embedding_ref`
- `scope_ref`
- `lifecycle_status`

### KnowledgeChunk

A chunk derived from imported knowledge, files, documentation, active-memory donor fixtures, or future VCP-compatible knowledge bases.

Minimum useful fields:

- `chunk_id`
- `knowledge_source_id`
- `memory_id`
- `path_ref`
- `content_hash`
- `section_ref`
- `embedding_ref`
- `tags`
- `scope_ref`
- `created_at`
- `updated_at`

### Tag

A normalized tag or semantic association marker. Tags should support donor-style TagMemo / semantic association work later without making P13 depend on P16.

Minimum useful fields:

- `tag_id`
- `name`
- `normalized_name`
- `source`
- `confidence`
- `created_at`
- `memory_refs`
- `chunk_refs`

### AgentProfile

A scoped description of an agent identity, source, and memory visibility relationship.

Minimum useful fields:

- `agent_id`
- `client_id`
- `display_name`
- `source`
- `visibility_defaults`
- `created_at`
- `updated_at`
- `profile_ref`

### ProjectContext

A project-level scope object for grouping memories, imports, and recall behavior.

Minimum useful fields:

- `project_id`
- `workspace_ref`
- `name`
- `source`
- `created_at`
- `updated_at`
- `visibility_defaults`
- `retention_policy`

### TaskContext

A narrower context for current work, handoffs, checkpoints, and future task-scoped recall.

Minimum useful fields:

- `task_id`
- `project_id`
- `client_id`
- `agent_id`
- `title`
- `status`
- `created_at`
- `updated_at`
- `conversation_ref`
- `memory_refs`

### Checkpoint

A durable work-state summary that may later map to a controlled `checkpoint_memory` path, but remains an object model concept in P13.

Minimum useful fields:

- `checkpoint_id`
- `memory_id`
- `task_id`
- `project_id`
- `summary_ref`
- `evidence_refs`
- `created_at`
- `actor_client_id`
- `audit_refs`

### Handoff

A structured continuation object for another agent, session, or client. It should be source-backed and policy-scoped.

Minimum useful fields:

- `handoff_id`
- `memory_id`
- `task_id`
- `from_client_id`
- `to_client_id`
- `summary_ref`
- `evidence_refs`
- `created_at`
- `audit_refs`

### AuditEvent

The append-only explanation record for durable memory lifecycle, mutation, import/export, migration, and policy decisions.

Minimum useful fields:

- `event_id`
- `memory_id`
- `event_type`
- `tool_name`
- `actor_client_id`
- `request_source`
- `from_status`
- `to_status`
- `reason`
- `evidence`
- `created_at`
- `reversible`
- `previous_snapshot_ref`
- `diff_summary`
- `redaction_applied`
- `lifecycle_policy_applied`
- `scope_policy_applied`

### Tombstone

A lifecycle marker for memories that should no longer appear in ordinary recall, without hard delete.

Minimum useful fields:

- `tombstone_id`
- `memory_id`
- `reason`
- `actor_client_id`
- `created_at`
- `previous_snapshot_ref`
- `audit_event_id`
- `retention_policy`

### MemoryProposal

A proposed memory or lifecycle change that requires review before durable activation.

Minimum useful fields:

- `proposal_id`
- `memory_id`
- `proposal_type`
- `proposed_by_client_id`
- `source`
- `reason`
- `evidence`
- `created_at`
- `status`
- `scope_ref`
- `audit_refs`

### MemoryMigration

A dry-run-first object for import/export or storage mapping changes.

Minimum useful fields:

- `migration_id`
- `source_schema_version`
- `target_schema_version`
- `started_at`
- `completed_at`
- `dry_run`
- `mutated`
- `record_counts`
- `risk_summary`
- `rollback_ref`
- `audit_refs`

## MemoryRecord vNext Fields

The planned `MemoryRecord` vNext envelope contains:

| Field | Purpose | Compatibility Rule |
|---|---|---|
| `memory_id` | Stable durable identity | Existing IDs are preserved |
| `kind` | Memory family, such as note, preference, checkpoint, handoff, proposal, tombstone | Missing value maps to `memory` or unknown |
| `title` | Human-readable label | Existing title is preserved |
| `content_ref` | Pointer to diary text, external content, or redacted content body | May be derived from diary path or row content |
| `content_hash` | Content integrity and dedup support | Optional until generated by dry-run mapping |
| `source` | Origin, such as MCP write, diary import, CLI, donor fixture, migration | Missing value maps to unknown |
| `provenance` | Structured source details and evidence chain | Optional; must not expose secrets |
| `created_at` | Creation time | Existing value preserved where available |
| `updated_at` | Last update time | Existing value preserved where available |
| `schema_version` | Object model version | Missing value treated as legacy |
| `project_id` | Project scope | Existing field maps directly |
| `workspace_id` | Workspace scope | Existing field maps directly, but low-risk reports must not expose raw value |
| `client_id` | Client identity scope | Existing field maps directly |
| `agent_id` | Agent identity scope | Derived only when explicit; otherwise unknown |
| `task_id` | Task scope | Existing field maps directly |
| `visibility` | public/project/private/client scope behavior | Existing field maps directly or defaults safely |
| `lifecycle_status` | proposal/active/stale/rejected/superseded/tombstoned | Existing `status` maps here |
| `supersedes_memory_id` | Previous memory superseded by this record | Existing field maps directly where present |
| `superseded_by_memory_id` | Later memory that supersedes this record | Existing field maps directly where present |
| `retention_policy` | Keep/delete/tombstone/export rules | Existing field maps directly where present |
| `audit_refs` | Related audit event IDs or log refs | Derived from audit mapping only |
| `tag_refs` | Related tag IDs | Derived from tag mapping only |
| `chunk_refs` | Related memo/knowledge chunk IDs | Derived from chunk mapping only |

## Backward Compatibility

- Existing diary records remain readable.
- Existing SQLite `memory_records` rows remain readable.
- Existing audit logs remain readable.
- Existing vector and chunk indexes remain readable.
- No required immediate migration is introduced by P13.
- Missing vNext fields are treated as unknown or null with safe fallback.
- Mapping code in future phases must not require all vNext fields to exist.
- Migration must be dry-run first and report `mutated=false` until separately approved.
- Existing `record_memory`, `search_memory`, and `memory_overview` contracts remain unchanged.
- `validate_memory` remains internal-only and is not exposed through MCP in P13.

## Mapping Plan

### Diary Markdown -> MemoryRecord vNext

Diary-compatible markdown remains the durable human-readable source. A future mapper should derive:

- `memory_id` from existing metadata or stable generated ID
- `title` from heading or record title
- `content_ref` from diary path plus section offset
- `content_hash` from normalized content
- `source` as diary-compatible write or diary import
- `created_at` / `updated_at` from metadata or file/record timestamps
- scope fields from embedded metadata when present
- `lifecycle_status` from existing lifecycle metadata or safe legacy fallback

### SQLite `memory_records` -> MemoryRecord vNext

Existing SQLite rows map directly where fields exist:

- `memory_id` -> `memory_id`
- `title` -> `title`
- `content` / `raw_text` -> `content_ref` and future `content_hash`
- `created_at` / `updated_at` -> same fields
- `project_id`, `workspace_id`, `client_id`, `task_id`, `visibility`, `retention_policy` -> scope and retention fields
- `status` -> `lifecycle_status`
- `supersedes_memory_id` / `superseded_by_memory_id` -> supersession metadata

Missing columns are not migration failures in P13. They are recorded as unknown/null by future dry-run mapping.

### Chunks -> MemoChunk / KnowledgeChunk

Chunks derived from normal memory notes map to `MemoChunk`.

Chunks derived from imported files, donor knowledge bases, or VCP-style knowledge sources map to `KnowledgeChunk`.

Both chunk families must preserve:

- parent memory or source reference
- content hash or text reference
- embedding reference when available
- scope reference
- lifecycle visibility relationship

### Audit Logs -> AuditEvent

Write audit, recall audit, lifecycle audit, mutation audit, import/export audit, and migration audit should map to `AuditEvent` with a clear event type and redaction flags.

Low-risk summaries must not expose raw `workspace_id`, provider tokens, cookies, Authorization headers, or other secrets.

### Lifecycle Status -> Tombstone / Supersession Metadata

Existing `status=tombstoned` maps to a `Tombstone` view when a tombstone reason or audit reference exists.

Existing `status=superseded` plus bidirectional references maps to supersession metadata on `MemoryRecord`.

Rejected and proposal states remain lifecycle statuses, not deleted records.

### Scope Fields -> ProjectContext / TaskContext / Client Scope

Existing `project_id`, `workspace_id`, `client_id`, `task_id`, `conversation_id`, `visibility`, and `retention_policy` become explicit object-model scope fields.

Future reports may show scope presence, counts, and dimensions. Low-risk summaries must not expose raw `workspace_id`.

## Migration Strategy

P13 does not migrate data. The planned sequence is:

1. `P13.1-object-model-fixture-schemas`
   - Add fixture schemas for the object families and `MemoryRecord` vNext.
   - No runtime change.
2. `P13.2-round-trip-fixture-tests`
   - Add fixture-only round-trip tests for object envelopes.
   - No diary/SQLite writes.
3. `P13.3-sqlite-diary-mapping-dry-run`
   - Plan a dry-run mapping report for diary and SQLite rows.
   - Must report `mutated=false` when implemented later.
4. `P13.4-object-mapping-fixture-tests`
   - Add fixture tests for SQLite/diary mapping preview behavior.
   - Completed as fixture-only tests; no real data scan.
5. `P13.5-SQLite-diary-mapping-dry-run-CLI`
   - Completed as a fixture-safe read-only dry-run CLI after mapping fixture tests.
   - Rejects apply/confirm/migrate flags.
6. `P13.6-import-export-safe-json-shape-tests`
   - Completed as fixture-only import/export-safe JSON shape tests.
   - No import/export CLI or file generation.
7. `P13.7-migration-readiness-report`
   - Completed as a read-only fixture-backed migration readiness report.
   - Keeps `migrationBlocked=true` until separately approved.

No real migration, SQLite schema change, `ALTER TABLE`, diary rewrite, vector rebuild, import, export, or durable memory mutation is approved by P13.

## P13.1 Fixture Schema

P13.1 locks the object-model shape with fixture-backed tests:

- fixture: `tests/fixtures/vcp-memory-object-model-v1.json`
- test: `tests/vcp-memory-object-model-fixture.test.js`

The fixture defines the minimum object families, `MemoryRecord` vNext required fields, privacy boundaries, lifecycle boundaries, audit boundaries, import/export safety flags, and backward-compatibility rules.

This remains a schema fixture phase only:

- no runtime change
- no MCP public tool expansion
- no MCP schema change
- no SQLite migration or `ALTER TABLE`
- no diary, vector, audit-log, or durable memory write
- `validate_memory` remains internal-only

## P13.2 Round-Trip Fixture Tests

P13.2 locks the first fixture-only object envelope round-trip:

- fixture: `tests/fixtures/vcp-memory-object-round-trip-v1.json`
- test: `tests/vcp-memory-object-round-trip.test.js`

The test-local helpers are intentionally limited to the test file:

- `normalizeObjectEnvelope()`
- `exportSafeJson()`
- `reloadExportedObject()`

The round-trip proves:

- source fixture -> normalized object -> export-safe JSON -> reloaded object works without runtime code
- identity, `schema_version`, `kind`, source/provenance, scope, lifecycle, supersession, audit refs, tag refs, and chunk refs survive JSON round-trip
- `MemoryProposal` remains inactive by default
- `Tombstone` remains hidden by default
- `AuditEvent` does not expose raw secrets
- low-risk export summary does not expose raw `workspace_id`
- missing optional vNext fields normalize to `null` or `unknown`, not inferred values
- exported JSON remains stable under `JSON.stringify` / `JSON.parse`
- no mutation or side effect happens

This remains a fixture/test phase only:

- no runtime mapper
- no import/export CLI
- no MCP public tool expansion
- no MCP schema change

## P13.7 Migration Readiness Report

P13.7 adds a read-only readiness report:

```powershell
npm run vcp-memory:migration-readiness -- --json
```

Implementation files:

- CLI: `src/cli/vcp-memory-migration-readiness.js`
- fixture: `tests/fixtures/vcp-memory-migration-readiness-v1.json`
- test: `tests/vcp-memory-migration-readiness-cli.test.js`
- npm script: `vcp-memory:migration-readiness`

The report summarizes whether the P13 object-model chain is ready for future migration planning:

- `objectModelFixtureReady`
- `roundTripFixtureReady`
- `mappingFixtureReady`
- `mappingDryRunCliReady`
- `importExportShapeReady`
- `missingPrerequisites`
- `migrationBlocked=true`
- `migrationBlockers`
- `requiredApprovals`
- `riskLevel`
- `nextStep`

This is not a migration. The CLI reports `mutated=false`, rejects `--apply`, `--migrate`, and `--confirm`, and keeps public MCP tools frozen.

P13.7 remains a readiness-report phase only:

- no migration
- no SQLite write
- no diary rewrite
- no import/export apply
- no real DB/memory write
- no MCP public tool expansion
- no MCP schema change
- no SQLite migration or `ALTER TABLE`
- no diary, vector, audit-log, DB, or durable memory write

## P13 Closeout Review

P13 closeout is recorded in [P13_OBJECT_MODEL_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P13_OBJECT_MODEL_CLOSEOUT_REVIEW.md).

Closeout judgment:

- P13 planning through P13.7 are complete.
- The object model is fixture/dry-run ready, not migrated.
- `validate_memory` remains internal-only.
- Public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`.
- Migration remains blocked until a future explicit approval, backup plan, rollback plan, and validation gate are approved.
- P14 may begin only as donor behavior parity gate planning.

## P13.3 SQLite / Diary Mapping Dry-Run Planning

P13.3 records the planning contract for future SQLite / diary mapping dry-run work:

- plan: `docs/VCP_MEMORY_OBJECT_MAPPING_DRY_RUN_PLAN.md`

The plan defines:

- future read-only mapping sources, including SQLite `memory_records`, diary markdown, audit logs, chunk/vector metadata, scope fields, lifecycle fields, and tag metadata when available
- proposed dry-run output fields such as `status`, `mutated=false`, scanned/mapped/unmapped counts, missing field counts, lifecycle/scope/ref coverage, `riskLevel`, `rollbackRequirement`, and `nextStep`
- mapping rules for preserving `memory_id`, scope, lifecycle, audit refs, proposal/tombstone defaults, and dry-run-only `content_ref` / `content_hash`
- missing field policy for required fields, optional fields, `workspace_id`, provenance, and lifecycle status
- safety rules that forbid SQLite writes, diary rewrites, vector rebuilds, audit-log writes, import/export file generation, migration, MCP expansion, provider calls, and runtime mapper work
- future sequence: P13.4 fixture tests, P13.5 dry-run CLI, P13.6 import/export-safe JSON shape tests, and P13.7 migration readiness report

This remains a docs/board planning phase only:

- no runtime mapper
- no tests
- no import/export CLI
- no MCP public tool expansion
- no MCP schema change
- no SQLite migration or `ALTER TABLE`
- no real data scan, DB write, diary rewrite, vector rebuild, audit-log write, or durable memory write

## P13.4 Object Mapping Fixture Tests

P13.4 locks the first fixture-only SQLite / diary object mapping preview:

- fixture: `tests/fixtures/vcp-memory-object-mapping-v1.json`
- test: `tests/vcp-memory-object-mapping-fixture.test.js`

The test fixture models synthetic SQLite record fields, diary metadata, audit log refs, chunk metadata, and tag metadata. The test-local helpers are intentionally scoped to the test file:

- `buildMappingPreview()`
- `normalizeMissingFields()`
- `buildLowRiskSummary()`

The tests prove that a future mapping preview can keep `memory_id`, title, `kind`, `schema_version`, internal scope fields, lifecycle status, audit refs, chunk refs, tag refs, deterministic fixture-only `content_hash`, and fixture-only `content_ref`.

The tests also lock the safety boundary:

- missing required fields are reported, not inferred
- missing optional fields normalize to `null` / `unknown`
- missing lifecycle status becomes `unknown`, not silently `active`
- `importExportSafe=false` when source/provenance is missing
- proposals remain inactive by default
- tombstones remain hidden by default
- low-risk summaries do not expose raw `workspace_id`
- raw secret sentinels are not emitted
- mapping reports keep `mutated=false`
- no side effect happens

This remains a fixture/test phase only:

- no runtime mapper
- no import/export CLI
- no MCP public tool expansion
- no MCP schema change
- no SQLite migration or `ALTER TABLE`
- no real DB read, diary read, DB write, diary rewrite, vector rebuild, audit-log write, or durable memory write

## P13.5 SQLite / Diary Mapping Dry-Run CLI

P13.5 adds the first local dry-run report surface for VCP object-model mapping:

- CLI: `src/cli/vcp-memory-object-mapping-dry-run.js`
- fixture: `tests/fixtures/vcp-memory-object-mapping-dry-run-v1.json`
- test: `tests/vcp-memory-object-mapping-dry-run-cli.test.js`
- script: `npm run vcp-memory:mapping:dry-run -- --json`

The CLI runs in fixture mode by default. It reports `mutated=false`, rejects `--confirm`, `--apply`, and `--migrate`, and does not read the real SQLite DB or real diary.

The report includes scanned/mapped/unmapped counts, missing required/optional/unknown field counts, lifecycle/scope/audit/chunk/tag coverage, import/export safety count, risk level, rollback requirement, and next step. Low-risk summaries do not expose raw `workspace_id`, and raw secret sentinels are not emitted.

This remains a dry-run reporting phase only:

- no runtime mapper
- no import/export implementation or file generation
- no MCP public tool expansion
- no MCP schema change
- no SQLite migration or `ALTER TABLE`
- no real DB read, diary read, DB write, diary rewrite, vector rebuild, audit-log write, or durable memory write

## P13.6 Import / Export Safe JSON Shape Tests

P13.6 locks the fixture-only import/export-safe JSON shape:

- fixture: `tests/fixtures/vcp-memory-import-export-shape-v1.json`
- test: `tests/vcp-memory-import-export-shape.test.js`

The fixture defines:

- `exportEnvelope`
- `importEnvelope`
- `schema_version`
- `exported_at`
- `source_project`
- `source_client`
- redacted/summarized `source_workspace`
- records, chunks, tags, audit events, tombstones, proposals, and migration readiness notes
- deterministic fixture checksum
- redaction, scope-policy, and lifecycle-policy flags
- `import_mode=dry-run-first`
- `mutated=false`

The tests prove records keep `memory_id`, chunks/tags keep refs, audit events keep `event_id`, tombstones remain hidden, proposals remain inactive, redaction is required, raw secrets are forbidden, raw `workspace_id` is forbidden in low-risk summaries, checksum generation is deterministic, import mode is dry-run-first, and no side effect happens.

This remains a fixture/test phase only:

- no `src/` change
- no package change
- no import/export CLI
- no import/export file generation
- no real memory import/export
- no SQLite migration or `ALTER TABLE`
- no DB/diary write
- no MCP public tool expansion
- no MCP schema change

## Risk Register

| Risk | Why It Matters | P13 Mitigation |
|---|---|---|
| Schema drift | Multiple docs or mappers may define incompatible fields | Keep this plan as the P13 planning entry and add fixture schemas in P13.1 |
| Breaking existing recall | Recall may depend on legacy row and chunk shapes | Planning only; future mappers must be read-only and fallback-safe |
| Breaking diary compatibility | Diary markdown is the human-readable durable source | Existing diary records remain readable; no rewrite in P13 |
| Accidental data migration | Object-model work could accidentally become schema work | P13.3 keeps SQLite/diary mapping at planning only; no migration or `ALTER TABLE`; dry-run-first future phases |
| Scope leakage | Raw workspace/client/project fields can leak in summaries | No raw `workspace_id` in low-risk summaries; scope-aware mapping |
| Lifecycle mismatch | Legacy `status` and vNext lifecycle may diverge | Map existing `status` to `lifecycle_status`; unknown/null fallback |
| Audit mismatch | Mutation and lifecycle history could be incomplete or overclaimed | Audit refs are derived only when evidence exists |
| Import/export data loss | Future JSON movement may drop scope, lifecycle, or audit evidence | P13.2 locks fixture-only envelope round-trip; P13.4 locks mapping preview refs and safety summaries before dry-run CLI work |

## Validation Plan

Future validation should include:

- object model fixture tests
- diary mapping tests
- SQLite mapping tests
- audit mapping tests
- lifecycle mapping tests
- import/export fixture tests
- `npm test`
- `npm run gate:ci`
- `npm run gate:mainline:strict`
- `git diff --check`
- docs validation

P13.2 validation:

```powershell
node --test tests\vcp-memory-object-round-trip.test.js
node --test tests\vcp-memory-object-model-fixture.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

P13.3 validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

P13.4 validation:

```powershell
node --test tests\vcp-memory-object-mapping-fixture.test.js
node --test tests\vcp-memory-object-model-fixture.test.js
node --test tests\vcp-memory-object-round-trip.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

P13.5 validation:

```powershell
node --test tests\vcp-memory-object-mapping-dry-run-cli.test.js
node --test tests\vcp-memory-object-mapping-fixture.test.js
node --test tests\vcp-memory-object-round-trip.test.js
npm run vcp-memory:mapping:dry-run -- --json
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

P13.6 validation:

```powershell
node --test tests\vcp-memory-import-export-shape.test.js
node --test tests\vcp-memory-object-model-fixture.test.js
node --test tests\vcp-memory-object-round-trip.test.js
node --test tests\vcp-memory-object-mapping-fixture.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

P13.7 validation:

```powershell
node --test tests\vcp-memory-migration-readiness-cli.test.js
npm run vcp-memory:migration-readiness -- --json
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

P13 planning validation was docs-only:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Non-Goals

- This phase does not change runtime.
- This phase does not change DB schema.
- This phase does not migrate data.
- This phase does not add MCP tools.
- This phase does not expose `validate_memory` through MCP.
- This phase does not implement import/export.
- This phase does not enter P14, P15, or P16.
- This phase does not build UI.
- This phase does not run provider smoke or benchmark.
- This phase does not run `rebuild-profile --confirm`.

## Next Recommended Phase

`P14-donor-behavior-parity-gate-planning`

P13 is closed. P14 should start as planning / fixture / gate design only; no P14 runtime implementation is started by this closeout.
