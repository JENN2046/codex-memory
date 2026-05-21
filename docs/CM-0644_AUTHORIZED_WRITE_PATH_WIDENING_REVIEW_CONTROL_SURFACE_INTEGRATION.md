## CM-0644 Authorized Write-Path Widening Review Control-Surface Integration

`CM-0644` records the next local-safe step after `CM-0643`.

`CM-0643` already turned the future `CM-0604` widening-review gate into a standalone explicit-input, read-only, fail-closed evaluator and CLI.

`CM-0644` carries that same widening-review result into the normal read-only operator surfaces:

- `node .\src\cli\governance-report.js`
- `node .\src\cli\dashboard.js`
- `node .\src\cli\http-observe.js`

This means future widening-review state no longer depends on:

- prose-only review
- a standalone helper only
- manual cross-checking between a dedicated widening CLI and the normal control surfaces

Instead, the normal control surfaces now expose the same widening-review layer directly.

## What changed

The following surfaces now include widening-review state:

- `governance-report`
- `dashboard`
- `http-observe`

They expose:

- current widening-review status
- current widening-review decision
- fail-closed blocked reasons
- next-step references
- optional rendered widening-review text

## Current real result

Current real default widening-review state remains blocked:

```text
status = blocked_fail_closed
decision = WIDENING_REVIEW_NOT_READY
controllingState = RC_NOT_READY_BLOCKED
```

Current default blocked reasons remain:

- `routing_outcome_not_escalated`
- `token_present_same_baseline_evidence_missing`
- `bounded_durable_write_crossing_not_granted`

So this integration does **not**:

- prove token presence
- issue approval
- execute `CM-0601`
- widen to `CM-0595`
- execute `record_memory`

It only makes the future widening-review result visible through the same read-only operator surfaces that already expose the current auto-authorization chain.

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

`CM-0644` is still:

- explicit-input
- read-only
- fail-closed
- governance-only

It does not change the controlling state:

```text
RC_NOT_READY_BLOCKED
```

## Next

Keep `CM-0643` as the widening-review evaluator itself.

Keep `CM-0644` as the control-surface integration layer that exposes the same widening-review result through normal read-only operator surfaces.

Do not advance to `CM-0595` until:

1. token material independently exists in the current session
2. the same-baseline chain first reaches a routed widening-review outcome
3. widening review itself passes
4. later adoption explicitly grants widening
