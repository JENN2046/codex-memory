# CM-0601 Current-Session Token Presence Rebound Packet

Status: APPROVED_EXECUTED_NOT_READY
Decision: CURRENT_SESSION_TOKEN_STILL_MISSING
Date: 2026-05-20

## Purpose

This packet is the prepared successor after CM-0600.

CM-0592 already consumed the bounded startup and loopback health prerequisites.

CM-0596, CM-0598, and CM-0600 then consumed three increasingly narrow token-only exact boundaries and all failed closed because current-session token material was still absent.

This packet does not try to solve token availability by itself.

It exists only for the moment when token material has already been independently made available to the current session outside the packet itself.

It does not attempt any bind.

It does not execute `record_memory`.

It does not execute `search_memory`.

It does not start HTTP MCP.

It does not probe `/health`.

It is intentionally precomposed so the next approval line can be reused or auto-issued later without reopening packet design, but it still must fail closed if the external token prerequisite is not already true.

## Current Evidence Source

Current enablement evidence:

```text
docs/CM-0592_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_EVIDENCE.md
```

Current blocked write-validation evidence:

```text
docs/CM-0593_AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_ENABLEMENT_BLOCKED_EVIDENCE.md
```

Latest token-still-missing evidence:

```text
docs/CM-0600_CURRENT_SESSION_TOKEN_PRESENCE_RECHECK_ONLY_EXECUTION_EVIDENCE.md
```

Remaining blocker:

```text
AUTHORIZED_PUBLIC_WRITE_PATH_BLOCKED_TOKEN_MISSING
```

## Exact Scope

This packet requests one bounded future exact-approval unit only:

```text
CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001
```

Goal:

```text
Recheck the current-session-only presence of CODEX_MEMORY_HTTP_TOKEN only after token material has already been independently provided to the current session, without binding, printing, persisting, or re-running startup/health/write actions.
```

## Permitted Only Under Exact Approval

- re-read branch, `HEAD`, `origin/main`, and remote main
- inspect current-session presence/absence only for `CODEX_MEMORY_HTTP_TOKEN`
- record one bounded token-presence rebound evidence note
- update docs/board after execution

## Forbidden Unless Separately Approved

- binding `CODEX_MEMORY_HTTP_TOKEN`
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
  "unit": "CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001",
  "targetBaseline": "<full commit>",
  "tokenPresentBefore": true,
  "tokenPersisted": false,
  "recordMemoryCalled": false,
  "searchMemoryCalled": false,
  "result": "CURRENT_SESSION_TOKEN_PRESENT_NOT_READY"
}
```

## Fail Evidence Shape

```json
{
  "unit": "CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001",
  "targetBaseline": "<full commit>",
  "tokenPresentBefore": false,
  "tokenPersisted": false,
  "recordMemoryCalled": false,
  "searchMemoryCalled": false,
  "result": "CURRENT_SESSION_TOKEN_STILL_MISSING"
}
```

## Required Approval Line

Approved exact line consumed:

```text
授权执行 CM-0601，target baseline = 017eda4930c5add4b824c162c46868f75c91ea0f，只允许 CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001，只允许在 token material 已被独立提供到当前 session 的前提下检查当前 session 内 CODEX_MEMORY_HTTP_TOKEN 是否存在（不得绑定、不得打印、不得持久化），禁止 record_memory / search_memory / marker search / start:http:ensure / health probe / observe:http / .jsonl read / provider / config change / .env edit / watchdog or startup persistence / public MCP expansion / durable write / readiness claim。
```

## Next Safe Action

Treat this packet as the executed rebound boundary for the current unchanged token state.

Do not advance to `record_memory` validation from this result.

Only if token material later changes independently in the current session should a fresh same-baseline rebound boundary be considered again.

Only after a future successful rebound result should:

```text
docs/CM-0595_AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_PACKET.md
```

become the next write-validation candidate.
