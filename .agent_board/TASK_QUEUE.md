# TASK_QUEUE.md - codex-memory

> Non-authoritative operational surface. Task selection is owned only by
> `CURRENT_STATE.md`.

This table intentionally contains active work only. Completed tasks are
recoverable through Git history and are never retained here.

| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |
|---|---:|---|---|---|---|---|---|---|---|---|
| CM-2159 | P1 | in_progress | R5-O selected-diary runtime hydration | High / private exact-head verification pending | production hydrator, native shim/controller wiring, capability preflight, tests/docs/current facts | Deliver fail-closed production selected-diary hydration through PR/CI, then request one new exact-authorized R5-O attempt | hydrator positive/negative fixtures; shim, R5-N, controller, docs/current-facts and CI-safe mainline gates; fresh merged-main CI before runtime | no primary/source mutation; invalid scope/vector/database/stale state rejects; schema-v6 lifecycle stays default-closed | Merge remains Jenn-only; each private runtime/provider attempt requires new exact P3 authorization | First R5-O attempt failed closed; keep the existing completed receipt and PR #61 product baseline until successful runtime proof and governance closeout |
