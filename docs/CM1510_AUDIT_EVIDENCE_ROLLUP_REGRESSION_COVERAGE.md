# CM-1510 Audit Evidence Rollup Regression Coverage

Status: `COMPLETED_VALIDATED_AUDIT_EVIDENCE_ROLLUP_TEST_ONLY`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Execute the first fixture/doc/test-only coverage for `audit evidence rollup`, proving the rollup accepts only bounded evidence and does not introduce raw audit, broad scan, sensitive echo, write/mutation, public MCP expansion, or readiness overclaim.

## Changed Scope

| File | Change |
|---|---|
| `tests/fixtures/audit-evidence-rollup-cm1510-v1.json` | Added synthetic bounded evidence rollup fixture with docs-only, fixture/test-only, in-process proof, and blocked/deferred units. |
| `tests/audit-evidence-rollup-fixture.test.js` | Added local test-only projection/sanitizer checks for bounded vocabulary, sensitive field stripping, unavailable evidence low disclosure, no side-effect flags, and seven-tool public MCP surface. |

No production source was changed.

## Test Evidence

Command:

```powershell
node --test tests\audit-evidence-rollup-fixture.test.js
```

Result:

```text
tests: 5
pass: 5
fail: 0
```

The test run used only synthetic fixtures and a static import of `TOOL_DEFINITIONS`. It did not execute live client calls, provider/API calls, bearer-token paths, raw scans, effective `record_memory` writes, confirmed mutation, public MCP expansion, release/tag/deploy, or readiness / `RC_READY` claims.

## Coverage Added

| Priority check | Evidence |
|---|---|
| Rollup only uses bounded evidence | Fixture and tests accept only `docs-only`, `fixture/test-only`, `in-process proof`, and `blocked/deferred`; `live-runtime` and `effective write` are excluded. |
| No raw private fields | Adversarial synthetic unit includes memory id, title, content, snippet, file path, and raw audit values; projected rollup omits them. |
| No bearer/token/provider/API-shaped information | Adversarial synthetic unit includes provider payload, API key, bearer token, and authorization values; projected rollup omits them. |
| No write/mutation | Rollup safety flags assert no effective `record_memory`, confirmed mutation, or public MCP expansion. |
| No raw audit / broad memory scan | Rollup safety flags assert `rawAuditScanPerformed=false` and `broadMemoryScanPerformed=false`. |
| Public MCP surface remains seven tools | Test compares `TOOL_DEFINITIONS` names against fixture `expectedPublicTools` and asserts count `7`. |
| Rejected/unavailable evidence low disclosure | Unavailable live-runtime-shaped evidence is projected to `blocked/deferred` with `unavailable_or_deferred`, without echoing sensitive fixture values. |

## Findings

No production source hardening finding is opened by CM-1510.

This coverage proves the selected rollup fixture and local projection rules can summarize bounded evidence without accepting raw/private/provider/token fields, side-effect claims, or readiness promotion. It does not implement a production rollup service.

## Non-Actions

CM-1510 does not:

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
CM-1511 audit evidence rollup closeout and next backlog selection
```

CM-1511 should close `audit evidence rollup` only as non-RC fixture/test/doc hardening and select the next backlog item without closing RC blockers or claiming readiness.
