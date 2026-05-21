# CM-0645 Authorized Write-Path Widening-Review Routing-Outcome Record Input Bridge

Status: LOCAL_GOVERNANCE_BRIDGE_ADDED
Decision: CM0645_WIDENING_REVIEW_ROUTING_RECORD_INPUT_BRIDGE_ADDED
Date: 2026-05-21

## Purpose

This note records a narrow governance-only improvement:

- widening-review no longer has to depend only on its standalone JSON fixture
- the read-only widening-review path can now consume a real `CM-0615` routing-outcome artifact directly
- the same artifact can now flow through the helper CLI and the normal read-only control surfaces

It does not prove token presence.

It does not grant widening.

It does not authorize `CM-0595`.

It does not execute `CM-0601`.

It does not execute `record_memory`.

## Added Local Surfaces

The bridge is now carried by:

- `src/core/RoutingOutcomeRecordAdapter.js`
- `src/cli/authorized-write-path-widening-review.js`
- `src/cli/governance-report.js`
- `src/cli/dashboard.js`
- `src/cli/http-observe.js`

Supporting fixtures/tests now include:

- `tests/fixtures/cm0605-routing-outcome-record-v1.json`
- `tests/fixtures/cm0605-routing-outcome-record-v1.md`
- `tests/routing-outcome-record-adapter.test.js`
- updated widening-review / governance / dashboard / http-observe CLI tests

## What The Bridge Does

The bridge is intentionally narrow and fail-closed.

It allows a future filled `CM-0615` routing-outcome record to supply:

- routed outcome availability
- routed outcome decision
- routed outcome record provenance
- routed outcome target baseline

This is enough to let widening-review consume a real routed outcome artifact instead of relying only on a standalone fixture.

## What The Bridge Does Not Do

This bridge does not let `CM-0615` satisfy all widening-review prerequisites.

In particular, it does not by itself prove:

- same-baseline token-present evidence
- bounded durable-write crossing approval
- widening adoption

So the bridge can move widening-review from:

```text
routing_outcome_not_escalated
```

to a later blocked state, but it still remains fail-closed unless the missing later evidence also exists.

## Current Verified Reading

Current verified behavior is:

- default widening-review state still remains `WIDENING_REVIEW_NOT_READY`
- with explicit `CM-0615` routed escalation input, `W4` can now pass
- widening-review still remains blocked on later items such as same-baseline token-present evidence and bounded durable-write crossing

That means the chain is now better connected, but not widened.

## Validation

Validated locally with:

- `node --check` on the new adapter and changed CLIs
- `node --test .\tests\routing-outcome-record-adapter.test.js`
- `node --test .\tests\authorized-write-path-widening-review-cli.test.js`
- `node --test .\tests\governance-report-cli.test.js`
- `node --test .\tests\dashboard-cli.test.js`
- `node --test .\tests\http-observe-cli.test.js`
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

Do not treat this bridge as widening adoption.

The next real prerequisite is still external:

- token material must independently enter the current session

Only after that should the chain:

1. record the external assertion through `CM-0611`
2. route auto-authorization through `CM-0605`
3. record the routed outcome through `CM-0615`
4. use the widening-review path against that real routed artifact

Until then, this bridge remains governance-only preparation.
