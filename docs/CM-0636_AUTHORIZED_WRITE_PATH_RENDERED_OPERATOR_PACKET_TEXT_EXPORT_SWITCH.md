# CM-0636 Authorized Write-Path Rendered Operator Packet Text Export Switch

Status: COMPLETED_VALIDATED
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-21

## Purpose

Expose the already-existing `renderedOperatorPacketTextSurface.markdown` through one consistent opt-in text export switch, so operators can read the full current governance packet directly from the normal read-only CLIs instead of pulling JSON and extracting the field by hand.

## What Changed

- Added `--rendered-operator-packet-text` to:
  - `authorized-write-path-auto-authorization`
  - `governance-report`
  - `dashboard`
  - `http-observe`
- When the switch is used in text mode, the CLI now appends:
  - `[rendered-operator-packet-text]`
  - the current `renderedOperatorPacketTextSurface.markdown`
- JSON output remains unchanged.
- Governance decisions remain unchanged.
- The switch is read-only and fail-closed; it exports text that already exists in the governance surface and does not generate new runtime evidence.

## Validation

- `node --check .\src\cli\authorized-write-path-auto-authorization.js`
- `node --check .\src\cli\governance-report.js`
- `node --check .\src\cli\dashboard.js`
- `node --check .\src\cli\http-observe.js`
- `node --test .\tests\authorized-write-path-auto-authorization-cli.test.js`
- `node --test .\tests\governance-report-cli.test.js`
- `node --test .\tests\dashboard-cli.test.js`
- `node --test .\tests\http-observe-cli.test.js`
- `npm test`

## Result

The current operator packet is now exportable as ready-to-read text from the same read-only CLIs that already expose the governance result.

This does not:

- prove token presence
- accept any external assertion
- issue approval
- execute `CM-0601`
- widen to `CM-0595`
- execute `record_memory`

## Current Truth

Current default governance result remains:

```text
allowedGovernanceOutput = NO_AUTO_APPROVAL_ISSUED
decision = RC_NOT_READY_BLOCKED
currentStage = await_cm0611_assertion_record
checklistFailures = [C6]
renderedOperatorPacketTextSurface.packetKind = assertion_record_operator_packet
```

This slice only makes that current packet text easier to export from the operator-facing read-only CLIs.
