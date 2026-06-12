'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  PROFILES,
  buildVcpToolBoxFullCapabilityBridgePlan
} = require('../src/core/VcpToolBoxFullCapabilityBridgePlan');
const {
  DISCOVERY_SOURCES,
  FORBIDDEN_FIELD_NAMES,
  ZERO_COUNTER_FIELDS,
  buildVcpToolBoxRuntimeTargetLocatorPreflight
} = require('../src/core/VcpToolBoxRuntimeTargetLocatorPreflight');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] || 0]));
}

function basePolicy(overrides = {}) {
  return {
    allowLocatorValues: false,
    allowSecretMaterial: false,
    allowConfigEnvRead: false,
    allowRuntimeCall: false,
    allowBroadFilesystemScan: false,
    allowProviderCall: false,
    ...overrides
  };
}

function candidate(overrides = {}) {
  return {
    kind: 'local_checkout',
    referenceName: 'default-vcp-toolbox-path',
    discoverySource: 'default_path_probe',
    locatorHashPresent: true,
    locatorValueIncluded: false,
    secretMaterialIncluded: false,
    configEnvRead: false,
    runtimeCalled: false,
    observedPresent: false,
    runtimeEntrypointKnown: false,
    ...overrides
  };
}

function input(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    discoverySources: ['default_path_probe'],
    candidateTargets: [candidate()],
    policy: basePolicy(),
    counters: zeroCounters(),
    ...overrides
  };
}

function fullReadPlanFromTarget(target) {
  return buildVcpToolBoxFullCapabilityBridgePlan({
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    target,
    profile: PROFILES.TRUSTED_FULL_READ,
    components: [
      'DailyNote',
      'KnowledgeBaseManager',
      'TagMemo',
      'RAGDiaryPlugin'
    ],
    requestedActions: [
      'daily_note.read',
      'knowledge_base.search',
      'tagmemo.associate',
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
    }
  });
}

test('CM1690 accepts default path probe receipt when no VCPToolBox target is found', () => {
  const result = buildVcpToolBoxRuntimeTargetLocatorPreflight(input());

  assert.equal(result.accepted, true);
  assert.equal(result.noTargetFound, true);
  assert.deepEqual(result.acceptedTargets, []);
  assert.equal(result.nextAction, 'provide_operator_target_or_run_safe_locator_again');
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.configEnvRead, false);
  assert.equal(result.secretMaterialRead, false);
});

