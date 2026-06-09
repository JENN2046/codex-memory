# CM-1528 No-Token Low-Disclosure Hardening Source Audit

## Scope

Task: independent changed-scope source audit of CM-1527.

Reviewed commit:

```text
d0f0b6252da0e7e13945654ded7d7d2d7ab382a2 fix: harden no-token public response low disclosure
```

This audit is read-only over source/test diffs plus regression evidence. It does not execute live proof and does not close any RC blocker.

## Reviewed Files

- `src/adapters/codex-mcp/http.js`
- `src/core/MemoryOverviewService.js`
- `src/core/PhaseF1LiveClientNoWriteEvidenceRunner.js`
- `tests/mcp-http.test.js`
- `tests/http-no-token-search-rejection.test.js`
- `tests/memory-overview-no-token-selected-projection.test.js`
- `tests/phase-f1-live-client-no-write-runner.test.js`
- `docs/CM1527_NO_TOKEN_PUBLIC_LOW_DISCLOSURE_HARDENING.md`

## Findings

### Runtime No-Token Rejection Shape

Decision: `PASS_WITHIN_CHANGED_SCOPE`.

CM-1527 removes token/search/mutation-specific no-token rejection codes from the active HTTP JSON-RPC rejection path and replaces them with `PUBLIC_REQUEST_BLOCKED`, `status: rejected`, and `reason: blocked`.

The non-JSON-RPC no-token POST guard also returns generic `Forbidden`, `status: rejected`, and `reason: blocked` without origin/content-type/token detail.

### Public `memory_overview` Projection Metadata

Decision: `PASS_WITHIN_CHANGED_SCOPE`.

CM-1527 changes public selected `memory_overview` access metadata to `mode: public_selected_overview`, `selectedProjectionVersion: 2`, `publicAccess: blocked`, and `detailFieldsReturned: false`.

The public selected projection removes raw/lifecycle-shaped access keys such as `bearerTokenRequiredForFullOverview` and `rawMemoryFieldsReturned`, and the no-token shadow sync projection no longer exposes `writeManifest.lifecycle`.

### Public MCP Surface

Decision: `PASS_FOR_RUNTIME_TEST_COVERAGE`.

Runtime HTTP MCP regression coverage still asserts `tools/list` returns exactly seven public tools. CM-1527 does not add or remove public tools.

### Evidence Runner Residual Gap

Decision: `FINDING_RECORDED_NO_BLOCKER_CLOSE`.

`src/core/PhaseF1LiveClientNoWriteEvidenceRunner.js` still defines `REQUIRED_PUBLIC_TOOLS` as the older three-tool set:

```text
memory_overview
record_memory
search_memory
```

This is not a runtime public surface expansion and was not introduced by CM-1527, but the file is in the changed scope because CM-1527 updated its no-token projection/rejection expectations. A future live proof retry using this runner may still reject the current seven-tool public surface unless the runner is separately hardened.

Recommended next route: separate source hardening for the evidence runner public tool contract before any proof retry that depends on this runner.

## Regression Evidence Reviewed

Required targeted command:

```powershell
node --test tests\memory-overview-no-token-selected-projection.test.js tests\mcp-http.test.js tests\http-no-token-search-rejection.test.js tests\phase-f1-live-client-no-write-runner.test.js
```

Expected evidence:

- no-token `record_memory` rejection remains low-disclosure
- no-token `search_memory` rejection remains low-disclosure
- no-token POST rejection paths remain low-disclosure
- public selected `memory_overview` does not return raw/private/lifecycle/mutation/client-boundary metadata
- runtime HTTP MCP `tools/list` remains seven tools

## Boundary Confirmation

This audit did not:

- execute live client calls
- call provider/API
- use bearer-token material
- perform raw memory/audit/broad scan
- execute effective `record_memory`
- execute confirmed mutation
- expand public MCP tools
- release/tag/deploy
- claim readiness or `RC_READY`
- close the live client evidence blocker
- close the effective write reliability blocker

## Decision

`CM1527_SOURCE_AUDIT_COMPLETED_WITH_RESIDUAL_EVIDENCE_RUNNER_FINDING`.

Live client evidence blocker remains `STILL_OPEN`.

Effective write reliability blocker remains `OPEN / DEFERRED`.

Overall status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`; `RC_READY` remains `BLOCKED`.
