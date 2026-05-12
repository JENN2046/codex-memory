# HANDOFF.md — codex-memory

## Goal

Start `Single-Window 4-Agent Compact Autopilot` for the current session and restore `.agent_board` to current repository reality.

## Safe State

- Workspace: A:\codex-memory
- Branch: codex/p1-vcp-memory-core-100-roadmap
- HEAD: current local HEAD (latest work includes CM-0041 and board state sync)
- Worktree: clean after local guarded commits through current local HEAD
- Remote writes: not authorized

## Current Dirty Files

- none

## 4-Agent Activation

- Commander: current session; owns serial integration and board updates
- Worker Alpha: read-only diff classifier
- Worker Beta: read-only board drift classifier
- Read-Only Verifier: preflight reviewer for scope, hard stops, validation, and commit readiness

## Validation Evidence

- CM-0038 board validation passed.
- `git diff --check -- .agent_board/*.md`: passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`: passed.
- Read-only Alpha classified the dirty source batch and recommended CM-0039 / CM-0040 validation.
- Read-only Beta found board drift; Commander corrected checkpoint, validation log, source quarantine, and locks.
- Final Read-Only Verifier result: PASS for board/control-plane activation.
- CM-0039 / CM-0040 validation after code review follow-up:
  - `node --test .\tests\scope-filter.test.js`: 14/14 passed.
  - `node --test .\tests\mcp-contract.test.js`: 4/4 passed.
  - `node --test .\tests\mainline-gate-cli.test.js .\tests\gate-ci-cli.test.js`: 4/4 passed.
  - `npm test`: 174/174 passed.
  - `npm run gate:mainline:strict`: passed; health 200, contract 7/7, test 174/174, compare 43/43, rollback 43/43.
  - `git diff --check`: passed.
- CM-0041 risk fix validation:
  - `node --test .\tests\scope-filter.test.js`: 15/15 passed.
  - `node --test .\tests\mcp-contract.test.js`: 4/4 passed.
  - `npm test`: 175/175 passed.
  - `npm run gate:mainline:strict`: passed; health 200, contract 7/7, test 175/175, compare 43/43, rollback 43/43.

## Runtime Notes

- MCP mode assumption remains HTTP mainline at `127.0.0.1:7605`.
- Do not install watchdog, change startup tasks, change Codex/Claude config, or switch 7605/6005 without explicit approval.

## Blockers

- No hard blocker to the local autopilot control plane.
- none for the validated local batch.

## Decisions

- Treat `4-Agent` as logical roles; independent agents are read-only until explicit file locks and task contracts exist.
- Do not push, commit, start Phase 2, or touch source files as part of CM-0038.
- Store scope metadata durably in diary headers, but strip internal scope headers before chunk indexing and external recall output.
- Supplied search `scope` fields are always filters; `strict` is an audit/overview hard-isolation intent marker, not the switch that enables filtering.

## Next Safe Task

Await explicit push approval or next local task. Do not push without approval.

## Warnings

- Do not push without explicit approval.
- Do not run real backfill/cleanup/migration without explicit approval.
- Do not modify `.env`, secrets, provider keys, Codex config, or Claude config.