test('CM1690 accepts operator-provided sanitized local checkout target and feeds CM1689 plan', () => {
  const result = buildVcpToolBoxRuntimeTargetLocatorPreflight(input({
    discoverySources: ['operator_provided'],
    candidateTargets: [
      candidate({
        referenceName: 'operator-vcp-toolbox-checkout',
        discoverySource: 'operator_provided',
        observedPresent: true,
        runtimeEntrypointKnown: false
      })
    ]
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.noTargetFound, false);
  assert.equal(result.acceptedTargets.length, 1);
  assert.deepEqual(result.acceptedTargets[0], {
    kind: 'local_checkout',
    referenceName: 'operator-vcp-toolbox-checkout',
    locatorHashPresent: true,
    locatorValueIncluded: false,
    secretMaterialIncluded: false
  });

  const plan = fullReadPlanFromTarget(result.acceptedTargets[0]);
  assert.equal(plan.accepted, true);
  assert.equal(plan.profile, PROFILES.TRUSTED_FULL_READ);
});

test('CM1690 accepts service and MCP target references without endpoint values', () => {
  const result = buildVcpToolBoxRuntimeTargetLocatorPreflight(input({
    discoverySources: ['service_registry_reference', 'mcp_server_name'],
    candidateTargets: [
      candidate({
        kind: 'service_url',
        referenceName: 'vcp-toolbox-service-ref',
        discoverySource: 'service_registry_reference',
        observedPresent: true,
        runtimeEntrypointKnown: true
      }),
      candidate({
        kind: 'mcp_server',
        referenceName: 'vcp-toolbox-mcp-ref',
        discoverySource: 'mcp_server_name',
        observedPresent: true,
        runtimeEntrypointKnown: true
      })
    ]
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.foundTargets.length, 2);
  assert.ok(result.acceptedTargets.every(target => target.locatorValueIncluded === false));
  assert.ok(result.acceptedTargets.every(target => target.secretMaterialIncluded === false));
});

test('CM1690 rejects locator values secrets config-env paths and raw memory fields without echoing values', () => {
  const result = buildVcpToolBoxRuntimeTargetLocatorPreflight(input({
    candidateTargets: [
      candidate({
        locatorValue: 'A:/PRIVATE/VCPToolBox',
        endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
        bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO',
        configEnvPath: 'A:/VCP/VCPToolBox/config.env'
      })
    ],
    rawDailyNoteContent: 'RAW_DAILY_NOTE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_locator_secret_or_raw_fields');
  assert.ok(result.forbiddenFields.includes('candidateTargets[0].locatorValue'));
  assert.ok(result.forbiddenFields.includes('candidateTargets[0].endpoint'));
  assert.ok(result.forbiddenFields.includes('candidateTargets[0].bearerToken'));
  assert.ok(result.forbiddenFields.includes('candidateTargets[0].configEnvPath'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_DAILY_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1692 rejects locator-shaped candidate reference name without echoing the reference value', () => {
  const result = buildVcpToolBoxRuntimeTargetLocatorPreflight(input({
    candidateTargets: [
      candidate({
        referenceName: 'A:/PRIVATE/VCPToolBox'
      })
    ]
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_runtime_target_locator_contract');
  assert.ok(result.invalidFields.includes('candidateTargets[0].referenceName'));
  assert.equal(serialized.includes('PRIVATE/VCPToolBox'), false);
});

test('CM1690 rejects policy that allows secret runtime provider or broad-scan behavior', () => {
  const result = buildVcpToolBoxRuntimeTargetLocatorPreflight(input({
    policy: basePolicy({
      allowSecretMaterial: true,
      allowConfigEnvRead: true,
      allowRuntimeCall: true,
      allowBroadFilesystemScan: true,
      allowProviderCall: true
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_runtime_target_locator_contract');
  assert.ok(result.invalidFields.includes('policy.allowSecretMaterial'));
  assert.ok(result.invalidFields.includes('policy.allowConfigEnvRead'));
  assert.ok(result.invalidFields.includes('policy.allowRuntimeCall'));
  assert.ok(result.invalidFields.includes('policy.allowBroadFilesystemScan'));
  assert.ok(result.invalidFields.includes('policy.allowProviderCall'));
});

test('CM1690 rejects candidate that says config env was read or runtime was called', () => {
  const result = buildVcpToolBoxRuntimeTargetLocatorPreflight(input({
    candidateTargets: [
      candidate({
        configEnvRead: true,
        runtimeCalled: true,
        locatorValueIncluded: true,
        secretMaterialIncluded: true
      })
    ]
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_runtime_target_locator_contract');
  assert.ok(result.invalidFields.includes('candidateTargets[0].configEnvRead'));
  assert.ok(result.invalidFields.includes('candidateTargets[0].runtimeCalled'));
  assert.ok(result.invalidFields.includes('candidateTargets[0].locatorValueIncluded'));
  assert.ok(result.invalidFields.includes('candidateTargets[0].secretMaterialIncluded'));
});

test('CM1690 rejects positive execution counters', () => {
  const result = buildVcpToolBoxRuntimeTargetLocatorPreflight(input({
    counters: zeroCounters({
      configEnvReads: 1,
      runtimeCalls: 1,
      broadFilesystemScans: 1,
      providerApiCalls: 1
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_positive_execution_counters');
  assert.ok(result.forbiddenCounters.includes('configEnvReads'));
  assert.ok(result.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(result.forbiddenCounters.includes('broadFilesystemScans'));
  assert.ok(result.forbiddenCounters.includes('providerApiCalls'));
});

test('CM1690 rejects missing candidate fields and unknown discovery vocabulary', () => {
  const result = buildVcpToolBoxRuntimeTargetLocatorPreflight(input({
    discoverySources: ['unknown_source'],
    candidateTargets: [
      {
        kind: 'local_checkout',
        referenceName: 'incomplete-target',
        discoverySource: 'unknown_source'
      }
    ]
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_candidate_fields');
  assert.ok(result.missingFields.includes('candidateTargets[0].locatorHashPresent'));
  assert.ok(result.missingFields.includes('candidateTargets[0].runtimeCalled'));
});

test('CM1690 locks discovery and forbidden vocabulary', () => {
  assert.ok(DISCOVERY_SOURCES.includes('default_path_probe'));
  assert.ok(DISCOVERY_SOURCES.includes('operator_provided'));
  assert.ok(DISCOVERY_SOURCES.includes('service_registry_reference'));
  assert.ok(DISCOVERY_SOURCES.includes('mcp_server_name'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('configEnvPath'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('endpoint'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('bearerToken'));
});

test('CM1690 helper never performs runtime external provider memory or public MCP actions', () => {
  const result = buildVcpToolBoxRuntimeTargetLocatorPreflight(input());

  assert.equal(result.accepted, true);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.configEnvRead, false);
  assert.equal(result.envFileRead, false);
  assert.equal(result.secretMaterialRead, false);
  assert.equal(result.broadFilesystemScanPerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.rawStoreRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
  for (const value of Object.values(result.counters)) {
    assert.equal(value, 0);
  }
});
