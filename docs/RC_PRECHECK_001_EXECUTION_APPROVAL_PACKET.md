# RC_PRECHECK_001 Execution Approval Packet

Status: DRAFT_NOT_APPROVED

Decision: NOT_READY_BLOCKED

Prepared target commit: `bd28304496c4d642f1a9940c4b1fcea316218517`

Remote baseline: origin/main = 103c3ac

Endpoint for future HTTP evidence, if approved: http://127.0.0.1:7605

Execution-time target rule: before any approved full precheck execution, re-read `git rev-parse HEAD`; if `HEAD` is no longer `bd28304496c4d642f1a9940c4b1fcea316218517`, update this packet and approval line before running any A5 command.

## Purpose

Prepare exact-approval boundaries for future RC_PRECHECK_001 evidence capture. This packet is not approval and executes nothing.

## A1/A2 Local Checks Already Allowed For Precheck Preparation

`powershell
git status -sb
git log --oneline --decorate -n 10
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
`

These commands may support local docs/board freshness only. They do not establish RC readiness.

## A5-RC-PRECHECK-READONLY Approval Line

Recommended first approval boundary:

`	ext
I approve A5-RC-PRECHECK-READONLY for target commit bd28304496c4d642f1a9940c4b1fcea316218517 on local main, endpoint http://127.0.0.1:7605, using only: Git baseline, npm run gate:mainline:strict, npm run observe:http -- --json, npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match, npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready, public MCP freeze confirmation, and remaining runtime gaps confirmation. This approval does not authorize recall path observation, provider calls, real memory broad scans, migration/import/export/backup/restore apply, config/watchdog/startup changes, public MCP expansion, durable memory writes, push, tag, release, deploy, RC cutover, A5-GAP-7, or any readiness claim.
`

## A5-RC-PRECHECK-RECALL Approval Line

Use only if a real recall audit observation is needed after the readonly precheck boundary is understood:

`	ext
I approve A5-RC-PRECHECK-RECALL for target commit bd28304496c4d642f1a9940c4b1fcea316218517 on local main, using exactly one named recall subject/query and bounded recall audit observation to be written into the execution packet before running. This approval does not authorize provider calls, real memory broad scans beyond the named recall path, migration/import/export/backup/restore apply, config/watchdog/startup changes, public MCP expansion, durable memory writes outside the explicitly approved recall/audit path, push, tag, release, deploy, RC cutover, A5-GAP-7, or any readiness claim.
`

The recall approval line is intentionally incomplete until the exact subject/query/audit boundary is named. Do not execute it as written.

## Required Result Wording

If approved readonly precheck passes, record only:

`	ext
PRECHECK_PASSED_NOT_RC_READY
`

If any warning, failure, missing approval, target drift, or boundary ambiguity appears, record:

`	ext
NOT_READY_BLOCKED
`

No result may claim `RC_READY`, runtime readiness, final RC readiness, v1 RC readiness, cutover readiness, migration readiness, or production readiness.
