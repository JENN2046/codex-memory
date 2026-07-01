# ColaMeta Rules For codex-memory

This managed ColaMeta rule file applies to the current `codex-memory` checkout. Machine-local ColaMeta plan, state, memory, decision, todo, runtime, log, report, audit, patch, temp, session, settings, and lock files remain local ignored state.

ColaMeta may prepare bounded previews, task plans, prompts, validation previews, and local evidence for this repository. It must follow the repository `AGENTS.md`, `CURRENT_STATE.md`, `.agent_board/CURRENT_FACTS.json`, `.agent_board/TASK_QUEUE.md`, and `.agent_board/VALIDATION_LOG.md` before suggesting or running work.

Default safe boundaries:

- Keep public MCP tools frozen unless Jenn gives a separate exact approval.
- Do not read or edit `.env`, `.env.*`, `config.env`, secrets, credentials, tokens, cookies, provider auth, raw private memory, raw audit, raw jsonl, SQLite dumps, vector stores, or browser state.
- Do not run provider/API calls, live memory reads/writes, broad memory scans, migrations, import/export/apply/restore, cleanup apply, profile confirm, runtime config changes, watchdog/startup changes, release, deploy, tag, force push, or history rewrite without separate exact approval.
- Do not claim production readiness, release readiness, cutover readiness, `RC_READY`, broad write reliability, or complete V8 from docs-only, fixture-only, no-mutation, or read-only evidence.
- Push and PR require either Jenn's explicit authorization or a fully passing repository safe-push route where local rules allow it. Stable service replacement and external connector closeout require separate explicit authorization and fresh evidence.

Validation defaults:

- For generic source changes, run `npm test`.
- For docs/board/status changes, run `git diff --check` and `bash scripts/validate-local.sh docs --quiet-scripts` plus diff inspection.
- For mainline-sensitive changes, follow the repository validation matrix before claiming completion.
