# RISK_REGISTER.md — codex-memory

Purpose: track current multi-agent and governance risks that can affect safe local execution.

| Risk ID | Status | Area | Risk | Impact | Mitigation | Owner | Last Reviewed |
|---|---|---|---|---|---|---|---|
| RR-0001 | open | multi-worker | Worker edits may overlap without explicit file locks | User-owned or parallel changes could be overwritten | Require `.agent_board/FILE_LOCKS.md` before assigning Worker tasks | commander | 2026-05-12 |
| RR-0002 | open | verifier | Verifier protocol may be skipped if treated as optional | Scope or validation gaps may reach commit review late | Require read-only Verifier output before multi-agent guarded commits | commander | 2026-05-12 |
| RR-0003 | monitoring | board-state | Board files can drift from Git reality after tag/push/checkpoint changes | Resume state may point at stale HEAD or baseline | Check `git log --oneline --decorate -n 5` before relying on handoff; update `RUN_STATE.md` and `HANDOFF.md` after meaningful changes | commander | 2026-05-12 |
| RR-0004 | mitigated | dirty-worktree | Current dirty source changes predate CM-0038 board refresh and may represent user/current-batch work | Accidental edits, validation claims, or commits could include unreviewed source changes | CM-0039/CM-0040 source batch reviewed, validated, and recorded; final commit still requires exact staging and optional Verifier pass | commander | 2026-05-12 |
| RR-0005 | monitoring | board-state | Multiple roles can observe board files while Commander is still mutating them | A read-only report may be based on a transient board snapshot | Commander serialized board writes under `FL-0003`, reran board validation, and received final Verifier PASS | commander | 2026-05-12 |
| RR-0006 | mitigated | recall-privacy | Durable diary scope metadata could be indexed or returned as recall content | Raw workspace/task/conversation metadata could leak through chunks/snippets/content | Strip internal scope headers before chunk indexing and assert scoped recall output excludes raw metadata while preserving user-authored marker-like content | commander | 2026-05-12 |

## Rules

- Keep this file short and current.
- Use `open`, `monitoring`, `mitigated`, or `closed`.
- Do not record secrets, raw provider output, or private credentials.
- Add a row when a risk affects Worker assignment, Verifier review, validation, hard stops, or handoff quality.
