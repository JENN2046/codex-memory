# CM-1431 Scoped Record Memory Write Proof Scope Packet

Status: `SCOPE_PACKET_PREPARED_NOT_EXECUTED`

Task: `CM-1431 scoped record_memory write proof scope packet`

Future gate: `CM-1432 scoped record_memory write proof`

Validation: `CMV-1543`

Prepared: `2026-06-04`

## Purpose

Prepare the exact boundary for a future bounded scoped `record_memory` write proof.

CM-1431 is docs-only. It does not execute `record_memory`, `search_memory`, `memory_overview`, bearer-token use, provider/API calls, runtime refresh, real memory read/write, raw SQLite/jsonl/vector/cache/audit scan, public MCP expansion, remote action, readiness claim, or `RC_READY` claim.

The future CM-1432 gate is a durable mutation boundary and must not be executed from this packet alone. It requires a fresh exact approval after this packet is committed and pushed, plus runtime refresh to that future commit.

## Baseline

- Current docs-only baseline before this packet: `main == origin/main == 61a20c694c49aa937049846f3d8d37a586a01a0c`.
- Phase H read-only evidence baseline: CM-1430 records CM-1428 bounded positive `search_memory` shape evidence.
- Future CM-1432 target must be the fresh clean synced `main == origin/main` commit after the CM-1431 packet commit/push.
- Future CM-1432 must refresh runtime to that exact target before any write attempt.

## Future Write Shape

Future CM-1432 may execute only:

- calls: exactly `1`
- tool: authenticated public HTTP MCP `record_memory`
- endpoint: `http://127.0.0.1:7605/mcp/codex-memory`
- target: `process`
- content: synthetic governance-safe marker only
- include private content: `false`
- follow-up search: forbidden unless separately authorized

Required scope fields in the future payload:

- `project_id`
- `client_id`
- `visibility`
- `task_id`
- `retention_policy`

## Exact Future Payload

The future call payload must match this canonical JSON exactly.

```json
{"target":"process","title":"CM-1432 scoped write proof marker","content":"CM-1432 scoped record_memory write proof synthetic governance-safe marker. This marker contains no private user memory, no secrets, no credentials, no provider endpoints, and no operational raw store content. It exists only to prove a single scoped write path can accept an explicitly bounded process memory payload.","evidence":"CM-1431 prepared the docs-only scope packet after Phase H read-only search evidence baseline 61a20c6. Future CM-1432 may execute exactly one authenticated record_memory call only after runtime refresh and fresh exact approval.","tags":["cm-1432","scoped-write-proof","phase-h","synthetic","governance-safe"],"sensitivity":"none","validated":true,"reusable":false,"project_id":"codex-memory","workspace_id":"A:/codex-memory","client_id":"codex","task_id":"CM-1432","visibility":"project","retention_policy":"short_lived_or_tombstone_after_validation"}
```

Payload SHA-256 over the exact canonical JSON above:

```text
015df43d6ca44197da9a3811a02c39c1696f1d27661a399c6ecc421ba9a757fb
```

## Future Preconditions

CM-1432 may start only after a fresh exact approval that names the post-CM-1431 commit.

Required preconditions:

- `main == origin/main == <CM-1431 commit>`
- worktree clean
- runtime refreshed to `<CM-1431 commit>`
- runtime freshness accepted
- public tools unchanged: `memory_overview`, `record_memory`, `search_memory`
- exact payload SHA-256 matches `015df43d6ca44197da9a3811a02c39c1696f1d27661a399c6ecc421ba9a757fb`
- bearer token may be used only for the single approved authenticated public HTTP MCP call and must not be printed, stored, or edited

## Future Validation Expectations

Future CM-1432 accepted evidence must prove only:

- exactly one authenticated `record_memory` call was attempted
- write accepted
- target was `process`
- payload was synthetic governance-safe marker content
- required scope fields were present
- no private content was included
- no provider/API call occurred
- no raw store scan occurred
- no broad search occurred
- no follow-up search occurred unless separately authorized
- no config/watchdog/startup change occurred
- evidence closeout is required after execution

If `record_memory` returns a generated memory id directly in the sanitized tool response, CM-1432 may report that returned id only as response evidence. CM-1432 must not obtain ids by raw store, raw audit, SQLite, jsonl, vector, cache, or broad memory scan.

## Future Forbidden Actions

CM-1432 must fail closed before execution if any boundary is ambiguous.

Forbidden:

- second `record_memory` call
- `search_memory`
- `memory_overview`
- `include_content=true`
- payload change
- private memory content
- provider/API call
- real memory read
- raw SQLite/jsonl/vector/cache/audit scan
- raw response printing or persistence beyond sanitized receipt
- broad search
- public MCP expansion
- config/watchdog/startup modification
- push, PR, release, deploy, tag
- readiness, reliability, cutover, or `RC_READY` claim

## Future Exact Approval Template

Use this exact approval template only after the CM-1431 packet commit has been pushed and fresh Git/runtime facts are available.

```text
I approve CM-1432 scoped record_memory write proof for codex-memory on branch main at commit <CM-1431_COMMIT_FULL_HASH>, endpoint http://127.0.0.1:7605/mcp/codex-memory, using only the current-session already-present bearer token without printing, reading aloud, storing, or editing token material; allowed actions are runtime refresh/freshness preflight, authenticated MCP initialize if required, authenticated tools/list if required to confirm public tools unchanged, and exactly one record_memory call with target=process using only the exact JSON payload in docs/CM1431_SCOPED_RECORD_MEMORY_WRITE_PROOF_SCOPE_PACKET.md with payload_sha256=015df43d6ca44197da9a3811a02c39c1696f1d27661a399c6ecc421ba9a757fb and required_scope_fields=project_id,client_id,visibility,task_id,retention_policy; expected result is accepted scoped process write with no private content; forbidden actions are second record_memory call, search_memory, memory_overview, provider/API calls, raw memory/jsonl/sqlite/vector/cache/audit output or scan, broad search, follow-up search, config/watchdog/startup change, public MCP expansion, push, PR, release, deploy, tag, cutover, readiness claim, reliability claim, RC_READY claim, and any unlisted action.
```

## CM-1431 Side-Effect Counters

- `record_memory`: `0`
- `search_memory`: `0`
- `memory_overview`: `0`
- bearer-token use: `0`
- provider/API calls: `0`
- real memory reads: `0`
- real memory writes: `0`
- raw store scans: `0`
- durable memory/audit writes: `0`
- runtime refresh/start/stop: `0`
- public MCP expansion: `0`
- remote actions: `0`
- readiness / `RC_READY` claims: `0`

CM-1431 only prepares the future scope packet.
