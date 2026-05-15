# P20.3 Rollback / Backup Operations Plan

Phase: `P20.3-rollback-backup-operations-plan`

Status: planning

## Purpose

Define rollback and backup requirements for future local production hardening operations before any real operation is approved.

This phase is docs-only. It does not create backups, restore backups, edit Codex or Claude configuration, install startup tasks, install watchdog tasks, start services, call providers, read real memory content, write durable memory, run migrations, or apply import/export behavior.

## Scope

P20.3 covers local production hardening surfaces:

- HTTP MCP runtime configuration and health evidence.
- Startup and watchdog scheduled task / HKCU Run plans.
- Codex and Claude local MCP configuration rollback planning.
- Durable local memory state that must be protected before any future apply or migration.
- Operator validation commands after any future approved operation.

P20.3 does not authorize any of those operations.

## Protected Assets

Any future A5 operation must list exact local targets before execution.

| Asset | Why it matters | Backup / rollback requirement |
|---|---|---|
| Codex config | Determines which MCP endpoint Codex uses. | Must be backed up before any edit; rollback must restore the exact previous config block. |
| Claude config | Determines Claude Code MCP routing. | Must be backed up before any edit; rollback must restore the exact previous config block. |
| HTTP MCP startup task | Can make local runtime persistent across login. | Must record task name, action, arguments, trigger, and removal command before install/update. |
| Watchdog startup task | Can create long-running hidden recovery behavior. | Must record task name, action, arguments, trigger, log path, and removal command before install/update. |
| HKCU Run fallback | Mutates user startup registry state. | Must record previous value, new value, and restore/delete command before any write. |
| SQLite shadow store | Durable memory metadata and lifecycle state. | Must have explicit backup path, manifest, and restore mapping before any mutation or migration. |
| Diary root | Human-readable memory source material. | Must have explicit backup path, manifest, and restore mapping before any rewrite or import/export apply. |
| Audit / recall logs | Operational traceability. | Must be preserved or intentionally snapshotted before any operation that changes durable state. |
| Vector / chunk / cache artifacts | Rebuildable but operationally relevant indexes. | Must identify whether they are backed up, rebuilt, or explicitly excluded with rationale. |

## Read-Only Planning Surfaces

The following can be used for planning when explicitly scoped and when their live-state exposure is acceptable:

```powershell
npm run gate:ci -- --json
npm run rollback:mainline:plan -- --json
```

The following are read-only but live-runtime adjacent and should be scoped deliberately:

```powershell
npm run observe:http -- --json
npm run profile-health
npm run rollback:mainline:plan -- --json
```

The following may start processes or mutate user startup state and are not P20.3 commands:

```powershell
npm run start:http
npm run start:http:ensure
npm run start:http:watchdog:once
npm run start:http:watchdog:ensure
npm run start:http:install-task
npm run start:http:watchdog:install
```

## Future Backup Manifest Shape

Any future approved backup operation should produce a manifest with at least:

```json
{
  "phase": "P20.x-approved-operation",
  "createdAt": "<ISO-8601>",
  "mutated": false,
  "backupRoot": "<approved-local-path>",
  "operator": "manual-approved",
  "assets": [
    {
      "kind": "codex-config",
      "sourcePath": "<path>",
      "backupPath": "<path>",
      "exists": true,
      "sizeBytes": 0,
      "sha256": "<optional-or-required-by-phase>",
      "restoreTarget": "<path>"
    }
  ],
  "excludedAssets": [
    {
      "kind": "provider-secrets",
      "reason": "secrets must not be copied into reports"
    }
  ],
  "validation": {
    "manifestChecked": true,
    "secretScanPassed": true,
    "restorePlanPresent": true
  }
}
```

The manifest itself must not include secret values, raw provider keys, auth cookies, bearer tokens, raw `.env` contents, or broad real memory content.

## Rollback Story Requirements

Any future approved operation must define:

- exact rollback trigger conditions
- exact restore targets
- restore command or manual restore procedure
- task removal command for startup/watchdog installs
- HKCU Run restore/delete command for registry fallback writes
- Codex / Claude config restore steps
- post-rollback health/readiness validation
- failure handling when rollback cannot be completed
- audit note describing whether the original operation was started, completed, cancelled, or rolled back

Rollback must be traceable even when fully automatic rollback is not available.

## Approval Packet Required Before Real Operations

Any future operation that creates backups, restores backups, edits config, installs startup/watchdog entries, starts long-running processes, mutates durable memory, applies import/export, or runs migration requires an explicit A5 approval packet with:

- exact phase name
- exact target capability
- allowed files and paths
- forbidden files and paths
- exact mutation scope
- backup requirement
- rollback story
- validation commands
- stop conditions
- safe-push behavior
- explicit user approval sentence

Ambiguous instructions such as `continue`, `go ahead`, `do it`, `自动推进`, or `直到 100%` are not approval.

## Minimum Future Validation Matrix

For startup / watchdog install planning:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
npm run gate:ci -- --json
```

For live HTTP runtime validation after explicit approval:

```powershell
npm run observe:http -- --json
npm run gate:mainline
```

For config rollback planning after explicit approval to inspect config:

```powershell
npm run rollback:mainline:plan -- --json
```

For durable memory / migration-adjacent operations after explicit approval:

```powershell
npm run lifecycle:sqlite:dry-run -- --json
npm run vcp-memory:mapping:dry-run -- --json
npm run vcp-memory:migration-readiness -- --json
npm test
```

Provider smoke / benchmark remains forbidden unless explicitly approved with provider scope.

## Hard Stops

P20.3 keeps these blocked:

- backup creation
- restore from backup
- Codex config edit
- Claude config edit
- scheduled task install/update/delete
- HKCU Run edit
- service or watchdog start
- provider smoke / benchmark
- real memory read preview
- durable DB / diary / vector mutation
- SQLite migration or `ALTER TABLE`
- import/export apply
- dependency or lockfile change
- MCP schema/tool expansion
- release, tag, or deploy

## P20.3 Result

Result: `ROLLBACK_BACKUP_OPERATIONS_PLANNED_BLOCKED_FOR_APPLY`

P20.3 is sufficient to proceed to `P20.4-local-production-safety-checklist`.

It is not sufficient to authorize backup creation, restore, config edits, startup/watchdog installation, service start, migration, import/export apply, provider calls, or release candidate work.
