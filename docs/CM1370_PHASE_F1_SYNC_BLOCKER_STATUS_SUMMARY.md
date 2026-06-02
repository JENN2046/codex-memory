# CM-1370 Phase F1 Sync Blocker Status Summary

Status: `COMPLETED_VALIDATED_NOT_READY`

Date: 2026-06-02

## Scope

CM-1370 hardens the local F1 sync packet output with explicit machine-readable blocker and post-push A5 usability summaries.

This is local source/CLI/test/docs/board work only. It does not push, pull, merge, rebase, rerun F1, call MCP, call providers, read real memory/audit data, write durable memory/audit data, change config/watchdog/startup, expand public MCP tools, or claim readiness/reliability.

## Change

`src/core/PhaseF1SyncApprovalPacket.js` now emits:

```text
postPushA5UsabilityStatus
syncBlocker.status
syncBlocker.nextRequiredAction
syncBlocker.reasons
syncBlocker.redLaneActionRequired
syncBlocker.remoteActionApproved
syncBlocker.remoteActionExecuted
```

For a clean local-ahead branch, `syncBlocker.status` is `push_approval_required` and `syncBlocker.reasons` is `local_branch_ahead_remote`.

For dirty worktree, remote-behind, missing refs, or no local commits to sync, `syncBlocker.status` is `fail_closed`.

`src/cli/phase-f1-sync-approval-packet.js` prints both `postPushA5UsabilityStatus` and `syncBlocker` in text mode.

## Validation

```text
node --check src\core\PhaseF1SyncApprovalPacket.js
node --check src\cli\phase-f1-sync-approval-packet.js
node --check tests\phase-f1-sync-approval-packet.test.js
node --test tests\phase-f1-sync-approval-packet.test.js
node src\cli\phase-f1-sync-approval-packet.js --json --pretty
node src\cli\phase-f1-sync-approval-packet.js
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Results:

```text
targeted_sync_packet_tests=3/3
npm_test=2890/2890
ledger_consistency=passed
docs_validation=passed
```

Development-state CLI self-check correctly reports `syncBlocker.status=fail_closed` while the worktree is dirty.

## Remaining State

F1 still requires explicit normal non-force push approval, successful push, fresh synced HEAD, exact A5-GAP-4 approval, and bounded live no-write rerun.

F2/F3/F4/F5 remain blocked until accepted F1 live evidence exists.
