# CM-1325 Governance Loop Alias Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1325 hardens the review-only governance runtime approval/audit loop.

`GovernanceRuntimeApprovalAuditLoop` now normalizes camelCase and snake_case aliases for:

- loop identity fields such as `loopId/loop_id`, `actionId/action_id`, and audit event ids
- scope fields such as `projectRef/project_ref/project_id`, `clientRef/client_ref/client_id`, and `visibility/visibility_policy`
- review and approval packet ids and boolean gates
- audit refs such as `correlationId/correlation_id`, `appendOnly/append_only`, and raw-audit safety flags

This preserves the existing fail-closed execution boundary while allowing object-model, audit-log, or fixture-style snake_case governance evidence to bind to the canonical camelCase review loop contract.

## Validation

- `node --check src\core\GovernanceRuntimeApprovalAuditLoop.js`
- `node --check tests\governance-runtime-approval-audit-loop.test.js`
- `node --test tests\governance-runtime-approval-audit-loop.test.js tests\validation-aggregator-governance-runtime-loop-gap-contract-helper.test.js tests\v1-1-hardening-validation-aggregator.test.js tests\v1-1-hardening-staged-closeout.test.js` passed `33/33`
- `npm test` passed `2853/2853`

Diff, docs, ledger, and changed-scope validation are part of commit closeout.

## Safety

No live recall/write execution, governed action execution, real memory/store/jsonl read, raw audit read, provider call, external MCP call, durable memory/audit write, public MCP expansion, config/watchdog/startup change, remote action, readiness claim, or reliability claim occurred.

`NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` remains unchanged.
