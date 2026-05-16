# P23.6 Migration Import-Export Readiness Plan

Phase: `P23.6-migration-import-export-readiness-plan`

Status: planning

## 1. Purpose

This document defines the v1.0 migration/import-export readiness plan after P23.5 client integration readiness was committed locally.

The purpose is to define what must be true before any real SQLite migration apply, import/export apply, durable data rewrite, or broad memory transfer can occur. This plan keeps migration and import/export readiness dry-run-first, scoped, auditable, reversible, and privacy-safe.

This is a planning phase only.

## 2. Current Migration / Import-Export Baseline

Current baseline:

- P13 object model, mapping, import/export shape, and migration-readiness work provide prior fixture and dry-run evidence.
- P18 import/export/migration safety planning provides the safety route and approval boundaries.
- P23.2 schema/versioning plan defines version identifiers, compatibility policy, migration boundary, import/export boundary, and rollback requirements.
- P23.3 validation matrix hardening defines migration/import-export dry-run validation as release-blocking before v1.0.
- P23.5 client readiness defines client identity, private/shared/project memory boundaries, and cross-client proposal expectations.

Current default stance:

- migration planning is allowed
- import/export planning is allowed
- dry-run validation is allowed
- SQLite migration apply is blocked
- import/export apply is blocked
- durable data rewrite is blocked
- broad real memory export is blocked unless explicitly approved

## 3. What Migration Readiness Means

Migration readiness means the project can explain and validate a migration or import/export action before it mutates local durable memory.

Readiness requires:

- versioned source and target schema expectations
- dry-run report before apply
- manifest before apply
- checksum or integrity evidence
- backup and restore story
- scoped import/export boundaries
- client visibility preservation
- audit trail expectations
- partial failure semantics
- rollback and recovery expectations
- explicit approval packet for apply

Readiness does not mean migration apply has been run.

## 4. What This Phase Explicitly Does Not Do

This phase explicitly preserves the following boundaries:

- This does not run SQLite migration apply.
- This does not run import/export apply.
- This does not mutate durable memory.
- This does not rewrite existing records.
- This does not modify runtime code.
- This does not modify tests.
- This does not alter public MCP tools.
- This does not modify `.env`.
- This does not modify Codex/Claude config.
- This does not run provider.
- This does not install watchdog/startup task.
- This does not perform production deploy.
- This does not tag/release/deploy.
- This does not create backup archives.
- This does not restore backup archives.

## 5. Export Readiness Model

Export readiness should define how memories can be exported without leaking secrets, violating scope, or losing auditability.

Export readiness requirements:

- export envelope version
- source schema version
- source workspace/project/client scope summary
- record counts by type and lifecycle status
- private/shared/project visibility breakdown
- redaction status
- audit reference strategy
- checksum summary
- manifest path and format
- dry-run report path and format
- operator approval status

Export boundaries:

- broad real memory export remains A5-gated
- export must not include raw secrets
- export must not expose raw sensitive workspace identifiers in low-risk summaries
- private memories must remain marked private
- shared memories must remain intentionally shared
- project-scoped memories must preserve project/workspace boundaries

## 6. Import Readiness Model

Import readiness should define how external or previously exported memories can be reviewed before local durable mutation.

Import readiness requirements:

- import envelope version
- source schema version
- target schema version
- source identity and provenance
- record count summary
- lifecycle status summary
- visibility/scope compatibility summary
- conflict report
- duplicate/supersession candidate report
- redaction and forbidden-field review
- checksum verification
- dry-run plan
- rollback plan

Import boundaries:

- import apply remains A5-gated
- imported private memories must not leak cross-client
- imported shared memories require explicit shared classification
- imported project memories require matching or mapped project/workspace scope
- imports must not silently activate proposal or rejected records

## 7. Manifest Requirements

Every migration, import, or export apply proposal should include a manifest.

Minimum manifest fields:

- manifest version
- operation type: migration, import, export, or restore
- source schema version
- target schema version
- source paths or source identifiers
- target paths or target identifiers
- record counts
- chunk/vector/audit reference counts
- lifecycle status counts
- visibility and scope summary
- redaction summary
- checksum summary
- dry-run report reference
- backup reference, when apply is proposed
- rollback reference
- approval status
- operator and timestamp metadata

The manifest must not contain raw secrets, provider keys, authorization headers, cookies, `.env` values, or raw sensitive workspace identifiers in low-risk summaries.

## 8. Checksum and Integrity Requirements

Checksum and integrity checks should help prove that migration/import/export operations are complete, bounded, and reversible.

Expected integrity evidence:

- deterministic checksum where practical
- source file checksum summary
- target file checksum summary after apply, when approved
- record count comparison
- audit reference comparison
- chunk/vector reference comparison
- manifest checksum
- dry-run report checksum or stable identifier

Integrity failures should block apply until reviewed.

Checksum evidence must not require exposing raw memory content in low-risk reports.

## 9. Scope Isolation Rules

Scope isolation is required to prevent cross-client visibility leaks.

Scope rules:

- Codex private memory remains Codex-private
- Claude private memory remains Claude-private
- shared memory remains explicitly shared
- project memory remains project-scoped
- workspace memory remains workspace-scoped
- task or conversation memory remains bounded to its declared scope
- unknown scope maps to conservative handling
- missing scope requires safe fallback or explicit operator review

