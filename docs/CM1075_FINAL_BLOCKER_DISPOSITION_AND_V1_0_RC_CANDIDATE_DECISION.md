# CM1075 Final Blocker Disposition And v1.0 RC Candidate Decision

Status: `V1_0_RC_CANDIDATE_READY_NOT_RELEASED`
Date: 2026-05-25
Workspace: `A:\codex-memory`
Branch: `main`
Baseline: `21f51f0ba61001973df6d7b6a471a169eacaa175`

## Purpose

CM-1075 consumes the CM-1074 final matrix and classifies each remaining blocker against the narrowed v1.0 scope.

This decision is not a tag, release, deployment, production cutover, broad runtime readiness claim, memory reliability claim, provider quality claim, cleanup apply approval, rollback apply approval, or public MCP expansion approval.

## Current Verification

| Check | Result |
|---|---|
| `git status -sb` | `## main...origin/main` |
| `git rev-parse HEAD` | `21f51f0ba61001973df6d7b6a471a169eacaa175` |
| `git rev-parse origin/main` | `21f51f0ba61001973df6d7b6a471a169eacaa175` |
| `git ls-remote origin refs/heads/main` | `21f51f0ba61001973df6d7b6a471a169eacaa175` |
| GitHub Actions run `26382885882` | `CI` / `Node.js tests` / `success` |

Remote CI evidence:

- Run URL: `https://github.com/JENN2046/codex-memory/actions/runs/26382885882`
- Head SHA: `21f51f0ba61001973df6d7b6a471a169eacaa175`
- Job: `Node.js tests`
- Completed steps: setup, checkout, Node setup, install, `Run tests`, `Profile CLI smoke`, post steps, complete job
- Failed steps: none

## v1.0 Scope

The v1.0 RC candidate scope is explicitly limited to:

- stable local-first Codex memory MCP kernel
- public MCP frozen at `record_memory`, `search_memory`, and `memory_overview`
- proof memory isolated from normal recall by default
- recall, write, and write-to-recall continuity evidence accepted only as bounded evidence
- reconcile, cleanup preview, HTTP observe, and status surfaces hardened enough for local RC candidate review
- no production deploy, release tag, client config cutover, provider quality claim, or broad reliability claim

## Public MCP Freeze Check

Read-only schema inspection:

```text
public tools = memory_overview, record_memory, search_memory
tool_count = 3
record_has_proof_memory = false
search_has_include_proof_memory = false
record_visibility_has_internal_proof = false
search_scope_visibility_has_internal_proof = false
```

Result: `PUBLIC_MCP_FREEZE_CONFIRMED`.

## Blocker Disposition

### must_close_for_v1_0

None remain open for the narrowed v1.0 RC candidate scope after this disposition.

The prior CM-1074 must-close list was evaluated against a broader final-readiness/cutover frame. CM-1075 narrows v1.0 to an RC candidate, not a release, deployment, production cutover, reliability certification, or provider-backed runtime claim.

### defer_to_v1_1

| Blocker or work item | Disposition |
|---|---|
| Full automated final RC matrix execution/acceptance | Defer. CM-1075 is the final human-readable blocker disposition for the scoped candidate; automating the final matrix as an authority remains v1.1 hardening. |
| ValidationAggregator full implementation | Defer. Current source remains useful as bounded/no-touch evidence, but full current-head evidence ingestion and stale-evidence authority are v1.1 work. |
| Governance runtime/approval/audit loop full closure | Defer. v1.0 does not claim governed production memory action readiness. |
| Broad recall isolation/runtime reliability proof | Defer. v1.0 accepts bounded recall evidence only and does not claim `memory recall reliable`. |
| Broad write reliability proof | Defer. v1.0 accepts bounded write evidence only and does not claim `memory write reliable`. |
| Operational/governance dashboard blocker clearance | Defer. Dashboard blockers remain signal for broader readiness; v1.0 candidate does not require clearing them by runtime/config mutation. |
| Automatic proof-memory retention/tombstone worker | Defer. v1.0 includes default proof isolation; automatic retention execution is v1.1 governance work. |
| Reconcile retry/backoff scheduler or persistence integration | Defer. CM-1067 is design/helper-only; automatic recovery remains v1.1. |
| Admin/governance review surface expansion | Defer. Not required for local-first RC candidate. |

### forbidden_before_v1_0

| Item | Reason |
|---|---|
| Public MCP expansion | Would change the v1.0 contract and expand scope. |
| Provider/API validation or provider-backed quality claim | v1.0 is local-first and this task forbids provider/API calls. |
| True broad `record_memory` / `search_memory` proof expansion | Would turn bounded evidence into reliability work and expand scope. |
| Raw memory, direct `.jsonl`, or raw audit reads | Forbidden by this task and unnecessary for the scoped candidate. |
| Package, dependency, config, watchdog, startup, or client cutover changes | Would move from candidate disposition into install/runtime mutation. |
| Migration/import/export/backup/restore apply | Production-like data movement remains outside v1.0 candidate scope. |
| Cleanup apply or rollback apply | Preview gates remain fail-closed; real apply is not part of v1.0 candidate. |
| Tag, release, deploy, or production cutover | Candidate is not release. |
| Readiness or reliability overclaim | v1.0 candidate does not mean runtime ready, production ready, `memory recall reliable`, or `memory write reliable`. |
| V8/VCP full parity expansion | Strategic future scope, not v1.0 candidate work. |

## Decision

```text
decision = V1_0_RC_CANDIDATE_READY_NOT_RELEASED
rc_state = V1_0_RC_CANDIDATE_READY_NOT_RELEASED
readiness_claimed = false
reliability_claimed = false
runtime_ready_claimed = false
production_ready_claimed = false
release_ready_claimed = false
provider_quality_claimed = false
memory_recall_reliable_claimed = false
memory_write_reliable_claimed = false
```

Rationale:

- `main` is clean and synced at `21f51f0ba61001973df6d7b6a471a169eacaa175`.
- Remote CI for that head passed.
- CM-1074 final matrix exists on remote main.
- Public MCP remains frozen.
- Proof memory is isolated by default.
- The remaining broad blockers are either deferred to v1.1 or forbidden before v1.0 because they would expand scope.
- The v1.0 candidate scope explicitly avoids production deploy, public MCP expansion, provider execution, cleanup/rollback apply, broad reliability claims, and release/tag actions.

## No-Overclaim Boundary

This document permits only an RC candidate decision for the narrowed v1.0 scope.

It does not claim:

- runtime readiness
- production readiness
- release readiness
- provider-backed quality
- broad recall reliability
- broad write reliability
- cleanup apply safety
- rollback apply safety
- migration/import/export/backup/restore readiness
- public MCP expansion readiness
- V8 implementation
- VCP full parity

## Next Step

Prepare a guarded local commit for this docs/status/board disposition, then run push-readiness review if the user wants to publish it.
