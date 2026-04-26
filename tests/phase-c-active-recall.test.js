const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');

async function withApp(overrides = {}, handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-phase-c-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    ...overrides
  });

  await app.initialize();

  try {
    await handler({ app, tempBasePath });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

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
      { role: 'assistant', content: '<p>Move <strong>DeepMemo</strong> first, then keep Phase C recall audit aligned.</p>' },
      { role: 'user', content: 'Remember to keep TopicMemo compatible.' }
    ], null, 2),
    'utf8'
  );

  await fs.writeFile(
    betaHistoryPath,
    JSON.stringify({
      messages: [
        { role: 'user', content: 'Delivery schedule also needs Phase C coverage and benchmark tracking.' },
        { role: 'assistant', content: 'Phase C tests should pass before benchmark review.' }
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
      { role: 'assistant', content: '<p>Move <strong>DeepMemo</strong> first, then keep Phase C recall audit aligned.</p>' },
      { role: 'user', content: 'Remember to keep TopicMemo compatible.' },
      { role: 'assistant', content: 'Incremental sync should refresh this checkpoint without a full rebuild.' }
    ], null, 2),
    'utf8'
  );
  await fs.utimes(alphaHistoryPath, new Date('2026-04-22T09:10:00.000Z'), new Date('2026-04-22T09:10:00.000Z'));

  await fs.rm(betaTopicPath, { recursive: true, force: true });

  await fs.mkdir(gammaTopicPath, { recursive: true });
  await fs.writeFile(
    gammaHistoryPath,
    JSON.stringify([
      { role: 'user', content: 'Please add a new active memory topic for incremental backfill.' },
      { role: 'assistant', content: 'Gamma topic is now part of the active-memory incremental pipeline.' }
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
  await fs.utimes(configPath, new Date('2026-04-22T09:15:00.000Z'), new Date('2026-04-22T09:15:00.000Z'));
}

async function seedVchatTopicEdgeFixture(rootPath) {
  await seedVchatFixture(rootPath);

  const agentId = 'maid-keke';
  const configPath = path.join(rootPath, 'Agents', agentId, 'config.json');
  const emptyTopicId = 'topic_empty';
  const missingHistoryTopicId = 'topic_missing_history';
  const emptyTopicPath = path.join(rootPath, 'UserData', agentId, 'topics', emptyTopicId);
  const emptyHistoryPath = path.join(emptyTopicPath, 'history.json');

  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  config.topics.push(
    { id: emptyTopicId, name: 'Quiet Topic', createdAt: '2026-04-21T14:00:00.000Z', locked: false },
    { id: missingHistoryTopicId, name: 'Missing History', createdAt: '2026-04-21T15:00:00.000Z', locked: false }
  );
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

  await fs.mkdir(emptyTopicPath, { recursive: true });
  await fs.writeFile(emptyHistoryPath, JSON.stringify([], null, 2), 'utf8');
  await fs.utimes(emptyHistoryPath, new Date('2026-04-21T14:05:00.000Z'), new Date('2026-04-21T14:05:00.000Z'));
}

async function seedVchatNoSettingsFixture(rootPath) {
  await seedVchatFixture(rootPath);
  await fs.rm(path.join(rootPath, 'settings.json'), { force: true });
}

async function seedVchatEqualScoreFixture(rootPath) {
  const agentId = 'maid-keke';
  const topicId = 'topic_equal_score';
  const historyPath = path.join(rootPath, 'UserData', agentId, 'topics', topicId, 'history.json');

  await fs.mkdir(path.join(rootPath, 'Agents', agentId), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'UserData', agentId, 'topics', topicId), { recursive: true });

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
        { id: topicId, name: 'Equal Score Topic', createdAt: '2026-04-21T16:00:00.000Z', locked: false }
      ]
    }, null, 2),
    'utf8'
  );

  await fs.writeFile(
    historyPath,
    JSON.stringify([
      { role: 'user', content: 'checkpoint alpha' },
      { role: 'assistant', content: 'filler one' },
      { role: 'user', content: 'checkpoint beta' },
      { role: 'assistant', content: 'filler two' },
      { role: 'user', content: 'checkpoint gamma' }
    ], null, 2),
    'utf8'
  );

  await fs.utimes(historyPath, new Date('2026-04-21T16:05:00.000Z'), new Date('2026-04-21T16:05:00.000Z'));
}

async function seedVchatCrossTopicEqualScoreFixture(rootPath) {
  const agentId = 'maid-keke';
  const topicAlphaId = 'topic_alpha_equal';
  const topicBetaId = 'topic_beta_equal';
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
        { id: topicAlphaId, name: 'Alpha Equal', createdAt: '2026-04-21T10:00:00.000Z', locked: false },
        { id: topicBetaId, name: 'Beta Equal', createdAt: '2026-04-21T12:00:00.000Z', locked: false }
      ]
    }, null, 2),
    'utf8'
  );

  await fs.writeFile(
    alphaHistoryPath,
    JSON.stringify([
      { role: 'user', content: 'shared checkpoint token' }
    ], null, 2),
    'utf8'
  );

  await fs.writeFile(
    betaHistoryPath,
    JSON.stringify([
      { role: 'user', content: 'shared checkpoint token' }
    ], null, 2),
    'utf8'
  );

  await fs.utimes(alphaHistoryPath, new Date('2026-04-21T10:05:00.000Z'), new Date('2026-04-21T10:05:00.000Z'));
  await fs.utimes(betaHistoryPath, new Date('2026-04-21T12:05:00.000Z'), new Date('2026-04-21T12:05:00.000Z'));
}

