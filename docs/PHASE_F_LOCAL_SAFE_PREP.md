# Phase F - VCP Full-Memory Parity Local-Safe Prep

Status: `LOCAL_SAFE_PREP`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `37d802dc2283a06083159c22ceaa24df7d00f3bc`

Workspace: `A:\codex-memory`

Branch: `main`

## Purpose

Prepare the next non-A5 Phase F lane after `RC_PRECHECK_001` readonly precheck and A5-GAP-6 evidence-only aggregation. This document selects safe local work only. It is not approval for runtime execution, public MCP expansion, push, release, deployment, cutover, or readiness claims.

## Current Evidence Boundary

Already recorded:

- `A5-RC-PRECHECK-READONLY` evidence: [docs/RC_PRECHECK_001_READONLY_EVIDENCE.md](/A:/codex-memory/docs/RC_PRECHECK_001_READONLY_EVIDENCE.md)
- `A5-GAP-6` evidence-only aggregation: [docs/RC_PRECHECK_001_A5_GAP_6_AGGREGATION_EVIDENCE.md](/A:/codex-memory/docs/RC_PRECHECK_001_A5_GAP_6_AGGREGATION_EVIDENCE.md)

Current maximum result remains:

```text
EVIDENCE_AGGREGATED_NOT_RC_READY
```

Current controlling project result remains:

```text
NOT_READY_BLOCKED
```

## Allowed Phase F Local-Safe Scope

Allowed by default in this prep lane:

- docs-only VCP parity gap inventory
- fixtures and test-only parity hardening plans
- validation matrix refinement
- observability/admin review surface design drafts
- memory governance proposal drafts
- board/checkpoint/handoff cleanup

## Blocked Without New Exact Approval

Do not perform these from this prep lane:

- runtime implementation or mutation
- public MCP tool/schema expansion
- provider calls
- real memory broad scans
- recall path observation
- durable memory writes
- migration/import/export/backup/restore apply
- config/watchdog/startup changes
- dependency changes
- push/tag/release/deploy/cutover
- A5-GAP-7
- `RC_READY`, runtime readiness, final RC readiness, production readiness, or cutover readiness claim

## Workstream Candidates

| ID | Candidate | Scope | Default Risk | Validation |
|---|---|---|---|---|
| F1 | VCP parity gap inventory refresh | docs-only inventory from existing project docs and source references | A1 | docs validation; `git diff --check` |
| F2 | fixture/test-only parity hardening matrix | plan fixture/test additions without runtime mutation | A1/A2 | docs validation; targeted fixture syntax/test only when implemented |
| F3 | memory governance proposal route | proposal/supersession/tombstone/forget-flow design draft | A1 | docs validation; overclaim scan |
| F4 | observability/admin review surface design | dashboard/report surface design draft only | A1 | docs validation; public MCP freeze scan |
| F5 | validation selection matrix tie-in | map Phase F slices to existing validation selection rules | A1 | docs validation; command existence check when commands are named |

## First Recommended Slice

Start with `F1 - VCP parity gap inventory refresh` because it is docs-only, reversible, and helps choose the next implementation slice without touching runtime behavior.

Suggested next task id:

```text
CM-0525 Phase F readonly VCP parity gap inventory
```

## Acceptance Criteria

This prep lane is complete when:

- Phase F local-safe boundaries are documented.
- `.agent_board/TASK_QUEUE.md` contains the next local-safe Phase F candidates.
- Current state surfaces continue to say `NOT_READY_BLOCKED`.
- No runtime/source/test/dependency/config/runtime-data changes are introduced by this prep slice.
- Validation passes: `git diff --check` and docs validation.

## Explicit Non-Goals

This prep lane does not close runtime gaps, does not make ValidationAggregator full implementation complete, does not authorize recall observation, does not make public MCP expansion safe, does not satisfy A4.8 safe-push by itself, and does not make the project `RC_READY`.
