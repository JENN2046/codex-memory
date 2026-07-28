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

`activeTask: CM-2159`

`CM-2159` repairs the controller source-identity granularity by replacing the
schema-v5 whole-HEAD gate with a versioned runtime-source manifest and a
fail-closed schema-v6 transition. The current phase is source/test/docs only;
it does not authorize a runtime probe or lifecycle action.

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

- `controller_source_identity_granularity_pending` [open]: The schema-v5 whole-HEAD controller binding must transition to a runtime-source manifest before another accepted lifecycle start.
- `r5_h_matrix_incomplete` [open]: The R5-H private ChatGPT dogfood matrix is incomplete.
- `r5_o_private_exact_head_runtime_unverified` [open]: R5-O private exact-head runtime behavior has not been verified.
- `fresh_non_empty_task_context_relevance_unproven` [open]: Fresh non-empty task-context recall relevance has not been proven.

## Next Safe Action

Complete the `CM-2159` source/test/docs implementation, deterministic
validation, independent governance review, and implementation PR. After that PR
is merged and local `main` is fast-forwarded, prepare a separately bound P3
authorization package for `status -> stop -> start -> adopt-running --replace
-> status`. Do not run that transition from this source-only task authority.

## Authority Boundaries

- `CURRENT_STATE.md` is the only default work entry.
- `.agent_board/CURRENT_FACTS.json` is the compact machine companion, not a
  source of live Git facts.
- Current branch, HEAD, upstream divergence, open PR, and current CI state must
  come from fresh Git/GitHub queries.
- P3, secrets, raw memory, raw audit/log, runtime/provider configuration,
  production, release, deploy, public MCP expansion, and durable mutation
  boundaries remain unchanged.
- The completed V5 transition is historical point-in-time evidence. It does not
  authorize another status probe, lifecycle action, provider call, private
  runtime verification, real memory read or write, release, deploy, cutover, or
  readiness claim.
- `CM-2159` does not change the public MCP surface, dependencies, CI workflow,
  runtime/provider configuration, retained product baseline, or readiness
  status.

## Evidence And History

Last completed: `CM-2158 / CMV-2243`.

- Active implementation: `CM-2159`; its validation receipt will not replace
  the unique completed ledger/validation pair until the authorized runtime
  transition and governance closeout are complete.

- PR `#65` delivered the governed full-stack lifecycle controller and merged as
  `48ecfe1c74e1cf5b6be9a56ffa82998eeb26567e`.
- Under the exact `CODEX_MEMORY_V5_TRANSITION_001` authorization, the transition
  ran `stop` -> `start` -> `adopt-running --replace` -> low-disclosure `status`
  against that baseline. The transitional start required the intended profile
  upgrade; adoption stored one owner-only, reference-only schema-v5 controller
  profile; final inspection returned accepted runtime/controller bindings.
- Those results are closeout-time evidence only, not committed current health.
  No PID, socket, secret reference, raw log, provider response, or raw memory is
  stored here.
- The transition did not call `record_memory`, modify `.env` or real
  configuration, run migration/import/export/rebuild, expand public MCP,
  deploy, release, or claim readiness.
- Controller contract detail: `docs/CODEX_MEMORY_FULL_STACK_CONTROL.md`.
- Compact machine snapshot: `.agent_board/CURRENT_FACTS.json`.
- Historical recovery index:
  `docs/archive/CM2155_GOVERNANCE_SURFACE_RESET_HISTORY_INDEX.md`.
- Pre-compaction history is permanently recoverable from
  `ef62d4819ece3d93cb90e2d55fa84973cf43b7d1`.

<!-- CURRENT-FACTS-ACTIVE-END -->
