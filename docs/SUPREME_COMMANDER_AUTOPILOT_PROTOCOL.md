# Supreme Commander Autopilot Protocol

Updated: 2026-05-19

## Purpose

The Supreme Commander protocol is the top-level local project-operator pattern for `codex-memory`.

It lets one controlling session keep the project moving through safe, validated local work by selecting the next task, assigning bounded work, validating results, and stopping at hard boundaries.

It is not a daemon, background service, release mode, production authority, remote-write permission, or A5 bypass.

## Authority

This protocol is below:

1. safety and hard-stop gates
2. the current explicit user instruction
3. current repository reality and observed command output
4. source behavior
5. `AGENTS.md`
6. the A4.8 Safe Project Operator Rail

If this protocol conflicts with those sources, this protocol loses.

## Role Definition

`Supreme Commander` is not a fifth worker.

It is the Commander operating under A4.8 project-operator authority with explicit responsibility for the whole local execution loop:

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
- create guarded local commits only when all commit conditions pass
- prepare A5 approval packets instead of executing A5 work

## Operating Loop

1. Reality check: inspect `git status -sb`, current branch, recent log, active status docs, and relevant source/tests.
2. Queue selection: choose the highest-priority safe local task whose scope is clear.
3. Contract: record the task, file scope, validation, and stop conditions.
4. Execution: implement locally or assign bounded Worker tasks with non-overlapping write scopes.
5. Validation: run targeted validation first, then broader gates when risk requires them.
6. Verification: perform a read-only review of diff scope, hard stops, secrets/dependencies, and board freshness.
7. Board update: record status, validation, changed files, remaining risks, and next safe action.
8. Commit readiness: create a guarded local commit only when all guarded commit conditions pass.
9. Continue or stop: continue only while the next step remains local, reversible, inside scope, and below A5.

## Stop Conditions

The Supreme Commander must stop and request explicit approval before:

- provider or external model calls
- real memory content scan, preview, export, import, or migration
- durable memory, audit, diary, SQLite, vector, candidate, or recall-store mutation
- migration/import/export/backup/restore apply
- public MCP tool or schema expansion
- service/watchdog/startup install or config switch
- `.env`, secret, credential, or dependency changes
- tag, release, deploy, production action, or remote write without explicit authorization
- destructive commands or history rewrite
- stale branch merge/rebase/cherry-pick
- user-owned uncommitted work overwrite
- readiness, cutover, or `RC_READY` claim without complete runtime evidence

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
