# RC_PRECHECK_001 Execution Approval Packet

Status: TARGET_REFRESHED_DRAFT_NOT_APPROVED

Decision: NOT_READY_BLOCKED

Current packet target commit: `765ab1825535c8b66078e50ff43ac519488d25f8`

Target binding rule: before any future approved `RC_PRECHECK_001` execution, re-read `git rev-parse HEAD`. If `HEAD` differs from the current packet target, stop and refresh this packet before running any A5 command.

Remote baseline rule: re-read `git status -sb` and `git log --oneline --decorate -n 10` at execution time. Do not infer the current remote baseline from historical packet text.

Endpoint for future HTTP evidence, if approved: http://127.0.0.1:7605

## Purpose

Refresh the `RC_PRECHECK_001` approval packet so future precheck evidence binds to the current local `HEAD` instead of stale target coordinates.

This packet does not execute RC precheck. It does not run strict gate, HTTP observe, recall observation, compare, rollback, provider calls, real memory scans, migrations, backup/restore, public MCP expansion, durable writes, push, tag, release, deploy, cutover, or any readiness transition.

## Current Readiness Decision

`RC_PRECHECK_001` is not ready to execute until a new exact approval line names the current packet target commit and boundary.

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

If any warning, failure, missing approval, target drift, stale baseline, or boundary ambiguity appears, the only allowed controlling result is:

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

Earlier readonly precheck evidence remains historical evidence only. It cannot be reused as current-target evidence after local `HEAD` moved. Future execution must bind to the current packet target and fresh exact approval.