# Phase F Memory Governance Proposal Fixture Tests

Status: `FIXTURE_TESTS_ADDED`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `c4d805f`

## Scope

This slice adds a synthetic fixture and structure-only test for the Phase F memory governance proposal contract.

Added files:

```text
tests/fixtures/phase-f-memory-governance-proposal-v1.json
tests/phase-f-memory-governance-proposal-fixture.test.js
```

## Boundary

The test only parses a local JSON fixture. It does not import runtime modules, execute `governance:report`, read real memory stores, append audit logs, mutate memory, call providers, expand public MCP tools, push, cut over, or claim readiness.

## Assertions

The fixture test verifies:

- decision remains `NOT_READY_BLOCKED`
- evidence class is `synthetic_fixture_only`
- public MCP tools are exactly `record_memory`, `search_memory`, and `memory_overview`
- durable memory/audit write flags are false
- real memory store read and provider call flags are false
- governance object ids and states are deterministic
- default states are not apply states
- every object requires exact approval before apply boundaries
- approval requirement fields are explicit
- readiness and authority overclaims are listed as forbidden defaults

## Validation

Expected targeted validation:

```powershell
node --test tests\phase-f-memory-governance-proposal-fixture.test.js
```

Docs/board validation remains:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Result

This is fixture/test-only evidence. It improves future governance proposal reviewability while preserving `NOT_READY_BLOCKED` and all hard-stop boundaries.
