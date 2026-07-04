# VCP Memory Trusted-Write-Proposal CM1847 M10 Blocked State Fixture Contract

Task id: `M10-TRUSTED-WRITE-PROPOSAL-BLOCKED-STATE-FIXTURE-CONTRACT`
Implementation slice: `CM-1847`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1846_M9_FINAL_BLOCKED_CLOSEOUT_M10_GATE_PREFLIGHT.md`
Evidence type: `source-test`, `fixture-contract`,
`m10-blocked-state`, `non-authorizing`, `no-runtime`,
`no-request-body`, `no-approval-line`, `no-proposal`, `no-write`

## Purpose

CM-1847 turns the CM-1846 M10 gate preflight into a pure local source/test
fixture contract.

The helper validates only a non-authorizing M10 blocked state fixture. Its
accepted state is explicitly not ready: `m10_gate_blocked_missing_m9_completion`.
It preserves zero request body preparation, zero request submission, zero
approval-line operation, zero proposal generation/submission, zero accepted
real proposal receipt, zero runtime call, zero memory read/write, zero durable
write, zero provider/API call, zero public MCP expansion, zero M10/M15 unlock,
and zero readiness claim.

## Files Added

| File | Purpose |
|---|---|
| `src/core/VcpMemoryTrustedWriteProposalM10BlockedStateContract.js` | pure fixture contract helper for non-authorizing M10 blocked state |
| `tests/vcp-memory-trusted-write-proposal-m10-blocked-state-contract.test.js` | targeted tests for accept/incomplete/stop/fail-closed behavior |

## Contract Coverage

CM-1847 validates:

- M10 blocked state fixtures are `trusted-write-proposal`, non-authorizing, and
  blocked-only;
- planning evidence includes accepted M8 workflow evidence, CM-1844, CM-1845,
  and CM-1846;
- M9 final blocked closeout is represented as planning evidence only, not as
  M9 completion;
- M10 gate may not open and M10 remains locked;
- runtime/write authorization, exact boundary supply, request body, approval
  line, proposal receipt acceptance, runtime attempt, M15 unlock, and readiness
  remain false;
- all M10 blockers are declared, including missing M9 completion, exact
  boundary, request body, approval line, real proposal receipt, runtime/write
  authority, and M10 gate authority;
- incomplete evidence, missing local fixture state, or missing blocker
  declarations compute `m10_gate_incomplete`;
- M9 completion, M10 gate opening, runtime/write authorization, M10/M15 unlock,
  request body, approval line, proposal receipt, runtime, write, provider/API,
  public MCP expansion, or readiness claims route to `stop_l4`;
- raw request/proposal/private output, secrets/config/env, target/endpoint
  values, provider payload, runtime authority, M10 unlock, and readiness fields
  are rejected without echoing submitted values;
- all side-effect counters must be present and exactly zero.

## Validation

```text
node --check src/core/VcpMemoryTrustedWriteProposalM10BlockedStateContract.js
node --check tests/vcp-memory-trusted-write-proposal-m10-blocked-state-contract.test.js
node --test tests/vcp-memory-trusted-write-proposal-m10-blocked-state-contract.test.js
npm test
```

Result:

```text
node --check source: pass
node --check test: pass
targeted node --test: pass 8/8
npm test: pass 3810/3810
```

## Non-Claims

```yaml
cm1847_non_claims:
  fixture_contract_added: true
  non_authorizing_m10_blocked_state_contract_added: true
  accepted_state: m10_gate_blocked_missing_m9_completion
  m9_completed: false
  m9_completion_claimed: false
  m9_proposal_mode_complete: false
  m10_gate_may_open: false
  m10_gate_blocked: true
  m10_runtime_or_write_authorized: false
  m10_unlocked: false
  m15_unlocked: false
  exact_boundary_supplied: false
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
  readiness_claimed: false
  rc_ready_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
```

## Next Work

The next useful local-safe step is:

`CM-1848 M10 blocked state fixture closeout / M11 gate review`.

CM-1848 should review CM-1846 and CM-1847 and decide whether the local M10
blocked state fixture slice can close for planning, while preserving that M10,
M11/M15, runtime, write, approval request, proposal generation/submission,
accepted real proposal receipts, provider/API, public MCP expansion, and
readiness remain blocked.
