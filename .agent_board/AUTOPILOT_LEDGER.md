# AUTOPILOT_LEDGER.md - codex-memory

> Non-authoritative delivery ledger. Current task authority remains
> `CURRENT_STATE.md`.

| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |
|---|---|---|---|---|---|---|---|---:|---|---|
| CM-2155 | compact current governance authority without deleting audit history | Yellow local governance batch | `cm2155_governance_surface_reset` | Replaced duplicated active history with one current authority, schema v5, an empty active queue, compact pointers, compatibility guards, and Git recovery index | `task_id=CM-2155; action=governance_surface_reset; history_baseline=ef62d481; active_task=null; not_required_no_amber_external_or_write_action; runtime_calls=0; provider_calls=0; memory_reads=0; memory_writes=0; public_mcp_expansions=0; releases=0; deploys=0; readiness_claims=0` | `CMV-2240` governance reset validation | local files only; external/runtime/provider/memory budgets `0` | 0 | COMPLETED_VALIDATED | 2026-07-27 |

## Blocked Red Lane Items

- push / PR / tag / release / deploy actions remain separately governed;
- secrets, raw memory, raw audit/log output, runtime/provider configuration,
  production mutation, public MCP expansion, and readiness claims remain
  blocked outside exact authorization;
- mainline merge remains a Jenn-only current decision.
