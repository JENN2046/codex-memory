# RC_PRECHECK_001 Execution Approval Packet

Status: `DRAFT_NOT_APPROVED`

Decision: `NOT_READY_BLOCKED`

Target commit: `9eb17ad`

Remote baseline: `origin/main = 103c3ac`

Endpoint for future HTTP evidence, if approved: `http://127.0.0.1:7605`

## Purpose

Prepare a copyable exact-approval boundary for a future full `RC_PRECHECK_001` evidence capture. This packet is not approval and executes nothing.

## A1/A2 Local Checks Already Allowed For Precheck Preparation

```powershell
git status -sb
git log --oneline --decorate -n 10
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

These commands may support local docs/board freshness only. They do not establish RC readiness.

## A5 Commands Requiring Exact Approval Before Execution

```powershell
npm run gate:mainline:strict
npm run observe:http -- --json
# approved recall path observation, with exact subject/query and audit boundary named in the approval
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

These commands may be used only as bounded `RC_PRECHECK_001` evidence if the user approves them exactly. Passing them is not `RC_READY`.

## Copyable Approval Line

I approve `RC_PRECHECK_001` full precheck for target commit `9eb17ad` on local `main`, endpoint `http://127.0.0.1:7605`, using only: Git baseline, `npm run gate:mainline:strict`, `npm run observe:http -- --json`, one approved recall path observation with recall audit evidence, active-memory compare, active-memory rollback, public MCP freeze confirmation, and remaining runtime gaps confirmation. This approval does not authorize provider calls, real memory broad scans, migration/import/export/backup/restore apply, config/watchdog/startup changes, public MCP expansion, durable memory writes beyond the explicitly approved recall observation if any, push, tag, release, deploy, RC cutover, A5-GAP-7, or any readiness claim.

## Required Result Wording

If approved full precheck passes, record only:

```text
PRECHECK_PASSED_NOT_RC_READY
```

If any warning or failure appears, record:

```text
NOT_READY_BLOCKED
```

No result may claim `RC_READY`, runtime readiness, final RC readiness, v1 RC readiness, cutover readiness, migration readiness, or production readiness.
