# RC-3 A5-GAP-4 Live HTTP / MCP No-Write Preflight

Date: 2026-06-02

Mode: `A5-GAP-4 exact-approved live no-write evidence`

Decision: `ENDPOINT_BOUND_LIVE_NO_WRITE_EVIDENCE_ACCEPTED_NOT_RC_READY`

## Purpose

Prepare and record the live HTTP / MCP no-write evidence boundary for the current RC route.

This document records exact-approved endpoint-bound execution of MCP no-write checks. It does not record authenticated `memory_overview`, `observe:http`, provider calls, real-memory scans, durable memory/audit writes, config/watchdog/startup changes, public MCP expansion, remote writes, RC cutover, or `RC_READY` claims.

## Current Git Reality

Fresh preflight observed before this packet was edited:

```text
branch = main
local_head = 51d746f9d1f188bd041f337c9df122094af75118
origin_state = main ahead of origin/main by 3 local commits
worktree_state = clean before RC-4 live no-write execution
```

Fresh preflight confirmed the local `HEAD` matched the exact approval target before execution.

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

Exact approval line consumed:

```text
I approve A5-GAP-4 for codex-memory on branch main at commit d843d9b9778aeaa149cfba4ac80fa0e0aab87f1f, endpoint http://127.0.0.1:7605, no config/watchdog/startup change.
```

Evidence executed after exact approval:

- `GET /health`
- MCP `initialize`
- MCP `tools/list`
- no-token selected `memory_overview`
- no-token `record_memory` rejection
- no-token `search_memory` rejection

Authenticated `memory_overview` was not executed because this approval line did not authorize bearer-token use.

Not allowed by this packet:

- `record_memory` success path or any memory write
- authenticated `search_memory` or broad memory reads
- raw memory, raw audit, vector, candidate-cache, or store scans
- provider calls
- config, watchdog, startup, package, dependency, or secret changes
- public MCP expansion
- remote write, PR, tag, release, deploy, or RC cutover
- readiness, reliability, production, release, or `RC_READY` claims

## Live No-Write Result

```text
endpoint = http://127.0.0.1:7605
health.status = 200
health.ok = true
health.name = vcp_codex_memory
health.path = /mcp/codex-memory
auth.required = true
initialize.status = 200
initialize.serverName = vcp_codex_memory
tools.list.status = 200
tools = memory_overview, record_memory, search_memory
no_token.memory_overview.status = 200
no_token.memory_overview.accessMode = no_token_selected_overview
no_token.memory_overview.selectedProjection = true
no_token.memory_overview.selectedProjectionVersion = 1
no_token.memory_overview.rawSensitiveFieldsReturned = false
no_token.record_memory.status = 403
no_token.record_memory.code = NO_TOKEN_MUTATION_REJECTED
no_token.search_memory.status = 403
no_token.search_memory.code = NO_TOKEN_SEARCH_REJECTED
no_token.search_memory.rawSensitiveFieldsReturned = false
tokenUsed = false
providerCalled = false
durableWriteIntended = false
configWatchdogStartupChanged = false
```

Conclusion:

```text
ENDPOINT_BOUND_LIVE_NO_WRITE_EVIDENCE_ACCEPTED_NOT_RC_READY
```

Limitation:

```text
authenticated_memory_overview_not_executed_no_token_use_authorized
```
