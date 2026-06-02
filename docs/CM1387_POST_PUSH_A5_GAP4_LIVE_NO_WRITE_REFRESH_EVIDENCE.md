# CM-1387 Post-Push A5-GAP-4 Live No-Write Refresh Evidence

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_POST_PUSH_A5_GAP4_LIVE_NO_WRITE_REFRESH`

Decision: `NOT_READY_BLOCKED`

Operator state: `PERSONAL_DOGFOOD_READY_NOT_RC_READY`

## Scope

Exact-approved `A5-GAP-4 live-client no-write contract refresh` was executed for:

- Branch: `main`
- Commit: `8c0a9d22a60c5ce1dcb1f5ce0595b135a27a5496`
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

- `HEAD == origin/main == 8c0a9d22a60c5ce1dcb1f5ce0595b135a27a5496`
- `HEAD...origin/main == 0 / 0`
- Worktree was clean before execution.
- Approval verifier accepted the exact A5-GAP-4 live-client no-write scope.

## Result

The bounded harness executed and accepted post-push A5-GAP-4 evidence:

```text
PHASE_F1_LIVE_CLIENT_NO_WRITE_EVIDENCE_CAPTURED_NOT_READY
```

Captured evidence:

- `/health` returned `ok=true`, service `vcp_codex_memory`, auth required, runtime present.
- Authenticated MCP `initialize` succeeded.
- Authenticated MCP `tools/list` succeeded.
- Public tools remained exactly:
  - `memory_overview`
  - `record_memory`
  - `search_memory`
- Authenticated `tools/call memory_overview` succeeded.
- Authenticated overview did not return raw content according to the harness summary.
- No-token `memory_overview` returned selected projection mode `no_token_selected_overview`.
- No-token selected projection version was `1`.
- No-token overview did not return paths, recent audit, memory links, recall recent, or raw memory fields.
- No-token `record_memory` rejected with reason code `NO_TOKEN_MUTATION_REJECTED`.
- No-token `search_memory` rejected with reason code `NO_TOKEN_SEARCH_REJECTED`.
- No raw content was returned by no-token rejection checks.

## Safety Counters

- Provider calls: `0`
- Durable memory writes: `0`
- Durable audit writes: `0`
- Config/watchdog/startup changes: `0`
- Remote actions during CM-1387: `0`
- Readiness claims: `0`
- Reliability claims: `0`
- Token material printed: `false`
- Token material persisted: `false`
- Evidence accepted: `true`
- Runtime ready: `false`
- RC ready: `false`

## Boundary

CM-1387 is a post-push no-write contract refresh only.

It confirms the live no-write HTTP contract at synced `main@8c0a9d2` and does not claim RC readiness, release readiness, cutover readiness, broad reliability, or general write reliability. It does not authorize provider calls, durable writes, config/watchdog/startup changes, new MCP tools, memory migration/import/export, tag/release/deploy, or further remote action.
