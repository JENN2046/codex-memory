# Autopilot Closed-Loop State Machine

Updated: 2026-05-21

This document defines the local Smart Standing Authorization v3 closed-loop control contract for `codex-memory`.

It is a governance and observability contract. It does not execute provider calls, MCP memory writes, real memory scans, dependency changes, config changes, push, PR, tag, release, deploy, cutover, or readiness claims.

## Required State Order

```text
intake
-> grounding
-> goal_compiled
-> route_planned
-> task_selected
-> lane_classified
-> executed
-> validated
-> repair_attempted_once
-> receipted
-> checkpointed
-> continued_or_stopped
```

Each loop pass must preserve:

- `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`
- frozen public MCP tools: `record_memory`, `search_memory`, `memory_overview`
- v3 lane model and default autonomy envelope
- Red Lane hard stops
- docs-only, fixture-only, no-mutation, and read-only evidence separation from readiness

## State Contract

| State | Input | Output | Allowed Local Action | Red Gate |
|---|---|---|---|---|
| intake | user goal | normalized goal id/objective | read local rules and current request | ambiguous remote intent |
| grounding | goal + repository reality | workspace facts and protected contracts | read files, Git status, board state | secret value read or external write |
| goal_compiled | grounded goal | validated goal shape | local schema/example parse | broad rewrite or readiness claim |
| route_planned | goal | route steps | Green/Amber/Red planning | Red step copied to executable queue |
| task_selected | route plan | next safe task | select Green or exact in-envelope Amber | unbounded task or hidden cost |
| lane_classified | task | lane decision | compare task against v3 envelope | Red condition |
| executed | safe task | local result | scoped local edit or read-only observation | provider/runtime/memory/dependency/config unless exact Amber |
| validated | result | validation status | targeted local validation | non-obvious validation failure |
| repair_attempted_once | failed validation | one local repair or stop | one obvious local repair | second failure or design judgment |
| receipted | validated action | receipt or no-Amber marker | record local evidence | missing Amber receipt |
| checkpointed | receipt | board/checkpoint update | update local board | overwrite user-owned work |
| continued_or_stopped | checkpoint | next_safe_task or stop_reason | continue local safe task | Red gate or unsafe state |

## Completeness Rule

A completed task is closed-loop complete only when it has:

- validation evidence
- receipt evidence, or `not_required_no_amber_external_or_write_action`
- checkpoint or board state
- no Red action executed
- no readiness/cutover/`RC_READY` claim
