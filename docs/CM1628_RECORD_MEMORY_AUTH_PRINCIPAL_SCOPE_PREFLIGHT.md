# CM-1628 Record Memory Auth Principal Scope Preflight

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_RECORD_MEMORY_AUTH_PRINCIPAL_SCOPE_PREFLIGHT_NO_SOURCE_AUTH_CHANGE`

## Scope

This slice records the audit follow-up for P2-2.

Current reality:

- HTTP bearer auth is the network boundary.
- `ExecutionContextResolver.resolve(...)` can parse principal and scope fields such as `agentId`, `clientId`, `projectId`, and `workspaceId`.
- `ExecutionContextResolver.isWritableByCodex(...)` currently grants write authority by comparing `agentAlias` to `allowedAgentAlias`.
- Strong principal/scope authorization for production is not implemented.

This slice intentionally does not change the write authorization model. It adds a small regression test to lock the current boundary before any later design/source hardening.

## Evidence

Added:

- `tests/execution-context-resolver.test.js`

The test confirms:

- principal and scope fields are normalized and available in the resolved execution context
- current write authorization is alias-only
- a matching `agentAlias` can pass even when `agentId`, `clientId`, `projectId`, or `workspaceId` are unexpected
- a non-matching `agentAlias` fails even when other identity/scope fields look Codex-like

Validation:

```text
node --test tests\execution-context-resolver.test.js
```

Result:

```text
2/2 passed
```

## Future Hardening Boundary

Production/cutover hardening should be a separate design/source phase. Candidate requirements:

- mandatory bearer for non-test HTTP
- explicit `client_id` / `agent_id` binding
- scope allowlist for write operations
- write intent proof and idempotency evidence
- per-client audit principal
- fail-closed behavior for missing or mismatched principal/scope fields

## Non-Claims

This slice did not implement stronger principal/scope auth.

This slice did not run live MCP traffic, provider/API calls, bearer-token flows, real memory reads/writes, raw store scans, broad memory scans, dependency changes, config/watchdog/startup changes, public MCP expansion, release/tag/deploy, production readiness, release readiness, cutover readiness, or complete V8.
