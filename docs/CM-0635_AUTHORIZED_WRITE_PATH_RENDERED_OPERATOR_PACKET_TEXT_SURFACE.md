# CM-0635 Authorized Write-Path Rendered Operator Packet Text Surface

Status: COMPLETED_VALIDATED
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-21

## Purpose

Turn the current machine-readable operator packet for the authorized write-path governance chain into one ready-to-read rendered packet text surface, so future operators do not need to mentally merge the current bundle, command preview, selected draft, and exact-line preview by hand.

## What Changed

- `renderedOperatorPacketTextSurface` now exposes one rendered current packet text surface for the same governance chain.
- The rendered packet carries:
  - current `packetKind`
  - current stage
  - next step reference
  - selected current draft id
  - assertion-input trace summary
  - ready-to-read packet markdown
- The same rendered packet text is now available through:
  - `authorized-write-path-auto-authorization`
  - `governance-report`
  - `dashboard`
  - `http-observe`
- The current default blocked state renders `assertion_record_operator_packet`, which keeps the chain anchored on the still-missing `CM-0611` external assertion record.

## Validation

- `node --check .\src\core\AuthorizedWritePathAutoAuthorizationPreflight.js`
- `node --check .\src\cli\authorized-write-path-auto-authorization.js`
- `node --check .\src\cli\governance-report.js`
- `node --check .\src\cli\dashboard.js`
- `node --check .\src\cli\http-observe.js`
- `node --test .\tests\authorized-write-path-auto-authorization-preflight.test.js`
- `node --test .\tests\authorized-write-path-auto-authorization-cli.test.js`
- `node --test .\tests\governance-report-cli.test.js`
- `node --test .\tests\dashboard-cli.test.js`
- `node --test .\tests\http-observe-cli.test.js`
- `npm test`

## Result

The governance chain is still read-only and fail-closed, but future operators can now read one rendered current operator packet instead of stitching together:

- `artifactBundleDraft`
- `commandPreviewBundle`
- `operatorPacketDraft`
- selected rendered draft text
- exact approval-line preview

This does not:

- prove token presence
- issue approval
- execute `CM-0601`
- widen to `CM-0595`
- execute `record_memory`

## Current Truth

Current real default output remains:

```text
allowedGovernanceOutput = NO_AUTO_APPROVAL_ISSUED
decision = RC_NOT_READY_BLOCKED
currentStage = await_cm0611_assertion_record
checklistFailures = [C6]
renderedOperatorPacketTextSurface.packetKind = assertion_record_operator_packet
renderedOperatorPacketTextSurface.previewAvailable = true
renderedOperatorPacketTextSurface.previewUsableNow = true
```
