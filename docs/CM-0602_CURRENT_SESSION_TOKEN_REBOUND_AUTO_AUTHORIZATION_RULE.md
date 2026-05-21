# CM-0602 Current-Session Token Rebound Auto-Authorization Rule

Status: DRAFT_LOCAL_RULE_NOT_EXECUTED
Decision: AUTO_AUTHORIZATION_RULE_PREPARED_NOT_ADOPTED
Date: 2026-05-20

## Purpose

This note defines the smallest safe meaning of:

```text
允许自动授权
```

for the current authorized public `record_memory` write-path chain.

It does not authorize automatic runtime execution in general.

It does not authorize automatic write validation.

It does not authorize automatic recall validation.

It only defines when the already-standardized CM-0601 approval line may be auto-reused without reopening packet wording.

## Scope

Auto-authorization is permitted only for this exact bounded unit:

```text
CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001
```

through:

```text
docs/CM-0601_CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_PACKET.md
```

No other A5 unit is covered by this rule.

## Preconditions

All of the following must remain true before any auto-issued CM-0601 approval is considered valid:

1. `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md` remains the controlling map.
2. Controlling status remains `RC_NOT_READY_BLOCKED`.
3. Target baseline remains exactly:

```text
017eda4930c5add4b824c162c46868f75c91ea0f
```

or a later explicitly rebound commit recorded in docs/board.

4. The latest controlling prerequisite evidence still includes:
   - `docs/CM-0592_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_EVIDENCE.md`
   - `docs/CM-0603_CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_EXECUTION_EVIDENCE.md`
5. No approval is auto-issued for `CM-0595`, `record_memory`, `search_memory`, provider calls, config mutation, startup persistence, public MCP expansion, durable write, or readiness claim.
6. An external token-availability change is asserted outside the packet itself and is strong enough to satisfy:

```text
docs/CM-0610_EXTERNAL_TOKEN_MATERIAL_ASSERTION_CONTRACT.md
```

## Meaning Of External Token-Availability Change

For this rule, an external token-availability change means one of the accepted assertion classes in:

```text
docs/CM-0610_EXTERNAL_TOKEN_MATERIAL_ASSERTION_CONTRACT.md
```

was satisfied outside the packet.

Typical examples include:

- the operator explicitly states token material has now been independently provided to the current session
- a separate environment setup step outside this packet completed and is treated as the reason to retry the rebound check
- the current session context has materially changed in a way that may have introduced token material

Vague retry language or implied session drift is not enough by itself.

This rule does not verify that the token is actually present.

That verification remains the purpose of CM-0601 itself.

## Allowed Auto-Authorization Output

If and only if all preconditions still hold, the allowed auto-issued approval text is exactly the CM-0601 line:

```text
授权执行 CM-0601，target baseline = 017eda4930c5add4b824c162c46868f75c91ea0f，只允许 CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001，只允许在 token material 已被独立提供到当前 session 的前提下检查当前 session 内 CODEX_MEMORY_HTTP_TOKEN 是否存在（不得绑定、不得打印、不得持久化），禁止 record_memory / search_memory / marker search / start:http:ensure / health probe / observe:http / .jsonl read / provider / config change / .env edit / watchdog or startup persistence / public MCP expansion / durable write / readiness claim。
```

## Forbidden Auto-Authorization

This rule never auto-authorizes:

- `CM-0595`
- `record_memory`
- `search_memory`
- marker search
- token binding
- `start:http:ensure`
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

## Outcome Rules

- If an auto-issued CM-0601 later fails closed again, the controlling state stays `RC_NOT_READY_BLOCKED`.
- If an auto-issued CM-0601 later succeeds and proves token presence on the same baseline, that still does not auto-authorize CM-0595.
- `CM-0595` remains a separate exact approval boundary unless a later rule explicitly widens auto-authorization.

## Next Safe Action

Keep this rule as governance-only preparation.

Do not treat it as runtime execution permission by itself.

Use it only to justify reusing the already-standardized CM-0601 approval line when the external token-availability precondition changes.
