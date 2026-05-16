# P23.4 Local Production Hardening Plan

Phase: `P23.4-local-production-hardening-plan`

Status: planning

## 1. Purpose

This document defines the v1.0 local production hardening plan after the P23 planning bundle was committed locally.

The purpose is to define what must be true before `codex-memory` can be treated as a hardened local HTTP MCP memory kernel on a user's machine. This plan covers startup/watchdog requirements, health checks, port/session/log expectations, SQLite backup and recovery expectations, failure semantics, operator runbook requirements, and validation gates.

This is a planning phase only.

## 2. Current Local Deployment Baseline

Current baseline:

- P22 local HTTP MCP deploy/validation evidence chain is recorded and closed.
- `/health ok`.
- live `initialize/tools/list ok`.
- public MCP tools exactly:
  - `record_memory`
  - `search_memory`
  - `memory_overview`
- `observe:http status=ok`.
- MCP/HTTP tests `12/12`.
- P23 planning, P23.1 contract inventory, P23.2 schema/versioning plan, and P23.3 validation matrix hardening are locally committed in `a3b2d77`.

This baseline proves a local HTTP MCP validation path. It does not prove production deployment, service installation, startup persistence, watchdog recovery, Codex/Claude client config switching, provider readiness, migration apply, import/export apply, or v1.0 release readiness.

## 3. What "Local Production Hardening" Means

Local production hardening means the local operator can run and recover `codex-memory` predictably on the same machine without losing auditability, privacy boundaries, or rollback options.

For v1.0, local production hardening should cover:

- explicit process ownership and startup expectations
- optional watchdog requirements
- health check and observe expectations
- port ownership and conflict handling
- MCP session handling expectations
- local log rotation and retention expectations
- SQLite backup and restore expectations
- corruption detection and recovery expectations
- restart and degraded-mode semantics
- local operator runbook requirements
- validation gates before any real activation

It does not mean a public production environment, managed cloud deploy, hosted service, external monitoring system, or automatic client config mutation.

## 4. What This Phase Explicitly Does Not Do

This phase explicitly preserves the following boundaries:

- This is not production deploy.
- This does not install watchdog/startup tasks.
- This does not modify Codex/Claude config.
- This does not run provider.
- This does not run SQLite migration apply.
- This does not run import/export apply.
- This does not mutate durable memory.
- This does not alter public MCP tools.
- This does not modify runtime code.
- This does not tag/release/deploy.
- This does not modify tests.
- This does not modify package manifests or lockfiles.
- This does not modify `.env` or secret files.
- This does not start or stop services.

## 5. Startup / Watchdog Planning

Startup/watchdog hardening should be treated as an optional, separately approved local operator capability.

Before any startup/watchdog installation, the project needs:

- explicit approval packet
- exact script or task name
- exact startup trigger
- exact service/process command
- stop and uninstall story
- log path and rotation expectations
- health check cadence
- restart throttling expectations
- failure escalation behavior
- rollback story

Startup/watchdog planning must distinguish:

- manual local start
- one-shot health ensure
- temporary local validation start
- persistent startup task
- watchdog process or scheduled task

Only planning is allowed in this phase. Installation, modification, or removal of startup/watchdog tasks remains A5-gated.

## 6. Health Check Strategy

Health checks should answer whether the local HTTP MCP surface is usable and safe to expose to local clients.

Required health evidence before local production activation:

- `/health` returns ok
- MCP `initialize` succeeds
- MCP `tools/list` succeeds
- public MCP tools remain exactly `record_memory`, `search_memory`, `memory_overview`
- `observe:http -- --json` reports `status=ok`
- MCP/HTTP tests pass
- no raw secret or raw workspace identifier exposure in summaries

Health checks should not:

- start production deploy implicitly
- mutate durable memory
- run provider calls
- apply migrations
- switch Codex/Claude config

## 7. Port Ownership and Session Limits

Local production hardening should define ownership of the HTTP MCP port and MCP session behavior.

Port expectations:

- default loopback HTTP port remains documented
- bound host remains local-first and privacy-safe
- non-loopback exposure requires explicit review
- port conflict behavior is visible to the operator
- stale process identification is documented before restart or kill actions

Session expectations:

- session header behavior remains tested
- session failures have predictable errors
- client retries do not create hidden durable writes
- observability output distinguishes healthy, degraded, and blocked states

No process termination, port takeover, or startup mutation is performed in this phase.

## 8. Log Rotation and Retention

Local hardening should define log expectations without rewriting log infrastructure in this phase.

Log requirements:

- log paths are documented
- logs remain local
- logs avoid raw secret exposure
- logs avoid raw provider keys, authorization headers, cookies, and `.env` values
- log retention has a local operator expectation
- rotation or truncation is explicit, reversible, and separately approved if it deletes data

Open planning questions:

- which logs are essential for v1.0 support
- what minimum retention window is appropriate
- whether rotation should be manual, script-assisted, or task-managed
- how to preserve audit logs separately from transient runtime logs

Hard delete or destructive cleanup remains blocked without explicit approval.

## 9. SQLite Backup and Recovery Plan

SQLite backup and recovery must be planned before any local production activation that relies on durable state.

Backup expectations:

