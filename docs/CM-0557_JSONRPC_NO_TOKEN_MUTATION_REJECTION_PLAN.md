# CM-0557 JSON-RPC No-Token Mutation Rejection Plan

Status: CM_0557_PLAN_READY_FOR_COMMIT
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-20

## Purpose

This plan starts the CM-0557 to CM-0559 local repair runway for the currently exposed memory write/recall reliability blockers.

It does not claim memory write reliability, memory recall reliability, runtime readiness, production readiness, or RC readiness.

## Current Blockers

### Blocker 1: No-Token Mutation Rejection Shape

Current exposed behavior:

```text
record_memory no-token HTTP rejection may return HTTP 403 with a plain { error, message } body.
```

Risk:

```text
MCP clients may expect a JSON-RPC message and fail while deserializing the plain rejection body as JsonRpcMessage.
```

Repair direction:

```text
Keep HTTP status 403.
Return a JSON-RPC compatible error envelope.
Do not weaken the no-token mutation block.
Do not expose raw token, raw request, env, path, or secret-bearing values.
Keep public MCP tools unchanged.
```

Preferred error shape:

```json
{
  "jsonrpc": "2.0",
  "id": "<request id or null>",
  "error": {
    "code": -32001,
    "message": "Forbidden",
    "data": {
      "code": "NO_TOKEN_MUTATION_REJECTED",
      "reason": "No-token HTTP MCP requests cannot call mutation tools."
    }
  }
}
```

### Blocker 2: Search Timeout

Current exposed behavior:

```text
search_memory timed out in a prior client interaction.
```

This is an independent issue line.

CM-0559 must analyze only the read-only code path. It must not call real `search_memory`, read `.jsonl`, read real memory content, scan broad real memory stores, start HTTP, call providers, or modify recall/search runtime.

## Current State Vocabulary

The controlling status remains:

```text
RC_PRECHECK_002_PASSED_NOT_RC_READY
RC_NOT_READY_BLOCKED
```

Forbidden claims:

```text
memory write reliable
memory recall reliable
runtime ready
RC ready
production ready
```

## Phase Boundaries

### CM-0557 Plan

Allowed files:

```text
docs/CM-0557_JSONRPC_NO_TOKEN_MUTATION_REJECTION_PLAN.md
STATUS.md
MAINTENANCE_BACKLOG.md
docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md
.agent_board/*
```

Validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

### CM-0558 Targeted Implementation

Allowed files:

```text
src/adapters/codex-mcp/http.js
tests/mcp-http.test.js
```

Required behavior:

- no-token `tools/call` mutation rejection keeps HTTP `403`
- response body is a JSON-RPC error envelope
- request `id` is preserved, or `null` when absent
- no-token mutation tools remain blocked
- bearer-token authorized `record_memory` remains covered by existing test behavior
- public MCP schema/tools remain unchanged

Validation:

```powershell
node --check .\src\adapters\codex-mcp\http.js
node --check .\tests\mcp-http.test.js
node --test .\tests\mcp-http.test.js
git diff --check
```

### CM-0559 Search Timeout Read-Only Analysis

Allowed files:

```text
docs/CM-0559_SEARCH_MEMORY_TIMEOUT_READONLY_ANALYSIS.md
STATUS.md
MAINTENANCE_BACKLOG.md
docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md
.agent_board/*
```

Allowed read-only inspection:

```powershell
git status -sb
git log --oneline --decorate -n 20
Select-String -Path .\src\app.js,.\src\recall\*.js,.\src\storage\*.js -Pattern "search_memory|searchMemory|listChunks|CandidateGenerator|rerank|timeout|cache|audit" -CaseSensitive:$false
```

The analysis must identify:

- app tool dispatch timeout risks
- recall pipeline timeout risks
- `shadowStore.listChunks` timeout risks
- vector query timeout risks
- candidate cache timeout or write-like side effects
- optional rerank timeout risks
- whether CM-0560 targeted runtime fix is needed

## Hard Stops

This runway does not authorize:

- push, tag, release, deploy, or cutover
- provider/model calls
- real memory scan
- durable memory write
- durable audit write
- true `record_memory` call outside allowed targeted tests
- true `search_memory` call
- reading `.jsonl` audit or real memory content
- migration/import/export/backup/restore apply
- public MCP expansion
- config switch, watchdog change, or startup change
- package manifest or lockfile change
- readiness claim

If any of those are required, the result must be:

```text
BLOCKED_A5_OR_EXPLICIT_APPROVAL_REQUIRED
```

## Result

```text
CM_0557_PLAN_READY_FOR_COMMIT
RC_NOT_READY_BLOCKED
```

## Next Safe Action

Next safe action: implement only the CM-0558 targeted JSON-RPC rejection envelope patch after this plan is locally committed. 中文解释：下一步只适合改 HTTP no-token mutation rejection 的返回形状和对应测试，不能调用真实记忆、扫描真实 store、切配置、push 或声明 ready。
