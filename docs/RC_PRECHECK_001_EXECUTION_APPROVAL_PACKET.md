# RC_PRECHECK_001 Execution Approval Packet

Status: TARGET_DRIFT_RULE_PATCHED_DRAFT_NOT_APPROVED

Decision: NOT_READY_BLOCKED

Runtime evidence target baseline: `f4eb17173b6870dbc8ae55efe9801a62e359cac6`

Metadata refresh rule: a newer local `HEAD` may exist after this baseline only when every post-target commit is metadata-only docs/board refresh. Such newer commits do not change the runtime evidence target.

Allowed newer-commit scope: `docs/`, `STATUS.md`, `MAINTENANCE_BACKLOG.md`, and `.agent_board/` only.

Disallowed newer-commit scope: any post-target change under `src/`, `tests/`, package manifests or lockfiles, runtime data, config/watchdog/startup surfaces, public MCP schema/tools, provider/profile runtime config, `.env`, secrets, migrations, backup/restore, or other non-docs/board paths makes `RC_PRECHECK_001` fail closed as `NOT_READY_BLOCKED`.

Pre-execution baseline checks required before any future approved `RC_PRECHECK_001` run:

```powershell
git status --short
git merge-base --is-ancestor f4eb17173b6870dbc8ae55efe9801a62e359cac6 HEAD
git diff --name-only f4eb17173b6870dbc8ae55efe9801a62e359cac6..HEAD
```

Proceed only if the worktree is clean, `HEAD` lineage contains the runtime evidence target baseline, and post-target commits touch only docs/board metadata paths. Otherwise stop as `NOT_READY_BLOCKED` before any A5 command.

Remote baseline rule: re-read `git status -sb` and `git log --oneline --decorate -n 10` at execution time. Do not infer the current remote baseline from historical packet text.

Endpoint for future HTTP evidence, if approved: http://127.0.0.1:7605

## Purpose

Patch the `RC_PRECHECK_001` target-drift rule after the packet refresh commit itself moved `HEAD`. The runtime evidence target baseline remains fixed, while later pure docs/board metadata commits may be newer than the target if they do not alter runtime, tests, package state, config, or durable data.

This packet does not execute RC precheck. It does not run strict gate, HTTP observe, recall observation, compare, rollback, provider calls, real memory scans, migrations, backup/restore, public MCP expansion, durable writes, push, tag, release, deploy, cutover, or any readiness transition.

## Current Readiness Decision

`RC_PRECHECK_001` is not ready to execute until the pre-execution baseline checks prove the local state is clean, lineage includes the runtime evidence target baseline, and all post-target commits are docs/board-only metadata refresh.

Required controlling result remains:

```text
NOT_READY_BLOCKED
```

## Allowed Commands For A Future A5-RC-PRECHECK-READONLY Approval

Only the following command groups may be included in a future exact `A5-RC-PRECHECK-READONLY` approval:

```powershell
git status -sb
git log --oneline --decorate -n 10
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
npm run gate:mainline:strict
npm run observe:http -- --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

The HTTP observe command is loopback/local precheck evidence only. It is not live service readiness, production readiness, config/watchdog/startup readiness, cutover readiness, or `RC_READY`.

## Forbidden Actions

This packet does not authorize:

- recall path observation; that still requires separate exact `A5-RC-PRECHECK-RECALL` approval with named subject/query/audit boundary
- provider calls
- real memory broad scans
- migration/import/export apply
- backup/restore apply
- public MCP expansion
- durable memory writes
- config/watchdog/startup changes
- push, tag, release, deploy, or RC cutover
- A5-GAP-7
- any readiness claim

## Evidence Output Shape

If a future exact approved readonly precheck passes, the maximum allowed result is:

```text
PRECHECK_PASSED_NOT_RC_READY
```

If any warning, failure, missing approval, target drift outside docs/board metadata-only scope, stale baseline, dirty worktree, broken lineage, or boundary ambiguity appears, the only allowed controlling result is:

```text
NOT_READY_BLOCKED
```

All evidence output must keep:

```text
runtimeReady=false
finalRcMatrixReady=false
v1RcReady=false
rcReady=false
```

No result may claim `RC_READY`, runtime readiness, final RC readiness, v1 RC readiness, cutover readiness, migration readiness, or production readiness.

## Historical Evidence Boundary

Earlier readonly precheck evidence remains historical evidence only. It cannot be reused as current-target evidence after runtime-affecting local changes. Future execution must bind to the runtime evidence target baseline and pass the metadata-only post-target checks.