- identify protected SQLite files
- identify related audit, vector, chunk, and diary artifacts
- define backup location
- define backup manifest shape
- include timestamp, source paths, file sizes, and checksum summary where practical
- avoid copying secrets into documentation
- prove backup exists before any migration or destructive operation

Recovery expectations:

- restore story is documented
- restore validation commands are documented
- current process is stopped or isolated before restore
- post-restore health and audit checks are defined
- rollback failure behavior is explicit

This phase does not create backups, restore backups, mutate SQLite, or run migration apply.

## 10. Corruption Detection Expectations

Local production hardening should define how corruption is detected and surfaced.

Expected signals:

- SQLite open/read errors
- migration-readiness dry-run failures
- lifecycle SQLite dry-run failures
- mapping dry-run failures
- shadow/vector/chunk inconsistency reports
- audit parse errors
- health or observe degraded status

Expected response:

- stop automatic mutation
- preserve evidence
- avoid hard delete
- run dry-run diagnostics first
- require backup before repair
- require explicit approval before destructive rollback or restore

This phase does not implement corruption detection logic.

## 11. Restart / Recovery Strategy

Restart/recovery strategy should be local, explicit, and reversible.

Required planning elements:

- when to restart
- when not to restart
- how to confirm process ownership
- how to validate post-restart health
- how to identify repeated crash loops
- how to preserve logs before restart
- how to report degraded health
- how to roll back startup/watchdog changes if installed later

Restart automation must not hide provider failures, migration failures, or schema incompatibility. Repeated restart loops should block and surface a clear operator warning.

This phase does not start, stop, restart, or install any service.

## 12. Local Operator Runbook Requirements

Before v1.0, the local operator runbook should include:

- startup mode choices
- health check commands
- observe command
- MCP contract check
- public tool freeze check
- log location and retention notes
- backup creation procedure
- restore procedure
- corruption response procedure
- port conflict response
- client config boundary warning
- provider boundary warning
- migration/import-export boundary warning
- release/tag/deploy boundary warning
- known gaps

The runbook should state exactly which actions are safe A4.8 read-only checks and which actions require A5 approval.

## 13. Security and Secret-Exposure Boundaries

Local production hardening must preserve privacy and secret boundaries.

Requirements:

- no `.env` values in docs, logs, reports, memory, or commits
- no provider keys, authorization headers, or cookies in docs or reports
- no raw `workspace_id` exposure in low-risk summaries
- no production memory snippets in release evidence
- public MCP tools remain exactly three unless separately approved
- `validate_memory` remains internal-only
- local health and observe reports remain sanitized

Validation should use diff review and targeted tests without reading or printing secret values.

## 14. Codex / Claude Client Integration Boundary

Local production hardening is related to client integration but does not perform client integration switching.

Boundaries:

- no Codex config mutation
- no Claude config mutation
- no `claude mcp add/remove`
- no automatic client switch
- no provider/model execution
- no hidden client-side durable memory activation

Client integration readiness should be handled in P23.5 after local hardening requirements are documented.

## 15. Validation Requirements

Docs-only validation for this phase:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
powershell -NoProfile -Command "Get-ChildItem docs\P23*.md | ForEach-Object { if ((Get-Content $_.FullName) -match '\s+$') { Write-Error \"Trailing whitespace in $($_.FullName)\" } }"
```

Future local production activation validation should include:

```powershell
node --test tests\mcp-contract.test.js tests\mcp-http.test.js
npm run observe:http -- --json
npm run gate:ci -- --json
npm test
```

Future backup/recovery readiness validation should include dry-run and manifest review before any apply or restore:

```powershell
npm run vcp-memory:migration-readiness -- --json
npm run vcp-memory:mapping:dry-run -- --json
npm run lifecycle:sqlite:dry-run -- --json
```

Startup/watchdog validation requires separate approval before installation or modification.

## 16. A5-Gated Actions

The following remain A5-gated:

- production deploy
- startup/watchdog installation
- Codex/Claude config switching
- provider execution
- durable memory mutation expansion
- SQLite migration apply
- import/export apply
- public MCP contract-breaking changes
- tag/release/deploy
- destructive rollback execution
- backup restore that overwrites live local state
- hard delete of logs, database files, diary files, indexes, or audit artifacts

This P23.4 phase does not approve or execute any of those actions.

## 17. Known Hardening Gaps

Known local production hardening gaps:

- startup/watchdog requirements are planned but not installed
- no startup task has been created or modified
- no watchdog task has been created or modified
- no Codex/Claude config switch has been performed
- no fresh local production activation gate has been run in this phase
- SQLite backup manifest shape is planned but not implemented here
- backup creation and restore are not performed here
- corruption detection expectations are documented but not newly implemented
- log rotation/retention expectations are planned but not automated here
- restart/recovery strategy is planned but not automated here
- production deploy remains unapproved and unperformed

These gaps do not block P23.4 planning completion. They block any claim that local production hardening has been installed or activated.

## 18. Proposed P23.5 Next Phase

Next recommended phase:

`P23.5-client-integration-readiness-plan`

P23.5 should plan Codex and Claude integration readiness while preserving the boundary that config switching, provider execution, startup/watchdog installation, production deploy, durable mutation expansion, migration/import-export apply, tag, release, and deploy remain separately approved actions.
