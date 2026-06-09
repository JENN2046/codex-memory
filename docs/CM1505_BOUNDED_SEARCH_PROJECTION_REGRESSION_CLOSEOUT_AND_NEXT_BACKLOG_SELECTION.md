# CM-1505 Bounded Search Projection Regression Closeout And Next Backlog Selection

Date: 2026-06-09

Status: `COMPLETED_VALIDATED_BOUNDED_SEARCH_PROJECTION_BACKLOG_CLOSED_NO_READY_CLAIM`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Close out CM-1504 as a non-RC backlog hardening item and select the next non-RC backlog item.

Closed non-RC backlog item:

```text
bounded search projection regression
```

Selected next non-RC backlog item:

```text
audit readonly refinements
```

This closeout does not close any RC blocker and does not claim readiness / `RC_READY`.

## CM-1504 Evidence Audit

| Evidence | Result |
|---|---|
| Target file | `tests/search-memory-response-sanitizer.test.js` |
| Evidence doc | `docs/CM1504_BOUNDED_SEARCH_PROJECTION_REGRESSION_FIXTURE_TEST_EVIDENCE.md` |
| Test command | `node --test tests\search-memory-response-sanitizer.test.js` |
| Test result | `12/12` passed |
| Production source change | none |
| Live/runtime proof | none |
| Public MCP expansion | none |

CM-1504 added fixture-only regression coverage for lifecycle / mutation status leakage, client boundary field leakage, and public MCP surface count. The selected non-RC backlog item is complete for test-only backlog hardening scope.

## Backlog Status Update

| Backlog item | Status | Notes |
|---|---|---|
| Bounded `search_memory` projection regression matrix | `COMPLETED_TEST_ONLY_BACKLOG_HARDENING` | Fixture-only regression coverage added and targeted test passed. Not RC readiness evidence. |
| `audit_memory` readonly bounded policy refinements | `SELECTED_NEXT` | Recommended next non-RC backlog item. Must remain readonly, bounded, low-disclosure, and no raw audit scan. |
| Audit evidence rollup / admin-review ergonomics | `BACKLOG_REMAINING` | May follow after audit readonly refinements. |
| Search quality / recall reliability evaluation | `BACKLOG_REMAINING` | Requires fixture/temp-db or future exact bounded proof; no broad reliability claim. |
| Effective-scope and write-preflight policy polish | `BACKLOG_REMAINING` | Must not execute effective write unless separately exact-approved. |
| Governance evidence vocabulary and closeout grouping | `BACKLOG_REMAINING` | Docs/source-test only unless separately scoped. |

## Next Backlog Selection

Selected:

```text
CM-1506 audit readonly refinements fixture/test preflight
```

Acceptance criteria for the next item:

- `audit_memory` remains readonly
- public output remains bounded, low-disclosure, and aggregate
- raw audit and mutation-like keys remain rejected
- no memory ids, titles, snippets, paths, raw rows, provider material, or token material are returned
- no public MCP surface expansion occurs
- no raw audit scan occurs

Recommended validation for CM-1506:

```powershell
node --test tests\audit-memory-readonly-service.test.js
node --test tests\audit-memory-public-contract-preflight.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Explicit Non-Claims

CM-1505 does not:

- claim readiness or `RC_READY`
- close the live client evidence RC blocker
- close the effective write reliability RC blocker
- execute live client calls
- call provider/API
- use bearer-token material
- perform raw scan
- perform an effective `record_memory` write
- execute confirmed mutation
- expand public MCP tools
- release, tag, or deploy

## Validation Matrix

| Validation | Scope | Required for CM-1505 |
|---|---|---|
| `CURRENT_FACTS.json` parse | machine snapshot integrity | yes |
| `git diff --check` | whitespace / patch hygiene | yes |
| `scripts\validate-local.ps1 -Area docs` | docs governance and board consistency | yes |
| staged diff check | commit hygiene | yes |
| changed-scope review | no readiness claim, RC blocker closure, live call, write, provider/API, bearer token, raw scan, confirmed mutation, public expansion, or release/tag/deploy | yes |
