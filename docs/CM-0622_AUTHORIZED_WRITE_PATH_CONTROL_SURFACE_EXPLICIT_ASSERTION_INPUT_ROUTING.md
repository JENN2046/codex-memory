# CM-0622 Authorized Write-Path Control-Surface Explicit Assertion Input Routing

Status: COMPLETED_VALIDATED_NOT_READY
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-20

## Purpose

Carry the new `CM-0621` explicit assertion-record input path into the normal read-only operator surfaces.

This slice does not:

- prove token presence
- issue approval
- execute `CM-0601`
- authorize `CM-0595`
- call `record_memory`
- call `search_memory`
- bind token material
- start HTTP
- probe `/health`
- read `.jsonl`

Its scope is narrower:

- let `governance-report` accept an explicit assertion record
- let `dashboard` pass the same read-only input through
- let `http-observe` pass the same read-only input through
- keep all three surfaces fail-closed
- preserve the current output ceiling:
  - `NO_AUTO_APPROVAL_ISSUED`
  - `AUTO_REUSE_CM0601_LINE_ONLY`
  - `ESCALATE_FOR_FUTURE_WIDENING_REVIEW`

## Implemented Local Artifacts

- updated `src/cli/governance-report.js`
- updated `src/cli/dashboard.js`
- updated `src/cli/http-observe.js`
- updated `tests/governance-report-cli.test.js`
- updated `tests/dashboard-cli.test.js`
- updated `tests/http-observe-cli.test.js`

## Control-Surface Boundary

The read-only operator surfaces now accept:

```text
node .\src\cli\governance-report.js --json --auto-auth-assertion-record <path>
node .\src\cli\dashboard.js --json --summary-only --auto-auth-assertion-record <path>
node .\src\cli\http-observe.js --json --auto-auth-assertion-record <path>
```

They also allow the same read-only future-state override already accepted by the helper path:

```text
--auto-auth-latest-rebound-outcome-class token_present
```

If the assertion record is malformed, missing, or paired with an unsupported override, the surfaces fail closed instead of widening authority.

## Current Result

Current default result is still unchanged:

```text
NO_AUTO_APPROVAL_ISSUED
RC_NOT_READY_BLOCKED
external_token_assertion_not_accepted
```

The new capability is routing-only:

- future operators can feed a `CM-0611`-style assertion record directly into normal read-only control surfaces
- those surfaces now expose the same `CM-0618/CM-0620/CM-0621` governance result as the direct helper CLI
- no surface now auto-authorizes `CM-0595`
- no surface now executes runtime actions

## Validation

- `node --check .\src\cli\governance-report.js`
- `node --check .\src\cli\dashboard.js`
- `node --check .\src\cli\http-observe.js`
- `node --test .\tests\governance-report-cli.test.js`
- `node --test .\tests\dashboard-cli.test.js`
- `node --test .\tests\http-observe-cli.test.js`

## Result

`CM-0622` closes the remaining operator-surface input gap in the current governance chain:

- direct helper CLI and normal read-only surfaces now accept the same structured external assertion input
- preview, checklist/routing result, and fail-closed decision can now be observed through the standard control surfaces
- authority still does not widen beyond `CM-0601`
- runtime state still remains `RC_NOT_READY_BLOCKED`
- `CM-0595` still remains outside automatic authorization
