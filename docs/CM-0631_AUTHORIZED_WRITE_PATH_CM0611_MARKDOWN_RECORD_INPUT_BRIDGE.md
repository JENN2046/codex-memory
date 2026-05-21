# CM-0631 Authorized Write-Path CM0611 Markdown Record Input Bridge

Status: COMPLETED_VALIDATED_NOT_READY
Decision: CM0611_MARKDOWN_INPUT_ACCEPTED_READ_ONLY
Date: 2026-05-21

## Purpose

`CM-0621` already let the governance-only helper consume a structured external assertion record.

But that still left one operator-facing gap:

- the helper/control surfaces expected JSON-shaped assertion input
- the real operator artifact is much more likely to be a filled `CM-0611` Markdown note
- future automation would otherwise still need a manual Markdown-to-JSON transcode step

`CM-0631` closes only that bridge.

## Scope

This work remains governance-only and fail-closed.

It does not:

- prove token presence
- bind or print token material
- issue approval
- execute `CM-0601`
- widen to `CM-0595`
- call `record_memory`
- touch runtime/config/provider state

## Result

The same read-only assertion-input path now accepts:

- JSON assertion records
- filled `CM-0611` Markdown assertion records

through one loader path.

Current helper/control-surface consumers can now read a filled `CM-0611` Markdown note directly:

- `authorized-write-path-auto-authorization.js --assertion-record <path>`
- `governance-report.js --auto-auth-assertion-record <path>`
- `dashboard.js --auto-auth-assertion-record <path>`
- `http-observe.js --auto-auth-assertion-record <path>`

No separate JSON rewrite is required before the same fail-closed chain is evaluated.

## Current Runtime Truth

Default truth remains unchanged:

```text
allowedGovernanceOutput = NO_AUTO_APPROVAL_ISSUED
decision = RC_NOT_READY_BLOCKED
currentBlockedOn = external_token_assertion_not_accepted
```

The new bridge only means that, once a future operator truly fills `CM-0611`, the same governance path can consume that Markdown artifact directly.

## Validation

Validated with:

- targeted adapter / CLI / governance-report tests
- direct helper CLI check against the Markdown fixture
- full `npm test`
- `git diff --check`
- local docs validation

## Next Safe Action

Wait for token material to independently exist in the current session.

After that, future operators can:

1. fill `CM-0611` as Markdown
2. feed that same Markdown artifact directly into the existing governance-only evaluation path
3. decide whether the chain stays blocked, reuses `CM-0601`, or escalates into widening review

Until then, keep `RC_NOT_READY_BLOCKED`.
