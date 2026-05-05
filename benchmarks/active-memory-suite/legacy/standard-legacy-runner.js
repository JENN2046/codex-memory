#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

function readStdin() {
  return new Promise(resolve => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
  });
}

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function normalizeIsoTimestamp(value, fallback = null) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function formatZhDateTime(value, { includeSeconds = true } = {}) {
  const parsed = new Date(value || '');
  if (Number.isNaN(parsed.getTime())) return '未知';

  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  };

  if (includeSeconds) {
    options.second = '2-digit';
  }

  return parsed.toLocaleString('zh-CN', options);
}

function normalizeCommand(input = {}) {
  const command = String(input.command || input.Command || '').trim().toLowerCase();
  if (command) return command;
  if (String(input.topic_id || input.topicId || input.TopicId || '').trim()) {
    return 'gettopiccontent';
  }
  if (typeof input.maid === 'string' && input.maid.trim() && !input.keyword && !input.key_word && !input.KeyWord) {
    return 'listtopics';
  }
  return '';
}

function normalizeNameKey(value = '') {
  return String(value || '').trim().toLowerCase();
}

function resolveKey(input = {}) {
  const maid = String(input.maid || '').trim();
  const keyword = String(input.keyword || input.key_word || input.KeyWord || '').trim();
  const command = normalizeCommand(input);
  const topicId = String(input.topic_id || input.topicId || input.TopicId || '').trim();
  const windowSize = Number(input.window_size ?? input.windowSize);

  if (!maid && keyword === 'Phase C') {
    return 'deepmemo:missing-maid';
  }
  if (maid === 'Keke' && keyword === 'system plan DeepMemo recall audit') {
    return 'deepmemo:basic-success';
  }
  if (maid === 'Keke' && keyword === '"system plan",(DeepMemo:1.6),{TopicMemo|benchmark:1.2},[schedule:0.4]') {
    return 'deepmemo:advanced-syntax-success';
  }
  if (maid === 'Keke' && keyword === 'DeepMemo TopicMemo') {
    return 'deepmemo:blocked-filtered-success';
  }
  if (maid === 'Keke' && keyword === '"system plan"') {
    return 'deepmemo:all-keywords-blocked';
  }
  if (maid === 'Keke' && keyword === 'system plan DeepMemo recall audit' && input.rerank === true) {
    return 'deepmemo:rerank-fallback-success';
  }
  if (maid === 'Keke' && keyword === 'Phase C' && input.exclude_latest === false && Number(input.limit) === 2) {
    return 'deepmemo:multi-topic-order-success';
  }
  if (maid === 'Mika' && keyword === 'rollback suite signal readiness' && input.exclude_latest === false && Number(input.limit) === 1) {
    return 'deepmemo:multi-agent-mika-success';
  }
  if (maid === 'Mi' && keyword === 'rollback compare' && input.exclude_latest === false && Number(input.limit) === 2) {
    return 'deepmemo:mika-alias-success';
  }
  if (maid === 'Mika' && keyword === 'rollback compare' && Number(input.limit) === 1 && input.exclude_latest !== false) {
    return 'deepmemo:mika-exclude-latest-default-success';
  }
  if (
    maid === 'Mika'
    && keyword === 'rollback compare'
    && input.exclude_latest === false
    && String(input.current_topic_id || input.currentTopicId || '').trim() === 'topic_delta'
    && Number(input.limit) === 1
  ) {
    return 'deepmemo:mika-current-topic-exclusion-success';
  }
  if (
    maid === 'Keke'
    && keyword === '"Phase D",rollback,{compare|migration}'
    && input.exclude_latest === false
    && Number(input.limit) === 2
    && windowSize === 1
  ) {
    return 'deepmemo:ranking-window-order-success';
  }
  if (
    maid === 'Keke'
    && keyword === '"Phase D",rollback,{compare|migration}'
    && input.exclude_latest === false
    && Number(input.limit) === 3
    && windowSize === 1
  ) {
    return 'deepmemo:ranking-three-window-order-success';
  }
  if (maid === 'Keke' && keyword === 'Phase D compare migration' && input.exclude_latest === false && Number(input.limit) === 3) {
    return 'deepmemo:large-multi-topic-order-success';
  }
  if (maid === 'MissingMaid' && keyword === 'Phase C') {
    return 'deepmemo:agent-not-found';
  }

  if (maid === 'MissingMaid' && command === 'listtopics') {
    return 'topicmemo:agent-not-found';
  }
  if (maid === 'MissingMaid' && command === 'gettopiccontent') {
    return 'topicmemo:agent-not-found';
  }
  if (maid === 'Keke' && command === 'listtopics') {
    return 'topicmemo:listtopics-basic';
  }
  if (maid === 'Mika' && command === 'listtopics') {
    return 'topicmemo:listtopics-mika';
  }
  if (maid === 'Mi' && command === 'listtopics' && String(input.agentId || '').trim() === 'maid-mika') {
    return 'topicmemo:listtopics-mika-agentid-alias';
  }
  if (maid === 'Keke' && command === 'gettopiccontent' && topicId === 'topic_alpha') {
    return 'topicmemo:gettopiccontent-basic';
  }
  if (maid === 'Mika' && command === 'gettopiccontent' && topicId === 'topic_delta') {
    return 'topicmemo:gettopiccontent-mika';
  }
  if (maid === 'Keke' && command === 'gettopiccontent' && topicId === 'topic_empty') {
    return 'topicmemo:gettopiccontent-empty-history';
  }
  if (maid === 'Keke' && command === 'gettopiccontent' && topicId === 'topic_missing_history') {
    return 'topicmemo:gettopiccontent-missing-history';
  }
  if (maid === 'Keke' && command === 'gettopiccontent' && topicId === 'topic_history_read_error') {
    return 'topicmemo:gettopiccontent-history-read-error';
  }
  if (maid === 'Keke' && command === 'gettopiccontent' && topicId === 'topic_unknown') {
    return 'topicmemo:gettopiccontent-missing-topic';
  }

  return '';
}

