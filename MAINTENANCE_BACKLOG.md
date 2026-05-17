# Maintenance Backlog

更新时间：2026-05-17

## Purpose

This active backlog is intentionally compact. The full pre-compression backlog is archived at [docs/archive/MAINTENANCE_BACKLOG_FULL_PRE_CM0302.md](/A:/codex-memory/docs/archive/MAINTENANCE_BACKLOG_FULL_PRE_CM0302.md).

Use this file for current queue selection only. Use `.agent_board/TASK_QUEUE.md` and `.agent_board/VALIDATION_LOG.md` for detailed execution history.

## Current Baseline

- Remote baseline: `d210947 fix: redact governance helper output`.
- Local ahead commits: `83bd388`, `9d3ab69`, `b9965f7`, `280ab9b`, `c06436d`, `4d8d11a`, `3d774ad`, `8220d64`, `29858e6`, `c8325b6`.
- Current active program: P28-P40 Governed Memory Spine.
- Current phase area: post-CM0305 board reconciliation; P35.2 not started per user instruction.

## Active Queue

| ID | Area | Risk | Status | Task | Validation | Notes |
|---|---|---|---|---|---|---|
| CM-0301 | docs-drift | A1 | done | Compress active `.agent_board` checkpoint/handoff | `git diff --check`; docs validation; Verifier | Complete locally in `4d8d11a`; full old files archived under `.agent_board/archive/`. |
| CM-0302 | docs-drift | A1 | done | Compress root active status/plan/backlog docs | `git diff --check`; docs validation; reference scan; Verifier | Complete locally in `3d774ad`; full old root docs archived under `docs/archive/`. |
| P34.x | memory-governance | A1 | done | Governance review surface closeout review | `git diff --check`; docs validation; boundary scan; Verifier | Complete locally in `8220d64`; docs/status/board only; no runtime review execution. |
| P35 | governed-memory-spine | A1 | done | Governed memory spine policy gate planning | `git diff --check`; docs validation; boundary scan; Verifier | Complete locally in `29858e6`; docs/status/board only; no runtime policy gate implementation. |
| P35.1 | governed-memory-spine | A1/A2 | done | Governed memory policy gate fixture contract | targeted fixture test; `npm test`; docs validation; Verifier | Complete locally in `c8325b6`; synthetic fixture/test only; preserves `NOT_READY_BLOCKED` and committed/local source-type whitelist. |
| P35.2 | governed-memory-spine | A2 | todo | Governed memory policy gate explicit-input helper candidate | targeted helper tests; `npm test`; docs validation; Verifier | Not started. Only proceed after user resumes; must remain pure helper over caller-provided objects with no runtime policy gate or durable side effect. |

## Standing Boundaries

- No push/tag/release/deploy without explicit user instruction.
- No provider/model call.
- No real memory scan/preview/export/import.
- No SQLite migration apply.
- No backup/restore.
- No service/watchdog/startup install.
- No Codex/Claude config switch.
- No public MCP expansion.
- No `.env`/secret edit.
- No durable memory/audit write unless separately approved.

## Archive

- Full backlog before compression: [docs/archive/MAINTENANCE_BACKLOG_FULL_PRE_CM0302.md](/A:/codex-memory/docs/archive/MAINTENANCE_BACKLOG_FULL_PRE_CM0302.md)
