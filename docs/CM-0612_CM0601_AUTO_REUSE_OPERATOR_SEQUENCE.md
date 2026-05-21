# CM-0612 CM0601 Auto-Reuse Operator Sequence

Status: RUNBOOK_ONLY_NOT_EXECUTED
Decision: CM0601_AUTO_REUSE_OPERATOR_SEQUENCE_PREPARED
Date: 2026-05-20

## Purpose

This note turns the current CM-0601 auto-authorization preparation into one fail-closed operator sequence.

It does not issue approval by itself.

It does not execute `CM-0601`.

It does not authorize `CM-0595`.

It does not authorize `record_memory`.

Its purpose is narrower:

- give the future operator one ordered path instead of many scattered notes
- make the current automatic-authorization ceiling operationally clear
- ensure token-present progress still stays bounded and auditable

## Scope

This runbook applies only to:

```text
CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001
```

through:

```text
docs/CM-0601_CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_PACKET.md
```

No other unit is in scope.

## Controlling Inputs

This sequence is subordinate to:

- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- `docs/CM-0602_CURRENT_SESSION_TOKEN_REBOUND_AUTO_AUTHORIZATION_RULE.md`
- `docs/CM-0605_AUTHORIZED_WRITE_PATH_AUTO_AUTHORIZATION_DECISION_TABLE.md`
- `docs/CM-0610_EXTERNAL_TOKEN_MATERIAL_ASSERTION_CONTRACT.md`
- `docs/CM-0608_CM0601_AUTO_REUSE_PREFLIGHT_CHECKLIST.md`
- `docs/CM-0601_CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_PACKET.md`
- `docs/CM-0609_CM0601_AUTO_REUSE_EXECUTION_EVIDENCE_TEMPLATE.md`
- `docs/CM-0615_CM0605_ROUTING_OUTCOME_RECORD_TEMPLATE.md`

If any of those disagree with this note, the controlling notes above win.

## Ordered Sequence

Use this order only:

1. Record the external token-material assertion with `CM-0611`.
2. Evaluate that assertion against `CM-0610`.
3. If and only if the assertion is accepted, evaluate `CM-0608`.
4. If and only if `CM-0608` passes, the only allowed auto-issued approval text is the exact `CM-0601` line.
5. If that exact line is auto-issued, record the issuance with `CM-0614`.
6. If `CM-0601` later executes, record the execution outcome with `CM-0609`.
7. Route the result through `CM-0605`.
8. Record the routed outcome with `CM-0615`.
9. If token is present, treat `CM-0604` / `CM-0616` / `CM-0606` / `CM-0607` as the next governance layer before any future `CM-0595` discussion.

No step may be skipped.

## Step Detail

### Step 1

Fill:

```text
docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md
```

If no concrete assertion record exists, stop:

```text
NO_AUTO_APPROVAL_ISSUED
```

### Step 2

Evaluate the filled `CM-0611` record against:

```text
docs/CM-0610_EXTERNAL_TOKEN_MATERIAL_ASSERTION_CONTRACT.md
```

If the contract verdict is rejected or insufficient, stop:

```text
NO_AUTO_APPROVAL_ISSUED
RC_NOT_READY_BLOCKED
```

### Step 3

Only after an accepted assertion record exists, evaluate:

```text
docs/CM-0608_CM0601_AUTO_REUSE_PREFLIGHT_CHECKLIST.md
```

If any item is `no`, stop:

```text
NO_AUTO_APPROVAL_ISSUED
RC_NOT_READY_BLOCKED
```

### Step 4

If `CM-0608` fully passes, the only allowed auto-issued text is:

```text
授权执行 CM-0601，target baseline = 017eda4930c5add4b824c162c46868f75c91ea0f，只允许 CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001，只允许在 token material 已被独立提供到当前 session 的前提下检查当前 session 内 CODEX_MEMORY_HTTP_TOKEN 是否存在（不得绑定、不得打印、不得持久化），禁止 record_memory / search_memory / marker search / start:http:ensure / health probe / observe:http / .jsonl read / provider / config change / .env edit / watchdog or startup persistence / public MCP expansion / durable write / readiness claim。
```

No other auto-issued text is allowed.

### Step 5

If that exact line is actually auto-issued, record the issuance with:

```text
docs/CM-0614_CM0601_AUTO_REUSE_APPROVAL_ISSUANCE_RECORD_TEMPLATE.md
```

### Step 6

If a future `CM-0601` execution actually happens, record it with:

```text
docs/CM-0609_CM0601_AUTO_REUSE_EXECUTION_EVIDENCE_TEMPLATE.md
```

Do not substitute freeform prose for that evidence record.

### Step 7

After `CM-0601` execution evidence exists, route the result through:

```text
docs/CM-0605_AUTHORIZED_WRITE_PATH_AUTO_AUTHORIZATION_DECISION_TABLE.md
```

Allowed current outcomes remain:

- `NO_AUTO_APPROVAL_ISSUED`
- `AUTO_REUSE_CM0601_LINE_ONLY`
- `ESCALATE_FOR_FUTURE_WIDENING_REVIEW`

### Step 8

After routing, record the outcome with:

```text
docs/CM-0615_CM0605_ROUTING_OUTCOME_RECORD_TEMPLATE.md
```

### Step 9

If token presence is later proven on the same baseline, do not jump to `CM-0595`.

Instead:

- check `CM-0604`
- record the widening-review result with `CM-0616`
- use `CM-0606` as the bridge
- record any later adoption decision with `CM-0607`

## Still Forbidden

This sequence never auto-authorizes:

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
- config or `.env` edit
- watchdog/startup persistence
- public MCP expansion
- durable write
- readiness claim

## Current State

As of now:

- latest rebound runtime evidence is still token-missing
- no accepted external token-material assertion record exists
- the sequence would therefore stop at step 1 or step 2

So the current outcome remains:

```text
NO_AUTO_APPROVAL_ISSUED
RC_NOT_READY_BLOCKED
```

## Next Safe Action

Keep this sequence ready for the first future moment when token material is independently said to have entered the current session.

At that point, use this order exactly:

```text
CM-0611 -> CM-0610 -> CM-0608 -> CM-0601 -> CM-0614 -> CM-0609 -> CM-0605 -> CM-0615
```
