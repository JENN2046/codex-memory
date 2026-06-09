# CM-1486 RC Blocker Prioritization And First Must-Fix Selection

Date: 2026-06-09

Status: `COMPLETED_VALIDATED_RC_BLOCKER_PRIORITIZATION_NO_FIX_EXECUTED`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Prioritize the CM-1485 RC blocker inventory and select the first must-fix blocker for a future minimal executable repair plan.

This is docs triage only. It does not directly fix source, does not claim readiness or `RC_READY`, does not release/tag/deploy, does not execute confirmed mutation, does not perform raw scan, does not call provider/API, does not use bearer token material, and does not expand the public MCP surface.

## Must-Fix Ordering

| Rank | Must-fix blocker | Reason for position | Action class |
|---:|---|---|---|
| 1 | Fresh post-closeout public contract evidence is not bundled for the seven-tool surface | This is the smallest first blocker because it can be scoped as docs/preflight evidence bundling before any live client, bearer-token, provider, mutation, release, or public MCP expansion boundary. It also prevents later RC review from over-reading older public-surface evidence. | Docs/preflight first; no source fix in CM-1486 |
| 2 | Live client / integration evidence is not current for the post-closeout seven-tool surface | This depends on rank 1 because live evidence should be driven by a precise evidence bundle and exact approval shape, not by broad probing. | Future exact bounded integration preflight |
| 3 | Confirmed controlled mutation remains blocked | This is important but remains Red-boundary. It requires operator target id, mutation type, exact approval, rollback, and post-apply evidence; it should not be the first default repair path. | Future exact approval only |
| 4 | Release/cutover claim remains blocked | This cannot be addressed until lower-level evidence gaps are mapped and validated. | Future release/cutover review only after blockers remain explicit |
| 5 | Provider/API and bearer-token paths remain forbidden | These are not repairable inside local docs triage and require future exact approval if needed. | Keep blocked |
| 6 | Public MCP surface must remain stable | This is a standing guardrail rather than a repair target. | Keep stable; no expansion |

## First Blocker Selection

Selected first must-fix blocker:

```text
Fresh post-closeout public contract evidence is not bundled for the seven-tool surface.
```

Selection rationale:

- It is the least side-effectful must-fix blocker.
- It can be addressed first by a docs/preflight packet without runtime action.
- It does not require confirmed mutation, raw scan, provider/API, bearer token, release/tag/deploy, or public MCP expansion.
- It creates a clean evidence boundary for any later exact bounded live/integration proof.
- It keeps `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` intact.

## Minimal Future Repair Plan

Recommended future task:

```text
CM-1487 post-closeout public contract evidence bundle preflight
```

Future CM-1487 should:

- create a docs-only evidence bundle map for the current seven public tools:
  - `record_memory`
  - `search_memory`
  - `memory_overview`
  - `audit_memory`
  - `validate_memory`
  - `tombstone_memory`
  - `supersede_memory`
- classify existing evidence by type:
  - source/test
  - docs-only
  - no-mutation in-process proof
  - post-push source audit
  - stale or pre-closeout live evidence
- identify what evidence is current enough for docs closeout versus what needs future exact bounded proof
- produce an evidence gap table without executing live calls
- preserve `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

Future CM-1487 must not:

- claim readiness or `RC_READY`
- execute live client calls
- use bearer token material
- call provider/API
- execute confirmed mutation
- perform raw scan
- expand public MCP tools
- release, tag, or deploy

## Acceptance Criteria For The Future First Fix

The future first fix is acceptable only when it:

- names the seven-tool public contract exactly
- maps each tool to current evidence and evidence age
- separates docs-only, source/test, no-mutation, and live-runtime evidence
- marks stale evidence as stale rather than current
- lists remaining evidence gaps without closing them by assertion
- includes explicit non-claims for readiness, `RC_READY`, release/tag/deploy, confirmed mutation, raw scan, provider/API, bearer token, and public MCP expansion
- updates `.agent_board`, `CURRENT_STATE.md`, and `STATUS.md`
- passes docs validation and changed-scope review

## Validation Matrix

| Future validation | Scope | Required before future task closeout |
|---|---|---|
| `git diff --check` | formatting / whitespace | Yes |
| `scripts\validate-local.ps1 -Area docs` | docs governance and board consistency | Yes |
| `CURRENT_FACTS.json` parse | machine snapshot integrity | Yes |
| staged diff check | commit hygiene | Yes |
| changed-scope review | no readiness overclaim and no forbidden boundary drift | Yes |

## Explicit Non-Claims

CM-1486 does not:

- directly fix source
- claim readiness or `RC_READY`
- release, tag, or deploy
- execute confirmed mutation
- perform raw scan
- call provider/API
- use bearer token material
- expand public MCP tools
- clear any blocker
