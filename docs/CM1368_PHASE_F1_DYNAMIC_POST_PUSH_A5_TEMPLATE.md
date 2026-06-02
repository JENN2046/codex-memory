# CM-1368 Phase F1 Dynamic Post-Push A5 Template

Status: `COMPLETED_VALIDATED_NOT_READY`

Date: 2026-06-02

## Scope

CM-1368 enhances the local sync packet generator so it can dynamically render both:

- the normal non-force push approval template for the current `HEAD`
- the post-push exact A5-GAP-4 F1 live no-write approval template for the same `HEAD`

This is local source/test/docs/board work only. It does not push, pull, merge, rebase, rerun F1, call MCP, call providers, read real memory/audit data, write durable memory/audit data, change config/watchdog/startup, expand public MCP tools, or claim readiness/reliability.

## Change

`src/core/PhaseF1SyncApprovalPacket.js` now returns:

```text
postPushA5Gap4ApprovalTemplate
postPushA5Gap4TemplateUsableAfterSyncOnly=true
```

`src/cli/phase-f1-sync-approval-packet.js` now supports:

```text
--endpoint URL
```

and prints the post-push A5-GAP-4 template in text mode.

`tests/phase-f1-sync-approval-packet.test.js` verifies that the generated A5-GAP-4 line is accepted by the existing A5 verifier for the matching branch/commit.

## Validation

```text
node --check src\core\PhaseF1SyncApprovalPacket.js
node --check src\cli\phase-f1-sync-approval-packet.js
node --check tests\phase-f1-sync-approval-packet.test.js
node --test tests\phase-f1-sync-approval-packet.test.js
npm test
```

Results:

```text
targeted_sync_packet_tests=2/2
npm_test=2889/2889
```

## Remaining State

The generator can now produce the current approval text after any future local commit, avoiding stale committed approval packets.

F1 still requires:

1. clean worktree
2. explicit normal non-force push approval
3. successful push
4. fresh synced `main == origin/main`
5. exact A5-GAP-4 approval generated for the synced commit
6. bounded live no-write rerun

F2/F3/F4/F5 remain blocked until accepted F1 live evidence exists.
