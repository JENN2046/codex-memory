# TASK_QUEUE.md - codex-memory

<!-- CURRENT-FACTS-ACTIVE-START -->

Current facts snapshot: `.agent_board/CURRENT_FACTS.json`.

Latest active task: `CM-1421 Phase H search_memory negative-control scope packet for CM-1419`.
Latest validation: `CMV-1535`.
Current active task rows should reference `.agent_board/CURRENT_FACTS.json` as a committed status snapshot; live Git facts require fresh Git commands.

<!-- CURRENT-FACTS-ACTIVE-END -->

Persistent active task queue. Long historical task rows are archived by reference; see:

- `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md`
- `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`

Statuses:

```text
todo
in_progress
done
blocked
skipped
cancelled
```

Areas:

```text
P0-mainline-health
P1-donor-compatibility
P2-active-memory
P3-provider-profile
P4-http-runtime
P5-rollback-readiness
P6-docs-drift
P7-vcp-parity-hardening
P8-memory-governance
P9-codex-claude-client-scope
P10-observability-admin
```

| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |
|---|---:|---|---|---|---|---|---|---|---|---|
| CM-1422 | 1422 | todo | P9-codex-claude-client-scope / P4-http-runtime / P0-mainline-health | Red/Amber exact bounded live readonly `search_memory` execution; no `record_memory`, provider/API, raw store scan, broad export, config/watchdog/startup change, public MCP expansion, remote action, or readiness claim | `STATUS.md`; `.agent_board/*`; live HTTP MCP at `127.0.0.1:7605` only after exact approval | Execute the CM-1419 Phase H `search_memory` negative-control scope packet | fresh Git/runtime check; exact approval line; two bounded live `search_memory` calls; no raw content/path/provider/token leakage; side-effect counters | no write path allowed; stop if freshness, token, query scope, or output boundary drifts | exact bounded scope required | Future execution only. Use `docs/CM1419_PHASE_H_SEARCH_MEMORY_NEGATIVE_CONTROL_SCOPE_PACKET.md`; do not execute from this docs packet alone. |
| CM-1420 | 1420 | done | P6-docs-drift / P0-mainline-health | Tier 2 Green docs/board context governance; no runtime, memory tool, provider/API, token, raw store scan, durable memory/audit write, config/watchdog/startup, public MCP expansion, remote action, or readiness claim | `docs/CONTEXT_INTAKE_CONTRACT.md`; `CURRENT_STATE.md`; `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md`; `.agent_board/CURRENT_FACTS.json`; `.agent_board/CHECKPOINT.md`; `.agent_board/HANDOFF.md`; `.agent_board/VALIDATION_LOG.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/AUTOPILOT_LEDGER.md`; `AGENTS.md`; `DOCS_GOVERNANCE.md`; `STATUS.md` | Implement context intake contract and compress default status surfaces | `git diff --check`; current facts drift validator; ledger consistency; docs validation; changed-scope review | revert docs/board changes by Git | no gate required | COMPLETED_VALIDATED_DOCS_BOARD_CONTEXT_GOVERNANCE: default context now uses `CURRENT_STATE.md`, `.agent_board/CURRENT_FACTS.json`, fresh Git facts, changed files, validation output, boundary declaration, and requested decision; long historical surfaces moved to archive index / Git history references. |
| CM-1421 | 1421 | done | P9-codex-claude-client-scope / P4-http-runtime / P0-mainline-health / P6-docs-drift | Green docs/board exact scope packet for CM-1419; read-only current-facts preflight only; no live `search_memory`, `record_memory`, provider/API, token use, raw store scan, durable write, config/watchdog/startup change, public MCP expansion, remote action, or readiness claim | `docs/CM1419_PHASE_H_SEARCH_MEMORY_NEGATIVE_CONTROL_SCOPE_PACKET.md`; `CURRENT_STATE.md`; `.agent_board/*`; `STATUS.md` | Prepare Phase H `search_memory` negative-control exact scope packet after CM-1418 evidence closeout | read-only recall current-facts preflight; `git diff --check`; current facts drift validator; ledger consistency; docs validation; changed-scope review | no runtime action; revert docs/board changes by Git | no gate required | COMPLETED_VALIDATED_SCOPE_PACKET_NOT_EXECUTED: exact future envelope is two public HTTP MCP `search_memory` calls for CM-0814 NC1/NC2, `target=both`, `limit=1`, `include_content=false`, expected zero results, sanitized output only. |
| CM-1418 | 1418 | done | P9-codex-claude-client-scope / P4-http-runtime / P0-mainline-health / P6-docs-drift | Green docs-only evidence closeout for an already executed live no-mutation gate | `STATUS.md`; `.agent_board/*` | Record Phase H runtime refresh + bounded `memory_overview` live no-mutation evidence | docs validation and changed-scope review | revert docs/board changes by Git | no gate required | Completed. Details remain in Git history and active archive references. |

Historical rows before the recent active set are available through Git history and targeted evidence docs. Do not load the full historical task queue by default.
