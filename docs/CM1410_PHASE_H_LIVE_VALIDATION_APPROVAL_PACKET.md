# CM-1410 Phase H Live Validation Approval Packet

Status: `APPROVAL_PACKET_PREPARED_NOT_EXECUTED`

Task: `CM-1410`

Validation: `CMV-1525`

Date: 2026-06-03

## Purpose

This packet prepares the exact approval boundary for a later Phase H live Codex / Claude client validation slice.

It is docs-only and board-only. It does not execute live client commands, read or use bearer token material, call MCP tools, call memory tools, start or stop runtime, scan real stores, write durable state, change config/watchdog/startup, push, release, cut over, or claim readiness.

## Target Shape

Transport:

```text
HTTP MCP over loopback
```

Endpoint:

```text
http://127.0.0.1:7605/mcp/codex-memory
```

Health URL:

```text
http://127.0.0.1:7605/health
```

Service identity:

```text
vcp_codex_memory
```

Public MCP tools must remain exactly:

```text
record_memory
search_memory
memory_overview
```

## Exact Approval Template

The following line is a template only. It is not approval until the operator sends a fresh exact line after the packet is committed and synced, with the placeholders replaced by fresh observed values.

```text
I approve CM-1410 Phase H live validation for branch main at commit <FRESH_CLEAN_SYNCED_HEAD_AFTER_PACKET_COMMIT> against endpoint http://127.0.0.1:7605/mcp/codex-memory and health URL http://127.0.0.1:7605/health, using only the current-session already-present bearer token without printing, reading aloud, storing, or editing token material; allowed actions are health check, authenticated MCP initialize, authenticated tools/list, readonly memory_overview, and at most two bounded readonly search_memory calls with include_content=false and sanitized output; forbidden actions are record_memory, durable write, real scoped write proof, broad store scan, raw memory/jsonl/audit/vector/candidate-cache output, provider calls, config/watchdog/startup changes, public MCP expansion, push, PR, release, deploy, cutover, readiness claim, RC_READY claim, and any unlisted action.
```

## Preconditions For Future Execution

Before the future exact-approved run, the operator must verify and bind:

- clean worktree
- local `main` equals `origin/main`
- target commit is the fresh post-packet commit
- endpoint and health URL match this packet
- runtime freshness check is included or explicitly scoped out with fail-closed wording
- bearer token already exists in the current session, if token is needed
- token value is not printed, copied into docs, persisted, or edited
- no client config file is edited
- no Claude command registration is executed unless a separate config-change approval exists
- no watchdog/startup change is made
- rollback path is documented for any future config-changing follow-up

## Allowed Future Actions

If and only if the operator sends a fresh exact approval line, the later execution may run:

- HTTP health probe for `http://127.0.0.1:7605/health`
- authenticated MCP initialize against `http://127.0.0.1:7605/mcp/codex-memory`
- authenticated MCP tools/list against the same endpoint
- readonly `memory_overview`
- at most two bounded readonly `search_memory` calls when all of the following are true:
  - task-relevant Phase H client-scope query
  - `include_content=false`
  - bounded `limit`
  - sanitized output only
  - no raw content, raw snippets, raw paths, raw jsonl, raw audit, vector payload, or candidate-cache payload

## Forbidden Actions

The future approval does not allow:

- `record_memory`
- real scoped write proof
- durable memory, diary, SQLite, vector, candidate-cache, or audit write
- broad real memory scan, export, import, or migration
- raw `.jsonl`, raw audit, raw memory, vector payload, or candidate-cache output
- provider/model/API calls
- config, watchdog, startup, scheduled task, or client registration changes
- public MCP tool or schema expansion
- dependency changes
- push, PR update, merge, tag, release, deploy, cutover, or production action
- readiness, reliability, release, cutover, production, or `RC_READY` claim
- any action not explicitly listed in the exact approval line

## Side-Effect Budget

The future execution must stay within:

```text
health_probes <= 1
mcp_initialize_calls <= 1
mcp_tools_list_calls <= 1
memory_overview_calls <= 1
search_memory_calls <= 2
record_memory_calls = 0
provider_calls = 0
durable_memory_writes = 0
durable_audit_writes = 0
raw_store_scans = 0
raw_jsonl_reads = 0
raw_audit_reads = 0
config_watchdog_startup_changes = 0
public_mcp_expansions = 0
remote_actions = 0
readiness_claims = 0
```

## Required Evidence Record

Any future execution record must include:

- target branch and fresh commit
- endpoint and health URL
- exact approval line consumed
- commands or MCP actions performed
- side-effect counters
- sanitized result summary
- public tools exact set
- token handling statement
- memory operation statement
- raw data exposure statement
- rollback or cleanup path
- validation commands and results
- explicit `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` preservation

## Rollback

This packet itself has no runtime rollback because it does not execute anything.

Rollback for this docs-only task is reverting the docs/board commit.

If a later approved execution only performs read-only probes, rollback is recording the failure/receipt and stopping. If a later task proposes config changes, it must have its own rollback section before execution.

## Failure Criteria

Future execution must fail closed if:

- worktree is dirty
- branch is not `main`
- local `main` is not equal to `origin/main`
- target commit does not match the exact approval line
- endpoint differs from this packet
- bearer token is missing when authenticated calls are required
- token material would be printed, persisted, or edited
- public MCP tools are not exactly `record_memory`, `search_memory`, and `memory_overview`
- any forbidden action is requested or observed
- any side-effect counter exceeds budget
- raw/private data would be exposed
- any readiness or `RC_READY` claim appears

## Result

This packet prepares a future exact approval surface only.

It does not authorize or execute live validation.

Current project status remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
