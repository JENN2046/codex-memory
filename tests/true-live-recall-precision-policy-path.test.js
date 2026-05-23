'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');

async function withApp(handler, appOverrides = {}) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-precision-path-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    ...appOverrides
  });

  await app.initialize();

  try {
    await handler({ app });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

test('internal runner path forwards precision policy context into passive recall search', async () => {
  await withApp(async ({ app }) => {
    let capturedOptions = null;
    app.services.passiveRecallService.search = async (options) => {
      capturedOptions = options;
      return [];
    };

    const response = await app.callTool('search_memory', {
      query: 'xqzv-9137-lomdra-kepv-azmuth',
      target: 'both',
      limit: 5,
      include_content: false
    }, {
      noTokenReadOnly: true,
      executionContext: {
        requestSource: 'internal-true-live-recall-readonly-proof-runner',
        precisionPolicyContext: {
          enabled: true,
          queryFamily: 'stricter_negative_control',
          proofNoResultMode: true,
          minimumScore: 0.12,
          highConfidenceScore: 0.62
        }
      }
    });

    assert.deepEqual(response, { results: [] });
    assert.ok(capturedOptions);
    assert.equal(capturedOptions.readOnly, true);
    assert.deepEqual(capturedOptions.precisionPolicyContext, {
      enabled: true,
      queryFamily: 'stricter_negative_control',
      proofNoResultMode: true,
      minimumScore: 0.12,
      highConfidenceScore: 0.62
    });
  });
});

test('public or non-approved search path rejects injected precision policy context', async () => {
  await withApp(async ({ app }) => {
    await assert.rejects(
      () => app.callTool('search_memory', {
        query: 'should fail closed',
        target: 'both',
        limit: 1,
        include_content: false
      }, {
        executionContext: {
          requestSource: 'codex-memory-test',
          precisionPolicyContext: {
            enabled: true,
            queryFamily: 'stricter_negative_control',
            proofNoResultMode: true
          }
        }
      }),
      /approved true live recall runner path/
    );
  });
});

test('internal runner path rejects unsupported precision policy context keys before passive recall search', async () => {
  await withApp(async ({ app }) => {
    let capturedOptions = null;
    app.services.passiveRecallService.search = async (options) => {
      capturedOptions = options;
      return [];
    };

    await assert.rejects(
      () => app.callTool('search_memory', {
        query: 'should fail closed before passive recall',
        target: 'both',
        limit: 1,
        include_content: false
      }, {
        noTokenReadOnly: true,
        executionContext: {
          requestSource: 'internal-true-live-recall-readonly-proof-runner',
          precisionPolicyContext: {
            enabled: true,
            queryFamily: 'stricter_negative_control',
            unsupportedKey: true
          }
        }
      }),
      /unsupported keys: unsupportedKey/
    );

    assert.equal(capturedOptions, null);
  });
});

test('internal runner path rejects malformed precision policy values before passive recall search', async () => {
  await withApp(async ({ app }) => {
    let capturedOptions = null;
    app.services.passiveRecallService.search = async (options) => {
      capturedOptions = options;
      return [];
    };

    await assert.rejects(
      () => app.callTool('search_memory', {
        query: 'should reject malformed proofNoResultMode',
        target: 'both',
        limit: 1,
        include_content: false
      }, {
        noTokenReadOnly: true,
        executionContext: {
          requestSource: 'internal-true-live-recall-readonly-proof-runner',
          precisionPolicyContext: {
            enabled: true,
            queryFamily: 'stricter_negative_control',
            proofNoResultMode: 'true'
          }
        }
      }),
      /proofNoResultMode must be boolean/
    );

    await assert.rejects(
      () => app.callTool('search_memory', {
        query: 'should reject malformed minimumScore',
        target: 'both',
        limit: 1,
        include_content: false
      }, {
        noTokenReadOnly: true,
        executionContext: {
          requestSource: 'internal-true-live-recall-readonly-proof-runner',
          precisionPolicyContext: {
            enabled: true,
            queryFamily: 'stricter_negative_control',
            minimumScore: -0.1
          }
        }
      }),
      /minimumScore must be a finite non-negative number/
    );

    assert.equal(capturedOptions, null);
  });
});
