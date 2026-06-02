# CM-1374 Phase F1 Runtime Freshness Diagnostic

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_NOT_READY`

Decision: `NOT_READY_BLOCKED`

## Purpose

CM-1373 proved that the live `http://127.0.0.1:7605` endpoint still did not expose the no-token selected overview and rejection-code contract even after the source/test fix was pushed.

CM-1374 adds a read-only freshness diagnostic so Phase F1 can distinguish:

- source contract missing
- live runtime process stale
- Git state not ready for F1

## Result

Added:

- `src/core/PhaseF1RuntimeFreshnessDiagnostic.js`
- `src/cli/phase-f1-runtime-freshness.js`
- `tests/phase-f1-runtime-freshness-diagnostic.test.js`

The CLI compares current Git `HEAD` commit time with the listening process start time for port `7605`.

Current read-only diagnostic returned fail-closed while this development worktree was dirty, and it identified:

```text
runtime_process_started_before_head
```

Observed listener:

- Process: `node.exe`
- Command: `A:\codex-memory\scripts\serve-codex-memory-http.js`
- Port: `7605`
- Process start was before current HEAD commit time.

This supports the current alignment diagnosis: the live endpoint is likely running a stale process that predates the no-token contract hardening.

## Boundary

CM-1374 does not restart the service, kill processes, edit config, edit watchdog/startup, read token material, call MCP tools, call providers, read real memory, write memory, or claim readiness.

Runtime refresh remains a separate exact-approval boundary.

## Validation

- `node --check src\core\PhaseF1RuntimeFreshnessDiagnostic.js`
- `node --check src\cli\phase-f1-runtime-freshness.js`
- `node --check tests\phase-f1-runtime-freshness-diagnostic.test.js`
- `node --test tests\phase-f1-runtime-freshness-diagnostic.test.js`
- `node src\cli\phase-f1-runtime-freshness.js --json --pretty`

The CLI is expected to return non-zero when the runtime is stale or Git state is not clean/synced.

## Next

Do not proceed to F2/F3/F4/F5.

Next exact approval candidate:

```text
I approve refreshing the local codex-memory HTTP runtime for Phase F1 on branch main at commit <FRESH_HEAD>, endpoint http://127.0.0.1:7605, limited to stopping/restarting the existing local node process serving A:\codex-memory\scripts\serve-codex-memory-http.js or running the existing local ensure script if needed, no config/watchdog/startup install or modification, no provider call, no MCP tools/call, no real memory read/write, no durable memory/audit write, no remote action, and no readiness or reliability claim.
```
