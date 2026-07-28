# TASK_QUEUE.md - codex-memory

> Non-authoritative operational surface. Task selection is owned only by
> `CURRENT_STATE.md`.

This table intentionally contains active work only. Completed tasks are
recoverable through Git history and are never retained here.

| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |
|---|---:|---|---|---|---|---|---|---|---|---|
| CM-2159 | P1 | in_progress | governed full-stack controller source identity | High / runtime-adjacent source-only implementation | `scripts/`, `schemas/`, `tests/`, controller docs and active governance pointers | Replace schema-v5 whole-HEAD binding with manifest-v1 source identity and fail-closed schema-v6 compatibility | targeted manifest/controller negative paths; docs/current-facts/ledger validators; default-safe suite; independent governance review | v4/v5 status and controlled stop remain recognizable; transitional start writes no profile; runtime-critical drift still rejects before spawn | Real status/lifecycle/adoption requires a separate exact P3 authorization after implementation PR merge; main merge remains Jenn-only | Product baseline remains PR #61; no runtime, provider, configuration, public MCP, dependency, CI, release, deploy, or readiness action in this phase |
