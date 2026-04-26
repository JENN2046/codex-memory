const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { CompatibilitySyntaxAdapter } = require('../src/adapters/vcp-passive-memory/CompatibilitySyntaxAdapter');

async function withApp(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-phase-a-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data')
  });

  await app.initialize();

  try {
    await handler({ app, tempBasePath });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

test('record_memory should reject non-Codex writes', async () => {
  await withApp(async ({ app }) => {
    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint',
      content: 'checkpoint',
      evidence: 'evidence',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      executionContext: {
        agentAlias: 'Claude',
        agentId: 'claude-desktop',
        requestSource: 'wrong-agent'
      }
    });

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /CodexMemoryBridge/);
  });
});

test('shadow write failure should degrade but not reject after diary write', async () => {
  await withApp(async ({ app }) => {
    const originalUpsert = app.stores.shadowStore.upsertRecord.bind(app.stores.shadowStore);
    app.stores.shadowStore.upsertRecord = async () => {
      throw new Error('sqlite unavailable');
    };

    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint',
      content: 'stage-conclusion: keep writing\ncheckpoint',
      evidence: 'simulated failure',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'phase-a-test'
      }
    });

    assert.equal(result.decision, 'accepted');
    assert.equal(result.shadowWrite.status, 'degraded');

    const reconcileTasks = await app.stores.shadowStore.listReconcileTasks();
    assert.equal(reconcileTasks.length, 1);

    app.stores.shadowStore.upsertRecord = originalUpsert;
  });
});

test('rebuildShadowFromDiary should index existing diary files', async () => {
  await withApp(async ({ app, tempBasePath }) => {
    const diaryDir = path.join(tempBasePath, 'dailynote', 'Codex');
    await fs.mkdir(diaryDir, { recursive: true });
    await fs.writeFile(
      path.join(diaryDir, '2026-04-13-00_00_01-Checkpoint.txt'),
      [
        '[2026-04-13] - Codex',
        'Title: Restored checkpoint',
        'Memory-ID: codex-process-existing',
        'Record-Type: process',
        'Validated: yes',
        'Reusable: no',
        '',
        'Content:',
        'checkpoint restored from old diary',
        '',
        'Evidence:',
        'migration test',
        '',
        'Tag: restore, migration'
      ].join('\n'),
      'utf8'
    );

    const rebuild = await app.rebuildShadowFromDiary();
    assert.equal(rebuild.recordCount, 1);

    const stored = await app.stores.shadowStore.getRecord('codex-process-existing');
    assert.equal(stored.title, 'Restored checkpoint');
  });
});

test('CompatibilitySyntaxAdapter should parse passive blocks and directives', () => {
  const adapter = new CompatibilitySyntaxAdapter();
  const parsed = adapter.parse('[[checkpoint migration]] ::Time(7d) ::Rerank+0.7 ::TagMemo+1.2 <<topic memory>>');
  assert.equal(parsed.query, 'checkpoint migration');
  assert.equal(parsed.directives.time, '7d');
  assert.equal(parsed.directives.rerank, true);
  assert.equal(parsed.directives.rerankplus, 0.7);
  assert.equal(parsed.directives.tagmemo, 1.2);
  assert.equal(parsed.directives.geodesicrerank, true);
  assert.deepEqual(parsed.activeBlocks, ['topic memory']);
});
