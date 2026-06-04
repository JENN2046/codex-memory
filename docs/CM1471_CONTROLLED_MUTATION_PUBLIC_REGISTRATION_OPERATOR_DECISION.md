# CM-1471 Controlled Mutation Public Registration Operator Decision

Date: 2026-06-04

## Purpose

This document records the operator decision for whether to authorize future guarded public MCP registration of:

- `validate_memory`
- `tombstone_memory`
- `supersede_memory`

This document records approval only.

This document does not implement registration.

This document does not register public MCP tools.

This document does not execute real mutation.

Project status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.

## Decision

```text
APPROVE_CONTROLLED_MUTATION_PUBLIC_REGISTRATION
```

Decision result:

```text
APPROVED_FOR_CM1472_GUARDED_IMPLEMENTATION_ONLY
```

## Approval Basis

```yaml
approval_id: CM1471-CONTROLLED-MUTATION-PUBLIC-REGISTRATION-2026-06-04
basis_packet: docs/CM1469_CONTROLLED_MUTATION_PUBLIC_REGISTRATION_APPROVAL_PACKET.md
readiness_review: docs/CM1470_CONTROLLED_MUTATION_REGISTRATION_APPROVAL_READINESS_REVIEW.md
baseline_commit: c2e6e1bc84af29674f41440f7d898b37dee16fa8
allowed_tools:
  - validate_memory
  - tombstone_memory
  - supersede_memory
allowed_public_surface:
  - TOOL_DEFINITIONS registration for the three allowed tools only
  - app.callTool dispatch for the three allowed tools only
  - MCP tools/list and tools/call validation tests
forbidden:
  - update_memory
  - forget_memory
  - real mutation
  - raw audit access
  - raw store access
  - provider/API calls
  - bearer token use
  - readiness or RC_READY claim
  - release/tag/deploy
```

## Scope Of Approval

The approval permits a future CM-1472 guarded implementation to register only:

```text
validate_memory
tombstone_memory
supersede_memory
```

The approval does not authorize confirmed mutation execution.

The approval does not authorize live memory tool calls.

The approval does not authorize provider/API calls.

The approval does not authorize bearer token use.

The approval does not authorize raw audit or raw store access.

The approval does not authorize readiness, release, deploy, tag, or `RC_READY` claims.

## Required CM-1472 Validation

CM-1472 must validate at minimum:

```powershell
node --test tests\controlled-mutation-public-contract-preflight.test.js
npm test
npm run test:hardening
npm run gate:mainline:strict
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

CM-1472 must also include public MCP contract tests proving:

- `TOOL_DEFINITIONS` expands only by the three approved tools
- `tools/list` exposes only the approved new tools
- `app.callTool(...)` dispatches only to bounded controlled mutation paths
- dry-run/default paths do not mutate temp DB state
- confirm paths are blocked without later exact mutation approval
- outputs remain low-disclosure
- provider/API and bearer paths are not used
- readiness and `RC_READY` remain false

## Boundary Receipt

CM-1471 is a docs/status/board decision record only.

No public MCP expansion occurred in CM-1471.

No `validate_memory`, `tombstone_memory`, or `supersede_memory` registration occurred in CM-1471.

No real mutation, raw scan, provider/API call, bearer-token use, readiness claim, `RC_READY` claim, release/tag/deploy, remote action, or push occurred in CM-1471.
