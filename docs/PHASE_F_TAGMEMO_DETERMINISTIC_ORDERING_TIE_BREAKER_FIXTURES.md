# Phase F TagMemo Deterministic Ordering Tie-Breaker Fixtures

Status: `FIXTURE_TESTS_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `aa7d28f`

## Purpose

Deepen the synthetic TagMemo semantic association fixture with deterministic ordering and tie-breaker cases. This is fixture/test-only evidence and does not change runtime ranking behavior.

## Added Ordering Scenarios

- `ordering-tie-breaker-recency-stable`: newer synthetic timestamp sorts before older when association class is equal.
- `ordering-tie-breaker-topic-specificity`: specific topic sorts before broad topic when tags are equal.
- `ordering-tie-breaker-no-randomness-negative`: random/provider-dependent ordering claims are rejected.

## Validation

Targeted validation:

```powershell
node --test tests\phase-f-tagmemo-semantic-association-fixture.test.js
```

Also required: docs validation and `git diff --check`.

## Explicit Non-Goals

This slice does not change runtime ordering, execute recall, read real memory stores, call providers, expand public MCP tools, mutate durable state, push, cut over, or claim readiness.

## Result

The project remains:

```text
NOT_READY_BLOCKED
```
