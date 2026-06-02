# Phase G Memory Governance Runtime Boundary Plan

更新时间：2026-06-02

Status: `PHASE_G_ACTIVE_AUTHORITATIVE_ENTRY_NOT_RC_READY`

Decision: `PERSONAL_DOGFOOD_READY_NOT_RC_READY`

## Purpose

This document is the current authoritative Phase G execution entrypoint for `codex-memory`.

Phase G starts after the Phase F personal dogfood evidence chain reached `PERSONAL_DOGFOOD_READY_NOT_RC_READY`. Phase G does not claim `RC_READY`, runtime readiness, production readiness, release readiness, cutover readiness, broad recall reliability, or broad write reliability.

The Phase G goal is to turn existing memory governance models, fixtures, approval packets, audit-evidence contracts, lifecycle helpers, and no-apply runtime-prep seams into a staged runtime-boundary plan that can be executed safely.

## CM-1388 Start Facts

- Local task state after CM-1387: post-push A5-GAP-4 live no-write contract refresh accepted at synced `main@8c0a9d22a60c5ce1dcb1f5ce0595b135a27a5496`.
- CM-1388 start local `HEAD`: `69c1ae1312b160a008b394ce8114a3415c78e829`.
- CM-1388 start `origin/main`: `8c0a9d22a60c5ce1dcb1f5ce0595b135a27a5496`.
- CM-1388 start local branch was ahead of `origin/main` by one docs/board evidence commit.
- Worktree was clean at plan creation.
- Phase F evidence chain is locally complete.
- Snapshot should show `localEvidenceComplete=true`, `cleanSyncedHead=false`, `readinessClaimAllowed=false`, and `rcReady=false` while local CM-1387/CM-1388 planning commits are ahead of origin.

This document itself will move local `HEAD` after commit. Repository reality and fresh command output override these start facts.

## Authority Relationship

Use this route order:

1. [STATUS.md](/A:/codex-memory/STATUS.md) for current facts.
2. [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md) for the current high-level route.
3. This document for Phase G execution scope and order.
4. `.agent_board/TASK_QUEUE.md` and `.agent_board/VALIDATION_LOG.md` for active task and validation tracking.

Historical P31/P32/P33/P34/P66 documents are supporting evidence and constraints. They do not replace this current Phase G route.

## Why Phase G Now

Phase F proved a bounded personal dogfood posture:

- live no-write contract accepted
- evidence aggregation accepted
- true-live negative-control recall proof accepted
- one sanitized personal dogfood write accepted
- personal closeout accepted
- post-push no-write contract refresh accepted

That is enough to move from "can this serve personal dogfood under strict boundaries?" to "how do we prevent bad memory from becoming durable recall pollution?"

The next valuable work is not another Phase F proof slice. It is governance runtime boundary work.

## Phase G Objective

Phase G objective:

```text
Make memory proposal, approval, supersession, tombstone, forget/exclusion, lifecycle audit, and governance review behavior safe to stage toward runtime integration without public MCP expansion or readiness overclaim.
```

Phase G is complete only when the project can clearly distinguish:

- fixture-only governance evidence
- no-apply dry-run governance evidence
- temp-local runtime-prep evidence
- exact-approved bounded durable mutation evidence
- blocked public MCP expansion
- blocked broad real-memory scan/export/import
- blocked release/cutover readiness

## G1 Stage Goal

Current stage:

```text
G1 — Memory Governance Runtime Boundary
```

G1 goal:

```text
Create a current, validated, local-safe runtime boundary map for proposal / supersession / tombstone / forget-flow governance, then select the first narrow no-apply implementation slice.
```

G1 is not allowed to mutate real memory or audit logs by default.

## Existing Evidence To Reuse

Primary model and scope docs:

- [MEMORY_GOVERNANCE_MODEL.md](/A:/codex-memory/MEMORY_GOVERNANCE_MODEL.md)
- [CLIENT_SCOPE_MODEL.md](/A:/codex-memory/CLIENT_SCOPE_MODEL.md)
- [docs/LONG_TERM_LOCAL_FIRST_MEMORY_RUNTIME_ROADMAP.md](/A:/codex-memory/docs/LONG_TERM_LOCAL_FIRST_MEMORY_RUNTIME_ROADMAP.md)
- [docs/VCP_MEMORY_PARITY_ROADMAP.md](/A:/codex-memory/docs/VCP_MEMORY_PARITY_ROADMAP.md)

Governance safe-scope closeouts:

- [docs/P31_MEMORY_GOVERNANCE_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P31_MEMORY_GOVERNANCE_CLOSEOUT_REVIEW.md)
- [docs/P32_MEMORY_GOVERNANCE_APPROVAL_PACKET_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P32_MEMORY_GOVERNANCE_APPROVAL_PACKET_CLOSEOUT_REVIEW.md)
- [docs/P33_MEMORY_GOVERNANCE_AUDIT_EVIDENCE_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P33_MEMORY_GOVERNANCE_AUDIT_EVIDENCE_CLOSEOUT_REVIEW.md)
- [docs/P34_GOVERNANCE_REVIEW_SURFACE_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P34_GOVERNANCE_REVIEW_SURFACE_CLOSEOUT_REVIEW.md)

