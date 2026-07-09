# VCP Memory Trusted-Write-Proposal CM1840 Exact Request Packet Refresh Blocked Fixture Contract

Task id: `M9-TRUSTED-WRITE-PROPOSAL-EXACT-REQUEST-PACKET-REFRESH-BLOCKED-FIXTURE-CONTRACT`
Implementation slice: `CM-1840`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1839_EXACT_REQUEST_PACKET_REFRESH_BLOCKED_PREFLIGHT.md`
Evidence type: `source-test`, `fixture-contract`,
`exact-request-packet-refresh-blocked`, `non-authorizing`, `no-runtime`,
`no-request`, `no-proposal`, `no-write`

## Purpose

CM-1840 turns the CM-1839 exact request packet refresh blocked preflight into a
pure local source/test fixture contract.

The helper validates only a non-authorizing exact request packet refresh
blocked fixture. Its accepted state is explicitly not ready:
`exact_request_packet_refresh_blocked_missing_exact_fields`. It preserves zero
request body preparation, zero request submission, zero approval-line
operation, zero proposal generation/submission, zero accepted real proposal
receipt, zero runtime call, zero memory read/write, zero durable write, zero
provider/API call, zero public MCP expansion, zero M10/M15 unlock, and zero
readiness claim.

## Files Added

| File | Purpose |
|---|---|
| `src/core/VcpMemoryTrustedWriteProposalExactRequestPacketRefreshBlockedContract.js` | pure fixture contract helper for non-authorizing exact request packet refresh blocked state |
| `tests/vcp-memory-trusted-write-proposal-exact-request-packet-refresh-blocked-contract.test.js` | targeted tests for accept/incomplete/stop/fail-closed behavior |

## Contract Coverage

CM-1840 validates:

- exact request packet refresh blocked fixtures are `trusted-write-proposal`,
  non-authorizing, and blocked-only;
- planning evidence includes accepted M8 workflow evidence and the CM-1821
  through CM-1839 local preparation chain;
- local packet refresh blocked fixture presence is represented without real
  concrete values or authority;
- exact request packet readiness, approval-request readiness, concrete values,
  request body, request submission, approval line, proposal execution, runtime,
  write, provider/API, public MCP expansion, M10/M15, and readiness remain
  false;
- all missing exact fields are declared, including request body and
  approval-line value handling;
- incomplete evidence, missing local fixture state, or missing exact-field
  declarations compute `exact_request_packet_refresh_incomplete`;
- packet readiness, approval-request readiness, concrete values, request body,
  approval-line value, approval grant, proposal generation/submission,
  proposal acceptance, runtime execution, memory read/write, durable write,
  provider/API, public MCP expansion, M9 completion, M10/M15 unlock, or
  readiness claims route to `stop_l4`;
- raw request/proposal/private output, secrets/config/env, target/endpoint
  values, provider payload, approval-line value, request body, and readiness
  fields are rejected without echoing submitted values;
- all side-effect counters must be present and exactly zero.

## Validation

```text
node --check src/core/VcpMemoryTrustedWriteProposalExactRequestPacketRefreshBlockedContract.js
node --check tests/vcp-memory-trusted-write-proposal-exact-request-packet-refresh-blocked-contract.test.js
node --test tests/vcp-memory-trusted-write-proposal-exact-request-packet-refresh-blocked-contract.test.js
npm test
```

Result:

```text
targeted tests: pass 8/8
default npm test: pass 3794/3794
```

## Non-Claims

```yaml
cm1840_non_claims:
  fixture_contract_added: true
  non_authorizing_exact_request_packet_refresh_blocked_contract_added: true
  accepted_state: exact_request_packet_refresh_blocked_missing_exact_fields
  exact_request_packet_ready: false
  exact_request_packet_present: false
  approval_request_ready: false
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

`CM-1841 M9 exact request packet refresh blocked contract closeout / approval request boundary review`.

CM-1841 should review CM-1839 and CM-1840 and decide whether the local packet
refresh blocked fixture slice can close, while preserving that concrete exact
values, request body, request submission, approval-line generation, real
proposal generation/submission, accepted real proposal receipts, runtime,
memory read/write, durable mutation, provider/API, public MCP expansion,
M10/M15 unlock, and readiness remain blocked unless a later exact boundary
supplies the missing values and authorization.
