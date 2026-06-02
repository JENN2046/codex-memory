# CM-1369 Phase F1 Post-Push A5 Usability Gate

Status: `COMPLETED_VALIDATED_NOT_READY`

Date: 2026-06-02

## Scope

CM-1369 hardens the local F1 sync packet generator so the post-push A5-GAP-4 approval template is not confused with immediately usable authorization.

This is local source/CLI/test/docs/board work only. It does not push, pull, merge, rebase, rerun F1, call MCP, call providers, read real memory/audit data, write durable memory/audit data, change config/watchdog/startup, expand public MCP tools, or claim readiness/reliability.

## Change

`src/core/PhaseF1SyncApprovalPacket.js` now emits:

```text
postPushA5Gap4TemplateCurrentlyUsable
postPushFreshChecks.requiredBranch
postPushFreshChecks.requiredRemoteRef
postPushFreshChecks.requiredHead
postPushFreshChecks.requireCurrentHeadEqualsRemoteHead
postPushFreshChecks.requireAhead
postPushFreshChecks.requireBehind
postPushFreshChecks.requireWorktreeClean
postPushFreshChecks.currentlySatisfied
```

The post-push A5-GAP-4 template is currently usable only when:

```text
currentHead == originHead
ahead == 0
behind == 0
worktreeClean == true
```

`src/cli/phase-f1-sync-approval-packet.js` prints those checks in text mode.

`tests/phase-f1-sync-approval-packet.test.js` covers both states:

- ahead branch: template exists but `postPushA5Gap4TemplateCurrentlyUsable=false`
- clean synced branch: `postPushA5Gap4TemplateCurrentlyUsable=true`

## Validation

```text
node --check src\core\PhaseF1SyncApprovalPacket.js
node --check src\cli\phase-f1-sync-approval-packet.js
node --check tests\phase-f1-sync-approval-packet.test.js
node --test tests\phase-f1-sync-approval-packet.test.js
node src\cli\phase-f1-sync-approval-packet.js --json --pretty
node src\cli\phase-f1-sync-approval-packet.js
npm test
```

Results:

```text
targeted_sync_packet_tests=3/3
npm_test=2890/2890
```

Current development-state CLI self-check correctly reports `postPushA5Gap4TemplateCurrentlyUsable=false` while the worktree is dirty.

## Remaining State

F1 still requires explicit push approval, successful push, fresh synced HEAD, exact A5-GAP-4 approval, and bounded live no-write rerun.

F2/F3/F4/F5 remain blocked until accepted F1 live evidence exists.
