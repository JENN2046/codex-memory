# CM-1274 Write Scope Context Precedence Regression

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1274 adds a local test-only regression for `record_memory` write scope attribution.

The regression proves the write path persists trusted `requestContext.executionContext` scope before conflicting public payload scope fields. This protects Codex/Claude attribution from caller-supplied `project_id`, `workspace_id`, `client_id`, `task_id`, `conversation_id`, `visibility`, or `retention_policy` drift.

## Changed Behavior

No runtime source behavior changed.

The new test in `tests/memory-write-preflight-runtime-integration.test.js` creates a write request whose payload scope conflicts with the harness runtime scope, then asserts the persisted shadow record, diary write, and audit write use the trusted execution-context scope.

## Validation

- `node --check tests\memory-write-preflight-runtime-integration.test.js`
- `node --test tests\memory-write-preflight-runtime-integration.test.js tests\phase-a-services.test.js tests\policy-read-preflight.test.js` passed `26/26`.
- `npm test` passed `2794/2794`.

## Boundaries

- No provider call.
- No MCP external call.
- No real-memory scan.
- No durable memory or audit write outside test fixtures.
- No config, watchdog, or startup change.
- No public MCP tool expansion.
- No remote action.
- No readiness or reliability claim.
