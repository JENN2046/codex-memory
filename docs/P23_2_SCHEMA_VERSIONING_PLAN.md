# P23.2 Schema Versioning Plan

Phase: `P23.2-schema-versioning-plan`

Status: planning

## 1. Purpose

This document defines the v1.0 schema/versioning plan for `codex-memory`.

The purpose is to separate schema planning from schema implementation before v1.0. This phase identifies what must be versioned, what may remain documented but not implemented, what must stay backward-compatible, and what remains blocked without explicit A5 authorization.

This phase does not modify schema implementation.
This phase does not run SQLite migration.
This phase does not apply import/export.
This phase does not mutate durable memory.
This phase does not change public MCP tools.
This phase does not perform production deploy.

## 2. Current Schema Baseline

Current schema surfaces include:

- public MCP tool schemas for `record_memory`, `search_memory`, and `memory_overview`
- runtime argument validation and error shapes
- memory object model fixture schemas
- object mapping dry-run fixture schemas
- import/export-safe JSON fixture schemas
- migration readiness report shape
- lifecycle/read-policy fixture schemas
- mutation audit shape fixture schemas
- controlled write dry-run fixture schemas
- local deploy and release-candidate evidence document shapes

Current public MCP tools remain exactly:

- `record_memory`
- `search_memory`
- `memory_overview`

The schema baseline is currently evidence-backed by fixtures, contract tests, dry-run CLIs, and docs. This planning phase does not change any of those runtime or test schemas.

## 3. v1.0 Schema Versioning Goals

Before v1.0, the project should define version identifiers for:

- public MCP contract schema family
- durable memory record object family
- chunk/tag/audit/lifecycle object family
- import/export envelope family
- migration readiness report family
- audit event family
- local deploy / release-candidate evidence family

v1.0 schema versioning goals:

- make compatibility expectations explicit
- prevent silent breaking changes
- preserve existing durable records
- keep schema upgrades auditable
- keep migration apply separate from migration planning
- keep public MCP tool expansion separately gated
- provide rollback expectations for future schema changes

What may remain documented but not implemented before v1.0:

- broad real-data migration apply
- public import/export MCP tools
- public controlled write tools beyond `record_memory`
- public `validate_memory`
- automatic schema upgrade or data rewrite
- production deployment schema enforcement

## 4. Version Identifier Strategy

Recommended identifier strategy:

- MCP contract schema: `mcp_contract_version`
- durable memory record schema: `memory_record_schema_version`
- audit event schema: `audit_schema_version`
- lifecycle/read-policy schema: `lifecycle_schema_version`
- import/export envelope schema: `import_export_schema_version`
- migration readiness report schema: `migration_readiness_schema_version`
- local evidence document schema, where needed: `evidence_schema_version`

Version identifiers should be:

- stable strings, not inferred from timestamps
- documented in schema fixtures or report summaries
- optional only where backward compatibility requires missing-field fallback
- included in dry-run reports before any real migration

Version identifiers must not force immediate data rewrite. Existing records without explicit version fields must remain readable through documented compatibility fallback.

## 5. Memory Record Compatibility Policy

Current durable records must remain backward-compatible.

Compatibility policy:

- missing version fields use documented fallback behavior
- required v1.0 fields must be validated before new writes where possible
- existing records are not rewritten automatically
- read paths should tolerate older records if safety policy permits
- low-risk summaries must not expose raw sensitive scope identifiers
- lifecycle and scope fields must remain policy-aware

Do not introduce silent breaking changes:

- no renamed core fields without compatibility aliasing
- no removed durable fields without migration story
- no changed public semantics without contract review
- no expanded mutation behavior through schema drift

## 6. Durable Data Compatibility Expectations

Durable data compatibility expectations:

- diary-compatible records remain readable
- SQLite shadow records remain readable
- audit logs remain parseable or safely skipped with diagnostics
- vector/chunk metadata remains associated with source records
- lifecycle state remains interpretable
- tombstone/supersession/proposal records remain distinguishable

No immediate data rewrite is required by this planning phase.

Future durable data rewrites require:

- explicit approval
- backup requirement
- dry-run report
- checksum or manifest
- rollback story
- post-apply validation

## 7. Migration Boundary

Migration planning is allowed in A4.8.

Migration apply is A5-gated.

This phase does not run:

- SQLite migration
- `ALTER TABLE`
- data rewrite
- profile rebuild confirm
- cleanup apply
- import/export apply

Future migration planning must preserve:

- dry-run first
- manifest-first review
- no raw secrets in reports
- no raw `workspace_id` exposure in low-risk summaries
- explicit backup and rollback requirements

## 8. Import/Export Boundary

Import/export planning remains allowed as docs, fixtures, and dry-run shape work.

Import/export apply remains blocked without explicit approval.

Before v1.0, import/export readiness should define:

- envelope version
- source schema version
- target schema version
- record count summary
- checksum summary
- redaction status
- audit ref handling
- lifecycle/scope compatibility status
- rollback expectations

This phase does not export broad real memory and does not import real memory.

## 9. Rollback Requirements

Every schema change proposal must include:

- what changed
- compatibility impact
- fallback behavior
- rollback mechanism
- validation commands
- known gaps

Migration or import/export apply rollback requirements:

- backup before apply
- restore story
- checksum verification
- post-rollback health validation
- audit trail for the operation

If rollback cannot be described, schema apply must remain blocked.

## 10. Validation Requirements

Docs-only validation for this phase:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Future schema validation before v1.0:

```powershell
node --test tests\mcp-contract.test.js
node --test tests\vcp-memory-object-model-fixture.test.js
node --test tests\vcp-memory-import-export-shape.test.js
node --test tests\vcp-memory-migration-readiness-cli.test.js
npm test
npm run gate:ci -- --json
```

Future migration dry-run validation:

```powershell
npm run vcp-memory:migration-readiness -- --json
npm run vcp-memory:mapping:dry-run -- --json
npm run lifecycle:sqlite:dry-run -- --json
```

Future security validation:

```powershell
node --test tests\security-write-policy.test.js
npm run gate:ci -- --json
```

## 11. Known Schema Drift Risks

Known risks:

- public MCP schema drift without contract inventory update
- response shape drift in `record_memory`, `search_memory`, or `memory_overview`
- hidden lifecycle/scope semantics changes
- import/export envelope drift before apply policy is ready
- migration readiness report shape drift
- audit event shape drift
- accidental raw secret or raw workspace identifier exposure
- version fields becoming mandatory without fallback
- schema docs claiming implementation that does not exist
- durable mutation behavior expanding through schema changes

Drift mitigation:

- schema inventory before implementation
- fixture shape tests before runtime changes
- dry-run reports before apply
- manual review before public contract changes
- explicit A5 approval before data mutation or migration apply

## 12. A5-Gated Schema Actions

The following remain A5-gated:

- SQLite migration apply
- durable data rewrite
- import/export apply
- production deploy
- public MCP contract-breaking changes
- provider execution
- Codex/Claude config switching
- watchdog/startup installation
- tag/release/deploy
- public MCP tool expansion
- exposing internal `validate_memory` as public MCP

No schema implementation change in this planning phase authorizes those actions.

## 13. Proposed P23.3 Next Phase

Next recommended phase:

`P23.3-validation-matrix-hardening`

P23.3 should convert the P23 planning and P23.1/P23.2 inventories into a concrete v1.0 validation matrix. It should remain docs/fixtures/gate-planning first and must not run A5-gated provider, migration, import/export apply, production deploy, startup/watchdog install, or client config switch actions without explicit authorization.

P23.3 validation matrix hardening is tracked in [P23_3_VALIDATION_MATRIX_HARDENING.md](/A:/codex-memory/docs/P23_3_VALIDATION_MATRIX_HARDENING.md).

P23.6 migration/import-export readiness planning is tracked in [P23_6_MIGRATION_IMPORT_EXPORT_READINESS_PLAN.md](/A:/codex-memory/docs/P23_6_MIGRATION_IMPORT_EXPORT_READINESS_PLAN.md). It expands the migration/import-export boundary, manifest, checksum, backup, rollback, and durable mutation requirements before any apply action.