async function seedVchatCompactWindowFixture(rootPath) {
  const agentId = 'maid-keke';
  const topicCompactId = 'topic_compact_window';
  const topicWideId = 'topic_wide_window';
  const compactHistoryPath = path.join(rootPath, 'UserData', agentId, 'topics', topicCompactId, 'history.json');
  const wideHistoryPath = path.join(rootPath, 'UserData', agentId, 'topics', topicWideId, 'history.json');
  const sharedUpdatedAt = new Date('2026-04-21T18:05:00.000Z');

  await fs.mkdir(path.join(rootPath, 'Agents', agentId), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'UserData', agentId, 'topics', topicCompactId), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'UserData', agentId, 'topics', topicWideId), { recursive: true });

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
        { id: topicCompactId, name: 'Compact Window', createdAt: '2026-04-21T18:00:00.000Z', locked: false },
        { id: topicWideId, name: 'Wide Window', createdAt: '2026-04-21T18:00:00.000Z', locked: false }
      ]
    }, null, 2),
    'utf8'
  );

  await fs.writeFile(
    compactHistoryPath,
    JSON.stringify([
      { role: 'user', content: 'density token alpha' },
      { role: 'assistant', content: 'neutral filler' }
    ], null, 2),
    'utf8'
  );

  await fs.writeFile(
    wideHistoryPath,
    JSON.stringify([
      { role: 'user', content: 'neutral filler' },
      { role: 'assistant', content: 'density token alpha' },
      { role: 'user', content: 'neutral filler' }
    ], null, 2),
    'utf8'
  );

  await fs.utimes(compactHistoryPath, sharedUpdatedAt, sharedUpdatedAt);
  await fs.utimes(wideHistoryPath, sharedUpdatedAt, sharedUpdatedAt);
}

async function seedVchatCompactVsFreshFixture(rootPath) {
  const agentId = 'maid-keke';
  const topicCompactId = 'topic_compact_older';
  const topicFreshId = 'topic_fresh_wider';
  const compactHistoryPath = path.join(rootPath, 'UserData', agentId, 'topics', topicCompactId, 'history.json');
  const freshHistoryPath = path.join(rootPath, 'UserData', agentId, 'topics', topicFreshId, 'history.json');

  await fs.mkdir(path.join(rootPath, 'Agents', agentId), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'UserData', agentId, 'topics', topicCompactId), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'UserData', agentId, 'topics', topicFreshId), { recursive: true });

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
        { id: topicCompactId, name: 'Compact Older', createdAt: '2026-04-21T18:00:00.000Z', locked: false },
        { id: topicFreshId, name: 'Fresh Wider', createdAt: '2026-04-21T19:00:00.000Z', locked: false }
      ]
    }, null, 2),
    'utf8'
  );

  await fs.writeFile(
    compactHistoryPath,
    JSON.stringify([
      { role: 'user', content: 'priority token alpha' },
      { role: 'assistant', content: 'neutral filler' }
    ], null, 2),
    'utf8'
  );

  await fs.writeFile(
    freshHistoryPath,
    JSON.stringify([
      { role: 'user', content: 'neutral filler' },
      { role: 'assistant', content: 'priority token alpha' },
      { role: 'user', content: 'neutral filler' }
    ], null, 2),
    'utf8'
  );

  await fs.utimes(
    compactHistoryPath,
    new Date('2026-04-21T18:05:00.000Z'),
    new Date('2026-04-21T18:05:00.000Z')
  );
  await fs.utimes(
    freshHistoryPath,
    new Date('2026-04-21T19:05:00.000Z'),
    new Date('2026-04-21T19:05:00.000Z')
  );
}

async function seedVchatTopicIdFallbackFixture(rootPath) {
  const agentId = 'maid-keke';
  const topicAlphaId = 'topic_alpha_fallback';
  const topicBetaId = 'topic_beta_fallback';
  const alphaHistoryPath = path.join(rootPath, 'UserData', agentId, 'topics', topicAlphaId, 'history.json');
  const betaHistoryPath = path.join(rootPath, 'UserData', agentId, 'topics', topicBetaId, 'history.json');
  const sharedUpdatedAt = new Date('2026-04-21T20:05:00.000Z');

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
        { id: topicAlphaId, name: 'Alpha Fallback', createdAt: '2026-04-21T20:00:00.000Z', locked: false },
        { id: topicBetaId, name: 'Beta Fallback', createdAt: '2026-04-21T20:00:00.000Z', locked: false }
      ]
    }, null, 2),
    'utf8'
  );

  await fs.writeFile(
    alphaHistoryPath,
    JSON.stringify([
      { role: 'user', content: 'stable fallback token' }
    ], null, 2),
    'utf8'
  );

  await fs.writeFile(
    betaHistoryPath,
    JSON.stringify([
      { role: 'user', content: 'stable fallback token' }
    ], null, 2),
    'utf8'
  );

  await fs.utimes(alphaHistoryPath, sharedUpdatedAt, sharedUpdatedAt);
  await fs.utimes(betaHistoryPath, sharedUpdatedAt, sharedUpdatedAt);
}

