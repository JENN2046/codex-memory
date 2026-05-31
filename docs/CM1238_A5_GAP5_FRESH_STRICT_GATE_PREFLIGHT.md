# CM-1238 A5-GAP-5 Fresh Strict Gate Preflight

Date: 2026-05-31

Status: `PREFLIGHT_ONLY_NOT_APPROVED_NOT_READY`

## Scope

CM-1238 prepares the next exact approval boundary for `A5-GAP-5` after CM-1237 corrected ValidationAggregator closure routing to `red_lane_authorization_required`.

This is docs/preflight only. It does not execute `npm run gate:mainline:strict`, start services, read real memory, call providers, mutate durable state, push, tag, release, deploy, run cutover, or claim readiness.

## Current Local Preflight Baseline

Observed before this docs-only change:

```text
branch=main
HEAD=199aec96ae660ddad175a7566195f63fee1a0caa
branch_state=main...origin/main [ahead 31]
tracked_worktree=clean
untracked_left_untouched=CLAUDE.md, docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md
```

This baseline is not the approval target after CM-1238 is committed. Exact approval must bind to the fresh post-commit HEAD.

## Proposed Approval Line

After CM-1238 is committed, run `git rev-parse HEAD` and use the fresh value:

```text
I approve A5-GAP-5 for codex-memory on branch main at commit <FRESH_HEAD_AFTER_CM1238_COMMIT>, running cutover-context strict gate only, no remote write.
```

Any approval with an older commit, missing commit, different branch, broader action, or remote write permission is insufficient for this boundary.

## Approved Command If Exact Approval Is Later Given

Only this command is in scope:

```powershell
npm run gate:mainline:strict
```

## Explicitly Out Of Scope

- push / PR / tag / release / deploy
- RC cutover
- `RC_READY`, runtime readiness, cutover readiness, write reliability, or recall reliability claim
- provider smoke or benchmark
- MCP `tools/call`
- real memory scan/export/import/migration
- durable memory or audit write
- migration/import/export/backup/restore apply
- config switch
- watchdog/startup install or change
- dependency/package/lockfile change
- public MCP tool/schema expansion

## Required Fresh Preflight Before Execution

Before any approved execution, re-run and inspect:

```powershell
git status --short --branch
git rev-parse HEAD
git log --oneline --decorate -n 10
git diff --stat
git diff --check
```

Execution must stop if:

- `HEAD` differs from the exact approval line
- tracked worktree contains unrelated changes
- untracked files would be included or modified
- `.env`, secrets, package manifests, lockfiles, config, watchdog/startup, or public MCP surface changed unexpectedly
- the command would require any out-of-scope action

## Expected Evidence If Later Executed

The evidence record must include:

- target commit and branch
- command executed
- health result
- contract result
- test result
- compare result
- rollback result
- explicit statement that no remote write occurred
- explicit statement that readiness was not claimed

## Current Result

```text
preflightPrepared=true
approvalGranted=false
strictGateExecuted=false
runtimeGapsClosed=false
a5HardStopsCleared=false
validationAggregatorFullImplementation=false
runtimeReady=false
finalRcMatrixReady=false
rcReady=false
decision=NOT_READY_BLOCKED
```

