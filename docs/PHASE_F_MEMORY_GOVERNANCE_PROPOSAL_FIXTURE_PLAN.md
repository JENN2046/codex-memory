# Phase F Memory Governance Proposal Fixture Plan

Status: `FIXTURE_PLAN_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `b44b636`

## Purpose

Define a synthetic fixture/test contract for the Phase F memory governance proposal model. This fixture lane exists to validate shape, state boundaries, approval semantics, and forbidden overclaims before any runtime implementation or durable memory/audit write is considered.

## Allowed Future Work

A future fixture/test-only slice may add:

```text
tests/fixtures/phase-f-memory-governance-proposal-v1.json
tests/phase-f-memory-governance-proposal-fixture.test.js
```

The test should only parse synthetic JSON and assert contract shape. It must not import runtime modules, execute governance reports, read real stores, append audit logs, mutate memory, call providers, expand MCP tools, or claim readiness.

## Proposed Fixture Shape

```json
{
  "version": "phase-f-memory-governance-proposal-v1",
  "decision": "NOT_READY_BLOCKED",
  "evidenceClass": "synthetic_fixture_only",
  "publicMcpTools": ["record_memory", "search_memory", "memory_overview"],
  "durableMemoryWritten": false,
  "durableAuditWritten": false,
  "realMemoryStoreRead": false,
  "providerCalled": false,
  "objects": [],
  "states": [],
  "approvalRequirements": [],
  "forbiddenDefaults": []
}
```

## Required Objects

The fixture should include synthetic examples for:

| Object | Required Default | Apply Boundary |
|---|---|---|
| `memory_proposal` | `DRAFT_NOT_APPROVED` | exact approval before durable write |
| `supersession_record` | `REVIEW_READY_NOT_APPROVED` | exact approval before applied supersession |
| `tombstone_record` | `REVIEW_READY_NOT_APPROVED` | exact approval before durable tombstone |
| `forget_request` | `FORGET_REQUESTED` | exact approval before destructive deletion or durable suppression |
| `governance_review` | `DRAFT_NOT_APPROVED` | review text alone is not authority |

## Required States

The fixture should list exactly:

```text
DRAFT_NOT_APPROVED
REVIEW_READY_NOT_APPROVED
APPROVED_FOR_EXACT_ACTION
APPLIED_WITH_AUDIT
REJECTED
SUPERSEDED
TOMBSTONED
FORGET_REQUESTED
FORGET_APPLIED_WITH_AUDIT
```

The test should ensure apply states cannot appear as defaults unless an explicit approval object exists in the same synthetic scenario.

## Approval Requirements

Synthetic approval requirements should include:

- exact target object id
- exact action
- exact scope
- exact allowed command path or explicit no-command marker
- durable write yes/no
- real store read yes/no
- destructive deletion yes/no
- audit requirement
- forbidden side effects

## Forbidden Defaults

The fixture should reject default claims or states implying:

- approval already granted
- durable memory already written
- durable audit already written
- destructive deletion already applied
- public MCP expansion approved
- provider call executed
- real memory store read
- runtime readiness
- RC readiness

## Validation for Future Implementation

Expected commands after fixture/test files are added:

```powershell
node --test tests\phase-f-memory-governance-proposal-fixture.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

A readiness/authorization scan should treat forbidden terms in fixture negative cases as expected only when they are inside explicit `forbiddenDefaults` or `mustNotClaim` arrays.

## Next Task

```text
CM-0539 Phase F memory governance proposal synthetic fixture contract
```

Expected output:

- add synthetic fixture
- add structure-only test
- update docs/board evidence
- keep result `NOT_READY_BLOCKED`

## Result

This plan is local-safe and docs-only. It prepares fixture/test validation for memory governance semantics without crossing durable memory, audit, runtime, public MCP, provider, push, or cutover boundaries.