test('Phase C should rebuild active memory from donor-style VChat data and search chat history', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatFixture(vchatRoot);

    const rebuild = await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });
    assert.equal(rebuild.agentCount, 1);
    assert.equal(rebuild.topicCount, 2);
    assert.equal(rebuild.conversationCount, 2);

    const search = await app.adapters.vcpActiveMemoryAdapter.search('system plan DeepMemo recall audit', {
      maid: 'Keke',
      limit: 3,
      windowSize: 1,
      includeContent: true,
      exclude_latest: false
    });

    assert.equal(search.adapterStatus, 'phase-c-active-recall');
    assert.ok(search.results.length >= 1);
    assert.equal(search.mode, 'deepmemo');
    assert.equal(search.status, 'success');
    assert.equal(search.toolName, 'DeepMemo');
    assert.equal(search.tool_name, 'DeepMemo');
    assert.equal(search.maid, 'Keke');
    assert.equal(search.maidName, 'Keke');
    assert.equal(search.agentId, 'maid-keke');
    assert.equal(search.agent_id, 'maid-keke');
    assert.equal(search.keyword, 'system plan DeepMemo recall audit');
    assert.equal(search.windowSize, 1);
    assert.equal(search.window_size, 1);
    assert.equal(search.limit, 3);
    assert.equal(search.top_n, 3);
    assert.equal(search.query, 'system plan DeepMemo recall audit');
    assert.equal(search.results[0].target, 'chat');
    assert.equal(search.results[0].topicName, 'System Plan');
    assert.equal(search.results[0].memoryIndex, 1);
    assert.match(search.results[0].memoryLabel, /回忆片段1/);
    assert.match(search.results[0].resultText, /回忆片段1/);
    assert.equal(search.results[0].legacyResultText, search.results[0].resultText);
    assert.match(search.results[0].content, /DeepMemo/);
    assert.match(search.results[0].content, /recall audit/i);
    assert.equal(search.resultCount, search.results.length);
    assert.equal(search.result_count, search.results.length);
    assert.equal(search.hasResults, true);
    assert.equal(search.memories.length, search.results.length);
    assert.equal(search.memories[0], search.results[0].resultText);
    assert.match(search.outputText, /回忆片段1/);
    assert.doesNotMatch(search.outputText, /query:/);
    assert.doesNotMatch(search.outputText, /results:/);
    assert.equal(search.result, search.outputText);
    assert.equal(search.legacyResult, search.outputText);
  });
});

test('Phase C should list topics and return formatted topic content', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    const topics = await app.adapters.vcpActiveMemoryAdapter.listTopics({ maid: 'Keke' });
    assert.equal(topics.adapterStatus, 'phase-c-active-recall');
    assert.equal(topics.mode, 'topicmemo:list');
    assert.equal(topics.status, 'success');
    assert.equal(topics.toolName, 'TopicMemo');
    assert.equal(topics.tool_name, 'TopicMemo');
    assert.equal(topics.command, 'ListTopics');
    assert.equal(topics.maid, 'Keke');
    assert.equal(topics.maidName, 'Keke');
    assert.equal(topics.agentId, 'maid-keke');
    assert.equal(topics.agent_id, 'maid-keke');
    assert.equal(topics.topics.length, 2);
    assert.equal(topics.topicCount, 2);
    assert.equal(topics.topic_count, 2);
    assert.equal(topics.hasTopics, true);
    assert.equal(topics.topics[0].maidName, 'Keke');
    assert.equal(topics.topics[0].topicId, 'topic_alpha');
    assert.equal(topics.topics[1].topicId, 'topic_beta');
    assert.match(topics.outputText, /## Keke 的话题列表/);
    assert.match(topics.outputText, /创建时间:/);
    assert.match(topics.outputText, /🔒/);
    assert.doesNotMatch(topics.outputText, /Created:/);
    assert.doesNotMatch(topics.outputText, /Messages:/);
    assert.equal(topics.result, topics.outputText);
    assert.equal(topics.legacyResult, topics.outputText);

    const topic = await app.adapters.vcpActiveMemoryAdapter.getTopicContent({
      maid: 'Keke',
      topic_id: 'topic_alpha',
      include_messages: true
    });

    assert.equal(topic.adapterStatus, 'phase-c-active-recall');
    assert.equal(topic.mode, 'topicmemo:get');
    assert.equal(topic.status, 'success');
    assert.equal(topic.toolName, 'TopicMemo');
    assert.equal(topic.tool_name, 'TopicMemo');
    assert.equal(topic.command, 'GetTopicContent');
    assert.equal(topic.maid, 'Keke');
    assert.equal(topic.maidName, 'Keke');
    assert.equal(topic.agentId, 'maid-keke');
    assert.equal(topic.agent_id, 'maid-keke');
    assert.equal(topic.topicId, 'topic_alpha');
    assert.equal(topic.topic_id, 'topic_alpha');
    assert.equal(topic.topicName, 'System Plan');
    assert.equal(topic.historyStatus, 'ready');
    assert.equal(topic.topic.topicName, 'System Plan');
    assert.equal(topic.topic.messageCount, 3);
    assert.match(topic.topic.formattedContent, /Master:/);
    assert.match(topic.topic.formattedContent, /Keke:/);
    assert.doesNotMatch(topic.topic.formattedContent, /<strong>/);
    assert.match(topic.outputText, /\*\*Master\*\*:/);
    assert.match(topic.outputText, /\*\*Keke\*\*:/);
    assert.match(topic.outputText, /## 话题：System Plan/);
    assert.match(topic.outputText, /创建时间：/);
    assert.match(topic.outputText, /消息数量：3 条/);
    assert.doesNotMatch(topic.outputText, /Updated:/);
    assert.equal(topic.result, topic.outputText);
    assert.equal(topic.legacyResult, topic.outputText);
  });
});

