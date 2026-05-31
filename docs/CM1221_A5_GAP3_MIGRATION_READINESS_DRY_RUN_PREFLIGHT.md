# CM-1221 A5-GAP-3 Migration Readiness Dry-Run Preflight

Date: 2026-05-31

Decision: `NOT_READY_BLOCKED`

Status: `PREFLIGHT_ONLY_NOT_APPROVED_NOT_READY`

## Purpose

Prepare the next exact-approved `A5-GAP-3` action for:

```text
migration_import_export_backup_restore_approval_execution_blocked
```

This preflight intentionally narrows `A5-GAP-3` to the smallest safe dry-run path: the fixture-only migration readiness report. It does not execute migration, import, export, backup, restore, real memory scan, durable write, provider call, service start, config/watchdog/startup change, public MCP expansion, push, tag, release, deploy, cutover, or `RC_READY`.

## Fresh Preflight Snapshot

Observed before this preflight document was written:

```text
branch = main
HEAD = 8c22842f770f4da8028dba8774f54dad9996c2f7
branch state = main...origin/main [ahead 14]
tracked diff = clean
untracked left untouched = CLAUDE.md, docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md
```

Current Git facts must be rechecked immediately before any approved A5 execution. If this preflight is committed first, the approval line must bind to the new fresh `HEAD`, not the snapshot above.

## Approved Target If Exact Approval Is Later Granted

Only this local command is in scope after exact approval:

```powershell
npm run vcp-memory:migration-readiness -- --json
```

Expected safety properties from the existing CLI/test contract:

```yaml
fixtureOnly: true
mutated: false
migrationBlocked: true
noMigration: true
noSQLiteWrite: true
noDiaryWrite: true
noImportExportApply: true
noRealDbMemoryWrite: true
noMcpPublicToolExpansion: true
rawWorkspaceIdExposed: false
rawSecretExposed: false
```

This target is not a real migration/import/export/backup/restore implementation and does not close real apply readiness.

## Exact Approval Line Required

Use a fresh `HEAD` after committing or otherwise stabilizing this preflight state:

```text
I approve A5-GAP-3 for codex-memory on branch main at commit <FRESH_HEAD>, action dry-run, target vcp-memory:migration-readiness fixture-only readiness report, no apply, no import, no export, no backup, no restore, no durable write.
```

Any missing `no apply`, `no import`, `no export`, `no backup`, `no restore`, or `no durable write` clause is insufficient for this packet. Any request for `apply`, `backup`, `restore`, `import`, or `export` is a different A5-GAP-3 action and needs a separate packet.

## Execution Plan After Exact Approval

1. Preflight Git state:

```powershell
git status --short --branch
git rev-parse HEAD
git log --oneline --decorate -n 10
git diff --stat
git diff --check
```

2. Verify the approval line matches:

```text
branch = main
commit = <FRESH_HEAD>
action = dry-run
target = vcp-memory:migration-readiness fixture-only readiness report
no apply/import/export/backup/restore/durable write
```

3. Execute only the dry-run readiness report:

```powershell
npm run vcp-memory:migration-readiness -- --json
```

4. Inspect and record only sanitized low-risk fields:

```text
status
fixtureOnly
mutated
migrationBlocked
missingPrerequisites
migrationBlockers
requiredApprovals
noMigration
noSQLiteWrite
noDiaryWrite
noImportExportApply
noRealDbMemoryWrite
noMcpPublicToolExpansion
rawWorkspaceIdExposed
rawSecretExposed
```

## Optional Local Validation After Execution

If the dry-run command succeeds, run the existing focused CLI contract test:

```powershell
node --test tests\vcp-memory-migration-readiness-cli.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Do not run any command with `--apply`, `--migrate`, `--confirm`, import, export, backup, restore, or durable write as part of this approved action.

## Explicitly Out Of Scope

The following remain blocked:

- real migration
- SQLite `ALTER TABLE` or migration apply
- import apply
- export apply or broad real memory export
- backup creation
- restore overwrite
- real diary/SQLite/vector/candidate-cache/recall-audit scan
- real memory preview
- durable memory write
- durable audit write
- provider/model call
- live HTTP startup
- config/watchdog/startup mutation
- public MCP expansion
- `validate_memory` public exposure
- push/tag/release/deploy
- RC cutover
- `RC_READY`

## Current Result

```text
cm1221_preflight_created=true
approval_granted=false
runtime_action_executed=false
dry_run_executed=false
apply_authorized=false
backup_authorized=false
restore_authorized=false
import_authorized=false
export_authorized=false
durable_write_authorized=false
runtime_gaps_closed=false
runtime_ready=false
rc_ready=false
decision=NOT_READY_BLOCKED
```
