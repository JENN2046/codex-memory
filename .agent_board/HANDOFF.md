# HANDOFF.md - codex-memory

<!-- CURRENT-FACTS-ACTIVE-START -->

Current facts snapshot: `.agent_board/CURRENT_FACTS.json`.

Current task: `CM-1424 search_memory authenticated bounded/noRawContentRead projection patch`.
Current validation: `CMV-1537`.
Current handoff: CM-1424 implemented authenticated HTTP `search_memory` bounded projection locally. It runs read-only/noRawContentRead, rejects `include_content=true` before search execution, strips identifying/raw/path fields, keeps no-token search rejected, and keeps public tools unchanged. No live rerun was performed.

<!-- CURRENT-FACTS-ACTIVE-END -->

## Active Handoff

Goal: patch authenticated HTTP `search_memory` projection after CM-1422 fail-closed.

Current status: `COMPLETED_VALIDATED_SOURCE_TESTS_HARDENING_NO_LIVE_RERUN`.

Workspace: `A:\codex-memory`.

Current entrypoints:

- `CURRENT_STATE.md`
- `.agent_board/CURRENT_FACTS.json`
- `src/app.js`
- `src/adapters/codex-mcp/http.js`
- `src/core/SearchMemoryResponseSanitizer.js`
- `tests/http-no-token-search-rejection.test.js`
- `tests/search-memory-response-sanitizer.test.js`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`
- `CURRENT_STATE.md`

Completed in this slice:

- Implemented authenticated HTTP bounded search projection.
- Added/updated synthetic sanitizer and HTTP projection tests.
- Verified no-token `search_memory` stays rejected and public tools remain unchanged.
- No live `search_memory`, token use against live 7605, provider/API call, real memory read/write, raw store scan, durable write, runtime change, raw NC1 output print/persistence, or readiness claim occurred in CM-1424.

Validation: `CMV-1537` source/test/hardening validation.

Boundaries:

- No runtime action, memory tool call, provider/API call, token use, raw store scan, durable memory/audit write, config/watchdog/startup change, public MCP expansion, remote action, or readiness claim.

Next safe action:

Commit and push CM-1424, refresh runtime, then request fresh exact approval before any CM-1422 live rerun.

## Historical Handoff Archive

Long historical handoff text was compressed by `CM-1420`.

Use:

- `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md`
- Git history before the CM-1420 change
- targeted evidence docs named by task id

Do not paste full historical handoff text into default context unless the current decision requires exact wording.
