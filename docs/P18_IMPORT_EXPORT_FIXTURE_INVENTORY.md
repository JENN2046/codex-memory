# P18 Import / Export Fixture Inventory

Phase: `P18.1-import-export-fixture-inventory`

Status: completed locally

## Purpose

P18.1 inventories the existing fixture and dry-run evidence that can support safe import/export/migration work.

This phase is inventory only. It does not add runtime behavior, read real memory, generate export files, apply imports, or run migrations.

## Existing Fixture Evidence

| Evidence | Files | Current coverage |
|---|---|---|
| Object model shape | `tests/fixtures/vcp-memory-object-model-v1.json`; `tests/vcp-memory-object-model-fixture.test.js` | Object families, required `MemoryRecord` vNext fields, scope, lifecycle, audit, privacy, import/export boundary flags. |
| Object round trip | `tests/fixtures/vcp-memory-object-round-trip-v1.json`; `tests/vcp-memory-object-round-trip.test.js` | JSON stringify/parse stability for records, chunks, tags, audit events, proposals, tombstones, checkpoints, and handoffs. |
| Object mapping preview | `tests/fixtures/vcp-memory-object-mapping-v1.json`; `tests/vcp-memory-object-mapping-fixture.test.js` | Synthetic SQLite / diary / audit / chunk / tag metadata mapping into vNext preview, including missing field and lifecycle fallback cases. |
| Mapping dry-run CLI | `tests/fixtures/vcp-memory-object-mapping-dry-run-v1.json`; `tests/vcp-memory-object-mapping-dry-run-cli.test.js`; `src/cli/vcp-memory-object-mapping-dry-run.js` | Fixture-only CLI output with `mutated=false`, no real DB/diary read, no import/export file generation, and rejected `--confirm` / `--apply` / `--migrate` flags. |
| Import/export shape | `tests/fixtures/vcp-memory-import-export-shape-v1.json`; `tests/vcp-memory-import-export-shape.test.js` | Export/import envelope shape, schema version, records/chunks/tags/audit refs, tombstones, proposals, migrations array, deterministic checksum, redaction, dry-run-first import mode, and no side effects. |
| Migration readiness | `tests/fixtures/vcp-memory-migration-readiness-v1.json`; `tests/vcp-memory-migration-readiness-cli.test.js`; `src/cli/vcp-memory-migration-readiness.js` | Read-only readiness report with `status=blocked`, `migrationBlocked=true`, `mutated=false`, explicit blockers, required approvals, and rejected apply/migrate behavior. |
| Lifecycle dry-run | `tests/lifecycle-sqlite-dry-run-cli.test.js`; `src/cli/lifecycle-sqlite-dry-run.js` | SQLite-adjacent lifecycle dry-run remains no-mutation and can support future migration safety gates. |
| Controlled write dry-run | `tests/fixtures/controlled-write-dry-run-v1.json`; `tests/controlled-write-dry-run-cli.test.js`; `src/cli/controlled-write-dry-run.js` | Existing proposal/audit preview shape for governed write candidates; useful as a policy model, not as import/export apply authorization. |
| Internal validation guard | `tests/fixtures/validate-memory-runtime-v1.json`; `tests/validate-memory-runtime-fixture.test.js`; `tests/validate-memory-runtime.test.js`; `tests/validate-memory-cli.test.js` | Internal-only lifecycle/audit guard evidence for `validate_memory`; not public MCP expansion and not import/export apply. |

## Coverage Already Locked

The existing evidence already covers:

- `schema_version` and fixture-only schema identifiers
- `MemoryRecord` identity and required refs
- chunk, tag, audit, tombstone, proposal, and migration envelope sections
- dry-run-first import mode
- `mutated=false`
- `apply_supported=false` where applicable
- `migrationBlocked=true` for readiness reports
- deterministic fixture checksum behavior
- redaction flags and raw secret rejection
- low-risk workspace summary behavior
- no import/export file generation in dry-run CLI
- no real DB / diary read in fixture CLI tests
- no SQLite / diary / audit / vector / chunk writes
- public MCP tools frozen at `record_memory`, `search_memory`, and `memory_overview`

## Gaps For P18

P18 should still add or summarize evidence before any apply/migration proposal:

1. Multi-record export envelope fixture with stable ordering and deterministic checksum across records.
2. Lifecycle variant coverage for `active`, `stale`, `proposal`, `rejected`, `superseded`, and `tombstoned` records inside the same export envelope.
3. Supersession reference integrity coverage across exported records.
4. Import conflict preview shape for duplicate `memory_id`, missing source/provenance, unsupported schema version, and missing audit refs.
5. Backup manifest and rollback manifest shape before any future apply approval.
6. Partial failure report shape for future dry-run import mapping, with no durable mutation.
7. Explicit proof that broad real export and real memory preview remain blocked without A5 approval.

## P18.2 Recommendation

The next safe phase should be `P18.2-export-envelope-fixture-expansion`.

It should add synthetic fixture/test coverage only. Recommended scope:

- multi-record sanitized export envelope
- lifecycle variants
- supersession refs
- conflict preview cases
- deterministic checksum
- raw secret and raw workspace boundary checks
- `mutated=false`
- `providerCalls=0`
- `durableMemoryTouched=false`
- `realMemoryPreview=false`

P18.2 must not implement import/export runtime, generate export files, scan real memory, apply imports, run migrations, change MCP tools/schema, or touch dependencies.

## Hard Stops

This inventory does not authorize:

- import/export apply
- broad real export
- real memory read preview
- real DB or memory mutation
- SQLite migration
- `ALTER TABLE`
- hard delete
- dependency or lockfile changes
- provider calls
- MCP tool/schema expansion
- release, tag, or deploy

## Validation

Inventory slice:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```
