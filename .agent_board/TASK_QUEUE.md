# TASK_QUEUE.md - codex-memory

> Non-authoritative operational surface. Task selection is owned only by
> `CURRENT_STATE.md`.

This table intentionally contains active work only. Completed tasks are
recoverable through Git history and are never retained here.

| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |
|---|---:|---|---|---|---|---|---|---|---|---|
| CM-2159 | P1 | in_progress | Governed Read Attempt and identity-transition semantic closeout | High / private exact-head verification and live transition remain blocked | attempt contract; dormant identity-transition reference Saga; Observer durable delivery; candidate revalidation; tests/docs/current facts | Preserve the delivered governed-read construction, record failed-closed `_005`, and close the two confirmed dormant identity-transition semantic defects without closing CM-2159 | attempt identity/chain/tamper/terminal tests; identity-transition Observer false/exception/durable-ack/reconstruction tests; four commit-time candidate reasons; unchanged public tools/input schemas; current-facts/docs gates | attempt-v1 never falls back; Observer rejection is initial-explicit-false only; exceptions and later false remain pending; true CAS races retain `transition_cas_lost`; accepted runtime identity remains unchanged | Any status, lifecycle, live transition, provider, resolver, search, memory-tool action, or merge requires its applicable current exact authority; `_005` must not be retried | PRs #73-#76 and dormant PR #82 are on main; #82 is attempt-scoped proof, non-live, and not controller-wired; this closeout changes source/tests/docs only and does not create an intermediate CM/CMV completion row |
