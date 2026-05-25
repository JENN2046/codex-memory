# CM1095 Authorized Mutation Token Path Boundary

Status: `MUTATION_TOKEN_PATH_BOUNDARY_READY_NOT_CONFIGURED_NOT_WRITTEN_NOT_READY`

Date: 2026-05-25

## Scope

CM1095 defines the boundary for recovering from the CM1094 `NO_TOKEN_MUTATION_REJECTED` failure before any new true `record_memory` attempt.

This document does not read, print, inject, persist, or configure any token.

It does not call `record_memory`, does not call `search_memory`, does not call providers or APIs, does not read raw memory, does not read direct `.jsonl`, does not read raw audit, does not write durable memory or audit, does not apply cleanup/rollback/tombstone, does not migrate schema, does not change config/watchdog/startup/dependencies, does not expand public MCP, does not push, does not tag/release/deploy, and does not claim readiness/reliability.

## Current Failure

CM1094 consumed one exact-approved `record_memory` attempt and failed before mutation:

```text
MCP error: -32001
code: NO_TOKEN_MUTATION_REJECTED
reason: No-token HTTP MCP requests cannot call mutation tools.
```

No memory id was returned.

No accepted `shadowWrite` result was returned.

No retry is allowed under CM1094 because max calls was exactly `1`.

## Source Boundary

Current HTTP MCP code rejects mutation tools when `bearerToken` is empty:

```text
src/adapters/codex-mcp/http.js
NO_TOKEN_BLOCKED_TOOLS includes record_memory
validateNoTokenJsonRpcRequest(...) returns NO_TOKEN_MUTATION_REJECTED
```

Therefore a future successful public HTTP MCP mutation requires an authorized bearer-token path.

## Token Path Options

Allowed next options require separate exact approval:

1. Operator configures a token outside this assistant turn and restarts/reconnects the MCP client so future `record_memory` calls include bearer authorization.
2. Operator explicitly approves a bounded token-presence classification that checks only presence/absence, never the token value.
3. Operator explicitly approves a local runtime/token configuration plan before any config edit or service restart.

Forbidden in this slice:

- printing token values
- reading secret files
- editing `.env`
- editing Codex or Claude config
- changing startup/watchdog
- starting/restarting/replacing HTTP MCP
- retrying `record_memory`
- using `search_memory` as marker verification
- raw store, direct `.jsonl`, or raw audit reads
- public MCP expansion
- readiness/reliability claims

## Regenerated Write Packet Rule

The prior CM1094 packet used an approval payload whose `visibility` value was not compatible with the exposed MCP tool schema.

The regenerated packet must use the MCP-schema-compatible value:

```json
"visibility": "project"
```

This changes the exact payload hash. A future attempt must bind to the regenerated hash, not the CM1094 hash.

## Next Approval Packet

The next packet is:

```text
CM-1096-EXACT-RECORD-MEMORY-WRITE-001
```

It remains blocked until an authorized bearer-token mutation path is established and a fresh exact approval is given.

CM1095 is not a write approval and not a token/config approval.
