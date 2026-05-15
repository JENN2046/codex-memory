# P22 Security-Fix Tag-Only Approval Request

Phase: `P22-security-fix-tag-only-approval-request`

Mode: `A5-approval-request-draft`

Risk: `A4`

Decision: `BLOCKED_HARD_STOP`

Result recorded: [P22_SECURITY_FIX_TAG_RESULT_RECORD.md](/A:/codex-memory/docs/P22_SECURITY_FIX_TAG_RESULT_RECORD.md)

## Purpose

Draft the explicit A5 approval request required before creating and pushing the P22 security-fix Git tag only.

This document is not approval. It does not create a tag, push a tag, create a GitHub release, deploy, call providers, mutate config, run migration/import-export apply, or expand public MCP tools.

This phase requests tag approval only. It does not request GitHub release approval and does not request deploy approval.

## Current State

| Field | Value |
|---|---|
| Artifact id | `p22-rc-7fd17de` |
| Artifact path | `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md` |
| Target commit | `7fd17de624c0da76751e863e97302bed0dbec905` |
| Artifact state | `CREATED_DOCS_ONLY` |
| Release state | `SECURITY_FIX_RC_ARTIFACT_CREATED_TAG_RELEASE_DEPLOY_NOT_PERFORMED` |
| Fresh gate refresh result | `PASS` |

The local Markdown artifact exists. It is not a tag, not a GitHub release, and not a deploy.

## Tag-Only Approval Request

Requested switch: tag approval only.

| Field | Value |
|---|---|
| Tag approval status | `NOT_APPROVED` |
| GitHub release approval status | `NOT_APPROVED` |
| Deploy approval status | `NOT_APPROVED` |
| Proposed tag name | `p22-rc-7fd17de` |
| Proposed target commit | `7fd17de624c0da76751e863e97302bed0dbec905` |
| Artifact path | `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md` |

Tag approval was later explicitly provided and the result is recorded in [P22_SECURITY_FIX_TAG_RESULT_RECORD.md](/A:/codex-memory/docs/P22_SECURITY_FIX_TAG_RESULT_RECORD.md). GitHub release approval and deploy approval remain `NOT_APPROVED`.

No tag is created in this phase. No tag is pushed in this phase. No GitHub release is created. No deploy is performed.

## Superseded Candidate Boundary

The previous candidate is superseded by the security fix:

- superseded tag: `p22-rc-806cc847`
- superseded artifact: `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md`
- superseded target: `806cc847cb37a3e428099b45871a4f1a13c4fa6f`

Required boundary:

- do not reuse `p22-rc-806cc847`
- do not move `p22-rc-806cc847`
- do not delete `p22-rc-806cc847` without separate explicit approval
- do not treat `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md` as the current final candidate

## Independent Approval Switches

| Switch | Default status | Meaning |
|---|---|---|
| tag approval | `NOT_APPROVED` | Whether a Git tag may be created and pushed. |
| GitHub release approval | `NOT_APPROVED` | Whether a GitHub release may be created or published. |
| deploy approval | `NOT_APPROVED` | Whether any deployment may be performed. |

All three switches are independent. Approval for one switch does not approve the others.

Current decision: `BLOCKED_HARD_STOP`

## Proposed Tag

Proposed tag name: `p22-rc-7fd17de`

Proposed tag target:

```text
7fd17de624c0da76751e863e97302bed0dbec905
```

Tag action is not approved by this document. This document only requests future tag approval.

## Proposed GitHub Release

GitHub release proposal status: `NOT_REQUESTED_BY_DEFAULT`

No GitHub release title is proposed for execution in this document. GitHub release remains blocked unless a separate approval names:

- exact release title
- exact source tag
- exact target commit
- exact artifact path
- rollback plan
- validation plan
- expected side effects

GitHub release action is not requested or approved by this document.

## Proposed Deploy

Deploy proposal status: `NOT_REQUESTED_BY_DEFAULT`

No deployment target is proposed in this document. Deploy remains blocked unless a separate approval names:

- exact deployment target
- exact environment
- exact command
- rollback plan
- validation plan
- expected side effects

Deploy action is not requested or approved by this document.

## Expected Generated Or Changed Objects

If a future approval authorizes actual tag creation, expected Git objects must be named explicitly:

- Git tag: `p22-rc-7fd17de`
- target commit: `7fd17de624c0da76751e863e97302bed0dbec905`

No expected generated file, local tag, remote tag, release object, deploy object, or external object is approved by this draft.

If a future approval only authorizes docs recording of a tag decision, expected local changed files may include:

- `STATUS.md`
- `MAINTENANCE_BACKLOG.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `.agent_board/*`

## Exclusions

Unless separately approved in an explicit A5 sentence, the following remain excluded:

- GitHub release
- deploy
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
- before push: delete local tag only
- after push: delete remote tag only with separate explicit approval
- no GitHub release rollback is included because release approval remains `NOT_APPROVED`
- no deploy rollback is included because deploy approval remains `NOT_APPROVED`

This document does not authorize any rollback command.

## Stop Conditions

Stop before any tag/release/deploy action if:

- the approval sentence does not name tag approval only
- the approval sentence does not name exact tag `p22-rc-7fd17de`
- the approval sentence does not name exact target commit `7fd17de624c0da76751e863e97302bed0dbec905`
- the approval sentence does not reference `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md`
- the approval sentence also approves GitHub release or deploy
- target commit differs from `7fd17de624c0da76751e863e97302bed0dbec905`
- artifact is missing at `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md`
- artifact path differs from `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md`
- proposed tag already exists locally or remotely
- worktree is dirty
- remote main has drifted unexpectedly
- the command would touch provider, config, startup/watchdog, real memory, durable data, migration/import-export, MCP schema/tools, package/lockfile, `.env`, or secrets
- any output exposes secret-like content
- validation fails

## Approval Sentence Template

### Tag Approval Template

```text
I explicitly approve creating and pushing Git tag p22-rc-7fd17de for target commit 7fd17de624c0da76751e863e97302bed0dbec905, referencing docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md, with no GitHub release, no deploy, no provider call, no live HTTP MCP startup, no config mutation, no startup/watchdog operation, no real memory preview, no durable memory write, no migration/import-export apply, no public MCP expansion, no package/lockfile change, and no .env or secret change.
```

The template above is not approval while it appears in this document.

## Current Decision

Tag approval: `NOT_APPROVED`

GitHub release approval: `NOT_APPROVED`

Deploy approval: `NOT_APPROVED`

Decision: `BLOCKED_HARD_STOP`

Next safe action: wait for explicit tag-only approval for `p22-rc-7fd17de`.
