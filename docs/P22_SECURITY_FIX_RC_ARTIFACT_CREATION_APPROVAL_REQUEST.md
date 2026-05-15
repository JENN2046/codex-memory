# P22 Security Fix RC Artifact Creation Approval Request

Phase: `P22-security-fix-rc-artifact-creation-approval-request`

Mode: `A5-approval-request-draft`

Risk: `A4`

Status: `NOT_APPROVED`

Decision: `BLOCKED_HARD_STOP`

## Purpose

Request explicit approval to create the new local P22 release-candidate artifact after the security fix and fresh gate refresh.

This document is an approval request only. It is not approval, not an artifact, not a tag, not a GitHub release, and not a deploy.

## Requested Operation

Requested operation: create one local Markdown release-candidate artifact for the security-fix target.

Proposed artifact:

- artifact id: `p22-rc-7fd17de`
- artifact type: local Markdown release-candidate artifact document
- artifact path: `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md`
- target commit: `7fd17de624c0da76751e863e97302bed0dbec905`
- suggested future tag: `p22-rc-7fd17de`
- release state after operation: `RC_ARTIFACT_CREATED_TAG_RELEASE_DEPLOY_NOT_PERFORMED`

The artifact would summarize the fresh gate refresh PASS evidence, security fix coverage, manifest fields, known gaps, rollback/support story, public MCP tool freeze, and explicit release boundaries.

## Evidence Base

The requested artifact creation relies on the completed security-fix gate refresh result:

- [P22_SECURITY_FIX_FRESH_RC_GATE_REFRESH_APPROVAL_REQUEST.md](/A:/codex-memory/docs/P22_SECURITY_FIX_FRESH_RC_GATE_REFRESH_APPROVAL_REQUEST.md)
- [P22_SECURITY_FIX_FRESH_RC_GATE_REFRESH_RESULT.md](/A:/codex-memory/docs/P22_SECURITY_FIX_FRESH_RC_GATE_REFRESH_RESULT.md)
- [P22_RELEASE_CANDIDATE_ARTIFACT_MANIFEST_SHAPE.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_ARTIFACT_MANIFEST_SHAPE.md)
- [P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md](/A:/codex-memory/docs/P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md)

Recorded fresh gate refresh evidence:

- `rc_target_commit`: `7fd17de624c0da76751e863e97302bed0dbec905`
- `approval_request_commit`: `1ad3477b0f46eceef55608c0bbd3243c15681f38`
- execution model: temporary gate execution checkout whose `HEAD` equaled `rc_target_commit`
- execution checkout: `A:\codex-memory-gate-7fd17de`
- temporary worktree: created, verified, then removed
- result: `PASS`
- `git diff --check`: passed
- docs validation: passed
- `node --test tests\security-write-policy.test.js`: `3/3` passed
- `npm test`: `473/473` passed
- `npm run gate:ci -- --json`: passed
- `gate:ci` tests: `458/458`
- `gate:ci` compare: `43/43`
- `gate:ci` rollback: `43/43`
- `gate:ci` `noProvider=true`
- `gate:ci` `mutated=false`
- compare standard suite: `43/43` matched
- rollback standard suite: `43/43` rollback-ready

These are recorded results. This approval-request phase does not rerun gates.

## Superseded Candidate Boundary

The previous candidate tag and artifact are superseded by the security fix:

- superseded artifact: `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md`
- superseded tag: `p22-rc-806cc847`
- superseded target: `806cc847cb37a3e428099b45871a4f1a13c4fa6f`

Required boundary:

- do not reuse `p22-rc-806cc847`
- do not move `p22-rc-806cc847`
- do not treat `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md` as the current final candidate
- create a new artifact only after explicit approval for `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md`
- request a separate tag approval before creating or pushing `p22-rc-7fd17de`

## Exact Commands Requested After Approval

If approved, the next phase may perform only these local docs/board actions:

