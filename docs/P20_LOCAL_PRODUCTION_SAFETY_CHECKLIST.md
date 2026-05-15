# P20.4 Local Production Safety Checklist

Phase: `P20.4-local-production-safety-checklist`

Status: checklist

## Purpose

Provide a local operator checklist for future production-hardening work before any real startup, watchdog, config, backup, restore, migration, import/export, provider, or durable-memory operation is attempted.

This phase is docs-only. It does not run HTTP MCP, start watchdogs, install scheduled tasks, edit HKCU Run, edit Codex or Claude configuration, create backups, restore backups, call providers, read real memory content, write durable memory, run migrations, or apply import/export behavior.

## Checklist Result

P20.4 produces a safety checklist, not operational approval.

Result: `LOCAL_PRODUCTION_SAFETY_CHECKLIST_READY_BLOCKED_FOR_APPLY`

Future local production operations remain blocked until a separate explicit A5 approval packet names the exact operation, target paths, rollback story, backup requirement, validation commands, and stop conditions.

## Preflight Checklist

Before any future approved local production operation, the operator must confirm:

| Check | Required evidence | Stop if missing |
|---|---|---|
| Repository baseline | `git status --short --branch` is understood and intended. | yes |
| Phase scope | Exact phase name and target capability are written down. | yes |
| Allowed targets | Exact files, config paths, task names, or data paths are listed. | yes |
| Forbidden targets | Secrets, `.env`, package files, MCP schema/tools, and unrelated runtime state are excluded. | yes |
| Validation route | Commands are listed before execution. | yes |
| Backup story | Required backups are named, or the phase explicitly explains why no backup is needed. | yes |
| Rollback story | Restore/removal steps are present and testable enough for the operation risk. | yes |
| Secret policy | Reports and manifests avoid raw keys, tokens, cookies, passwords, and `.env` contents. | yes |
| Provider policy | Provider smoke/benchmark scope is explicitly approved or not run. | yes |
| Real-memory policy | Real memory read/write scope is explicitly approved or not performed. | yes |
| Migration policy | Migration/apply/cleanup is explicitly approved or not performed. | yes |
| Public MCP boundary | Public tools remain `record_memory`, `search_memory`, and `memory_overview` unless a dedicated approved phase says otherwise. | yes |

## Safe Evidence First

Prefer these before any live local-production action:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
npm run gate:ci -- --json
```

Use live-adjacent read-only checks only when explicitly scoped:

```powershell
npm run observe:http -- --json
npm run rollback:mainline:plan -- --json
npm run profile-health
```

Do not treat live-adjacent checks as permission to start services, install watchdogs, mutate config, or touch durable memory.

## Startup / Watchdog Safety Checklist

Future startup or watchdog work must answer:

| Question | Required answer |
|---|---|
| Which command will run? | Exact npm script or PowerShell script. |
| Can it start a process? | `yes` / `no`, with process name and expected lifetime. |
| Can it write logs? | `yes` / `no`, with log path. |
| Can it install scheduled tasks? | `yes` / `no`, with task name. |
| Can it edit HKCU Run? | `yes` / `no`, with value name. |
| How is it removed? | Exact uninstall, delete, or restore step. |
| How is health checked? | Exact command and expected healthy output. |
| What blocks execution? | Dirty worktree, missing rollback, missing approval, unexpected config target, or failed gate. |

The following remain blocked without explicit approval:

```powershell
npm run start:http
npm run start:http:ensure
npm run start:http:watchdog:once
npm run start:http:watchdog:ensure
npm run start:http:install-task
npm run start:http:watchdog:install
```

## Config Safety Checklist

Before any future Codex or Claude config edit:

- exact config path must be named
- previous file content must be restorable without printing secrets
- intended MCP endpoint must be named
- rollback target must be named
- low-risk diff review must be possible
- post-change validation must be listed
- config edit must not expand public MCP tools by accident

If the phase cannot avoid printing secret-like content, stop and redesign the evidence path.

## Durable Memory Safety Checklist

Before any future operation touching SQLite, diary, audit logs, vector/chunk/cache artifacts, import/export files, or migration state:

- backup requirement must be explicit
- restore mapping must be explicit
- `mutated=false` dry-run evidence must exist first
- migration readiness must remain blocked until approved
- raw memory content must not appear in low-risk summaries
- raw `workspace_id` must not appear in low-risk summaries
- provider calls must not be hidden inside validation
- reports must distinguish fixture, dry-run, and live data

Recommended dry-run evidence, when explicitly scoped:

```powershell
npm run lifecycle:sqlite:dry-run -- --json
npm run vcp-memory:mapping:dry-run -- --json
npm run vcp-memory:migration-readiness -- --json
```

These commands are not permission to apply migration, import, export, cleanup, or restore.

## Warning Signals

Stop immediately if any of these appear:

- a command wants `--confirm`, `--apply`, `--migrate`, `--install`, or equivalent
- a command may start a hidden or long-running process without approval
- a command may write scheduled tasks or HKCU Run
- a command may edit Codex or Claude config
- a command may read or print raw secrets
- a command may read or print broad real memory content
- a command may write SQLite, diary, audit, vector, chunk, cache, or backup data
- a command may call external providers
- a command changes `package.json`, lockfiles, MCP schema, or public tools
- worktree contains unrelated or unexplained user-owned changes
- validation fails and the fix would expand scope
- remote branch state is stale before push

## Approval Packet Checklist

Any future A5 operation must include:

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

Ambiguous phrases such as `continue`, `go ahead`, `do it`, `自动推进`, or `直到 100%` are not approval.

## Validation

Docs-only checklist validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Boundary Confirmation

P20.4 does not:

- change `src/`
- add or modify tests / fixtures
- change `package.json` or lockfiles
- change MCP schema or public tools
- start HTTP MCP
- start watchdog
- install scheduled tasks
- edit HKCU Run
- edit Codex or Claude configuration
- call providers
- read real memory content
- write durable DB / memory / diary data
- run SQLite migration or `ALTER TABLE`
- apply import/export
- create backup or restore backup
- tag, release, or deploy

## Next Recommended Phase

`P20.x-local-production-hardening-closeout-review`
