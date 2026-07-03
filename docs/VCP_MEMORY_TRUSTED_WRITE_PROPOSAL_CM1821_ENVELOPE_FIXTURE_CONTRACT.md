# VCP Memory Trusted-Write-Proposal CM1821 Envelope Fixture Contract

Task id: `M9-TRUSTED-WRITE-PROPOSAL-ENVELOPE-FIXTURE-CONTRACT`
Implementation slice: `CM-1821`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1820_EXACT_BOUNDARY_FIELD_FEASIBILITY_PREFLIGHT.md`
Evidence type: `source-test`, `fixture-contract`, `no-runtime`, `no-write`

## Purpose

CM-1821 turns the M9 `trusted-write-proposal` envelope boundary into local
fixture/contract code.

It adds a pure helper and targeted test coverage for a non-durable proposal
envelope. The helper validates fixture data only. It does not call VCPToolBox,
start runtime, call MCP tools, read memory, write memory, mutate durable state,
call providers/APIs, expand public MCP tools, submit approvals, generate
approval lines, push, release, deploy, cut over, or claim readiness.

## Files Added

| File | Purpose |
|---|---|
| `src/core/VcpMemoryTrustedWriteProposalEnvelopeContract.js` | pure fixture contract helper for M9 proposal envelopes |
| `tests/vcp-memory-trusted-write-proposal-envelope-contract.test.js` | targeted contract tests for accept/deny/stop and no-side-effect posture |

## Contract Coverage

CM-1821 validates:

- fixture-only `trusted-write-proposal` envelope acceptance;
- missing proposal scope, operations, review route, rollback posture, budgets,
  or L4 write-intent shield evidence fails closed as `deny`;
- durable write, direct write, update, supersede, tombstone, irreversible
  deletion, proposal submission, provider/API, public MCP expansion, auto
  accept, or runtime-call intent fails closed as `stop_l4`;
- raw proposal payload, raw memory, secrets/config/env, provider payload,
  approval-line value, and readiness overclaim fields are rejected without
  echoing submitted values;
- decision mismatch and unexpected fields fail closed without echoing submitted
  values;
- envelope and receipt identifiers must use safe fixture id prefixes, and
  proposal operation entries must be allowlisted;
- all side-effect counters must be present and exactly zero;
- helper outputs always report no runtime wiring, no proposal generation, no
  proposal submission, no memory read/write, no durable write, no provider/API,
  no public MCP expansion, no approval-line operation, and no readiness.

## Validation

```text
node --check src/core/VcpMemoryTrustedWriteProposalEnvelopeContract.js
node --check tests/vcp-memory-trusted-write-proposal-envelope-contract.test.js
node --test tests/vcp-memory-trusted-write-proposal-envelope-contract.test.js
npm test
```

Result:

```text
targeted tests: 8
targeted pass: 8
default npm test: 3721/3721
fail: 0
```

Post-fix re-review found and repaired a fixture shape gap: identifiers now use
safe fixture id prefixes, proposal operation entries are allowlisted, and unsafe
identifier values are not echoed from rejected projections.

## Non-Claims

```yaml
cm1821_non_claims:
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

`CM-1822 M9 trusted-write-proposal receipt shape fixture contract`.

CM-1822 should add fixture/contract coverage for the low-disclosure proposal
receipt shape itself: scope, intent, rollback posture, accept/reject status,
redacted output, and zero side-effect counters. It must remain fixture-only and
must not generate real proposals, read memory, write memory, call runtime, call
providers/APIs, expand public MCP tools, unlock M10/M15, or claim readiness.
