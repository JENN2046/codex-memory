# Context Intake Contract

Purpose: keep `codex-memory` work current, bounded, and auditable without
reloading historical status chains.

## Sole Default Entry

For normal repository work, load `CURRENT_STATE.md` first and treat it as the
only default work entry. Then load only files directly required by Jenn's
current request.

Do not select work from `.agent_board/`, `STATUS.md`, `ROADMAP.md`,
`CODEX_MEMORY_NEXT_PHASE_PLAN.md`, historical docs, prior conversation, or
recalled context.

## On-Demand Facts

Collect these only when the current decision needs them:

- fresh Git branch, HEAD, worktree, upstream, and ahead/behind facts;
- fresh GitHub PR, review, and CI facts;
- `.agent_board/CURRENT_FACTS.json` for machine validation;
- changed source/tests/docs and relevant validation output;
- exact historical artifacts referenced by the current decision.

Live Git/GitHub facts are never copied into committed current-state fields.

## Authority Order

1. Jenn's current instruction and higher-priority safety rules.
2. Fresh repository, Git, GitHub, command, source, and test evidence.
3. `CURRENT_STATE.md`.
4. `.agent_board/CURRENT_FACTS.json` as its machine companion.
5. Referenced historical evidence.

Pointer surfaces are not independent current authority.

## Historical Evidence

Enter history by bounded reference first: task id, validation id, commit id,
path, or archive index. Open exact historical content only when the current
decision depends on it.

Use `docs/archive/CM2155_GOVERNANCE_SURFACE_RESET_HISTORY_INDEX.md` to recover
pre-compaction status surfaces from Git.

## Forbidden Default Context

Do not default-load raw memory, private stores, raw audit/log/JSONL/SQLite,
provider responses, secrets, tokens, credentials, full historical checkpoints,
handoffs, queues, validation logs, or status archives.

## Closeout

A meaningful task closeout updates:

- `CURRENT_STATE.md`;
- `.agent_board/CURRENT_FACTS.json`;
- the active-only queue;
- the single current validation and ledger receipt;
- short pointer summaries only when they materially changed.

Historical auditability is retained through Git and the history index, not by
copying old rows back into active surfaces.
