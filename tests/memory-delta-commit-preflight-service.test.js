'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  MemoryDeltaCommitPreflightService,
  collectForbiddenKeys
} = require('../src/core/MemoryDeltaCommitPreflightService');
const { MemoryDeltaProposalService } = require('../src/core/MemoryDeltaProposalService');

function acceptedProposal() {
  const proposalService = new MemoryDeltaProposalService();
  return proposalService.propose({
    task_id: 'CM-2035',
    task: {
      title: 'Phase 6 operator-only commit preflight',
      project_id: 'codex-memory',
      client_id: 'codex',
      visibility: 'project'
    },
    evidence_refs: [
      'docs/near-model-memory-plan-pack/04_PHASE_PLAN.md#phase-6',
      'tests/memory-delta-commit-preflight-service.test.js'
    ],
    candidates: [
      {
        target: 'process',
        intent: 'Commit path remains operator-only and exact-approval gated.',
        evidence_refs: ['CM-2035 local preflight'],
        tags: ['phase-6', 'operator-only'],
        sensitivity: 'low_disclosure_project_fact'
      }
    ]
  });
}

function validPreflightArgs(overrides = {}) {
  return {
    task_id: 'CM-2035',
    task: {
      title: 'Phase 6 operator-only commit preflight',
      client_id: 'codex',
      visibility: 'project'
    },
    proposal: acceptedProposal(),
    operator: {
      defaultExposed: false,
      publicMcpRegistered: false,
      exactApprovalAccepted: false,
      commitExecutionAuthorized: false,
      durableWriteAuthorized: false,
      productionWriteAuthorized: false,
      providerCallAuthorized: false,
      readinessClaimAuthorized: false
    },
    requestedAction: {
      commitNow: false,
      writeNow: false,
      durableWriteNow: false,
      productionWriteNow: false,
      callProviderNow: false,
      publishReadinessNow: false
    },
    counters: {
      operatorApprovalsAccepted: 0,
      commitExecutions: 0,
      memoryWrites: 0,
      memoryUpdates: 0,
      memorySupersedes: 0,
      memoryTombstones: 0,
      durableMemoryWrites: 0,
      durableAuditWrites: 0,
      providerApiCalls: 0,
      runtimeCalls: 0,
      liveVcpToolBoxCalls: 0,
      publicMcpExpansions: 0,
      approvalLineOperations: 0,
      approvalRequestSubmissions: 0,
      readinessClaims: 0
    },
    ...overrides
  };
}

test('CM2035 accepts operator-only commit preflight without committing memory', () => {
  const service = new MemoryDeltaCommitPreflightService();
  const result = service.preflight(validPreflightArgs());

  assert.equal(result.status, 'COMMIT_MEMORY_DELTA_PREFLIGHT_READY_FOR_FUTURE_OPERATOR_REVIEW');
  assert.equal(result.accepted, true);
  assert.match(result.proposal_id, /^memory-delta-[a-f0-9]{16}$/);
  assert.equal(result.operator_only, true);
  assert.equal(result.default_exposed, false);
  assert.equal(result.public_mcp_registered, false);
  assert.equal(result.exact_approval_required, true);
  assert.equal(result.exact_approval_accepted, false);
  assert.equal(result.commit_allowed_now, false);
  assert.equal(result.required_future_evidence.exact_operator_approval, 'requires_future_exact_operator_approval');
  assert.equal(result.required_future_evidence.durable_write_receipt, 'requires_future_exact_authorized_commit_receipt');
  assert.equal(result.preflight.operator_commit_path_prepared, true);
  assert.equal(result.preflight.durable_write_default, false);
  assert.equal(result.access.memory_written, false);
  assert.equal(result.access.durable_memory_written, false);
  assert.equal(result.access.production_write_performed, false);
  assert.equal(result.access.provider_api_called, false);
  assert.equal(result.access.public_mcp_expanded, false);
  assert.equal(result.access.readiness_claimed, false);
});

