# HANDOFF.md — codex-memory

## Goal

Prepare the sustained autopilot rail change set for a clean, separate commit.

## Safe State

Runtime code is not being changed. The active worktree changes are documentation, policy, board files, and local validation scripts.

## Workspace / Branch

- Workspace: A:\codex-memory
- Branch: main
- Worktree: autopilot rail changes present locally

## Queue Summary

- done: P1-4 suite expansion, P2-1 checkpoint index
- in_progress: CM-0003 autopilot rail review
- blocked: none
- remaining: stage, then wait for commit approval

## Changed Files

- `AGENTS.md`
- `.agent_board/*.md`
- `README_CODEX_MEMORY_AUTOPILOT.md`
- `scripts/validate-local.ps1`
- `scripts/validate-local.sh`

## Validation Evidence

- npm test: not run
- gate:mainline: not run for autopilot rail; last pushed mainline was green after `1159873`
- gate:mainline:strict: not run
- validate-local.ps1 docs path: passed after fixing argument forwarding
- validate-local.sh syntax: passed
- compare suite: latest known `36/36 matched`
- rollback suite: latest known `36/36 rollback-ready`
- observe:http: not run
- profile gate: not run
- provider smoke: not run

## Runtime Notes

- MCP mode: HTTP mainline assumption, verify before runtime claims
- HTTP health: latest known `200` from gate
- Rollback readiness: latest known `36/36 rollback-ready`
- Audit impact: none expected
- Recall impact: none expected

## Blockers

- none

## Decisions

- Keep sustained autopilot rail separate from runtime changes.
- Do not push without explicit user approval.

## Next Safe Task

Stage only the autopilot files and stop before commit.

## Warnings

- Verify repository reality before trusting this handoff.
- Do not push without explicit approval.
- Do not apply rollback config patches without explicit approval.
- Do not run profile confirm/apply without explicit approval.
