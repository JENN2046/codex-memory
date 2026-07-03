# VCP Memory Trusted-Write-Proposal CM1826 Exact-Boundary Packet Skeleton Fixture Contract

Task id: `M9-TRUSTED-WRITE-PROPOSAL-EXACT-BOUNDARY-PACKET-SKELETON-FIXTURE-CONTRACT`
Implementation slice: `CM-1826`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1825_BLOCKED_TO_EXACT_BOUNDARY_DECISION_PACKET_REFRESH.md`
Evidence type: `source-test`, `fixture-contract`, `non-authorizing`,
`no-runtime`, `no-proposal`, `no-write`

## Purpose

CM-1826 turns the CM-1825 route decision into a pure local contract for a
non-authorizing M9 exact-boundary packet skeleton.

It validates only the packet skeleton shape. The helper accepts a skeleton that
references M8 and CM-1821/CM-1822/CM-1823/CM-1824 preparation evidence while
making missing exact fields explicit. It does not submit requests, generate
approval lines, grant approval, generate proposals, submit proposals, accept
real proposal receipts, call runtime, read memory, write memory, mutate
durable state, call providers/APIs, expand public MCP tools, unlock M10/M15,
push, release, deploy, cut over, or claim readiness.

## Files Added

| File | Purpose |
|---|---|
| `src/core/VcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract.js` | pure fixture contract helper for the non-authorizing exact-boundary packet skeleton |
| `tests/vcp-memory-trusted-write-proposal-exact-boundary-packet-skeleton-contract.test.js` | targeted tests for accept/incomplete/stop/fail-closed behavior |

## Contract Coverage

CM-1826 validates:

- accepted skeletons remain non-authorizing and skeleton-only;
- accepted M8 and CM-1821/CM-1822/CM-1823/CM-1824 preparation evidence is
  present for planning only;
- target and transport can appear only as candidate aliases, not execution
  bindings;
- missing exact fields must be declared explicitly;
- exact boundary completion, request submission, approval-line value,
  approval grant, proposal generation/submission, proposal acceptance,
  runtime execution, memory read/write, durable write, provider/API, public
  MCP expansion, M9 completion, M10/M15 unlock, or readiness claims route to
  `stop_l4`;
- raw request/proposal/private output, secrets/config/env, provider payload,
  approval-line value, and readiness fields are rejected without echoing
  submitted values;
- all side-effect counters must be present and exactly zero.

## Validation

```text
node --check src/core/VcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract.js
node --check tests/vcp-memory-trusted-write-proposal-exact-boundary-packet-skeleton-contract.test.js
node --test tests/vcp-memory-trusted-write-proposal-exact-boundary-packet-skeleton-contract.test.js
npm test
```

Result:

```text
targeted tests: 8
targeted pass: 8
default npm test: 3746/3746
fail: 0
```

## Non-Claims

```yaml
cm1826_non_claims:
  fixture_contract_added: true
  non_authorizing_packet_skeleton_contract_added: true
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

`CM-1827 M9 exact-boundary packet skeleton closeout / request-boundary gate review`.

CM-1827 should review CM-1825 and CM-1826 and decide whether the local
non-authorizing packet skeleton preparation slice can close, while preserving
that request submission, approval-line generation, real proposal generation or
submission, accepted real proposal receipts, runtime, memory read/write,
durable mutation, provider/API, public MCP expansion, M10/M15 unlock, and
readiness remain blocked.
