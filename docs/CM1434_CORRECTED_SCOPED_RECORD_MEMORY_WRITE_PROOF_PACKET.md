# CM-1434 Corrected Scoped Record Memory Write Proof Packet

Status: `CORRECTED_SCOPE_PACKET_PREPARED_NOT_EXECUTED`

Task: `CM-1434 docs-only corrected scoped record_memory write proof packet`

Future gate: `CM-1432 scoped record_memory write proof rerun`

Validation: `CMV-1545`

Prepared: `2026-06-04`

## Purpose

Prepare a corrected exact payload for a future CM-1432 scoped `record_memory` write proof rerun.

CM-1434 is docs-only. It does not execute live `record_memory`, `search_memory`, `memory_overview`, bearer-token use, provider/API calls, runtime refresh, real memory read/write, raw SQLite/jsonl/vector/cache/audit scan, public MCP expansion, remote action, readiness claim, or `RC_READY` claim.

## Correction Rationale

CM-1432 attempted exactly one authenticated public HTTP MCP `record_memory` call with the CM-1431 payload and failed closed with `decision=rejected`.

CM-1433 investigated without live rerun and found:

- The CM-1431 payload passed public `record_memory` schema / `ToolArgumentValidator`.
- Required scope fields were present.
- The rejection came from `MemoryWriteService.record(...) -> validateProcessEntry(title, content)`.
- `target=process` payloads must include one process-memory signal in title/content: `checkpoint`, `risk`, `todo`, `pending`, or `stage-conclusion`.
- The CM-1431 payload was synthetic governance-safe but lacked that signal.

This packet corrects only that payload shape by adding `Checkpoint:` to title/content while preserving synthetic governance-safe content and scope.

## Baseline

- Current corrected packet baseline starts after CM-1431 packet commit `1444dbf96b4d146dff55317e6c328f06e687482f`.
- CM-1432 fail-closed fact is preserved.
- Future CM-1432 rerun target must be the fresh clean synced `main == origin/main` commit after CM-1434 is committed and pushed.
- Future CM-1432 rerun must refresh runtime to that exact target before any write attempt.

## Future Write Shape

Future CM-1432 rerun may execute only:

- calls: exactly `1`
- tool: authenticated public HTTP MCP `record_memory`
- endpoint: `http://127.0.0.1:7605/mcp/codex-memory`
- target: `process`
- content: synthetic governance-safe marker only
- process-memory signal: `Checkpoint:`
- include private content: `false`
- follow-up search: forbidden unless separately authorized

Required scope fields in the future payload:

- `project_id`
- `client_id`
- `visibility`
- `task_id`
- `retention_policy`

## Exact Corrected Future Payload

The future call payload must match this canonical JSON exactly.

```json
{"target":"process","title":"Checkpoint: CM-1432 scoped write proof marker","content":"Checkpoint: CM-1432 scoped record_memory write proof synthetic governance-safe marker. This marker contains no private user memory, no secrets, no credentials, no provider endpoints, and no operational raw store content. It exists only to prove a single scoped process write path can accept an explicitly bounded process memory payload.","evidence":"CM-1434 prepared the corrected docs-only scope packet after CM-1432 fail-closed showed the CM-1431 payload lacked the required process-memory checkpoint signal. Future CM-1432 rerun may execute exactly one authenticated record_memory call only after commit/push, runtime refresh, and fresh exact approval.","tags":["cm-1432","cm-1434","scoped-write-proof","phase-h","synthetic","governance-safe"],"sensitivity":"none","validated":true,"reusable":false,"project_id":"codex-memory","workspace_id":"A:/codex-memory","client_id":"codex","task_id":"CM-1432","visibility":"project","retention_policy":"short_lived_or_tombstone_after_validation"}
```

Corrected payload SHA-256 over the exact canonical JSON above:

```text
25a5f0bd9edd4ee011bff414f09a4d6f61f5dc1db31b9fc21695d9779678ba67
```

## Corrected Payload Validation

CM-1434 temp/synthetic validation must confirm:

- public `record_memory` schema accepts the corrected payload
- `ToolArgumentValidator` accepts the corrected payload
- required scope fields are present
- `target=process`
- title/content include the `Checkpoint:` process-memory signal
- temp/synthetic `record_memory` accepts the corrected payload
- no live `record_memory` call occurs in CM-1434

## Future Preconditions

CM-1432 rerun may start only after a fresh exact approval that names the post-CM-1434 commit.

Required preconditions:

- `main == origin/main == <CM-1434 commit>`
- worktree clean
- runtime refreshed to `<CM-1434 commit>`
- runtime freshness accepted
- public tools unchanged: `memory_overview`, `record_memory`, `search_memory`
- exact corrected payload SHA-256 matches `25a5f0bd9edd4ee011bff414f09a4d6f61f5dc1db31b9fc21695d9779678ba67`
- bearer token may be used only for the single approved authenticated public HTTP MCP call and must not be printed, stored, or edited

## Future Forbidden Actions

CM-1432 rerun must fail closed before execution if any boundary is ambiguous.

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

Use this exact approval template only after the CM-1434 corrected packet commit has been pushed and fresh Git/runtime facts are available.

```text
I approve CM-1432 scoped record_memory write proof rerun for codex-memory on branch main at commit <CM-1434_COMMIT_FULL_HASH>, endpoint http://127.0.0.1:7605/mcp/codex-memory, using only the current-session already-present bearer token without printing, reading aloud, storing, or editing token material; allowed actions are runtime refresh/freshness preflight, authenticated MCP initialize if required, authenticated tools/list if required to confirm public tools unchanged, and exactly one record_memory call with target=process using only the exact corrected JSON payload in docs/CM1434_CORRECTED_SCOPED_RECORD_MEMORY_WRITE_PROOF_PACKET.md with payload_sha256=25a5f0bd9edd4ee011bff414f09a4d6f61f5dc1db31b9fc21695d9779678ba67 and required_scope_fields=project_id,client_id,visibility,task_id,retention_policy; expected result is accepted scoped process write with synthetic governance-safe Checkpoint marker and no private content; forbidden actions are second record_memory call, search_memory, memory_overview, provider/API calls, raw memory/jsonl/sqlite/vector/cache/audit output or scan, broad search, follow-up search, config/watchdog/startup change, public MCP expansion, push, PR, release, deploy, tag, cutover, readiness claim, reliability claim, RC_READY claim, and any unlisted action.
```

## CM-1434 Side-Effect Counters

- live `record_memory`: `0`
- second live write attempt: `0`
- temp/synthetic `record_memory`: `1`
- `search_memory`: `0`
- `memory_overview`: `0`
- bearer-token use: `0`
- provider/API calls: `0`
- real memory reads: `0`
- real memory writes: `0`
- raw store scans: `0`
- durable real memory/audit writes: `0`
- runtime refresh/start/stop: `0`
- public MCP expansion: `0`
- remote actions: `0`
- readiness / `RC_READY` claims: `0`

CM-1434 only prepares and validates the corrected future scope packet.
