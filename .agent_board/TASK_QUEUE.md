# TASK_QUEUE.md - codex-memory

> Non-authoritative operational surface. Task selection is owned only by
> `CURRENT_STATE.md`.

This table intentionally contains active work only. Completed tasks are
recoverable through Git history and are never retained here.

| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |
|---|---:|---|---|---|---|---|---|---|---|---|
| CM-2159 | P1 | in_progress | R5-O `_003` invalid-argument repair | High / private exact-head verification pending | Edge/Relay/Governance/native read chain, production hydrator, tests/docs/current facts | Repair the source/test defect exposed by `_003`, deliver it through PR/CI, then request a new exact-authorized source rebind and R5-O `_004` | exact `_003` arguments positive/negative; writer-compatible sparse chunk indexes; hydration failure classification; no fallback; docs/current-facts and CI-safe gates | invalid public arguments and unsafe source projections still fail closed; no runtime/provider/private-config access during repair | Merge remains Jenn-only; rebind and every private runtime/provider attempt require new exact P3 authorization | PR #71 and main CI passed; `_003` consumed once, exact-head rebind accepted, resolve succeeded, the sole search failed closed as `INVALID_ARGUMENT`, and no R5-O result was established |
