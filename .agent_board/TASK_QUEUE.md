# TASK_QUEUE.md - codex-memory

> Non-authoritative operational surface. Task selection is owned only by
> `CURRENT_STATE.md`.

This table intentionally contains active work only. Completed tasks are
recoverable through Git history and are never retained here.

| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |
|---|---:|---|---|---|---|---|---|---|---|---|
| CM-2159 | P1 | in_progress | Governed Read Attempt refactor | High / private exact-head verification remains blocked | attempt contract; Edge/Relay/Governance/Bridge/Shim/provider/worker/scope/Observer chain; source projection; tests/docs/current facts | Preserve the four delivered governed-read construction items and record the failed-closed `_005` outcome without closing CM-2159 | attempt identity/chain/tamper/terminal tests; source projection and exact-writer tests; real-transport synthetic replay and stage injection; unchanged tool names/input schemas; v1 response rejection after cutover; current-facts/docs gates | attempt-v1 never falls back; unknown counters remain null; primary writes/fallback remain zero; coordinator loss records `terminal_missing` without a forged terminal; accepted runtime identity remains unchanged without further lifecycle action | Any new status, lifecycle, provider, resolver, search, memory-tool action, or merge requires its applicable current exact authority; `_005` must not be retried | PRs #73-#76 are on main and main CI passed; stopped-state rebind and one low-disclosure status were accepted; `_005` was consumed at resolve with no usable project_context_ref, so search_memory was not invoked and no attempt terminal exists; do not add an intermediate CM/CMV row |
