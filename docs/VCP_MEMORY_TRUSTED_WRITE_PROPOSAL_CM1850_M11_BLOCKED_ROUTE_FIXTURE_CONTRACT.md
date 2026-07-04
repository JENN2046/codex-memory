# VCP Memory Trusted-Write-Proposal CM1850 M11 Blocked Route Fixture Contract

Task id: `M11-TRUSTED-WRITE-PROPOSAL-BLOCKED-ROUTE-FIXTURE-CONTRACT`
Implementation slice: `CM-1850`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1849_M11_BLOCKED_PRECONDITION_REFRESH.md`
Evidence type: `source-test`, `fixture-contract`,
`m11-blocked-route`, `non-authorizing`, `no-runtime`,
`no-memory-read`, `no-memory-write`, `no-request-body`,
`no-approval-line`, `no-config-change`

## Purpose

CM-1850 turns the CM-1849 M11 blocked precondition refresh into a pure local
source/test fixture contract.

The helper validates only a non-authorizing M11 blocked route fixture. Its
accepted state is explicitly blocked:
`m11_route_blocked_missing_exact_runtime_memory_or_approval_material_authority`.
It preserves zero runtime calls, zero live VCPToolBox calls, zero MCP memory
tool calls, zero memory reads/writes, zero durable writes, zero request body
generation/submission, zero approval-line operations, zero proposal
generation/submission, zero accepted real proposal receipts, zero
configuration/startup/watchdog changes, zero provider/API calls, zero public
MCP expansion, zero M11/M15 unlock, and zero readiness claims.

## Files Added

| File | Purpose |
|---|---|
| `src/core/VcpMemoryTrustedWriteProposalM11BlockedRouteContract.js` | pure fixture contract helper for non-authorizing M11 blocked route |
| `tests/vcp-memory-trusted-write-proposal-m11-blocked-route-contract.test.js` | targeted tests for accept/incomplete/stop/fail-closed behavior |

## Contract Coverage

CM-1850 validates:

- M11 blocked route fixtures are `trusted-write-proposal`, non-authorizing, and
  blocked-route-only;
- planning evidence includes CM-1848 M10 blocked state closeout and CM-1849
  M11 blocked precondition refresh;
- M10 remains blocked and M11 may not open;
- runtime boundary, memory read boundary, memory write boundary, request body
  authority, request submission authority, approval-line authority, accepted
  real proposal receipts, config/startup boundary, and M11 route authority are
  all declared missing;
- incomplete evidence, missing local fixture state, or missing blocker
  declarations compute `m11_route_incomplete`;
- M10/M11/M15 unlock, exact runtime/memory/request/approval/config authority,
  proposal receipt acceptance, runtime execution, memory read/write, provider,
  public MCP expansion, or readiness claims route to `stop_l4`;
- raw request/proposal/private output, secrets/config/env, target/endpoint
  values, provider payload, runtime authority, memory content, config path,
  M11 unlock, and readiness fields are rejected without echoing submitted
  values;
- all side-effect counters must be present and exactly zero.

## Validation

```text
node --check src/core/VcpMemoryTrustedWriteProposalM11BlockedRouteContract.js
node --check tests/vcp-memory-trusted-write-proposal-m11-blocked-route-contract.test.js
node --test tests/vcp-memory-trusted-write-proposal-m11-blocked-route-contract.test.js
npm test
```

Result:

```text
node --check source: pass
node --check test: pass
targeted node --test: pass 8/8
npm test: pass 3818/3818
```

## Non-Claims

```yaml
cm1850_non_claims:
  fixture_contract_added: true
  non_authorizing_m11_blocked_route_contract_added: true
  accepted_state: m11_route_blocked_missing_exact_runtime_memory_or_approval_material_authority
  m9_completed: false
  m9_proposal_mode_complete: false
  m10_gate_blocked: true
  m10_unlocked: false
  m11_gate_may_open: false
  m11_gate_blocked: true
  m11_unlocked: false
  m15_unlocked: false
  exact_runtime_boundary_bound: false
  exact_memory_read_boundary_bound: false
  exact_memory_write_boundary_bound: false
  request_body_generated: false
  request_body_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_line_submitted: false
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
  config_changed: false
  startup_changed: false
  watchdog_changed: false
  provider_api_called_by_agent: false
  public_mcp_expansion_performed: false
  readiness_claimed: false
  rc_ready_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
```

## Next Work

The next useful local-safe step is:

`CM-1851 M11 blocked route fixture closeout / next gate review`.

CM-1851 should review CM-1849 and CM-1850, close only the local M11 blocked
route fixture slice for planning, and keep runtime, memory read/write, request
body generation/submission, approval-line handling, config/startup changes,
proposal generation/submission, accepted real proposal receipts, provider/API,
public MCP expansion, M11/M15 unlock, and readiness blocked.