test('Phase C should preserve donor-style topic list order and deepmemo topic recency order', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    const topics = await app.adapters.vcpActiveMemoryAdapter.listTopics({
      maid: 'Keke',
      allow_auto_backfill: false
    });
    assert.deepEqual(
      topics.topics.map(topic => topic.topicId),
      ['topic_alpha', 'topic_beta']
    );

    const search = await app.adapters.vcpActiveMemoryAdapter.search('Phase C', {
      maid: 'Keke',
      limit: 5,
      exclude_latest: false,
      allow_auto_backfill: false
    });

    assert.ok(search.results.length >= 2);
    assert.equal(search.results[0].topicId, 'topic_beta');
    assert.ok(search.results.some(result => result.topicId === 'topic_alpha'));
  });
});

test('Phase C should prefer the newer hit window when same-topic DeepMemo scores tie', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-equal-score-fixture');
    await seedVchatEqualScoreFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    const search = await app.adapters.vcpActiveMemoryAdapter.search('checkpoint', {
      maid: 'Keke',
      limit: 3,
      window_size: 0,
      exclude_latest: false,
      allow_auto_backfill: false
    });

    assert.equal(search.results.length, 3);
    assert.deepEqual(
      search.results.map(result => result.hitMessageIndex),
      [4, 2, 0]
    );
    assert.match(search.results[0].content, /checkpoint gamma/);
    assert.match(search.results[1].content, /checkpoint beta/);
    assert.match(search.results[2].content, /checkpoint alpha/);
  });
});

test('Phase C should prefer the fresher topic when cross-topic DeepMemo scores tie', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-cross-topic-equal-score-fixture');
    await seedVchatCrossTopicEqualScoreFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    const search = await app.adapters.vcpActiveMemoryAdapter.search('shared checkpoint token', {
      maid: 'Keke',
      limit: 2,
      window_size: 0,
      exclude_latest: false,
      allow_auto_backfill: false
    });

    assert.equal(search.results.length, 2);
    assert.deepEqual(
      search.results.map(result => result.topicId),
      ['topic_beta_equal', 'topic_alpha_equal']
    );
    assert.ok(
      new Date(search.results[0].updatedAt).getTime() > new Date(search.results[1].updatedAt).getTime()
    );
  });
});

test('Phase C should prefer the more compact hit window when cross-topic DeepMemo scores tie', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-compact-window-fixture');
    await seedVchatCompactWindowFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    const search = await app.adapters.vcpActiveMemoryAdapter.search('density token alpha', {
      maid: 'Keke',
      limit: 2,
      window_size: 1,
      exclude_latest: false,
      allow_auto_backfill: false
    });

    assert.equal(search.results.length, 2);
    assert.deepEqual(
      search.results.map(result => result.topicId),
      ['topic_compact_window', 'topic_wide_window']
    );
    assert.deepEqual(
      search.results.map(result => result.windowEndExclusive - result.windowStart),
      [2, 3]
    );
    assert.equal(search.results[0].score, search.results[1].score);
    assert.equal(search.results[0].updatedAt, search.results[1].updatedAt);
  });
});

test('Phase C should keep compactness ahead of freshness when cross-topic DeepMemo tie-breakers conflict', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-compact-vs-fresh-fixture');
    await seedVchatCompactVsFreshFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    const search = await app.adapters.vcpActiveMemoryAdapter.search('priority token alpha', {
      maid: 'Keke',
      limit: 2,
      window_size: 1,
      exclude_latest: false,
      allow_auto_backfill: false
    });

    assert.equal(search.results.length, 2);
    assert.deepEqual(
      search.results.map(result => result.topicId),
      ['topic_compact_older', 'topic_fresh_wider']
    );
    assert.deepEqual(
      search.results.map(result => result.windowEndExclusive - result.windowStart),
      [2, 3]
    );
    assert.equal(search.results[0].score, search.results[1].score);
    assert.ok(
      new Date(search.results[0].updatedAt).getTime() < new Date(search.results[1].updatedAt).getTime()
    );
  });
});

