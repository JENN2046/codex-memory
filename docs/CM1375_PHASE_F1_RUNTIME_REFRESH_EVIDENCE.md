# CM-1375 Phase F1 Runtime Refresh Evidence

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_NOT_READY`

Decision: `NOT_READY_BLOCKED`

## Scope

Exact operator approval refreshed the local codex-memory HTTP runtime for Phase F1:

- Branch: `main`
- Commit: `30a77afe092493e4891e945531c5526dfd261164`
- Endpoint: `http://127.0.0.1:7605`
- Existing process: `node.exe A:\codex-memory\scripts\serve-codex-memory-http.js`

Approved boundary:

- Stop/restart the existing local node process serving `A:\codex-memory\scripts\serve-codex-memory-http.js`, or run the existing local ensure script if needed.
- No config/watchdog/startup install or modification.
- No provider call.
- No MCP `tools/call`.
- No real memory read/write.
- No durable memory/audit write.
- No remote action.
- No readiness or reliability claim.

## Result

The stale listener was stopped after confirming its command line matched the approved script path.

The existing local ensure script started a fresh listener:

```text
codex-memory HTTP MCP started (pid=86084) at http://127.0.0.1:7605/health
```

Post-refresh diagnostics:

- `phase-f1-runtime-freshness` returned `PHASE_F1_RUNTIME_FRESHNESS_ACCEPTED`.
- `runtimeFresh=true`.
- `failClosedReasons=[]`.
- New listener process id: `86084`.
- New listener command line matched `A:\codex-memory\scripts\serve-codex-memory-http.js`.
- `/health` returned `ok=true`, service `vcp_codex_memory`, auth required, no session hardening warnings.

## Boundary

This refresh did not run the F1 live no-write harness.

It did not execute MCP `tools/call`, provider calls, real memory reads/writes, durable memory/audit writes, config/watchdog/startup changes, remote actions, readiness claims, or reliability claims.

F1 evidence is still missing until a separate exact A5-GAP-4 live-client no-write contract refresh is approved and executed against a fresh runtime for the then-current synced HEAD.

## Next

Because CM-1375 records evidence as a local commit candidate, synchronizing or committing this record can move HEAD after the refreshed runtime start time. After this record is committed and synchronized, rerun `phase-f1-runtime-freshness`; if it fails closed, refresh the runtime again under a new exact approval before requesting exact A5-GAP-4 approval for the F1 rerun.
