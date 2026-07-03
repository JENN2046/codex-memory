# VCP Memory Trusted-Write-Proposal CM1829 Exact Request Field Candidate Fixture Contract

Task id: `M9-TRUSTED-WRITE-PROPOSAL-EXACT-REQUEST-FIELD-CANDIDATE-FIXTURE-CONTRACT`
Implementation slice: `CM-1829`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1828_EXACT_REQUEST_FIELD_CANDIDATE_SELECTION_PREFLIGHT.md`
Evidence type: `source-test`, `fixture-contract`, `non-authorizing`,
`no-runtime`, `no-proposal`, `no-write`

## Purpose

CM-1829 turns the CM-1828 exact request field candidate matrix into a pure
local fixture contract.

The helper validates only non-authorizing candidate packet shape. It accepts
safe candidate field vocabulary and explicitly declared missing exact fields,
while keeping exact request submission, approval-line generation, approval
grant, real proposal generation/submission, accepted real proposal receipts,
runtime execution, memory read/write, durable mutation, provider/API calls,
public MCP expansion, M9 completion, M10/M15 unlock, release/deploy/cutover,
push, and readiness blocked.

## Files Added

| File | Purpose |
|---|---|
| `src/core/VcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract.js` | pure fixture contract helper for non-authorizing exact request field candidates |
| `tests/vcp-memory-trusted-write-proposal-exact-request-field-candidate-contract.test.js` | targeted tests for accept/incomplete/stop/fail-closed behavior |

## Contract Coverage

CM-1829 validates:

- candidate packets are `trusted-write-proposal`, non-authorizing, and
  field-candidates-only;
- accepted planning evidence includes CM-1828, accepted M8 workflow evidence,
  CM-1826, CM-1821, CM-1822, and CM-1827;
- target alias, transport family, route family, component/action, client
  aliases, visibility/workspace/owner candidates, operation vocabulary,
  review vocabulary, rollback posture, budget candidates, receipt rules, and
  abort rules are represented without execution binding;
- missing exact fields are declared explicitly and keep the exact request
  packet not ready;
- incomplete evidence, incomplete candidate fields, or missing exact
  declarations compute `field_candidate_incomplete`;
- exact binding, request submission, approval-line value, approval grant,
  proposal generation/submission, proposal acceptance, runtime execution,
  memory read/write, durable write, provider/API, public MCP expansion, M9
  completion, M10/M15 unlock, or readiness claims route to `stop_l4`;
- raw request/proposal/private output, secrets/config/env, provider payload,
  approval-line value, and readiness fields are rejected without echoing
  submitted values;
- all side-effect counters must be present and exactly zero.

## Validation

```text
node --check src/core/VcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract.js
node --check tests/vcp-memory-trusted-write-proposal-exact-request-field-candidate-contract.test.js
node --test tests/vcp-memory-trusted-write-proposal-exact-request-field-candidate-contract.test.js
npm test
```

Result:

```text
targeted tests: 8
targeted pass: 8
default npm test: 3754/3754
fail: 0
```

## Post-Fix Re-Review

The first targeted run exposed one contract layering issue: incomplete
candidate data and L4 stop intent were being rejected as malformed shape. The
repair narrowed shape validation to type, enum, and zero-counter checks, moved
missing safe fields to `field_candidate_incomplete`, and kept authority
expansion in `stop_l4`.

Re-review of the final diff found no actionable issue in the changed scope.
The helper remains pure local source/test code and does not call filesystem
read APIs, child processes, network/runtime, providers, MCP tools, memory
tools, or durable stores.

## Non-Claims

```yaml
cm1829_non_claims:
  fixture_contract_added: true
  non_authorizing_field_candidate_contract_added: true
  exact_request_field_packet_present: false
  exact_request_packet_ready: false
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

`CM-1830 M9 exact request field candidate contract closeout / packet-readiness gate review`.

CM-1830 should review CM-1828 and CM-1829 and decide whether the local
candidate-field contract slice can close, while preserving that exact request
packet readiness, request submission, approval-line generation, real proposal
generation/submission, accepted real proposal receipts, runtime, memory
read/write, durable mutation, provider/API, public MCP expansion, M10/M15
unlock, and readiness remain blocked unless a later exact boundary supplies
the missing fields.
