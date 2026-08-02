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

`activePhase: identity_transition_semantic_closeout`

PRs `#73`-`#76` delivered all four items: attempt contract/terminal CAS,
two-pass source projection/exact-writer authority, lease-scoped runtime, and
the Edge v2 hard cut. PR `#76` head `912a5c05...` was squash-merged as
`4b3d1173...`; merged-main CI `30617653640` passed. An authorized stopped-state
`rebind-source` and one status accepted schema v6, current source, managed
runtime identity, and v2/attempt-v1/v1-rejection. Single-use R5-O `_005`
received no usable project_context_ref; search_memory was not invoked and no
attempt terminal exists. Its canonical reason remains unknown and is not
inferred. `_005` is consumed; no retry or readiness claim is authorized. PR
`#82` merged the dormant, transport-neutral
`governed_runtime_identity_transition.v1` reference Saga. Its source is
attempt-scoped proof, dormant, non-live, and not wired to the controller. The
active closeout corrects Observer disposition and commit-time candidate reason
fidelity without changing accepted runtime facts. This remains source-only
construction: no live controller wiring, identity transition, lifecycle action,
blocker closure, or readiness claim.

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
- `r5_o_private_exact_head_runtime_unverified` [open]: R5-O _005 ended before attempt creation because its single resolver result exposed no usable project_context_ref; search_memory was not invoked, no governed-read terminal exists, and no private exact-head result is established.
- `fresh_non_empty_task_context_relevance_unproven` [open]: Fresh non-empty task-context recall relevance has not been proven.

## Next Safe Action

Complete the dormant identity-transition source closeout and exact-head review.
Do not retry or reconstruct `_005`; preserve the accepted runtime identity
without another probe or lifecycle action. Any live transition, runtime start,
provider call, or memory-tool action remains separately governed.

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
- PRs `#73`-`#76` are merged source construction. The authorized rebind accepted
  that source as the schema-v6 runtime identity; it did not establish R5-O,
  change a tool name/input schema, or authorize further execution.
- PR `#82` is merged dormant protocol source only. It does not authorize live
  wiring, a profile transaction, lifecycle action, or readiness claim.

## Evidence And History

Last completed: `CM-2158 / CMV-2243`.

- Active task: `CM-2159`; its validation receipt will not replace
  the unique completed ledger/validation pair until the successful R5-O
  verification and governance closeout are complete.
- PRs `#67`-`#76` delivered the schema-v6 source binding and four governed-read
  construction items; PR `#76` merged as `4b3d1173...` and main CI passed.
- PR `#82` merged the dormant governed runtime identity transition reference
  Saga. Its post-merge source requires semantic closeout before any later live
  transaction work; it remains non-live and does not alter accepted runtime
  identity.
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
- Under exact authorization bound to `4b3d1173...`, one stopped-state
  `rebind-source` and one low-disclosure status accepted schema v6, the current
  source manifest, managed runtime identity, and the Edge v2/attempt-v1/v1
  rejection dimensions without establishing readiness.
- Single-use R5-O `_005` invoked the resolver once. Its bounded result provided
  no usable project_context_ref, so search_memory was not invoked and no attempt
  terminal exists. No retry occurred; the canonical reason is not inferred,
  CM-2159 remains open, and `lastCompleted` remains unchanged.
- Controller contract: `docs/CODEX_MEMORY_FULL_STACK_CONTROL.md`; compact snapshot: `.agent_board/CURRENT_FACTS.json`.
- Historical recovery index: `docs/archive/CM2155_GOVERNANCE_SURFACE_RESET_HISTORY_INDEX.md`.
- Pre-compaction history is permanently recoverable from `ef62d4819ece3d93cb90e2d55fa84973cf43b7d1`.

<!-- CURRENT-FACTS-ACTIVE-END -->
