# RC-3 A5-GAP-4 Live HTTP / MCP No-Write Preflight

Date: 2026-06-02

Mode: `A5-GAP-4 approval packet only`

Decision: `DRAFT_NOT_APPROVED`

## Purpose

Prepare the live HTTP / MCP no-write evidence approval boundary for the current RC route.

This document does not approve or execute MCP `initialize`, MCP `tools/list`, no-token `memory_overview`, no-token `record_memory` / `search_memory` rejection checks, authenticated `memory_overview`, `observe:http`, provider calls, real-memory scans, durable memory/audit writes, config/watchdog/startup changes, public MCP expansion, remote writes, RC cutover, or `RC_READY` claims.

## Current Git Reality

Fresh preflight observed before this packet was edited:

```text
branch = main
local_head = 51d746f9d1f188bd041f337c9df122094af75118
origin_state = main ahead of origin/main by 3 local commits
worktree_state = clean before RC-3 packet edit
```

If this packet is committed before A5-GAP-4 execution, the approval line must be regenerated for the new post-commit `HEAD`.

## Runtime Freshness Preflight

Endpoint checked:

```text
http://127.0.0.1:7605/health
```

Observed sanitized health summary:

```text
ok = true
name = vcp_codex_memory
version = 0.1.0
protocol = streamable-http
path = /mcp/codex-memory
auth.required = true
writeReconcileWorker.available = true
writeReconcileWorker.running = false
```

Freshness conclusion:

```text
endpoint_reachable = true
runtime_commit_bound = false
freshness_status = HEALTHY_BUT_COMMIT_FRESHNESS_NOT_PROVEN_BY_HEALTH
```

Reason: `/health` exposes service identity and runtime health, but it does not expose a Git commit, build hash, process start source hash, or equivalent current-HEAD binding.

## Requested Approval Unit

```text
A5-GAP-4
```

Gap:

```text
live_http_operation_readiness_not_claimed
```

Allowed future evidence after exact approval:

- `GET /health`
- MCP `initialize`
- MCP `tools/list`
- no-token selected `memory_overview`
- no-token `record_memory` rejection
- no-token `search_memory` rejection
- authenticated `memory_overview` only if token use is explicitly authorized and token material is not printed or persisted

Not allowed by this packet:

- `record_memory` success path or any memory write
- authenticated `search_memory` or broad memory reads
- raw memory, raw audit, vector, candidate-cache, or store scans
- provider calls
- config, watchdog, startup, package, dependency, or secret changes
- public MCP expansion
- remote write, PR, tag, release, deploy, or RC cutover
- readiness, reliability, production, release, or `RC_READY` claims

## Approval Line Template

Use a fresh `HEAD` immediately before approval. If this packet has been committed, replace the commit below with the new post-commit `HEAD`.

```text
I approve A5-GAP-4 for codex-memory on branch main at commit 51d746f9d1f188bd041f337c9df122094af75118, endpoint http://127.0.0.1:7605, no config/watchdog/startup change.
```

If authenticated `memory_overview` is also intended, add a separate exact token-use clause that says the token is already present in the current session and must not be printed or persisted.

## Exit Criteria

If approved and executed successfully, the result can only be recorded as:

```text
ENDPOINT_BOUND_LIVE_NO_WRITE_EVIDENCE_ACCEPTED_NOT_RC_READY
```

If execution cannot prove the required no-write surface, the result remains:

```text
LIVE_HTTP_EVIDENCE_INCOMPLETE_RC_NOT_READY_BLOCKED
```