1. Create `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md`.
2. Update `STATUS.md`, `MAINTENANCE_BACKLOG.md`, `CODEX_MEMORY_NEXT_PHASE_PLAN.md`, and `.agent_board/*` to record that the new RC artifact was created.
3. Run:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
git diff --cached --check
```

4. Create a guarded local commit if validation and scope checks pass.
5. Safe-push that commit if readiness passes.
6. Verify local `HEAD`, local `origin/main`, and remote `refs/heads/main` match after push.

No other commands are requested by this approval packet.

## Explicit Exclusions

The requested approval must exclude:

- no tag creation
- no tag movement
- no tag push
- no GitHub release
- no deploy
- no provider smoke
- no provider benchmark
- no provider call
- no live HTTP MCP startup
- no startup/watchdog operation
- no scheduled task operation
- no HKCU Run edit
- no Codex config mutation
- no Claude config mutation
- no `claude mcp` command
- no real memory preview
- no durable memory / DB / diary write
- no SQLite migration
- no `ALTER TABLE`
- no migration/import-export apply
- no MCP schema change
- no public MCP tool expansion
- no public exposure of `validate_memory`
- no package or lockfile change
- no `.env` or secret change

## Artifact Content Boundaries

The artifact may include:

- candidate id `p22-rc-7fd17de`
- target commit `7fd17de624c0da76751e863e97302bed0dbec905`
- recorded fresh gate refresh result
- security fix coverage summary
- gate evidence summary
- public MCP tools list
- `validate_memory` internal-only status
- no-provider / no-config / no-migration / no-import-export / no-tag / no-release / no-deploy confirmations
- known gaps
- rollback story
- support handoff
- approval status and creation metadata

The artifact must not include:

- secrets
- raw `.env` values
- provider keys
- auth tokens
- private config values
- raw workspace IDs in low-risk summaries
- broad real memory content
- claims that a tag, GitHub release, or deploy has occurred

## Rollback Story

Rollback tier: `tier-0-doc-artifact-removal`

If the approved operation only creates the named local docs artifact and board/status updates:

- rollback path is reverting the artifact creation commit
- no database rollback is required
- no memory rollback is required
- no provider rollback is required
- no config rollback is required
- no service/watchdog rollback is required
- no tag/release/deploy rollback is required

If the requested operation expands beyond this docs artifact scope, this approval request becomes invalid and must be replaced.

## Stop Conditions

Stop before artifact creation if:

- the explicit approval sentence is absent
- the explicit approval sentence names a different target commit
- the explicit approval sentence omits the artifact path
- the explicit approval sentence permits tag creation, tag movement, GitHub release, deploy, provider, config mutation, startup/watchdog operation, real memory preview, durable memory write, migration/import-export apply, or public MCP expansion
- worktree is dirty with unrelated or unexplained changes
- target commit evidence cannot be verified from the recorded docs
- any command output exposes secret-like content
- any validation fails
- creating the artifact would require changing `src/`, tests, package files, lockfiles, `.env`, MCP schema/tools, runtime config, durable DB, diary, vector index, or real memory

## Required Approval Sentence

To approve the next phase, reply with a sentence equivalent to:

```text
I explicitly approve creating the P22 release-candidate artifact docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md for target commit 7fd17de624c0da76751e863e97302bed0dbec905, limited to creating that local Markdown artifact plus STATUS, MAINTENANCE_BACKLOG, CODEX_MEMORY_NEXT_PHASE_PLAN, and .agent_board updates, with docs validation, guarded commit, safe-push, and post-push hash verification allowed, and with no tag, no tag movement, no GitHub release, no deploy, no provider call, no live HTTP MCP startup, no config mutation, no startup/watchdog operation, no real memory preview, no durable memory write, no migration/import-export apply, no public MCP expansion, no package/lockfile change, and no .env or secret change.
```

The sentence above is a template only. It is not approval while it appears in this document.

## Current Decision

Approval status: `NOT_APPROVED`

Decision: `BLOCKED_HARD_STOP`

Release state: `FRESH_GATE_REFRESH_PASSED_RC_ARTIFACT_NOT_CREATED`

Next safe action: wait for explicit A5 approval using the requested scope above, or continue docs-only maintenance.
