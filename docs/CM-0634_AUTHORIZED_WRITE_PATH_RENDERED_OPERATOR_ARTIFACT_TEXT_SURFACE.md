# CM-0634 Authorized Write-Path Rendered Operator Artifact Text Surface

Status: COMPLETED_VALIDATED
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-21

## Purpose

Turn the already-structured governance drafts for the current authorized write-path chain into ready-to-read rendered operator text artifacts, so future operators do not need to manually restitch `CM-0611`, `CM-0614`, `CM-0615`, or `CM-0616` from separate JSON fields.

## What Changed

- `renderedArtifactTextSurface` now exposes rendered draft text for:
  - `cm0611AssertionRecord`
  - `cm0614Issuance`
  - `cm0615RoutingOutcome`
  - `cm0616WideningReview`
- `artifactBundleDraft.selectedArtifacts` now carries the same rendered draft text alongside the already-selected current bundle artifacts.
- `operatorPacketDraft.selectedPayload` now carries the same rendered draft text inside the current machine-readable packet.
- The current default blocked state selects `cm0611AssertionRecord` as the rendered draft that is usable now.

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

The governance chain is still read-only and fail-closed, but future operators can now read the current draft artifact itself as rendered text instead of reconstructing it from preview, draft, bundle, and packet fragments.

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
renderedArtifactTextSurface.selectedDraftId = cm0611AssertionRecord
```
