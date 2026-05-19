# Phase F TagMemo Controlled Query Expansion Negative Fixtures

Status: `FIXTURE_TESTS_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `27af924`

## Purpose

Deepen the Phase F TagMemo semantic association fixture contract with controlled query-expansion negative cases. This adds synthetic fixture scenarios only; it does not change runtime recall behavior.

## Added Negative Scenarios

- `query-expansion-tag-collision-negative`: blocks generic tag collision from outranking specific TagMemo association.
- `query-expansion-topic-neighbor-negative`: blocks nearby-but-distinct topic expansion without explicit neighbor metadata.
- `query-expansion-provider-score-negative`: blocks any dependency on hidden provider score or embedding output.

## Validation

Targeted validation:

```powershell
node --test tests\phase-f-tagmemo-semantic-association-fixture.test.js
```

Also required: docs validation and `git diff --check`.

## Explicit Non-Goals

This slice does not change source/runtime behavior, execute recall, read real memory stores, call providers, expand public MCP tools, mutate durable state, push, cut over, or claim readiness.

## Result

The project remains:

```text
NOT_READY_BLOCKED
```
