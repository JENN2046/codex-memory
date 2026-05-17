# Maintenance Backlog

更新时间：2026-05-18

## Purpose

This active backlog is intentionally compact. The full pre-compression backlog is archived at [docs/archive/MAINTENANCE_BACKLOG_FULL_PRE_CM0302.md](/A:/codex-memory/docs/archive/MAINTENANCE_BACKLOG_FULL_PRE_CM0302.md).

Use this file for current queue selection only. Use `.agent_board/TASK_QUEUE.md` and `.agent_board/VALIDATION_LOG.md` for detailed execution history.

## Current Baseline

- Remote baseline: `1ae4286 test: harden no-touch redaction regressions`.
- Local baseline: local `main` contains P51-P53 local commits and is ahead of `origin/main = 1ae4286`; use `git log --oneline --decorate -n 10` for the exact current HEAD; push is not authorized.
- Current active program: P51-P62 Runtime-Enforced Governed Memory Spine Completion.
- Current phase area: P53 ValidationAggregator evidence inventory, posture bridge, and explicit evidence classification hardening. Evidence-first / fail-closed / reversible boundaries preserved.

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
| P44-T1 | governed-memory-spine | A2 | done | ValidationAggregator P36-P40 Evidence Source Map | changed JS syntax; targeted aggregator tests; `npm test`; boundary scan; Verifier | Complete locally in `ae7655a`; static report-shape evidence only; no fixture read, helper execution, gate/runner execution, live MCP refresh, provider, real memory/runtime store scan, public MCP expansion, or runtime-ready claim. |
| P45-T1 | governed-memory-spine | A2 | done | Fixture-only Final RC Matrix Evaluator Skeleton | changed JS syntax; targeted evaluator tests; `npm test`; boundary scan; Verifier | Complete locally in `5ea714b`. Explicit-input evaluator only; rejects unsupported/warning/unknown/skipped/failed/not_executed evidence, readiness claims, public MCP drift, safety leakage, and A5 bypass attempts; no command execution, evidence collection, helper execution, or full final RC matrix claim. |
| CM-0320 | memory-governance | A2 | done | Governance evidence helper strict schema/version and exact-set review fix | changed JS syntax; targeted helper tests `65/65`; `npm test` `841/841`; `git diff --check`; boundary scan | Complete and pushed in `2b4a956`; hardens P31-P34/P42/P43 helper schema/version/exact-set fail-closed behavior. |
| P46-0 | docs-drift | A1 | done | Post-push board/status reconciliation | `git diff --check`; docs validation; stale wording scan | Complete and validated for the earlier CM-0320 push baseline; superseded by P51-T1 after the authorized P46-P50 push. |
| P46-T1 | memory-governance | A2 | done | HTTP no-token mutation + sensitive redaction hardening | targeted HTTP/helper tests; `git diff --check`; `npm test` | Complete and validated; unified helper redaction through `SensitiveFragmentRedaction.js` and rejected no-token HTTP `record_memory` mutation while preserving authorized bearer write coverage. |
| P47 | memory-governance | A1 | done | Evidence-to-enforcement gap map | `git diff --check`; docs validation; boundary scan | Complete and validated; docs/status/board only; no runtime connection, real memory scan, public MCP expansion, or RC-ready claim. |
| P48 | memory-governance | A2 | done | Evidence-chain consistency guard | targeted fixture/contract tests; `git diff --check`; `npm test` | Complete and validated; test-only guard locks evidence IDs, source type whitelist, schema linkage, blocked actions, fail-closed states, A5 blockers, public MCP freeze, and no-readiness posture as exact sets. |
| P49 | observability-admin | A2 | done | ValidationAggregator P45 posture bridge | targeted aggregator tests; `git diff --check`; `npm test` | Complete and validated; aggregator surfaces P45 evaluator skeleton posture as static report-shape only, without importing/executing evaluator, reading fixtures, running gates/runners, refreshing live MCP, or claiming final RC readiness. |
| P50 | observability-admin | A2 | done | No-touch boundary regression suite | targeted no-touch tests; `git diff --check`; `npm test` | Complete and validated; no-touch regression prevents governance helpers, EvidenceManifestContract, FinalRcMatrixEvaluator, and ValidationAggregator from introducing fs scan, child_process, provider/network, runtime store imports, durable writes, or public MCP expansion. |
| P51-T1 | docs-drift | A1 | done | Post-P50 push board/status reconciliation | `git diff --check`; docs validation; active stale wording scan | Complete and validated; active status/board docs now point to pushed `HEAD == origin/main == 1ae4286`; no source/test/runtime change and no RC-ready claim. |
| P52-T1 | memory-governance | A1/A2 | done | Runtime Schema-Version Enforcement Boundary Plan | `node --check` new test; targeted fixture test; `npm test`; docs validation; `git diff --check` | Complete and validated; docs + synthetic fixture/test contract for schemaVersion / policyVersion / manifestVersion fail-closed exact-set semantics; no runtime enforcement implementation, public MCP expansion, or real memory read. |
| P52-T2 | memory-governance | A2 | done | Minimal Runtime Enforcement Helper | changed JS syntax; targeted helper tests; no-touch regression; `npm test`; `git diff --check`; boundary scan | Complete and validated; pure explicit-input helper over caller-provided object only; covers missing, unknown, unsupported, duplicate, malformed, and mismatched versions while preserving no fs read, command execution, durable write, public MCP expansion, provider call, or real memory read. |
| P53-T1 | observability-admin | A1/A2 | done | ValidationAggregator Evidence Inventory | `node --check` new test; targeted P53 + aggregator tests; `npm test`; docs validation; `git diff --check` | Complete and validated; adds inventory doc, synthetic fixture, and fixture test defining accepted source types, committed/local/runtime/final-RC evidence classes, and fresh/stale/missing/unsupported/blocked/not_executed semantics. Does not execute runner, helper, live MCP, provider, runtime store scan, or real memory read. |
| P53-T2 | observability-admin | A2 | done | ValidationAggregator inventory posture bridge | changed aggregator JS syntax; targeted aggregator tests; `npm test`; `git diff --check`; boundary scan | Complete and validated; surfaces P53 inventory posture as static report-shape evidence only; does not import/read the P53 fixture, execute helper/gate/runner, refresh live MCP, scan runtime stores, or claim full aggregator/runtime/RC readiness. |
| P53-T3 | observability-admin | A2 | done | ValidationAggregator explicit evidence classification hardening | changed aggregator JS syntax; targeted aggregator tests; `npm test`; `git diff --check`; no-touch scan | Complete and validated; explicit caller-provided evidence can declare source class, but only committed/local classes are accepted. Caller-claimed runtime/final-RC evidence fails closed as `unsupported_source_class`; no fs scan, command execution, runtime store scan, provider, or runner execution. |
| P54-T1 | observability-admin | A1/A2 | todo | Final RC runner safe command inventory | docs/fixture/test; `git diff --check`; docs validation; targeted fixture test | Next safe slice: define allowed local validation commands and runner fail-closed boundaries without executing the runner, starting services, calling providers, scanning real memory, or claiming final RC readiness. |

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
