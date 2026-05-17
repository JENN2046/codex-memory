# P58 Migration Import-Export Backup-Restore Approval Boundary

P58-T1 defines the local boundary inventory for a future approval framework around migration, import/export, backup, and restore operations. It is not an execution framework and does not authorize any real data operation.

## Purpose

The future framework must require explicit approval evidence before any migration, import/export, backup, or restore operation can be considered. P58-T1 records the required approval stages, source type limits, evidence requirements, fail-closed states, blocked actions, and readiness boundaries.

## Allowed Inputs

P58-T1 only accepts planning evidence from:

- synthetic fixture
- sanitized metadata

Denied inputs include:

- real memory content
- real diary data
- real SQLite rows
- real vector index data
- real candidate cache data
- real recall audit data
- provider output
- operator free text containing secrets, URLs, absolute paths, headers, tokens, or passwords

## Boundary

P58-T1 is:

- fixture-only
- synthetic
- local-only
- boundary-inventory-only
- dry-run-only
- not runtime integrated
- not an approval executor
- not migration/import/export/backup/restore readiness

It must not:

- read, preview, export, import, or scan real memory
- scan diary, SQLite, vector index, candidate cache, or recall audit data
- apply SQLite migration
- apply import/export
- create backup
- restore data
- execute approval
- write durable memory or audit records
- call providers
- start services
- change config, dependencies, secrets, or environment files
- expand public MCP tools
- push, tag, release, or deploy

## Fail-Closed Semantics

The future framework must deny or hard-stop when approval metadata is missing, unknown, stale, duplicate, ambiguous, unparsable, unsupported, warning-only, expired, scope-mismatched, rollback-not-ready, backup-unverified, restore-unverified, or requests real data/apply execution.

Approval review, dry-run evidence, parity evidence, rollback readiness, backup planning, and restore planning are planning evidence only. They do not grant execution authority. Any future execution still needs a separate explicit A5 authorization packet and post-action validation plan.

## Future Required Evidence

Future execution remains blocked until all required approval evidence exists and is executed under separately authorized A5 boundaries:

- source scope evidence
- actor scope evidence
- operation plan
- dry-run report
- parity report
- rollback readiness report
- backup plan
- restore plan
- redaction report
- no-real-data-access report
- explicit A5 authorization packet
- post-action validation plan
- failure path plan

## Current Decision

Decision: `NOT_READY_BLOCKED`.

P58-T1 may support planning only. It must not be represented as migration readiness, import/export readiness, backup/restore readiness, runtime readiness, final RC readiness, or v1.0 RC readiness.
