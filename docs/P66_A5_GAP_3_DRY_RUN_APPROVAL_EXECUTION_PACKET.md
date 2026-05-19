# P66 A5-GAP-3 Dry-Run Approval / Execution Packet

Date: 2026-05-19

Decision: `DRAFT_NOT_APPROVED`

Result: `PACKET_PREPARED_NO_RUNTIME_ACTION`

## Purpose

Prepare the smallest safe `A5-GAP-3` path for:

```text
migration_import_export_backup_restore_approval_execution_blocked
```

This packet intentionally narrows `A5-GAP-3` to a dry-run-only, no-apply path. It does not execute migration, import, export, backup, restore, real memory scan, durable write, provider call, service start, config/watchdog/startup change, public MCP expansion, push, tag, release, deploy, cutover, or `RC_READY`.

## Current Git Target

Prepared against:

```text
branch = main
commit = 4986df4fe9a8745c98708f1d90cc62d7e96dadf5
commit_subject = docs: record p66 a5 gap6 aggregator evidence
origin/main = a9177d5 fix: tighten review patch safety semantics
local_state = ahead of origin/main
```

The branch, commit, ahead/behind state, and worktree must be rechecked immediately before any approved execution.

## Recommended Approval Line

Use this exact line to authorize only the minimal dry-run path:

```text
I approve A5-GAP-3 for codex-memory on branch main at commit 4986df4fe9a8745c98708f1d90cc62d7e96dadf5, action dry-run, target vcp-memory:migration-readiness fixture-only readiness report, no apply, no import, no export, no backup, no restore, no durable write.
```

Any missing `no apply`, `no import`, `no export`, `no backup`, `no restore`, or `no durable write` clause should be treated as insufficient for this packet. Any request for `apply`, `backup`, `restore`, `import`, or `export` is a different A5-GAP-3 action and needs a separate packet.

## Approved Target If The Line Is Accepted

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

The command uses the committed fixture-backed readiness report path. It is not a real migration/import/export/backup/restore implementation.

## Execution Plan After Exact Approval

1. Preflight Git state:

```powershell
git status -sb
git rev-parse HEAD
git log --oneline --decorate -n 8
git diff --stat
git diff --check
```

2. Verify the approval line matches:

```text
branch = main
commit = 4986df4fe9a8745c98708f1d90cc62d7e96dadf5
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

5. Record evidence in a new `A5-GAP-3` evidence document and update active status surfaces.

## Optional Local Validation After Execution

If the dry-run command succeeds, run the existing focused CLI contract test:

```powershell
node --test tests\vcp-memory-migration-readiness-cli.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Do not run any command with `--apply`, `--migrate`, or `--confirm` as part of the approved action. Existing tests already cover rejection of those flags.

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

## Fail-Closed Conditions

Stop before execution if:

- `HEAD` is not `4986df4fe9a8745c98708f1d90cc62d7e96dadf5`
- branch is not `main`
- worktree contains unrelated changes
- the approval line names anything other than `action dry-run`
- the target is not exactly `vcp-memory:migration-readiness fixture-only readiness report`
- the command would require provider access, service startup, runtime-store scan, real memory preview, durable write, config/watchdog/startup change, or public MCP expansion
- output exposes raw secret-like values or raw workspace identifiers
- output reports `mutated=true`
- output reports migration/import/export/backup/restore apply behavior

## Evidence To Produce After Approval

The evidence document should include:

```yaml
unit: A5-GAP-3
action: dry-run
target: vcp-memory:migration-readiness fixture-only readiness report
decision: NOT_READY_BLOCKED
result: DRY_RUN_EXECUTED_MIGRATION_STILL_BLOCKED
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
runtimeReady: false
finalRcMatrixReady: false
v1RcReady: false
rcReady: false
```

## Current Result

```text
packetPrepared=true
approvalGranted=false
runtimeActionExecuted=false
dryRunExecuted=false
applyAuthorized=false
backupAuthorized=false
restoreAuthorized=false
importAuthorized=false
exportAuthorized=false
durableWriteAuthorized=false
runtimeGapsClosed=false
decision=NOT_READY_BLOCKED
```
