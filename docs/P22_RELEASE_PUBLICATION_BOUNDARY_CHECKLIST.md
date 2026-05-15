# P22 Release Publication Boundary Checklist

Phase: `P22.12-release-publication-boundary-checklist`

Mode: `A4.8-docs-boundary-checklist`

Decision: `TAG_RELEASE_DEPLOY_BLOCKED_PENDING_A5_APPROVAL`

## Purpose

Record the boundary checklist that must be reviewed before any P22 release publication action.

This checklist is documentation only. It does not create a tag, create a GitHub release, deploy, call providers, mutate config, start live HTTP MCP, preview real memory, write durable memory, run migration/import-export apply, or expand public MCP tools.

## Pre-Publication State

| Field | Value |
|---|---|
| Artifact id | `p22-rc-806cc847` |
| Artifact path | `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md` |
| Target commit | `806cc847cb37a3e428099b45871a4f1a13c4fa6f` |
| Gate refresh result | `PASS` |
| Release state | `RC_ARTIFACT_CREATED_TAG_RELEASE_DEPLOY_NOT_PERFORMED` |
| Tag approval | `NOT_APPROVED` |
| GitHub release approval | `NOT_APPROVED` |
| Deploy approval | `NOT_APPROVED` |

The RC artifact exists. RC artifact exists does not equal released.

## Gate Evidence

Recorded gate refresh evidence:

- `npm test`: `472/472`
- `gate:ci`: tests `457/457`, compare `43/43`, rollback `43/43`
- compare standard suite: `43/43`
- rollback standard suite: `43/43`
- `providerCalls=0`
- `mutated=false`

This checklist records the evidence. It does not rerun gates.

## Frozen Target

The publication target remains:

```text
806cc847cb37a3e428099b45871a4f1a13c4fa6f
```

Any future approval must name this commit or explicitly choose a different target with a new gate story.

## Public Tool Boundary

Public MCP tools remain frozen:

- `record_memory`
- `search_memory`
- `memory_overview`

`validate_memory` remains internal-only.

No public MCP schema or tool expansion is approved by this checklist.

## Excluded Unless Separately Approved

The following remain excluded unless a separate explicit A5 approval names the action and scope:

- provider call
- provider smoke
- provider benchmark
- live HTTP MCP startup
- Codex config mutation
- Claude config mutation
- startup/watchdog operation
- scheduled task operation
- HKCU Run edit
- real memory preview
- durable memory / DB / diary write
- SQLite migration / `ALTER TABLE`
- migration/import-export apply
- MCP schema change
- public MCP tool expansion
- public exposure of `validate_memory`
- package or lockfile change
- `.env` or secret change
- deploy

## Approval Separation

Tag, GitHub release, and deploy are separate approval switches:

- tag approval does not approve GitHub release
- tag approval does not approve deploy
- GitHub release approval does not approve deploy
- deploy approval requires exact target, environment, commands, rollback plan, validation plan, and expected side effects

Default decision for all publication actions remains `BLOCKED_HARD_STOP`.

## Stop Conditions

Stop before publication if:

- approval is absent or ambiguous
- approval does not name the exact switch
- approval does not name the exact target commit
- approval does not name the exact tag/release/deploy target
- worktree has unrelated dirty changes
- remote refs drift unexpectedly
- the action would cross provider/config/startup/watchdog/real-memory/migration/import-export/MCP/package/env boundaries
- validation or preflight fails
- secret-like content appears in output or diff

## Result

`P22_RELEASE_PUBLICATION_BOUNDARY_CHECKLIST_READY`

This result means the publication boundary is documented. It does not mean P22 is released.

Next safe action: draft post-artifact operator handoff or request explicit A5 approval for a specific tag/release/deploy switch.
