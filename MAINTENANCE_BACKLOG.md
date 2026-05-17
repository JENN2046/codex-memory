# Maintenance Backlog

更新时间：2026-05-17

## Purpose

This active backlog is intentionally compact. The full pre-compression backlog is archived at [docs/archive/MAINTENANCE_BACKLOG_FULL_PRE_CM0302.md](/A:/codex-memory/docs/archive/MAINTENANCE_BACKLOG_FULL_PRE_CM0302.md).

Use this file for current queue selection only. Use `.agent_board/TASK_QUEUE.md` and `.agent_board/VALIDATION_LOG.md` for detailed execution history.

## Current Baseline

- Remote baseline: `3e3f76d fix: harden local http and governance redaction`.
- Local baseline: `main` is aligned with `origin/main`; current P36-T1 work is uncommitted.
- Current active program: P36-P40 Boundary-first Governed Memory Spine.
- Current phase area: P36 Scope And A5 Boundary Contract; fixture-only / dry-run-only.

## Active Queue

| ID | Area | Risk | Status | Task | Validation | Notes |
|---|---|---|---|---|---|---|
| CM-0301 | docs-drift | A1 | done | Compress active `.agent_board` checkpoint/handoff | `git diff --check`; docs validation; Verifier | Complete locally in `4d8d11a`; full old files archived under `.agent_board/archive/`. |
| CM-0302 | docs-drift | A1 | done | Compress root active status/plan/backlog docs | `git diff --check`; docs validation; reference scan; Verifier | Complete locally in `3d774ad`; full old root docs archived under `docs/archive/`. |
| P34.x | memory-governance | A1 | done | Governance review surface closeout review | `git diff --check`; docs validation; boundary scan; Verifier | Complete locally in `8220d64`; docs/status/board only; no runtime review execution. |
| P35 | governed-memory-spine | A1 | done | Governed memory spine policy gate planning | `git diff --check`; docs validation; boundary scan; Verifier | Complete locally in `29858e6`; docs/status/board only; no runtime policy gate implementation. |
| P35.1 | governed-memory-spine | A1/A2 | done | Governed memory policy gate fixture contract | targeted fixture test; `npm test`; docs validation; Verifier | Complete locally in `c8325b6`; synthetic fixture/test only; preserves `NOT_READY_BLOCKED` and committed/local source-type whitelist. |
| P36-T1 | governed-memory-spine | A1/A2 | in_progress | Scope + A5 Boundary Contract fixture | targeted fixture test; `npm test`; docs validation; Verifier | Establishes scope metadata, A5 deny list, governance namespace isolation, public MCP freeze, and unknown/missing fail-closed fixtures. |
| P36-T2 | governed-memory-spine | A2 | todo | Task Risk Labels Contract | targeted fixture/helper tests; `npm test`; docs validation; Verifier | Define A4-local-safe / A4.8-guarded / A5-hard-stop as machine-readable, fail-closed semantics. |
| P37-T1 | governed-memory-spine | A2 | todo | Policy Decision Envelope Fixture Matrix | targeted fixture/helper tests; `npm test`; docs validation; Verifier | Must remain synthetic fixture evidence only; no vector/candidate/diary recall path integration. |

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
