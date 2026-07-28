# TASK_QUEUE.md - codex-memory

> Non-authoritative operational surface. Task selection is owned only by
> `CURRENT_STATE.md`.

This table intentionally contains active work only. Completed tasks are
recoverable through Git history and are never retained here.

| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |
|---|---:|---|---|---|---|---|---|---|---|---|
| CM-2159 | P1 | in_progress | governed full-stack controller source identity | High / exact-P3 runtime transition pending | existing lifecycle controller, owner-only profile, active governance surfaces | Execute a separately exact-authorized schema-v6 transition against the merged manifest-v1 controller, then close the governance surfaces | fresh Git/CI and manifest preflight; low-disclosure status/stop/start/adopt/status evidence; controller/docs/current-facts/ledger gates; independent review | schema-v5 status and controlled stop remain recognizable before replacement; any identity or boundary mismatch fails closed under the authorized rollback terms | Exact P3 authorization is required for runtime/profile actions; a future closeout PR merge remains Jenn-only | Source delivery is merged; activeTask and the existing completed receipt remain unchanged; product baseline remains PR #61 |