function resolveAgentDescriptor(agentsDir, requestedMaidName = '') {
  let entries = [];
  try {
    entries = fs.readdirSync(agentsDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const descriptors = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const configPath = path.join(agentsDir, entry.name, 'config.json');
    if (!fs.existsSync(configPath)) continue;

    const config = readJsonFile(configPath);
    descriptors.push({
      agentId: entry.name,
      maidName: String(config.name || entry.name).trim() || entry.name,
      configPath
    });
  }

  if (!descriptors.length) {
    return null;
  }

  const normalizedRequested = normalizeNameKey(requestedMaidName);
  if (!normalizedRequested) {
    return descriptors.find(item => item.agentId === 'maid-keke') || descriptors[0];
  }

  return descriptors.find(item => normalizeNameKey(item.maidName) === normalizedRequested)
    || descriptors.find(item => normalizeNameKey(item.agentId) === normalizedRequested)
    || descriptors.find(item => normalizeNameKey(item.maidName).includes(normalizedRequested))
    || descriptors.find(item => normalizeNameKey(item.agentId).includes(normalizedRequested))
    || null;
}

function resolveFixturePaths(input = {}) {
  const suiteRoot = path.resolve(__dirname, '..');
  const configuredRoot = String(process.env.CODEX_MEMORY_ACTIVE_MEMORY_ROOT || '').trim();
  const fixtureRoot = configuredRoot
    ? path.resolve(configuredRoot)
    : path.join(suiteRoot, 'vchat-fixture');
  const requestedMaidName = String(input.maid || input.maidName || '').trim();
  const agentsDir = path.join(fixtureRoot, 'Agents');
  const descriptor = resolveAgentDescriptor(agentsDir, requestedMaidName);
  const agentId = descriptor?.agentId || 'maid-keke';
  const configPath = descriptor?.configPath || path.join(agentsDir, agentId, 'config.json');
  const settingsPath = path.join(fixtureRoot, 'settings.json');
  const topicRoot = path.join(fixtureRoot, 'UserData', agentId, 'topics');

  return {
    suiteRoot,
    fixtureRoot,
    agentId,
    requestedMaidName,
    configPath,
    settingsPath,
    topicRoot
  };
}

function loadFixture(input = {}) {
  const paths = resolveFixturePaths(input);
  const requestedMaidName = String(input.maid || input.maidName || '').trim();
  const settings = fs.existsSync(paths.settingsPath)
    ? readJsonFile(paths.settingsPath)
    : {};
  const config = readJsonFile(paths.configPath);
  const rawTopics = Array.isArray(config.topics) ? config.topics : [];

  const topics = rawTopics.map(topic => {
    const topicId = String(topic.id || '').trim();
    const historyPath = path.join(paths.topicRoot, topicId, 'history.json');
    const hasHistory = fs.existsSync(historyPath);
    const history = hasHistory ? readJsonFile(historyPath) : null;
    const messages = Array.isArray(history)
      ? history
      : (history && Array.isArray(history.messages) ? history.messages : []);
    const historyStats = hasHistory ? fs.statSync(historyPath) : null;
    const createdAt = normalizeIsoTimestamp(topic.createdAt, null)
      || normalizeIsoTimestamp(historyStats?.birthtime, null)
      || normalizeIsoTimestamp(historyStats?.mtime, null);

    return {
      topicId,
      topicName: String(topic.name || topicId).trim() || topicId,
      locked: !!topic.locked,
      createdAt,
      historyPath,
      hasHistory,
      messages
    };
  });

  return {
    userName: String(settings.userName || '主人').trim() || '主人',
    maidName: String(config.name || paths.requestedMaidName || 'Keke').trim() || paths.requestedMaidName || 'Keke',
    titleMaidName: requestedMaidName || String(config.name || paths.requestedMaidName || 'Keke').trim() || 'Keke',
    topics
  };
}

function findTopic(fixture, topicId) {
  return fixture.topics.find(topic => topic.topicId === topicId) || null;
}

function getSpeakerName(role, fixture) {
  if (role === 'assistant') return fixture.maidName;
  if (role === 'user') return fixture.userName;
  return String(role || 'Unknown').trim() || 'Unknown';
}

function formatTopicListOutput(fixture) {
  const titleName = String(fixture.titleMaidName || fixture.maidName || 'Agent').trim() || 'Agent';
  if (!fixture.topics.length) {
    return `[TopicMemo] ${titleName} 暂无任何话题记录。`;
  }

  const lines = [
    `## ${titleName} 的话题列表`,
    '',
    `共 ${fixture.topics.length} 个话题：`,
    ''
  ];

  fixture.topics.forEach((topic, index) => {
    lines.push(`${index + 1}. **${topic.topicName}**${topic.locked ? ' 🔒' : ''}`);
    lines.push(`   - ID: \`${topic.topicId}\``);
    lines.push(`   - 创建时间: ${formatZhDateTime(topic.createdAt, { includeSeconds: false })}`);
    if (index !== fixture.topics.length - 1) {
      lines.push('');
    }
  });

  return lines.join('\n').trim();
}

function formatTopicContentOutput(topic, fixture) {
  const conversation = topic.messages
    .map(message => `**${getSpeakerName(message.role, fixture)}**: ${String(message.content || '').trim()}`)
    .join('\n')
    .trim();

  return [
    `## 话题：${topic.topicName || topic.topicId || '未命名话题'}`,
    `创建时间：${formatZhDateTime(topic.createdAt)}`,
    `消息数量：${topic.messages.length} 条`,
    '',
    '---',
    '',
    conversation
  ].join('\n').trim();
}

function formatEmptyTopicContentOutput(topic) {
  return `## 话题：${topic.topicName || topic.topicId || '未命名话题'}\n\n该话题暂无聊天记录。`;
}

function writeJson(stream, payload) {
  stream.write(`${JSON.stringify(payload)}\n`);
}

async function main() {
  const rawInput = await readStdin();
  const input = JSON.parse(rawInput || '{}');
  const key = resolveKey(input);
  const expectedPath = path.resolve(__dirname, 'expected-results.json');
  const expected = readJsonFile(expectedPath);

  if (!key) {
    writeJson(process.stderr, {
      status: 'error',
      error: `[LegacyFixture] Unsupported standard suite input: ${rawInput}`
    });
    process.exit(1);
    return;
  }

  if (key.startsWith('deepmemo:')) {
    const fixture = expected[key];
    if (!fixture) {
      writeJson(process.stderr, {
        status: 'error',
        error: `[LegacyFixture] Missing static expected result for ${key}.`
      });
      process.exit(1);
      return;
    }

    const stream = fixture.stream === 'stderr' ? process.stderr : process.stdout;
    writeJson(stream, fixture.payload);
    process.exit(fixture.exitCode || 0);
    return;
  }

  if (key === 'topicmemo:agent-not-found') {
    writeJson(process.stderr, {
      status: 'error',
      error: '[TopicMemo] 未找到名为 "MissingMaid" 的Agent。',
      meta: {
        toolName: 'TopicMemo',
        tool_name: 'TopicMemo',
        code: 'agent-not-found',
        command: normalizeCommand(input) === 'gettopiccontent' ? 'GetTopicContent' : 'ListTopics',
        maid: 'MissingMaid',
        topicId: String(input.topic_id || input.topicId || input.TopicId || '').trim()
      }
    });
    process.exit(1);
    return;
  }

  if (key === 'topicmemo:gettopiccontent-history-read-error') {
    const historyPath = path.join(
      resolveFixturePaths(input).topicRoot,
      'topic_history_read_error',
      'history.json'
    );
    let parserMessage = 'Unknown history parse error';
    try {
      readJsonFile(historyPath);
    } catch (error) {
      parserMessage = error instanceof Error && error.message
        ? error.message
        : String(error || parserMessage);
    }
    writeJson(process.stderr, {
      status: 'error',
      error: `[TopicMemo] 无法读取话题 "History Read Error" 的聊天记录: ${parserMessage}`,
      meta: {
        toolName: 'TopicMemo',
        tool_name: 'TopicMemo',
        code: 'history-read-error',
        command: 'GetTopicContent',
        maid: 'Keke',
        topicId: 'topic_history_read_error',
        historyStatus: 'history-read-error'
      }
    });
    process.exit(1);
    return;
  }

  const fixture = loadFixture(input);

  if (
    key === 'topicmemo:listtopics-basic'
    || key === 'topicmemo:listtopics-mika'
    || key === 'topicmemo:listtopics-mika-agentid-alias'
  ) {
    writeJson(process.stdout, {
      status: 'success',
      result: formatTopicListOutput(fixture)
    });
    process.exit(0);
    return;
  }

  if (key === 'topicmemo:gettopiccontent-missing-topic') {
    writeJson(process.stderr, {
      status: 'error',
      error: '[TopicMemo] 未找到 ID 为 "topic_unknown" 的话题。可用的话题ID请先使用 ListTopics 指令查询。',
      meta: {
        toolName: 'TopicMemo',
        tool_name: 'TopicMemo',
        code: 'topic-not-found',
        command: 'GetTopicContent',
        maid: 'Keke',
        topicId: 'topic_unknown',
        historyStatus: 'topic-not-found'
      }
    });
    process.exit(1);
    return;
  }

  const topicId = String(input.topic_id || input.topicId || input.TopicId || '').trim();
  const topic = findTopic(fixture, topicId);
  if (!topic) {
    writeJson(process.stderr, {
      status: 'error',
      error: `[LegacyFixture] Missing topic fixture for ${topicId}.`
    });
    process.exit(1);
    return;
  }

  if (key === 'topicmemo:gettopiccontent-missing-history') {
    writeJson(process.stderr, {
      status: 'error',
      error: `[TopicMemo] 话题 "${topic.topicName}" 的聊天记录文件不存在。`,
      meta: {
        toolName: 'TopicMemo',
        tool_name: 'TopicMemo',
        code: 'missing-history',
        command: 'GetTopicContent',
        maid: 'Keke',
        topicId: topic.topicId,
        historyStatus: 'missing-history'
      }
    });
    process.exit(1);
    return;
  }

  if (key === 'topicmemo:gettopiccontent-empty-history') {
    writeJson(process.stdout, {
      status: 'success',
      result: formatEmptyTopicContentOutput(topic)
    });
    process.exit(0);
    return;
  }

  if (key === 'topicmemo:gettopiccontent-basic' || key === 'topicmemo:gettopiccontent-mika') {
    writeJson(process.stdout, {
      status: 'success',
      result: formatTopicContentOutput(topic, fixture)
    });
    process.exit(0);
    return;
  }

  writeJson(process.stderr, {
    status: 'error',
    error: `[LegacyFixture] Unsupported topicmemo key: ${key}.`
  });
  process.exit(1);
}

main().catch(error => {
  writeJson(process.stderr, {
    status: 'error',
    error: `[LegacyFixture] ${error.message}`
  });
  process.exit(1);
});
