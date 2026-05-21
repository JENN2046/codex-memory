# CM-0620 Authorized Write-Path Auto-Authorization Approval Preview Surface

Status: COMPLETED_VALIDATED_NOT_READY
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-20

## Purpose

Expose the exact future `CM-0601` approval line as a structured, read-only preview through the existing governance-only evaluator and operator control surfaces.

This slice does not:

- issue approval
- execute `CM-0601`
- authorize `CM-0595`
- call `record_memory`
- call `search_memory`
- bind token material
- start HTTP
- probe `/health`
- read `.jsonl`
- widen any current governance boundary

Its scope is narrower:

- preserve the exact `CM-0601` line in executable output instead of only prose docs
- let future operators reuse the same preview from CLI / governance surfaces without manual reassembly
- keep the current chain read-only, fixture-backed, and fail-closed

## Implemented Surface

The current governance-only outputs now include a structured approval preview payload:

- `src/core/AuthorizedWritePathAutoAuthorizationPreflight.js`
- `src/cli/authorized-write-path-auto-authorization.js`
- `src/cli/governance-report.js`
- `src/cli/dashboard.js`
- `src/cli/http-observe.js`

The preview payload carries:

- `previewAvailable`
- `previewUsableNow`
- `exactApprovalLine`
- `sourceRef`
- `issuanceRecordTemplateRef`
- `executionEvidenceTemplateRef`
- `operatorSequenceRef`
- `routingOutcomeTemplateRef`

This does not change the allowed governance outputs:

1. `NO_AUTO_APPROVAL_ISSUED`
2. `AUTO_REUSE_CM0601_LINE_ONLY`
3. `ESCALATE_FOR_FUTURE_WIDENING_REVIEW`

## Current Result

Current default fixture-backed result remains:

```text
allowedGovernanceOutput = NO_AUTO_APPROVAL_ISSUED
decision = RC_NOT_READY_BLOCKED
currentBlockedOn = external_token_assertion_not_accepted
approvalLinePreview.previewAvailable = true
approvalLinePreview.previewUsableNow = false
```

So the exact line is now machine-readable and operator-readable, but still not issued and still not executable today.

## Validation

- `node --test .\tests\authorized-write-path-auto-authorization-preflight.test.js`
- `node --test .\tests\authorized-write-path-auto-authorization-cli.test.js`
- `node --test .\tests\governance-report-cli.test.js`
- `node --test .\tests\dashboard-cli.test.js`
- `node --test .\tests\http-observe-cli.test.js`
- `npm test`
- `git diff --check`

## Result

`CM-0620` reduces future manual assembly cost without widening authority:

- the exact `CM-0601` line no longer needs to be recopied from docs by hand
- the preview is still read-only
- the preview is still fail-closed
- the chain still remains `RC_NOT_READY_BLOCKED`
- `CM-0595` still remains outside automatic authorization
