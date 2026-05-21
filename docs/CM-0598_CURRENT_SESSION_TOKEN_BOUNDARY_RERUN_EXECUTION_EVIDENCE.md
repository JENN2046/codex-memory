# CM-0598 Current-Session Token Boundary Rerun Execution Evidence

Status: APPROVED_EXECUTED_NOT_READY
Decision: CURRENT_SESSION_TOKEN_BOUNDARY_RERUN_NOT_ESTABLISHED
Date: 2026-05-20

## Purpose

This note records the approved execution of CM-0597.

It consumed the token-material rerun boundary.

It did not execute `record_memory`.

It did not execute `search_memory`.

It did not start HTTP MCP.

It did not probe `/health`.

## Approval Consumed

Approved exact line:

```text
授权执行 CM-0597，target baseline = 017eda4930c5add4b824c162c46868f75c91ea0f，只允许 CURRENT_SESSION_TOKEN_BOUNDARY_RERUN_001，只允许在当前 session 内检查或绑定 CODEX_MEMORY_HTTP_TOKEN（不得打印、不得持久化，且仅限 token material 已被单独提供到当前 session 的前提下），禁止 record_memory / search_memory / marker search / start:http:ensure / health probe / observe:http / .jsonl read / provider / config change / .env edit / watchdog or startup persistence / public MCP expansion / durable write / readiness claim。
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

## Current-Session Token Rerun Result

Sanitized token-boundary recheck:

```json
{
  "tokenPresent": false,
  "tokenLength": 0
}
```

Interpretation:

- current-session `CODEX_MEMORY_HTTP_TOKEN` was still not present
- no separately provided token material was observable inside the approved execution scope
- no token value was printed
- no token was persisted
- no out-of-scope binding or config path was attempted

## Evidence Output

```json
{
  "unit": "CURRENT_SESSION_TOKEN_BOUNDARY_RERUN_001",
  "targetBaseline": "017eda4930c5add4b824c162c46868f75c91ea0f",
  "tokenPresentBefore": false,
  "tokenSessionBoundDuringExecution": false,
  "tokenPersisted": false,
  "recordMemoryCalled": false,
  "searchMemoryCalled": false,
  "result": "CURRENT_SESSION_TOKEN_BOUNDARY_RERUN_NOT_ESTABLISHED"
}
```

## Forbidden-Action Preservation

Confirmed absent in this execution:

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
CURRENT_SESSION_TOKEN_BOUNDARY_RERUN_NOT_ESTABLISHED
RC_NOT_READY_BLOCKED
```

## Next Safe Action

Treat CM-0597 as a consumed historical token-material rerun packet.

Do not jump to CM-0595 from this result.

If token material is later made available to the current session by means outside this packet, use `docs/CM-0599_CURRENT_SESSION_TOKEN_PRESENCE_RECHECK_ONLY_PACKET.md` as the next exact recheck boundary.
