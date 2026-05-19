# CM-0554 Operational Rollback Drill Design

Status: DESIGN_PACKET_READY_FOR_REVIEW
Decision: NOT_READY_BLOCKED
Mode: A4 docs/board design only
Risk: low now; future drill execution is A5-gated if it changes runtime, config, data, Git history, remote state, or service state

## Purpose

Define an operational rollback drill boundary after `RC_PRECHECK_001` passed as `PRECHECK_PASSED_NOT_RC_READY`.

This packet is a design-only rehearsal map. It does not execute rollback, change runtime behavior, start or stop services, write durable memory, scan real memory broadly, apply migration/import/export/backup/restore, change config/watchdog/startup, push, tag, release, deploy, cut over, or claim `RC_READY`.

## What Would Be Rolled Back

The drill must name one rollback target before execution. Valid design candidates are:

- local runtime code rollback candidate: one local commit or range touching runtime behavior
- HTTP MCP session lifecycle rollback candidate: the CM-0550 HTTP session TTL/cap/cleanup hardening commit, if a future authorized drill needs to test operational reversibility
- docs/board metadata rollback candidate: one docs-only commit or range, for non-runtime rehearsal only
- active-memory compatibility rollback candidate: compare/rollback harness evidence only, without changing runtime state

Default recommendation for first drill: docs/board metadata rollback rehearsal only. It proves process discipline without touching runtime.

Do not combine unrelated rollback targets in one drill.

## Rollback Success Criteria

A future drill can be considered successful only if all selected criteria are explicitly evidenced:

- target commit/range is named exactly
- pre-drill Git state is recorded
- rollback plan is dry-run or non-mutating unless separately approved
- expected changed files are listed before any action
- post-drill state matches the intended target
- no unexpected files change
- no `.env`, secrets, dependency manifests, lockfiles, runtime data, or config/watchdog/startup files change unless separately approved
- if runtime is involved, targeted validation passes after the rollback path
- project state remains `NOT_READY_BLOCKED` unless a later release/cutover phase separately changes it

## Allowed Commands For Design-Only Review

The design packet itself allows only local read-only or docs validation commands:

```powershell
git status -sb
git log --oneline --decorate -n 10
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

These commands do not execute rollback and do not prove rollback readiness by themselves.

## Future Drill Commands Requiring Exact Approval

A future executable drill must be separately approved with exact target, scope, and stop conditions. Candidate commands may include:

```powershell
git status -sb
git log --oneline --decorate -n 20
git diff --name-status <rollback-base>..HEAD
npm run rollback:mainline:plan -- --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

These are candidates only. Listing them here is not execution authorization.

## A5 Forbidden Actions Without Separate Exact Approval

Do not perform any of the following from this packet:

- actual Git rollback, revert, reset, rebase, amend, squash, cherry-pick, branch deletion, or force push
- push, tag, release, deploy, PR creation, or remote write
- runtime code change
- HTTP service start/stop/reconfigure
- config/watchdog/startup change
- provider call
- real memory broad scan
- migration/import/export/backup/restore apply
- cleanup apply or destructive delete
- durable memory write or durable audit write
- public MCP schema/tool expansion
- dependency/package/lockfile change
- `.env` or secret edit
- RC cutover, A5-GAP-7, production readiness, runtime readiness, or `RC_READY` claim

## Stop Conditions

Stop before execution if:

- rollback target is not named exactly
- working tree is dirty before the drill
- expected changed files are unclear
- target range includes user-owned uncommitted work
- rollback would touch `src/`, `tests/`, package files, runtime data, or config without explicit approval
- rollback requires destructive Git commands
- validation expectations are undefined
- any command would write outside the workspace

## Evidence Output Shape

Future drill evidence must use one of:

```text
ROLLBACK_DRILL_DESIGN_READY_FOR_REVIEW
ROLLBACK_DRILL_DRY_RUN_PASSED_NOT_READY
ROLLBACK_DRILL_BLOCKED
ROLLBACK_DRILL_FAILED
```

No rollback drill output may claim `RC_READY`, production readiness, runtime readiness, final RC readiness, v1 RC readiness, or cutover readiness.

## Current Decision

```text
ROLLBACK_DRILL_DESIGN_READY_FOR_REVIEW
NOT_READY_BLOCKED
```