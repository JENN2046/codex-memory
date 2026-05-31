# CM-1244 A5-GAP-6 Approval Scope Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1244 makes the local A5 approval checker expose structured A5-GAP-6 approved evidence units from an exact approval line.

This is local source/test hardening only. It does not grant approval, execute approved commands, run ValidationAggregator, start services, call providers, call MCP tools, read real memory, write durable state, push, cut over, or claim readiness.

## Result

Updated:

- `src/core/A5ApprovalLineVerifier.js`
- `tests/a5-approval-line-verifier.test.js`
- `tests/a5-approval-check-cli.test.js`

The verifier now returns `parsedApprovalScope` for `A5-GAP-6` lines:

- `approvedEvidenceUnits`
- `approvedEvidenceUnitCount`
- `includedEvidenceFile`
- `noNewRuntimeAction`

This keeps later A5-GAP-6 preflight checks from relying only on hand-parsed comma-separated text.

## Boundary

- no A5-GAP execution
- no strict gate execution
- no ValidationAggregator execution
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
node --check src\core\A5ApprovalLineVerifier.js
node --check src\cli\a5-approval-check.js
node --test tests\a5-approval-line-verifier.test.js tests\a5-approval-check-cli.test.js tests\a5-approval-check-package-entry.test.js tests\no-touch-boundary-regression.test.js
```

Targeted test result: `21/21`.
