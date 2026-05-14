# Autopilot Failure Recovery

Updated: 2026-05-14

## Purpose

A4.8 should recover from ordinary local failures, but it must not hide uncertainty or cross hard-stop boundaries.

## Validation Failure Handling

When validation fails:

1. capture the failing command and high-signal error
2. inspect the smallest relevant diff/context
3. attempt one narrow obvious fix if it is local, reversible, and inside scope
4. rerun the failing validation
5. stop and report `BLOCKED` if the next fix requires design judgment or hard-stop approval

Do not claim completion when validation is red or unverified.

## Failed Tests Recovery

- fix only the behavior or assertion related to the current phase
- do not broaden the phase to make tests pass
- do not skip tests to get a green closeout
- rerun the targeted test before broad validation
- stop if the fix requires runtime mutation, schema expansion, dependency changes, or real data writes outside the authorized phase

## Docs Validation Failure Recovery

- fix broken links, stale phase names, invalid command references, or overclaims
- keep the source of truth thin; do not copy full docs into status/backlog files
- rerun docs validation
- stop if the docs imply unimplemented runtime behavior as current behavior

## Unrelated Worktree Files

If unrelated modified or untracked files appear:

- stop before staging or committing
- report the file list
- separate user-owned work from current task work
- continue only if the unrelated files are confirmed irrelevant and remain unstaged

## Blocked Hard Stops

Stop and produce a blocker report before:

- real DB/memory mutation
- SQLite migration or `ALTER TABLE`
- MCP public tool/schema expansion
- dependency/package-manager change
- `.env` or secret edits
- provider calls
- tag/release/deploy
- stale branch merge/rebase/cherry-pick
- destructive commands

## Safe Rollback for Uncommitted Changes

Preferred recovery is forward repair with small patches. Do not run destructive rollback commands such as `git reset --hard` or `git clean -fd`.

If uncommitted changes must be abandoned, request explicit approval and identify the exact files first.

Code revert is not data rollback. A code rollback cannot undo durable memory, DB, diary, vector, or audit state changes.

## Blocker Report Shape

Use:

```text
Blocked:
Reason:
Hard stop:
Changed files:
Validation:
Safe state:
Required approval/action:
Next after approval:
```