test('Phase C should fall back to lexical topicId order when cross-topic DeepMemo tie-breakers fully tie', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-topicid-fallback-fixture');
    await seedVchatTopicIdFallbackFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    const search = await app.adapters.vcpActiveMemoryAdapter.search('stable fallback token', {
      maid: 'Keke',
      limit: 2,
      window_size: 0,
      exclude_latest: false,
      allow_auto_backfill: false
    });

    assert.equal(search.results.length, 2);
    assert.deepEqual(
      search.results.map(result => result.topicId),
      ['topic_alpha_fallback', 'topic_beta_fallback']
    );
    assert.equal(search.results[0].score, search.results[1].score);
    assert.equal(search.results[0].updatedAt, search.results[1].updatedAt);
    assert.equal(
      search.results[0].windowEndExclusive - search.results[0].windowStart,
      search.results[1].windowEndExclusive - search.results[1].windowStart
    );
  });
});

test('Phase C should clamp donor-style window_size to at least one adjacent message', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    const search = await app.adapters.vcpActiveMemoryAdapter.search('DeepMemo', {
      maid: 'Keke',
      limit: 1,
      window_size: 0,
      exclude_latest: false,
      allow_auto_backfill: false
    });

    assert.equal(search.results.length, 1);
    assert.equal(search.results[0].topicId, 'topic_alpha');
    assert.equal(search.results[0].windowStart, 0);
    assert.equal(search.results[0].windowEndExclusive, 3);
    assert.match(search.results[0].content, /Master: We should discuss the codex-memory system plan\./);
    assert.match(search.results[0].content, /Master: Remember to keep TopicMemo compatible\./);
  });
});

test('Phase C should honor donor-style DeepMemo advanced syntax clauses and fullwidth commas', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    const alphaSearch = await app.adapters.vcpActiveMemoryAdapter.search(
      '"system plan",(DeepMemo:1.6),{TopicMemo|benchmark:1.2},[schedule:0.4]',
      {
        maid: 'Keke',
        limit: 5,
        exclude_latest: false,
        allow_auto_backfill: false
      }
    );

    assert.ok(alphaSearch.results.length >= 1);
    const alphaResult = alphaSearch.results.find(result => result.topicId === 'topic_alpha');
    const betaResult = alphaSearch.results.find(result => result.topicId === 'topic_beta');
    assert.ok(alphaResult);
    assert.ok(alphaResult.matchedKeywords.includes('system plan'));
    assert.ok(alphaResult.matchedKeywords.includes('deepmemo'));
    assert.ok(alphaResult.matchedKeywords.includes('topicmemo'));
    assert.ok((alphaResult.matchedClauseCount || 0) >= 3);
    if (betaResult) {
      assert.ok((alphaResult.matchedClauseCount || 0) > (betaResult.matchedClauseCount || 0));
    }

    const betaSearch = await app.adapters.vcpActiveMemoryAdapter.search(
      '(Phase C:1.4)，{schedule|coverage:1.3}，[DeepMemo:0.2]',
      {
        maid: 'Keke',
        limit: 5,
        exclude_latest: false,
        allow_auto_backfill: false
      }
    );

    assert.ok(betaSearch.results.length >= 1);
    assert.ok(betaSearch.results.every(result => result.topicId === 'topic_beta'));
    assert.ok(betaSearch.results[0].matchedKeywords.includes('phase c'));
    assert.ok(
      betaSearch.results[0].matchedKeywords.includes('schedule')
      || betaSearch.results[0].matchedKeywords.includes('coverage')
    );
    assert.ok((betaSearch.results[0].matchedClauseCount || 0) >= 2);
  });
});

