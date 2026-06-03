# VALIDATION_LOG.md - codex-memory

<!-- CURRENT-FACTS-ACTIVE-START -->

Current facts snapshot: `.agent_board/CURRENT_FACTS.json`.

Latest validation: `CMV-1535`.
Latest task: `CM-1421 Phase H search_memory negative-control scope packet for CM-1419`.
Validation facts should be summarized in `.agent_board/CURRENT_FACTS.json` as a committed status snapshot; live Git facts are collected by fresh Git commands.

<!-- CURRENT-FACTS-ACTIVE-END -->

Active validation ledger. Long historical validation rows are archived by reference; see:

- `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md`
- `docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md`

| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |
|---|---|---|---|---|---|---|---|
| CMV-1535 | read-only `recall-proof-current-facts-preflight`; `git diff --check`; current facts drift validator; ledger consistency; docs validation; changed-scope review | P9-codex-claude-client-scope / P4-http-runtime / P0-mainline-health / P6-docs-drift | CM-1421 Phase H search_memory negative-control scope packet for CM-1419 | COMPLETED_VALIDATED_SCOPE_PACKET_NOT_EXECUTED | Prepared an exact future scope packet for two bounded readonly public HTTP MCP `search_memory` negative-control calls using CM-0814 NC1/NC2 with `target=both`, `limit=1`, `include_content=false`, expected zero results, sanitized output only. Read-only preflight reported `RECALL_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED` on the current clean synced main head. | Future execution is `CM-1422` and requires a fresh exact approval line after packet commit/sync; no live `search_memory` was executed by CM-1421. | 2026-06-03 |
| CMV-1534 | `git diff --check`; current facts drift validator; ledger consistency; docs validation; changed-scope review | P6-docs-drift / P0-mainline-health | CM-1420 context intake and status-surface compaction | COMPLETED_VALIDATED_DOCS_BOARD_CONTEXT_GOVERNANCE | Added context intake contract, `CURRENT_STATE.md`, and archive index; compressed default checkpoint, handoff, validation, task queue, and autopilot ledger surfaces to short active ledgers. | Use `CURRENT_STATE.md`, `.agent_board/CURRENT_FACTS.json`, fresh Git facts, changed files, validation output, boundary declaration, and requested decision as default intake. | 2026-06-03 |
| CMV-1533 | `git diff --check`; current facts drift validator; ledger consistency; docs validation; changed-scope review | P9-codex-claude-client-scope / P4-http-runtime / P0-mainline-health / P6-docs-drift | CM-1418 Phase H bounded memory_overview live no-mutation evidence closeout | COMPLETED_VALIDATED_DOCS_ONLY_CM1418_PHASE_H_MEMORY_OVERVIEW_LIVE_NO_MUTATION_CLOSEOUT | Recorded accepted live no-mutation evidence from the pushed CM-1417 head without running a new probe in CM-1418. | Next runtime task remains `CM-1419 search_memory negative-control` only with exact bounded readonly scope. | 2026-06-03 |
| CMV-1532 | targeted source/test/docs validation plus `npm test` and hardening suite | P4-http-runtime / P9-codex-claude-client-scope / P0-mainline-health | CM-1417 authenticated memory_overview bounded projection | COMPLETED_VALIDATED_CM1417_AUTHENTICATED_MEMORY_OVERVIEW_BOUNDED_PROJECTION | Authenticated HTTP `memory_overview` defaults to bounded low-disclosure projection; public tools remain frozen. | Live evidence requires separate approval and fresh runtime proof. | 2026-06-03 |
| CMV-1531 | targeted HTTP/no-token tests and hardening suite | P4-http-runtime / P0-mainline-health / P6-docs-drift | CM-1416 health endpoint strict no-token split | COMPLETED_VALIDATED_CM1416_HEALTH_ENDPOINT_STRICT_NO_TOKEN_SPLIT | No-token `/health` is strict low-disclosure; bearer full payload remains bounded; invalid bearer is rejected. | Treat as local temp-server contract evidence unless separately live-verified. | 2026-06-03 |
| CMV-1530 | temp DB gate checks plus broader local validation | P0-mainline-health / P7-vcp-parity-hardening / P10-observability-admin | CM-1415 real query quality temp DB gate | COMPLETED_VALIDATED_CM1415_REAL_QUERY_QUALITY_TEMP_DB_GATE | Synthetic temp app/sqlite/vector/chunk recall quality gate passed without touching real memory. | Real memory quality proof remains separate. | 2026-06-03 |

Historical rows before the recent active set are available through Git history and targeted evidence docs. Do not load the full historical ledger by default.
