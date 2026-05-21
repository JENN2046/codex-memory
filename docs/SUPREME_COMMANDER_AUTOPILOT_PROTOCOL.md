# Supreme Commander Autopilot Protocol

Updated: 2026-05-21

## Purpose

The Supreme Commander protocol is the top-level project-operator pattern for `codex-memory`.

It lets one controlling session keep the project moving through safe, validated work by selecting the next task, assigning bounded work, validating results, recording receipts, and stopping at hard boundaries.

It is not a daemon, background service, release mode, production authority, remote-write permission, or A5 bypass.

Default project startup, resume, and Autopilot Rule Intake use [Smart Standing Authorization v3 - Budgeted Autonomy Envelope](/A:/codex-memory/docs/STANDING_OWNER_SMART_AUTHORIZATION_V3.md): Green work runs directly, Amber work may run continuously inside exact budgets with receipts, and Red work stops for explicit user approval.

A4.8 is retained only as the legacy local-safe rail and Green Lane substrate under v3. It supplies local planning, validation, board, guarded commit, push-readiness, and safe-push mechanics, but it is no longer the top-level default authority model.

## Authority

This protocol is below:

1. safety and hard-stop gates
2. the current explicit user instruction
3. current repository reality and observed command output
4. source behavior
5. `AGENTS.md`
6. the A4.8 legacy local-safe rail as v3 Green Lane substrate

If this protocol conflicts with those sources, this protocol loses.

## Role Definition

`Supreme Commander` is not a fifth worker.

It is the Commander operating under Smart Standing Authorization v3 with explicit responsibility for the whole local execution loop. A4.8 mechanics may be used as the Green Lane substrate:

- read Git, docs, source, tests, scripts, and `.agent_board`
- reconcile stale board or status claims against repository reality
- select the next safe local task from the active queue
- write task contracts before using Worker roles
- define allowed files, disallowed files, validation, and stop conditions
- maintain file locks and risk records when parallel work is used
- integrate Worker output serially
- request or run read-only verification
- run validation selected from the project validation matrix
- update `.agent_board`
- record receipts after meaningful Amber external/write actions
- create guarded local commits only when all commit conditions pass
- prepare Red approval packets instead of executing Red work

## Operating Loop

1. Reality check: inspect `git status -sb`, current branch, recent log, active status docs, and relevant source/tests.
2. Queue selection: choose the highest-priority safe local task whose scope is clear.
3. Contract: record the task, file scope, validation, and stop conditions.
4. Execution: implement locally or assign bounded Worker tasks with non-overlapping write scopes.
5. Validation: run targeted validation first, then broader gates when risk requires them.
6. Verification: perform a read-only review of diff scope, hard stops, secrets/dependencies, and board freshness.
7. Board update: record status, validation, changed files, remaining risks, and next safe action.
8. Receipt: after meaningful Amber external/write action, record budget use, validation, rollback/cleanup, next step, and stop reason.
9. Commit readiness: create a guarded local commit only when all guarded commit conditions pass.
10. Continue or stop: continue only while the next step remains Green or in-envelope Amber; stop at Red.

## Stop Conditions

The Supreme Commander must stop and request explicit approval before Red actions:

- provider or external model calls outside the v3 envelope
- broad real memory content scan, preview, export, import, or migration
- broad durable memory, audit, diary, SQLite, vector, candidate, or recall-store mutation
- migration/import/export/backup/restore apply
- public MCP tool or schema expansion
- service/watchdog/startup install or config switch
- `.env`, secret, credential, or dependency changes
- tag, release, deploy, production action, or remote write without explicit authorization
- destructive commands or history rewrite
- stale branch merge/rebase/cherry-pick
- user-owned uncommitted work overwrite
- readiness, cutover, or `RC_READY` claim without complete runtime evidence

Exact `search_memory`, `memory_overview`, sanitized `record_memory`, provider probes, runtime probes, external reads, and small dependency actions may be Amber only when they fit the v3 envelope, stay within budget, have exact scope, and leave receipts.

## Default Output

For sustained work, the Supreme Commander keeps these surfaces current:

- `.agent_board/TASK_QUEUE.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/CHECKPOINT.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/VALIDATION_LOG.md`
- `.agent_board/BLOCKERS.md`
- `.agent_board/DECISIONS.md`
- `.agent_board/FILE_LOCKS.md`
- `.agent_board/RISK_REGISTER.md`

## Implementation Boundary

Current implementation is protocol-level and local:

- no background runner
- no scheduler
- no remote automation
- no service startup
- no runtime data access
- no provider call
- no public MCP expansion
- no config/watchdog/cutover action

Future automation, if desired, must start as a dry-run planner that prints the selected next task and stop boundary without mutating runtime state.
