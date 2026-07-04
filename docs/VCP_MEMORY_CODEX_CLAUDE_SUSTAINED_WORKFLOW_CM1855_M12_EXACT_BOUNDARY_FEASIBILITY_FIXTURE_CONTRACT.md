# VCP Memory Codex Claude Sustained Workflow CM1855 M12 Exact Boundary Feasibility Fixture Contract

Task id: `M12-CODEX-CLAUDE-SUSTAINED-WORKFLOW-EXACT-BOUNDARY-FEASIBILITY-FIXTURE-CONTRACT`
Implementation slice: `CM-1855`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_CODEX_CLAUDE_SUSTAINED_WORKFLOW_CM1854_M12_EXACT_BOUNDARY_FEASIBILITY_PREFLIGHT.md`
Evidence type: `source-test-fixture`, `exact-boundary-feasibility`,
`non-authorizing`, `no-runtime`, `no-memory-read`, `no-memory-write`,
`no-request-body`, `no-approval-line`, `no-config-change`

## Purpose

CM-1855 adds a pure local fixture contract for the CM-1854 M12 exact-boundary
feasibility packet.

The contract validates shape-only candidate field packets and fails closed if
the input attempts to bind concrete live values, create a live execution
packet, prepare request material, generate approval material, authorize
runtime or memory actions, unlock M12/M15, or claim readiness.

## Files

- `src/core/VcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract.js`
- `tests/vcp-memory-codex-claude-sustained-workflow-exact-boundary-feasibility-contract.test.js`

## Contract Behavior

The helper accepts only:

- `schemaVersion=1`;
- `contract_version=vcp_memory_codex_claude_m12_exact_boundary_feasibility_v1`;
- evidence type `fixture-only` or `schema-only`;
- boundary mode `feasibility-only`;
- decision `partial_blocked`;
- source references for M8 receipt, M11 blocker, and M12 alignment evidence;
- all CM-1854 candidate field flags present and true;
- blocked reasons including `m11_live_evidence_absent` and
  `checkpoint_handoff_write_authority_absent`;
- all authorization fields present and false;
- all side-effect counters present and zero.

It rejects:

- missing required fields as `m12_exact_boundary_feasibility_incomplete`;
- missing required side-effect counters as
  `m12_exact_boundary_feasibility_incomplete`;
- concrete live value or live packet binding;
- request-body or approval-line material fields;
- runtime, MCP memory, memory read/write, checkpoint/handoff write, durable
  write, provider/API, config/startup/watchdog, public MCP expansion, M12/M15
  unlock, and readiness authority;
- raw, secret, runtime, request, approval, provider, and readiness-overclaim
  field names without echoing submitted values;
- nonzero or nonnumeric side-effect counters.

## Validation

```text
node --check src/core/VcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract.js
node --check tests/vcp-memory-codex-claude-sustained-workflow-exact-boundary-feasibility-contract.test.js
node --test tests/vcp-memory-codex-claude-sustained-workflow-exact-boundary-feasibility-contract.test.js
npm test
git diff --check
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS JSON OK')"
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
bash scripts/validate-local.sh docs
```

Result:

```text
CMV-1958: pass
```

## Non-Claims

```yaml
cm1855_non_claims:
  source_test_fixture_contract: true
  concrete_exact_values_bound: false
  live_execution_packet_bound: false
  request_body_prepared: false
  request_body_submitted: false
  approval_line_present: false
  approval_line_generated: false
  approval_line_submitted: false
  approval_granted: false
  m12_live_workflow_may_open: false
  m12_live_workflow_blocked: true
  m12_unlocked: false
  m15_unlocked: false
  workflow_harness_started: false
  workflow_steps_executed: 0
  workflow_receipts_accepted: 0
  runtime_attempt_performed: false
  live_vcp_toolbox_called: false
  mcp_memory_tool_called: false
  memory_read_performed_by_agent: false
  client_private_memory_read_performed: false
  checkpoint_memory_write_performed: false
  handoff_memory_write_performed: false
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
