# CM-1464 Real DB Migration Dry-Run Evidence

Date: 2026-06-04

## Scope

This is dry-run evidence only.

No real DB migration apply occurred.

No `--confirm` was used.

No readiness or `RC_READY` claim is made.

CM-1464 executed the existing lifecycle SQLite dry-run script against the observed durable SQLite memory DB and recorded only sanitized schema-level evidence. It did not record raw memory content, raw audit rows, a full SQLite dump, secrets/tokens, or provider payload.

## Command

Allowed dry-run command executed:

```powershell
npm run lifecycle:sqlite:dry-run -- --json
```

The previously requested `npm run lifecycle:sqlite:migrate -- --json` command was not rerun because that package script does not exist. CM-1464 retry used the existing dry-run script only.

## Sanitized Evidence

```json
{
  "script": "lifecycle:sqlite:dry-run",
  "dryRun": true,
  "mutated": false,
  "applyExecuted": false,
  "confirmUsed": false,
  "targetDbObserved": true,
  "targetDbPath": "A:\\codex-memory\\data\\codex-memory.sqlite",
  "existingLifecycleColumns": [
    "status",
    "tombstone_reason"
  ],
  "missingLifecycleColumns": [
    "status_reason",
    "supersedes_memory_id",
    "superseded_by_memory_id",
    "lifecycle_updated_at",
    "lifecycle_actor_client_id"
  ],
  "wouldAddColumns": [
    "status_reason",
    "supersedes_memory_id",
    "superseded_by_memory_id",
    "lifecycle_updated_at",
    "lifecycle_actor_client_id"
  ],
  "wouldBackfillStatus": 0,
  "mutationRequired": true,
  "rollbackRequirement": "sqlite-backup-required",
  "nextStep": "Review dry-run output, take a SQLite backup, then request an explicit future migration approval."
}
```

The CLI also emitted a Node SQLite experimental warning. That warning did not indicate apply execution or mutation.

## Boundary Receipt

CM-1464 did not use `--confirm`.

CM-1464 did not execute real DB migration apply.

CM-1464 did not edit or delete the SQLite DB.

CM-1464 did not perform a raw row scan, raw audit scan, raw JSONL dump, provider/API call, bearer-token use, live memory tool call, `record_memory`, `search_memory`, public MCP expansion, dependency/config/watchdog/startup change, release/tag/deploy, readiness claim, `RC_READY` claim, remote action, or push.

## Follow-Up

Future real lifecycle SQLite migration apply remains exact-approval / Red-boundary work. It requires the CM-1463 approval shape, a single absolute target DB path, a backup path, backup evidence, clean synced Git state, and explicit operator acknowledgement.
