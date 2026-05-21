# Phase F Memory Lifecycle Proposal States Fixture Tests

Status: `FIXTURE_TESTS_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Scope: Phase F synthetic fixture/test-only memory lifecycle proposal state transitions

## Purpose

This slice adds a synthetic fixture and structure-only test for memory lifecycle proposal states.

It covers proposal, supersession, tombstone, forget-flow, and lifecycle state transitions without executing runtime mutation, reading real memory stores, calling providers, expanding public MCP tools, writing durable state, changing config, pushing, cutting over, or claiming readiness.

## Added Artifacts

```text
tests/fixtures/phase-f-memory-lifecycle-proposal-states-v1.json
tests/phase-f-memory-lifecycle-proposal-states-fixture.test.js
```

## Covered Semantics

- Proposal draft, review-ready, rejected, and exact-approval states.
- Supersession proposed, review-ready, and applied-with-audit states.
- Tombstone proposed, review-ready, and applied-with-audit states.
- Forget requested, review-ready, and applied-with-audit states.
- Blocked direct-apply transitions.
- Readiness and authority overclaim rejection.

## Validation

Targeted validation:

```powershell
node --test tests\phase-f-memory-lifecycle-proposal-states-fixture.test.js
```

Combined Phase F fixture validation should include this test alongside the existing fixture packs.

## Boundary

This is fixture/test-only evidence. It does not prove lifecycle runtime behavior, real memory governance readiness, provider/profile quality, production readiness, final RC readiness, cutover readiness, or `RC_READY`.

Public MCP tools remain frozen:

```text
record_memory
search_memory
memory_overview
```

## Result

The memory lifecycle proposal-state transition contract is locally represented, but the project remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
