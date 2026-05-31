# CM-1275 Soft Read Context Client Precedence Regression

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1275 adds a local test-only regression for soft-read private visibility identity inference.

The regression proves `requestContext.executionContext.clientId` remains authoritative before a conflicting `agentAlias` when soft-read policy decides private-record visibility. This keeps Codex/Claude client identity binding explicit even when agent metadata and client metadata disagree.

## Changed Behavior

No runtime source behavior changed.

The new test in `tests/policy-read-preflight.test.js` writes Claude-private and Codex-private records, then searches with `clientId=claude` and `agentAlias=Codex`. The result must include only the Claude-private record.

## Validation

- `node --check tests\policy-read-preflight.test.js`
- `node --test tests\policy-read-preflight.test.js tests\memory-lifecycle-scope-runtime-integration.test.js tests\phase-a-services.test.js` passed `23/23`.
- `npm test` passed `2795/2795`.

## Boundaries

- No runtime source behavior change.
- No provider call.
- No MCP external call.
- No real-memory scan.
- No durable memory or audit write outside test fixtures.
- No config, watchdog, or startup change.
- No public MCP tool expansion.
- No remote action.
- No readiness or reliability claim.
