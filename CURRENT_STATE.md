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

`activePhase: r5_o_schema_v6_source_manifest_rebind_delivery`

PR `#70` delivered the production selected-diary hydrator. The next exact
R5-O authorization failed closed before lifecycle or memory access because the
existing schema-v6 profile could not rebind its changed runtime-source manifest.
`CM-2159` now owns a fail-closed same-schema rebind path and remains active until
a new exact-authorized R5-O proof and governance closeout succeed. This
declaration does not authorize a runtime probe, provider call, private
configuration access, lifecycle action, or profile replacement.

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

- `r5_h_matrix_incomplete` [open]: The R5-H private ChatGPT dogfood matrix is incomplete.
- `r5_o_private_exact_head_runtime_unverified` [open]: Post-hydrator R5-O remained unverified after schema-v6 source-manifest preflight failed closed.
- `fresh_non_empty_task_context_relevance_unproven` [open]: Fresh non-empty task-context recall relevance has not been proven.

## Next Safe Action

Deliver the explicit schema-v6-to-v6 source-manifest rebind path through PR and
successful merged-main CI. Then prepare one new single-use R5-O P3 package that
authorizes the stopped-stack rebind and one bounded private read against that
exact baseline. Do not start the stack, replace its profile, read private
memory, or retry R5-O from this committed declaration alone.

## Authority Boundaries

- `CURRENT_STATE.md` is the only default work entry.
- `.agent_board/CURRENT_FACTS.json` is the compact machine companion, not a
  source of live Git facts.
- Current branch, HEAD, upstream divergence, open PR, and current CI state must
  come from fresh Git/GitHub queries.
- P3, secrets, raw memory, raw audit/log, runtime/provider configuration,
  production, release, deploy, public MCP expansion, and durable mutation
  boundaries remain unchanged.
- Completed V5 and schema-v6 transitions are historical point-in-time evidence.
  They do not authorize another status probe, lifecycle action, provider call,
  private runtime verification, real memory read or write, release, deploy,
  cutover, or readiness claim.
- The current source delivery does not change the public MCP surface,
  dependencies, CI workflow, runtime/provider configuration, retained product
  baseline, or readiness status.

## Evidence And History

Last completed: `CM-2158 / CMV-2243`.

- Active task: `CM-2159`; its validation receipt will not replace
  the unique completed ledger/validation pair until the successful R5-O
  verification and governance closeout are complete.
- PR `#67` delivered manifest-v1 controller source identity and schema-v6
  compatibility, merging as
  `70a85d56c78caa895df50954ce107f504493b5ec`. Its merged-main CI completed
  successfully. This is a governance/controller delivery anchor, not a new
  accepted product baseline or current runtime-health claim.
- PR `#68` entered `CM-2159`; PR `#69` bound schema v6 to the canonical
  endpoint and merged as
  `31f94d93d8c50569846090501cf95db77d513f72`.
- Under `CODEX_MEMORY_SCHEMA_V6_CANONICAL_TAKEOVER_001`, the controller
  performed the authorized v5-to-v6 canonical takeover, stored the owner-only
  schema-v6 profile, and accepted a no-tool-call app-server bootstrap.
- The first `CODEX_MEMORY_R5O_PRIVATE_EXACT_HEAD_VERIFY_001` attempt resolved
  its governed context but the single search failed closed with invalid native
  vector-receipt evidence. It did not establish R5-O success or readiness.
- PR `#70` merged the exact read-only selected-diary hydrator as `bd21ae50...`;
  merged-main CI `30422647557` passed. Authorization `_002` then stopped at
  schema-v6 source-manifest mismatch with zero provider/native/memory calls.
  No successful post-hydrator private runtime proof exists.
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
