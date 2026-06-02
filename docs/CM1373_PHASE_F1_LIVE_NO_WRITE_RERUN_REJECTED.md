# CM-1373 Phase F1 Live No-Write Rerun Rejected Evidence

Date: 2026-06-02

Status: `COMPLETED_WITH_BLOCKED_F1_NOT_READY`

Decision: `NOT_READY_BLOCKED`

Operator state: `RC_NOT_READY_BLOCKED`

## Scope

Exact-approved `A5-GAP-4 live-client no-write contract refresh` was executed for:

- Branch: `main`
- Commit: `dd5018dfbc564975e0e6a93aebdeba38821760a0`
- Endpoint: `http://127.0.0.1:7605`

Approved boundary:

- Use current-session bearer token only if already present.
- Do not print or persist token material.
- Allow authenticated `tools/call memory_overview`.
- Allow no-token rejection checks for `record_memory` and `search_memory`.
- No provider.
- No durable write.
- No config/watchdog/startup change.

## Fresh Preconditions

- `HEAD == origin/main == dd5018dfbc564975e0e6a93aebdeba38821760a0`
- `main...origin/main == 0 / 0`
- Worktree was clean before execution.
- Approval verifier returned `approval_line_exact_match`.

## Result

The bounded harness executed and rejected evidence fail-closed:

```text
PHASE_F1_LIVE_CLIENT_NO_WRITE_EVIDENCE_REJECTED_FAIL_CLOSED
```

Accepted evidence:

- `/health` returned service `vcp_codex_memory`.
- Runtime reported auth required.
- Authenticated MCP `initialize` succeeded.
- Authenticated MCP `tools/list` succeeded.
- Public tools remained exactly:
  - `memory_overview`
  - `record_memory`
  - `search_memory`
- Authenticated `tools/call memory_overview` succeeded.
- Authenticated overview did not return raw content according to the harness summary.

Rejected evidence:

- No-token `memory_overview` did not return the expected selected projection.
- No-token `record_memory` rejection did not expose expected reason code `NO_TOKEN_MUTATION_REJECTED`.
- No-token `search_memory` rejection did not expose expected reason code `NO_TOKEN_SEARCH_REJECTED`.

## Safety Counters

- Provider calls: `0`
- Durable memory writes: `0`
- Durable audit writes: `0`
- Config/watchdog/startup changes: `0`
- Remote actions during CM-1373: `0`
- Readiness claims: `0`
- Reliability claims: `0`
- Token material printed: `false`
- Token material persisted: `false`
- F1 evidence accepted: `false`
- Runtime ready: `false`
- RC ready: `false`

## Boundary

CM-1373 does not authorize F2/F3/F4/F5.

Do not proceed to A5-GAP-6 aggregation refresh, true-live recall negative-control proof, minimal personal dogfood write, or closeout until F1 evidence is accepted.

Next safe work is local source/test/runtime-contract investigation or a separate exact operator decision for service freshness/runtime alignment. Any service restart, config/watchdog/startup change, provider call, durable write, real recall, real memory write, or readiness claim remains blocked without separate exact approval.
