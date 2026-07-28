# HANDOFF.md - codex-memory

> Non-authoritative handoff pointer. The receiving agent starts only from
> `CURRENT_STATE.md`.

## Handoff Summary

The current governance surface has one selected runtime-adjacent source task:

- status: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`;
- active task: `CM-2159`;
- last completed lifecycle/governance task: `CM-2158 / CMV-2243`;
- accepted product baseline: PR `#61`, reviewed head `4680b4c1…`, merge
  `ef62d481…`, main CI run `30238902177`;
- private dogfood observation schema: `3`;
- active queue: one `CM-2159 in_progress` row.

PR `#65` delivered the governed full-stack controller. Under exact
`CODEX_MEMORY_V5_TRANSITION_001` authorization, the transition at
`48ecfe1c…` completed the required stop, transitional start, owner-only
reference-only schema-v5 profile adoption, and final low-disclosure acceptance
inspection. Those results are historical point-in-time evidence and do not
assert current runtime health.

PR `#66` advanced only governance surfaces, but the schema-v5 profile binds the
entire repository HEAD. `CM-2159` therefore replaces exact-HEAD equality with a
fixed runtime-source manifest, moves new adoption to owner profile schema v6,
and retains v4/v5 status plus controlled-stop compatibility. The implementation
phase is source/test/docs only.

## Remaining Product Blockers

- the R5-H private dogfood matrix is incomplete;
- the schema-v6 manifest source implementation is under validation and is not
  yet merged or adopted;
- R5-O private exact-head runtime behavior is unverified;
- fresh non-empty task-context relevance is unproven.

## Receiving Rule

Continue only `CM-2159` from `CURRENT_STATE.md`: finish the implementation,
validation, independent review, and PR follow-through. After merge, stop at the
P3 boundary and prepare exact authorization for the runtime transition. Do not
substitute R5-O or another historical task.

## Safety Boundary

No new lifecycle/status probe, real runtime/provider/private-config/memory
action, public MCP expansion, dependency or CI workflow change,
production/release/deploy/cutover operation, or readiness claim is authorized
by this handoff.

Historical detail is recoverable through
`docs/archive/CM2155_GOVERNANCE_SURFACE_RESET_HISTORY_INDEX.md`.
