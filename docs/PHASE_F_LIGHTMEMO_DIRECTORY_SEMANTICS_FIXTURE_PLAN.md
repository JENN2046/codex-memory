# Phase F LightMemo Directory Semantics Fixture Plan

Status: `FIXTURE_PLAN_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `621ceee`

## Purpose

Define a local-safe synthetic fixture/test plan for LightMemo directory semantics. This plan targets VCP parity-sensitive query-scope behavior without executing real LightMemo recall, reading real memory stores, changing runtime code, calling providers, or claiming runtime parity.

## Scope

Allowed future fixture/test-only work:

- add one synthetic JSON fixture for LightMemo directory intent scenarios
- add one structure-only test that parses the fixture
- assert query scope semantics are explicit and deterministic
- assert forbidden over-broad recall is represented as blocked synthetic expectations
- assert public MCP tools remain frozen
- assert all runtime/provider/real-memory/durable mutation flags remain false

Not allowed in this fixture lane:

- real LightMemo recall execution
- real memory store or audit-log reads
- provider calls
- HTTP observe or service start
- public MCP tool/schema expansion
- durable memory or audit writes
- migration/import/export/backup/restore apply
- config/watchdog/startup changes
- push, tag, release, deploy, or cutover
- readiness or runtime parity claims

## Proposed Future Fixture

```text
tests/fixtures/phase-f-lightmemo-directory-semantics-v1.json
```

Suggested top-level shape:

```json
{
  "version": "phase-f-lightmemo-directory-semantics-v1",
  "decision": "NOT_READY_BLOCKED",
  "evidenceClass": "synthetic_fixture_only",
  "publicMcpTools": ["record_memory", "search_memory", "memory_overview"],
  "runtimeExecuted": false,
  "providerCalled": false,
  "realMemoryStoreRead": false,
  "durableStateMutated": false,
  "scenarios": []
}
```

## Required Scenario Coverage

| Scenario ID | Query Shape | Expected Boundary | Blocked Boundary |
|---|---|---|---|
| `maid-basic-directory-scope` | `maid` | only matching maid directory scope | unrelated folder or all-KB expansion |
| `folder-basic-directory-scope` | `folder` | only matching folder scope | unrelated maid aliases |
| `maid-and-folder-or-scope` | `maid AND (folder1 OR folder2)` | explicit maid plus allowed folder set | folder outside OR set |
| `search-all-knowledge-bases-explicit` | `search_all_knowledge_bases=true` | explicit all-KB intent only | implicit all-KB from broad query |
| `excluded-folder-respected` | excluded folders | excluded folder is blocked | excluded folder leaking into expected hits |
| `directory-alias-map-explicit` | alias map | alias resolves to exact canonical directory | fuzzy alias expansion without map evidence |
| `cross-directory-overreach-negative` | broad directory-like query | no implicit cross-directory widening | silent global recall |
| `readiness-overclaim-rejected` | safety case | fixture-only evidence | runtime parity or RC readiness claim |

## Required Scenario Fields

Each future scenario should include:

| Field | Requirement |
|---|---|
| `scenarioId` | stable id from the required scenario set |
| `queryShape` | synthetic query description |
| `directoryIntent` | explicit directory/scope intent |
| `expectedScopes` | scopes allowed by the fixture |
| `blockedScopes` | scopes that must not match |
| `aliasMap` | explicit alias mapping or empty object |
| `excludedFolders` | explicit excluded folder names or empty array |
| `searchAllKnowledgeBases` | boolean, true only for explicit all-KB scenario |
| `donorCompatibilityNote` | LightMemo/VCP compatibility note |
| `mustNotClaim` | forbidden readiness/runtime claims |

## Proposed Future Test

```text
tests/phase-f-lightmemo-directory-semantics-fixture.test.js
```

The test should be structure-only and synthetic-data-only. It should not import runtime LightMemo, recall, storage, HTTP, provider, or MCP modules.

Required assertions:

- exact fixture version is present
- decision remains `NOT_READY_BLOCKED`
- evidence class is `synthetic_fixture_only`
- public MCP tools equal exactly `record_memory`, `search_memory`, `memory_overview`
- runtime/provider/real-memory/durable mutation flags are false
- required scenario ids are present in deterministic order
- each scenario has expected and blocked scopes
- `search_all_knowledge_bases=true` appears only in explicit all-KB scenario
- excluded-folder scenario blocks excluded scopes
- alias scenario requires explicit alias map evidence
- readiness/runtime parity claims are forbidden

## Validation For Future Implementation

Expected commands after fixture/test files are added:

```powershell
node --test tests\phase-f-lightmemo-directory-semantics-fixture.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Optional combined fixture command after the pack exists:

```powershell
node --test tests\phase-f-tagmemo-semantic-association-fixture.test.js tests\phase-f-observability-admin-review-surface-fixture.test.js tests\phase-f-memory-governance-proposal-fixture.test.js tests\phase-f-lightmemo-directory-semantics-fixture.test.js
```

## Next Task

```text
CM-0544 Phase F LightMemo directory semantics synthetic fixture contract
```

Expected output:

- add the synthetic LightMemo fixture
- add the structure-only test
- update docs/board evidence
- keep result `NOT_READY_BLOCKED`

## Result

This plan is local-safe and docs-only. It prepares a future LightMemo directory semantics fixture pack while preserving all runtime, A5, public MCP, provider, durable write, push, cutover, and readiness boundaries.
