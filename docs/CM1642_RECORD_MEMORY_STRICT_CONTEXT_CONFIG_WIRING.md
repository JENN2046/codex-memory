# CM-1642 record_memory strict context config wiring

Date: 2026-06-11

Status: `IMPLEMENTED_DEFAULT_OFF`

## Scope

This slice advances `record_memory` production auth/scope hardening without
changing default runtime behavior.

It adds default-off config/profile/env/context wiring for principal/scope
authorization, but it does not make strict mode a production default and does
not claim production, release, cutover, broad write reliability, or complete V8
readiness.

## Receipt

| Field | Result |
|---|---|
| strict config/context wiring | `IMPLEMENTED_DEFAULT_OFF` |
| default runtime behavior changed | `NO` |
| production strict mode enabled | `NO` |
| `record_memory` broad reliability | `NOT_PROVEN` |
| production ready | `NO` |
| release ready | `NO` |
| cutover ready | `NO` |
| complete V8 | `NOT_CLAIMED` |
| public MCP surface | `STILL_7_TOOLS` |

## Config / Env / Profile Surface

Supported config/profile shape:

```json
{
  "recordMemoryPrincipalScopeAuthorization": {
    "mode": "off|observe|strict",
    "policy": {
      "allowedAgentAlias": "Codex",
      "allowedAgentIds": ["codex-desktop"],
      "allowedRequestSources": ["codex-memory-mcp"],
      "allowedProjectIds": ["codex-memory"],
      "allowedWorkspaceIds": ["workspace-alpha"],
      "allowedClientIds": ["codex"]
    }
  }
}
```

Supported env keys:

```text
CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE=off|observe|strict
CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_ALIAS
CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_IDS
CODEX_MEMORY_RECORD_MEMORY_ALLOWED_REQUEST_SOURCES
CODEX_MEMORY_RECORD_MEMORY_ALLOWED_PROJECT_IDS
CODEX_MEMORY_RECORD_MEMORY_ALLOWED_WORKSPACE_IDS
CODEX_MEMORY_RECORD_MEMORY_ALLOWED_CLIENT_IDS
CODEX_MEMORY_PROJECT_ID
CODEX_MEMORY_WORKSPACE_ID
CODEX_MEMORY_CLIENT_ID
```

`mode=observe` or `mode=strict` becomes effective only when the complete policy
is present. Missing or malformed policy stays effective `off` with
`disabledReason=incomplete_policy`, so strict mode cannot silently enable from a
partial config.

## HTTP / stdio Trusted Context Source

HTTP and stdio now construct execution context from trusted process-side sources:

```text
agentAlias: env -> baseRequestContext -> config -> Codex
agentId: env -> baseRequestContext -> config
requestSource: env -> baseRequestContext -> config
projectId: env -> baseRequestContext -> config
workspaceId: env -> baseRequestContext -> config
clientId: env -> baseRequestContext -> config
```

Tool-call payload scope is not treated as trusted production principal/scope
authority. Public MCP schema is unchanged.

## Validation

Executed:

```powershell
node --test tests\record-memory-principal-scope-authorization-config.test.js
node --test tests\record-memory-principal-scope-observe-only-integration.test.js
node --test tests\mcp-http.test.js
```

Observed results:

```text
record-memory-principal-scope-authorization-config.test.js: 10/10
record-memory-principal-scope-observe-only-integration.test.js: 11/11
mcp-http.test.js: 29/29
```

Additional required validation for closeout:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Additional checks:

```text
CURRENT_FACTS.json parse ok
public MCP surface count = 7
bad-claim scan passes
changed-scope review passes
```

## Non-Claims

No provider/API, bearer-token material, raw scan, broad memory scan, live proof,
confirmed mutation, public MCP expansion, second effective real
`record_memory` write, persistent tag write, release/tag/deploy,
production/release/cutover ready claim, or complete V8 ready claim occurred.

Temp-local tests exercise accepted and rejected `record_memory` paths only in
fixture stores.
