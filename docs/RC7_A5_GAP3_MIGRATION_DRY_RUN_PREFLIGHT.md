# RC-7 A5-GAP-3 Migration Dry-Run Preflight

Phase: `RC-7`

Mode: `A5-GAP-3 preflight packet only`

Risk: `A5-preflight`

Decision: `DRAFT_NOT_APPROVED`

## Purpose

Prepare the smallest fresh-head `A5-GAP-3` approval boundary for migration/import/export/backup/restore gap evidence.

This packet narrows `A5-GAP-3` to the existing fixture-only migration readiness dry-run report. It does not execute migration, import, export, backup, restore, real memory scan, durable write, provider call, service startup, config/watchdog/startup change, public MCP expansion, push, tag, release, deploy, cutover, or `RC_READY`.

## Current Git Reality

At packet creation time:

```text
branch = main
local HEAD = 834896cf7842e36a421f4727395b7d7cd734ce09
origin/main = fe39bdc chore: align current facts to pushed head
ahead = 9 local commits
worktree = clean
diff = empty
```

Exact branch, commit, ahead/behind state, and worktree cleanliness must be rechecked immediately before any approved `A5-GAP-3` execution.

## Existing Evidence Assessment

Existing `A5-GAP-3` dry-run evidence is useful background, but it is bound to an older commit:

- `P66_A5_GAP_3_DRY_RUN_EVIDENCE.md` is bound to commit `d3e87c7fe9f2f37c1659c815d874e8550dff4a32`.

That record established fixture-only dry-run behavior and `migrationBlocked=true` historically. It does not by itself provide current-head evidence for `834896cf7842e36a421f4727395b7d7cd734ce09`.

## Requested Boundary

Requested unit:

```text
A5-GAP-3
```

Requested action:

```text
dry-run
```

Requested target:

```text
vcp-memory:migration-readiness fixture-only readiness report
```

Only this command is in scope after exact approval:

```powershell
npm run vcp-memory:migration-readiness -- --json
```

Expected safety fields from the existing CLI/test contract:

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

## Existing CLI Boundary

The CLI implementation at `src/cli/vcp-memory-migration-readiness.js`:

- reads only the committed fixture by default
- rejects `--apply`
- rejects `--migrate`
- rejects `--confirm`
- reports `mutated=false`
- reports `migrationBlocked=true` when the fixture is blocked
- does not implement import/export/backup/restore apply behavior

The focused test `tests/vcp-memory-migration-readiness-cli.test.js` covers JSON output, no mutation, fixture-only behavior, missing approvals, no real migration/write flags, secret/workspace redaction, rejected apply/migrate flags, and fixture no-side-effect behavior.

## Exact Approval Line

After this packet is committed, use the fresh post-packet `HEAD` in the approval line:

```text
I approve A5-GAP-3 for codex-memory on branch main at commit <POST_PACKET_COMMIT>, action dry-run, target vcp-memory:migration-readiness fixture-only readiness report, no apply, no import, no export, no backup, no restore, no durable write.
```

Any broader wording is insufficient. Any reused stale commit is insufficient.

## Stop Conditions

Stop before execution if:

- branch is not `main`
- current `HEAD` does not match the approval line
- worktree is not clean except for intended docs/board preflight edits before commit
- the approval line names anything other than `action dry-run`
- the target is not exactly `vcp-memory:migration-readiness fixture-only readiness report`
- the command would require provider access, service startup, runtime-store scan, real memory preview, durable write, config/watchdog/startup change, public MCP expansion, or remote action
- output exposes raw secret-like values or raw workspace identifiers
- output reports `mutated=true`
- output reports migration/import/export/backup/restore apply behavior

## Readiness Boundary

Even if the future approved dry-run passes, it will not by itself claim:

- real migration readiness
- import/export readiness
- backup/restore readiness
- production readiness
- runtime readiness
- final RC readiness
- v1.0 RC readiness
- cutover readiness
- durable writer readiness
- `RC_READY`
