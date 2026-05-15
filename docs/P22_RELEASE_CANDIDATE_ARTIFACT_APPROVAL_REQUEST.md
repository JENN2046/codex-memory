# P22 Release Candidate Artifact Approval Request

Phase: `P22.5-release-candidate-artifact-approval-request`

Status: `NOT_APPROVED`

Decision: `BLOCKED_HARD_STOP`

Mode: `A5-approval-request-draft`

Risk: `A4`

## Purpose

Draft the exact approval request required before creating any P22 release-candidate artifact.

This document is not approval. It does not create a release candidate, tag, release, or deployment.

The approved local non-provider RC gate refresh has passed and is recorded in [P22_RELEASE_CANDIDATE_GATE_REFRESH_RESULT.md](./P22_RELEASE_CANDIDATE_GATE_REFRESH_RESULT.md). This request only defines what a future artifact-creation approval must include.

## Target

`target_commit`: `806cc847cb37a3e428099b45871a4f1a13c4fa6f`

`gate_refresh_result`: `PASS`

`approval_request_commit`: `c1bb2984a948220376f3fb4265d64589bc0c94c2`

Latest result-record commit before this request: `afe00c49547f47a89dfc3f5a577c480cba777548`

## Gate Evidence

Recorded evidence from the approved local non-provider gate refresh:

| Gate | Recorded result |
|---|---|
| `git diff --check` | passed |
| docs validation | passed |
| `npm test` | `472/472` passed |
| `npm run gate:ci -- --json` | passed |
| `gate:ci` tests | `457/457` passed |
| `gate:ci` compare | `43/43` passed |
| `gate:ci` rollback | `43/43` passed |
| `gate:ci` providerCalls | `0` |
| `gate:ci` mutated | `false` |
| compare standard suite | `43/43` matched |
| rollback standard suite | `43/43` rollback-ready |

This approval-request phase did not rerun the gates.

## Artifact Scope

The future approved operation may create one release-candidate artifact record only.

Expected artifact content:

- candidate id
- target commit
- gate refresh result and evidence summary
- artifact manifest
- release-candidate notes draft reference
- known gaps and non-goals
- rollback and support references
- public MCP tool freeze confirmation
- `validate_memory` internal-only confirmation
- no provider/config/migration/import-export/public MCP expansion confirmation

Expected artifact form:

- local repository documentation artifact, or
- a future explicitly named release-candidate manifest file

The exact artifact path must be named in the future approval sentence.

## Explicit Exclusions

The future RC artifact creation approval must keep these out of scope unless separately approved:

- no tag
- no release
- no deploy
- no provider smoke or benchmark
- no live HTTP MCP startup
- no startup/watchdog operation
- no Codex config mutation
- no Claude config mutation
- no `claude mcp` command
- no real memory preview
- no durable memory / DB / diary write
- no SQLite migration / `ALTER TABLE`
- no migration/import-export apply
- no MCP schema change
- no public MCP tool expansion
- no package or lockfile change
- no `.env` or secret change

## Rollback Story

Rollback tier: `tier-0-doc-artifact-removal`

If the future approved operation only creates a local docs artifact:

- rollback is deleting or reverting the named artifact file
- no database, memory, provider, config, service, tag, release, or deployment rollback is required
- no backup is required for the artifact-only operation

If the requested operation includes anything beyond docs artifact creation, this request is insufficient and must be replaced by a broader A5 approval packet.

## Stop Conditions

Stop immediately if:

- the future approval sentence does not name the exact artifact path
- the future approval sentence does not name `target_commit`
- the future approval sentence omits the no tag/release/deploy boundary
- the future approval sentence permits provider/config/migration/import-export/public MCP expansion without a separate packet
- worktree is dirty before artifact creation
- target commit or gate result cannot be verified from the recorded docs
- any command would create a tag, release, or deployment
- any command would mutate config, secrets, provider state, DB, diary, memory, MCP schema, or public tools
- any secret-like value appears in output

## Required Approval Sentence

The user must explicitly approve with a sentence equivalent to:

```text
I explicitly approve creating the P22 release-candidate artifact at <artifact-path> for target_commit 806cc847cb37a3e428099b45871a4f1a13c4fa6f using the recorded PASS gate refresh evidence in docs/P22_RELEASE_CANDIDATE_GATE_REFRESH_RESULT.md, with no tag, no release, no deploy, no provider call, no live HTTP MCP startup, no config mutation, no startup/watchdog operation, no real memory preview, no migration/import-export apply, no public MCP expansion, no package/lockfile change, and no .env or secret change.
```

Do not treat the sentence above as approval while it appears in this draft.

## Current Decision

Approval status: `NOT_APPROVED`

Decision: `BLOCKED_HARD_STOP`

Release state: `gate_refresh_passed_rc_not_created`

Follow-up request: [P22_RELEASE_CANDIDATE_ARTIFACT_CREATION_APPROVAL_REQUEST.md](./P22_RELEASE_CANDIDATE_ARTIFACT_CREATION_APPROVAL_REQUEST.md)

Next safe phase: wait for explicit artifact creation approval, or continue docs-only maintenance.
