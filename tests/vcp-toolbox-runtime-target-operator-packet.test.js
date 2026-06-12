'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  PROFILES,
  buildVcpToolBoxFullCapabilityBridgePlan
} = require('../src/core/VcpToolBoxFullCapabilityBridgePlan');
const {
  buildVcpToolBoxRuntimeTargetLocatorPreflight
} = require('../src/core/VcpToolBoxRuntimeTargetLocatorPreflight');
const {
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_NON_SECRET_ASSERTIONS,
  buildVcpToolBoxRuntimeTargetOperatorPacket
} = require('../src/core/VcpToolBoxRuntimeTargetOperatorPacket');

function packet(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    packetId: 'CM1691-OPERATOR-PACKET-001',
    operatorIntent: 'bind real VCPToolBox target as sanitized reference',
    target: {
      kind: 'local_checkout',
      referenceName: 'operator-vcp-toolbox-checkout',
      discoverySource: 'operator_provided',
      locatorHashPresent: true,
      locatorValueIncluded: false,
      secretMaterialIncluded: false,
      configEnvRead: false,
      runtimeCalled: false,
      observedPresent: true,
      runtimeEntrypointKnown: false
    },
    intendedProfile: PROFILES.TRUSTED_FULL,
    requestedActions: [
      'daily_note.read',
      'knowledge_base.search',
      'daily_note.write',
      'tagmemo.write'
    ],
    principalScope: {
      agentAlias: 'Codex',
      agentIdPresent: true,
      projectIdPresent: true,
      workspaceIdPresent: true,
      clientIdPresent: true,
      sessionIdPresent: true
    },
    nonSecretAssertions: {
      pathValueOmitted: true,
      endpointValueOmitted: true,
      tokenValueOmitted: true,
      configEnvValueOmitted: true,
      rawMemoryValueOmitted: true,
      locatorHashOnly: true,
      operatorOwnsTargetReference: true
    },
    ...overrides
  };
}

function buildFullPlan(target) {
  return buildVcpToolBoxFullCapabilityBridgePlan({
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    target,
    profile: PROFILES.TRUSTED_FULL,
    components: [
      'DailyNote',
      'KnowledgeBaseManager',
      'TagMemo'
    ],
    requestedActions: [
      'daily_note.read',
      'knowledge_base.search',
      'daily_note.write',
      'tagmemo.write'
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
    }
  });
}

test('CM1691 accepts non-secret operator packet and chains to CM1690 then CM1689', () => {
  const operatorResult = buildVcpToolBoxRuntimeTargetOperatorPacket(packet());

  assert.equal(operatorResult.accepted, true);
  assert.equal(operatorResult.operatorIntent, undefined);
  assert.equal(operatorResult.operatorIntentPresent, true);
  assert.equal(operatorResult.sanitizedTarget.referenceName, 'operator-vcp-toolbox-checkout');
  assert.equal(operatorResult.sanitizedTarget.locatorValueIncluded, false);
  assert.equal(operatorResult.sanitizedTarget.secretMaterialIncluded, false);
  assert.equal(operatorResult.configEnvRead, false);
  assert.equal(operatorResult.liveVcpToolBoxCalled, false);

  const locatorResult = buildVcpToolBoxRuntimeTargetLocatorPreflight(operatorResult.locatorPreflightInput);
  assert.equal(locatorResult.accepted, true);
  assert.equal(locatorResult.acceptedTargets.length, 1);

  const planResult = buildFullPlan(locatorResult.acceptedTargets[0]);
  assert.equal(planResult.accepted, true);
  assert.equal(planResult.profile, PROFILES.TRUSTED_FULL);
  assert.equal(planResult.capabilities.durableWriteAllowed, true);
  assert.equal(planResult.memoryWritten, false);
});

