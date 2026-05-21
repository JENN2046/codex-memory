# CM-0652 Authorized Write-Path CM0595 Approval Issuance Record Input Bridge

Status: COMPLETED_VALIDATED
Decision: GOVERNANCE_ONLY_CM0595_ISSUANCE_RECORD_INPUT_BRIDGE_ADDED
Date: 2026-05-21

## Purpose

This note records the next aligned governance step after `CM-0651`.

`CM-0651` already exposed the future `CM-0595` issuance/evidence drafts once explicit widening inputs reach:

```text
WIDENING_ADOPTION_GRANTED_CM0595_ONLY
```

But the same widening-adoption path still could not consume a real later `CM-0649` issuance artifact.

That left one gap:

- a future issued `CM-0595` line could be drafted
- but its later issuance artifact still had to be restated manually instead of being fed back into the same governance chain

This slice closes that bridge.

## What Changed

The widening-adoption layer now also accepts a real `CM-0649` issuance record through:

- `src/core/Cm0595ApprovalIssuanceRecordAdapter.js`
- `src/core/AuthorizedWritePathWideningAdoptionReview.js`
- `src/cli/authorized-write-path-widening-adoption-review.js`
- `src/cli/governance-report.js`
- `src/cli/dashboard.js`
- `src/cli/http-observe.js`

Supporting fixtures/tests now also include:

- `tests/fixtures/cm0649-cm0595-approval-issuance-record-v1.json`
- `tests/fixtures/cm0649-cm0595-approval-issuance-record-v1.md`
- `tests/cm0595-approval-issuance-record-adapter.test.js`
- updated widening-adoption helper / governance / dashboard / http-observe CLI tests

The same path now exposes:

- `cm0595IssuanceRecordInputTrace`

and feeds that provenance into:

- `cm0595IssuanceRecordDraft`
- `cm0595ExecutionEvidenceDraft`
- `renderedCm0595OperatorPacketTextSurface`

## What The New Layer Does

This bridge is intentionally narrow and fail-closed.

It allows a future filled `CM-0649` issuance artifact to supply:

- exact `CM-0595` line issuance provenance
- issued-line text confirmation
- same-baseline binding references
- non-execution confirmation
- later `CM-0650` evidence draft provenance

That is enough to let the same governance-only path consume a real issuance artifact instead of keeping issuance state prose-only.

## What The New Layer Does Not Do

This bridge does not itself prove that runtime execution may proceed.

In particular, it does not by itself prove:

- current-session token material is really present now
- the current same-baseline token-present evidence is real rather than hypothetical
- `CM-0595` may execute now
- `record_memory` may execute now

So even when an explicit `CM-0649` issuance artifact is present, the path still remains governance-only and non-executing.

## Current Verified Reading

Current verified behavior is:

- default real widening-adoption state still remains `WIDENING_ADOPTION_NOT_READY / RC_NOT_READY_BLOCKED`
- with explicit `CM-0616 + CM-0607` inputs, the governance-only evaluator reaches `WIDENING_ADOPTION_GRANTED_CM0595_ONLY`
- with explicit `CM-0616 + CM-0607 + CM-0649` inputs, the same governance-only evaluator now also carries `cm0595IssuanceRecordInputTrace.traceAvailable = true`
- even in that later-stage explicit-input case, the helper still reports `canAutoAuthorizeCm0595 = true` and `canExecuteRuntimeNow = false`

That means the chain now preserves later issuance provenance directly, but still does not execute runtime work.

## Validation

Validated locally with:

- `node --check .\src\core\Cm0595ApprovalIssuanceRecordAdapter.js`
- `node --check .\src\core\AuthorizedWritePathWideningAdoptionReview.js`
- `node --check .\src\cli\authorized-write-path-widening-adoption-review.js`
- `node --check .\src\cli\governance-report.js`
- `node --check .\src\cli\dashboard.js`
- `node --check .\src\cli\http-observe.js`
- `node --test .\tests\cm0595-approval-issuance-record-adapter.test.js`
- `node --test .\tests\authorized-write-path-widening-adoption-review.test.js`
- `node --test .\tests\authorized-write-path-widening-adoption-review-cli.test.js`
- `node --test .\tests\governance-report-cli.test.js`
- `node --test .\tests\dashboard-cli.test.js`
- `node --test .\tests\http-observe-cli.test.js`
- `node .\src\cli\authorized-write-path-widening-adoption-review.js --json --widening-review-record .\tests\fixtures\cm0616-widening-review-outcome-record-v1.md --widening-adoption-record .\tests\fixtures\cm0607-widening-adoption-record-v1.md --cm0595-issuance-record .\tests\fixtures\cm0649-cm0595-approval-issuance-record-v1.md`
- `node .\src\cli\governance-report.js --json --widening-adoption-review-record .\tests\fixtures\cm0616-widening-review-outcome-record-v1.md --widening-adoption-record .\tests\fixtures\cm0607-widening-adoption-record-v1.md --cm0595-issuance-record .\tests\fixtures\cm0649-cm0595-approval-issuance-record-v1.md`
- `npm test`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

## Result

Result:

```text
COMPLETED_VALIDATED
```

But the controlling state remains:

```text
RC_NOT_READY_BLOCKED
```

## Next Safe Action

Do not treat this bridge as runtime authorization.

The next real prerequisites are still external/governance:

- token material must independently enter the current session
- same-baseline token-present evidence must really exist
- the real chain must first route through `CM-0605`, then through `CM-0604`, then through a real `CM-0616` review record, then through a real `CM-0607` adoption record

Only after that should the chain consider the later narrow `CM-0595` boundary.

Until then, this layer remains governance-only preparation.
