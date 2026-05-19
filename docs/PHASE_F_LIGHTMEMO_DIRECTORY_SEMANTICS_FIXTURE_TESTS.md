# Phase F LightMemo Directory Semantics Fixture Tests

Status: `FIXTURE_TESTS_ADDED`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `42e7113`

## Scope

This slice adds a synthetic fixture and structure-only test for Phase F LightMemo directory semantics.

Added files:

```text
tests/fixtures/phase-f-lightmemo-directory-semantics-v1.json
tests/phase-f-lightmemo-directory-semantics-fixture.test.js
```

## Boundary

The test only parses a local JSON fixture. It does not import LightMemo runtime, execute real recall, read real memory stores, inspect audit logs, call providers, start HTTP, mutate durable state, expand public MCP tools, push, cut over, or claim readiness.

## Assertions

The fixture test verifies:

- decision remains `NOT_READY_BLOCKED`
- evidence class is `synthetic_fixture_only`
- public MCP tools are exactly `record_memory`, `search_memory`, and `memory_overview`
- runtime/provider/real-memory/durable mutation flags are false
- required LightMemo directory scenarios are present in deterministic order
- every scenario declares expected and blocked scopes
- `search_all_knowledge_bases=true` is explicit-only
- excluded folders remain blocked
- alias map behavior requires explicit map evidence
- readiness and runtime parity overclaims are rejected

## Validation

Expected targeted validation:

```powershell
node --test tests\phase-f-lightmemo-directory-semantics-fixture.test.js
```

Combined Phase F fixture validation can include:

```powershell
node --test tests\phase-f-tagmemo-semantic-association-fixture.test.js tests\phase-f-observability-admin-review-surface-fixture.test.js tests\phase-f-memory-governance-proposal-fixture.test.js tests\phase-f-lightmemo-directory-semantics-fixture.test.js
```

Docs/board validation remains:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Result

This is fixture/test-only evidence. It improves local LightMemo directory semantics reviewability while preserving `NOT_READY_BLOCKED` and all hard-stop boundaries.
