# P18 Backup / Rollback Safety Review

Phase: `P18.4-backup-rollback-safety-review`

Status: completed locally

## Purpose

P18.4 defines the backup, rollback, and approval requirements that must exist before any future import/export apply or migration proposal.

This phase is docs-only. It does not create backups, restore data, apply imports, export real memory, run migrations, alter SQLite, or mutate durable memory.

## Current Gate Position

P18.3 closed with result:

`DRY_RUN_EVIDENCE_READY_BLOCKED_FOR_APPLY`

That means the dry-run evidence is ready, but all apply/migration actions remain blocked.

## Backup Requirement

Any future apply/migration proposal must define, before execution:

- exact durable targets: SQLite file, diary root, audit logs, vector/chunk indexes, cache/index artifacts
- exact backup scope
- backup destination inside an approved local path
- backup naming convention with timestamp and phase id
- checksum or file-size manifest for backed-up artifacts
- verification command proving backup artifacts exist
- confirmation that `.env`, secrets, provider keys, and credentials are not copied into reports
- clear rule that backup creation itself is a mutation and requires explicit A5 approval when it touches real durable state

## Rollback Story

Any future apply/migration proposal must include:

- restore target mapping from backup artifact to durable target
- rollback manifest shape
- pre-restore validation command
- restore command or manual restore procedure
- post-restore validation commands
- expected restored state
- failure mode if restore cannot proceed
- audit note describing whether a mutation was started, completed, cancelled, or rolled back

Rollback must be traceable even if it is not automatically reversible.

## Required Future A5 Approval Packet

No future apply/migration phase may proceed without an explicit approval packet containing:

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

Ambiguous instructions such as `continue`, `go ahead`, `do it`, `自动推进`, or `直到 100%` are not approval.

## Forbidden Without A5

Still blocked:

- import/export apply
- broad real export
- real memory read preview
- SQLite migration
- `ALTER TABLE`
- real DB or memory mutation
- hard delete
- dependency or lockfile changes
- provider calls
- MCP tool/schema expansion
- release, tag, or deploy

## Minimum Future Validation Matrix

A future approved apply/migration proposal must include at least:

```powershell
node --test tests\vcp-memory-object-mapping-dry-run-cli.test.js
node --test tests\vcp-memory-migration-readiness-cli.test.js
node --test tests\p18-export-envelope-fixture.test.js
npm run vcp-memory:mapping:dry-run -- --json
npm run vcp-memory:migration-readiness -- --json
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

If approved scope touches lifecycle/SQLite-adjacent behavior, include:

```powershell
npm run lifecycle:sqlite:dry-run -- --json
```

If approved scope touches MCP contracts, include:

```powershell
node --test tests\mcp-contract.test.js
npm run gate:mainline:strict
```

Provider smoke/benchmark remains forbidden unless explicitly approved in the same A5 packet.

## P18.4 Result

Result: `BACKUP_ROLLBACK_REVIEW_READY_BLOCKED_FOR_APPLY`

P18.4 is sufficient to proceed to `P18.x-closeout-review`.

It is not sufficient to authorize apply, migration, broad real export, real memory preview, or public MCP expansion.
