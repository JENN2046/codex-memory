# CM-0647 Authorized Write-Path Widening-Adoption Record Input Bridge

Status: LOCAL_GOVERNANCE_BRIDGE_ADDED
Decision: CM0647_WIDENING_ADOPTION_RECORD_INPUT_BRIDGE_ADDED
Date: 2026-05-21

## Purpose

This note records the next local-safe governance-only step after `CM-0646`.

`CM-0646` already let widening adoption consume a real `CM-0616` widening-review artifact.

`CM-0647` advances the next layer:

- widening adoption no longer has to infer the later explicit `CM-0607` decision from fixture-only fields
- the same read-only widening-adoption path can now consume a real `CM-0607` widening-adoption record directly
- the same result is now available through the standalone helper and the normal read-only control surfaces

It does not prove token presence.

It does not issue runtime approval.

It does not execute `CM-0595`.

It does not execute `record_memory`.

## Added Local Surfaces

The widening-adoption layer now also carries:

- `src/core/WideningAdoptionRecordAdapter.js`
- `src/cli/authorized-write-path-widening-adoption-review.js`
- `src/cli/governance-report.js`
- `src/cli/dashboard.js`
- `src/cli/http-observe.js`

Supporting fixtures/tests now also include:

- `tests/fixtures/cm0607-widening-adoption-record-v1.json`
- `tests/fixtures/cm0607-widening-adoption-record-v1.md`
- `tests/widening-adoption-record-adapter.test.js`
- updated widening-adoption helper / governance / dashboard / http-observe CLI tests

## What The New Layer Does

This bridge is intentionally narrow and fail-closed.

It allows a future filled `CM-0607` widening-adoption record to supply:

- explicit widening-adoption decision provenance
- same-baseline endpoint/startup evidence references
- same-baseline token-presence evidence references
- routed-outcome class for the widening path
- scope-still-limited-to-`CM-0595` confirmation
- explicit `futureAutoAuthorizationWideningAdopted` state
- resulting-allowance text

This is enough to let widening adoption consume a real adoption artifact instead of relying only on a base fixture or manual boolean overrides.

## What The New Layer Does Not Do

This bridge does not itself prove that the current real workspace/session has reached that state.

In particular, it does not by itself prove:

- current-session token material is really present now
- the current same-baseline token-present evidence is real rather than hypothetical fixture input
- runtime execution may proceed now

So the bridge can move widening adoption from:

```text
WIDENING_ADOPTION_NOT_READY
```

to:

```text
WIDENING_ADOPTION_GRANTED_CM0595_ONLY
```

inside governance-only explicit-input evaluation, but it still remains read-only and non-executing.

## Current Verified Reading

Current verified behavior is:

- default widening-adoption state still remains `WIDENING_ADOPTION_NOT_READY / RC_NOT_READY_BLOCKED`
- with explicit `CM-0616` widening-review input alone, `A4` can pass while `A6` and `A10` still fail
- with explicit `CM-0616` plus explicit `CM-0607` adoption-record input, the governance-only evaluator can now reach `WIDENING_ADOPTION_GRANTED_CM0595_ONLY`
- even in that explicit-input granted case, the helper still reports `canExecuteRuntimeNow=false`

That means the chain is now better connected and can represent the later grant boundary directly, but it still does not execute it.

## Validation

Validated locally with:

- `node --check .\src\core\WideningAdoptionRecordAdapter.js`
- `node --check .\src\cli\authorized-write-path-widening-adoption-review.js`
- `node --check .\src\cli\governance-report.js`
- `node --check .\src\cli\dashboard.js`
- `node --check .\src\cli\http-observe.js`
- `node --test .\tests\widening-adoption-record-adapter.test.js`
- `node --test .\tests\authorized-write-path-widening-adoption-review-cli.test.js`
- `node --test .\tests\governance-report-cli.test.js`
- `node --test .\tests\dashboard-cli.test.js`
- `node --test .\tests\http-observe-cli.test.js`
- `node .\src\cli\authorized-write-path-widening-adoption-review.js --json --widening-review-record .\tests\fixtures\cm0616-widening-review-outcome-record-v1.md --widening-adoption-record .\tests\fixtures\cm0607-widening-adoption-record-v1.md`
- `node .\src\cli\governance-report.js --json --widening-adoption-review-record .\tests\fixtures\cm0616-widening-review-outcome-record-v1.md --widening-adoption-record .\tests\fixtures\cm0607-widening-adoption-record-v1.md`
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