test('CM1691 accepts service target packet using reference name only', () => {
  const result = buildVcpToolBoxRuntimeTargetOperatorPacket(packet({
    target: {
      kind: 'service_url',
      referenceName: 'operator-vcp-toolbox-service-ref',
      discoverySource: 'service_registry_reference',
      locatorHashPresent: true,
      locatorValueIncluded: false,
      secretMaterialIncluded: false,
      configEnvRead: false,
      runtimeCalled: false,
      observedPresent: true,
      runtimeEntrypointKnown: true
    },
    intendedProfile: PROFILES.TRUSTED_FULL_READ,
    requestedActions: [
      'daily_note.read',
      'knowledge_base.search'
    ]
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.sanitizedTarget.kind, 'service_url');
  assert.equal(result.sanitizedTarget.referenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.sanitizedTarget.runtimeEntrypointKnown, true);
});

test('CM1691 rejects missing target principal and assertion fields', () => {
  const target = { ...packet().target };
  delete target.referenceName;
  const principalScope = { ...packet().principalScope };
  delete principalScope.sessionIdPresent;
  const nonSecretAssertions = { ...packet().nonSecretAssertions };
  delete nonSecretAssertions.tokenValueOmitted;

  const result = buildVcpToolBoxRuntimeTargetOperatorPacket(packet({
    target,
    principalScope,
    nonSecretAssertions
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_fields');
  assert.ok(result.missingFields.includes('target.referenceName'));
  assert.ok(result.missingFields.includes('principalScope.sessionIdPresent'));
  assert.ok(result.missingFields.includes('nonSecretAssertions.tokenValueOmitted'));
});

test('CM1691 rejects path endpoint token config-env and raw memory values without echoing them', () => {
  const result = buildVcpToolBoxRuntimeTargetOperatorPacket(packet({
    target: {
      ...packet().target,
      path: 'A:/PRIVATE/VCPToolBox',
      endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
      bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO',
      configEnvPath: 'A:/VCP/VCPToolBox/config.env'
    },
    rawDailyNoteContent: 'RAW_DAILY_NOTE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_secret_locator_or_raw_fields');
  assert.ok(result.forbiddenFields.includes('target.path'));
  assert.ok(result.forbiddenFields.includes('target.endpoint'));
  assert.ok(result.forbiddenFields.includes('target.bearerToken'));
  assert.ok(result.forbiddenFields.includes('target.configEnvPath'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_DAILY_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1692 rejects packet reference and intent values shaped like locators or secrets without echoing them', () => {
  const result = buildVcpToolBoxRuntimeTargetOperatorPacket(packet({
    packetId: 'https://PRIVATE_PACKET_SHOULD_NOT_ECHO',
    operatorIntent: 'use bearer token SECRET_INTENT_SHOULD_NOT_ECHO',
    target: {
      ...packet().target,
      referenceName: 'A:/PRIVATE/VCPToolBox'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_runtime_target_operator_packet');
  assert.ok(result.invalidFields.includes('packetId'));
  assert.ok(result.invalidFields.includes('operatorIntent'));
  assert.ok(result.invalidFields.includes('target.referenceName'));
  assert.equal(serialized.includes('PRIVATE_PACKET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_INTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE/VCPToolBox'), false);
});

test('CM1691 rejects target packet that includes locator or secret material flags', () => {
  const result = buildVcpToolBoxRuntimeTargetOperatorPacket(packet({
    target: {
      ...packet().target,
      locatorHashPresent: false,
      locatorValueIncluded: true,
      secretMaterialIncluded: true,
      configEnvRead: true,
      runtimeCalled: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_runtime_target_operator_packet');
  assert.ok(result.invalidFields.includes('target.locatorHashPresent'));
  assert.ok(result.invalidFields.includes('target.locatorValueIncluded'));
  assert.ok(result.invalidFields.includes('target.secretMaterialIncluded'));
  assert.ok(result.invalidFields.includes('target.configEnvRead'));
  assert.ok(result.invalidFields.includes('target.runtimeCalled'));
});

test('CM1691 rejects durable write actions under full-read profile', () => {
  const result = buildVcpToolBoxRuntimeTargetOperatorPacket(packet({
    intendedProfile: PROFILES.TRUSTED_FULL_READ,
    requestedActions: [
      'daily_note.read',
      'daily_note.write'
    ]
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'requested_actions_not_allowed_by_profile');
  assert.deepEqual(result.rejectedActions, ['daily_note.write']);
});

test('CM1691 rejects false non-secret assertions', () => {
  const result = buildVcpToolBoxRuntimeTargetOperatorPacket(packet({
    nonSecretAssertions: {
      ...packet().nonSecretAssertions,
      endpointValueOmitted: false,
      operatorOwnsTargetReference: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_runtime_target_operator_packet');
  assert.ok(result.invalidFields.includes('nonSecretAssertions.endpointValueOmitted'));
  assert.ok(result.invalidFields.includes('nonSecretAssertions.operatorOwnsTargetReference'));
});

test('CM1691 locks required non-secret and forbidden field vocabulary', () => {
  assert.ok(REQUIRED_NON_SECRET_ASSERTIONS.includes('pathValueOmitted'));
  assert.ok(REQUIRED_NON_SECRET_ASSERTIONS.includes('endpointValueOmitted'));
  assert.ok(REQUIRED_NON_SECRET_ASSERTIONS.includes('tokenValueOmitted'));
  assert.ok(REQUIRED_NON_SECRET_ASSERTIONS.includes('operatorOwnsTargetReference'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('endpoint'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('bearerToken'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('configEnvPath'));
});

test('CM1691 helper never performs runtime external provider memory or public MCP actions', () => {
  const result = buildVcpToolBoxRuntimeTargetOperatorPacket(packet());

  assert.equal(result.accepted, true);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.configEnvRead, false);
  assert.equal(result.envFileRead, false);
  assert.equal(result.secretMaterialRead, false);
  assert.equal(result.endpointOrPathValueAccepted, false);
  assert.equal(result.rawMemoryRead, false);
  assert.equal(result.broadFilesystemScanPerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
});
