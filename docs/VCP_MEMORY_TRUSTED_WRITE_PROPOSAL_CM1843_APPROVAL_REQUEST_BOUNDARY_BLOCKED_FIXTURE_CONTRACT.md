# VCP Memory Trusted-Write-Proposal CM1843 Approval Request Boundary Blocked Fixture Contract

Task id: `M9-TRUSTED-WRITE-PROPOSAL-APPROVAL-REQUEST-BOUNDARY-BLOCKED-FIXTURE-CONTRACT`
Implementation slice: `CM-1843`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1842_APPROVAL_REQUEST_BOUNDARY_BLOCKED_PREFLIGHT.md`
Evidence type: `source-test`, `fixture-contract`,
`approval-request-boundary-blocked`, `non-authorizing`, `no-runtime`,
`no-request-body`, `no-approval-line`, `no-proposal`, `no-write`

## Purpose

CM-1843 turns the CM-1842 approval-request boundary blocked preflight into a
pure local source/test fixture contract.

The helper validates only a non-authorizing approval-request boundary blocked
fixture. Its accepted state is explicitly not ready:
`approval_request_boundary_blocked_missing_exact_request_body_authority`. It
preserves zero approval-request template creation, zero request body
preparation, zero request submission, zero approval-line operation, zero
proposal generation/submission, zero accepted real proposal receipt, zero
runtime call, zero memory read/write, zero durable write, zero provider/API
call, zero public MCP expansion, zero M10/M15 unlock, and zero readiness claim.

## Files Added

| File | Purpose |
|---|---|
| `src/core/VcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract.js` | pure fixture contract helper for non-authorizing approval-request boundary blocked state |
| `tests/vcp-memory-trusted-write-proposal-approval-request-boundary-blocked-contract.test.js` | targeted tests for accept/incomplete/stop/fail-closed behavior |

## Contract Coverage

CM-1843 validates:

- approval-request boundary blocked fixtures are `trusted-write-proposal`,
  non-authorizing, and blocked-only;
- planning evidence includes accepted M8 workflow evidence and the CM-1837
  through CM-1842 local preparation chain;
- the CM-1840 exact request packet refresh blocked fixture is closed only as
  planning evidence, not as a ready request packet;
- local approval-request boundary blocked fixture presence is represented
  without real concrete values, request body, approval line, submission
  authority, or runtime authority;
- approval-request boundary readiness, approval-request readiness, exact
  request packet readiness, exact request packet presence, concrete values,
  request template, request body, request submission, approval line, proposal
  execution, runtime, write, provider/API, public MCP expansion, M10/M15, and
  readiness remain false;
- all missing boundary fields are declared, including request body, request
  template, approval-line value, exact request packet, and boundary authority;
- incomplete evidence, missing local fixture state, or missing boundary
  declarations compute `approval_request_boundary_incomplete`;
- any request body preparation, request submission, approval-line generation,
  approval grant, proposal generation/submission, proposal acceptance, runtime
  execution, memory read/write, durable write, provider/API, public MCP
  expansion, M9 completion, M10/M15 unlock, or readiness claim routes to
  `stop_l4`;
- raw request/proposal/private output, secrets/config/env, target/endpoint
  values, provider payload, approval-line value, request template, request body,
  and readiness fields are rejected without echoing submitted values;
- all side-effect counters must be present and exactly zero.

## Validation

```text
node --check src/core/VcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract.js
node --check tests/vcp-memory-trusted-write-proposal-approval-request-boundary-blocked-contract.test.js
node --test tests/vcp-memory-trusted-write-proposal-approval-request-boundary-blocked-contract.test.js
npm test
```

Result:

```text
targeted tests: pass 8/8
default npm test: pass 3802/3802
```

## Non-Claims

```yaml
cm1843_non_claims:
  fixture_contract_added: true
  non_authorizing_approval_request_boundary_blocked_contract_added: true
  accepted_state: approval_request_boundary_blocked_missing_exact_request_body_authority
  approval_request_boundary_ready: false
  approval_request_ready: false
  exact_request_packet_ready: false
  exact_request_packet_present: false
  concrete_values_present: false
  approval_request_template_created: false
  approval_request_body_prepared: false
  approval_request_body_present: false
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

`CM-1844 M9 approval request boundary blocked contract closeout / proposal mode gate review`.

CM-1844 should review CM-1842 and CM-1843 and decide whether the local
approval-request boundary blocked fixture slice can close, while preserving
that concrete exact values, request body, request submission, approval-line
generation, real proposal generation/submission, accepted real proposal
receipts, runtime, memory read/write, durable mutation, provider/API, public
MCP expansion, M10/M15 unlock, and readiness remain blocked unless a later
exact boundary supplies the missing values and authorization.
