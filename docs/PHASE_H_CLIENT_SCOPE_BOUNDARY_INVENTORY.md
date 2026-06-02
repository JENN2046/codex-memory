# Phase H Client Scope Boundary Inventory

更新时间：2026-06-02

Task: `CM-1398`

Validation: `CMV-1516`

Status: `COMPLETED_VALIDATED`

Decision: `PHASE_H_CLIENT_SCOPE_BOUNDARY_INVENTORY_NOT_RC_READY`

## Purpose

This document starts the post-Phase-G normal queue by inventorying current Codex / Claude client-scope boundaries against repository reality.

It is a local docs/source/test inventory. It is not a runtime client refresh, real-memory scan, durable mutation, public MCP expansion, release, cutover, or readiness claim.

## Scope

Allowed:

- inspect current client/scope source, tests, docs, and board evidence
- map current implementation surfaces to Phase H client-scope boundaries
- record local inventory status
- keep `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

Blocked:

- `record_memory`, `search_memory`, or `memory_overview` execution
- live Codex or Claude client operation
- current-session bearer-token use
- real memory scan/export/import
- raw `.jsonl`, raw audit, vector, candidate-cache, or store scan
- durable memory or audit write
- provider/model call
- public MCP tool/schema expansion
- config, watchdog, startup, dependency, push, PR, release, deploy, merge, or readiness action

## Current Client Scope Model Reality

`CLIENT_SCOPE_MODEL.md` is an older model document. Source reality has moved beyond that early model in several areas:

- public `record_memory` schema includes `project_id`, `workspace_id`, `client_id`, `visibility`, `task_id`, `conversation_id`, and `retention_policy`
- public `search_memory` schema includes optional `scope` filters for `project_id`, `workspace_id`, `client_id`, `visibility`, and `strict`
- `memory_overview` keeps HTTP no-token selected projection separate from bearer-token full overview
- `ExecutionContextResolver` normalizes camelCase and snake_case execution-context scope aliases
- write paths derive effective scope from execution context before payload-supplied scope
- soft read policy and lifecycle scope governance read policy use request execution context as current identity authority
- private cross-client reads and mutations have explicit fail-closed tests

## Boundary Inventory

| Boundary | Current source/test evidence | Current status | Phase H decision |
|---|---|---|---|
| Public MCP tool surface | `src/core/constants.js` | implemented and frozen | Public tools remain exactly `record_memory`, `search_memory`, and `memory_overview`; no Phase H governance/client tool is added. |
| Record scope schema | `src/core/constants.js`; `tests/vcp-memory-object-model-fixture.test.js`; `tests/vcp-memory-object-round-trip.test.js` | implemented for schema/object model | Scope fields are available on `record_memory`; runtime reliability is not inferred from schema presence. |
| Search scope schema | `src/core/constants.js`; `tests/scope-filter.test.js`; `tests/scoped-recall-evidence-probe-cli.test.js` | implemented for caller-supplied filters | Scope filters exist, but broad recall reliability and live cross-client behavior remain separate evidence problems. |
| Execution-context normalization | `src/core/ExecutionContextResolver.js`; `docs/CM1276_EXECUTION_CONTEXT_SCOPE_FALLBACK_NORMALIZATION.md`; related tests | implemented | Camel/snake aliases normalize locally; execution context remains the preferred authority surface. |
| Write effective scope | `src/core/MemoryWriteService.js`; `docs/CM1267_CONTEXT_DERIVED_WRITE_SCOPE.md`; `docs/CM1274_WRITE_SCOPE_CONTEXT_PRECEDENCE_REGRESSION.md` | implemented and tested locally | Write scope is execution-context-first; successful real writes still require exact approval. |
| Soft read private boundary | `src/app.js`; `docs/CM1264_SOFT_READ_POLICY_CLIENT_IDENTITY_HARDENING.md`; `docs/CM1270_NO_CONTEXT_READ_IDENTITY_FAIL_CLOSED.md`; `docs/CM1271_PRIVATE_READ_MISSING_OWNER_FAIL_CLOSED.md` | implemented and tested locally | Caller-supplied scope cannot authenticate client identity; missing request identity fails closed for private data. |
| Lifecycle scope read boundary | `src/app.js`; `src/core/MemoryLifecycleScopeGovernanceContract.js`; `tests/memory-lifecycle-scope-runtime-integration.test.js`; `docs/CM1265_LIFECYCLE_SCOPE_CLIENT_IDENTITY_HARDENING.md`; `docs/CM1266_LIFECYCLE_SCOPE_EXECUTION_CONTEXT_AUTHORITY.md` | implemented and tested locally | Lifecycle current scope comes from execution context, not caller-supplied scope filters. |
| Governance scope suppression | `src/core/DeferredGovernanceScopePollutionReadPolicy.js`; `src/core/GovernanceLifecycleReadPolicyIsolation.js`; `tests/deferred-governance-scope-pollution-read-policy.test.js`; `tests/governance-lifecycle-read-policy-isolation.test.js` | no-apply / explicit-input proof | Suppressed records stay blocked from normal recall surfaces without raw private content exposure. |
| HTTP / stdio default context | `src/adapters/codex-mcp/http.js`; `src/adapters/codex-mcp/stdio.js`; `tests/mcp-http.test.js`; `tests/http-no-token-search-rejection.test.js` | implemented for server defaults and no-token split | Live authenticated client behavior still requires exact scoped approval before execution. |
| Client acceptance evidence | `docs/P21_CLIENT_INTEGRATION_INVENTORY.md`; `docs/P21_CLIENT_INTEGRATION_HARDENING_CLOSEOUT_REVIEW.md`; `docs/CM1263_CLIENT_ACCEPTANCE_RUNTIME_FACT_REBASE.md` | historical / stale-sensitive | Past client acceptance evidence cannot be treated as current connected-client readiness. |

## Gaps And Blocked Follow-Ups

The following remain outside CM-1398:

- live Codex / Claude client refresh
- current-session bearer-token use
- cross-client private recall proof against real stores
- real client-scoped write proof
- broad store scan for client-scope completeness
- public MCP governance/client-scope tool expansion
- client config, watchdog, startup, or token-path changes
- RC, production, release, cutover, broad recall reliability, or broad write reliability claims

## Next Safe Slice

Recommended next local-safe task:

```text
CM-1399 Phase H client-scope boundary matrix and first no-apply slice selection
```

Recommended scope:

- classify each client-scope boundary as `implemented`, `fixture-only`, `dry-run-only`, `runtime-prep`, `exact-approval-required`, or `blocked`
- choose a first no-apply source/test slice from one of:
  - client-scope execution-context authority summary
  - cross-client private read-policy consistency summary
  - search scope filter plus lifecycle governance consistency summary
- keep public MCP tools frozen
- avoid live clients, bearer tokens, real memory scans, provider calls, durable writes, and readiness claims

## Validation

Run for `CM-1398`:

```powershell
git diff --check
node .\scripts\validate_current_facts_drift.js
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Result

Phase H is locally opened with a current client-scope boundary inventory.

The result is a planning and inventory surface, not live client evidence or runtime readiness.
