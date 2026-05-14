# P18 Import / Export / Migration Safety Plan

Phase: `P18-import-export-migration-safety-planning`

Status: completed locally

## Purpose

P18 begins after P17 closed as `DIAGNOSTIC_EVIDENCE_FIXTURE_BACKED_AND_CLOSED`.

The goal of P18 is to define a safe, auditable, reversible route for import/export/migration work before any real data operation is allowed.

This phase is planning only. It does not implement import/export apply, run migrations, scan real memory, or modify durable data.

## Safety Principles

P18 must preserve the memory-kernel requirements:

- scoped
- sourced
- searchable
- correctable
- supersedable
- forgettable
- auditable
- reversible or traceable
- privacy-safe

For import/export/migration specifically:

- dry-run first
- redaction first
- no raw secrets
- no low-risk raw workspace identifiers
- explicit source/provenance
- explicit lifecycle status handling
- explicit tombstone/proposal behavior
- deterministic report shape
- backup requirement before apply
- rollback story before apply
- A5 approval before apply, migration, broad export, or real DB mutation

## Existing Evidence

P18 can build from existing fixture-backed work:

- P13 object model fixture schemas
- P13 object round-trip fixture tests
- P13 object mapping fixture tests
- P13 mapping dry-run CLI
- P13 import/export-safe JSON shape fixture tests
- P13 migration readiness CLI
- lifecycle SQLite dry-run
- controlled write dry-run and internal `validate_memory` audit/lifecycle gates

## Planned Sequence

1. `P18-import-export-migration-safety-planning`: this document and board/status alignment only.
2. `P18.1-import-export-fixture-inventory`: inventory existing P13 import/export/mapping/readiness fixtures and gaps.
3. `P18.2-export-envelope-fixture-expansion`: expand sanitized export envelope fixtures if gaps exist.
4. `P18.3-import-mapping-dry-run-evidence-gate`: summarize mapping dry-run and migration readiness evidence.
5. `P18.4-backup-rollback-safety-review`: define backup requirement, rollback story, and A5 approval packet shape.
6. `P18.x-closeout-review`: decide whether P18 is dry-run-safe enough to proceed to P19 planning.

## Hard Stops

P18 planning does not authorize:

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

Any future apply/migration phase requires an explicit A5 approval packet with:

- exact phase name
- exact target capability
- exact mutation scope
- allowed files
- forbidden files
- backup requirement
- rollback story
- validation commands
- safe-push behavior
- explicit user approval sentence

## Validation

Planning slice:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Future fixture/dry-run slices may use targeted P13 import/export/mapping/migration readiness tests, but must remain dry-run and fixture-backed unless a later explicit approval packet authorizes apply.

## Next Phase

Next recommended phase: `P18.1-import-export-fixture-inventory`.
