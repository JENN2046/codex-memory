'use strict';

const crypto = require('node:crypto');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const {
  CHATGPT_WEB_PROBE_NONCE_TTL_MS
} = require('../src/core/constants');
const {
  MemoryOverviewService
} = require('../src/core/MemoryOverviewService');
const {
  validateChatGptWebStructuredContent
} = require('../src/core/ChatGptWebToolContract');
const {
  CHATGPT_WEB_PROFILE_IDS
} = require('../src/core/ChatGptWebProfile');
const {
  ToolArgumentValidationError,
  validateToolArguments
} = require('../src/core/ToolArgumentValidator');

const V0_PROBE_CONTEXT = Object.freeze({
  channelIdentity: 'chatgpt_web',
  chatgptWebProfileId: CHATGPT_WEB_PROFILE_IDS.TRANSPORT_PROBE_V0
});

function createNoTouchOverviewService({ clock, correlationIdFactory } = {}) {
  const touches = [];
  const rejectTouch = name => async () => {
    touches.push(name);
    throw new Error(`Probe must not touch ${name}.`);
  };
  return {
    touches,
    service: new MemoryOverviewService({
      config: { securityProfile: 'hardened' },
      auditLogStore: {
        readRecentWriteAudit: rejectTouch('audit.write'),
        readRecentRecallAudit: rejectTouch('audit.recall')
      },
      diaryStore: {
        listRecentFiles: rejectTouch('diary.list')
      },
      shadowStore: {
        getHealth: rejectTouch('shadow.health')
      },
      vectorStore: {
        getHealth: rejectTouch('vector.health')
      },
      candidateCacheStore: {
        getHealth: rejectTouch('candidate-cache.health')
      },
      chatHistoryIndexStore: {
        getHealth: rejectTouch('chat-history.health')
      },
      probeClock: clock,
      probeCorrelationIdFactory: correlationIdFactory
    })
  };
}

test('M3 v0 probe short-circuits all memory dependencies and blocks nonce replay in memory only', async () => {
  let now = 1_700_000_000_000;
  let correlationSequence = 0;
  const { service, touches } = createNoTouchOverviewService({
    clock: () => now,
    correlationIdFactory: () => `synthetic-correlation-${++correlationSequence}`
  });
  const probeNonce = 'synthetic-m3-probe-nonce-0001';
  const expectedDigest = crypto.createHash('sha256').update(probeNonce, 'utf8').digest('hex');

  const first = await service.getChatGptWebTransportProbe({
    probeNonce,
    requestContext: V0_PROBE_CONTEXT
  });
  validateChatGptWebStructuredContent('memory_overview', first);
  assert.equal(first.status, 'success');
  assert.equal(first.sourceRuntime, 'none');
  assert.equal(first.probe.probeNonceDigest, expectedDigest);
  assert.equal(first.probe.localMemoryReadPerformed, false);
  assert.equal(first.probe.nativeMemoryCallPerformed, false);
  assert.equal(first.probe.durableMemoryMutationCount, 0);
  assert.equal(first.probe.operationalAuditWriteCount, 0);
  assert.equal(first.probe.nonceStatePersistence, 'memory_only');
  assert.equal(JSON.stringify(first).includes(probeNonce), false);
  assert.deepEqual([...service.probeNonceExpiryByDigest.keys()], [expectedDigest]);

  const replay = await service.getChatGptWebTransportProbe({
    probeNonce,
    requestContext: V0_PROBE_CONTEXT
  });
  validateChatGptWebStructuredContent('memory_overview', replay);
  assert.equal(replay.status, 'rejected');
  assert.equal(replay.probe.probeNonceDigest, expectedDigest);
  assert.equal(JSON.stringify(replay).includes(probeNonce), false);

  now += CHATGPT_WEB_PROBE_NONCE_TTL_MS + 1;
  const afterExpiry = await service.getChatGptWebTransportProbe({
    probeNonce,
    requestContext: V0_PROBE_CONTEXT
  });
  validateChatGptWebStructuredContent('memory_overview', afterExpiry);
  assert.equal(afterExpiry.status, 'success');
  assert.deepEqual(touches, []);
});

test('M3 v0 probe rejects invalid or untrusted requests before any memory dependency', async () => {
  const { service, touches } = createNoTouchOverviewService();

  const invalid = await service.getChatGptWebTransportProbe({
    probeNonce: 'too-short',
    requestContext: V0_PROBE_CONTEXT
  });
  const wrongProfile = await service.getChatGptWebTransportProbe({
    probeNonce: 'synthetic-m3-probe-nonce-0002',
    requestContext: {
      ...V0_PROBE_CONTEXT,
      chatgptWebProfileId: CHATGPT_WEB_PROFILE_IDS.READ_ONLY_V1
    }
  });

  validateChatGptWebStructuredContent('memory_overview', invalid);
  validateChatGptWebStructuredContent('memory_overview', wrongProfile);
  assert.equal(invalid.status, 'rejected');
  assert.equal(invalid.probe, undefined);
  assert.equal(wrongProfile.status, 'rejected');
  assert.equal(wrongProfile.probe, undefined);
  assert.equal(service.probeNonceExpiryByDigest.size, 0);
  assert.deepEqual(touches, []);

  assert.doesNotThrow(() => {
    validateToolArguments('memory_overview', {
      probe_nonce: 'synthetic-m3-probe-nonce-0003'
    });
  });
  assert.throws(() => {
    validateToolArguments('memory_overview', { probe_nonce: 'too-short' });
  }, ToolArgumentValidationError);
});

test('M3 application route short-circuits probe_nonce before normal overview execution', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-m3-probe-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    chatgptWebProfileId: CHATGPT_WEB_PROFILE_IDS.TRANSPORT_PROBE_V0,
    chatgptWebProfileEnabled: true,
    chatgptWebProjectId: 'synthetic-project',
    chatgptWebWorkspaceId: 'synthetic-workspace',
    chatgptWebScopeId: 'synthetic-scope',
    chatgptWebVisibility: 'project'
  });

  try {
    const result = await app.callTool('memory_overview', {
      probe_nonce: 'synthetic-m3-probe-nonce-0004'
    }, V0_PROBE_CONTEXT);
    validateChatGptWebStructuredContent('memory_overview', result);
    assert.equal(result.status, 'success');
    assert.equal(result.probe.localMemoryReadPerformed, false);
    assert.equal(result.probe.nativeMemoryCallPerformed, false);
    assert.equal(result.probe.durableMemoryMutationCount, 0);
    assert.equal(result.probe.operationalAuditWriteCount, 0);

    const untrustedResult = await app.callTool('memory_overview', {
      probe_nonce: 'synthetic-m3-probe-nonce-0005'
    }, {});
    validateChatGptWebStructuredContent('memory_overview', untrustedResult);
    assert.equal(untrustedResult.status, 'rejected');
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
