'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  FORBIDDEN_FIELD_NAMES,
  PROFILES,
  READ_ACTIONS,
  SOURCE_COMPONENTS,
  WRITE_ACTIONS,
  WRITE_PROPOSAL_ACTIONS,
  ZERO_EXECUTION_COUNTERS,
  buildVcpToolBoxFullCapabilityBridgePlan,
  profileCapabilities
} = require('../src/core/VcpToolBoxFullCapabilityBridgePlan');

function baseInput(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    target: {
      kind: 'local_checkout',
      referenceName: 'operator-selected-vcp-toolbox',
      locatorHashPresent: true,
      locatorValueIncluded: false,
      secretMaterialIncluded: false
    },
    profile: PROFILES.TRUSTED_FULL_READ,
    components: [
      'DailyNote',
      'DailyNoteManager',
      'KnowledgeBaseManager',
      'TagMemo',
      'LightMemo',
      'TDBKnowledge',
      'DeepMemo',
      'TopicMemo',
      'MeshMemo',
      'RAGDiaryPlugin'
    ],
    requestedActions: [
      'daily_note.read',
      'knowledge_base.search',
      'tagmemo.associate',
      'deepmemo.recall',
      'topicmemo.recall',
      'rag_diary.inject_context'
    ],
    principal: {
      agentAlias: 'Codex',
      agentIdPresent: true,
      projectIdPresent: true,
      workspaceIdPresent: true,
      clientIdPresent: true,
      sessionIdPresent: true
    },
    limits: {
      maxRuntimeCalls: 12,
      timeoutMs: 30000,
      maxReturnedItems: 50,
      maxReturnedChars: 20000
    },
    ...overrides
  };
}

test('CM1689 accepts trusted-full-read without downgrading raw or structured VCP read capability', () => {
  const result = buildVcpToolBoxFullCapabilityBridgePlan(baseInput());

  assert.equal(result.accepted, true);
  assert.equal(result.profile, PROFILES.TRUSTED_FULL_READ);
  assert.equal(result.capabilities.fullRead, true);
  assert.equal(result.capabilities.rawOutputAllowed, true);
  assert.equal(result.capabilities.structuredOutputAllowed, true);
  assert.equal(result.capabilities.summaryOutputAllowed, true);
  assert.equal(result.capabilities.durableWriteAllowed, false);
  assert.equal(result.actionPlanOnly, true);
  assert.equal(result.runtimeExecutionAllowedByThisHelper, false);
  assert.equal(result.plannedOperations.length, 6);
  assert.ok(result.plannedOperations.every(operation => operation.executionStatus === 'planned_not_executed'));
  assert.ok(result.plannedOperations.every(operation => operation.rawOutputAllowed === true));
});

