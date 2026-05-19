# Phase F Observability/Admin Review Surface Fixture Plan

Status: `FIXTURE_PLAN_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `58df560`

## Purpose

Turn the Phase F observability/admin review surface design draft into a local-safe synthetic fixture/test plan. This plan defines what a future fixture should prove without starting services, reading real stores, changing runtime source, expanding public MCP tools, or claiming readiness.

## Scope

Allowed future fixture/test-only work:

- add one synthetic JSON fixture for the review-surface shape
- add one structure-only test that reads the fixture
- assert protected public MCP tools remain exactly `record_memory`, `search_memory`, and `memory_overview`
- assert runtime/provider/real-memory/durable mutation flags default to false
- assert evidence class is fixture/design only
- assert hard-stop categories remain explicit
- assert readiness and cutover claims are absent

Not allowed in this fixture lane:

- HTTP observe or service start
- real memory store or audit-log reads
- provider calls
- public MCP tool/schema expansion
- durable memory or audit writes
- config/watchdog/startup changes
- push, tag, release, deploy, or RC cutover
- `RC_READY`, runtime readiness, or final readiness claims

## Proposed Fixture

```text
tests/fixtures/phase-f-observability-admin-review-surface-v1.json
```

Suggested top-level shape:

```json
{
  "version": "phase-f-observability-admin-review-surface-v1",
  "decision": "NOT_READY_BLOCKED",
  "evidenceClass": "local_fixture_or_design_only",
  "publicMcpTools": ["record_memory", "search_memory", "memory_overview"],
  "runtimeExecuted": false,
  "providerCalled": false,
  "realMemoryStoreRead": false,
  "durableStateMutated": false,
  "surfaces": [],
  "hardStops": [],
  "nextSafeAction": "local-safe docs/fixture/test-only task"
}
```

## Proposed Test

```text
tests/phase-f-observability-admin-review-surface-fixture.test.js
```

The test should be structure-only and synthetic-data-only. It should not import runtime service modules, start HTTP MCP, inspect real logs, or call provider/profile code.

Required assertions:

- fixture `version` equals `phase-f-observability-admin-review-surface-v1`
- `decision` equals `NOT_READY_BLOCKED`
- `evidenceClass` equals `local_fixture_or_design_only`
- `publicMcpTools` exactly equals `record_memory`, `search_memory`, `memory_overview`
- mutation/execution flags are all false
- `surfaces` includes `phase_f_parity_summary`, `tagmemo_fixture_pack_status`, `runtime_gap_boundary_status`, `public_mcp_freeze_status`, `operator_next_safe_action`, and `readiness_overclaim_guard`
- `hardStops` includes `A5`, `push`, `cutover`, `public_mcp_expansion`, `provider`, and `real_memory_scan`
- forbidden readiness claims are absent from any free-text fields

## Suggested Surface Entries

Each fixture surface entry should include:

| Field | Requirement |
|---|---|
| `id` | stable surface id |
| `purpose` | short operator-facing purpose |
| `artifactType` | `json`, `markdown`, or `json_and_markdown` |
| `evidenceBoundary` | must state fixture/design/read-only boundary |
| `mustNotClaim` | array of forbidden overclaims |
| `requiresApprovalFor` | array of hard-stop categories if escalation is needed |

## Validation for Future Implementation

Expected command after the fixture/test is added:

```powershell
node --test tests\phase-f-observability-admin-review-surface-fixture.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

A readiness/overclaim scan should also confirm no unqualified readiness or approval-granted wording was introduced.

## Next Task

```text
CM-0536 Phase F observability/admin review surface synthetic fixture contract
```

Expected output:

- add the synthetic fixture
- add the structure-only test
- update docs/board evidence
- keep result `NOT_READY_BLOCKED`

## Result

This plan is local-safe and docs-only. It prepares future fixture/test work while preserving the public MCP freeze and all A5 hard stops.
