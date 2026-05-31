# CM-1300 Proof Memory Policy Alias Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for proof-memory write policy normalization.

`applyProofMemoryWritePolicy(...)` now uses first non-empty normalized values across normalized and payload aliases:

- `visibility`
- `visibility_policy`
- `retentionPolicy`
- `retention_policy`

`isExplicitProofMemoryPayload(...)` also recognizes payload `visibility_policy=internal_proof`.

This prevents direct helper calls or future object-model style callers from losing proof-memory markers or ordinary visibility/retention values when blank normalized fields mask valid payload aliases.

## Validation

- `node --check src\core\ProofMemoryPolicy.js`
- `node --check tests\proof-memory-policy.test.js`
- `node --test tests\proof-memory-policy.test.js tests\memory-write-preflight-runtime-integration.test.js tests\proof-memory-retention-tombstone-plan.test.js tests\proof-memory-retention-tombstone-store-backed-dry-run-preview.test.js` passed `27/27`
- `npm test` passed `2822/2822`

## Boundaries

No public MCP schema expansion, live recall, provider call, external MCP call, real-memory scan, durable memory/audit write outside test fixtures, config/watchdog/startup change, remote action, readiness claim, or reliability claim.
