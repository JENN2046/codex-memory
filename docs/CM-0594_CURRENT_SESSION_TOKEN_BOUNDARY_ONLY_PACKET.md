# CM-0594 Current-Session Token Boundary Only Packet

Status: APPROVED_EXECUTED_NOT_READY
Decision: CURRENT_SESSION_TOKEN_BOUNDARY_NOT_ESTABLISHED
Date: 2026-05-20

## Purpose

This packet is now a consumed historical exact A5 boundary after CM-0592 and CM-0593.

It does not execute `record_memory`.

It does not execute `search_memory`.

It does not start HTTP MCP.

It does not probe `/health`.

Its only purpose was to establish the one remaining prerequisite that CM-0592 left unresolved: the current-session token boundary.

## Current Evidence Source

Current enablement evidence:

```text
docs/CM-0592_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_EVIDENCE.md
```

Current execution evidence:

```text
docs/CM-0596_CURRENT_SESSION_TOKEN_BOUNDARY_ONLY_EXECUTION_EVIDENCE.md
```

Remaining blocker:

```text
AUTHORIZED_PUBLIC_WRITE_PATH_BLOCKED_TOKEN_MISSING
```

## Exact Scope

This packet requested one bounded exact-approval unit only:

```text
CURRENT_SESSION_TOKEN_BOUNDARY_ONLY_001
```

Goal:

```text
Establish or verify the current-session-only CODEX_MEMORY_HTTP_TOKEN boundary without printing, persisting, or re-running startup/health/write actions.
```

## Permitted Only Under Exact Approval

- re-read branch, `HEAD`, `origin/main`, and remote main
- inspect current-session presence/absence only for `CODEX_MEMORY_HTTP_TOKEN`
- bind `CODEX_MEMORY_HTTP_TOKEN` into the current session only if the future approval line explicitly allows that action
- record one bounded token-boundary evidence note
- update docs/board after execution

## Forbidden Unless Separately Approved

- `record_memory`
- `search_memory`
- marker search
- `npm run start:http:ensure`
- `/health` probe
- `observe:http`
- `.jsonl` read
- provider/model call
- config file edit
- `.env` edit
- watchdog/startup persistence change
- public MCP expansion
- durable write
- readiness claim

## Pass Evidence Shape

```json
{
  "unit": "CURRENT_SESSION_TOKEN_BOUNDARY_ONLY_001",
  "targetBaseline": "<full commit>",
  "tokenPresentBefore": false,
  "tokenSessionBoundDuringExecution": true,
  "tokenPersisted": false,
  "recordMemoryCalled": false,
  "searchMemoryCalled": false,
  "result": "CURRENT_SESSION_TOKEN_BOUNDARY_ESTABLISHED_NOT_READY"
}
```

## Fail Evidence Shape

```json
{
  "unit": "CURRENT_SESSION_TOKEN_BOUNDARY_ONLY_001",
  "targetBaseline": "<full commit>",
  "tokenPresentBefore": false,
  "tokenSessionBoundDuringExecution": false,
  "tokenPersisted": false,
  "recordMemoryCalled": false,
  "searchMemoryCalled": false,
  "result": "CURRENT_SESSION_TOKEN_BOUNDARY_NOT_ESTABLISHED"
}
```

## Required Approval Line

Approved exact line consumed:

```text
授权执行 CM-0594，target baseline = 017eda4930c5add4b824c162c46868f75c91ea0f，只允许 CURRENT_SESSION_TOKEN_BOUNDARY_ONLY_001，只允许在当前 session 内检查或绑定 CODEX_MEMORY_HTTP_TOKEN（不得打印、不得持久化），禁止 record_memory / search_memory / marker search / start:http:ensure / health probe / observe:http / .jsonl read / provider / config change / .env edit / watchdog or startup persistence / public MCP expansion / durable write / readiness claim。
```

## Next Safe Action

Treat this packet as consumed historical evidence only.

Treat the historical CM-0597 rerun as already consumed too; the current live successor is CM-0599 if token material is later independently available to the current session.
