# CM-1245 A5-GAP-6 Approval Template Rendering

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1245 adds a read-only template mode to the local A5 approval checker for `A5-GAP-6` exact approval lines.

This is local CLI/test hardening only. It does not discover approval, grant approval, execute approved commands, run ValidationAggregator, read Git state, start services, call providers, call MCP tools, read real memory, write durable state, push, cut over, or claim readiness.

## Result

Updated:

- `src/cli/a5-approval-check.js`
- `tests/a5-approval-check-cli.test.js`

New local-only usage:

```powershell
npm run a5:approval-check -- --template --expected-unit A5-GAP-6 --expected-branch main --expected-commit <FRESH_HEAD> --approved-units A5-GAP-1,A5-GAP-2,A5-GAP-3,A5-GAP-4,A5-GAP-5 --included-evidence P66_A5_GAP_2_SANITIZED_CLASSIFIED_SAMPLE_WRITE_EVIDENCE.md --no-new-runtime-action
```

The rendered template still has:

- `approvalAccepted=false`
- `authorizationGranted=false`
- `executesApprovedAction=false`
- `runtimeReady=false`
- `rcReady=false`

CLI exit code `0` in template mode only means the template rendered successfully. It is not approval and does not authorize execution.

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

Targeted test result: `23/23`.
