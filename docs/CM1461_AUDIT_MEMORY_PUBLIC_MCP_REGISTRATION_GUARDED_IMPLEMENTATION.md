# CM-1461 audit_memory Public MCP Registration Guarded Implementation

Date: 2026-06-04

Status: `COMPLETED_VALIDATED_PUBLIC_MCP_READONLY_BOUNDED_REGISTRATION`

## Scope

CM-1461 registers `audit_memory` as a public MCP tool after exact operator approval.

The implementation is intentionally narrow:

```text
TOOL_DEFINITIONS includes audit_memory
tools/list exposes audit_memory
app.callTool('audit_memory') dispatches only to AuditMemoryReadonlyService.run(...)
```

## Authorized Boundary

Only readonly bounded `audit_memory` registration was authorized.

CM-1461 does not authorize or execute:

```text
mutation tools
raw audit access
raw store access
provider/API calls
bearer-token use
real DB migration apply
durable memory mutation
readiness claim
RC_READY claim
push
```

## Public Contract

Allowed input remains bounded:

```text
audit_family = write | recall | governance | all
window = 1..200
include_raw = false only
scope = bounded optional selector fields only
```

Mutation-like input keys are rejected by the public schema boundary through `additionalProperties=false`.

Allowed output is the low-disclosure selected projection from `src/core/AuditMemoryReadonlyService.js`:

```text
access.mode = audit_memory_readonly_bounded
access.selectedProjection = true
summary requested family/window/counts
policy lifecycle/scope/redaction booleans
redacted aggregate findings
```

Forbidden output remains:

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

## Validation Coverage

CM-1461 adds and updates tests proving:

```text
TOOL_DEFINITIONS exposes only record_memory/search_memory/memory_overview/audit_memory
MCP tools/list exposes audit_memory with bounded schema
app.callTool('audit_memory') returns readonly bounded projection
MCP tools/call audit_memory returns low-disclosure structuredContent
include_raw=true is rejected
mutation-like keys are rejected
providerCalled=false
durableMutationPerformed=false
rawAuditScanPerformed=false
readinessClaimed=false
rcReadyClaimed=false
```

## Rollback Plan

Rollback is a local source/test/docs revert:

```text
remove audit_memory from TOOL_DEFINITIONS
remove app.callTool('audit_memory') dispatch
restore MCP instruction text if needed
restore public-tool frozen tests to the previous three-tool contract
revert CM-1461 board/status/docs changes
```

No real memory data, DB migration, provider state, bearer token, raw audit/store content, remote branch, or readiness state is part of this implementation.

## Remaining Gates

Project status remains:

```text
NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED
```

Future work still requires separate exact approval for live bounded no-mutation proof, real DB migration apply, mutation tools, provider/API calls, bearer-token use, raw store/audit access, push, release, or readiness claims.
