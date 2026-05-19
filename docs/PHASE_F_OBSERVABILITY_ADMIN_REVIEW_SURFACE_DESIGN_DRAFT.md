# Phase F Observability/Admin Review Surface Design Draft

Status: `DESIGN_DRAFT_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `ed72545`

## Purpose

Draft the next Phase F observability/admin review surface without changing runtime behavior or public MCP tools. This design describes future local CLI/JSON/Markdown review surfaces for auditability, handoff, and operator confidence.

## Current Boundary

This is a design-only slice. It does not:

- execute HTTP observe or start services
- read real memory stores or audit logs
- change dashboard/governance/report source code
- change public MCP tools or schemas
- install or modify watchdog/startup/config
- write durable memory or audit records
- claim readiness

Public MCP tools remain frozen:

```text
record_memory
search_memory
memory_overview
```

## Proposed Review Surface Families

| Surface | Purpose | Future Artifact Type | Safety Rule |
|---|---|---|---|
| `phase_f_parity_summary` | Summarize local Phase F fixture/design progress. | Markdown/JSON report | Must not imply runtime parity. |
| `tagmemo_fixture_pack_status` | Report synthetic fixture coverage and targeted test result. | JSON summary plus Markdown note | Must identify fixture-only evidence. |
| `runtime_gap_boundary_status` | Link runtime gaps to exact approval boundaries. | Markdown table | Must keep A5/hard-stop wording explicit. |
| `public_mcp_freeze_status` | Confirm public tool surface remains frozen. | JSON static check or docs table | Must not add tools. |
| `operator_next_safe_action` | Suggest next local-safe task. | Handoff/board field | Must stop before A5/push/runtime. |
| `readiness_overclaim_guard` | Highlight forbidden readiness claims. | schema/fixture guard | Must keep `NOT_READY_BLOCKED` unless separately proven. |

## Future JSON Shape Sketch

```json
{
  "version": "phase-f-observability-admin-review-surface-v1",
  "decision": "NOT_READY_BLOCKED",
  "publicMcpTools": ["record_memory", "search_memory", "memory_overview"],
  "evidenceClass": "local_fixture_or_design_only",
  "runtimeExecuted": false,
  "providerCalled": false,
  "realMemoryStoreRead": false,
  "durableStateMutated": false,
  "nextSafeAction": "local-safe docs/fixture/test-only task",
  "hardStops": ["A5", "push", "cutover", "public_mcp_expansion", "provider", "real_memory_scan"]
}
```

## Future Acceptance Criteria

A future fixture/test implementation should verify:

- exact version is present
- decision remains `NOT_READY_BLOCKED`
- public MCP tools are exactly the three protected tools
- runtime/provider/real-memory/durable mutation flags are false by default
- evidence class is explicit and cannot be confused with runtime readiness
- next safe action is local-safe only
- hard-stop categories include A5, push, cutover, public MCP expansion, provider, and real memory scan

## Suggested Next Task

```text
CM-0535 Phase F observability/admin review surface fixture plan
```

Expected scope:

- add a synthetic fixture or docs plan for the JSON shape
- optionally add a structure-only test in a later slice
- no runtime source changes unless separately planned

## Explicit Non-Goals

This design draft does not implement dashboard, governance report, HTTP observe, or any admin UI. It does not start services, call providers, read real audit logs, write durable state, expand MCP tools, push, cut over, or claim readiness.

## Result

The project remains:

```text
NOT_READY_BLOCKED
```