Lifecycle/runtime-prep families:

- `docs/MEMORY_LIFECYCLE_SCOPE_*`
- `docs/CM1320` through `docs/CM1345` lifecycle/governance alias and audit preservation evidence
- `src/core/*Lifecycle*`
- `src/core/*Governance*`
- `tests/*lifecycle*`
- `tests/*governance*`
- `tests/*tombstone*`
- `tests/*supersede*`

## G1 Task Breakdown

### G1.1 Current Governance Runtime Inventory

Purpose: map current source, tests, fixtures, and docs for proposal, validation, supersession, tombstone, forget/exclusion, lifecycle audit, read policy, shadow projection, and candidate-cache invalidation.

Allowed:

- source/test/docs inspection
- docs-only inventory
- no-write local validation
- `.agent_board` updates

Blocked:

- real memory scan
- broad `.jsonl` or raw audit read
- durable write
- runtime apply
- public MCP expansion

Expected artifact:

```text
docs/PHASE_G_G1_GOVERNANCE_RUNTIME_INVENTORY.md
```

### G1.2 Boundary Matrix And First Slice Selection

Purpose: convert inventory into a matrix that marks each governance capability as `implemented`, `fixture-only`, `dry-run-only`, `runtime-prep`, `exact-approval-required`, or `blocked`.

Allowed:

- docs/fixture/test work
- pure helper review
- no-apply dry-run planning

Expected artifact:

```text
docs/PHASE_G_G1_BOUNDARY_MATRIX.md
```

### G1.3 No-Apply Runtime-Prep Slice

Purpose: select and implement the first narrow local-safe no-apply slice if source reality supports it.

Preferred first slice:

```text
governance mutation preview consistency
```

Candidate surfaces:

- tombstone no-apply runtime prep
- supersede no-apply runtime prep
- validation no-apply runtime prep
- shared lifecycle mutation packet normalization
- review-surface summary for no-apply plans

Allowed:

- temp-local fixtures
- source/test changes inside existing internal helpers
- no durable mutation
- no public MCP expansion
- targeted tests

Blocked without exact approval:

- accepting, rejecting, superseding, tombstoning, validating, forgetting, or deleting real memory
- writing durable audit logs outside temp-local test stores
- running migration/import/export/backup/restore apply
- starting or changing runtime services

### G1.4 Validation And Closeout

Minimum validation for docs-only G1.1/G1.2:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
node scripts\validate_autopilot_ledger_consistency.js
```

Minimum validation for source/test G1.3:

```powershell
node --check <changed source/test files>
node --test <targeted governance/lifecycle tests>
git diff --check
node scripts\validate_autopilot_ledger_consistency.js
```

Run broader validation only when touched source risk justifies it.

## Phase G Hard Stops

Stop before:

- public MCP tool or schema expansion
- successful real `record_memory`, `tombstone`, `supersede`, `validate`, `forget`, or governed mutation
- broad real memory scan/export/import
- raw memory, raw `.jsonl`, raw audit, or private content exposure
- durable memory/audit write outside exact-approved bounded scope
- migration/import/export/backup/restore apply
- cleanup or rollback apply
- provider/model calls
- config/watchdog/startup changes
- dependency changes
- push, PR, tag, release, deploy, merge, rebase
- `RC_READY`, runtime readiness, production readiness, release readiness, cutover readiness, broad reliability, or VCP full parity claims

## Phase G Exit Criteria

Phase G can close only when:

- proposal / approval / supersession / tombstone / forget-flow boundaries are mapped against current source behavior
- no-apply governance mutation preview paths are validated
- lifecycle read-policy isolation for unsafe states is validated beyond fixture-only where safe
- audit evidence can distinguish pending, committed, cancelled, and failed governance events without exposing raw private content
- candidate cache and shadow projection invalidation behavior is either validated or explicitly blocked
- any durable mutation proof was separately exact-approved, bounded, sanitized, and reviewed
- public MCP expansion remains blocked unless separately approved
- `RC_READY` remains false unless a later RC process satisfies its own evidence matrix

## Current Next Safe Action

Start with G1.1 after this route-entry plan is committed:

```text
CM-1389 Phase G governance runtime inventory
```

Recommended scope:

- inspect current governance/lifecycle source and tests
- create `docs/PHASE_G_G1_GOVERNANCE_RUNTIME_INVENTORY.md`
- update `.agent_board`
- run docs validation and ledger consistency

Do not execute runtime governance actions, memory tools, provider calls, durable writes, broad real-memory reads, config/watchdog/startup changes, public MCP expansion, or readiness claims.
