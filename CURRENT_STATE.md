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

`activePhase: r5_o_invalid_argument_source_fix_delivery`

PR `#71` delivered the safe same-schema source rebind path. Under single-use
authorization `_003`, rebind and exact-head runtime acceptance succeeded, but
the one authorized `search_memory` call failed closed as `INVALID_ARGUMENT`.
`CM-2159` now owns the source/test fix and remains active until a new
exact-authorized R5-O proof and governance closeout succeed. This declaration
does not authorize a runtime probe, provider call, private configuration
access, lifecycle action, profile replacement, or retry of `_003`.

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
- `r5_o_private_exact_head_runtime_unverified` [open]: R5-O _003 reached exact-head runtime acceptance but its single search failed closed before a receipt-bound result.
- `fresh_non_empty_task_context_relevance_unproven` [open]: Fresh non-empty task-context recall relevance has not been proven.

## Next Safe Action

Deliver the `_003` `INVALID_ARGUMENT` source/test fix through PR and successful
merged-main CI. Then prepare a separate exact authorization for the existing
safe source rebind and a new single-use R5-O `_004` read against that exact
baseline. Do not start the stack, replace its profile, read private memory, or
retry `_003` from this committed declaration alone.

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
- PRs `#67`-`#69` delivered manifest-v1 source identity, entered `CM-2159`,
  and bound schema v6 to the canonical endpoint at `31f94d93...`. The exact
  canonical takeover stored the owner-only schema-v6 profile; `_001` later
  failed closed without establishing R5-O success.
- PR `#70` merged the exact read-only selected-diary hydrator as `bd21ae50...`;
  merged-main CI `30422647557` passed. Authorization `_002` then stopped at
  schema-v6 source-manifest mismatch with zero provider/native/memory calls.
- PR `#71` merged the safe schema-v6-to-v6 source rebind as `de36d4bc...`;
  merged-main CI `30453986741` passed.
- Single-use authorization `_003` was consumed. Its stopped-stack
  `rebind-source` succeeded and status accepted the exact source/runtime
  binding. The governed context resolved once; the one permitted search then
  failed closed as `INVALID_ARGUMENT`, produced no result or relevance proof,
  and terminally emergency-stopped the observation. Accepted evidence counted
  zero provider calls, native invocations, primary writes, and derived writes;
  the identity-matched stack was stopped without retry.
- Source-only investigation found a reachable implementation defect consistent
  with that terminal boundary: VCP can preserve non-contiguous source
  `chunk_index` values when vectorless chunks are skipped, while the production
  hydrator required a contiguous sequence. Hydration failures were also
  collapsed to a generic runtime reason. No private database, configuration,
  raw log, provider response, or raw memory was inspected to make this finding.
- PR `#65` and the exact V5 transition are historical closeout evidence only.
  They store no live locator or private payload and do not claim current health
  or authorize runtime, mutation, release, or deploy work.
- Controller contract detail: `docs/CODEX_MEMORY_FULL_STACK_CONTROL.md`.
- Compact machine snapshot: `.agent_board/CURRENT_FACTS.json`.
- Historical recovery index:
  `docs/archive/CM2155_GOVERNANCE_SURFACE_RESET_HISTORY_INDEX.md`.
- Pre-compaction history is permanently recoverable from
  `ef62d4819ece3d93cb90e2d55fa84973cf43b7d1`.

<!-- CURRENT-FACTS-ACTIVE-END -->
