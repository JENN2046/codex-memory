const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

async function seedVchatFixture(rootPath) {
  const agentId = 'maid-keke';
  const topicAlphaId = 'topic_alpha';
  const topicBetaId = 'topic_beta';
  const alphaHistoryPath = path.join(rootPath, 'UserData', agentId, 'topics', topicAlphaId, 'history.json');
  const betaHistoryPath = path.join(rootPath, 'UserData', agentId, 'topics', topicBetaId, 'history.json');

  await fs.mkdir(path.join(rootPath, 'Agents', agentId), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'UserData', agentId, 'topics', topicAlphaId), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'UserData', agentId, 'topics', topicBetaId), { recursive: true });

  await fs.writeFile(
    path.join(rootPath, 'settings.json'),
    JSON.stringify({ userName: 'Master' }, null, 2),
    'utf8'
  );

  await fs.writeFile(
    path.join(rootPath, 'Agents', agentId, 'config.json'),
    JSON.stringify({
      name: 'Keke',
      topics: [
        { id: topicAlphaId, name: 'System Plan', createdAt: '2026-04-21T10:00:00.000Z', locked: false },
        { id: topicBetaId, name: 'Delivery Schedule', createdAt: '2026-04-21T12:00:00.000Z', locked: true }
      ]
    }, null, 2),
    'utf8'
  );

  await fs.writeFile(
    alphaHistoryPath,
    JSON.stringify([
      { role: 'user', content: 'We should discuss the codex-memory system plan.' },
      { role: 'assistant', content: 'Move DeepMemo first, then keep Phase C recall audit aligned.' }
    ], null, 2),
    'utf8'
  );

  await fs.writeFile(
    betaHistoryPath,
    JSON.stringify({
      messages: [
        { role: 'user', content: 'Delivery schedule also needs Phase C coverage.' },
        { role: 'assistant', content: 'Phase C tests should pass before review.' }
      ]
    }, null, 2),
    'utf8'
  );

  await fs.utimes(alphaHistoryPath, new Date('2026-04-21T10:05:00.000Z'), new Date('2026-04-21T10:05:00.000Z'));
  await fs.utimes(betaHistoryPath, new Date('2026-04-21T12:05:00.000Z'), new Date('2026-04-21T12:05:00.000Z'));
}

async function mutateVchatFixtureForIncrementalSync(rootPath) {
  const agentId = 'maid-keke';
  const configPath = path.join(rootPath, 'Agents', agentId, 'config.json');
  const alphaHistoryPath = path.join(rootPath, 'UserData', agentId, 'topics', 'topic_alpha', 'history.json');
  const betaTopicPath = path.join(rootPath, 'UserData', agentId, 'topics', 'topic_beta');
  const gammaTopicId = 'topic_gamma';
  const gammaTopicPath = path.join(rootPath, 'UserData', agentId, 'topics', gammaTopicId);
  const gammaHistoryPath = path.join(gammaTopicPath, 'history.json');

  await fs.writeFile(
    alphaHistoryPath,
    JSON.stringify([
      { role: 'user', content: 'We should discuss the codex-memory system plan.' },
      { role: 'assistant', content: 'Move DeepMemo first, then keep Phase C recall audit aligned.' },
      { role: 'assistant', content: 'Incremental sync should refresh this checkpoint.' }
    ], null, 2),
    'utf8'
  );
  await fs.utimes(alphaHistoryPath, new Date('2026-04-22T09:10:00.000Z'), new Date('2026-04-22T09:10:00.000Z'));

  await fs.rm(betaTopicPath, { recursive: true, force: true });

  await fs.mkdir(gammaTopicPath, { recursive: true });
  await fs.writeFile(
    gammaHistoryPath,
    JSON.stringify([
      { role: 'user', content: 'Please add a new active memory topic.' },
      { role: 'assistant', content: 'Gamma topic is now part of the incremental pipeline.' }
    ], null, 2),
    'utf8'
  );
  await fs.utimes(gammaHistoryPath, new Date('2026-04-22T09:20:00.000Z'), new Date('2026-04-22T09:20:00.000Z'));

  await fs.writeFile(
    configPath,
    JSON.stringify({
      name: 'Keke',
      topics: [
        { id: 'topic_alpha', name: 'System Plan', createdAt: '2026-04-21T10:00:00.000Z', locked: false },
        { id: gammaTopicId, name: 'Incremental Backfill', createdAt: '2026-04-22T09:15:00.000Z', locked: false }
      ]
    }, null, 2),
    'utf8'
  );
}

function runCli({ args = [], env = {} }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/active-memory.js', ...args], {
      cwd: 'A:\\codex-memory',
      env: {
        ...process.env,
        ...env
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', code => {
      resolve({ code, stdout, stderr });
    });
  });
}

test('active-memory CLI should rebuild, report health, and sync donor changes', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-active-memory-cli-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
  await seedVchatFixture(vchatRoot);

  try {
    const env = {
      CODEX_MEMORY_BASE_PATH: tempBasePath,
      CODEX_MEMORY_DATA_DIR: 'data',
      CODEX_MEMORY_LOGS_DIR: 'logs',
      CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot,
      CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0'
    };

    const rebuild = await runCli({
      args: ['rebuild', '--json'],
      env
    });
    assert.equal(rebuild.code, 0, rebuild.stderr);
    const rebuildPayload = JSON.parse(rebuild.stdout);
    assert.equal(rebuildPayload.command, 'rebuild');
    assert.equal(rebuildPayload.result.mode, 'rebuild');
    assert.equal(rebuildPayload.health.status, 'indexed');
    assert.equal(rebuildPayload.health.agentCount, 1);
    assert.equal(rebuildPayload.health.topicCount, 2);

    const health = await runCli({
      args: ['health', '--json'],
      env
    });
    assert.equal(health.code, 0, health.stderr);
    const healthPayload = JSON.parse(health.stdout);
    assert.equal(healthPayload.command, 'health');
    assert.equal(healthPayload.health.status, 'indexed');
    assert.equal(healthPayload.health.importedFrom, vchatRoot);

    await mutateVchatFixtureForIncrementalSync(vchatRoot);

    const sync = await runCli({
      args: ['sync', '--json'],
      env
    });
    assert.equal(sync.code, 0, sync.stderr);
    const syncPayload = JSON.parse(sync.stdout);
    assert.equal(syncPayload.command, 'sync');
    assert.equal(syncPayload.result.mode, 'incremental');
    assert.equal(syncPayload.result.changed, true);
    assert.equal(syncPayload.result.addedConversationCount, 1);
    assert.equal(syncPayload.result.updatedConversationCount, 1);
    assert.equal(syncPayload.result.removedConversationCount, 1);
    assert.equal(syncPayload.health.topicCount, 2);
    assert.equal(syncPayload.health.conversationCount, 2);
    assert.equal(syncPayload.health.lastSyncMode, 'incremental');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
