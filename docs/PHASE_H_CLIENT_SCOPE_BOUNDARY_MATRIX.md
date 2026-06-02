# Phase H Client Scope Boundary Matrix

更新时间：2026-06-02

Task: `CM-1399`

Validation: `CMV-1517`

Status: `COMPLETED_VALIDATED`

Decision: `PHASE_H_CLIENT_SCOPE_BOUNDARY_MATRIX_NOT_RC_READY`

## Purpose

This document converts the CM-1398 Phase H inventory into a boundary matrix and selects the first local no-apply source/test slice.

It is a docs-only planning artifact. It is not live client evidence, a real-memory scan, a durable mutation, public MCP expansion, release, cutover, runtime readiness, or `RC_READY`.

## Scope

Allowed:

- classify current client-scope boundaries from source/test/docs evidence
- select one no-apply source/test slice for the next local task
- keep public MCP tools frozen
- keep `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

Blocked:

- `record_memory`, `search_memory`, or `memory_overview` execution
- live Codex or Claude client operation
- bearer-token use
- real memory scan/export/import
- raw `.jsonl`, raw audit, vector, candidate-cache, or store scan
- durable memory or audit write
- provider/model call
- public MCP tool/schema expansion
- client config, watchdog, startup, dependency, push, PR, release, deploy, merge, cutover, or readiness action

## Boundary Matrix

| Boundary | Evidence Source | Classification | Phase H Decision |
|---|---|---|---|
| Public MCP tool surface | `src/core/constants.js`; CM-1398 inventory | `implemented` | Public tools remain exactly `record_memory`, `search_memory`, and `memory_overview`; Phase H does not add client/governance tools. |
| `record_memory` scope schema | `src/core/constants.js`; `tests/vcp-memory-object-model-fixture.test.js`; `tests/vcp-memory-object-round-trip.test.js` | `implemented` | Scope fields are schema-visible, but real scoped write proof remains exact-approval-required. |
| `search_memory` scope schema | `src/core/constants.js`; `tests/scope-filter.test.js`; `tests/scoped-recall-evidence-probe-cli.test.js` | `implemented` | Caller-supplied scope is candidate filtering, not caller identity authority. Live cross-client recall proof remains exact-approval-required. |
| Execution-context normalization | `src/core/ExecutionContextResolver.js`; `docs/CM1276_EXECUTION_CONTEXT_SCOPE_FALLBACK_NORMALIZATION.md` | `implemented` | Camel/snake aliases normalize locally; request execution context remains the preferred authority surface. |
| Write effective scope | `src/core/MemoryWriteService.js`; `docs/CM1267_CONTEXT_DERIVED_WRITE_SCOPE.md`; `docs/CM1274_WRITE_SCOPE_CONTEXT_PRECEDENCE_REGRESSION.md` | `implemented` | Writes are execution-context-first locally; successful real write evidence remains exact-approval-required. |
| Soft-read private boundary | `src/app.js`; `docs/CM1264_SOFT_READ_POLICY_CLIENT_IDENTITY_HARDENING.md`; `docs/CM1270_NO_CONTEXT_READ_IDENTITY_FAIL_CLOSED.md`; `docs/CM1271_PRIVATE_READ_MISSING_OWNER_FAIL_CLOSED.md` | `implemented` | Caller-supplied `scope.client_id` cannot authenticate private read identity; this is the strongest first no-apply consistency candidate. |
| Lifecycle scope read boundary | `src/app.js`; `src/core/MemoryLifecycleScopeGovernanceContract.js`; `tests/memory-lifecycle-scope-runtime-integration.test.js`; `docs/CM1265_LIFECYCLE_SCOPE_CLIENT_IDENTITY_HARDENING.md`; `docs/CM1266_LIFECYCLE_SCOPE_EXECUTION_CONTEXT_AUTHORITY.md` | `implemented` | Lifecycle current scope comes from request execution context; caller scope remains candidate filtering only. |
| Governance scope suppression | `src/core/DeferredGovernanceScopePollutionReadPolicy.js`; `src/core/GovernanceLifecycleReadPolicyIsolation.js`; related tests | `no-apply` | Existing explicit-input summaries keep suppressed/private material blocked from normal recall proof output without raw content exposure. |
| HTTP / stdio default context | `src/adapters/codex-mcp/http.js`; `src/adapters/codex-mcp/stdio.js`; `tests/mcp-http.test.js`; `tests/http-no-token-search-rejection.test.js` | `implemented` | Server defaults and no-token split are locally covered; live authenticated client refresh remains exact-approval-required. |
| Client acceptance evidence | `docs/P21_CLIENT_INTEGRATION_INVENTORY.md`; `docs/P21_CLIENT_INTEGRATION_HARDENING_CLOSEOUT_REVIEW.md`; `docs/CM1263_CLIENT_ACCEPTANCE_RUNTIME_FACT_REBASE.md` | `runtime-prep` | Historical connected-client evidence is stale-sensitive and cannot be reused as current runtime readiness. |
| Broad client-scope store completeness scan | CM-1398 blocked follow-ups | `blocked` | Broad real store scan/export/import requires exact approval and is not part of Phase H no-apply work. |
| Public client-scope MCP expansion | project public tool freeze | `blocked` | Public MCP tools stay frozen unless a separate approved phase explicitly changes the contract. |

## First No-Apply Slice Selection

Selected next local-safe slice:

```text
CM-1400 Phase H client-scope private read consistency source/test
```

Recommended implementation scope:

- add a pure explicit-input helper, tentatively `src/core/ClientScopePrivateReadConsistency.js`
- add targeted tests, tentatively `tests/client-scope-private-read-consistency.test.js`
- summarize soft-read and lifecycle private-read authority into one no-apply consistency surface
- use only explicit candidates and sanitized metadata
- do not call app/runtime/MCP tools, providers, clients, bearer-token paths, or real stores

Expected assertions for CM-1400:

- request execution context is the current client identity authority
- caller-supplied `scope.client_id` remains a candidate filter only
- same-client private candidates are accepted
- cross-client private candidates are suppressed
- ownerless private candidates fail closed
- missing request identity fails closed for private candidates
- lifecycle current scope is derived from execution context, not caller scope
- suppressed output exposes sanitized metadata only, not raw content, snippets, file paths, or source paths
- no durable mutation, provider call, runtime apply, public MCP expansion, readiness claim, or reliability claim is asserted

## Deferred Or Blocked Work

The following are not selected for the first no-apply slice:

- live Codex / Claude client refresh
- bearer-token MCP initialize/tools-list refresh
- real cross-client private recall proof
- real scoped write proof
- broad store completeness scan
- public MCP client-scope expansion
- client config, watchdog, startup, cutover, or readiness work

## Validation

Run for `CM-1399`:

```powershell
git diff --check
node .\scripts\validate_current_facts_drift.js
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Result

Phase H now has a local boundary matrix and a selected first no-apply source/test slice.

The result is planning evidence only. It does not create runtime readiness, client acceptance freshness, broad recall reliability, broad write reliability, production readiness, or `RC_READY`.
