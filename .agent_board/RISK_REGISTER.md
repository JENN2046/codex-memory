# RISK_REGISTER.md — codex-memory

Purpose: track current multi-agent and governance risks that can affect safe local execution.

| Risk ID | Status | Area | Risk | Impact | Mitigation | Owner | Last Reviewed |
|---|---|---|---|---|---|---|---|
| RR-0001 | open | multi-worker | Worker edits may overlap without explicit file locks | User-owned or parallel changes could be overwritten | Require `.agent_board/FILE_LOCKS.md` before assigning Worker tasks | commander | 2026-05-12 |
| RR-0002 | open | verifier | Verifier protocol may be skipped if treated as optional | Scope or validation gaps may reach commit review late | Require read-only Verifier output before multi-agent guarded commits | commander | 2026-05-12 |
| RR-0003 | monitoring | board-state | Board files can drift from Git reality after tag/push/checkpoint changes | Resume state may point at stale HEAD or baseline | Check `git log --oneline --decorate -n 5` before relying on handoff; update `RUN_STATE.md` and `HANDOFF.md` after meaningful changes | commander | 2026-05-12 |
| RR-0004 | open | P51-P62-completion-boundary | Local evidence/preflight/audit completion may be misread as runtime readiness, final RC readiness, cutover readiness, or `RC_READY` | A future resume could cross runtime/A5 boundaries without fresh evidence or explicit authorization | Treat `CMD-0012` and `CMB-0005` as controlling records; require completion audit fixtures to show `objectiveComplete=true` plus zero runtime gaps and zero A5 hard stops before any completion claim | commander | 2026-05-18 |
| RR-0005 | monitoring | P0-mainline-health / write-reconcile | Internal reconcile service/worker surfaces may be misread as automatic degraded recovery or broad write reliability | Future work could overclaim readiness or start queue processing through startup/watchdog/config without runtime evidence | Treat CM-1035 as internal manual replay service, CM-1036 through CM-1041 as internal default-disabled / explicit temp-local worker evidence only, CM-1042 as bounded HTTP health status only, CM-1043 as bounded HTTP observe status only, CM-1044 as controlled temporary current-source HTTP refresh test evidence only, CM-1045 as controlled temporary current-source explicit dry-run summary evidence only, CM-1046 as controlled temporary current-source explicit replay summary evidence only, and CM-1047 as controlled explicit temp-local partial-batch evidence only; require separate startup/config approval and long-running safety review before any automatic recovery, startup execution, or reliability claim | commander | 2026-05-25 |

## Rules

- Keep this file short and current.
- Use `open`, `monitoring`, `mitigated`, or `closed`.
- Do not record secrets, raw provider output, or private credentials.
- Add a row when a risk affects Worker assignment, Verifier review, validation, hard stops, or handoff quality.
