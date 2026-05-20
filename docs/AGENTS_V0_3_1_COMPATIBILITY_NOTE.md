# AGENTS v0.3.1 Compatibility Note

Status: `DRAFT_COMPATIBILITY_NOTE`

This note records a local docs-only suitability conclusion for applying selected
AGENTS v0.3.1 dry-run acceptance concepts to `codex-memory`.

It does not replace `AGENTS.md`, import a v0.3.1 package, enable BHA runtime,
change `.agent_board`, change commit policy, run validation gates, start HTTP,
read memory stores, write durable memory or audit, or claim readiness.

## Current Conclusion

AGENTS v0.3.1 should not replace the current project-level `AGENTS.md`.

The current `codex-memory` instructions are repository-specific and protect
contracts that the generic v0.3.1 text does not fully encode:

- `vcp_codex_memory` MCP service identity.
- Public MCP tool freeze at `record_memory`, `search_memory`, and
  `memory_overview`.
- Current `A4` / `A4.8` codex-memory execution rails.
- P66 / A5-GAP status vocabulary.
- Runtime, provider, memory-write, migration, startup, config, release, and
  cutover hard gates.
- Project-specific validation matrix and `NOT_READY_BLOCKED` readiness truth.

The appropriate direction is `MERGE_SELECTED_CONCEPTS_LATER`, not replacement.

## Current Profile

Current profile: `Standard`.

Detected surfaces:

- `AGENTS.md`: present.
- `.agent_board/`: present.
- `.bha/`: absent.
- `scripts/bha-run.js`: absent.
- `scripts/bha-verify.js`: absent.
- `.githooks/pre-push`: absent.

This means the repository can use text governance and board governance for
local continuity, but it does not have BHA runtime proof.

## BHA State

BHA state: `BHA_ABSENT`.

No BHA-backed trust claim should be made for this repository unless BHA runtime
surfaces are later introduced and verified. Current completion, validation, and
readiness claims must continue to rely on repository reality, project docs,
observed command output, and `.agent_board` continuity state.

## Current Mode

Current mode: `A4` / `A4.8` codex-memory rails.

The repository already uses sustained local autopilot rules tailored to the
existing memory runtime. `.agent_board/RUN_STATE.md` currently describes an
`A4.8 Single-Window 4-Agent Compact Autopilot` rail. That rail is more
project-specific than v0.3.1's generic `A4.5-Sustained-Local-Autopilot`.

Do not downgrade current project rails to generic A4.5 wording without a
separate migration plan and validation pass.

## Concepts Worth Adopting Later

These v0.3.1 concepts are useful as future refinements if merged carefully:

- Startup capsule: concise startup facts such as profile, BHA state, commit
  policy, branch, worktree, goal source, and next safe task.
- Profile and BHA state detection: explicit distinction between `Standard`,
  `BHA Runtime`, `Mixed`, `BHA_ABSENT`, `BHA_DETECTED`, `BHA_VERIFIED`,
  `BHA_STALE`, and `BHA_INVALID`.
- Dry-run acceptance wording: clearer separation between dry-run proof,
  fixture-only proof, no-mutation proof, and live runtime acceptance.
- BHA-aware closeout shape: a closeout format that names evidence source,
  profile, BHA state, validation, skipped validation, blockers, and risk.

Any adoption should preserve codex-memory's current status vocabulary and hard
gates.

## Concepts Not To Adopt Now

These v0.3.1 concepts should remain external for now:

- BHA runtime sections: the repository does not currently have `.bha/`,
  `scripts/bha-run.js`, `scripts/bha-verify.js`, or a BHA verifier-backed
  runtime surface.
- Candidate `commit_policy` defaults: v0.3.1's generic default does not match
  codex-memory's guarded local commit rules and current A4/A4.8 practice.
- Generic `.agent_board` skeleton: this repository already has a mature,
  project-specific `.agent_board` state model.
- Generic final status vocabulary: codex-memory must keep using
  `NOT_READY_BLOCKED`, `COMPLETED_VALIDATED`, `COMPLETED_UNVALIDATED`,
  `PARTIAL`, `BLOCKED`, `FAILED`, and the existing P66/A5-GAP vocabulary.

## Controlling Hard Gates

The following gates remain controlling and are not weakened by this note:

- No durable memory or audit write without explicit A5 authorization.
- No real memory store scan, preview, export, import, or broad read without
  explicit authorization.
- No provider or model calls without explicit authorization.
- No HTTP service start, watchdog install, startup install, or config switch
  without explicit authorization.
- No rebuild, migration, cleanup apply, backup, restore, import/export apply,
  or confirm command without explicit authorization.
- No dependency install or dependency manifest/lockfile change without explicit
  authorization.
- No public MCP expansion beyond `record_memory`, `search_memory`, and
  `memory_overview` without a dedicated approved phase.
- No push, tag, release, deploy, branch creation, or remote write without
  explicit authorization.
- No `RC_READY`, runtime readiness, production readiness, cutover readiness, or
  final readiness claim while current runtime gaps remain open.

Current controlling readiness status remains `NOT_READY_BLOCKED`.

## Safe Next Dry-Run Task

Safe next dry-run task:

`P6-docs-drift / P10-observability-admin`: prepare a narrow follow-up proposal
for merging only v0.3.1 startup capsule and profile/BHA detection wording into
codex-memory docs, without editing `AGENTS.md`.

Suggested acceptance boundary:

- Docs-only.
- No BHA runtime adoption.
- No `.agent_board` skeleton replacement.
- No commit policy change.
- No service start.
- No provider call.
- No real memory store read or write.
- No durable audit write.
- No migration, rebuild, cleanup, apply, or confirm.
- No readiness claim beyond `NOT_READY_BLOCKED`.

Suggested validation for that future docs-only task:

```powershell
git status --short
git diff --name-status
git diff --stat
git diff --check
```
