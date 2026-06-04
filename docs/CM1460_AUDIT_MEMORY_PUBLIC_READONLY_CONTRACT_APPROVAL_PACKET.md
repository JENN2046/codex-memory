# CM-1460 audit_memory Public Readonly Contract Approval Packet

Date: 2026-06-04

Status: `COMPLETED_VALIDATED_SOURCE_TESTS_PUBLIC_REGISTRATION_NOT_EXECUTED`

## Purpose

CM-1460 implements the local readonly contract surface for future `audit_memory` public MCP exposure without registering the tool.

The goal is explainability first: provide a bounded answer shape for why memory-related audit decisions are visible, hidden, or suppressed before any real DB migration apply or public mutation surface is widened.

## What Would Be Exposed

Future `audit_memory` public registration may expose only a bounded selected projection:

```text
access.mode = audit_memory_readonly_bounded
summary.requestedFamily
summary.window
summary.visibleDecisionCount
summary.hiddenDecisionCount
summary.suppressedDecisionCount
policy lifecycle/scope/redaction booleans
redacted aggregate findings with family, decision, reasonCode, lifecyclePolicy, scopePolicy
```

The local service implementation is `src/core/AuditMemoryReadonlyService.js`.

## What Will Never Be Exposed

The bounded contract forbids returning:

```text
memoryId
title
content
snippet
filePath
relativePath
rawText
raw JSONL row
raw audit row
provider URL
embedding fingerprint
token-like value
```

`include_raw=true`, unknown `audit_family`, out-of-bounds `window`, and mutation-like input keys fail closed.

## Why Readonly

`audit_memory` is intended to explain policy decisions. It must not mutate memory, audit logs, SQLite rows, JSONL files, vector indexes, candidate caches, config, startup/watchdog surfaces, or public MCP tool definitions.

The service has no default live audit source. Tests inject explicit aggregate-safe decisions only, so CM-1460 does not scan raw audit stores or real SQLite.

## Test Coverage

CM-1460 adds:

```text
tests/audit-memory-readonly-service.test.js
tests/audit-memory-public-contract-preflight.test.js
```

Coverage includes:

```text
include_raw=true rejected
mutation-like keys rejected
unknown audit_family rejected
window out of bounds rejected
bounded output contains no forbidden raw/id/content/path keys
service does not mutate DB-like input
service does not call provider fetch
public MCP tools remain record_memory/search_memory/memory_overview
app.callTool('audit_memory') remains Unknown tool
```

`src/cli/run-release-gate-tests.js` now includes these tests in `test:parity` and `test:release-candidate`.

## Rollback Plan

Before public registration, rollback is a local source/test revert:

```text
revert src/core/AuditMemoryReadonlyService.js
revert tests/audit-memory-readonly-service.test.js
revert tests/audit-memory-public-contract-preflight.test.js
revert src/cli/run-release-gate-tests.js CM-1460 test-list additions
revert this packet and board/status updates
```

No durable data migration, memory mutation, public MCP registration, or remote state change is part of CM-1460.

## Public MCP Expansion Risk

`audit_memory` is still not in `TOOL_DEFINITIONS`, not in `tools/list`, and not accepted by `app.callTool`.

Public MCP expansion remains a hard boundary. Registration requires a separate exact approval phase and must stop with:

```text
PUBLIC_MCP_EXPANSION_APPROVAL_REQUIRED
```

## Operator Approval Required

Future public registration requires explicit operator approval for:

```text
adding audit_memory to TOOL_DEFINITIONS
adding app.callTool dispatch
adding tools/list coverage proving bounded schema only
running public MCP registration validation
```

CM-1460 does not grant that approval.

## Boundary

CM-1460 does not execute real DB migration apply, real durable memory mutation, live `record_memory`, live `search_memory`, bearer-token use, provider/API call, raw audit scan, raw SQLite broad scan, raw JSONL dump, public MCP expansion, remote action, readiness claim, or `RC_READY` claim.
