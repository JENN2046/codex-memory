# CM-0556 Read-Only Rollback Rehearsal Approval Packet

Status: READONLY_ROLLBACK_REHEARSAL_PACKET_READY
Decision: NOT_READY_BLOCKED
Mode: docs/board approval packet only
Risk: low
Date: 2026-05-20

## Purpose

Prepare a precise approval packet for a future read-only rollback rehearsal.

This packet is not the rehearsal. It does not execute rollback, rollback planning, active-memory compare, active-memory rollback, reset, restore, revert, checkout rollback, destructive cleanup, backup restore, runtime change, source/test/package/config change, provider call, real memory scan, durable write, public MCP expansion, push, tag, release, deploy, cutover, or readiness claim.

Cold boundary: this writes the rehearsal license. It does not pull the rollback cord.

## Rehearsal Goal

The future rehearsal goal is to prove that the team can inspect rollback artifacts and classify rollback commands without mutating repository history, runtime state, local durable state, or remote state.

The rehearsal must answer only:

- Which rollback target would be selected later?
- Which artifacts support the rollback decision?
- Which checks are read-only?
- Which checks/actions require A5 exact approval?
- Which stop conditions prevent real rollback?

The rehearsal must not perform rollback, simulate file restoration, or create a new rollback state.

## Read-Only Artifact / Evidence / Status Checks

A future approved read-only rehearsal may inspect:

- `docs/CM-0554_OPERATIONAL_ROLLBACK_DRILL_DESIGN.md`
- `docs/CM-0555_OPERATIONAL_ROLLBACK_DRILL_READONLY_REHEARSAL_REVIEW.md`
- `STATUS.md`
- `MAINTENANCE_BACKLOG.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`
- Git branch, log, and diff metadata

The rehearsal may reference recent evidence such as RC precheck rollback harness result `43/43 rollback-ready`, but that evidence remains compatibility/readiness-harness evidence. It is not an actual operational rollback execution artifact.

## Allowed Commands For Future Read-Only Rehearsal

Only these command classes may be approved by this packet:

```powershell
git status -sb
git log --oneline --decorate -n 20
git diff --name-only <base>..HEAD
git diff --stat <base>..HEAD
Get-Content -Raw docs/CM-0554_OPERATIONAL_ROLLBACK_DRILL_DESIGN.md
Get-Content -Raw docs/CM-0555_OPERATIONAL_ROLLBACK_DRILL_READONLY_REHEARSAL_REVIEW.md
```

For validating this packet itself, these docs-only checks are allowed:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Listing a command here is not automatic execution authorization. A future user approval must still name the rehearsal target and allowed command list.

## Forbidden Git Rollback Commands

The future read-only rehearsal must not run:

```powershell
git reset
git restore
git revert
git checkout
```

`git checkout` is forbidden when used for rollback, path restoration, branch switching, detached state, or file replacement. If branch inspection is needed, use read-only status/log commands instead.

## Forbidden Real Rollback Actions

This packet does not authorize:

- real rollback
- revert/reset/restore/checkout rollback
- destructive cleanup
- backup restore
- migration/import/export/backup/restore apply
- file deletion or data deletion
- runtime service start/stop/reconfigure
- source, test, package, runtime, or config changes
- dependency manifest or lockfile changes
- provider calls
- real memory broad scans
- durable memory writes
- durable audit writes
- public MCP expansion
- push, tag, release, deploy, PR, or other remote write
- RC cutover
- A5-GAP-7
- `RC_READY`, runtime readiness, production readiness, final RC readiness, v1 RC readiness, or cutover readiness claim

## A5-Triggering Commands

These commands remain outside this packet and require a separate exact approval:

```powershell
npm run rollback:mainline:plan -- --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

Any command that may mutate files, runtime state, Git history, durable memory/audit state, config, services, remote state, or production state is also A5 or harder-stop gated.

## Required Future Approval Line Shape

A future approval should name:

```text
I approve CM-0556 read-only rollback rehearsal for target <exact target or range>, using only: git status -sb, git log --oneline --decorate -n 20, git diff --name-only <base>..HEAD, git diff --stat <base>..HEAD, and read-only artifact reads of CM-0554/CM-0555. This approval does not authorize reset, restore, revert, checkout rollback, real rollback, destructive cleanup, backup restore, rollback:mainline:plan, compare-active-memory, rollback-active-memory, src/tests/package/runtime/config changes, provider calls, real memory scans, durable writes, public MCP expansion, push, tag, release, deploy, cutover, A5-GAP-7, or any readiness claim.
```

If the target or command list is ambiguous, result must be:

```text
READONLY_ROLLBACK_REHEARSAL_BLOCKED_SCOPE_UNCLEAR
```

## Final Result Options

Future packet or rehearsal status may only be:

```text
READONLY_ROLLBACK_REHEARSAL_PACKET_READY
READONLY_ROLLBACK_REHEARSAL_BLOCKED_SCOPE_UNCLEAR
```

No output may claim real rollback readiness or `RC_READY`.

## Current Packet Result

```text
READONLY_ROLLBACK_REHEARSAL_PACKET_READY
REAL_ROLLBACK_REMAINS_BLOCKED
NOT_READY_BLOCKED
```
