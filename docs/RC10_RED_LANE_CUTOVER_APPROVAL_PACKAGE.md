# RC-10 Red Lane Cutover Approval Package

Phase: `RC-10`

Gap: `rc_cutover_not_executed`

Mode: `Red Lane approval package only`

Decision: `NOT_READY_BLOCKED`

Status: `DRAFT_NOT_APPROVED_NOT_EXECUTED`

## Purpose

Prepare the Red Lane authorization package for the remaining
`rc_cutover_not_executed` gap.

This document does not approve or execute RC cutover. It does not push, tag,
release, deploy, publish, switch config, install watchdog/startup entries,
write durable memory/audit state, apply migration/import/export/backup/restore,
call providers, call MCP tools, scan real memory, or claim `RC_READY`.

## Current Git Reality

At package creation time:

```text
branch = main
HEAD = 9012f9434931f0aaaef70ecfb266342863ac3dbc
origin/main = 9012f9434931f0aaaef70ecfb266342863ac3dbc
worktree = clean
```

Exact branch, commit, `origin/main`, ahead/behind state, and worktree
cleanliness must be rechecked immediately before any future RC-10 approval is
accepted or executed.

## Current Evidence State

Current local reassessment over the accepted A5 evidence chain reports:

```text
runtimeEvidenceSummaryAccepted = true
currentHeadBindingMatched = true
evidenceFreshnessStatus = fresh
evidenceUnitsComplete = true
localProofChainCloseoutAcceptedIds = validation_aggregator_full_implementation_incomplete
localProofChainCloseoutNotProvenIds = none
effectiveRemainingFullImplementationGapIds = rc_cutover_not_executed
```

The local proof-chain gap is therefore resolved for the current evidence route,
but RC cutover itself remains a Red Lane hard stop.

## Current Boundary Decision

```text
decision = NOT_READY_BLOCKED
readyToRequestRcCutoverApproval = false
rcCutoverApproved = false
rcCutoverExecuted = false
rcCutoverExecutionAllowed = false
rcReady = false
```

This package intentionally does not move the repository into `RC_READY`.

## Required Future Approval Fields

Any future executable RC-10 approval must name all fields below exactly:

```text
commit
remote_release_tag_deploy_action_list
config_watchdog_startup_change_scope
rollback_path
validation_commands
```

The approval must also state whether each Red Lane action is allowed or
forbidden:

```text
push
tag
release
deploy
config change
watchdog/startup change
durable memory/audit write
migration/import/export/backup/restore apply
provider call
MCP tool call
real memory scan/export
RC_READY claim
```

## Non-Executable Future Approval Template

The following is a template only. It is not an approval line and must not be
executed as-is:

```text
I approve RC-10 cutover for codex-memory on branch main at commit <COMMIT>,
with remote/release actions <EXACT_ACTION_LIST>, config/watchdog/startup scope
<EXACT_SCOPE>, rollback path <EXACT_ROLLBACK_PATH>, validation commands
<EXACT_VALIDATION_COMMANDS>, and no other actions.
```

For the current route, a safer minimal future action list would be:

```text
remote/release actions = none
tag = no
release = no
deploy = no
config/watchdog/startup change = no
durable memory/audit write = no
provider/MCP/real-memory action = no
```

If a future operator wants actual remote/release/cutover actions, those actions
must be listed explicitly in the approval line. They are not implied by this
package.

## Required Pre-Execution Checks

Before any future executable approval is accepted, rerun:

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git log --oneline --decorate -n 10
npm test
npm run gate:mainline:strict
```

If live runtime evidence is part of the future cutover decision, rerun the
freshness and exact-approved live no-write evidence path before RC-10:

```powershell
node .\src\cli\phase-f1-runtime-freshness.js --branch main --remote-ref origin/main --port 7605 --json --pretty
```

Any failed, stale, dirty, ahead/behind, warning-only, or mismatched evidence
must fail closed.

## Rollback Path

For a future approved cutover, rollback must be non-destructive by default:

```text
leave branch at current synced commit
use revert-by-new-commit for any future pushed cutover artifact
do not force push
do not delete branches
do not run destructive cleanup
do not reset hard
```

If a future approval authorizes a tag, release, deploy, config switch, or
watchdog/startup change, the approval must also include an exact cleanup or
revert path for that specific action.

## Not Executed

This package did not execute:

```text
RC cutover
push
tag creation
release creation
deploy
config/watchdog/startup change
provider call
MCP tool call
real memory scan/export
durable memory write
durable audit write
migration/import/export/backup/restore apply
public MCP expansion
readiness claim
```

## Result

This package prepares the RC-10 Red Lane approval boundary only.

```text
rc_cutover_not_executed = still blocked
rcCutoverApprovalPresent = false
rcCutoverExecutionAllowed = false
rcReady = false
```
