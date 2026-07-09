# VCP Memory Trusted-Write-Proposal CM1822 Receipt Shape Fixture Contract

Task id: `M9-TRUSTED-WRITE-PROPOSAL-RECEIPT-SHAPE-FIXTURE-CONTRACT`
Implementation slice: `CM-1822`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1821_ENVELOPE_FIXTURE_CONTRACT.md`
Evidence type: `source-test`, `fixture-contract`, `no-runtime`, `no-write`

## Purpose

CM-1822 turns the M9 `trusted-write-proposal` low-disclosure receipt shape
into local fixture/contract code.

It adds a pure helper and targeted tests for receipt-shape validation only. The
helper validates local fixture data and always keeps real proposal acceptance,
runtime execution, memory write, durable mutation, provider/API use, public MCP
expansion, approval request submission, approval-line generation, readiness,
release, deploy, cutover, and push out of scope.

## Files Added

| File | Purpose |
|---|---|
| `src/core/VcpMemoryTrustedWriteProposalReceiptShapeContract.js` | pure fixture contract helper for M9 proposal receipt shapes |
| `tests/vcp-memory-trusted-write-proposal-receipt-shape-contract.test.js` | targeted contract tests for accept/reject/stop and no-side-effect posture |

## Contract Coverage

CM-1822 validates:

- fixture-only `trusted-write-proposal` receipt-shape acceptance;
- explicit proposal review status values `accept` and `reject` as shape
  vocabulary only, not as runtime authorization;
- missing scope, intent, accept/reject status, rollback posture, redacted
  output, or redaction prerequisites fails closed as `receipt_shape_reject`;
- proposal generation, proposal submission, direct write, durable write,
  update, supersede, tombstone, irreversible deletion, auto accept, execution
  authorization, rollback execution, provider/API, public MCP expansion, raw
  output, approval-line disclosure, or readiness intent fails closed as
  `stop_l4`;
- raw receipt/proposal payload, raw memory, secrets/config/env, provider
  payload, approval-line value, and readiness overclaim fields are rejected
  without echoing submitted values;
- post-fix re-review repaired rejected-path `expectedDecision` projection so
  non-allowlisted values are never echoed;
- decision mismatch and unexpected fields fail closed without echoing submitted
  values;
- source envelope and receipt identifiers must use safe fixture id prefixes;
- all side-effect counters must be present and exactly zero;
- helper outputs distinguish `receiptShapeAccepted` from
  `proposalReceiptAccepted`; the latter remains `false`.

## Validation

```text
node --check src/core/VcpMemoryTrustedWriteProposalReceiptShapeContract.js
node --check tests/vcp-memory-trusted-write-proposal-receipt-shape-contract.test.js
node --test tests/vcp-memory-trusted-write-proposal-receipt-shape-contract.test.js
npm test
```

Result:

```text
targeted tests: 9
targeted pass: 9
default npm test: 3730/3730
fail: 0
```

## Non-Claims

```yaml
cm1822_non_claims:
  fixture_contract_added: true
  runtime_attempt_performed: false
  live_vcp_toolbox_called: false
  mcp_memory_tool_called: false
  memory_read_performed_by_agent: false
  memory_write_performed: false
  durable_write_performed: false
  proposal_generation_performed: false
  proposal_submission_performed: false
  proposal_receipts_accepted: 0
  receipt_shape_accepted_fixture_only: true
  provider_api_called_by_agent: false
  public_mcp_expansion_performed: false
  approval_request_submitted: false
  approval_line_generated: false
  m9_completion_claimed: false
  m10_unlocked: false
  m15_unlocked: false
  readiness_claimed: false
```

## Next Work

The next useful local-safe step is:

`CM-1823 M9 trusted-write-proposal receipt closeout / next-stage gate review`.

CM-1823 should review CM-1821 and CM-1822 as fixture-contract evidence only and
decide whether M9 has enough local contract evidence to close the current
proposal-mode preparation slice or whether another fixture/dry-run boundary is
needed. It must not generate real proposals, accept proposal receipts, read
memory, write memory, call runtime, call providers/APIs, expand public MCP
tools, unlock M10/M15, or claim readiness.
