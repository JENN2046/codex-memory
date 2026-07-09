# VCP Memory Codex Claude Sustained Workflow M12 Fixture Boundary

Task id: `M12-K0-CODEX-CLAUDE-SUSTAINED-WORKFLOW-FIXTURE-BOUNDARY`
Implementation slice: `CM-1758`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on:
- `docs/VCP_MEMORY_TRUSTED_FULL_READ_M8_BLOCKED_CLOSEOUT_SUMMARY.md`
- `docs/VCP_MEMORY_RESPONSE_NORMALIZATION_AUDIT_RECEIPTS_M11_BLOCKED_CLOSEOUT_SUMMARY.md`
- `docs/VCP_MEMORY_CLIENT_SCOPE_VISIBILITY_MATRIX.md`
Evidence type: `docs-only`, `fixture boundary`, `precondition review`, `no-runtime`, `no-write`

## Single Capability

This slice defines the non-executing M12 fixture-safe boundary for future
Codex/Claude sustained workflow integration.

It does not run a workflow harness, call VCPToolBox, call MCP tools, discover
or probe a target, perform a read query, read client-private memory, write
checkpoint memory, write handoff memory, write durable audit/runtime state,
execute fallback, submit an approval request, generate an approval line, call
providers/APIs, read secrets/config, expand public MCP tools, push remote
state, or claim readiness.

## M12 Plan Requirement

The archived plan defines M12 as `Codex / Claude Sustained Workflow
Integration`.

Required M12 direction:

- integrate governed recall into AGENTS OS workflows;
- cover checkpoint memory, handoff memory, client_id isolation, and bounded
  recall;
- produce sustained workflow reports and receipts;
- demonstrate Codex/Claude isolation;
- depend on M8 and M11.

Current evidence does not unlock live M12 workflow integration because M8
trusted-full-read workflow evidence is blocked and M11 live response/receipt
evidence is blocked.

## Entry Condition Review

| Entry condition | Current evidence | Decision |
|---|---|---|
| M8 read-only workflow harness exists | `docs/VCP_MEMORY_TRUSTED_FULL_READ_M8_BLOCKED_CLOSEOUT_SUMMARY.md` records M8 docs-only closeout and `trusted_full_read_evidence_complete=false` | blocked |
| M11 response/receipt evidence is stable | `docs/VCP_MEMORY_RESPONSE_NORMALIZATION_AUDIT_RECEIPTS_M11_BLOCKED_CLOSEOUT_SUMMARY.md` records fixture/schema stability only and `m11_exit_conditions_completed=false` | blocked for live workflow |
| Client_id/scope/visibility matrix exists | `docs/VCP_MEMORY_CLIENT_SCOPE_VISIBILITY_MATRIX.md` exists and defines Codex/Claude/private/shared/unknown decisions | available for fixture boundary |

M12 can proceed only as a fixture/schema/governance boundary until accepted
M8 and M11 live evidence exists.

## Allowed Fixture Boundary Now

The current safe M12 work may define and later test fixture-only structures for:

- workflow request envelope fields;
- Codex/Claude `client_id` family markers;
- workspace, project, owner, task, and visibility presence flags;
- no-cross-client-private-leakage decisions;
- checkpoint/handoff receipt field names;
- stale context and unknown-client abort reasons;
- low-disclosure workflow report shape;
- fail-closed denial for raw private output, public MCP expansion, write
  expansion, readiness overclaim, and missing scope.

Allowed fixture work must remain local, deterministic, and non-executing.

## Forbidden Now

The current boundary forbids:

- live VCPToolBox target discovery, target probing, or runtime calls;
- MCP `search_memory`, `memory_overview`, or `record_memory` calls as M12
  evidence;
- real read queries or client-private memory reads;
- checkpoint memory writes, handoff memory writes, durable audit writes, or
  runtime state writes;
- fallback execution or fallback success claims;
- public MCP tool/schema expansion;
- provider/API calls;
- secrets/config/env reads or edits;
- approval request submission, approval-line generation, approval-line
  storage, or approval-line simulation;
- release, deploy, cutover, push, `RC_READY`, complete V8, or full bridge
  completion claims.

## Current M12 Fixture Boundary State

```yaml
m12_fixture_boundary_state:
  boundary_id: m12_codex_claude_sustained_workflow_fixture_boundary_cm1758
  source_m8_closeout: docs/VCP_MEMORY_TRUSTED_FULL_READ_M8_BLOCKED_CLOSEOUT_SUMMARY.md
  source_m11_closeout: docs/VCP_MEMORY_RESPONSE_NORMALIZATION_AUDIT_RECEIPTS_M11_BLOCKED_CLOSEOUT_SUMMARY.md
  source_client_scope_visibility_matrix: docs/VCP_MEMORY_CLIENT_SCOPE_VISIBILITY_MATRIX.md
  single_capability: fixture_safe_workflow_boundary_only
  m8_read_only_workflow_harness_exists: false
  m8_trusted_full_read_evidence_complete: false
  m11_exit_conditions_completed: false
  m11_fixture_chain_closed: true
  m11_live_response_receipt_evidence_complete: false
  client_scope_visibility_matrix_exists: true
  codex_claude_isolation_fixture_basis_available: true
  m12_live_workflow_unlocked: false
  m12_fixture_boundary_allowed: true
  workflow_harness_started: false
  workflow_steps_executed: 0
  workflow_integration_proven: false
  workflow_receipts_accepted: false
  checkpoint_memory_write_performed: false
  handoff_memory_write_performed: false
  durable_audit_write_performed: false
  memory_read_performed: false
  memory_write_performed: false
  vcp_toolbox_runtime_called: false
  mcp_tool_called_for_m12_evidence: false
  fallback_execution_performed: false
  approval_request_submitted: false
  approval_line_present: false
  approval_line_generated: false
  provider_api_called: false
  public_mcp_expansion_performed: false
  readiness_claimed: false
  next_safe_route: m12_fixture_workflow_envelope_contract_or_wait_for_m8_m11_live_evidence
```

## Future Exact Requirements

To move from this fixture boundary into live M12 workflow evidence, a future
task would need:

- accepted exact-approved M8 trusted-full-read workflow receipt;
- accepted exact-approved M11 response/receipt live evidence;
- exact target alias and transport;
- exact Codex and Claude client aliases;
- exact workspace, project, owner, task, and visibility boundary;
- exact workflow step list, step cap, call cap, duration cap, and result cap;
- checkpoint/handoff/audit receipt rules that do not perform durable memory
  writes unless a separate exact write approval exists;
- low-disclosure workflow report budget;
- abort rules for cross-client leakage, missing scope, stale target, raw
  private output, public MCP expansion, write expansion, fallback drift, and
  readiness overclaim.

## Current Review Result

```yaml
current_review_result:
  decision: m12_fixture_boundary_recorded_live_workflow_blocked
  serves_project_final_goal: true
  m12_entry_conditions_satisfied_for_live_workflow: false
  m12_fixture_boundary_ready: true
  live_runtime_work_allowed: false
  checkpoint_handoff_memory_write_allowed: false
  next_safe_route: m12_fixture_workflow_envelope_contract_or_wait_for_m8_m11_live_evidence
```

## M12-K0 Conclusion

M12 is the right next phase only as fixture/schema/governance boundary work.
The client/scope/visibility basis exists, but the live read workflow and live
response/receipt evidence required by M8 and M11 do not exist.

The next safe implementation slice can define a fixture-only sustained
workflow envelope contract for Codex/Claude isolation and checkpoint/handoff
receipt shape. It must not execute workflow steps or write checkpoint/handoff
memory.
