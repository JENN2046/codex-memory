# CM-0568 Mainline Memory Spine Minimum Acceptance Surface

Status: PHASE_2_MAINLINE_MEMORY_SPINE_ACCEPTANCE_SURFACE_ACCEPTED_NOT_READY
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-20

## Purpose

This packet starts Phase 2 after Phase 1 Foundation Reliability reached:

```text
PHASE_1_FOUNDATION_RELIABILITY_ACCEPTED_NOT_READY
```

It defines the minimum acceptance surface for the HTTP MCP mainline memory spine.

It does not claim runtime readiness, RC readiness, production readiness, cutover readiness, memory write reliability, or memory recall reliability.

## Mainline Runtime Path

The recommended mainline path remains HTTP MCP.

The stdio MCP path remains debug-compatible.

The public MCP tool surface remains frozen:

```text
record_memory
search_memory
memory_overview
```

No public MCP tool or schema expansion is accepted in this phase without a separate explicit approval.

## Minimum Acceptance Categories

Phase 2 acceptance requires fresh evidence for all categories below.

| category | minimum evidence | current candidate command |
|---|---|---|
| HTTP MCP mainline health and session behavior | health, initialize, session header, tools/list, loopback no-token posture, non-loopback token requirement, session TTL/cap/cleanup behavior | `node --test .\tests\mcp-http.test.js` |
| public MCP tool freeze | exactly `record_memory`, `search_memory`, `memory_overview` | `node --test .\tests\mcp-contract.test.js`; `node --test .\tests\mcp-http.test.js` |
| error shape contract | schema `-32602`, no-token mutation `-32001`, search timeout `-32002`, HTTP session caps `429` | `node --test .\tests\mcp-contract.test.js`; `node --test .\tests\mcp-http.test.js` |
| auth / no-token behavior | no-token mutation rejected, bearer authorized fixture write allowed, browser/simple POST rejected | `node --test .\tests\mcp-http.test.js` |
| audit/cache side-effect boundaries | timeout abort skips post-timeout read-policy summary, candidate cache abort skips cache write, recall audit abort skips recall audit, CM-0567 suppresses durable audit for the exact-approved validation | targeted recall/runtime fixtures plus status evidence |
| compare compatibility | active-memory standard suite matches donor-compatible expectations | `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match` |
| rollback readiness harness | standard suite remains rollback-ready without real rollback | `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready` |
| strict mainline gate | health, contract, tests, compare, and rollback aggregate successfully | `npm run gate:mainline:strict` |

## Fresh Evidence

Current validation for this packet:

```text
node --test .\tests\mcp-http.test.js
  pass: 13/13

node --test .\tests\mcp-contract.test.js
  pass: 9/9

npm run gate:mainline:strict
  health: ok, HTTP 200, vcp_codex_memory
  contract: 22/22
  test: 1607/1607
  compare: 43/43 matched
  rollback: 43/43 rollback-ready

git diff --check
  passed

docs validation
  passed
```

This evidence is sufficient for:

```text
PHASE_2_MAINLINE_MEMORY_SPINE_ACCEPTANCE_SURFACE_ACCEPTED_NOT_READY
```

It is not sufficient for runtime readiness, RC readiness, production readiness, cutover readiness, memory write reliability, or memory recall reliability.

## Phase 2 Evidence Rule

Phase 2 may be accepted only as:

```text
PHASE_2_MAINLINE_MEMORY_SPINE_ACCEPTANCE_SURFACE_ACCEPTED_NOT_READY
```

That result means the minimum acceptance surface is freshly validated enough to move to Phase 3 Runtime Gap Closure.

It does not mean runtime ready, RC ready, production ready, cutover ready, memory write reliable, or memory recall reliable.

## Forbidden Shortcuts

Do not treat these as Phase 2 completion by themselves:

- Phase 1 accepted-not-ready status
- green docs validation
- one bounded recall query
- old HTTP observe evidence
- old strict gate evidence
- fixture tests without current strict gate
- compare pass without rollback pass
- rollback readiness without real rollback authority
- a pushed branch

## Hard Boundaries

This packet does not authorize:

- provider/model calls
- durable memory writes
- durable audit writes
- true live `record_memory` or `search_memory` validation
- `.jsonl` audit reads
- real private memory content reads
- migration/import/export/backup/restore apply
- public MCP expansion
- config switch
- watchdog/startup change
- package manifest or lockfile change
- tag, release, deploy, or cutover
- readiness claims
