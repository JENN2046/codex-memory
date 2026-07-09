# VCP Memory Codex Claude Sustained Workflow M12 Envelope Contract

Task id: `M12-K1-CODEX-CLAUDE-SUSTAINED-WORKFLOW-ENVELOPE-CONTRACT`
Implementation slice: `CM-1759`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_CODEX_CLAUDE_SUSTAINED_WORKFLOW_M12_FIXTURE_BOUNDARY.md`
Evidence type: `source/test`, `fixture-only`, `schema contract`, `no-runtime`, `no-write`

## Purpose

This slice turns the M12 fixture-safe boundary into an executable local
contract for future Codex/Claude sustained workflow envelopes.

It does not run a workflow harness, call VCPToolBox, call MCP tools, discover
or probe a target, perform a read query, read client-private memory, write
checkpoint memory, write handoff memory, write durable audit/runtime state,
execute fallback, submit an approval request, generate an approval line, call
providers/APIs, read secrets/config, expand public MCP tools, push remote
state, or claim readiness.

## Added Artifacts

- `src/core/VcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract.js`
- `tests/vcp-memory-codex-claude-sustained-workflow-envelope-contract.test.js`

## Contract Mode

```yaml
m12_envelope_contract:
  contract_name: VcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract
  contract_mode: fixture_workflow_envelope_contract_only
  schema_version: 1
  envelope_contract_version: vcp_memory_codex_claude_sustained_workflow_envelope_v1
  receipt_plan_contract_version: vcp_memory_codex_claude_workflow_receipt_plan_v1
  live_runtime_allowed: false
  mcp_tool_call_allowed: false
  memory_read_allowed: false
  checkpoint_memory_write_allowed: false
  handoff_memory_write_allowed: false
  durable_audit_write_allowed: false
  approval_request_allowed: false
  approval_line_generation_allowed: false
  readiness_claim_allowed: false
```

## Coverage

The targeted test covers:

- accepted Codex private fixture-only workflow envelope;
- accepted Claude shared fixture envelope with explicit shared boundary;
- cross-client private access stopped as L4 without memory read;
- missing client or scope represented as deny fixture;
- success-like envelope rejection when required client/scope fields are
  missing;
- runtime, MCP, checkpoint/handoff write plans, durable audit plans, and
  positive side-effect counters rejected;
- raw private, debug, approval-line, and readiness fields rejected without
  echoing submitted values;
- helper side-effect posture locked to no runtime, no workflow execution, no
  MCP tool call, no fallback execution, no memory read/write, no
  checkpoint/handoff memory write, no durable audit/memory write, no
  provider/API, no approval request, no approval line, no public MCP expansion,
  and no readiness claim.

## Current Result

```yaml
m12_envelope_contract_result:
  contract_implemented: true
  targeted_test_count: 8
  targeted_test_passed: true
  fixture_workflow_envelope_only: true
  codex_private_fixture_accepted: true
  claude_shared_fixture_accepted: true
  cross_client_private_stop_l4_covered: true
  missing_scope_deny_covered: true
  success_like_missing_scope_rejected: true
  runtime_mcp_write_plan_rejected: true
  raw_secret_approval_readiness_fields_rejected: true
  side_effect_posture_locked: true
  workflow_harness_started: false
  workflow_steps_executed: 0
  mcp_tool_called_for_m12_evidence: false
  vcp_toolbox_runtime_called: false
  fallback_execution_performed: false
  memory_read_performed: false
  memory_write_performed: false
  checkpoint_memory_write_performed: false
  handoff_memory_write_performed: false
  durable_audit_write_performed: false
  durable_memory_write_performed: false
  provider_api_called: false
  approval_request_submitted: false
  approval_line_generated: false
  public_mcp_expansion_performed: false
  readiness_claimed: false
```

## Remaining Live Blockers

This contract does not prove live M12 workflow integration.

Live workflow remains blocked until:

- accepted exact-approved M8 trusted-full-read workflow evidence exists;
- accepted exact-approved M11 response/receipt live evidence exists;
- exact Codex/Claude client aliases, scope, visibility, target, transport,
  workflow step budget, call budget, duration budget, result budget, and
  low-disclosure receipt rules are provided;
- checkpoint/handoff memory write behavior is either explicitly forbidden for
  the live run or separately exact-approved as a bounded write path.

## M12-K1 Conclusion

M12 now has an executable fixture-only envelope contract for Codex/Claude
isolation and checkpoint/handoff receipt shape.

The next safe route is a focused source review or a fixture-only receipt-chain
contract. Live workflow execution remains blocked.
