# CM-1246 A5-GAP-6 Template Unit Guard

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1246 hardens the local A5 approval checker template mode so `A5-GAP-6` approval templates reject invalid or duplicated approved evidence units.

This is local CLI/test hardening only. It does not discover approval, grant approval, execute approved commands, run ValidationAggregator, read Git state, start services, call providers, call MCP tools, read real memory, write durable state, push, cut over, or claim readiness.

## Result

Updated:

- `src/cli/a5-approval-check.js`
- `tests/a5-approval-check-cli.test.js`

Template mode now fails closed when:

- `--approved-units` includes unsupported units such as `A5-GAP-999`
- `--approved-units` includes non-`A5-GAP-N` text
- `--approved-units` repeats the same unit

Successful template rendering still has:

- `approvalAccepted=false`
- `authorizationGranted=false`
- `executesApprovedAction=false`
- `runtimeReady=false`
- `rcReady=false`

## Boundary

- no A5-GAP execution
- no strict gate execution
- no ValidationAggregator execution
- no Git command execution by the CLI
- no service start
- no MCP `tools/call`
- no provider call
- no real memory scan
- no durable memory/audit write
- no config/watchdog/startup change
- no dependency or lockfile change
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
node --check src\cli\a5-approval-check.js
node --test tests\a5-approval-check-cli.test.js tests\a5-approval-check-package-entry.test.js tests\a5-approval-line-verifier.test.js tests\no-touch-boundary-regression.test.js
```

Targeted test result: `26/26`.
