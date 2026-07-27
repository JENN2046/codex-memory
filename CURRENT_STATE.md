# Current State

This is the sole committed human-readable authority for current `codex-memory`
work. Machine checks use `.agent_board/CURRENT_FACTS.json`; live Git and GitHub
facts must always be collected fresh.

<!-- CURRENT-FACTS-ACTIVE-START -->

## Project Status

`NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

This status is intentionally fail-closed. It is not a production, release,
deploy, cutover, complete-V8, or readiness claim.

## Active Work

`activeTask: null`

There is no selected product task and `.agent_board/TASK_QUEUE.md` is empty.
Historical tasks, including `CM-1422`, must not be resumed automatically.

## Last Accepted Product Baseline

| Field | Accepted value |
|---|---|
| Pull request | `#61` |
| Reviewed head | `4680b4c198a71bb9e61d7bc1f21c0b77a1769fd9` |
| Merge commit | `ef62d4819ece3d93cb90e2d55fa84973cf43b7d1` |
| Main CI run | `30238902177` |
| Private dogfood observation schema | `3` |

This is a closed product baseline, not the branch, HEAD, PR, or CI state of a
future task.

## Open Blockers

1. The canonical service does not wire or expose the low-disclosure observer.
2. The R5-H private ChatGPT dogfood matrix is incomplete.
3. R5-O private exact-head runtime behavior has not been verified.
4. Fresh non-empty task-context recall relevance has not been proven.

## Next Safe Action

Jenn selects a new product goal. Until then, keep `activeTask: null`, keep the
active queue empty, and do not infer work from historical task rows, roadmap
text, plans, checkpoints, handoffs, status archives, or prior conversation.

## Authority Boundaries

- `CURRENT_STATE.md` is the only default work entry.
- `.agent_board/CURRENT_FACTS.json` is the compact machine companion, not a
  source of live Git facts.
- Current branch, HEAD, upstream divergence, open PR, and current CI state must
  come from fresh Git/GitHub queries.
- P3, secrets, raw memory, raw audit/log, runtime/provider configuration,
  production, release, deploy, public MCP expansion, and durable mutation
  boundaries remain unchanged.
- No current scope authorizes runtime activation, provider calls, real memory
  reads or writes, release, deploy, cutover, or readiness claims.

## Evidence And History

- Last governance closeout: `CM-2155 / CMV-2240`.
- Compact machine snapshot: `.agent_board/CURRENT_FACTS.json`.
- Historical recovery index:
  `docs/archive/CM2155_GOVERNANCE_SURFACE_RESET_HISTORY_INDEX.md`.
- Pre-compaction history is permanently recoverable from
  `ef62d4819ece3d93cb90e2d55fa84973cf43b7d1`.

<!-- CURRENT-FACTS-ACTIVE-END -->
