const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');

async function withApp(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-phase-b-'));
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

function formatDateParts(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return {
    datePart: `${year}-${month}-${day}`,
    timePart: `${hours}_${minutes}_${seconds}`
  };
}

async function writeDiaryEntry({ tempBasePath, target = 'process', date, title, memoryId, content, evidence, tags = [] }) {
  const folder = target === 'knowledge' ? 'Codex的知识' : 'Codex';
  const { datePart, timePart } = formatDateParts(date);
  const directory = path.join(tempBasePath, 'dailynote', folder);
  await fs.mkdir(directory, { recursive: true });
  const filePath = path.join(directory, `${datePart}-${timePart}-${title.replace(/\s+/g, '-')}.txt`);
  const fileText = [
    `[${datePart}] - Codex`,
    `Title: ${title}`,
    `Memory-ID: ${memoryId}`,
    `Record-Type: ${target}`,
    'Validated: yes',
    target === 'knowledge' ? 'Reusable: yes' : 'Reusable: no',
    '',
    'Content:',
    content,
    '',
    'Evidence:',
    evidence,
    '',
    `Tag: ${tags.join(', ')}`
  ].join('\n');
  await fs.writeFile(filePath, fileText, 'utf8');
}

test('vcp passive adapter should honor ::Time directive using semantic diary dates', async () => {
  await withApp(async ({ app, tempBasePath }) => {
    const now = new Date();
    const old = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

    await writeDiaryEntry({
      tempBasePath,
      target: 'process',
      date: now,
      title: 'Recent checkpoint',
      memoryId: 'codex-process-recent',
      content: 'checkpoint migration completed',
      evidence: 'recent evidence',
      tags: ['migration']
    });

    await writeDiaryEntry({
      tempBasePath,
      target: 'process',
      date: old,
      title: 'Old checkpoint',
      memoryId: 'codex-process-old',
      content: 'checkpoint migration archived',
      evidence: 'old evidence',
      tags: ['migration']
    });

    const result = await app.adapters.vcpPassiveMemoryAdapter.search('[[checkpoint migration]] ::Time(7d)', {
      target: 'process',
      limit: 5
    });

    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].title, 'Recent checkpoint');
  });
});

test('vcp passive adapter should diversify results when ::Group(tag) is used', async () => {
  await withApp(async ({ app, tempBasePath }) => {
    const now = new Date();

    await writeDiaryEntry({
      tempBasePath,
      date: now,
      title: 'Alpha checkpoint A',
      memoryId: 'codex-process-alpha-a',
      content: 'checkpoint alpha rollout',
      evidence: 'alpha evidence',
      tags: ['alpha']
    });

    await writeDiaryEntry({
      tempBasePath,
      date: new Date(now.getTime() - 60 * 1000),
      title: 'Alpha checkpoint B',
      memoryId: 'codex-process-alpha-b',
      content: 'checkpoint alpha fallback',
      evidence: 'alpha fallback evidence',
      tags: ['alpha']
    });

    await writeDiaryEntry({
      tempBasePath,
      date: new Date(now.getTime() - 2 * 60 * 1000),
      title: 'Beta checkpoint',
      memoryId: 'codex-process-beta',
      content: 'checkpoint beta rollout',
      evidence: 'beta evidence',
      tags: ['beta']
    });

    const result = await app.adapters.vcpPassiveMemoryAdapter.search('[[alpha beta checkpoint]] ::Group(tag) ::Rerank', {
      target: 'process',
      limit: 2
    });

    assert.equal(result.results.length, 2);
    assert.notEqual(result.results[0].matchedTags[0], result.results[1].matchedTags[0]);
  });
});

test('tagmemo plus rerank should favor strong tag matches', async () => {
  await withApp(async ({ app, tempBasePath }) => {
    const now = new Date();

    await writeDiaryEntry({
      tempBasePath,
      date: now,
      title: 'Generic checkpoint',
      memoryId: 'codex-process-tag-heavy',
      content: 'checkpoint stable and quiet',
      evidence: 'tag-driven evidence',
      tags: ['orm', 'migration']
    });

    await writeDiaryEntry({
      tempBasePath,
      date: new Date(now.getTime() - 60 * 1000),
      title: 'Migration note',
      memoryId: 'codex-process-text-heavy',
      content: 'checkpoint migration only',
      evidence: 'text-driven evidence',
      tags: []
    });

    const result = await app.adapters.vcpPassiveMemoryAdapter.search('[[orm migration]] ::TagMemo+1.8 ::Rerank', {
      target: 'process',
      limit: 1
    });

    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].title, 'Generic checkpoint');
    assert.ok(result.results[0].matchedTags.includes('orm'));
  });
});

test('recall audit should include candidate, rerank, and query-axis details', async () => {
  await withApp(async ({ app, tempBasePath }) => {
    const now = new Date();

    await writeDiaryEntry({
      tempBasePath,
      date: now,
      title: 'ORM migration checkpoint',
      memoryId: 'codex-process-audit-a',
      content: 'checkpoint orm migration rollout completed',
      evidence: 'audit evidence a',
      tags: ['orm', 'migration']
    });

    await writeDiaryEntry({
      tempBasePath,
      date: new Date(now.getTime() - 60 * 1000),
      title: 'Schema migration checkpoint',
      memoryId: 'codex-process-audit-b',
      content: 'checkpoint schema migration staged',
      evidence: 'audit evidence b',
      tags: ['schema']
    });

    const result = await app.adapters.vcpPassiveMemoryAdapter.search('[[orm migration checkpoint]] ::Rerank+0.6 ::TagMemo+1.5', {
      target: 'process',
      limit: 2
    });

    assert.equal(result.results.length, 2);

    const entries = await app.stores.auditLogStore.readRecentRecallAudit(10);
    assert.ok(entries.length >= 1);

    const latest = entries.at(-1);
    assert.equal(latest.target, 'process');
    assert.ok(latest.candidateCount >= 2);
    assert.ok(latest.semanticCandidateCount >= 2);
    assert.equal(latest.rerankMode, 'local-rrf');
    assert.equal(latest.rrfAlpha, 0.6);
    assert.ok(Array.isArray(latest.queryAxes));
  });
});
