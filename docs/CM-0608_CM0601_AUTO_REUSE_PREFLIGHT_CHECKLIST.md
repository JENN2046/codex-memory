# CM-0608 CM0601 Auto-Reuse Preflight Checklist

Status: CHECKLIST_ONLY_NOT_EXECUTED
Decision: CM0601_AUTO_REUSE_PREFLIGHT_CHECKLIST_PREPARED
Date: 2026-05-20

## Purpose

This note defines the operational checklist that should be used before any future automatic reuse of the `CM-0601` approval line.

It does not issue approval by itself.

It does not execute `CM-0601`.

It does not authorize `CM-0595`.

It does not authorize `record_memory`.

Its purpose is narrower:

- make `CM-0602` reusable as an operator checklist instead of only a prose rule
- make `CM-0605` case-3 routing auditable at checklist level
- keep future auto-reuse fail-closed when token material is said to have changed

## Checklist Scope

This checklist applies only to:

```text
CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001
```

through:

```text
docs/CM-0601_CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_PACKET.md
```

No other unit is in scope.

## Preflight Checklist

Mark each item `yes` or `no`.

If any item is `no`, automatic reuse is not allowed.

| check | question | pass condition |
|---|---|---|
| C1 | Does `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md` still control the mainline? | yes |
| C2 | Is the operator-facing controlling state still `RC_NOT_READY_BLOCKED`? | yes |
| C3 | Is the target baseline still exactly `017eda4930c5add4b824c162c46868f75c91ea0f`, or has a later rebound baseline been explicitly recorded in docs/board? | yes |
| C4 | Does same-baseline endpoint/startup evidence still exist through `docs/CM-0592_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_EVIDENCE.md`? | yes |
| C5 | Is the latest controlling rebound execution still `docs/CM-0603_CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_EXECUTION_EVIDENCE.md` or a later equivalent rebound record, with no contradictory write-path drift? | yes |
| C6 | Has an external token-availability change been explicitly asserted outside the packet and does it satisfy `docs/CM-0610_EXTERNAL_TOKEN_MATERIAL_ASSERTION_CONTRACT.md`? | yes |
| C7 | Is the intended automatic outcome still limited to reusing the exact `CM-0601` approval line only? | yes |
| C8 | Are `CM-0595`, `record_memory`, `search_memory`, provider calls, config mutation, startup persistence, public MCP expansion, durable write, and readiness claim all still out of scope for this automatic step? | yes |

## Pass Rule

Automatic reuse of the `CM-0601` line is allowed only if:

```text
C1=yes
C2=yes
C3=yes
C4=yes
C5=yes
C6=yes
C7=yes
C8=yes
```

If all eight pass, the only allowed output is:

```text
AUTO_REUSE_CM0601_LINE_ONLY
```

## Fail-Closed Rule

If any item fails:

- do not auto-issue approval
- do not consume another rebound packet
- keep `RC_NOT_READY_BLOCKED`
- route back to:

```text
NO_AUTO_APPROVAL_ISSUED
```

## Allowed Output Text

If the checklist passes, the only allowed auto-issued text remains the exact CM-0601 line:

```text
授权执行 CM-0601，target baseline = 017eda4930c5add4b824c162c46868f75c91ea0f，只允许 CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001，只允许在 token material 已被独立提供到当前 session 的前提下检查当前 session 内 CODEX_MEMORY_HTTP_TOKEN 是否存在（不得绑定、不得打印、不得持久化），禁止 record_memory / search_memory / marker search / start:http:ensure / health probe / observe:http / .jsonl read / provider / config change / .env edit / watchdog or startup persistence / public MCP expansion / durable write / readiness claim。
```

## Still Forbidden

This checklist never authorizes:

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

## Current State

As of now:

- latest rebound evidence is still token-missing
- no external token-availability change has been proven in current evidence
- the checklist would therefore fail at least `C6`

So the current outcome remains:

```text
NO_AUTO_APPROVAL_ISSUED
RC_NOT_READY_BLOCKED
```

## Next Safe Action

Keep this checklist ready for the first future moment when token material is independently said to have entered the current session.

At that point, first record the external assertion through:

```text
docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md
```

Then run this checklist before any auto-reuse of `CM-0601`.
