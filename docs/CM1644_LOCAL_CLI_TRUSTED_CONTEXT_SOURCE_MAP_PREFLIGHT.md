# CM-1644 local CLI trusted context source map preflight

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_LOCAL_CLI_TRUSTED_CONTEXT_SOURCE_MAP_DOCS_ONLY_NO_RUNTIME_CHANGE`

## Scope

This preflight maps local CLI, script, and local runner trusted
`executionContext` boundaries for future `record_memory` strict principal/scope
auth.

This task is docs/status only. It does not change source behavior, does not
enable strict production default, does not execute `record_memory`, and does not
claim production, release, cutover, broad write reliability, or complete V8
readiness.

## Current Baseline

```text
HEAD = origin/main = b712d794245aa2e88ba7fa2f3b6a24eea854fd6c
record_memory strict auth production policy preflight = CLOSED
strict production default enabled = NO
runtime auth behavior changed = NO
public MCP surface = 7
production ready = NO
complete V8 = NOT_CLAIMED
```

## Source Map

| Surface | File / command | `record_memory` path | Trusted context status | CM-1644 decision |
|---|---|---|---|---|
| stdio MCP binary | `src/index.js`, `src/adapters/codex-mcp/stdio.js`, `codex-memory` | Public MCP `tools/call record_memory` through `app.callTool(...)` | Uses `buildRecordMemoryTrustedExecutionContext(...)` from env / `baseRequestContext` / config | Candidate-capable after launch/runbook supplies complete fields |
| HTTP MCP binary | `src/http-index.js`, `src/adapters/codex-mcp/http.js`, `codex-memory-http` | Public MCP `tools/call record_memory` through HTTP MCP | Uses `buildRecordMemoryTrustedExecutionContext(...)` from env / `baseRequestContext` / config | Candidate-capable after launch/runbook supplies complete fields |
| scope acceptance CLI | `npm run scope:acceptance`, `src/cli/scope-acceptance.js` | Executes two temp-local `record_memory` calls through `CodexMemoryMcpServer.handleJsonRpc(...)` | Current request context supplies `agentAlias`, `agentId`, and `requestSource`; `projectId`, `workspaceId`, and `clientId` are only in payload scope | Not production-candidate-capable yet; future strict would fail missing trusted scope |
| store freshness preflight | `src/cli/store-freshness-write-preflight.js` | Builds proposed `record_memory` arguments only | Does not execute MCP; proposed payload has `client_id` but no trusted execution context | Approval packet only; not a strict execution path |
| write proof preflights | `src/cli/write-proof-current-facts-preflight.js`, `src/cli/write-proof-execution-preflight.js` | Explicitly reject execution flags and report `recordMemoryStarted=false` | No write execution context because no execution occurs | No strict context contract needed until a separate execution command exists |
| dashboard | `src/cli/dashboard.js` | May call store freshness preflight and display recommendation | Does not execute `record_memory` | No strict context contract needed for display-only path |
| migration / validation / controlled mutation dry-run CLIs | `src/cli/*dry-run*.js`, `validate-memory`, `tombstone-memory`, `supersede-memory` families | Do not execute public `record_memory` as a normal write path | Separate dry-run/governance contracts | Out of strict `record_memory` execution scope |

## Required Answers

1. Does local CLI currently have a `record_memory` path?

Yes, but narrowly. The stdio binary is a local CLI entrypoint to the MCP server
and can receive public `record_memory` tool calls. Separately,
`src/cli/scope-acceptance.js` is a local temp-workspace acceptance CLI that
executes two temp-local `record_memory` writes through the in-process MCP server.
Most other CLI files are preflight or dry-run surfaces and do not execute
`record_memory`.

2. If a path exists, where does trusted context come from?

For stdio and HTTP MCP, trusted context comes from
`RecordMemoryTrustedExecutionContext`: env, `baseRequestContext`, and config.
For `scope-acceptance`, current trusted context is manually supplied in the CLI
as `agentAlias`, `agentId`, and `requestSource`; project/workspace/client values
are only supplied as public payload scope and are not trusted principal/scope
authority.

3. Can local CLI provide all six fields?

`codex-memory` stdio and `codex-memory-http` can provide all six fields if the
launcher/env/config/runbook supplies them. `scope-acceptance` currently does not
provide all six trusted fields. It can be made capable later by using the shared
trusted context helper or by explicitly passing complete trusted
`baseRequestContext.executionContext` from test-only options.

4. Missing fields: fail-closed or observe-only?

For any future strict local CLI execution path, missing required fields must
fail closed before persistence. Observe-only is acceptable only in a dedicated
stage 1 preflight/rollout mode and must not be described as strict enforcement.

5. Is there risk of reading `projectId` / `workspaceId` / `clientId` from user
payload or tool args?

Yes for `scope-acceptance` if it were treated as a strict production path:
project/workspace/client values are currently in tool arguments. That is valid
for scope-isolation payload testing, but it must not authorize the same write in
strict principal/scope mode. Future strict CLI work must keep payload scope as
data and trusted context as authority.

6. Should local CLI share `RecordMemoryTrustedExecutionContext`?

Yes for write-capable or MCP-like local runners. Stdio and HTTP already share
it. Future work should either route `scope-acceptance` through the shared helper
with temp-local config/base context or explicitly mark it as temp-local
observe-only / strict-test-only and not production-candidate-capable.

7. Does local CLI need an independent context contract document?

Yes. A future contract should define which local commands are write-capable,
which are proposal/preflight only, which are temp-local test-only, and how each
write-capable path obtains the six trusted fields without relying on public
payload scope.

## Production Policy Impact

This preflight does not change the CM-1643 rollout:

```text
stage 0: off, current default
stage 1: observe-only with complete policy
stage 2: strict temp-local only
stage 3: strict local runtime candidate
stage 4: production candidate only after separate exact approval
```

CM-1644 narrows the local CLI blocker:

```text
local CLI trusted context source map: RECORDED
local CLI strict production candidate: NOT_READY
scope-acceptance trusted six-field context: NOT_IMPLEMENTED
shared helper adoption for write-capable local CLI: RECOMMENDED_FUTURE_WORK
```

## Future Acceptance Criteria

Before any local CLI strict candidate can be included in stage 3 or stage 4:

- every write-capable local CLI path must be listed
- every write-capable local CLI path must supply all six trusted fields from
  env/base/config/launcher context
- payload scope must not authorize the same write
- missing or mismatched required fields must fail closed in strict mode before
  persistence
- public/audit rejection output must not echo raw `agentId`, `workspaceId`, or
  `clientId`
- preflight-only commands must continue to reject execution flags
- temp-local acceptance CLIs must be labeled temp-local and not production
  candidate evidence

## Non-Claims

```text
strict default changed: NO
production strict mode enabled: NO
runtime auth behavior changed: NO
source behavior changed: NO
real record_memory write occurred: NO
live MCP proof occurred: NO
provider/API occurred: NO
bearer token material used: NO
raw scan / broad scan occurred: NO
confirmed mutation occurred: NO
public MCP expansion occurred: NO
persistent tag write occurred: NO
release/tag/deploy occurred: NO
production ready: NO
release ready: NO
cutover ready: NO
complete V8: NOT_CLAIMED
```
