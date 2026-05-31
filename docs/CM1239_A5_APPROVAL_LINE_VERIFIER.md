# CM-1239 A5 Approval Line Verifier

Date: 2026-05-31

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1239 adds a local, explicit-input verifier for A5 approval lines.

The verifier is a safety helper only. It does not issue approval, execute commands, start services, call providers, call MCP tools, read real memory, write durable state, push, cut over, or claim readiness.

## Result

Added:

- `src/core/A5ApprovalLineVerifier.js`
- `tests/a5-approval-line-verifier.test.js`

The verifier checks:

- exact A5 unit shape
- expected branch
- expected commit
- placeholder rejection
- stale commit rejection
- unit reuse rejection
- broader wording rejection

For CM-1238, the intended accepted line shape is:

```text
I approve A5-GAP-5 for codex-memory on branch main at commit f5bca6fced661b91f00b17f5a3e783ad5695e5d6, running cutover-context strict gate only, no remote write.
```

This line still requires the user to provide it. CM-1239 does not approve it automatically.

## Boundary

This is source/test only:

- no A5-GAP execution
- no strict gate execution
- no service start
- no MCP `tools/call`
- no provider call
- no real memory scan
- no durable memory/audit write
- no config/watchdog/startup change
- no package or dependency change
- no remote action
- no readiness claim

The project remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```

## Validation

Passed:

```powershell
node --check src\core\A5ApprovalLineVerifier.js
node --test tests\a5-approval-line-verifier.test.js tests\no-touch-boundary-regression.test.js
```

Targeted test result: `9/9`.

