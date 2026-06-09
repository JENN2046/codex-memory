# CM-1529 Phase F1 Runner Public Tools Expectation Hardening

## Scope

Task: `CM-1529 source hardening for Phase F1 live client runner public tools expectation`.

Goal: align `PhaseF1LiveClientNoWriteEvidenceRunner` with the current seven-tool public MCP surface before any future live proof retry.

This is source/test/docs hardening only. It does not execute live proof.

## Source Change

`src/core/PhaseF1LiveClientNoWriteEvidenceRunner.js` now expects the current seven public tools:

```text
audit_memory
memory_overview
record_memory
search_memory
supersede_memory
tombstone_memory
validate_memory
```

The older three-tool expectation is no longer used by the runner.

## Regression Coverage

Targeted runner test:

```powershell
node --test tests\phase-f1-live-client-no-write-runner.test.js
```

Result: `7/7` passed.

Coverage:

- asserts `REQUIRED_PUBLIC_TOOLS` is exactly the seven-tool public surface
- injected `tools/list` proof fixture returns seven tools
- runner reports `publicToolCount: 7`
- runner keeps no-write/no-provider/no-ready counters and status false

HTTP MCP regression:

```powershell
node --test tests\mcp-http.test.js
```

Result: `26/26` passed.

Coverage:

- runtime HTTP MCP `tools/list` remains seven tools
- no-token rejection and `memory_overview` low-disclosure behavior remains covered
- no public MCP expansion was introduced by this source change

## Boundary Confirmation

CM-1529 did not:

- execute live client proof
- call provider/API
- use bearer-token material
- perform raw memory/audit/broad scan
- execute effective `record_memory`
- execute confirmed mutation
- expand public MCP tools
- release/tag/deploy
- claim readiness or `RC_READY`
- close the live client evidence blocker
- close the effective write reliability blocker

## Decision

`PHASE_F1_RUNNER_PUBLIC_TOOLS_EXPECTATION_ALIGNED`.

Live client evidence blocker remains `STILL_OPEN`.

Effective write reliability blocker remains `OPEN / DEFERRED`.

Overall status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`; `RC_READY` remains `BLOCKED`.
