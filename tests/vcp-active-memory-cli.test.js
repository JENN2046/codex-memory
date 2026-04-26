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

async function seedVchatMissingHistoryFixture(rootPath) {
  await seedVchatFixture(rootPath);

  const configPath = path.join(rootPath, 'Agents', 'maid-keke', 'config.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  config.topics.push({
    id: 'topic_missing_history',
    name: 'Missing History',
    createdAt: '2026-04-21T13:00:00.000Z',
    locked: false
  });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
}

async function seedVchatEmptyHistoryFixture(rootPath) {
  await seedVchatFixture(rootPath);

  const emptyHistoryPath = path.join(rootPath, 'UserData', 'maid-keke', 'topics', 'topic_empty_history', 'history.json');
  await fs.mkdir(path.dirname(emptyHistoryPath), { recursive: true });
  await fs.writeFile(emptyHistoryPath, JSON.stringify([], null, 2), 'utf8');

  const configPath = path.join(rootPath, 'Agents', 'maid-keke', 'config.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  config.topics.push({
    id: 'topic_empty_history',
    name: 'Empty History',
    createdAt: '2026-04-21T14:00:00.000Z',
    locked: false
  });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
}

async function seedVchatHistoryReadErrorFixture(rootPath) {
  await seedVchatFixture(rootPath);

  const badHistoryPath = path.join(rootPath, 'UserData', 'maid-keke', 'topics', 'topic_history_read_error', 'history.json');
  await fs.mkdir(path.dirname(badHistoryPath), { recursive: true });
  await fs.writeFile(badHistoryPath, '{not-json}', 'utf8');

  const configPath = path.join(rootPath, 'Agents', 'maid-keke', 'config.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  config.topics.push({
    id: 'topic_history_read_error',
    name: 'History Read Error',
    createdAt: '2026-04-21T15:00:00.000Z',
    locked: false
  });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
}

function runCli({ scriptPath, env = {}, args = [], stdin = '' }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...env
      },
      stdio: ['pipe', 'pipe', 'pipe']
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
    child.stdin.end(stdin);
  });
}

function parseJsonOutput(text = '') {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      // Ignore non-JSON warning lines.
    }
  }

  return JSON.parse(String(text || '').trim());
}

