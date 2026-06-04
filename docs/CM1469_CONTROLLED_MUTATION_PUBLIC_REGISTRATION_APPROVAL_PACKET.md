# CM-1469 Controlled Mutation Public Registration Approval Packet

Date: 2026-06-04

## Purpose

This packet prepares an exact approval shape for a future guarded public MCP registration of controlled mutation tools:

- `validate_memory`
- `tombstone_memory`
- `supersede_memory`

This packet does not authorize registration by itself.

This packet does not register public MCP tools.

This packet does not execute real mutation.

Project status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.

## Current Public MCP Surface

The current public MCP tools remain:

```text
record_memory
search_memory
memory_overview
audit_memory
```

The controlled mutation candidates must remain absent from `TOOL_DEFINITIONS`, absent from `tools/list`, and rejected by `app.callTool(...)` until a future exact approval explicitly authorizes guarded implementation.

## Registration Candidates

Future registration may include only these candidates:

```text
validate_memory
tombstone_memory
supersede_memory
```

No `update_memory`, `forget_memory`, raw-audit tool, raw-store tool, provider tool, migration apply tool, or readiness tool is included in this packet.

## Schema Exposure Checklist

Before future registration, implementation must prove:

- each candidate has `inputSchema.type=object`
- each candidate has `additionalProperties=false`
- `reason`, `evidence`, actor, source, and memory id fields have bounded lengths
- `dry_run` and `confirm` are explicit booleans
- mutation-like aliases outside the exact schema fail closed
- unknown candidate names fail closed
- public `tools/list` changes are limited to the three approved candidates
- existing public tools keep their current schemas and descriptions unless separately approved

## Low-Disclosure Output Contract

Future public outputs may return only bounded decision fields such as:

```text
accepted
decision
tool
dryRun
mutated
fromStatus
toStatus
reasonCode
policy
approvalRequired
auditCommitted
rollbackHint
```

Future public outputs must never return:

```text
memory content
title
snippet
raw memory row
raw audit row
raw JSONL row
filesystem path
provider payload
token material
secret-like material
embedding fingerprint
raw SQLite dump
```

## Dry-Run And Confirm Gate Policy

Future registration must keep the tools fail-closed by default:

- no `confirm=true` means dry-run / planning only
- no exact approval means dry-run / planning only
- missing actor or source fields must reject
- missing reason or evidence must reject
- dry-run output must have `mutated=false`
- confirmed mutation must require an exact operator approval packet
- confirmed mutation must create selected audit evidence
- confirmed mutation must not silently overwrite memory
- confirmed mutation must not imply readiness

## Future Exact Approval Shape

Future implementation may proceed only after an operator provides an approval with this shape:

```yaml
approval_id: CM1469-CONTROLLED-MUTATION-PUBLIC-REGISTRATION-<date>
allowed_tools:
  - validate_memory
  - tombstone_memory
  - supersede_memory
allowed_source:
  - src/core/ControlledMutationPublicContractPreflight.js
  - existing lifecycle services only
allowed_public_surface:
  - TOOL_DEFINITIONS registration for the three allowed tools
  - app.callTool dispatch for the three allowed tools
  - MCP tools/list and tools/call validation tests
forbidden:
  - update_memory
  - forget_memory
  - raw audit access
  - raw store access
  - provider/API calls
  - bearer token use
  - real mutation during registration tests
  - readiness or RC_READY claim
operator_acknowledges:
  - public MCP expansion is a Red-boundary action
  - only readonly/dry-run behavior is allowed by default
  - confirmed mutation requires a later exact mutation approval
  - registration alone does not imply release readiness
```

## Tests Required For Future Registration

Future guarded implementation must add or update tests proving:

- `TOOL_DEFINITIONS` includes exactly the current public tools plus the three approved candidates
- `tools/list` exposes exactly the approved new tools and no extra tools
- `app.callTool(...)` dispatches each candidate to the intended bounded service path
- `tools/call` rejects unknown keys and oversized fields
- dry-run calls do not mutate temp DB state
- confirm path is blocked without exact approval
- low-disclosure output forbids raw memory/audit/path/provider/token/content/title/snippet fields
- public registration does not call provider/API
- public registration does not use bearer token
- public registration does not claim readiness or `RC_READY`

## Rollback Plan

If future registration causes contract drift:

1. revert the registration commit
2. verify `TOOL_DEFINITIONS` returns to `record_memory`, `search_memory`, `memory_overview`, and `audit_memory`
3. verify `tools/list` returns to the pre-registration public surface
4. rerun targeted MCP contract tests
5. rerun `npm test`, `npm run test:hardening`, and `npm run gate:mainline:strict`
6. record a rollback receipt
7. do not claim readiness

## Explicit Non-Claims

CM-1469 does not register public MCP tools.

CM-1469 does not authorize real mutation.

CM-1469 does not approve raw audit or raw store access.

CM-1469 does not approve provider/API calls.

CM-1469 does not approve bearer token use.

CM-1469 does not approve release, deploy, tag, or push.

CM-1469 does not imply release readiness.

CM-1469 does not imply `RC_READY`.

## Boundary Receipt

This packet is docs/status/board only.

No public MCP expansion occurred.

No `validate_memory`, `tombstone_memory`, or `supersede_memory` registration occurred.

No real mutation, raw scan, provider/API call, bearer-token use, readiness claim, `RC_READY` claim, release/tag/deploy, remote action, or push occurred.
