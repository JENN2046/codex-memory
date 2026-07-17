'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  buildChatGptWebProfileConfig,
  CHATGPT_WEB_PROFILE_IDS
} = require('../src/core/ChatGptWebProfile');
const {
  CHATGPT_WEB_TOOL_CONTRACT_DIGEST,
  buildChatGptWebToolDefinition,
  validateChatGptWebStructuredContent
} = require('../src/core/ChatGptWebToolContract');
const {
  buildChatGptWebToolSnapshot,
  canonicalJson
} = require('../src/core/ChatGptWebToolSnapshot');
const {
  attachChatGptWebUdsPrivateConfig,
  getChatGptWebUdsPrivateConfig,
  normalizeChatGptWebUdsConfig
} = require('../src/core/ChatGptWebUdsConfig');

function buildProfile(profileId) {
  return buildChatGptWebProfileConfig({
    profileId,
    enabled: true,
    serverFixedScope: {
      projectId: 'synthetic-project',
      workspaceId: 'synthetic-workspace',
      scopeId: 'synthetic-scope',
      visibility: 'project'
    }
  });
}

test('ChatGPT web tool snapshots are canonical and profile-specific', () => {
  const v0 = buildProfile(CHATGPT_WEB_PROFILE_IDS.TRANSPORT_PROBE_V0);
  const v1 = buildProfile(CHATGPT_WEB_PROFILE_IDS.READ_ONLY_V1);
  const v0Tools = v0.exposedToolNames.map(buildChatGptWebToolDefinition);
  const v1Tools = v1.exposedToolNames.map(buildChatGptWebToolDefinition);
  const first = buildChatGptWebToolSnapshot(v0, v0Tools);
  const second = buildChatGptWebToolSnapshot(v0, [...v0Tools].reverse());
  const v1Snapshot = buildChatGptWebToolSnapshot(v1, v1Tools);

  assert.match(first.digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(
    CHATGPT_WEB_TOOL_CONTRACT_DIGEST,
    'sha256:d80eb417c856210002799bd93b2e964fd9b7c8e555a1fc2ae4a2571af824f1e6'
  );
  assert.equal(first.digest, second.digest);
  assert.notEqual(first.digest, v1Snapshot.digest);
  assert.deepEqual(first.manifest.exposedToolNames, ['memory_overview']);
  assert.equal(first.manifest.tools[0].annotations.readOnlyHint, true);
  assert.equal(first.manifest.tools[0].annotations.openWorldHint, false);
  assert.equal(
    canonicalJson({ z: 1, a: { y: true, x: false } }),
    canonicalJson({ a: { x: false, y: true }, z: 1 })
  );
});

test('ChatGPT web output contracts validate synthetic structured content and reject extra fields', () => {
  const syntheticOutput = {
    schemaVersion: 'chatgpt_memory_overview_v1',
    status: 'success',
    mode: 'overview',
    toolContractVersion: 'chatgpt_web_tool_contracts_v2',
    sourceRuntime: 'none',
    access: {},
    auditReceipt: {}
  };

  assert.doesNotThrow(() => {
    validateChatGptWebStructuredContent('memory_overview', syntheticOutput);
  });
  assert.throws(() => {
    validateChatGptWebStructuredContent('memory_overview', {
      ...syntheticOutput,
      project_id: 'must-not-be-public'
    });
  }, /not allowed/);
});

test('ChatGPT web UDS configuration keeps private socket and secret-file references non-enumerable', () => {
  const normalized = normalizeChatGptWebUdsConfig({
    basePath: process.cwd(),
    enabled: true,
    socketDirectory: '.synthetic-uds',
    socketName: 'synthetic.sock',
    bridgeAuthSecretFile: '.synthetic-bridge-auth',
    enabledProfileIds: [
      CHATGPT_WEB_PROFILE_IDS.TRANSPORT_PROBE_V0,
      CHATGPT_WEB_PROFILE_IDS.READ_ONLY_V1
    ]
  });
  const config = attachChatGptWebUdsPrivateConfig({
    chatgptWebUds: normalized.publicConfig
  }, normalized.privateConfig);
  const serialized = JSON.stringify(config);
  const privateConfig = getChatGptWebUdsPrivateConfig(config);

  assert.equal(config.chatgptWebUds.transport, 'unix_domain_socket_streamable_http');
  assert.equal(config.chatgptWebUds.publicListener, false);
  assert.equal(config.chatgptWebUds.tcpLoopbackFallback, false);
  assert.equal(config.chatgptWebUds.authorizationHeaderAccepted, false);
  assert.equal(serialized.includes('synthetic-bridge-auth'), false);
  assert.equal(serialized.includes('synthetic-uds'), false);
  assert.equal(privateConfig.socketName, 'synthetic.sock');
  assert.match(privateConfig.socketDirectory, /synthetic-uds/);
  assert.match(privateConfig.bridgeAuthSecretFile, /synthetic-bridge-auth/);
});
