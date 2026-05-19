# Phase F VCP Parity Fixture Coverage Gap Review

Status: `COVERAGE_GAP_REVIEW_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `1922b34`

## Purpose

Review the completed Phase F local-safe fixture packs and identify the next fixture-only VCP parity hardening target. This review is docs-only and does not change runtime behavior, source code, public MCP tools, durable memory, audit logs, or project readiness state.

## Current Fixture Coverage

| Coverage Area | Current Pack | Local Evidence | Covered Boundary |
|---|---|---|---|
| TagMemo semantic association | TagMemo fixture pack | synthetic fixture + structure-only test | association grouping, controlled expansion negatives, deterministic ordering, readiness overclaim rejection |
| Observability/admin review surface | Observability fixture pack | synthetic fixture + structure-only test | review surface shape, public MCP freeze, hard-stop visibility, local-safe next action |
| Memory governance proposal | Governance fixture pack | synthetic fixture + structure-only test | proposal states, approval requirements, no default durable mutation, authority/readiness overclaim rejection |

## Coverage Gaps Still Open

| Gap | Why It Matters | Safe Fixture-Only Shape | Risk If Misread |
|---|---|---|---|
| LightMemo directory semantics | VCP compatibility depends on stable `maid`, `folder`, alias, excluded-folder, and all-knowledge-base behavior. | synthetic query/fixture matrix for directory intent and forbidden broadening | could be mistaken as real directory recall validation |
| EPA / ResidualPyramid chain metadata | Recall-chain parity needs explicit metadata boundaries before runtime proof. | fixture with explicit chain inputs, rejected inferred metadata, and no provider score dependency | could imply actual recall quality proof |
| Memory lifecycle proposal states | Governance fixture covers proposal basics but not lifecycle transition matrix depth. | synthetic transition table for proposal/supersede/tombstone/forget state movement | could be mistaken as durable lifecycle implementation |
| Active-memory rollback evidence linking | Current packs do not connect fixture-only parity evidence to compare/rollback evidence classes. | docs/fixture index mapping local fixture evidence versus approved compare/rollback evidence | could imply rollback readiness update without approved evidence |
| Public MCP freeze regression index | Public MCP freeze appears in each pack, but no single regression index records exact protected surface across packs. | static docs/fixture index only | could imply schema inspection or MCP runtime execution |

## Recommended Next Target

Recommended next local-safe task:

```text
CM-0543 Phase F LightMemo directory semantics fixture plan
```

Reason:

- It is directly tied to VCP parity compatibility.
- It can remain synthetic fixture/test-only.
- It does not require real memory scans, providers, runtime service starts, migrations, or public MCP changes.
- It complements the completed TagMemo pack by moving from semantic association to directory/query-scope behavior.

## Proposed CM-0543 Scope

Docs-only fixture plan for future synthetic LightMemo directory semantics tests:

- `maid`
- `folder`
- `maid AND (folder1 OR folder2)`
- `search_all_knowledge_bases=true`
- excluded folders
- directory alias map
- forbidden over-broad cross-directory recall
- no real memory store read
- no provider call
- no runtime recall proof

## Alternative Local-Safe Candidates

If LightMemo is deferred, next candidates are:

1. `CM-0544 Phase F EPA/ResidualPyramid chain metadata fixture plan`
2. `CM-0545 Phase F memory lifecycle transition fixture plan`
3. `CM-0546 Phase F public MCP freeze regression index`

These should stay docs/fixture/test-only unless separately planned and validated.

## Explicit Non-Claims

This review does not prove:

- runtime VCP parity
- real LightMemo recall behavior
- real EPA/ResidualPyramid recall quality
- durable memory lifecycle implementation
- active-memory rollback readiness beyond existing approved evidence
- public MCP schema execution
- production readiness
- RC readiness

## Required Validation For This Slice

```powershell
node --test tests\phase-f-tagmemo-semantic-association-fixture.test.js tests\phase-f-observability-admin-review-surface-fixture.test.js tests\phase-f-memory-governance-proposal-fixture.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Result

The current Phase F fixture packs are useful and locally validated, but they remain synthetic fixture/test-only evidence. The project remains:

```text
NOT_READY_BLOCKED
```
