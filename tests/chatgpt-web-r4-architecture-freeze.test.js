'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  loadManifest,
  loadSchema,
  validateArchitecture,
  validateDocMarkers,
  validateFrozenSchema,
  validateJsonSchema
} = require('../scripts/validate_chatgpt_web_r4_architecture');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('R4 architecture freeze accepts the canonical manifest and docs', () => {
  const result = validateArchitecture(loadManifest());
  validateDocMarkers();

  assert.deepEqual(result, {
    accepted: true,
    architectureReference: 'codex-memory-chatgpt-web-r4-v1',
    freezeStatus: 'frozen_for_implementation',
    canonicalRouteLength: 6,
    trustZoneCount: 5,
    repositoryBoundaryCount: 6,
    implementationStageCount: 7,
    tunnelCanonical: false,
    runtimeMutationPerformed: false,
    providerCallPerformed: false,
    realMemoryReadPerformed: false,
    publicToolSurfaceExpanded: false,
    readinessClaimed: false
  });
});

test('R4 freezes separate Edge, Relay, widget, contract, governance-adapter, and test roots', () => {
  const manifest = clone(loadManifest());
  assert.deepEqual(manifest.repositoryLayout, {
    sharedContractsRoot: 'packages/chatgpt-r4-contracts',
    publicEdgeRoot: 'apps/chatgpt-edge',
    localRelayRoot: 'apps/local-recall-relay',
    widgetRoot: 'apps/chatgpt-memory-scope-widget',
    governanceAdapterRoot: 'src/adapters/chatgpt-r4',
    testRoot: 'tests/chatgpt-r4',
    importFencesRequired: true,
    publicEdgeForbiddenImports: [
      'src/config',
      'src/storage',
      'src/recall',
      'src/adapters/vcp-active-memory',
      'src/adapters/vcp-light-memory',
      'src/adapters/vcp-passive-memory'
    ],
    localRelayForbiddenCapabilities: [
      'diary_mapping_load',
      'provider_invocation',
      'memory_storage',
      'scope_authorization'
    ]
  });

  manifest.repositoryLayout.publicEdgeRoot = 'src/core';
  assert.throws(
    () => validateArchitecture(manifest),
    /schema validation failed.*repositoryLayout\.publicEdgeRoot.*const mismatch/
  );
});

test('R4 rejects Tunnel as the canonical route', () => {
  const manifest = clone(loadManifest());
  manifest.transport.secureMcpTunnelCanonical = true;
  assert.throws(() => validateArchitecture(manifest), /must not be canonical/);
});

test('R4 binds the freeze date to the workspace Asia/Shanghai calendar', () => {
  const manifest = clone(loadManifest());
  assert.equal(manifest.decisionDate, '2026-07-18');
  assert.equal(manifest.decisionTimezone, 'Asia/Shanghai');

  manifest.decisionTimezone = 'UTC';
  assert.throws(
    () => validateArchitecture(manifest),
    /schema validation failed.*decisionTimezone.*const mismatch/
  );
});

test('R4 loads the frozen JSON Schema and rejects route or top-level shape drift', () => {
  const schema = loadSchema();
  validateFrozenSchema(schema);
  validateJsonSchema(loadManifest(), schema);

  const routeDrift = clone(loadManifest());
  routeDrift.canonicalRoute[1] = 'secure_mcp_tunnel';
  assert.throws(() => validateArchitecture(routeDrift), /schema validation failed.*canonicalRoute.*const mismatch/);

  const extraField = clone(loadManifest());
  extraField.undeclaredAuthority = true;
  assert.throws(() => validateArchitecture(extraField), /schema validation failed.*unknown property undeclaredAuthority/);
});

test('R4 rejects request-response binding and stage external-runtime authority drift', () => {
  const missingBinding = clone(loadManifest());
  missingBinding.envelope.requestAndResponseBindingRequired = false;
  assert.throws(() => validateArchitecture(missingBinding), /requestAndResponseBindingRequired must be true/);

  const prematureRuntime = clone(loadManifest());
  prematureRuntime.implementationStages.find(stage => stage.id === 'R4-B').externalRuntimeAllowed = true;
  assert.throws(() => validateArchitecture(prematureRuntime), /R4-B external-runtime authority mismatch/);
});

