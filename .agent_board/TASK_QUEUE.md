# TASK_QUEUE.md - codex-memory

> Non-authoritative operational surface. Task selection is owned only by
> `CURRENT_STATE.md`.

This table intentionally contains active work only. Completed tasks are
recoverable through Git history and are never retained here.

| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |
|---|---:|---|---|---|---|---|---|---|---|---|
| CM-2159 | P1 | in_progress | Governed Read Attempt refactor | High / public response cutover and private exact-head verification pending | attempt contract; Edge/Relay/Governance/Bridge/Shim/provider/worker/scope/Observer chain; source projection; tests/docs/current facts | Deliver four ordered PRs: attempt-v1 contract and terminal CAS; two-pass source projection and exact-writer harness; lease-scoped vertical runtime; hard-cut ChatGPT Edge data response v2 | attempt identity/chain/tamper/terminal tests; source projection and exact-writer tests; real-transport synthetic replay and stage injection; unchanged tool names/input schemas; v1 response rejection after cutover; full local gates | attempt-v1 never falls back; unknown counters remain null; primary writes/fallback remain zero; coordinator loss records `terminal_missing` without a forged terminal; stack remains stopped | Merge remains Jenn-only; v2 cutover scope, post-merge rebind, and `_005` each retain their stated current-authorization boundary | PRs #73 and #74 are on main; the lease-scoped vertical runtime is the current construction item; `_004` remains consumed and failed closed; the schema-v6 stack remains stopped; do not add an intermediate CM/CMV row |