test('CM1689 accepts observe-full full read profile with no writes', () => {
  const result = buildVcpToolBoxFullCapabilityBridgePlan(baseInput({
    profile: PROFILES.OBSERVE_FULL,
    requestedActions: [
      'daily_note.read',
      'knowledge_base.search',
      'lightmemo.route',
      'rag_diary.inject_context'
    ]
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.capabilities.fullRead, true);
  assert.equal(result.capabilities.rawOutputAllowed, true);
  assert.equal(result.capabilities.durableWriteAllowed, false);
  assert.equal(result.capabilities.sustainedConversationUse, false);
});

test('CM1689 accepts trusted-write-proposal profile for proposal actions but not durable writes', () => {
  const proposalResult = buildVcpToolBoxFullCapabilityBridgePlan(baseInput({
    profile: PROFILES.TRUSTED_WRITE_PROPOSAL,
    requestedActions: [
      'knowledge_base.search',
      'daily_note.write_proposal',
      'tagmemo.write_proposal'
    ]
  }));

  assert.equal(proposalResult.accepted, true);
  assert.equal(proposalResult.capabilities.writeProposalAllowed, true);
  assert.equal(proposalResult.capabilities.durableWriteAllowed, false);

  const writeResult = buildVcpToolBoxFullCapabilityBridgePlan(baseInput({
    profile: PROFILES.TRUSTED_WRITE_PROPOSAL,
    requestedActions: [
      'daily_note.write'
    ]
  }));

  assert.equal(writeResult.accepted, false);
  assert.equal(writeResult.reasonCode, 'requested_actions_not_allowed_by_profile');
  assert.deepEqual(writeResult.rejectedActions, ['daily_note.write']);
  assert.equal(writeResult.memoryWritten, false);
});

test('CM1689 accepts trusted-full read and durable write call plan without executing it', () => {
  const result = buildVcpToolBoxFullCapabilityBridgePlan(baseInput({
    profile: PROFILES.TRUSTED_FULL,
    requestedActions: [
      'daily_note.read',
      'daily_note.write',
      'knowledge_base.write',
      'tagmemo.write'
    ]
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.capabilities.fullRead, true);
  assert.equal(result.capabilities.writeProposalAllowed, true);
  assert.equal(result.capabilities.durableWriteAllowed, true);
  assert.ok(result.allowedActions.includes('daily_note.write'));
  assert.ok(result.allowedActions.includes('knowledge_base.write'));
  assert.ok(result.allowedActions.includes('tagmemo.write'));
  assert.equal(result.runtimeExecutionAllowedByThisHelper, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.counters.durableMemoryWrites, 0);
});

test('CM1689 rejects durable write actions in observe and full-read profiles', () => {
  for (const profile of [PROFILES.OBSERVE_FULL, PROFILES.TRUSTED_FULL_READ]) {
    const result = buildVcpToolBoxFullCapabilityBridgePlan(baseInput({
      profile,
      requestedActions: [
        'daily_note.write'
      ]
    }));

    assert.equal(result.accepted, false);
    assert.equal(result.reasonCode, 'requested_actions_not_allowed_by_profile');
    assert.deepEqual(result.rejectedActions, ['daily_note.write']);
  }
});

test('CM1689 rejects missing target principal and unsupported component fields fail closed', () => {
  const result = buildVcpToolBoxFullCapabilityBridgePlan(baseInput({
    target: {
      kind: 'service_url',
      referenceName: 'named-runtime-target',
      locatorValueIncluded: false,
      secretMaterialIncluded: false
    },
    components: [
      'DailyNote',
      'UnknownPlugin'
    ],
    principal: {
      agentAlias: 'Codex',
      agentIdPresent: true,
      projectIdPresent: true,
      workspaceIdPresent: true,
      clientIdPresent: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_fields');
  assert.ok(result.missingFields.includes('target.locatorHashPresent'));
  assert.ok(result.missingFields.includes('principal.sessionIdPresent'));
  assert.equal(result.liveVcpToolBoxCalled, false);
});

test('CM1689 rejects secret endpoint raw and config-env shaped target fields without echoing values', () => {
  const result = buildVcpToolBoxFullCapabilityBridgePlan(baseInput({
    target: {
      kind: 'service_url',
      referenceName: 'named-runtime-target',
      locatorHashPresent: true,
      locatorValueIncluded: false,
      secretMaterialIncluded: false,
      endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
      bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO',
      configEnvPath: 'A:/VCP/VCPToolBox/config.env'
    },
    rawDailyNoteContent: 'RAW_DAILY_NOTE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_target_or_secret_fields');
  assert.ok(result.forbiddenFields.includes('target.endpoint'));
  assert.ok(result.forbiddenFields.includes('target.bearerToken'));
  assert.ok(result.forbiddenFields.includes('target.configEnvPath'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_DAILY_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1692 rejects locator-shaped target reference name without echoing the reference value', () => {
  const result = buildVcpToolBoxFullCapabilityBridgePlan(baseInput({
    target: {
      kind: 'service_url',
      referenceName: 'https://PRIVATE_REFERENCE_SHOULD_NOT_ECHO',
      locatorHashPresent: true,
      locatorValueIncluded: false,
      secretMaterialIncluded: false
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_full_capability_bridge_contract');
  assert.ok(result.invalidFields.includes('target.referenceName'));
  assert.equal(serialized.includes('PRIVATE_REFERENCE_SHOULD_NOT_ECHO'), false);
});

test('CM1689 rejects requested actions beyond runtime call limit', () => {
  const result = buildVcpToolBoxFullCapabilityBridgePlan(baseInput({
    limits: {
      maxRuntimeCalls: 1,
      timeoutMs: 30000,
      maxReturnedItems: 50,
      maxReturnedChars: 20000
    },
    requestedActions: [
      'daily_note.read',
      'knowledge_base.search'
    ]
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'requested_actions_exceed_runtime_call_limit');
  assert.ok(result.invalidFields.includes('requestedActions'));
});

test('CM1689 locks full-capability component profile and action vocabulary', () => {
  assert.ok(SOURCE_COMPONENTS.includes('DailyNote'));
  assert.ok(SOURCE_COMPONENTS.includes('KnowledgeBaseManager'));
  assert.ok(SOURCE_COMPONENTS.includes('RAGDiaryPlugin'));
  assert.ok(READ_ACTIONS.includes('rag_diary.inject_context'));
  assert.ok(WRITE_PROPOSAL_ACTIONS.includes('tagmemo.write_proposal'));
  assert.ok(WRITE_ACTIONS.includes('tagmemo.write'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('configEnvPath'));
  assert.equal(profileCapabilities(PROFILES.TRUSTED_FULL).durableWriteAllowed, true);
});

test('CM1689 helper never performs runtime external provider memory or public MCP actions', () => {
  const result = buildVcpToolBoxFullCapabilityBridgePlan(baseInput({
    profile: PROFILES.TRUSTED_FULL,
    requestedActions: [
      'daily_note.write'
    ]
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.configEnvRead, false);
  assert.equal(result.envFileRead, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.rawStoreRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
  for (const [key, value] of Object.entries(ZERO_EXECUTION_COUNTERS)) {
    assert.equal(result.counters[key], value);
  }
});
