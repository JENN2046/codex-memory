# CM-1507 Audit Readonly Refinement Regression Coverage

Status: `COMPLETED_VALIDATED_AUDIT_READONLY_REFINEMENT_TEST_ONLY`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Execute the first fixture/test-only hardening round for `audit readonly refinements`, proving `audit_memory` remains readonly, bounded, low-disclosure, and no-mutation under accepted and rejected paths.

## Changed Scope

| File | Change |
|---|---|
| `tests/audit-memory-readonly-service.test.js` | Added CM-1507 synthetic fixture coverage for raw private/provider/token/API-shaped input fields and rejected-path low-disclosure / no-mutation behavior. |
| `tests/audit-memory-public-contract-preflight.test.js` | Added CM-1507 public rejection low-disclosure coverage and bound public tool count to exactly seven tools. |

No production source was changed.

## Test Evidence

Command:

```powershell
node --test tests\audit-memory-readonly-service.test.js tests\audit-memory-public-contract-preflight.test.js
```

Result:

```text
tests: 14
pass: 14
fail: 0
```

The test run used synthetic fixtures and in-process application/server construction only. It did not execute a live client call, provider/API call, bearer-token path, raw scan, effective `record_memory` write, confirmed mutation, public MCP expansion, release/tag/deploy, or readiness / `RC_READY` claim.

## Coverage Added

| Priority check | Evidence |
|---|---|
| `audit_memory` does not trigger write/mutation | CM-1507 rejected-path test asserts `policy.durableMutationPerformed=false`; accepted-path fixture keeps provider call count `0`; existing DB-like mutation test remains covered. |
| Audit output excludes raw private fields | CM-1507 accepted-path fixture injects memory id, title, content, snippet, file path, and raw audit values, then asserts none appear in serialized bounded output. |
| Audit output excludes bearer/token/provider/API information | CM-1507 accepted-path fixture injects provider URL/payload, API key, bearer token, and authorization values, then asserts none appear in output. |
| Evidence summary uses bounded projection | CM-1507 accepted-path test asserts selected projection, false raw/token/provider/id/path/content flags, and sanitized finding shape only. |
| Public MCP surface remains seven tools | CM-1507 public contract test asserts public tool count is exactly `7` and matches `PUBLIC_MCP_TOOL_NAMES`. |
| Rejected path remains low-disclosure | CM-1507 service rejected-path test asserts no findings, false raw/token/provider/mutation flags, and no private fixture leaks; MCP rejection test asserts rejected error does not echo sensitive fixture values. |

## Findings

No production source hardening finding is opened by CM-1507.

The regression coverage proved the existing readonly bounded projection strips unknown raw/private/provider/token-shaped decision fields from accepted service output and keeps invalid public MCP requests low-disclosure at the schema boundary.

## Non-Actions

CM-1507 does not:

- claim readiness or `RC_READY`
- close live client evidence RC blocker
- close effective write reliability RC blocker
- execute a live client call
- call provider/API
- use bearer-token material
- perform raw scan
- execute an effective `record_memory` write
- execute confirmed mutation
- expand public MCP tools
- release/tag/deploy
- modify production source

## Next Route

Recommended next safe route:

```text
CM-1508 audit readonly refinement regression closeout and next backlog selection
```

CM-1508 should close this non-RC backlog item as test-only coverage and select the next backlog item without closing RC blockers or claiming readiness.
