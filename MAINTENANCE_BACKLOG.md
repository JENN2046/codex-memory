# Maintenance Backlog

更新时间：2026-05-17

## Purpose

This active backlog is intentionally compact. The full pre-compression backlog is archived at [docs/archive/MAINTENANCE_BACKLOG_FULL_PRE_CM0302.md](/A:/codex-memory/docs/archive/MAINTENANCE_BACKLOG_FULL_PRE_CM0302.md).

Use this file for current queue selection only. Use `.agent_board/TASK_QUEUE.md` and `.agent_board/VALIDATION_LOG.md` for detailed execution history.

## Current Baseline

- Remote baseline: `3e3f76d fix: harden local http and governance redaction`.
- Local baseline: `main` is ahead of `origin/main` by CM-0307 `408a92c`, CM-0308 `d1f48c2`, CM-0309 `cb7d1ef`, CM-0310 `251af9c`, CM-0311 `1ed25ad`, CM-0312 `6f7ade4`, post-P40 board sync `ba59537`, P41-T1 `08597d6`, P41-T2 `8895816`, P42-T1 `169f5bc`, and P43-T1 `8af5c64`; P44-T1 is completed/validated in the worktree pending guarded local commit.
- Current active program: P41-P45 Evidence-First Gate Spine.
- Current phase area: P44 ValidationAggregator P36-P40 Evidence Source Map completed; fixture-only / dry-run-only / explicit-input-only boundaries preserved.

## Active Queue

| ID | Area | Risk | Status | Task | Validation | Notes |
|---|---|---|---|---|---|---|
| CM-0301 | docs-drift | A1 | done | Compress active `.agent_board` checkpoint/handoff | `git diff --check`; docs validation; Verifier | Complete locally in `4d8d11a`; full old files archived under `.agent_board/archive/`. |
| CM-0302 | docs-drift | A1 | done | Compress root active status/plan/backlog docs | `git diff --check`; docs validation; reference scan; Verifier | Complete locally in `3d774ad`; full old root docs archived under `docs/archive/`. |
| P34.x | memory-governance | A1 | done | Governance review surface closeout review | `git diff --check`; docs validation; boundary scan; Verifier | Complete locally in `8220d64`; docs/status/board only; no runtime review execution. |
| P35 | governed-memory-spine | A1 | done | Governed memory spine policy gate planning | `git diff --check`; docs validation; boundary scan; Verifier | Complete locally in `29858e6`; docs/status/board only; no runtime policy gate implementation. |
| P35.1 | governed-memory-spine | A1/A2 | done | Governed memory policy gate fixture contract | targeted fixture test; `npm test`; docs validation; Verifier | Complete locally in `c8325b6`; synthetic fixture/test only; preserves `NOT_READY_BLOCKED` and committed/local source-type whitelist. |
| P36-T1 | governed-memory-spine | A1/A2 | done | Scope + A5 Boundary Contract fixture | targeted fixture test; `npm test`; docs validation; Verifier | Complete in local commit `408a92c`; establishes scope metadata, A5 deny list, governance namespace isolation, public MCP freeze, and unknown/missing fail-closed fixtures. |
| P36-T2 | governed-memory-spine | A2 | done | Task Risk Labels Contract | targeted fixture/helper tests; `npm test`; docs validation; Verifier | Complete in local commit `d1f48c2`; defines A4-local-safe / A4.8-guarded / A5-hard-stop as machine-readable, fail-closed semantics. |
| P37-T1 | governed-memory-spine | A2 | done | Policy Decision Envelope Fixture Matrix | targeted fixture tests; `npm test`; docs validation; Verifier | Complete in local commit `cb7d1ef`; remains synthetic fixture evidence only; no vector/candidate/diary recall path integration. |
| P38 | governed-memory-spine | A2 | done | Recall Isolation Fixtures | targeted fixture tests; `npm test`; docs validation; Verifier | Complete in local commit `251af9c`; proves governance records, validation transcripts, redaction samples, policy decisions, blocked/tombstoned/out-of-scope memory stay out of normal recall/candidate/ranking/projection/audit summary. |
| P39 | governed-memory-spine | A2 | done | Synthetic Migration Dry-run Contract | targeted fixture tests; `npm test`; docs validation; Verifier | Complete in local commit `1ed25ad`; dry-run means synthetic fixture or sanitized metadata only; no real memory content read/preview/export/import/scan, migration apply, backup, or restore. |
| P40 | governed-memory-spine | A2 | done | Local Readiness Report | targeted fixture tests; `npm test`; docs validation; Verifier | Complete and validated locally; aggregate P36-P39 local evidence only; does not claim runtime/mainline/push/release/deploy/config/watchdog/v1.0 RC readiness. |
| P41-T1 | governed-memory-spine | A1 | done | Post-P40 Closeout Review | `git diff --check`; docs validation; boundary scan; Verifier | Complete and validated locally; docs/status/board only; confirms P36-P40 local evidence complete but not runtime/mainline/RC/push/release/deploy/config/watchdog ready. |
| P41-T2 | governed-memory-spine | A2 | done | Evidence Manifest Contract Fixture | new fixture syntax/shape test; `npm test`; docs validation; boundary scan; Verifier | Complete and validated locally; synthetic fixture only; defines evidence manifest v1 source types, required gates, blocked actions, critical gate semantics, safety flags, and forbidden claims. |
| P42-T1 | governed-memory-spine | A2 | done | Explicit-Input Evidence Helper | changed JS syntax; targeted helper tests; `npm test`; boundary scan; Verifier | Complete and committed locally in `169f5bc`; pure helper over caller-provided object only; no fs read, directory scan, command execution, durable write, public MCP expansion, runtime policy kernel, or RC-ready claim. |
| P43-T1 | governed-memory-spine | A2 | done | Recall / Migration Isolation Explicit-Input Helper | changed JS syntax; targeted helper tests; `npm test`; boundary scan; Verifier | Complete and committed locally in `8af5c64`; pure helper over caller-provided object only; proves explicit-input isolation for governance records, validation transcripts, redaction samples, policy decisions, blocked/tombstoned/out-of-scope memory, readiness reports, and synthetic migration metadata without touching normal recall/vector/candidate/ranking/projection/audit summary runtime. |
| P44-T1 | governed-memory-spine | A2 | done | ValidationAggregator P36-P40 Evidence Source Map | changed JS syntax; targeted aggregator tests; `npm test`; boundary scan; Verifier | Completed/validated in worktree. Static report-shape evidence only; no fixture read, helper execution, gate/runner execution, live MCP refresh, provider, real memory/runtime store scan, public MCP expansion, or runtime-ready claim. |
| P45-T1 | governed-memory-spine | A2 | todo | Fixture-only Final RC Matrix Evaluator Skeleton | changed JS syntax; targeted evaluator tests; `npm test`; boundary scan; Verifier | Next safe local task after P44 commit. Explicit-input evaluator only; no command execution, evidence collection, helper execution, or full final RC matrix claim. |

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