test('Phase C adapter should support donor-style aliases and command dispatch', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    const deepMemo = await app.adapters.vcpActiveMemoryAdapter.execute('', {
      maid: 'Keke',
      keyword: '"system plan" DeepMemo',
      window_size: 1,
      exclude_latest: false,
      limit: 2
    });

    assert.equal(deepMemo.mode, 'deepmemo');
    assert.equal(deepMemo.status, 'success');
    assert.ok(deepMemo.results.length >= 1);
    assert.match(deepMemo.outputText, /回忆片段1/);
    assert.match(deepMemo.outputText, /DeepMemo/);
    assert.doesNotMatch(deepMemo.outputText, /query:/);
    assert.equal(deepMemo.memories[0], deepMemo.results[0].resultText);
    assert.equal(deepMemo.result, deepMemo.outputText);

    const topicList = await app.adapters.vcpActiveMemoryAdapter.execute({
      command: 'ListTopics',
      maid: 'Keke'
    });

    assert.equal(topicList.mode, 'topicmemo:list');
    assert.equal(topicList.status, 'success');
    assert.equal(topicList.topics.length, 2);
    assert.match(topicList.outputText, /共 2 个话题：/);

    const defaultTopicList = await app.adapters.vcpActiveMemoryAdapter.execute({
      maid: 'Keke'
    });

    assert.equal(defaultTopicList.mode, 'topicmemo:list');
    assert.equal(defaultTopicList.command, 'ListTopics');
    assert.match(defaultTopicList.outputText, /Keke 的话题列表/);

    const topicContent = await app.adapters.vcpActiveMemoryAdapter.execute({
      command: 'GetTopicContent',
      maid: 'Keke',
      topic_id: 'topic_alpha'
    });

    assert.equal(topicContent.mode, 'topicmemo:get');
    assert.equal(topicContent.status, 'success');
    assert.equal(topicContent.topic.topicId, 'topic_alpha');
    assert.match(topicContent.outputText, /消息数量：3 条/);
  });
});

test('Phase C adapter should reject missing donor-required params and unknown commands', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    await assert.rejects(
      () => app.adapters.vcpActiveMemoryAdapter.search('DeepMemo'),
      error => {
        assert.equal(error.status, 'error');
        assert.equal(error.toolName, 'DeepMemo');
        assert.equal(error.code, 'missing-maid');
        assert.match(error.message, /\[DeepMemo\] 请求中缺少 'maid' 参数。/);
        return true;
      }
    );

    await assert.rejects(
      () => app.adapters.vcpActiveMemoryAdapter.search('', { maid: 'Keke' }),
      error => {
        assert.equal(error.status, 'error');
        assert.equal(error.toolName, 'DeepMemo');
        assert.equal(error.code, 'missing-keyword');
        assert.match(error.message, /\[DeepMemo\] 请求中缺少 'keyword' 参数。/);
        return true;
      }
    );

    await assert.rejects(
      () => app.adapters.vcpActiveMemoryAdapter.listTopics({}),
      error => {
        assert.equal(error.status, 'error');
        assert.equal(error.toolName, 'TopicMemo');
        assert.equal(error.code, 'missing-maid');
        assert.match(error.message, /\[TopicMemo\] 请求中缺少 'maid' 参数。/);
        return true;
      }
    );

    await assert.rejects(
      () => app.adapters.vcpActiveMemoryAdapter.execute({ command: 'UnknownCommand', maid: 'Keke' }),
      error => {
        assert.equal(error.status, 'error');
        assert.equal(error.toolName, 'TopicMemo');
        assert.equal(error.code, 'unknown-command');
        assert.match(error.message, /\[TopicMemo\] 未知的指令: UnknownCommand，支持的指令: ListTopics, GetTopicContent/);
        return true;
      }
    );

    await assert.rejects(
      () => app.adapters.vcpActiveMemoryAdapter.getTopicContent({ maid: 'Keke' }),
      error => {
        assert.equal(error.status, 'error');
        assert.equal(error.toolName, 'TopicMemo');
        assert.equal(error.code, 'missing-topic-id');
        assert.match(error.message, /\[TopicMemo\] 请求中缺少 'topic_id' 参数。/);
        return true;
      }
    );

    await assert.rejects(
      () => app.adapters.vcpActiveMemoryAdapter.getTopicContent({ maid: 'Keke', topic_id: 'topic_missing' }),
      error => {
        assert.equal(error.status, 'error');
        assert.equal(error.toolName, 'TopicMemo');
        assert.equal(error.code, 'topic-not-found');
        assert.match(error.message, /\[TopicMemo\] 未找到 ID 为 "topic_missing" 的话题。可用的话题ID请先使用 ListTopics 指令查询。/);
        return true;
      }
    );
  });
});

test('Phase C should align donor-style agent lookup and topic history edge semantics', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatTopicEdgeFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    await assert.rejects(
      () => app.adapters.vcpActiveMemoryAdapter.search('DeepMemo', { maid: 'MissingMaid' }),
      error => {
        assert.equal(error.status, 'error');
        assert.equal(error.toolName, 'DeepMemo');
        assert.equal(error.code, 'agent-not-found');
        assert.match(error.message, /\[DeepMemo\] 未找到名为 "MissingMaid" 的Agent。/);
        return true;
      }
    );

    await assert.rejects(
      () => app.adapters.vcpActiveMemoryAdapter.listTopics({ maid: 'MissingMaid' }),
      error => {
        assert.equal(error.status, 'error');
        assert.equal(error.toolName, 'TopicMemo');
        assert.equal(error.code, 'agent-not-found');
        assert.match(error.message, /\[TopicMemo\] 未找到名为 "MissingMaid" 的Agent。/);
        return true;
      }
    );

    const emptyTopic = await app.adapters.vcpActiveMemoryAdapter.getTopicContent({
      maid: 'Keke',
      topic_id: 'topic_empty'
    });

    assert.equal(emptyTopic.status, 'success');
    assert.equal(emptyTopic.toolName, 'TopicMemo');
    assert.equal(emptyTopic.historyStatus, 'empty-history');
    assert.equal(emptyTopic.topic.messageCount, 0);
    assert.match(emptyTopic.outputText, /该话题暂无聊天记录。/);
    assert.equal(emptyTopic.result, emptyTopic.outputText);

    await assert.rejects(
      () => app.adapters.vcpActiveMemoryAdapter.getTopicContent({
        maid: 'Keke',
        topic_id: 'topic_missing_history'
      }),
      error => {
        assert.equal(error.status, 'error');
        assert.equal(error.toolName, 'TopicMemo');
        assert.equal(error.code, 'missing-history');
        assert.match(error.message, /\[TopicMemo\] 话题 "Missing History" 的聊天记录文件不存在。/);
        return true;
      }
    );
  });
});