test('R4 canonical digests reject otherwise schema-valid manifest or schema drift', () => {
  const manifestDrift = clone(loadManifest());
  manifestDrift.objective = `${manifestDrift.objective} Drift.`;
  assert.throws(() => validateArchitecture(manifestDrift), /manifest canonical digest mismatch/);

  const schemaDrift = clone(loadSchema());
  schemaDrift.title = `${schemaDrift.title} drift`;
  assert.throws(() => validateFrozenSchema(schemaDrift), /schema canonical digest mismatch/);
});

test('R4 rejects remote durable memory, mapping, or request body logs', () => {
  for (const [field, value] of [
    ['durableMemoryStored', true],
    ['mappingStored', true],
    ['requestOrResponseBodyLoggingAllowed', true]
  ]) {
    const manifest = clone(loadManifest());
    manifest.remoteState[field] = value;
    assert.throws(() => validateArchitecture(manifest), new RegExp(`remoteState\\.${field}`));
  }
});

test('R4 keeps diary ACL authority local and rejects widget/tool authority', () => {
  const edgeAuthority = clone(loadManifest());
  edgeAuthority.trustZones.find(zone => zone.id === 'public_edge').diaryAclAuthority = true;
  assert.throws(() => validateArchitecture(edgeAuthority), /exactly one diary ACL authority/);

  for (const field of ['widgetStateAffectsAcl', 'toolArgumentsAffectDiaryAcl']) {
    const manifest = clone(loadManifest());
    manifest.scopeAuthority[field] = true;
    assert.throws(() => validateArchitecture(manifest), /must not affect ACL/);
  }
});

test('R4 rejects private/legacy access and any public write or proposal tool', () => {
  for (const field of ['chatgptPrivatePartitionAccess', 'legacyPartitionAccess']) {
    const manifest = clone(loadManifest());
    manifest.scopeAuthority[field] = true;
    assert.throws(() => validateArchitecture(manifest));
  }

  for (const field of ['writeTools', 'proposalTools']) {
    const manifest = clone(loadManifest());
    manifest.toolProfile[field] = ['forbidden_tool'];
    assert.throws(() => validateArchitecture(manifest), /tools are forbidden/);
  }
});

test('R4 rejects anonymous real-memory access and weakened envelope controls', () => {
  const anonymous = clone(loadManifest());
  anonymous.authorization.anonymousMemoryAccess = true;
  assert.throws(() => validateArchitecture(anonymous), /anonymous memory access is forbidden/);

  for (const field of ['signatureRequired', 'nonceRequired', 'expiryRequired', 'replayRejected', 'mappingBindingRequired', 'receiptChainRequired']) {
    const manifest = clone(loadManifest());
    manifest.envelope[field] = false;
    assert.throws(() => validateArchitecture(manifest), new RegExp(`envelope\\.${field}`));
  }
});

test('R4 allows bounded real-memory proof only in R4-F', () => {
  const premature = clone(loadManifest());
  premature.implementationStages.find(stage => stage.id === 'R4-E').realMemoryAllowed = true;
  assert.throws(() => validateArchitecture(premature), /R4-E real-memory authority mismatch/);

  const missing = clone(loadManifest());
  missing.implementationStages.find(stage => stage.id === 'R4-F').realMemoryAllowed = false;
  assert.throws(() => validateArchitecture(missing), /R4-F real-memory authority mismatch/);
});

test('R4 freeze cannot turn implementation or readiness non-claims true', () => {
  for (const field of ['edgeImplemented', 'runtimeConfigChanged', 'publicToolSurfaceExpanded', 'productionReady']) {
    const manifest = clone(loadManifest());
    manifest.nonClaims[field] = true;
    assert.throws(() => validateArchitecture(manifest), new RegExp(`nonClaims\\.${field}`));
  }
});