Migration/import/export dry-run reports should flag:

- unknown client ids
- missing workspace/project scope
- private-to-shared promotion attempts
- shared-to-private ambiguity
- lifecycle status incompatibility
- proposal/rejected/tombstone activation risk

No cross-client visibility promotion is allowed silently.

## 10. Audit Requirements

Migration/import/export readiness must preserve traceability.

Audit expectations:

- dry-run report creation is recorded or referenced
- proposed apply has a manifest and approval packet
- apply, if separately approved, records operation id
- each changed durable record has traceable source or migration reference
- rejected or skipped records are listed in summary
- conflicts and duplicates are summarized
- rollback path is linked
- post-apply validation evidence is recorded

This phase does not write audit logs or durable audit events.

## 11. Dry-Run First Policy

Dry-run is mandatory before any apply.

Dry-run requirements:

- `mutated=false`
- no durable record writes
- no SQLite `ALTER TABLE`
- no import apply
- no export apply
- no cleanup apply
- no provider calls
- no config mutation
- no public MCP tool expansion
- clear blockers and warnings

Expected dry-run commands for future readiness:

```powershell
npm run vcp-memory:migration-readiness -- --json
npm run vcp-memory:mapping:dry-run -- --json
npm run lifecycle:sqlite:dry-run -- --json
```

Additional import/export dry-run commands may be added in a future approved implementation phase. This planning phase does not add or run new tools.

## 12. Backup and Restore Expectations

Backup and restore expectations must exist before any apply.

Backup expectations:

- identify SQLite database files
- identify diary files
- identify audit logs
- identify vector/chunk/index artifacts
- identify manifest and report location
- include timestamp and checksum summary
- keep backup local unless explicitly approved otherwise
- avoid raw secret exposure in backup metadata

Restore expectations:

- stop or isolate local service before restore
- verify backup manifest
- restore only approved target files
- validate post-restore health
- validate audit/read surfaces
- preserve failed restore evidence
- stop if restore target is ambiguous

This phase does not create or restore backups.

## 13. Partial Failure and Rollback Semantics

Partial failure semantics should prevent silent corruption or half-applied durable state.

Expected behavior for future apply:

- fail before mutation if backup is missing
- fail before mutation if manifest is invalid
- fail before mutation if checksum verification fails
- fail before mutation if scope leak is detected
- record skipped records separately from failed records
- preserve source records unless destructive action is explicitly approved
- return a blocked status when rollback cannot be described

Rollback expectations:

- restore from verified backup
- validate restored health
- validate public MCP contract
- validate audit/read consistency
- record rollback result

Destructive rollback execution remains A5-gated.

## 14. Durable Memory Mutation Boundary

Durable memory mutation remains tightly bounded.

This plan does not authorize:

- existing record rewrite
- new durable import writes
- SQLite migration apply
- lifecycle status rewrite
- cross-client visibility promotion
- tombstone or supersession apply
- backup restore that overwrites live state
- cleanup apply

Any future mutation requires explicit approval, backup, manifest, rollback story, and validation matrix.

## 15. Validation Requirements

Docs-only validation for this phase:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
powershell -NoProfile -Command "Get-ChildItem docs\P23*.md | ForEach-Object { if ((Get-Content $_.FullName) -match '\s+$') { Write-Error \"Trailing whitespace in $($_.FullName)\" } }"
```

Future migration/import-export readiness validation should include:

```powershell
npm run vcp-memory:migration-readiness -- --json
npm run vcp-memory:mapping:dry-run -- --json
npm run lifecycle:sqlite:dry-run -- --json
npm run gate:ci -- --json
npm test
```

Future apply validation, if separately approved, must include:

- pre-apply backup verification
- manifest verification
- dry-run report review
- post-apply health validation
- post-apply audit/read validation
- rollback validation

## 16. A5-Gated Actions

The following remain A5-gated:

- SQLite migration apply
- import/export apply
- durable data rewrite
- durable memory mutation expansion
- provider execution
- Codex/Claude config switching
- startup/watchdog installation
- production deploy
- public MCP contract-breaking changes
- destructive rollback execution
- tag/release/deploy
- broad real memory export
- backup restore that overwrites live local state
- hard delete of logs, database files, diary files, indexes, or audit artifacts

This P23.6 phase does not approve or execute any of those actions.

## 17. Known Migration / Import-Export Gaps

Known gaps:

- migration/import-export apply is not approved
- durable data rewrite is not approved
- real memory export is not performed
- real memory import is not performed
- backup creation is not performed
- restore is not performed
- import/export apply CLI is not implemented here
- automated manifest validation is not implemented here
- checksum enforcement is planned but not newly implemented here
- cross-client import conflict resolution is planned but not newly implemented here
- no provider execution is performed
- no production deploy is performed

These gaps do not block P23.6 planning completion. They block any claim that real migration, import, export, backup restore, or durable data rewrite has been activated.

## 18. Proposed P23.7 Next Phase

Next recommended phase:

`P23.7-v1.0-release-candidate-checklist`

P23.7 should consolidate the v1.0 release-candidate checklist while preserving that tag, release, deploy, production activation, provider execution, config switching, startup/watchdog installation, migration/import-export apply, durable data rewrite, public MCP expansion, and destructive rollback execution remain separately approved actions.
