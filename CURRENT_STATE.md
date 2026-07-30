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

`activePhase: governed_read_attempt_refactor`

PR `#72` delivered the `_003` `INVALID_ARGUMENT` repair; PR `#73` delivered the
dormant governed-read-attempt contract and terminal CAS without live activation. The later
single-use `_004` observation failed closed without producing one
attempt-scoped, stage-ordered, counter-reconciled terminal envelope acceptable
as R5-O evidence. `_004` is consumed and must not be retried or reconstructed
from legacy error mappings. `CM-2159` therefore remains active under the
`governed_read_attempt_refactor` route. The current schema-v6 stack was
separately authorized to stop before source construction and is being held
stopped. This declaration does not authorize restart, rebind, provider or
memory-tool execution, private configuration access, `_005`, cutover, or
readiness claims.

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
- `r5_o_private_exact_head_runtime_unverified` [open]: R5-O _004 failed closed without an acceptable governed-read terminal envelope; no private exact-head result is established.
- `fresh_non_empty_task_context_relevance_unproven` [open]: Fresh non-empty task-context recall relevance has not been proven.

## Next Safe Action

Deliver the remaining three ordered CM-2159 PRs for source projection, vertical
runtime, and Edge response v2; source projection based on PR `#73`'s merged main
is current. Keep schema v6 stopped. Only after all four deliveries merge and
merged-main CI succeeds may stopped-state `rebind-source` authorization be
requested, followed by distinct single-use R5-O `_005` authorization. Do not
start or rebind the stack, read private memory, invoke a provider, or run `_005`
from this declaration alone.

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
- PR `#73` remains dormant; it changes no public MCP surface, active Edge
  response, dependency, CI, runtime/provider configuration, baseline, or status.

## Evidence And History

Last completed: `CM-2158 / CMV-2243`.

- Active task: `CM-2159`; its validation receipt will not replace
  the unique completed ledger/validation pair until the successful R5-O
  verification and governance closeout are complete.
- PRs `#67`-`#71` delivered source-manifest identity, canonical schema-v6
  binding, selected-diary hydration, and stopped-state rebind. `_001` and
  `_002` failed closed; `_003` exposed the sparse `chunk_index` and collapsed
  hydration-reason defect without an accepted result.
- PR `#72` merged that source/test repair as `e07d3f15...`.
- PR `#73` merged dormant attempt-v1 and the synthetic Edge-to-Observer slice as
  `6fe2b532...`; merged-main CI run `30501105867` passed.
- Single-use authorization `_004` was consumed and failed closed. It did not
  establish a receipt-bound R5-O result. Exact stage and counter facts that
  were not present in component evidence remain unknown and are not inferred
  from legacy reason codes. No `_004` retry is authorized.
- Under the separate
  `AUTHORIZE_CM2159_SCHEMA_V6_SAFE_STOP_AND_HOLD_E07D3F15` authorization, the
  controller stopped Relay, Governance, HTTP, Shim, and the retained Edge
  container. A single low-disclosure status confirmed schema v6 and the stopped
  state. No restart, rebind, provider call, memory-tool call, raw log read, or
  raw memory read occurred. The stack must remain stopped during construction.
- The current source-projection construction adds two-pass digest validation,
  streaming derived materialization, strict transaction counters, and an exact
  VCP writer authority harness. It neither activates attempt-v1 in the live
  path nor performs the public response-v2 cutover.
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
