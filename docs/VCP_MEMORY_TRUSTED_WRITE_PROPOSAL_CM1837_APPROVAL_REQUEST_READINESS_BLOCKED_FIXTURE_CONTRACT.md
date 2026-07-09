# VCP Memory Trusted-Write-Proposal CM1837 Approval Request Readiness Blocked Fixture Contract

Task id: `M9-TRUSTED-WRITE-PROPOSAL-APPROVAL-REQUEST-READINESS-BLOCKED-FIXTURE-CONTRACT`
Implementation slice: `CM-1837`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1836_EXACT_FIELD_BINDING_FEASIBILITY_CONTRACT_CLOSEOUT_APPROVAL_REQUEST_READINESS_GATE_REVIEW.md`
Evidence type: `source-test`, `fixture-contract`,
`approval-request-readiness-blocked`, `non-authorizing`, `no-runtime`,
`no-proposal`, `no-write`

## Purpose

CM-1837 turns the CM-1836 approval-request readiness gate decision into a pure
local source/test fixture contract.

The helper validates only a non-authorizing approval-request readiness blocked
fixture. Its accepted state is explicitly not ready:
`approval_request_readiness_blocked_missing_exact_authority`. It preserves zero
approval request submission, zero request body preparation, zero approval-line
operation, zero proposal generation/submission, zero accepted real proposal
receipt, zero runtime call, zero memory read/write, zero durable write, zero
provider/API call, zero public MCP expansion, zero M10/M15 unlock, and zero
readiness claim.

## Files Added

| File | Purpose |
|---|---|
| `src/core/VcpMemoryTrustedWriteProposalApprovalRequestReadinessBlockedContract.js` | pure fixture contract helper for non-authorizing approval-request readiness blocked state |
| `tests/vcp-memory-trusted-write-proposal-approval-request-readiness-blocked-contract.test.js` | targeted tests for accept/incomplete/stop/fail-closed behavior |

## Contract Coverage

CM-1837 validates:

- approval-request readiness blocked fixtures are `trusted-write-proposal`,
  non-authorizing, and blocked-only;
- planning evidence includes CM-1834, CM-1835, CM-1836, and the closed local
  exact-field binding feasibility fixture contract;
- local approval-request readiness blocked fixture presence is represented
  without real concrete values or authority;
- approval request readiness remains false;
- exact-field binding readiness remains false;
- real target, transport, client ids, workspace, owner, visibility, proposal
  scope, proposal operation, payload shape, review route, rollback posture,
  budgets, L4 write-intent shield, real proposal receipt audit, approval
  request submission authority, approval-line value, and request body remain
  absent;
- all missing approval-request readiness prerequisites are declared;
- incomplete evidence, missing local fixture state, or missing prerequisite
  declarations compute `approval_request_readiness_incomplete`;
- approval request readiness, concrete values, approval-line value, approval
  grant, proposal generation/submission, proposal acceptance, runtime
  execution, memory read/write, durable write, provider/API, public MCP
  expansion, M9 completion, M10/M15 unlock, or readiness claims route to
  `stop_l4`;
- raw request/proposal/private output, secrets/config/env, target/endpoint
  values, provider payload, approval-line value, request body, and readiness
  fields are rejected without echoing submitted values;
- all side-effect counters must be present and exactly zero.

## Validation

```text
node --check src/core/VcpMemoryTrustedWriteProposalApprovalRequestReadinessBlockedContract.js
node --check tests/vcp-memory-trusted-write-proposal-approval-request-readiness-blocked-contract.test.js
node --test tests/vcp-memory-trusted-write-proposal-approval-request-readiness-blocked-contract.test.js
npm test
```

Result:

```text
targeted tests: pass 8/8
default npm test: pass 3786/3786
```

## Non-Claims

```yaml
cm1837_non_claims:
  fixture_contract_added: true
  non_authorizing_approval_request_readiness_blocked_contract_added: true
  accepted_state: approval_request_readiness_blocked_missing_exact_authority
  approval_request_ready: false
  exact_field_binding_ready: false
  concrete_values_present: false
  approval_request_body_prepared: false
  exact_request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  proposal_generated: false
  proposal_submitted: false
  proposal_receipts_accepted: 0
  runtime_attempt_performed: false
  live_vcp_toolbox_called: false
  mcp_memory_tool_called: false
  memory_read_performed_by_agent: false
  memory_write_performed: false
  durable_write_performed: false
  provider_api_called_by_agent: false
  public_mcp_expansion_performed: false
  m9_proposal_mode_passed: false
  m9_completion_claimed: false
  m10_unlocked: false
  m15_unlocked: false
  readiness_claimed: false
  rc_ready_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
```

## Next Work

The next useful local-safe step is:

`CM-1838 M9 approval request readiness blocked contract closeout / exact-request packet refresh gate review`.

CM-1838 should review CM-1836 and CM-1837 and decide whether the local
approval-request readiness blocked fixture slice can close, while preserving
that concrete exact values, request submission, approval-line generation, real
proposal generation/submission, accepted real proposal receipts, runtime,
memory read/write, durable mutation, provider/API, public MCP expansion,
M10/M15 unlock, and readiness remain blocked unless a later exact boundary
supplies the missing values and authorization.
