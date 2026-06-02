# CM-1372 Phase F Snapshot Approval Template Surfacing

Status: `COMPLETED_VALIDATED_NOT_READY`

Date: 2026-06-02

## Scope

CM-1372 extends the read-only Phase F personal RC readiness snapshot with the current F1 sync approval templates.

This is local source/CLI/test/docs/board work only. It does not push, pull, merge, rebase, rerun F1, execute F2/F3/F4/F5, call MCP, call providers, read real memory/audit data, write durable memory/audit data, change config/watchdog/startup, expand public MCP tools, grant approval, or claim runtime/RC readiness.

## Change

`src/core/PhaseFPersonalRcReadinessSnapshot.js` now emits:

```text
approvalTemplates.pushApprovalTemplate
approvalTemplates.postPushA5Gap4ApprovalTemplate
approvalTemplates.postPushA5Gap4TemplateCurrentlyUsable
approvalTemplates.postPushA5UsabilityStatus
```

`src/cli/phase-f-personal-rc-readiness-snapshot.js` prints the same fields in text mode.

These templates are evidence-routing aids only. They do not grant approval and do not execute any remote or runtime action.

## Validation

```text
node --check src\core\PhaseFPersonalRcReadinessSnapshot.js
node --check src\cli\phase-f-personal-rc-readiness-snapshot.js
node --check tests\phase-f-personal-rc-readiness-snapshot.test.js
node --test tests\phase-f-personal-rc-readiness-snapshot.test.js
node src\cli\phase-f-personal-rc-readiness-snapshot.js --json --pretty
node src\cli\phase-f-personal-rc-readiness-snapshot.js
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Results:

```text
targeted_snapshot_tests=4/4
cli_template_surface_self_check=passed
npm_test=2894/2894
ledger_consistency=passed
docs_validation=passed
```

Development-state CLI self-check correctly reports dirty worktree while the patch is uncommitted. It still reports `readinessClaimAllowed=false`, `rcReady=false`, and zero side-effect counters.

## Remaining State

F1 still requires explicit normal non-force push approval, successful push, fresh synced HEAD, exact A5-GAP-4 approval, and bounded live no-write rerun.

F2/F3/F4/F5 remain blocked until accepted F1 live evidence exists.
