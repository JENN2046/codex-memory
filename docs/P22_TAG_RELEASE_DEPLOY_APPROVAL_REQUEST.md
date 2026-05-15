# P22 Tag / Release / Deploy Approval Request

Phase: `P22.11-tag-release-deploy-approval-request`

Mode: `A5-approval-request-draft`

Decision: `BLOCKED_HARD_STOP`

## Purpose

Draft the explicit A5 approval request required before any tag, GitHub release, or deployment action.

This document is not approval. It does not create a tag, create a GitHub release, deploy, call providers, mutate config, run migration/import-export apply, or expand public MCP tools.

## Current State

| Field | Value |
|---|---|
| Artifact id | `p22-rc-806cc847` |
| Artifact path | `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md` |
| Target commit | `806cc847cb37a3e428099b45871a4f1a13c4fa6f` |
| Artifact state | `CREATED_DOCS_ONLY` |
| Release state | `RC_ARTIFACT_CREATED_TAG_RELEASE_DEPLOY_NOT_PERFORMED` |
| Gate refresh result | `PASS` |

The local Markdown artifact exists. It is not a tag, not a GitHub release, and not a deploy.

## Independent Approval Switches

| Switch | Default status | Meaning |
|---|---|---|
| tag approval | `NOT_APPROVED` | Whether a Git tag may be created and pushed. |
| GitHub release approval | `NOT_APPROVED` | Whether a GitHub release may be created or published. |
| deploy approval | `NOT_APPROVED` | Whether any deployment may be performed. |

All three switches are independent. Approval for one switch does not approve the others.

Current decision: `BLOCKED_HARD_STOP`

## Proposed Tag

Proposed tag name: `p22-rc-806cc847`

Proposed tag target:

```text
806cc847cb37a3e428099b45871a4f1a13c4fa6f
```

Tag action is not approved by this document.

## Proposed GitHub Release

Proposed release title:

```text
P22 Release Candidate p22-rc-806cc847
```

Proposed release source:

- tag: `p22-rc-806cc847`
- artifact: `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md`

GitHub release action is not approved by this document.

## Proposed Deploy

Deploy proposal status: `NOT_REQUESTED_BY_DEFAULT`

No deployment target is proposed in this document. Deploy remains blocked unless a separate approval names:

- exact deployment target
- exact environment
- exact command
- rollback plan
- validation plan
- expected side effects

Deploy action is not approved by this document.

## Expected Generated Or Changed Files

If a future approval only authorizes docs recording of a tag/release/deploy decision, expected local changed files may include:

- `STATUS.md`
- `MAINTENANCE_BACKLOG.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `.agent_board/*`

If a future approval authorizes actual tag or GitHub release creation, expected remote objects must be named explicitly:

- Git tag: `p22-rc-806cc847`
- GitHub release: `P22 Release Candidate p22-rc-806cc847`

No expected generated file or remote object is approved by this draft.

## Exclusions

Unless separately approved in an explicit A5 sentence, the following remain excluded:

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

## Rollback Story

Tag rollback must be separately approved if the tag is pushed.

Draft rollback levels:

- docs-only request rollback: revert the docs commit
- local tag rollback before push: delete local tag only
- pushed tag rollback: delete local and remote tag with explicit approval
- draft GitHub release rollback: delete or close draft release with explicit approval
- published GitHub release rollback: unpublish/delete release with explicit approval and preserve audit note
- deploy rollback: deployment-specific rollback plan required before approval

This document does not authorize any rollback command.

## Stop Conditions

Stop before any tag/release/deploy action if:

- the approval sentence does not name which switch is approved
- the approval sentence does not name exact tag, release, or deploy target
- target commit differs from `806cc847cb37a3e428099b45871a4f1a13c4fa6f`
- artifact path differs from `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md`
- worktree is dirty with unrelated changes
- remote main has drifted unexpectedly
- the command would touch provider, config, startup/watchdog, real memory, durable data, migration/import-export, MCP schema/tools, package/lockfile, `.env`, or secrets
- any output exposes secret-like content
- validation fails

## Approval Sentence Templates

### Tag Approval Template

```text
I explicitly approve creating and pushing Git tag p22-rc-806cc847 for target commit 806cc847cb37a3e428099b45871a4f1a13c4fa6f, referencing docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md, with no GitHub release, no deploy, no provider call, no live HTTP MCP startup, no config mutation, no startup/watchdog operation, no real memory preview, no durable memory write, no migration/import-export apply, no public MCP expansion, no package/lockfile change, and no .env or secret change.
```

### GitHub Release Approval Template

```text
I explicitly approve creating the GitHub release "P22 Release Candidate p22-rc-806cc847" from tag p22-rc-806cc847 for target commit 806cc847cb37a3e428099b45871a4f1a13c4fa6f, referencing docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md, with no deploy, no provider call, no live HTTP MCP startup, no config mutation, no startup/watchdog operation, no real memory preview, no durable memory write, no migration/import-export apply, no public MCP expansion, no package/lockfile change, and no .env or secret change.
```

### Deploy Approval Template

```text
I explicitly approve deploying <DEPLOYMENT_TARGET> for P22 release candidate p22-rc-806cc847 at target commit 806cc847cb37a3e428099b45871a4f1a13c4fa6f using <EXACT_COMMANDS>, with rollback via <ROLLBACK_STORY>, and with provider/config/migration/import-export/public MCP/package/env boundaries explicitly stated here.
```

The templates above are not approval while they appear in this document.

## Current Decision

Tag approval: `NOT_APPROVED`

GitHub release approval: `NOT_APPROVED`

Deploy approval: `NOT_APPROVED`

Decision: `BLOCKED_HARD_STOP`

Next safe action: continue docs-only release publication boundary checklist, or wait for explicit approval for exactly one or more switches.
