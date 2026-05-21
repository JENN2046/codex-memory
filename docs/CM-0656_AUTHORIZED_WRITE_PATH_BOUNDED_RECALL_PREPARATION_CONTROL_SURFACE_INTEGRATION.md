# CM-0656 Authorized Write-Path Bounded Recall Preparation Control-Surface Integration

Status: COMPLETED_VALIDATED
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-21

## Purpose

`CM-0656` records the next local-safe step after `CM-0655`.

`CM-0655` already turned the future bounded-recall preparation boundary into a standalone explicit-input, read-only, fail-closed evaluator and CLI.

`CM-0656` carries that same bounded-recall preparation result into the normal read-only operator surfaces:

- `node .\src\cli\governance-report.js`
- `node .\src\cli\dashboard.js`
- `node .\src\cli\http-observe.js`

This means future bounded-recall preparation state no longer depends on:

- prose-only review
- a standalone helper only
- manual cross-checking between the dedicated bounded-recall helper and the normal control surfaces

Instead, the normal control surfaces now expose the same bounded-recall preparation layer directly.

## What changed

The following surfaces now include bounded-recall preparation state:

- `governance-report`
- `dashboard`
- `http-observe`

They expose:

- current bounded-recall preparation status
- current bounded-recall preparation decision
- fail-closed blocked reasons
- next-step references
- optional rendered bounded-recall text
- later `CM-0649` issuance provenance when supplied
- later `CM-0650` execution-evidence provenance when supplied

They also support:

- `--bounded-recall-preparation-fixture`
- `--rendered-bounded-recall-text`

## Current real result

Current real default bounded-recall preparation state remains blocked:

```text
status = blocked_fail_closed
decision = BOUNDED_RECALL_APPROVAL_NOT_READY
controllingState = RC_NOT_READY_BLOCKED
```

Current default blocked reasons remain:

- `cm0595_closeout_not_recorded`
- `bounded_recall_exact_approval_not_yet_prepared`
- `bounded_recall_execution_not_granted`

So this integration does **not**:

- prove token presence
- issue approval
- execute bounded recall
- execute `search_memory`
- execute `CM-0595`
- execute `record_memory`

It only makes the future bounded-recall preparation result visible through the same read-only operator surfaces that already expose the current auto-authorization, widening-review, and widening-adoption layers.

## Validation

- `node --check .\src\cli\governance-report.js`
- `node --check .\src\cli\dashboard.js`
- `node --check .\src\cli\http-observe.js`
- `node --test .\tests\governance-report-cli.test.js`
- `node --test .\tests\dashboard-cli.test.js`
- `node --test .\tests\http-observe-cli.test.js`
- `node .\src\cli\governance-report.js --json`
- `node .\src\cli\dashboard.js --json --summary-only`
- `node .\src\cli\http-observe.js --json`

## Boundaries preserved

`CM-0656` is still:

- explicit-input
- read-only
- fail-closed
- governance-only

It does not change the controlling state:

```text
RC_NOT_READY_BLOCKED
```

## Next

Keep `CM-0655` as the bounded-recall preparation evaluator itself.

Keep `CM-0656` as the control-surface integration layer that exposes the same bounded-recall preparation result through normal read-only operator surfaces.

Do not prepare or execute bounded recall until:

1. token material independently exists in the current session
2. the same-baseline chain first reaches later `CM-0595` closeout
3. bounded-recall preparation itself reaches exact-approval-ready state
4. a separate future exact bounded-recall approval is explicitly granted
