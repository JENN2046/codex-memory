# HANDOFF.md — codex-memory

## Goal

Harden scoped recall compatibility, diary rebuild marker parsing, and scope backfill dry-run accounting while preserving `.agent_board` current state.

## Safe State

- Workspace: A:\codex-memory
- Branch: codex/p1-vcp-memory-core-100-roadmap
- HEAD: CM-0046 guarded local commit target
- Worktree: CM-0046 source/test/board batch validated for local commit
- Remote writes: not authorized

## Current Dirty Files

- `src/cli/scope-backfill-dry-run.js`
- `tests/scope-backfill-dry-run.test.js`
- `.agent_board/RUN_STATE.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`
- `.agent_board/DECISIONS.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/CHECKPOINT.md`

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
- CM-0042 PR review fix validation:
  - `node --test .\tests\scope-filter.test.js`: 16/16 passed.
  - `node --test .\tests\mcp-contract.test.js`: 4/4 passed.
  - `npm test`: 176/176 passed.
  - `npm run gate:mainline:strict`: passed; health 200, contract 7/7, test 176/176, compare 43/43, rollback 43/43.
  - `git diff --check`: passed.
- CM-0043 legacy raw chunk recall output sanitization:
  - `node --test .\tests\scope-filter.test.js`: 17/17 passed.
  - `npm test`: 177/177 passed.
  - `npm run gate:mainline:strict`: passed; health 200, contract 7/7, test 177/177, compare 43/43, rollback 43/43.
  - `git diff --check`: passed.
- CM-0044 diary scope header parsing boundary:
  - `node --test .\tests\scope-filter.test.js`: 18/18 passed.
  - `npm test`: 178/178 passed.
  - `npm run gate:mainline:strict`: passed; health 200, contract 7/7, test 178/178, compare 43/43, rollback 43/43.
  - `git diff --check`: passed.
- CM-0045 diary body Tag marker parsing boundary:
  - `node --test .\tests\scope-filter.test.js`: 18/18 passed.
  - `npm test`: 178/178 passed.
  - `npm run gate:mainline:strict`: passed; health 200, contract 7/7, test 178/178, compare 43/43, rollback 43/43.
  - `git diff --check`: passed.
- CM-0046 scope backfill partial-record accounting:
  - `node --test .\tests\scope-backfill-dry-run.test.js`: 6/6 passed.
  - `npm test`: 179/179 passed.
  - `npm run gate:mainline:strict`: passed; health 200, contract 7/7, test 179/179, compare 43/43, rollback 43/43.
  - `git diff --check`: passed.

## Runtime Notes

- MCP mode assumption remains HTTP mainline at `127.0.0.1:7605`.
- Do not install watchdog, change startup tasks, change Codex/Claude config, or switch 7605/6005 without explicit approval.

## Blockers

- No hard blocker to the local autopilot control plane.
- none for CM-0046 local guarded commit.

## Decisions

- Treat `4-Agent` as logical roles; independent agents are read-only until explicit file locks and task contracts exist.
- Do not push, commit, start Phase 2, or touch source files as part of CM-0038.
- Store scope metadata durably in diary headers, but strip internal scope headers before chunk indexing and external recall output.
- Supplied search `scope` fields are always filters; `strict` is an audit/overview hard-isolation intent marker, not the switch that enables filtering.
- Preserve old SQLite scoped-column defaults at write time only when the existing schema has NOT NULL defaults; keep new nullable schemas nullable.
- Keep `search_memory.scope.visibility` schema compatible with runtime support for a string or an array.
- Treat recall result `text` as user-facing output and sanitize internal diary scope markers, including legacy raw chunk rows and cached candidates.
- Parse diary scope metadata only from the header block before `Content:`; marker-like lines in user content remain content.
- Parse rebuilt record tags only from the actual footer `Tag:` capture after `Evidence:`; marker-like body `Tag:` lines remain content.
- Scope backfill dry-run treats partial scope records as incomplete and includes them in missing counters; `wouldUpdate` follows missing recommended-default fields.

## Next Safe Task

Stop before any push or PR metadata update unless explicitly authorized.

## Warnings

- Do not push without explicit approval.
- Do not run real backfill/cleanup/migration without explicit approval.
- Do not modify `.env`, secrets, provider keys, Codex config, or Claude config.