test('DeepMemo CLI should emit donor-style success JSON and support full payload mode', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-deepmemo-cli-'));
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
    const stdin = JSON.stringify({
      maid: 'Keke',
      keyword: 'Phase C recall audit',
      limit: 3,
      exclude_latest: false
    });

    const compact = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env,
      stdin
    });
    assert.equal(compact.code, 0, compact.stderr);
    const compactPayload = parseJsonOutput(compact.stdout);
    assert.equal(compactPayload.status, 'success');
    assert.match(compactPayload.result, /回忆片段1/);
    assert.equal(Object.hasOwn(compactPayload, 'results'), false);

    const full = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env,
      args: ['--full'],
      stdin
    });
    assert.equal(full.code, 0, full.stderr);
    const fullPayload = parseJsonOutput(full.stdout);
    assert.equal(fullPayload.status, 'success');
    assert.ok(Array.isArray(fullPayload.results));
    assert.ok(fullPayload.results.length >= 1);
    assert.equal(fullPayload.memories.length, fullPayload.results.length);
    assert.equal(Object.hasOwn(fullPayload, 'toolName'), false);
    assert.equal(Object.hasOwn(fullPayload, 'tool_name'), false);
    assert.equal(fullPayload.meta.toolName, 'DeepMemo');
    assert.equal(fullPayload.meta.tool_name, 'DeepMemo');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('TopicMemo CLI should default to ListTopics and keep donor-style success shape', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-topicmemo-cli-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
  await seedVchatFixture(vchatRoot);

  try {
    const result = await runCli({
      scriptPath: 'src/cli/topicmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot
      },
      stdin: JSON.stringify({ maid: 'Keke' })
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.status, 'success');
    assert.match(payload.result, /话题列表/);
    assert.match(payload.result, /🔒/);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('DeepMemo CLI should emit donor-style error JSON for invalid input', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-deepmemo-error-cli-'));

  try {
    const result = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs'
      },
      stdin: '{not-json}'
    });

    assert.equal(result.code, 1);
    const payload = parseJsonOutput(result.stderr);
    assert.equal(payload.status, 'error');
    assert.equal(Object.hasOwn(payload, 'toolName'), false);
    assert.equal(Object.hasOwn(payload, 'code'), false);
    assert.equal(payload.meta.toolName, 'DeepMemo');
    assert.equal(payload.meta.code, 'invalid-json');
    assert.equal(payload.meta.inputSource, 'stdin');
    assert.match(payload.meta.rawInputPreview, /\{not-json\}/);
    assert.match(payload.error, /\[DeepMemo\]/);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('TopicMemo CLI should emit donor-style error JSON for invalid input', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-topicmemo-invalid-json-cli-'));

  try {
    const result = await runCli({
      scriptPath: 'src/cli/topicmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs'
      },
      stdin: '{not-json}'
    });

    assert.equal(result.code, 1);
    const payload = parseJsonOutput(result.stderr);
    assert.equal(payload.status, 'error');
    assert.equal(Object.hasOwn(payload, 'toolName'), false);
    assert.equal(Object.hasOwn(payload, 'code'), false);
    assert.equal(payload.meta.toolName, 'TopicMemo');
    assert.equal(payload.meta.code, 'invalid-json');
    assert.equal(payload.meta.inputSource, 'stdin');
    assert.match(payload.meta.rawInputPreview, /\{not-json\}/);
    assert.match(payload.error, /\[TopicMemo\]/);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('TopicMemo CLI should emit donor-style error JSON for unknown command', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-topicmemo-unknown-command-cli-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
  await seedVchatFixture(vchatRoot);

  try {
    const result = await runCli({
      scriptPath: 'src/cli/topicmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot
      },
      stdin: JSON.stringify({ maid: 'Keke', command: 'Search' })
    });

    assert.equal(result.code, 1);
    const payload = parseJsonOutput(result.stderr);
    assert.equal(payload.status, 'error');
    assert.equal(Object.hasOwn(payload, 'toolName'), false);
    assert.equal(Object.hasOwn(payload, 'code'), false);
    assert.equal(payload.meta.toolName, 'TopicMemo');
    assert.equal(payload.meta.code, 'unknown-command');
    assert.equal(payload.meta.command, 'Search');
    assert.equal(payload.meta.maid, 'Keke');
    assert.equal(payload.meta.topicId, '');
    assert.match(payload.error, /\[TopicMemo\]/);
    assert.match(payload.error, /ListTopics/);
    assert.match(payload.error, /GetTopicContent/);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('DeepMemo CLI should surface blocked-keyword diagnostics in error meta', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-deepmemo-blocked-cli-'));

  try {
    const result = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_BLOCKED_KEYWORDS: 'forbidden,blocked'
      },
      stdin: JSON.stringify({
        maid: 'Keke',
        keyword: 'forbidden, blocked'
      })
    });

    assert.equal(result.code, 1);
    const payload = parseJsonOutput(result.stderr);
    assert.equal(payload.status, 'error');
    assert.equal(payload.meta.toolName, 'DeepMemo');
    assert.equal(payload.meta.code, 'all-keywords-blocked');
    assert.equal(payload.meta.command, 'Search');
    assert.equal(payload.meta.maid, 'Keke');
    assert.equal(payload.meta.maidName, 'Keke');
    assert.equal(payload.meta.query, 'forbidden, blocked');
    assert.equal(payload.meta.rawQuery, 'forbidden, blocked');
    assert.equal(payload.meta.raw_query, 'forbidden, blocked');
    assert.equal(payload.meta.rawKeyword, 'forbidden, blocked');
    assert.equal(payload.meta.raw_keyword, 'forbidden, blocked');
    assert.deepEqual(payload.meta.blockedKeywords, ['forbidden', 'blocked']);
    assert.equal(payload.meta.blocked_keyword_count, 2);
    assert.equal(payload.meta.blockedKeywordCount, 2);
    assert.deepEqual(payload.meta.effectiveKeywords, []);
    assert.equal(payload.meta.effective_keyword_count, 0);
    assert.equal(payload.meta.effectiveKeywordCount, 0);
    assert.equal(payload.meta.effective_keyword_text, '');
    assert.equal(payload.meta.effectiveKeywordText, '');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('DeepMemo CLI should surface multi blocked-keyword diagnostics in error meta', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-deepmemo-blocked-multi-cli-'));

  try {
    const result = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_BLOCKED_KEYWORDS: 'deepmemo,topicmemo,recall,audit'
      },
      stdin: JSON.stringify({
        maid: 'Keke',
        keyword: 'DeepMemo TopicMemo recall audit'
      })
    });

    assert.equal(result.code, 1);
    const payload = parseJsonOutput(result.stderr);
    assert.equal(payload.status, 'error');
    assert.equal(payload.meta.toolName, 'DeepMemo');
    assert.equal(payload.meta.code, 'all-keywords-blocked');
    assert.equal(payload.meta.query, 'DeepMemo TopicMemo recall audit');
    assert.deepEqual(payload.meta.blockedKeywords, ['deepmemo', 'topicmemo', 'recall', 'audit']);
    assert.equal(payload.meta.blocked_keyword_count, 4);
    assert.equal(payload.meta.blockedKeywordCount, 4);
    assert.deepEqual(payload.meta.effectiveKeywords, []);
    assert.equal(payload.meta.effective_keyword_count, 0);
    assert.equal(payload.meta.effectiveKeywordCount, 0);
    assert.equal(payload.meta.effective_keyword_text, '');
    assert.equal(payload.meta.effectiveKeywordText, '');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('DeepMemo CLI should surface partial multi blocked-keyword diagnostics in success meta', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-deepmemo-blocked-partial-multi-cli-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
  await seedVchatFixture(vchatRoot);

  try {
    const result = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot,
        CODEX_MEMORY_ACTIVE_BLOCKED_KEYWORDS: 'deepmemo,audit'
      },
      args: ['--full'],
      stdin: JSON.stringify({
        maid: 'Keke',
        keyword: 'DeepMemo TopicMemo recall audit',
        exclude_latest: false,
        limit: 1
      })
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.status, 'success');
    assert.deepEqual(payload.meta.blockedKeywords, ['deepmemo', 'audit']);
    assert.equal(payload.meta.blocked_keyword_count, 2);
    assert.deepEqual(payload.meta.effectiveKeywords, ['topicmemo', 'recall']);
    assert.equal(payload.meta.effective_keyword_count, 2);
    assert.equal(payload.meta.effectiveKeywordText, 'topicmemo, recall');
    assert.equal(payload.meta.effective_keyword_text, 'topicmemo, recall');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('DeepMemo CLI should dedupe repeated keywords in success blocked/effective meta', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-deepmemo-blocked-duplicate-cli-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
  await seedVchatFixture(vchatRoot);

  try {
    const result = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot,
        CODEX_MEMORY_ACTIVE_BLOCKED_KEYWORDS: 'deepmemo,audit'
      },
      args: ['--full'],
      stdin: JSON.stringify({
        maid: 'Keke',
        keyword: 'DeepMemo recall TopicMemo DeepMemo recall audit',
        exclude_latest: false,
        limit: 1
      })
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.status, 'success');
    assert.deepEqual(payload.meta.blockedKeywords, ['deepmemo', 'audit']);
    assert.equal(payload.meta.blocked_keyword_count, 2);
    assert.deepEqual(payload.meta.effectiveKeywords, ['recall', 'topicmemo']);
    assert.equal(payload.meta.effective_keyword_count, 2);
    assert.equal(payload.meta.effectiveKeywordText, 'recall, topicmemo');
    assert.equal(payload.meta.effective_keyword_text, 'recall, topicmemo');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('DeepMemo CLI should preserve blocked/effective diagnostics with advanced syntax success queries', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-deepmemo-blocked-advanced-cli-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
  await seedVchatFixture(vchatRoot);

  try {
    const result = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot,
        CODEX_MEMORY_ACTIVE_BLOCKED_KEYWORDS: 'deepmemo,audit'
      },
      args: ['--full'],
      stdin: JSON.stringify({
        maid: 'Keke',
        keyword: '"DeepMemo" {TopicMemo|audit} (recall:2)',
        exclude_latest: false,
        limit: 1
      })
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.status, 'success');
    assert.deepEqual(payload.meta.blockedKeywords, ['deepmemo', 'audit']);
    assert.equal(payload.meta.blocked_keyword_count, 2);
    assert.deepEqual(payload.meta.effectiveKeywords, ['topicmemo', 'recall']);
    assert.equal(payload.meta.effective_keyword_count, 2);
    assert.equal(payload.meta.effectiveKeywordText, 'topicmemo, recall');
    assert.equal(payload.meta.effective_keyword_text, 'topicmemo, recall');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('DeepMemo CLI should normalize duplicate mixed-case blocked config entries in success meta', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-deepmemo-blocked-config-duplicate-cli-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
  await seedVchatFixture(vchatRoot);

  try {
    const result = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot,
        CODEX_MEMORY_ACTIVE_BLOCKED_KEYWORDS: 'DeepMemo,deepmemo,AUDIT,audit'
      },
      args: ['--full'],
      stdin: JSON.stringify({
        maid: 'Keke',
        keyword: 'DeepMemo TopicMemo recall audit',
        exclude_latest: false,
        limit: 1
      })
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.status, 'success');
    assert.deepEqual(payload.meta.blockedKeywords, ['deepmemo', 'audit']);
    assert.equal(payload.meta.blocked_keyword_count, 2);
    assert.deepEqual(payload.meta.effectiveKeywords, ['topicmemo', 'recall']);
    assert.equal(payload.meta.effective_keyword_count, 2);
    assert.equal(payload.meta.effectiveKeywordText, 'topicmemo, recall');
    assert.equal(payload.meta.effective_keyword_text, 'topicmemo, recall');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('DeepMemo CLI should surface agent-not-found diagnostics in error meta', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-deepmemo-agent-not-found-cli-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
  await seedVchatFixture(vchatRoot);

  try {
    const result = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot
      },
      stdin: JSON.stringify({
        maid: 'MissingMaid',
        keyword: 'Phase C recall audit'
      })
    });

    assert.equal(result.code, 1);
    const payload = parseJsonOutput(result.stderr);
    assert.equal(payload.status, 'error');
    assert.equal(payload.meta.toolName, 'DeepMemo');
    assert.equal(payload.meta.code, 'agent-not-found');
    assert.equal(payload.meta.command, 'Search');
    assert.equal(payload.meta.maid, 'MissingMaid');
    assert.equal(payload.meta.maidName, 'MissingMaid');
    assert.equal(payload.meta.query, 'Phase C recall audit');
    assert.equal(payload.meta.rawQuery, 'Phase C recall audit');
    assert.equal(payload.meta.raw_query, 'Phase C recall audit');
    assert.equal(payload.meta.keyword, 'Phase C recall audit');
    assert.equal(payload.meta.rawKeyword, 'Phase C recall audit');
    assert.equal(payload.meta.raw_keyword, 'Phase C recall audit');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('TopicMemo CLI should surface agent lookup diagnostics in error meta', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-topicmemo-error-meta-cli-'));
  try {
    const result = await runCli({
      scriptPath: 'src/cli/topicmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs'
      },
      stdin: JSON.stringify({
        maid: 'Keke',
        topic_id: 'topic_missing'
      })
    });

    assert.equal(result.code, 1);
    const payload = parseJsonOutput(result.stderr);
    assert.equal(payload.status, 'error');
    assert.equal(payload.meta.toolName, 'TopicMemo');
    assert.equal(payload.meta.code, 'agent-not-found');
    assert.equal(payload.meta.command, 'GetTopicContent');
    assert.equal(payload.meta.maid, 'Keke');
    assert.equal(payload.meta.topicId, 'topic_missing');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('TopicMemo CLI should surface topic-not-found diagnostics in error meta', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-topicmemo-topic-not-found-cli-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
  await seedVchatFixture(vchatRoot);

  try {
    const result = await runCli({
      scriptPath: 'src/cli/topicmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot
      },
      stdin: JSON.stringify({
        maid: 'Keke',
        topic_id: 'topic_missing'
      })
    });

    assert.equal(result.code, 1);
    const payload = parseJsonOutput(result.stderr);
    assert.equal(payload.status, 'error');
    assert.equal(payload.meta.toolName, 'TopicMemo');
    assert.equal(payload.meta.code, 'topic-not-found');
    assert.equal(payload.meta.command, 'GetTopicContent');
    assert.equal(payload.meta.maid, 'Keke');
    assert.equal(payload.meta.topicId, 'topic_missing');
    assert.equal(payload.meta.historyStatus, 'topic-not-found');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('TopicMemo CLI should surface missing-history diagnostics in error meta', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-topicmemo-missing-history-cli-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
  await seedVchatMissingHistoryFixture(vchatRoot);

  try {
    const result = await runCli({
      scriptPath: 'src/cli/topicmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot
      },
      stdin: JSON.stringify({
        maid: 'Keke',
        topic_id: 'topic_missing_history'
      })
    });

    assert.equal(result.code, 1);
    const payload = parseJsonOutput(result.stderr);
    assert.equal(payload.status, 'error');
    assert.equal(payload.meta.toolName, 'TopicMemo');
    assert.equal(payload.meta.code, 'missing-history');
    assert.equal(payload.meta.command, 'GetTopicContent');
    assert.equal(payload.meta.maid, 'Keke');
    assert.equal(payload.meta.topicId, 'topic_missing_history');
    assert.equal(payload.meta.historyStatus, 'missing-history');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('TopicMemo CLI should surface empty-history as a success status', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-topicmemo-empty-history-cli-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
  await seedVchatEmptyHistoryFixture(vchatRoot);

  try {
    const result = await runCli({
      scriptPath: 'src/cli/topicmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot
      },
      args: ['--full'],
      stdin: JSON.stringify({
        maid: 'Keke',
        topic_id: 'topic_empty_history'
      })
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.status, 'success');
    assert.equal(payload.meta.historyStatus, 'empty-history');
    assert.equal(payload.meta.command, 'GetTopicContent');
    assert.equal(payload.meta.topicId, 'topic_empty_history');
    assert.match(payload.result, /暂无聊天记录|殘無聊天記錄|空历史/);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('TopicMemo CLI should surface history-read-error diagnostics in error meta', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-topicmemo-history-read-error-cli-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
  await seedVchatHistoryReadErrorFixture(vchatRoot);

  try {
    const result = await runCli({
      scriptPath: 'src/cli/topicmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot
      },
      stdin: JSON.stringify({
        maid: 'Keke',
        topic_id: 'topic_history_read_error'
      })
    });

    assert.equal(result.code, 1);
    const payload = parseJsonOutput(result.stderr);
    assert.equal(payload.status, 'error');
    assert.equal(payload.meta.toolName, 'TopicMemo');
    assert.equal(payload.meta.code, 'history-read-error');
    assert.equal(payload.meta.command, 'GetTopicContent');
    assert.equal(payload.meta.maid, 'Keke');
    assert.equal(payload.meta.topicId, 'topic_history_read_error');
    assert.equal(payload.meta.historyStatus, 'history-read-error');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
