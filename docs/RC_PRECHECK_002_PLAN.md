# RC_PRECHECK_002_PLAN

Status: RC_PRECHECK_002_PLAN_READY_FOR_COMMIT
Decision: NOT_READY_BLOCKED
Scope: planning-only packet for a future RC_PRECHECK_002
Date: 2026-05-20

## Purpose

This document defines a planning boundary for a future `RC_PRECHECK_002`.

It does not execute `RC_PRECHECK_002`.

It does not start HTTP observe, run compare/rollback, call providers, scan real memory, write durable memory/audit state, switch config, apply migration/backup work, expand public MCP tools, push, tag, release, deploy, cut over, or claim readiness.

## Accepted Source Facts

- `LOCAL_RC_CANDIDATE_CLOSEOUT_ACCEPTED`.
- `DOGFOOD_001` through `DOGFOOD_004` are completed and summarized.
- `DOGFOOD_SUMMARY_001` is remote-synced at `c840d06`.
- All DOGFOOD evidence remains `NOT_RC_READY`.
- Real rollback remains A5 blocked.
- RC remains `NOT_READY_BLOCKED`.
- V8 is not implemented.
- VCP full parity is not claimed.

## Target Baseline

Planning baseline:

```text
c840d060970483295c6bda01068560032eccd148
```

Short form:

```text
c840d06 docs: summarize dogfood readonly evidence
```

At planning time, this was the synced local and remote `main` baseline recorded after `DOGFOOD_SUMMARY_001`.

Future `RC_PRECHECK_002` execution must re-read Git reality before any command execution. If local `HEAD`, `origin/main`, or remote `main` no longer match the approved target, execution must stop as target drift unless a new exact approval updates the target.

Docs/board-only commits after this plan do not automatically authorize precheck execution against a newer target. A future approval line must name the exact target commit to be checked.

## Allowed Commands Candidates

These are candidate command classes for a future exact approval only. They are not executed by this plan.

### Always Read-Only Preflight Candidates

```powershell
git status -sb
git log --oneline --decorate -n 20
git rev-parse HEAD
git rev-parse origin/main
git ls-remote origin main
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

### A5 Precheck Candidates

These commands require an explicit future approval line naming `RC_PRECHECK_002`, the target commit, and the exact command list.

```powershell
npm run gate:mainline:strict
npm run observe:http -- --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

`observe:http` is loopback/current endpoint evidence only. It is not HTTP startup, config switch, watchdog/startup installation, production readiness, or cutover readiness.

`rollback-active-memory` is rollback-readiness evidence only. It is not real rollback and does not authorize reset, restore, revert, checkout rollback, backup restore, or production rollback.

## Forbidden Actions

This plan does not authorize:

- executing `RC_PRECHECK_002`
- HTTP observe in this planning slice
- compare or rollback in this planning slice
- provider calls
- real memory scan, preview, export, import, or broad runtime-store read
- durable memory write
- durable audit write
- config switch
- Codex/Claude config mutation
- migration, import, export, backup, restore, apply, or confirm command
- public MCP expansion
- source, test, or package modification
- dependency changes
- push, tag, release, deploy, or cutover
- real rollback, reset, restore, revert, or checkout rollback
- `RC_READY`, runtime readiness, final RC readiness, production readiness, cutover readiness, or VCP full parity claim

## Evidence Output Shape

Future `RC_PRECHECK_002` evidence must be fail-closed.

Allowed final labels:

```text
RC_PRECHECK_002_PASSED_NOT_RC_READY
RC_PRECHECK_002_BLOCKED
RC_PRECHECK_002_FAILED_NOT_RC_READY
```

The evidence record must include:

- target commit
- local `HEAD`
- `origin/main`
- remote `main`
- worktree cleanliness
- command list actually executed
- command exit codes
- strict gate summary if executed
- HTTP observe summary if executed
- compare summary if executed
- rollback-readiness summary if executed
- SQLite warning notes if observed
- forbidden actions confirmation
- readiness flags fixed to false

Readiness fields must stay:

```json
{
  "rcReady": false,
  "runtimeReady": false,
  "finalRcMatrixReady": false,
  "productionReady": false,
  "cutoverReady": false,
  "vcpFullParityClaimed": false
}
```

Passing local checks can only produce precheck evidence. It cannot close runtime gaps by itself.

## Stop Conditions

Stop before execution if any of these occur:

- target commit is not exactly approved
- local `HEAD`, `origin/main`, or remote `main` drift from the approved target
- worktree is dirty before execution
- source, test, package, dependency, runtime data, config, secret, or `.env` drift appears
- HTTP service is not already in the approved expected state
- provider credentials would be needed
- real memory scan or durable write would be required
- migration/import/export/backup/restore apply would be required
- compare/rollback would cross from readiness evidence into real rollback
- command output suggests mutation, durable write, config change, or migration apply
- any command fails and the failure cannot be classified without a new decision
- any result wording would imply readiness

## Drift Rule

`RC_PRECHECK_002` is bound to the exact target named in a future approval line.

If new commits appear after this plan:

- docs/board-only commits may update the plan or status surfaces
- they do not automatically update the executable precheck target
- execution must either use the originally approved target or stop for a refreshed approval

If any post-target change touches `src/`, `tests/`, package manifests or lockfiles, runtime data, config/watchdog/startup, public MCP schema/tools, provider/profile runtime config, `.env`, secrets, migrations, backup/restore paths, or other non-docs/board areas, `RC_PRECHECK_002` must remain blocked until a new target review is prepared.

## Validation For This Plan Slice

Required validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Skipped by design:

- no `RC_PRECHECK_002` execution
- no HTTP observe
- no compare/rollback
- no provider call
- no real memory scan
- no durable write/audit write
- no config switch
- no migration/backup apply
- no public MCP expansion
- no source/test/package modification
- no push/tag/release/deploy/cutover
- no readiness claim

## Next Safe Action

Next safe action: validate this planning-only doc/board slice and stage it only after explicit commit authorization. 中文解释：下一步只适合验证并准备本地提交这份计划，不能把计划当成执行 `RC_PRECHECK_002` 或声明 readiness 的授权。
