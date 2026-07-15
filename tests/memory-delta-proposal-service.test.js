'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  MemoryDeltaProposalService,
  buildCommitContractDraft,
  collectForbiddenKeys
} = require('../src/core/MemoryDeltaProposalService');

function validProposalArgs(overrides = {}) {
  return {
    task_id: 'CM-2011',
    task: {
      title: 'Phase 6 proposal-only memory delta',
      project_id: 'codex-memory',
      client_id: 'codex',
      visibility: 'project'
    },
    evidence_refs: [
      'docs/near-model-memory-plan-pack/04_PHASE_PLAN.md#phase-6',
      'tests/memory-delta-proposal-service.test.js'
    ],
    candidates: [
      {
        target: 'process',
        intent: 'Phase 6 adds propose_memory_delta as proposal-only task-end memory delta staging.',
        evidence_refs: ['CM-2011 local fixture'],
        tags: ['phase-6', 'proposal-only'],
        reusable: true,
        sensitivity: 'low_disclosure_project_fact'
      }
    ],
    ...overrides
  };
}

test('CM2011 propose_memory_delta returns proposal-only staging with no durable write', () => {
  const service = new MemoryDeltaProposalService();
  const result = service.propose(validProposalArgs());

  assert.equal(result.status, 'PROPOSE_MEMORY_DELTA_ACCEPTED');
  assert.equal(result.accepted, true);
  assert.equal(result.proposal_only, true);
  assert.match(result.proposal_id, /^memory-delta-[a-f0-9]{16}$/);
  assert.equal(result.staging.staged, true);
  assert.equal(result.staging.durable, false);
  assert.equal(result.staging.production_write, false);
  assert.equal(result.staging.operator_commit_required, true);
  assert.equal(result.audit_receipt.low_disclosure, true);
  assert.equal(result.audit_receipt.raw_payload_included, false);
  assert.equal(result.audit_receipt.memory_written, false);
  assert.equal(result.audit_receipt.durable_memory_written, false);
  assert.equal(result.rollback_posture.current_step, 'proposal_only_no_runtime_state_to_rollback');
  assert.equal(result.rollback_posture.future_commit_requires_rollback_plan, true);
  assert.equal(result.commit_contract.tool, 'commit_memory_delta');
  assert.equal(result.commit_contract.operator_only, true);
  assert.equal(result.commit_contract.exposed_by_default, false);
  assert.equal(result.commit_contract.public_mcp_registered, false);
  assert.equal(result.commit_contract.exact_approval_required, true);
  assert.equal(result.access.memoryWritten, false);
  assert.equal(result.access.durableMemoryWritten, false);
  assert.equal(result.access.productionWritePerformed, false);
  assert.equal(result.access.mcpMemoryWriteCalled, false);
  assert.equal(result.access.providerApiCalled, false);
  assert.equal(result.access.vcpToolBoxRuntimeCalled, false);
  assert.equal(result.access.publicMcpExpanded, false);
  assert.equal(result.access.readinessClaimed, false);
  assert.equal(result.governance_contract.decision, 'proposal_mode_accept');
  assert.equal(result.governance_contract.memoryWritten, false);
  assert.equal(result.governance_contract.durableMemoryWritten, false);
});

test('CM2011 proposal_id binds normalized proposal content', () => {
  const service = new MemoryDeltaProposalService();
  const first = service.propose(validProposalArgs());
  const second = service.propose(validProposalArgs({
    candidates: [{
      target: 'process',
      intent: 'A materially different candidate with the same list sizes.',
      evidence_refs: ['CM-2011 local fixture'],
      tags: ['phase-6', 'proposal-only'],
      reusable: true,
      sensitivity: 'low_disclosure_project_fact'
    }]
  }));

  assert.notEqual(first.proposal_id, second.proposal_id);
  assert.match(first.proposal_id, /^memory-delta-[a-f0-9]{16}$/);
  assert.match(second.proposal_id, /^memory-delta-[a-f0-9]{16}$/);
});

test('CM2011 propose_memory_delta rejects missing evidence or candidates without writes', () => {
  const service = new MemoryDeltaProposalService();
  const result = service.propose(validProposalArgs({
    evidence_refs: [],
    candidates: []
  }));

  assert.equal(result.status, 'PROPOSE_MEMORY_DELTA_REJECTED');
  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'evidence_refs_and_candidate_memories_required');
  assert.equal(result.staging.staged, false);
  assert.equal(result.access.memoryWritten, false);
  assert.equal(result.access.providerApiCalled, false);
  assert.equal(result.commit_contract.operator_only, true);
});

