# P22 Release Candidate Notes Draft

Status: `DRAFT_ONLY`

This is a release-candidate notes draft, not a release.

This document is a release-candidate notes draft. It is not a release note, not a release candidate artifact, and not approval to create one.

No release candidate was created. No tag was created. No release was published. No deploy was performed.

## Candidate Scope

Current candidate target:

- `rc_target_commit`: `806cc847cb37a3e428099b45871a4f1a13c4fa6f`
- `approval_request_commit`: `c1bb2984a948220376f3fb4265d64589bc0c94c2`
- gate execution model: temporary detached worktree / temporary worktree whose `HEAD` equals `rc_target_commit`
- release candidate state: `NOT_CREATED`
- tag / release / deploy state: `NOT_PERFORMED`

The candidate scope is limited to the current P22 practical-parity readiness evidence for `vcp_codex_memory`.

Protected contract:

- MCP service name remains `vcp_codex_memory`
- public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`
- `validate_memory` remains internal-only
- HTTP MCP remains the default Codex Desktop stability path
- stdio MCP remains a debug / compatibility path
- SQLite shadow store, diary-compatible memory, vector/chunk indexes, Codex / Claude config, startup/watchdog state, and provider credentials remain protected

## What Has Passed

The approved local non-provider gate refresh was recorded as `PASS` in [P22_RELEASE_CANDIDATE_GATE_REFRESH_RESULT.md](./P22_RELEASE_CANDIDATE_GATE_REFRESH_RESULT.md).

Recorded pass evidence:

- `git diff --check`: passed
- docs validation: passed
- `npm test`: `472/472` passed
- `npm run gate:ci -- --json`: passed
- `gate:ci` tests: `457/457` passed
- `gate:ci` compare: `43/43` passed
- `gate:ci` rollback: `43/43` passed
- `gate:ci` providerCalls: `0`
- `gate:ci` mutated: `false`
- compare standard suite: `43/43` matched
- rollback standard suite: `43/43` rollback-ready

P22 planning artifacts are also complete as planning evidence:

- [P22_RELEASE_CANDIDATE_PLAN.md](./P22_RELEASE_CANDIDATE_PLAN.md)
- [P22_RELEASE_CANDIDATE_READINESS_INVENTORY.md](./P22_RELEASE_CANDIDATE_READINESS_INVENTORY.md)
- [P22_RELEASE_CANDIDATE_GATE_MATRIX_DRY_RUN_PLAN.md](./P22_RELEASE_CANDIDATE_GATE_MATRIX_DRY_RUN_PLAN.md)
- [P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md](./P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md)
- [P22_RELEASE_CANDIDATE_APPROVAL_PACKET_TEMPLATE.md](./P22_RELEASE_CANDIDATE_APPROVAL_PACKET_TEMPLATE.md)
- [P22_RELEASE_CANDIDATE_PLANNING_CLOSEOUT_REVIEW.md](./P22_RELEASE_CANDIDATE_PLANNING_CLOSEOUT_REVIEW.md)

## What Remains Blocked

The gate refresh pass does not authorize any release or live-adjacent operation.

Still blocked without separate explicit approval:

- release candidate artifact creation
- tag creation
- release publishing
- deploy
- branch push or remote write
- Codex / Claude config mutation
- live HTTP MCP startup or runtime observation
- startup task, watchdog, scheduled task, service, or HKCU Run changes
- provider smoke / benchmark or any provider-backed call
- broad real memory preview
- durable memory / DB / diary write
- SQLite migration or `ALTER TABLE`
- import/export apply
- MCP schema change
- public MCP tool expansion
- exposing `validate_memory` as a public MCP tool
- package or dependency change

Strict mainline gate was not part of the recorded non-provider gate refresh. If a future release process requires it, the exact scope must be reviewed and explicitly approved before execution.

## Known Gaps

- No release candidate artifact exists.
- No release tag exists.
- No release has been published.
- No deployment has been performed.
- No live HTTP MCP observation was performed in the recorded gate refresh.
- No live Claude acceptance refresh was performed.
- Interactive Claude `/mcp` panel evidence remains outside this draft.
- No provider smoke or provider benchmark evidence was collected.
- No migration, import/export apply, backup creation, restore, or durable data operation was performed.
- No real Codex / Claude config mutation was performed.
- The gate refresh evidence is pinned to `rc_target_commit`; future candidate changes require fresh evidence for the new exact commit.

## Non-Goals

This draft does not:

- create or approve a release candidate
- tag, release, deploy, or publish
- change runtime behavior
- change MCP schema or public tools
- expose `validate_memory` publicly
- edit `src/`, tests, package manifests, lockfiles, `.env`, or secrets
- start services or install watchdog/startup behavior
- call providers
- read broad real memory content
- run migration or import/export apply
- replace the P22 approval packet

## Operator Warnings

Do not treat `PASS` gate evidence as a release.

Do not run release-candidate commands from the main workspace unless a future approval explicitly names that execution model. The documented gate refresh model uses a temporary gate execution checkout whose `HEAD` equals the approved `rc_target_commit`.

Do not treat ambiguous phrases such as `continue`, `go ahead`, `do it`, `继续`, or `自动推进` as approval for release, tag, deploy, config mutation, provider calls, live service startup, migration, import/export apply, or public MCP expansion.

Stop and sanitize if any command output contains secrets, provider keys, private config values, raw `.env` contents, auth tokens, raw workspace IDs in low-risk summaries, or broad real memory content.

## Rollback And Support References

Primary rollback/support reference:

- [P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md](./P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md)

Supporting references:

- [P22_RELEASE_CANDIDATE_GATE_REFRESH_APPROVAL_REQUEST.md](./P22_RELEASE_CANDIDATE_GATE_REFRESH_APPROVAL_REQUEST.md)
- [P22_RELEASE_CANDIDATE_GATE_REFRESH_RESULT.md](./P22_RELEASE_CANDIDATE_GATE_REFRESH_RESULT.md)
- [P22_RELEASE_CANDIDATE_APPROVAL_PACKET_TEMPLATE.md](./P22_RELEASE_CANDIDATE_APPROVAL_PACKET_TEMPLATE.md)
- [P20_ROLLBACK_BACKUP_OPERATIONS_PLAN.md](./P20_ROLLBACK_BACKUP_OPERATIONS_PLAN.md)

Rollback tier for the recorded non-provider gate refresh is `tier-1-gate-failure`: if a gate fails in a future approved refresh, stop the RC path, preserve the redacted failure summary, and repair only in a separate scoped phase.

## Draft Conclusion

Current conclusion: `P22_RC_NOTES_DRAFT_READY_RELEASE_NOT_PERFORMED`

The candidate has recorded local non-provider gate refresh evidence for the pinned target commit, but no release candidate has been created and no release action has been performed.

Next release-adjacent action requires a separate explicit approval packet naming the exact target commit, operation, scope, commands, rollback story, and stop conditions.