test('Phase C should honor donor-style blocked keywords for DeepMemo', async () => {
  await withApp({ activeMemoryBlockedKeywords: ['deepmemo', 'system plan'] }, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    const filteredSearch = await app.adapters.vcpActiveMemoryAdapter.search('DeepMemo TopicMemo', {
      maid: 'Keke',
      limit: 5,
      exclude_latest: false,
      allow_auto_backfill: false
    });

    assert.equal(filteredSearch.status, 'success');
    assert.deepEqual(filteredSearch.blockedKeywords, ['deepmemo']);
    assert.equal(filteredSearch.blocked_keyword_count, 1);
    assert.ok(filteredSearch.effectiveKeywords.includes('topicmemo'));
    assert.equal(filteredSearch.effective_keyword_count, 1);
    assert.equal(filteredSearch.effectiveKeywordText, 'topicmemo');
    assert.equal(filteredSearch.effective_keyword_text, 'topicmemo');
    assert.ok(filteredSearch.results.length >= 1);
    assert.ok(filteredSearch.results.every(result => !result.matchedKeywords.includes('deepmemo')));

    const emptyAfterFilter = await app.adapters.vcpActiveMemoryAdapter.search('DeepMemo ghostterm', {
      maid: 'Keke',
      exclude_latest: false,
      allow_auto_backfill: false
    });

    assert.equal(emptyAfterFilter.status, 'success');
    assert.equal(emptyAfterFilter.resultCount, 0);
    assert.equal(emptyAfterFilter.effectiveKeywordText, 'ghostterm');
    assert.match(emptyAfterFilter.outputText, /关键词“ghostterm”/);
    assert.doesNotMatch(emptyAfterFilter.outputText, /关键词“DeepMemo/);

    await assert.rejects(
      () => app.adapters.vcpActiveMemoryAdapter.search('"system plan"', {
        maid: 'Keke',
        exclude_latest: false,
        allow_auto_backfill: false
      }),
      error => {
        assert.equal(error.status, 'error');
        assert.equal(error.toolName, 'DeepMemo');
        assert.equal(error.code, 'all-keywords-blocked');
        assert.match(error.message, /\[DeepMemo\] 关键词均被屏蔽，无有效搜索词。/);
        return true;
      }
    );
  });
});

test('Phase C should fall back to 主人 when donor settings userName is missing', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatNoSettingsFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    const topic = await app.adapters.vcpActiveMemoryAdapter.getTopicContent({
      maid: 'Keke',
      topic_id: 'topic_alpha',
      include_messages: true
    });

    assert.equal(topic.topic.userName, '主人');
    assert.match(topic.topic.formattedContent, /主人:/);
    assert.match(topic.outputText, /\*\*主人\*\*:/);
  });
});

test('Phase C should preserve donor-style success semantics when DeepMemo rerank fails', async () => {
  await withApp({
    rerankUrl: 'https://example.test',
    rerankApiKey: 'test-key',
    rerankModel: 'test-model'
  }, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    const baseline = await app.adapters.vcpActiveMemoryAdapter.search('Phase C', {
      maid: 'Keke',
      limit: 5,
      exclude_latest: false,
      allow_auto_backfill: false
    });

    app.recall.rerankService.remoteRerank = async () => {
      throw new Error('simulated rerank failure');
    };

    const reranked = await app.adapters.vcpActiveMemoryAdapter.search('Phase C', {
      maid: 'Keke',
      limit: 5,
      exclude_latest: false,
      allow_auto_backfill: false,
      rerank: true
    });

    assert.equal(reranked.status, 'success');
    assert.equal(reranked.rerankRequested, true);
    assert.equal(reranked.rerank_requested, true);
    assert.equal(reranked.rerankAttempted, true);
    assert.equal(reranked.rerank_attempted, true);
    assert.equal(reranked.rerankStatus, 'failed-fallback');
    assert.equal(reranked.rerank_status, 'failed-fallback');
    assert.equal(reranked.rerankMode, 'none');
    assert.equal(reranked.rerank_mode, 'none');
    assert.equal(reranked.rerankSuccessRate, 0);
    assert.equal(reranked.rerank_success_rate, 0);
    assert.match(reranked.rerankError, /simulated rerank failure/);
    assert.deepEqual(
      reranked.results.map(result => result.topicId),
      baseline.results.map(result => result.topicId)
    );
  });
});

