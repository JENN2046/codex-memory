# CM-0600 Current-Session Token Presence Recheck Only Execution Evidence

Status: APPROVED_EXECUTED_NOT_READY
Decision: CURRENT_SESSION_TOKEN_STILL_MISSING
Date: 2026-05-20

## Purpose

This note records the approved execution of CM-0599.

It consumed the presence-only exact boundary.

It did not bind `CODEX_MEMORY_HTTP_TOKEN`.

It did not execute `record_memory`.

It did not execute `search_memory`.

It did not start HTTP MCP.

It did not probe `/health`.

## Approval Consumed

Approved exact line:

```text
授权执行 CM-0599，target baseline = 017eda4930c5add4b824c162c46868f75c91ea0f，只允许 CURRENT_SESSION_TOKEN_PRESENCE_RECHECK_ONLY_001，只允许在 token material 已被独立提供到当前 session 的前提下检查当前 session 内 CODEX_MEMORY_HTTP_TOKEN 是否存在（不得绑定、不得打印、不得持久化），禁止 record_memory / search_memory / marker search / start:http:ensure / health probe / observe:http / .jsonl read / provider / config change / .env edit / watchdog or startup persistence / public MCP expansion / durable write / readiness claim。
```

## Baseline Recheck

Observed immediately before execution:

```json
{
  "branch": "main",
  "head": "017eda4930c5add4b824c162c46868f75c91ea0f",
  "originMain": "017eda4930c5add4b824c162c46868f75c91ea0f",
  "remoteMain": "017eda4930c5add4b824c162c46868f75c91ea0f"
}
```

## Current-Session Token Presence Result

Sanitized token-presence recheck:

```json
{
  "tokenPresent": false,
  "tokenLength": 0
}
```

Interpretation:

- current-session `CODEX_MEMORY_HTTP_TOKEN` was still not present
- no independently provided token material was observable inside the approved execution scope
- no bind was attempted
- no token value was printed
- no token was persisted

## Evidence Output

```json
{
  "unit": "CURRENT_SESSION_TOKEN_PRESENCE_RECHECK_ONLY_001",
  "targetBaseline": "017eda4930c5add4b824c162c46868f75c91ea0f",
  "tokenPresentBefore": false,
  "tokenPersisted": false,
  "recordMemoryCalled": false,
  "searchMemoryCalled": false,
  "result": "CURRENT_SESSION_TOKEN_STILL_MISSING"
}
```

## Forbidden-Action Preservation

Confirmed absent in this execution:

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

## Result

```text
CURRENT_SESSION_TOKEN_STILL_MISSING
RC_NOT_READY_BLOCKED
```

## Next Safe Action

Treat CM-0599 as a consumed historical presence-only packet.

Do not consume another A5 packet in this chain until token material is independently made available to the current session outside the packet itself.

Only after that external precondition changes should a fresh, rebound presence-only recheck boundary be prepared or approved.
