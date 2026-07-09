# VCP Memory Trusted-Write-Proposal CM1833 Exact Request Preparation Boundary Fixture Contract

Task id: `M9-TRUSTED-WRITE-PROPOSAL-EXACT-REQUEST-PREPARATION-BOUNDARY-FIXTURE-CONTRACT`
Implementation slice: `CM-1833`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1832_EXACT_REQUEST_PACKET_READINESS_CONTRACT_CLOSEOUT_REQUEST_PREPARATION_GATE_REVIEW.md`
Evidence type: `source-test`, `fixture-contract`, `request-preparation-boundary`,
`non-authorizing`, `no-runtime`, `no-proposal`, `no-write`

## Purpose

CM-1833 turns the CM-1832 request-preparation gate decision into a pure local
source/test fixture contract.

The helper validates only a non-authorizing request-preparation boundary
fixture. Its accepted state is explicitly not ready:
`request_preparation_blocked_missing_exact_boundary`. It preserves zero request
submission, zero approval-line operation, zero proposal generation/submission,
zero accepted real proposal receipt, zero runtime call, zero memory read/write,
zero durable write, zero provider/API call, zero public MCP expansion, zero
M10/M15 unlock, and zero readiness claim.

## Files Added

| File | Purpose |
|---|---|
| `src/core/VcpMemoryTrustedWriteProposalExactRequestPreparationBoundaryContract.js` | pure fixture contract helper for non-authorizing exact request preparation boundary state |
| `tests/vcp-memory-trusted-write-proposal-exact-request-preparation-boundary-contract.test.js` | targeted tests for accept/incomplete/stop/fail-closed behavior |

## Contract Coverage

CM-1833 validates:

- request-preparation boundary fixtures are `trusted-write-proposal`,
  non-authorizing, and request-preparation-only;
- planning evidence includes CM-1830, CM-1831, CM-1832, and the closed local
  packet-readiness fixture contract;
- local request-preparation fixture presence is represented without a real
  exact request packet;
- exact request submission readiness remains false;
- exact target, transport, client ids, workspace, owner, visibility, proposal
  scope, proposal operation, payload shape, review route, rollback posture,
  budgets, L4 write-intent shield, real proposal receipt audit, approval
  request submission authority, and approval-line value remain unbound;
- all missing exact boundary fields are declared;
- incomplete evidence, missing local fixture state, or missing exact-boundary
  declarations compute `request_preparation_incomplete`;
- exact request packet presence, exact request submission readiness, exact
  binding, approval-line value, approval grant, proposal generation/submission,
  proposal acceptance, runtime execution, memory read/write, durable write,
  provider/API, public MCP expansion, M9 completion, M10/M15 unlock, or
  readiness claims route to `stop_l4`;
- raw request/proposal/private output, secrets/config/env, provider payload,
  approval-line value, request body, and readiness fields are rejected without
  echoing submitted values;
- all side-effect counters must be present and exactly zero.

## Validation

```text
node --check src/core/VcpMemoryTrustedWriteProposalExactRequestPreparationBoundaryContract.js
node --check tests/vcp-memory-trusted-write-proposal-exact-request-preparation-boundary-contract.test.js
node --test tests/vcp-memory-trusted-write-proposal-exact-request-preparation-boundary-contract.test.js
npm test
```

Result:

```text
targeted tests: 8
targeted pass: 8
default npm test: 3770/3770
fail: 0
```

## Re-Review

Final diff review found no actionable issue in the changed scope. The helper is
pure local source/test code and does not call filesystem read APIs, child
processes, network/runtime, providers, MCP tools, memory tools, or durable
stores.

The accepted decision remains not-ready. CM-1833 does not create a real exact
request packet, request submission, approval line, proposal, runtime call, or
write path.

## Non-Claims

```yaml
cm1833_non_claims:
  fixture_contract_added: true
  non_authorizing_request_preparation_boundary_contract_added: true
  accepted_state: request_preparation_blocked_missing_exact_boundary
  exact_request_submission_ready: false
  exact_request_packet_present: false
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

`CM-1834 M9 exact request preparation boundary contract closeout / exact-field binding gate review`.

CM-1834 should review CM-1832 and CM-1833 and decide whether the local
request-preparation boundary fixture slice can close, while preserving that
exact request submission, approval-line generation, real proposal
generation/submission, accepted real proposal receipts, runtime, memory
read/write, durable mutation, provider/API, public MCP expansion, M10/M15
unlock, and readiness remain blocked unless a later exact boundary supplies the
missing fields.