test('Phase C should auto-backfill and exclude the latest topic by default', async () => {
  await withApp({ autoRebuildActiveMemoryOnStart: false }, async ({ tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatFixture(vchatRoot);

    await withApp(
      {
        activeMemoryRootPath: vchatRoot,
        autoRebuildActiveMemoryOnStart: false
      },
      async ({ app }) => {
        const initialHealth = await app.stores.chatHistoryIndexStore.getHealth();
        assert.equal(initialHealth.status, 'empty');

        const defaultSearch = await app.adapters.vcpActiveMemoryAdapter.search('Phase C', {
          maid: 'Keke',
          limit: 5
        });

        assert.ok(defaultSearch.results.length >= 1);
        assert.ok(defaultSearch.results.every(result => result.topicId !== 'topic_beta'));

        const indexedHealth = await app.stores.chatHistoryIndexStore.getHealth();
        assert.equal(indexedHealth.status, 'indexed');
        assert.equal(indexedHealth.importedFrom, vchatRoot);

        const inclusiveSearch = await app.adapters.vcpActiveMemoryAdapter.search('Phase C', {
          maid: 'Keke',
          limit: 5,
          exclude_latest: false
        });

        assert.ok(inclusiveSearch.results.some(result => result.topicId === 'topic_beta'));
      }
    );
  });
});

test('Phase C should allow excluding an explicit current topic', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    const search = await app.adapters.vcpActiveMemoryAdapter.search('TopicMemo Phase C', {
      maid: 'Keke',
      limit: 5,
      exclude_latest: false,
      current_topic_id: 'topic_alpha'
    });

    assert.ok(search.results.every(result => result.topicId !== 'topic_alpha'));
    assert.ok(search.results.some(result => result.topicId === 'topic_beta'));
  });
});

test('Phase C should incrementally sync updated, added, and removed active-memory topics', async () => {
  await withApp({ activeMemorySyncMinIntervalMs: 0 }, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    await mutateVchatFixtureForIncrementalSync(vchatRoot);

    const sync = await app.syncActiveMemoryFromSource({ rootPath: vchatRoot });
    assert.equal(sync.mode, 'incremental');
    assert.equal(sync.changed, true);
    assert.equal(sync.addedConversationCount, 1);
    assert.equal(sync.updatedConversationCount, 1);
    assert.equal(sync.removedConversationCount, 1);
    assert.equal(sync.conversationCount, 2);

    const topics = await app.adapters.vcpActiveMemoryAdapter.listTopics({
      maid: 'Keke',
      allow_auto_backfill: false
    });
    assert.equal(topics.topics.length, 2);
    assert.ok(topics.topics.some(topic => topic.topicId === 'topic_gamma'));
    assert.ok(topics.topics.every(topic => topic.topicId !== 'topic_beta'));

    const updatedSearch = await app.adapters.vcpActiveMemoryAdapter.search('incremental sync checkpoint', {
      maid: 'Keke',
      exclude_latest: false,
      allow_auto_backfill: false
    });
    assert.ok(updatedSearch.results.some(result => result.topicId === 'topic_alpha'));

    const gammaSearch = await app.adapters.vcpActiveMemoryAdapter.search('incremental pipeline gamma topic', {
      maid: 'Keke',
      exclude_latest: false,
      allow_auto_backfill: false
    });
    assert.ok(gammaSearch.results.some(result => result.topicId === 'topic_gamma'));
    assert.ok(gammaSearch.results.every(result => result.topicId !== 'topic_beta'));
  });
});

test('Phase C should auto-sync donor changes after the index is already populated', async () => {
  await withApp({ activeMemorySyncMinIntervalMs: 0 }, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    await mutateVchatFixtureForIncrementalSync(vchatRoot);

    const search = await app.adapters.vcpActiveMemoryAdapter.search('incremental backfill pipeline', {
      maid: 'Keke',
      limit: 5,
      exclude_latest: false
    });

    assert.ok(search.results.some(result => result.topicId === 'topic_gamma'));

    const health = await app.stores.chatHistoryIndexStore.getHealth();
    assert.equal(health.lastSyncMode, 'incremental');
    assert.equal(health.lastSyncChanged, true);
    assert.equal(health.conversationCount, 2);
  });
});

test('memory_overview should report active memory health after Phase C rebuild', async () => {
  await withApp({}, async ({ app, tempBasePath }) => {
    const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
    await seedVchatFixture(vchatRoot);
    await app.rebuildActiveMemoryFromSource({ rootPath: vchatRoot });

    const overview = await app.services.overviewService.getOverview();
    assert.equal(overview.adapterStatus.vcpActiveMemory, 'enabled');
    assert.equal(overview.activeMemoryHealth.agentCount, 1);
    assert.equal(overview.activeMemoryHealth.conversationCount, 2);
    assert.equal(overview.activeMemoryHealth.status, 'indexed');
  });
});
