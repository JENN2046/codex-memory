# CM-0555 Operational Rollback Drill Read-Only Rehearsal Review

Status: ROLLBACK_REHEARSAL_READY_FOR_READONLY
Decision: NOT_READY_BLOCKED
Mode: A4 artifact / read-only / A5-boundary review only
Risk: low
Date: 2026-05-20

## Purpose

Review whether the operational rollback drill can proceed to a future read-only rehearsal.

This review does not execute rollback rehearsal commands. It does not run `npm run rollback:mainline:plan`, active-memory compare, active-memory rollback, real rollback, revert, reset, restore, cleanup, backup restore, provider calls, real memory scans, durable writes, source/test changes, push, tag, release, deploy, cutover, or readiness claims.

## Current Git Baseline

Observed with allowed commands:

```text
git status -sb => main...origin/main [ahead 9]
HEAD => e9147d1 docs: add operational rollback drill design
origin/main => 6c8bee0 docs: plan phase f epa residual pyramid fixtures
```

## Required Rollback Drill Artifacts

A future read-only rehearsal needs these artifacts named or confirmed before it runs:

| artifact | required? | current availability | note |
|---|---:|---|---|
| rollback drill design packet | yes | available: `docs/CM-0554_OPERATIONAL_ROLLBACK_DRILL_DESIGN.md` | Defines target types, success criteria, allowed design commands, A5 forbidden actions, stop conditions, and evidence shape. |
| exact rollback target | yes | not yet selected for rehearsal | Must name one commit, range, or docs-only target. Listing target classes is not the same as selecting a target. |
| rehearsal mode | yes | design says read-only first | Future task must explicitly say read-only rehearsal and forbid actual rollback. |
| expected changed files | yes for any executable drill | not applicable for read-only review | A real rollback/revert would require this; read-only rehearsal may list expected zero writes. |
| preflight Git baseline | yes | partially available from this review | Future rehearsal should capture fresh `git status -sb` and `git log --oneline --decorate -n 20`. |
| rollback evidence source | yes | partially available | Existing `rollback-active-memory` evidence exists from RC precheck, but that is compatibility/readiness evidence, not an operational rollback execution artifact. |
| validation plan | yes | design-level only | Must state which checks are read-only and which are A5-gated before running. |
| stop conditions | yes | available in CM-0554 | Must be copied into any future executable packet. |
| no-readiness wording | yes | available | Future output must not claim `RC_READY` or runtime/production/cutover readiness. |

## Is There Enough Rollback Evidence Now?

Current answer: enough to prepare a read-only rehearsal, not enough to perform a real rollback.

Evidence currently sufficient for read-only rehearsal:

- CM-0554 design packet exists.
- Recent RC precheck closeout recorded rollback harness evidence: `43/43 rollback-ready`.
- Current Git baseline can be observed without mutation.
- Boundaries are clear: no real rollback, no destructive command, no runtime/source/test/package/config/durable-state mutation.

Evidence not yet sufficient for actual rollback:

- no exact rollback target selected
- no expected changed-file set for an executable rollback
- no approved rollback command list
- no explicit user approval for real rollback/revert/reset/restore
- no post-rollback validation plan for a selected target
- no remote/push authorization

## Read-Only Commands

The following are read-only for the rehearsal readiness context:

```powershell
git status -sb
git log --oneline --decorate -n 20
git diff --name-only <base>..HEAD
git diff --stat <base>..HEAD
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

These commands may inspect state or validate docs formatting. They do not by themselves authorize rollback, runtime change, source/test edits, durable writes, or remote writes.

## A5-Triggering Commands Or Actions

The following require separate exact approval before use:

```powershell
npm run rollback:mainline:plan -- --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

The following actions are also A5 or harder stop boundaries:

- real rollback, revert, reset, restore, rebase, cherry-pick, amend, squash, or branch movement
- destructive cleanup or backup restore
- migration/import/export/backup/restore apply
- runtime code changes
- `src/` or `tests/` changes
- package manifest or lockfile changes
- config/watchdog/startup changes
- provider calls
- real memory broad scans
- durable memory or durable audit writes
- public MCP expansion
- push, tag, release, deploy, PR, or remote write
- RC cutover, A5-GAP-7, or readiness claim

## Review Finding

A future read-only rehearsal can be prepared if it remains limited to artifact checks and command classification. It must not execute rollback planning commands, active-memory compare/rollback, or any real rollback action without a new exact approval.

This review proves:

- next step can be read-only rehearsal preparation
- rollback artifacts are partly available
- exact rollback target is still not selected
- command classes are separated into read-only versus A5-gated
- state remains `NOT_READY_BLOCKED`

This review does not prove:

- real rollback readiness
- operational restore readiness
- production readiness
- runtime readiness
- cutover readiness
- `RC_READY`

## Final Result

```text
ROLLBACK_REHEARSAL_READY_FOR_READONLY
NOT_READY_BLOCKED
```
