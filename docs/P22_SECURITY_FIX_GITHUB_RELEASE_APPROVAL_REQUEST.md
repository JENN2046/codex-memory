# P22 Security-Fix GitHub Release Approval Request

Phase: `P22-github-release-approval-request`

Mode: `A5-approval-request-draft`

Risk: `A4`

Decision: `BLOCKED_HARD_STOP`

Result recorded: [P22_SECURITY_FIX_GITHUB_RELEASE_RESULT_RECORD.md](/A:/codex-memory/docs/P22_SECURITY_FIX_GITHUB_RELEASE_RESULT_RECORD.md)

## Purpose

Draft the explicit A5 approval request required before creating a GitHub release for the P22 security-fix release candidate.

This document is not approval. It does not create a GitHub release, publish release notes, deploy, call providers, mutate config, start live HTTP MCP, preview real memory, write durable memory, run migration/import-export apply, or expand public MCP tools.

This phase requests GitHub release approval only. Deploy remains blocked and is not requested.

## Current State

| Field | Value |
|---|---|
| Target tag | `p22-rc-7fd17de` |
| Tag target commit | `7fd17de624c0da76751e863e97302bed0dbec905` |
| Artifact path | `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md` |
| Tag result record | `docs/P22_SECURITY_FIX_TAG_RESULT_RECORD.md` |
| Release state | `SECURITY_FIX_TAG_CREATED_RELEASE_DEPLOY_NOT_PERFORMED` |
| GitHub release approval status | `NOT_APPROVED` |
| Deploy approval status | `NOT_APPROVED` |

The tag exists locally and remotely, and both point to `7fd17de624c0da76751e863e97302bed0dbec905`.

The local Markdown artifact exists. It is not a GitHub release and not a deploy.

## Release Approval Request

Requested switch: GitHub release approval only.

| Field | Value |
|---|---|
| GitHub release approval status | `NOT_APPROVED` |
| Deploy approval status | `NOT_APPROVED` |
| Proposed release title | `P22 Security-Fix Release Candidate p22-rc-7fd17de` |
| Proposed source tag | `p22-rc-7fd17de` |
| Proposed target commit | `7fd17de624c0da76751e863e97302bed0dbec905` |
| Artifact path | `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md` |

GitHub release approval was later explicitly provided and the result is recorded in [P22_SECURITY_FIX_GITHUB_RELEASE_RESULT_RECORD.md](/A:/codex-memory/docs/P22_SECURITY_FIX_GITHUB_RELEASE_RESULT_RECORD.md). Deploy approval remains `NOT_APPROVED`.

No GitHub release is created in this phase. No deploy is performed in this phase.

## Evidence Base

Primary references:

- [P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md)
- [P22_SECURITY_FIX_FRESH_RC_GATE_REFRESH_RESULT.md](/A:/codex-memory/docs/P22_SECURITY_FIX_FRESH_RC_GATE_REFRESH_RESULT.md)
- [P22_SECURITY_FIX_TAG_RESULT_RECORD.md](/A:/codex-memory/docs/P22_SECURITY_FIX_TAG_RESULT_RECORD.md)

Recorded evidence:

- security targeted test: `3/3` passed
- `npm test`: `473/473` passed
- `gate:ci` tests: `458/458`
- `gate:ci` compare: `43/43`
- `gate:ci` rollback: `43/43`
- `gate:ci` `noProvider=true`
- `gate:ci` `mutated=false`
- tag `p22-rc-7fd17de` local target: `7fd17de624c0da76751e863e97302bed0dbec905`
- tag `p22-rc-7fd17de` remote target: `7fd17de624c0da76751e863e97302bed0dbec905`

These are recorded results. This approval-request phase does not rerun gates.

## Superseded Candidate Boundary

The previous candidate remains superseded:

- superseded tag: `p22-rc-806cc847`
- superseded artifact: `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md`
- superseded target: `806cc847cb37a3e428099b45871a4f1a13c4fa6f`

Required boundary:

- do not reuse `p22-rc-806cc847`
- do not move `p22-rc-806cc847`
- do not delete `p22-rc-806cc847` without separate explicit approval
- do not create a GitHub release from `p22-rc-806cc847`

## Independent Approval Switches

| Switch | Status | Meaning |
|---|---|---|
| GitHub release approval | `NOT_APPROVED` | Whether a GitHub release may be created for `p22-rc-7fd17de`. |
| deploy approval | `NOT_APPROVED` | Whether any deployment may be performed. |

Approval for GitHub release does not approve deploy.

Current decision: `BLOCKED_HARD_STOP`

## Expected Release Object

If a future approval authorizes actual GitHub release creation, the expected remote object must be:

- repository: `JENN2046/codex-memory`
- release title: `P22 Security-Fix Release Candidate p22-rc-7fd17de`
- source tag: `p22-rc-7fd17de`
- target commit: `7fd17de624c0da76751e863e97302bed0dbec905`
- artifact reference: `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md`

No GitHub release object is approved by this draft.

If a future approval only authorizes docs recording of a release decision, expected local changed files may include:

- `STATUS.md`
- `MAINTENANCE_BACKLOG.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `.agent_board/*`

## Exclusions

Unless separately approved in an explicit A5 sentence, the following remain excluded:

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

GitHub release rollback must be separately approved if a release is created.

Draft rollback levels:

- docs-only request rollback: revert the docs commit
- before publication: close this approval request with no remote object
- after release creation: delete or edit the GitHub release only with separate explicit approval
- no tag deletion or tag movement is included
- no deploy rollback is included because deploy approval remains `NOT_APPROVED`

This document does not authorize any rollback command.

## Stop Conditions

Stop before any GitHub release or deploy action if:

- the approval sentence does not name GitHub release approval only
- the approval sentence does not name exact tag `p22-rc-7fd17de`
- the approval sentence does not name exact target commit `7fd17de624c0da76751e863e97302bed0dbec905`
- the approval sentence does not reference `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md`
- the approval sentence also approves deploy
- tag `p22-rc-7fd17de` is missing locally or remotely
- local or remote tag target differs from `7fd17de624c0da76751e863e97302bed0dbec905`
- artifact is missing at `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md`
- worktree is dirty
- remote main has drifted unexpectedly
- the command would touch provider, config, startup/watchdog, real memory, durable data, migration/import-export, MCP schema/tools, package/lockfile, `.env`, or secrets
- any output exposes secret-like content
- validation fails

## Approval Sentence Template

### GitHub Release Approval Template

```text
I explicitly approve creating the GitHub release "P22 Security-Fix Release Candidate p22-rc-7fd17de" from tag p22-rc-7fd17de for target commit 7fd17de624c0da76751e863e97302bed0dbec905, referencing docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md, with no deploy, no provider call, no live HTTP MCP startup, no config mutation, no startup/watchdog operation, no real memory preview, no durable memory write, no migration/import-export apply, no public MCP expansion, no package/lockfile change, and no .env or secret change.
```

The template above is not approval while it appears in this document.

## Current Decision

GitHub release approval: `NOT_APPROVED`

Deploy approval: `NOT_APPROVED`

Decision: `BLOCKED_HARD_STOP`

Next safe action: wait for explicit GitHub release approval for `p22-rc-7fd17de`.
