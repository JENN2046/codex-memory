# VCP Memory Trusted-Write-Proposal CM1831 Exact Request Packet-Readiness Fixture Contract

Task id: `M9-TRUSTED-WRITE-PROPOSAL-EXACT-REQUEST-PACKET-READINESS-FIXTURE-CONTRACT`
Implementation slice: `CM-1831`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1830_EXACT_REQUEST_FIELD_CANDIDATE_CONTRACT_CLOSEOUT_PACKET_READINESS_GATE_REVIEW.md`
Evidence type: `source-test`, `fixture-contract`, `packet-readiness`,
`non-authorizing`, `no-runtime`, `no-proposal`, `no-write`

## Purpose

CM-1831 turns the CM-1830 packet-readiness gate decision into a pure local
source/test fixture contract.

The helper validates only a non-authorizing packet-readiness fixture. Its
accepted state is explicitly not ready: `packet_readiness_blocked_missing_exact_fields`.
It preserves zero request submission, zero approval-line operation, zero
proposal generation/submission, zero accepted real proposal receipt, zero
runtime call, zero memory read/write, zero durable write, zero provider/API
call, zero public MCP expansion, zero M10/M15 unlock, and zero readiness
claim.

## Files Added

| File | Purpose |
|---|---|
| `src/core/VcpMemoryTrustedWriteProposalExactRequestPacketReadinessContract.js` | pure fixture contract helper for non-authorizing exact request packet-readiness state |
| `tests/vcp-memory-trusted-write-proposal-exact-request-packet-readiness-contract.test.js` | targeted tests for accept/incomplete/stop/fail-closed behavior |

## Contract Coverage

CM-1831 validates:

- packet-readiness fixtures are `trusted-write-proposal`,
  non-authorizing, and packet-readiness-only;
- planning evidence includes CM-1828, CM-1829, CM-1830, and the closed local
  request-field candidate slice;
- local packet-readiness fixture presence is represented without a real exact
  request packet;
- exact request packet readiness remains false;
- exact target, transport, client ids, workspace, owner, visibility, proposal
  scope, proposal operation, payload shape, review route, rollback posture,
  budgets, L4 write-intent shield, real proposal receipt audit, approval
  request submission authority, and approval-line value remain unbound;
- all missing exact fields are declared;
- incomplete evidence, missing local fixture state, or missing exact-field
  declarations compute `packet_readiness_incomplete`;
- exact packet readiness, real exact packet presence, exact binding, request
  submission, approval-line value, approval grant, proposal
  generation/submission, proposal acceptance, runtime execution, memory
  read/write, durable write, provider/API, public MCP expansion, M9
  completion, M10/M15 unlock, or readiness claims route to `stop_l4`;
- raw request/proposal/private output, secrets/config/env, provider payload,
  approval-line value, and readiness fields are rejected without echoing
  submitted values;
- all side-effect counters must be present and exactly zero.

## Validation

```text
node --check src/core/VcpMemoryTrustedWriteProposalExactRequestPacketReadinessContract.js
node --check tests/vcp-memory-trusted-write-proposal-exact-request-packet-readiness-contract.test.js
node --test tests/vcp-memory-trusted-write-proposal-exact-request-packet-readiness-contract.test.js
npm test
```

Result:

```text
targeted tests: 8
targeted pass: 8
default npm test: 3762/3762
fail: 0
```

## Re-Review

Final diff review found no actionable issue in the changed scope. The helper
is pure local source/test code and does not call filesystem read APIs, child
processes, network/runtime, providers, MCP tools, memory tools, or durable
stores.

The accepted decision remains not-ready. CM-1831 does not create a real exact
request packet, request submission, approval line, proposal, runtime call, or
write path.

## Non-Claims

```yaml
cm1831_non_claims:
  fixture_contract_added: true
  non_authorizing_packet_readiness_contract_added: true
  accepted_state: packet_readiness_blocked_missing_exact_fields
  exact_request_packet_ready: false
  exact_request_packet_submitted: false
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

`CM-1832 M9 exact request packet-readiness contract closeout / request-preparation gate review`.

CM-1832 should review CM-1830 and CM-1831 and decide whether the local
packet-readiness fixture slice can close, while preserving that exact request
submission, approval-line generation, real proposal generation/submission,
accepted real proposal receipts, runtime, memory read/write, durable mutation,
provider/API, public MCP expansion, M10/M15 unlock, and readiness remain
blocked unless a later exact boundary supplies the missing fields.