test('CM2035 blocks commit preflight without an accepted low-disclosure proposal', () => {
  const service = new MemoryDeltaCommitPreflightService();
  const result = service.preflight(validPreflightArgs({
    proposal: {
      accepted: false,
      proposal_only: true,
      proposal_id: 'memory-delta-0000000000000000'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'accepted_low_disclosure_proposal_required');
  assert.deepEqual(result.blockers, ['proposal']);
  assert.equal(result.memory_written, false);
  assert.equal(result.durable_memory_written, false);
});

test('CM2035 blocks commit preflight for a review-rejected proposal', () => {
  const proposalService = new MemoryDeltaProposalService();
  const rejectedProposal = proposalService.propose({
    task_id: 'CM-2035',
    task: {
      title: 'Rejected proposal must not enter commit preflight',
      project_id: 'codex-memory',
      client_id: 'codex',
      visibility: 'project'
    },
    evidence_refs: ['tests/memory-delta-commit-preflight-service.test.js'],
    candidates: [{
      target: 'process',
      intent: 'This candidate is explicitly rejected.',
      evidence_refs: ['CM-2035 rejected proposal fixture']
    }],
    review_decision: 'reject'
  });
  const service = new MemoryDeltaCommitPreflightService();
  const result = service.preflight(validPreflightArgs({ proposal: rejectedProposal }));

  assert.equal(rejectedProposal.status, 'PROPOSE_MEMORY_DELTA_REVIEW_REJECTED');
  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'accepted_low_disclosure_proposal_required');
  assert.deepEqual(result.blockers, ['proposal']);
});

test('CM2035 rejects accepted proposals with nested readiness overclaims', () => {
  const service = new MemoryDeltaCommitPreflightService();
  for (const mutateProposal of [
    proposal => { proposal.audit_receipt.readiness_claimed = true; },
    proposal => { proposal.governance_contract.readinessClaimed = true; },
    proposal => { proposal.access.readinessClaimed = true; }
  ]) {
    const proposal = acceptedProposal();
    mutateProposal(proposal);
    const result = service.preflight(validPreflightArgs({ proposal }));
    assert.equal(result.accepted, false);
    assert.equal(result.reasonCode, 'accepted_low_disclosure_proposal_required');
    assert.deepEqual(result.blockers, ['proposal']);
    assert.equal(result.readiness_claimed, false);
  }
});

test('CM2035 rejects accepted proposals that report nested provider or MCP side effects', () => {
  const service = new MemoryDeltaCommitPreflightService();
  for (const mutateProposal of [
    proposal => { proposal.audit_receipt.provider_api_called = true; },
    proposal => { proposal.audit_receipt.public_mcp_expanded = true; },
    proposal => { proposal.governance_contract.providerApiCalled = true; },
    proposal => { proposal.access.mcpMemoryWriteCalled = true; },
    proposal => { proposal.access.providerApiCalled = true; },
    proposal => { proposal.access.vcpToolBoxRuntimeCalled = true; },
    proposal => { proposal.access.publicMcpExpanded = true; }
  ]) {
    const proposal = acceptedProposal();
    mutateProposal(proposal);
    const result = service.preflight(validPreflightArgs({ proposal }));
    assert.equal(result.accepted, false);
    assert.equal(result.reasonCode, 'accepted_low_disclosure_proposal_required');
    assert.deepEqual(result.blockers, ['proposal']);
    assert.equal(result.provider_api_called, false);
    assert.equal(result.public_mcp_expanded, false);
  }
});

test('CM2035 stops L4 on default exposure approval acceptance commit write or readiness drift', () => {
  const service = new MemoryDeltaCommitPreflightService();
  const result = service.preflight(validPreflightArgs({
    operator: {
      defaultExposed: true,
      publicMcpRegistered: true,
      exactApprovalAccepted: true,
      commitExecutionAuthorized: true,
      durableWriteAuthorized: true,
      productionWriteAuthorized: true,
      providerCallAuthorized: true,
      readinessClaimAuthorized: true
    },
    requestedAction: {
      commitNow: true,
      writeNow: true,
      durableWriteNow: true,
      productionWriteNow: true,
      callProviderNow: true,
      publishReadinessNow: true
    },
    counters: {
      commitExecutions: 1,
      memoryWrites: 1,
      durableMemoryWrites: 1,
      providerApiCalls: 1,
      publicMcpExpansions: 1,
      readinessClaims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.ok(result.blockers.includes('operator.defaultExposed'));
  assert.ok(result.blockers.includes('operator.publicMcpRegistered'));
  assert.ok(result.blockers.includes('operator.exactApprovalAccepted'));
  assert.ok(result.blockers.includes('requestedAction.commitNow'));
  assert.ok(result.blockers.includes('requestedAction.writeNow'));
  assert.ok(result.blockers.includes('counters.commitExecutions'));
  assert.ok(result.blockers.includes('counters.memoryWrites'));
  assert.ok(result.blockers.includes('counters.durableMemoryWrites'));
  assert.ok(result.blockers.includes('counters.publicMcpExpansions'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assert.equal(result.memory_written, false);
  assert.equal(result.public_mcp_expanded, false);
});

test('CM2035 blocks top-level commit and write intent aliases', () => {
  const service = new MemoryDeltaCommitPreflightService();
  for (const field of [
    'commit',
    'write',
    'confirm',
    'durableWrite',
    'durable_write',
    'productionWrite',
    'production_write'
  ]) {
    const result = service.preflight(validPreflightArgs({ [field]: true }));
    assert.equal(result.accepted, false);
    assert.equal(result.reasonCode, 'stop_l4');
    assert.ok(result.blockers.includes(field));
  }
});

test('CM2035 stops L4 on top-level readiness claim aliases', () => {
  const service = new MemoryDeltaCommitPreflightService();
  for (const field of [
    'readinessClaimed',
    'rcReadyClaimed',
    'deployReadyClaimed',
    'fullCapabilityClaimed',
    'modelMemoryCompleteClaimed'
  ]) {
    const result = service.preflight(validPreflightArgs({ [field]: true }));
    assert.equal(result.accepted, false, field);
    assert.equal(result.reasonCode, 'stop_l4', field);
    assert.ok(result.blockers.includes(field), field);
    assert.equal(result.readiness_claimed, false, field);
  }
});

test('CM2035 requires the accepted proposal task to match the preflight task', () => {
  const service = new MemoryDeltaCommitPreflightService();
  const result = service.preflight(validPreflightArgs({ task_id: 'CM-9999' }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'proposal_task_mismatch');
  assert.deepEqual(result.blockers, ['proposal.task.task_id']);
  assert.equal(result.task.task_id, 'CM-9999');
});

test('CM2035 rejects raw secret private commit fields by path without echoing values', () => {
  const service = new MemoryDeltaCommitPreflightService();
  const result = service.preflight(validPreflightArgs({
    approvalLineValue: 'SYNTHETIC_APPROVAL_SHOULD_NOT_ECHO',
    rawPayload: 'SYNTHETIC_RAW_SHOULD_NOT_ECHO',
    proposal: {
      ...acceptedProposal(),
      memoryContent: 'SYNTHETIC_MEMORY_SHOULD_NOT_ECHO'
    },
    token: 'SYNTHETIC_TOKEN_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_or_private_commit_fields');
  assert.ok(result.forbiddenFields.includes('approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('rawPayload'));
  assert.ok(result.forbiddenFields.includes('proposal.memoryContent'));
  assert.ok(result.forbiddenFields.includes('token'));
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RAW_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_MEMORY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_TOKEN_SHOULD_NOT_ECHO'), false);
});

test('CM2035 redacts sensitive task titles in accepted and rejected preflight output', () => {
  const service = new MemoryDeltaCommitPreflightService();
  const rawBearer = ['Bearer', 'SYNTHETIC_PREFLIGHT_BEARER_1234567890'].join(' ');
  const rawPath = 'C:\\Users\\example\\private\\.env';
  const task = {
    title: `authorization: ${rawBearer} at ${rawPath}`,
    client_id: 'codex',
    visibility: 'project'
  };
  const accepted = service.preflight(validPreflightArgs({ task }));
  const rejected = service.preflight(validPreflightArgs({
    task,
    rawPayload: 'SYNTHETIC_RAW_PREFLIGHT_VALUE'
  }));

  assert.equal(accepted.accepted, true);
  assert.equal(rejected.accepted, false);
  for (const result of [accepted, rejected]) {
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes('SYNTHETIC_PREFLIGHT_BEARER_1234567890'), false);
    assert.equal(serialized.includes(rawPath), false);
    assert.match(result.task.title, /<redacted>/);
    assert.equal(result.low_disclosure, true);
    assert.equal(result.raw_values_included, false);
  }
});

test('CM2035 forbidden key collector reports paths only', () => {
  assert.deepEqual(collectForbiddenKeys({
    nested: [{ responseBody: 'SYNTHETIC_RESPONSE_SHOULD_NOT_ECHO' }],
    safe: true
  }), [
    'nested[0].responseBody'
  ]);
});
