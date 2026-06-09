# CM-1490 Next RC Must-Fix Blocker Selection

Date: 2026-06-09

Status: `COMPLETED_VALIDATED_NEXT_MUST_FIX_SELECTED_NO_READY_CLAIM`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Select the next RC must-fix blocker after CM-1489 closed the first CM-1486 must-fix blocker for bundled seven-tool public contract evidence.

This is docs triage only. It does not claim readiness or `RC_READY`, release/tag/deploy, execute confirmed mutation, perform raw scan, call provider/API, use bearer token material, expand public MCP tools, or perform an effective `record_memory` write.

## Prior State

CM-1489 closed only this blocker:

```text
Fresh post-closeout public contract evidence is not bundled for the seven-tool surface.
```

Closure scope was evidence-bundle completeness only. Overall RC status remained blocked.

## Next Must-Fix Decision

Selected next must-fix blocker:

```text
Live client / integration evidence is not current for the post-closeout seven-tool surface.
```

Decision:

```text
next_must_fix: live_client_integration_evidence_not_current_for_post_closeout_seven_tool_surface
selection_status: SELECTED
execution_status: NOT_EXECUTED
readiness_claimed: false
rc_ready_claimed: false
```

## Selection Rationale

This blocker is selected next because:

- CM-1486 ranked it immediately after the now-closed seven-tool evidence bundle gap.
- It depends on CM-1488 / CM-1489 evidence bundle boundaries being explicit first.
- It is the next evidence gap that prevents later RC review from relying on stale pre-closeout public-surface proof.
- It can be prepared as a docs-only exact preflight before any live client call, bearer-token use, provider/API call, mutation, release, or public MCP expansion.
- It keeps confirmed mutation and release/cutover blocked while advancing the evidence map.

## Updated Blocker Table

| Blocker | Current status after CM-1489 | CM-1490 action | Next route class |
|---|---|---|---|
| Fresh post-closeout public contract evidence is not bundled for the seven-tool surface | `CLOSED` | none | Closed only for evidence-bundle completeness. |
| Live client / integration evidence is not current for the post-closeout seven-tool surface | `SELECTED_NEXT_MUST_FIX` | select for next preflight | Docs exact preflight first; no live call in CM-1490. |
| Confirmed controlled mutation remains blocked | `STILL_BLOCKED` | defer | Exact approval only with operator target id and mutation type. |
| Release/cutover claim remains blocked | `STILL_BLOCKED` | defer | Future release/cutover review only after lower evidence gaps are explicit. |
| Provider/API and bearer-token paths remain forbidden | `STILL_BLOCKED` | defer | Exact approval only if future selected route requires them. |
| Public MCP surface must remain stable | `STILL_BLOCKED_AS_GUARDRAIL` | maintain | No new public MCP expansion. |

## Acceptance Criteria For The Next Fix

A future next-fix task is acceptable only if it:

- prepares an exact live client / integration evidence preflight before any live call
- names the post-closeout seven public tools exactly:
  - `record_memory`
  - `search_memory`
  - `memory_overview`
  - `audit_memory`
  - `validate_memory`
  - `tombstone_memory`
  - `supersede_memory`
- states whether the future proof is in-process MCP, local HTTP MCP, Codex client, Claude client, or another exact transport
- states whether bearer-token use is required; if yes, it must be separately exact-approved
- defines exact call counts, arguments, expected low-disclosure outputs, forbidden output keys, and stop conditions
- forbids valid `record_memory` writes unless separately exact-approved
- forbids confirmed mutation, `dry_run=false`, `confirm=true`, raw scan, provider/API, public MCP expansion, release/tag/deploy, and readiness / `RC_READY` claims unless separately approved
- keeps stale older live evidence separate from fresh post-closeout proof
- updates `.agent_board`, `CURRENT_STATE.md`, and `STATUS.md`
- passes docs validation, JSON parse, diff check, staged diff check, and changed-scope review

## Validation Matrix

| Validation | Scope | Required for CM-1490 |
|---|---|---|
| `git diff --check` | whitespace / patch hygiene | yes |
| `scripts\validate-local.ps1 -Area docs` | docs governance and board consistency | yes |
| `CURRENT_FACTS.json` parse | machine snapshot integrity | yes |
| staged diff check | commit hygiene | yes |
| changed-scope review | no readiness overclaim or boundary drift | yes |

## Go / No-Go

| Route | Decision | Reason |
|---|---|---|
| Select live client / integration evidence as next must-fix | `GO` | It is the next ranked remaining blocker after CM-1489 closure. |
| Execute live client / integration proof in CM-1490 | `NO-GO` | This task only selects the blocker and acceptance criteria. |
| Use bearer token in CM-1490 | `NO-GO` | Forbidden by task scope. |
| Call provider/API in CM-1490 | `NO-GO` | Forbidden by task scope. |
| Execute confirmed mutation | `NO-GO` | Still exact approval / Red-boundary work. |
| Claim readiness or `RC_READY` | `NO-GO` | Multiple blockers remain. |

## Recommended Next Route

```text
CM-1491 live client integration evidence exact preflight
```

Recommended scope:

- docs preflight only
- exact transport and auth boundary
- exact tool list and call matrix
- low-disclosure assertions
- forbidden key list
- stop conditions
- no live call until separately authorized

## Explicit Non-Claims

CM-1490 does not:

- claim readiness or `RC_READY`
- release, tag, or deploy
- execute confirmed mutation
- perform raw scan
- call provider/API
- use bearer token material
- expand public MCP tools
- execute live client calls
- perform an effective `record_memory` write
