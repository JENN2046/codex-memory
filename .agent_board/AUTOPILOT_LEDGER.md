# AUTOPILOT_LEDGER.md - codex-memory

> Non-authoritative delivery ledger. Current task authority remains
> `CURRENT_STATE.md`.

| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |
|---|---|---|---|---|---|---|---|---:|---|---|
| CM-2157 | wire the canonical Relay observer to an owner-only read-only UDS snapshot surface | Yellow local source/security batch | `cm2157_canonical_relay_observer_wiring_source_only` | Added exact-key low-disclosure projection, an owner-only `0600` snapshot UDS, canonical observer injection and lifecycle bracketing, source-boundary metadata, documentation, and synthetic fail-closed tests | `task_id=CM-2157; action=canonical_relay_observer_wiring_source_only; active_task=null; synthetic_temporary_uds=started_and_cleaned; real_private_config_writes=0; real_runtime_starts=0; provider_calls=0; memory_reads=0; memory_writes=0; public_mcp_expansions=0; dependency_changes=0; ci_changes=0; releases=0; deploys=0; readiness_claims=0` | `CMV-2242` canonical Relay observer wiring validation | source/test/docs plus source-boundary metadata and synthetic temporary UDS fixtures only; external/runtime/provider/memory budgets `0` | 0 | COMPLETED_VALIDATED | 2026-07-28 |

## Blocked Red Lane Items

- push / PR / tag / release / deploy actions remain separately governed;
- setting a real observer socket path, starting the real Relay runtime, or
  probing a private exact-head runtime remains an exact P3 authorization
  boundary;
- secrets, raw memory, raw audit/log output, runtime/provider configuration,
  production mutation, public MCP expansion, and readiness claims remain
  blocked outside exact authorization;
- mainline merge remains a Jenn-only current decision.
