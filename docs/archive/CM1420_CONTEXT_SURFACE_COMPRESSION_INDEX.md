# CM1420 Context Surface Compression Index

Date: 2026-06-03

Purpose: preserve traceability for status-surface history compressed by `CM-1420` without loading long historical ledgers into default Codex context.

## Compressed Surfaces

The following files were intentionally reduced to short active ledgers:

- `.agent_board/CHECKPOINT.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/VALIDATION_LOG.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/AUTOPILOT_LEDGER.md`

The full pre-compression text remains available in Git history at the parent of the CM-1420 change. Use Git history or targeted evidence docs when exact historical wording is needed.

## Current Default Entry Points

- `CURRENT_STATE.md`
- `.agent_board/CURRENT_FACTS.json`
- `docs/CONTEXT_INTAKE_CONTRACT.md`
- `.agent_board/CHECKPOINT.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/VALIDATION_LOG.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/AUTOPILOT_LEDGER.md`

## Historical Evidence Access

Use references before loading full historical text:

- task id
- validation id
- evidence document path
- target commit when the evidence is target-bound

Only open full historical artifacts when the current decision depends on exact evidence details.

## Boundary

This archive index is docs/board governance only. It does not prove runtime readiness, memory reliability, provider readiness, release readiness, cutover readiness, or `RC_READY`.
