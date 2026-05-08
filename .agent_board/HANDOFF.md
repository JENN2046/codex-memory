# HANDOFF.md — codex-memory

## Goal

Sync MAINTENANCE_BACKLOG, RUN_STATE, and HANDOFF with actual git state. M-006 through M-011 are all done and committed; M-011 (`3493480`) is local-only, not pushed. Next real work is M-001.

## Safe State

Runtime code is not being changed. This is a docs-only board sync batch. No `src/`, `tests/`, `package.json`, or `.github/workflows` changes.

## Workspace / Branch

- Workspace: A:\codex-memory
- Branch: main
- Local HEAD: `3493480 docs: add gate ci fixture-only design`
- Remote HEAD: `95c525b docs: add next phase governance plan`
- Unpushed: `3493480` (M-011 gate:ci design document)

## Queue Summary

- done: M-006/M-007 docs compression, M-008 next-phase plan, M-009 Claude MCP acceptance, M-010 docs governance, M-011 gate:ci design
- done: board sync (current task)
- in_progress: guarded local commit for board sync batch
- blocked: none locally
- remaining: M-001/M-002/M-003 donor-compatibility, M-004/M-005 provider-profile, M-012/M-013 governance/scope models
- push: requires explicit remote authorization; `3493480` (M-011) is still unpushed

## Changed Files (this batch)

- `MAINTENANCE_BACKLOG.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/HANDOFF.md`

## Validation

- `git diff --check` (docs-only board sync, no runtime change)

## Runtime Notes

- MCP mode: HTTP mainline assumption
- HTTP health: latest known `200` from CMV-0045
- Standard suite: `39/39 matched`
- Rollback readiness: `39/39 rollback-ready`
- Audit impact: none
- Recall impact: none

## Next Safe Task

After this board sync commit: start M-001 — pick one user-perceptible donor DeepMemo/TopicMemo case, create input fixture, register in standard suite, run compare.

## Warnings

- Do not push without explicit approval.
- Do not run provider-smoke or provider-benchmark without explicit authorization.
- Do not run rebuild-profile --confirm or cleanup apply without explicit authorization.
- Keep M-012/M-013 as design-only; do not modify SQLite schema or MCP contract.
