# TASK_QUEUE.md - codex-memory

> Non-authoritative operational surface. Task selection is owned only by
> `CURRENT_STATE.md`.

This table intentionally contains active work only. Completed tasks are
recoverable through Git history and are never retained here.

| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |
|---|---:|---|---|---|---|---|---|---|---|---|
| CM-2159 | P1 | in_progress | R5-O schema-v6 source-manifest rebind | High / private exact-head verification pending | lifecycle controller, source-manifest profile binding, tests/docs/current facts | Deliver an explicit stopped-stack schema-v6-to-v6 rebind path through PR/CI, then request one new exact-authorized R5-O attempt | positive eligibility and acceptance; dirty/non-main/non-descendant/running-stack rejection; profile-commit rollback; CLI, docs/current-facts and CI-safe gates | ordinary start remains strict; candidate processes roll back before old profile is replaced; unknown processes are not stopped | Merge remains Jenn-only; rebind and every private runtime/provider attempt require new exact P3 authorization | PR #70 and main CI passed; authorization _002 failed closed before lifecycle/read because the schema-v6 profile could not rebind changed runtime source |
