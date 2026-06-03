# HANDOFF.md - codex-memory

<!-- CURRENT-FACTS-ACTIVE-START -->

Current facts snapshot: `.agent_board/CURRENT_FACTS.json`.

Current task: `CM-1420 context intake and status-surface compaction`.
Current validation: `CMV-1534`.
Current handoff: implement context intake governance and compress default `.agent_board` status surfaces so future work loads `CURRENT_STATE.md`, `.agent_board/CURRENT_FACTS.json`, fresh Git facts, changed files, validation output, and exact requested decision instead of long historical logs.

<!-- CURRENT-FACTS-ACTIVE-END -->

## Active Handoff

Goal: reduce long-term context load while preserving auditability.

Current status: `COMPLETED_VALIDATED_DOCS_BOARD_CONTEXT_GOVERNANCE`.

Workspace: `A:\codex-memory`.

Current entrypoints:

- `CURRENT_STATE.md`
- `.agent_board/CURRENT_FACTS.json`
- `docs/CONTEXT_INTAKE_CONTRACT.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`
- `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md`

Completed in this slice:

- Context intake contract added.
- Short current state entrypoint added.
- Long checkpoint, handoff, validation, and task queue surfaces compressed into short active ledgers.
- Historical evidence remains available by archive index and Git history.

Validation: `CMV-1534` docs/board validation.

Boundaries:

- No runtime action, memory tool call, provider/API call, token use, raw store scan, durable memory/audit write, config/watchdog/startup change, public MCP expansion, remote action, or readiness claim.

Next safe action:

Run docs validation, inspect diff, and update `CMV-1534` result.

## Historical Handoff Archive

Long historical handoff text was compressed by `CM-1420`.

Use:

- `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md`
- Git history before the CM-1420 change
- targeted evidence docs named by task id

Do not paste full historical handoff text into default context unless the current decision requires exact wording.
