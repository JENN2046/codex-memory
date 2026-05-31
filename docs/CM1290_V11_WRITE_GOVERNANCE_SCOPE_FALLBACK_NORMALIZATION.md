# CM-1290 V1.1 Write-Governance Scope Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1290 hardens the v1.1 write-governance proof-chain so `targetScope` can be supplied with ref-style, camel-case, or SQLite/VCP-style snake_case fields without losing exact-scope checks.

Affected local proof-chain surfaces:

- `CM1090` write-governance preflight
- `CM1091` approval packet boundary
- `CM1092` operator receipt/audit preview
- `CM1093` post-write verification plan

## Change

Each proof-chain scope normalizer now takes the first non-empty normalized value from these aliases:

- `projectRef/project_id/projectId/project`
- `workspaceRef/workspace_id/workspaceId/workspace`
- `clientRef/client_id/clientId/client`
- `agentRef/agent_id/agentId/agent`
- `taskRef/task_id/taskId/task`
- `visibility/visibility_policy`

The proof-chain still requires exact scope, exact payload hash, exact current head binding, validation command coverage, and no side-effect counters. The change only removes false blockers caused by blank ref/camel aliases masking valid snake_case fields.

## Validation

- `node --check` for changed v1.1 write-governance source and tests
- `node --test tests\v1-1-write-governance-preflight.test.js tests\v1-1-write-governance-approval-packet-boundary.test.js tests\v1-1-write-governance-operator-receipt-audit-preview.test.js tests\v1-1-write-governance-post-write-verification-plan.test.js` passed `25/25`
- `npm test` passed `2817/2817`

## Boundaries

- No governed write execution.
- No `record_memory` call.
- No durable memory or audit write.
- No public MCP tool or schema expansion.
- No provider call.
- No external MCP call.
- No broad real-memory scan.
- No config, watchdog, or startup change.
- No remote action.
- No runtime readiness, RC readiness, write reliability, recall reliability, or rollback readiness claim.
