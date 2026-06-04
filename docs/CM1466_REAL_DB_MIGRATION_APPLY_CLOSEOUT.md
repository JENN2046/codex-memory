# CM-1466 Real DB Migration Apply Closeout

Date: 2026-06-04

## Scope

CM-1466 records sanitized evidence for the exact-approved real lifecycle SQLite migration apply and closes out the untracked backup-file risk by moving the backup outside the repository.

This evidence does not claim release readiness, runtime readiness, broad memory reliability, or `RC_READY`.

Project status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.

## Authorization

Operator provided:

```text
APPROVE_REAL_DB_MIGRATION_APPLY
backup_path: A:\codex-memory\backups\codex-memory.sqlite.cm1463-before-apply.2026-06-04.bak
allowed_command: npm run lifecycle:sqlite:migrate -- --confirm --backup A:\codex-memory\backups\codex-memory.sqlite.cm1463-before-apply.2026-06-04.bak
```

## Apply Summary

Sanitized apply result:

```json
{
  "applyExecuted": true,
  "status": "ok",
  "mutated": true,
  "backupCreated": true,
  "totalRecords": 467,
  "addedColumns": [
    "status_reason",
    "supersedes_memory_id",
    "superseded_by_memory_id",
    "lifecycle_updated_at",
    "lifecycle_actor_client_id"
  ],
  "backfilledStatus": 0,
  "migrationRequired": false,
  "rollbackAvailable": true,
  "readinessClaimed": false,
  "rcReadyClaimed": false
}
```

No raw memory rows, raw audit rows, raw JSONL, full SQLite dump, provider payload, bearer token, or secret material was recorded.

## Backup Location

The backup was initially created at the authorized path inside the repository:

```text
A:\codex-memory\backups\codex-memory.sqlite.cm1463-before-apply.2026-06-04.bak
```

To avoid leaving a real DB copy under the repository tree, CM-1466 moved it to:

```text
A:\codex-memory-backups\codex-memory.sqlite.cm1463-before-apply.2026-06-04.bak
```

Sanitized backup evidence:

```text
size_bytes: 42725376
sha256: FEE15BE4B4995F2B698750B319B77D54D967D9FD90EEAF08BC6E880C2B199C86
```

The backup file is not committed.

## Post-Apply Dry-Run

Post-apply dry-run evidence:

```json
{
  "status": "ok",
  "mutated": false,
  "totalRecords": 467,
  "existingLifecycleColumns": [
    "status",
    "status_reason",
    "supersedes_memory_id",
    "superseded_by_memory_id",
    "tombstone_reason",
    "lifecycle_updated_at",
    "lifecycle_actor_client_id"
  ],
  "missingLifecycleColumns": [],
  "wouldAddColumns": [],
  "wouldBackfillStatus": 0,
  "mutationRequired": false,
  "riskLevel": "A1",
  "rollbackRequirement": "none"
}
```

## Boundary Receipt

CM-1466 did not commit the backup.

CM-1466 did not perform a raw row scan, raw audit scan, raw JSONL dump, provider/API call, bearer-token use, live memory tool call, public MCP expansion, dependency/config/watchdog/startup change, release/tag/deploy, readiness claim, `RC_READY` claim, remote action, or push.

## Remaining Status

The real lifecycle SQLite migration apply is completed and validated at schema level.

This does not make the project release-ready or `RC_READY`.
