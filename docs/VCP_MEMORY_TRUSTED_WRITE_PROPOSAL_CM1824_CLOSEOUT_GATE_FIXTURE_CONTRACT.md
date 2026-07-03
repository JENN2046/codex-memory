# VCP Memory Trusted-Write-Proposal CM1824 Closeout Gate Fixture Contract

Task id: `M9-TRUSTED-WRITE-PROPOSAL-CLOSEOUT-GATE-FIXTURE-CONTRACT`
Implementation slice: `CM-1824`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1823_RECEIPT_CLOSEOUT_NEXT_STAGE_GATE_REVIEW.md`
Evidence type: `source-test`, `fixture-contract`, `no-runtime`, `no-proposal`,
`no-write`

## Purpose

CM-1824 turns the CM-1823 closeout gate decision into executable fixture-only
contract code.

It adds a pure helper and targeted tests that accept only the narrow local
fixture-contract preparation slice as closed while preserving that M9 proposal
mode has not passed and M10/M15 remain blocked. The helper validates local
fixture data only and does not generate proposals, submit proposals, accept
real proposal receipts, call runtime, read memory, write memory, mutate durable
state, call providers/APIs, expand public MCP tools, submit approvals, generate
approval lines, push, release, deploy, cut over, or claim readiness.

## Files Added

| File | Purpose |
|---|---|
| `src/core/VcpMemoryTrustedWriteProposalCloseoutGateContract.js` | pure fixture contract helper for the M9 closeout gate |
| `tests/vcp-memory-trusted-write-proposal-closeout-gate-contract.test.js` | targeted contract tests for closed/incomplete/stop and no-side-effect posture |

## Contract Coverage

CM-1824 validates:

- local fixture-contract preparation slice closed when CM-1821, CM-1822, and
  CM-1823 evidence is present;
- `fixture_preparation_incomplete` when required local evidence is absent;
- `stop_l4` when input claims M9 passed, M10/M15 unlocked, real proposal
  generation, accepted real proposal receipt, runtime authorization, durable
  write authority, or L4 workflow evidence;
- raw proposal payload, raw memory, secrets/config/env, provider payload,
  approval-line value, and readiness overclaim fields are rejected without
  echoing submitted values;
- post-fix re-review added explicit `rawOutput` forbidden vocabulary coverage;
- unexpected fields and unsafe expected decisions fail closed without echoing
  submitted values;
- all side-effect counters must be present and exactly zero;
- helper outputs always report no runtime wiring, no proposal generation, no
  proposal submission, no accepted real proposal receipt, no memory read/write,
  no durable write, no provider/API, no public MCP expansion, no approval-line
  operation, and no readiness.

## Validation

```text
node --check src/core/VcpMemoryTrustedWriteProposalCloseoutGateContract.js
node --check tests/vcp-memory-trusted-write-proposal-closeout-gate-contract.test.js
node --test tests/vcp-memory-trusted-write-proposal-closeout-gate-contract.test.js
npm test
```

Result:

```text
targeted tests: 8
targeted pass: 8
default npm test: 3738/3738
fail: 0
```

## Non-Claims

```yaml
cm1824_non_claims:
  fixture_contract_added: true
  local_fixture_contract_preparation_slice_closed: true
  m9_proposal_mode_passed: false
  m9_completion_claimed: false
  m10_unlocked: false
  m15_unlocked: false
  runtime_attempt_performed: false
  live_vcp_toolbox_called: false
  mcp_memory_tool_called: false
  memory_read_performed_by_agent: false
  memory_write_performed: false
  durable_write_performed: false
  proposal_generated: false
  proposal_submitted: false
  proposal_receipts_accepted: 0
  provider_api_called_by_agent: false
  public_mcp_expansion_performed: false
  approval_request_submitted: false
  approval_line_generated: false
  readiness_claimed: false
  rc_ready_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
```

## Next Work

The next useful local-safe step is:

`CM-1825 M9 blocked-to-exact-boundary decision packet refresh`.

CM-1825 should decide whether to keep building fixture-only proposal-mode
guards or prepare a non-authorizing exact-boundary packet for a future runtime
proposal-mode request. It must not generate real proposals, accept real
proposal receipts, read memory, write memory, call runtime, call providers/APIs,
expand public MCP tools, unlock M10/M15, or claim readiness.
