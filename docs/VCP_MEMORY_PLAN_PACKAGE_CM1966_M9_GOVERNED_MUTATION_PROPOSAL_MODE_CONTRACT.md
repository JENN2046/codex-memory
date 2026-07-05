# CM-1966 M9 Governed Mutation Proposal Mode Contract

Task id: `CM-1966`

Validation id: `CMV-2069`

Date: 2026-07-05

Status: `COMPLETED_VALIDATED_M9_GOVERNED_MUTATION_PROPOSAL_MODE_CONTRACT_NO_DURABLE_WRITE_NO_READINESS`

## Purpose

CM-1966 implements local source/test evidence for M9 governed mutation proposal
mode after CM-1965 routed the active plan-package work back to M9.

M9 is proposal-only. This slice proves a local contract can model proposal
generation, accept review, reject review, and audited low-disclosure receipts
without durable write, memory write, runtime, provider/API call, public MCP
expansion, release, deploy, cutover, push, readiness, or M10 unlock.

## Added Artifacts

- `src/core/VcpMemoryGovernedMutationProposalModeContract.js`
- `tests/vcp-memory-governed-mutation-proposal-mode-contract.test.js`

## Contract Behavior

The CM-1966 helper accepts only local/fixture proposal-mode packets with:

- M8 trusted-full-read workflow evidence accepted as an input flag;
- mutation proposal envelope specified;
- L4 write-intent shield tested;
- safe target-reference category only;
- bounded client scope and visibility category;
- proposal-only operation family;
- shape-only scope, intent, diff, and rollback posture;
- explicit `accept` or `reject` review decision;
- low-disclosure audit receipt requested;
- proposal counters limited to one generated proposal and one audited receipt;
- all runtime, write, provider, public MCP, approval-line, submission, and
  readiness counters exactly zero.

The helper rejects missing fields, unexpected fields, invalid counters,
decision mismatches, and forbidden raw/secret/runtime/overclaim fields without
echoing private values.

## Evidence

Targeted test:

```text
node --test tests/vcp-memory-governed-mutation-proposal-mode-contract.test.js
```

Result:

```text
7/7 passed
```

Default test suite:

```text
npm test -- --summary
```

Result:

```text
4054/4054 passed
```

Covered paths:

- proposal generated and accepted without durable write;
- proposal generated and rejected with audited receipt and no durable write;
- proposal mode denied when M8/audit prerequisites are absent;
- L4 stop for write intent, auto-accept, runtime drift, provider drift, and
  public MCP drift;
- raw/secret/endpoint/request/response/approval/readiness fields rejected
  without echo;
- missing, unexpected, invalid-counter, and decision-mismatch shapes rejected;
- required field and zero-side-effect counter contracts exported.

## Non-Actions

CM-1966 performs no live call, VCPToolBox call, network call, runtime call,
process-state inspection, listener recheck, service start/stop/restart,
endpoint/locator disclosure, config/env/secret/log/stdout/stderr read, request
body output or persistence, response body read, raw error read, raw memory/raw
store/raw audit read, MCP memory tool call, memory read, memory write, durable
write, proposal submission to runtime, approval request submission, approval
line generation, provider/API call, dependency change, public MCP expansion,
VCPToolBox core modification, push, tag, release, deploy, cutover, readiness
claim, M10 unlock, complete V8 claim, or full bridge completion claim.

## M9 Exit Mapping

```yaml
m9_exit_condition_mapping:
  proposal_can_be_generated_without_durable_write: true
  proposal_can_be_accepted_without_durable_write: true
  proposal_can_be_rejected_without_durable_write: true
  proposal_can_be_audited_without_durable_write: true
  proposal_receipt_includes_rollback_posture_and_scope: true
  evidence_level: local_source_test_contract
  live_runtime_proof: false
  durable_write_performed: false
  m10_unlocked: false
  readiness_claimed: false
```

## Receipt

```yaml
task_id: CM-1966
phase: M9
contract: VcpMemoryGovernedMutationProposalModeContract
source_added: src/core/VcpMemoryGovernedMutationProposalModeContract.js
tests_added: tests/vcp-memory-governed-mutation-proposal-mode-contract.test.js
targeted_tests: 7
targeted_tests_failed: 0
default_tests: 4054
default_tests_failed: 0
proposal_mode_contract_completed: true
proposal_generated_local_contract: true
proposal_accept_review_local_contract: true
proposal_reject_review_local_contract: true
proposal_audit_receipt_local_contract: true
rollback_posture_and_scope_receipt_shape: true
durable_write_performed: false
memory_write_performed: false
runtime_call_performed: false
vcp_toolbox_runtime_called: false
provider_api_called: false
public_mcp_expansion: false
m10_unlocked: false
readiness_claimed: false
rc_ready_claimed: false
complete_v8_claimed: false
full_bridge_completion_claimed: false
next_route: CM-1967 M10 bounded mutation blocked/exact-write-boundary gate refresh
```

## Next Route

CM-1967 should refresh the M10 gate from the new M9 local proposal-mode
evidence. M10 remains blocked for actual write/update/supersede/tombstone
execution until Jenn provides a separate exact write boundary with target,
client id, scope, visibility, operation, rollback posture, and audit receipt
rules.