test('CM2011 propose_memory_delta rejects raw secret write and readiness fields without echoing values', () => {
  const service = new MemoryDeltaProposalService();
  const result = service.propose({
    ...validProposalArgs(),
    rawPayload: 'SYNTHETIC_RAW_VALUE_SHOULD_NOT_ECHO',
    candidates: [
      {
        target: 'process',
        intent: 'safe shape',
        memory_id: 'SYNTHETIC_MEMORY_ID_SHOULD_NOT_ECHO',
        endpoint: 'SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'
      }
    ],
    token: 'SYNTHETIC_TOKEN_SHOULD_NOT_ECHO',
    productionReady: true
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_write_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('rawPayload'));
  assert.ok(result.forbiddenFields.includes('candidates[0].memory_id'));
  assert.ok(result.forbiddenFields.includes('candidates[0].endpoint'));
  assert.ok(result.forbiddenFields.includes('token'));
  assert.ok(result.forbiddenFields.includes('productionReady'));
  assert.equal(serialized.includes('SYNTHETIC_RAW_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_MEMORY_ID_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_TOKEN_SHOULD_NOT_ECHO'), false);
});

test('CM2011 proposal service rejects readiness aliases on direct internal calls', () => {
  const service = new MemoryDeltaProposalService();
  for (const key of [
    'rcReadyClaimed',
    'deployReadyClaimed',
    'fullCapabilityClaimed',
    'modelMemoryCompleteClaimed'
  ]) {
    const result = service.propose(validProposalArgs({ [key]: true }));
    assert.equal(result.accepted, false, key);
    assert.equal(result.reasonCode, 'forbidden_raw_secret_write_or_overclaim_fields', key);
    assert.deepEqual(result.forbiddenFields, [key], key);
    assert.equal(result.access.readinessClaimed, false, key);
  }
});

test('CM2011 propose_memory_delta redacts sensitive fragments from allowed proposal strings', () => {
  const service = new MemoryDeltaProposalService();
  const rawBearer = ['Bearer', 'SYNTHETIC_PROPOSAL_BEARER_1234567890'].join(' ');
  const rawApiKey = 'api_key=SYNTHETIC_PROPOSAL_API_KEY_1234567890';
  const rawPath = 'C:\\Users\\example\\private\\.env';
  const result = service.propose(validProposalArgs({
    task: {
      title: `Review ${rawBearer}`,
      project_id: 'codex-memory',
      client_id: 'codex',
      visibility: 'project'
    },
    evidence_refs: [rawPath, `fixture ${rawApiKey}`],
    candidates: [{
      target: 'process',
      summary: `Never echo ${rawBearer}`,
      evidence_refs: [`source ${rawApiKey}`, rawPath],
      tags: [`tag ${rawApiKey}`],
      reusable: true,
      sensitivity: `label ${rawApiKey}`
    }]
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(result.low_disclosure, true);
  assert.equal(result.raw_values_included, false);
  assert.equal(serialized.includes('SYNTHETIC_PROPOSAL_BEARER_1234567890'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROPOSAL_API_KEY_1234567890'), false);
  assert.equal(serialized.includes(rawPath), false);
  assert.match(serialized, /<redacted>/);
});

test('CM2011 propose_memory_delta rejects write commit or production intent', () => {
  const service = new MemoryDeltaProposalService();
  const result = service.propose(validProposalArgs({
    options: {
      commit: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_write_or_overclaim_fields');
  assert.equal(result.access.memoryWritten, false);
  assert.equal(result.access.durableMemoryWritten, false);
});

test('CM2035 commit_memory_delta contract points to operator preflight and stays unregistered by default', () => {
  const draft = buildCommitContractDraft();

  assert.deepEqual(draft, {
    tool: 'commit_memory_delta',
    status: 'operator_preflight_available_no_write',
    preflight_service: 'MemoryDeltaCommitPreflightService',
    exposed_by_default: false,
    public_mcp_registered: false,
    operator_only: true,
    exact_approval_required: true,
    requires_reviewed_proposal_id: true,
    requires_governance_receipt: true,
    requires_rollback_posture: true,
    durable_write_default: false,
    production_write_default: false,
    provider_call_allowed: false,
    readiness_claim_allowed: false
  });
});

test('CM2011 forbidden key collector reports paths only', () => {
  assert.deepEqual(
    collectForbiddenKeys({
      nested: [{ rawPayload: 'SYNTHETIC_RAW_VALUE_SHOULD_NOT_ECHO' }],
      safe: true
    }),
    ['nested[0].rawPayload']
  );
});
