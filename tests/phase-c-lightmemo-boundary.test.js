const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');

async function withApp(handler, configOverrides = {}) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-phase-c-lightmemo-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    ...configOverrides
  });

  await app.initialize();

  try {
    await handler({ app, tempBasePath });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

function codexRequestContext() {
  return {
    executionContext: {
      agentAlias: 'Codex',
      agentId: 'codex-desktop',
      requestSource: 'phase-c-lightmemo-test'
    }
  };
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

async function writeDiaryEntry({ app, target, date, title, memoryId, content, evidence, tags = [], subdirectories = [] }) {
  const directory = path.join(app.stores.diaryStore.getDirectoryForTarget(target), ...subdirectories);
  await fs.mkdir(directory, { recursive: true });
  const { datePart, timePart } = formatDateParts(date);
  const fileName = `${datePart}-${timePart}-${title.replace(/\s+/g, '-')}.txt`;
  const filePath = path.join(directory, fileName);
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
  await fs.utimes(filePath, date, date);
}

test('LightMemo boundary should map donor options and format output', async () => {
  await withApp(async ({ app }) => {
    await writeDiaryEntry({
      app,
      target: 'knowledge',
      date: new Date('2026-04-18T08:00:00.000Z'),
      title: 'Shared migration checkpoint',
      memoryId: 'codex-knowledge-folder-a',
      content: 'migration checkpoint inside nested folder a',
      evidence: 'lightmemo donor mapping',
      tags: ['migration', 'keke'],
      subdirectories: ['Keke', 'FolderA']
    });

    await writeDiaryEntry({
      app,
      target: 'knowledge',
      date: new Date('2026-04-18T08:05:00.000Z'),
      title: 'Shared migration checkpoint',
      memoryId: 'codex-knowledge-folder-b',
      content: 'migration checkpoint inside nested folder b',
      evidence: 'lightmemo donor mapping',
      tags: ['migration'],
      subdirectories: ['Other', 'FolderB']
    });

    await writeDiaryEntry({
      app,
      target: 'knowledge',
      date: new Date('2026-04-18T08:10:00.000Z'),
      title: 'Shared migration checkpoint',
      memoryId: 'codex-knowledge-folder-keke-b',
      content: 'migration checkpoint inside nested folder keke b',
      evidence: 'lightmemo donor mapping',
      tags: ['migration', 'keke'],
      subdirectories: ['Keke', 'FolderB']
    });

    await writeDiaryEntry({
      app,
      target: 'knowledge',
      date: new Date('2026-04-18T08:15:00.000Z'),
      title: 'Shared migration checkpoint',
      memoryId: 'codex-knowledge-folder-other-a',
      content: 'migration checkpoint inside nested folder other a',
      evidence: 'lightmemo donor mapping',
      tags: ['migration'],
      subdirectories: ['Other', 'FolderA']
    });

    await app.rebuildShadowFromDiary({ target: 'knowledge' });

    const response = await app.adapters.vcpLightMemoryAdapter.search({
      query: 'migration checkpoint',
      maid: 'Keke',
      folder: 'FolderA',
      k: 5,
      rerank: 'rrf0.6',
      tag_boost: '0.8',
      core_tags: ['migration', 'keke']
    });

    assert.equal(response.mode, 'lightmemo');
    assert.equal(response.target, 'knowledge');
    assert.equal(response.results.length, 1);
    assert.equal(response.results[0].memoryId, 'codex-knowledge-folder-a');
    assert.match(response.results[0].sourceFile, /FolderA/i);
    assert.match(response.compatibilityQuery, /::Rerank\+0.6/);
    assert.match(response.compatibilityQuery, /::TagMemo\(0.8\)/);
    assert.match(response.outputText, /\[--- LightMemo Recall ---\]/);
    assert.equal(response.outputText, response.legacyResult);

    const recallEntries = await app.stores.auditLogStore.readRecentRecallAudit(10);
    const latestKnowledge = [...recallEntries].reverse().find(entry => entry.target === 'knowledge');
    assert.equal(latestKnowledge.candidateCount, 1);
  });
});

test('LightMemo boundary should hard-filter maid path before candidate ranking', async () => {
  await withApp(async ({ app }) => {
    await writeDiaryEntry({
      app,
      target: 'knowledge',
      date: new Date('2026-04-18T09:00:00.000Z'),
      title: 'Maid scoped checkpoint',
      memoryId: 'codex-knowledge-maid-keke',
      content: 'scoped checkpoint in keke path',
      evidence: 'maid-only hard filter',
      tags: ['checkpoint'],
      subdirectories: ['Keke', 'FolderA']
    });

    await writeDiaryEntry({
      app,
      target: 'knowledge',
      date: new Date('2026-04-18T09:05:00.000Z'),
      title: 'Maid scoped checkpoint',
      memoryId: 'codex-knowledge-maid-other',
      content: 'scoped checkpoint in other path',
      evidence: 'maid-only hard filter',
      tags: ['checkpoint'],
      subdirectories: ['Other', 'FolderA']
    });

    await app.rebuildShadowFromDiary({ target: 'knowledge' });

    const response = await app.adapters.vcpLightMemoryAdapter.search({
      query: 'scoped checkpoint',
      maid: 'Keke',
      k: 5
    });

    assert.equal(response.results.length, 1);
    assert.equal(response.results[0].memoryId, 'codex-knowledge-maid-keke');
    assert.match(response.results[0].sourceFile, /Keke/i);

    const recallEntries = await app.stores.auditLogStore.readRecentRecallAudit(10);
    const latestKnowledge = [...recallEntries].reverse().find(entry => entry.target === 'knowledge');
    assert.equal(latestKnowledge.candidateCount, 1);
  });
});

test('LightMemo boundary should support donor aliases and search_all_knowledge_bases', async () => {
  await withApp(async ({ app }) => {
    const ctx = codexRequestContext();
    await app.callTool('record_memory', {
      target: 'process',
      title: 'Process shared checkpoint',
      content: 'shared boundary token from process',
      evidence: 'search all boundary',
      validated: true,
      reusable: false,
      tags: ['shared'],
      sensitivity: 'none'
    }, ctx);

    await app.callTool('record_memory', {
      target: 'knowledge',
      title: 'Knowledge shared checkpoint',
      content: 'shared boundary token from knowledge',
      evidence: 'search all boundary',
      validated: true,
      reusable: true,
      tags: ['shared'],
      sensitivity: 'none'
    }, ctx);

    const response = await app.adapters.vcpLightMemoryAdapter.execute('', {
      key_word: 'shared boundary token',
      maid: 'Keke',
      folder: 'FolderA',
      search_all_knowledge_bases: true,
      k: 10
    });

    assert.equal(response.mode, 'lightmemo');
    assert.equal(response.target, 'both');
    assert.ok(response.results.length >= 2);
    assert.deepEqual(
      [...new Set(response.results.map(item => item.target))].sort(),
      ['knowledge', 'process']
    );
    assert.match(response.compatibilityQuery, /\[\[shared boundary token\]\]/);
  });
});

test('LightMemo boundary should exclude configured folders by default and resolve directory aliases', async () => {
  await withApp(async ({ app }) => {
    await writeDiaryEntry({
      app,
      target: 'knowledge',
      date: new Date('2026-04-20T10:00:00.000Z'),
      title: 'Mapped project checkpoint',
      memoryId: 'codex-knowledge-mapped-alpha',
      content: 'mapped project checkpoint in team shared alpha',
      evidence: 'directory map test',
      tags: ['project'],
      subdirectories: ['TeamShared', 'ProjectAlpha']
    });

    await writeDiaryEntry({
      app,
      target: 'knowledge',
      date: new Date('2026-04-20T10:05:00.000Z'),
      title: 'Mapped project checkpoint',
      memoryId: 'codex-knowledge-mapped-beta',
      content: 'mapped project checkpoint in team shared beta',
      evidence: 'directory map test',
      tags: ['project'],
      subdirectories: ['TeamShared', 'ProjectBeta']
    });

    await writeDiaryEntry({
      app,
      target: 'knowledge',
      date: new Date('2026-04-20T10:10:00.000Z'),
      title: 'Mapped project checkpoint',
      memoryId: 'codex-knowledge-archive-alpha',
      content: 'mapped project checkpoint in archive alpha',
      evidence: 'directory map test',
      tags: ['project'],
      subdirectories: ['ArchiveKB', 'ProjectAlpha']
    });

    await app.rebuildShadowFromDiary({ target: 'knowledge' });

    const broadResponse = await app.adapters.vcpLightMemoryAdapter.search({
      query: 'mapped project checkpoint',
      k: 10
    });

    assert.ok(broadResponse.results.some(item => item.memoryId === 'codex-knowledge-mapped-alpha'));
    assert.ok(broadResponse.results.some(item => item.memoryId === 'codex-knowledge-mapped-beta'));
    assert.ok(broadResponse.results.every(item => item.memoryId !== 'codex-knowledge-archive-alpha'));

    const mappedResponse = await app.adapters.vcpLightMemoryAdapter.search({
      query: 'mapped project checkpoint',
      folder: 'studioalpha',
      k: 5
    });

    assert.equal(mappedResponse.results.length, 1);
    assert.equal(mappedResponse.results[0].memoryId, 'codex-knowledge-mapped-alpha');
    assert.match(mappedResponse.results[0].sourceFile, /TeamShared/i);
    assert.match(mappedResponse.results[0].sourceFile, /ProjectAlpha/i);
  }, {
    lightMemoExcludedFolders: ['ArchiveKB'],
    lightMemoDirectoryMap: {
      studioalpha: ['TeamShared', 'ProjectAlpha']
    }
  });
});

test('LightMemo boundary should translate bracket time range into recall directive', async () => {
  await withApp(async ({ app }) => {
    await writeDiaryEntry({
      app,
      target: 'knowledge',
      date: new Date('2026-04-15T10:00:00.000Z'),
      title: 'Recent spring checkpoint',
      memoryId: 'codex-knowledge-spring',
      content: 'checkpoint in spring window',
      evidence: 'spring evidence',
      tags: ['checkpoint']
    });

    await writeDiaryEntry({
      app,
      target: 'knowledge',
      date: new Date('2025-12-20T10:00:00.000Z'),
      title: 'Old winter checkpoint',
      memoryId: 'codex-knowledge-winter',
      content: 'checkpoint in winter window',
      evidence: 'winter evidence',
      tags: ['checkpoint']
    });

    await app.rebuildShadowFromDiary({ target: 'knowledge' });

    const response = await app.adapters.vcpLightMemoryAdapter.search({
      query: '[2026-04-01~2026-04-30] checkpoint',
      k: 5
    });

    assert.equal(response.mode, 'lightmemo');
    assert.match(response.compatibilityQuery, /::Time\(2026-04-01~2026-04-30\)/);
    assert.ok(response.results.length >= 1);
    assert.ok(response.results.every(item => item.title !== 'Old winter checkpoint'));
    assert.ok(response.results.some(item => item.title === 'Recent spring checkpoint'));
  });
});

test('LightMemo boundary should favor tag and title matches over title-only and body-only matches', async () => {
  await withApp(async ({ app }) => {
    await writeDiaryEntry({
      app,
      target: 'knowledge',
      date: new Date('2026-04-19T09:00:00.000Z'),
      title: 'ORM migration lens',
      memoryId: 'codex-knowledge-tag-title',
      content: 'adapter notes with rollback details',
      evidence: 'tag and title weighted hit',
      tags: ['orm', 'migration']
    });

    await writeDiaryEntry({
      app,
      target: 'knowledge',
      date: new Date('2026-04-19T09:05:00.000Z'),
      title: 'ORM migration headline',
      memoryId: 'codex-knowledge-title-only',
      content: 'refactor notes without explicit tags',
      evidence: 'title weighted hit',
      tags: []
    });

    await writeDiaryEntry({
      app,
      target: 'knowledge',
      date: new Date('2026-04-19T09:10:00.000Z'),
      title: 'General notebook',
      memoryId: 'codex-knowledge-body-only',
      content: 'orm migration checkpoint appears only inside the body text',
      evidence: 'body weighted hit',
      tags: []
    });

    await app.rebuildShadowFromDiary({ target: 'knowledge' });

    const response = await app.adapters.vcpLightMemoryAdapter.search({
      query: 'orm migration checkpoint',
      k: 3,
      rerank: 'rrf0.6',
      tag_boost: '1.2',
      core_tags: ['orm', 'migration']
    });

    assert.equal(response.results.length, 3);
    assert.deepEqual(
      response.results.map(item => item.memoryId),
      [
        'codex-knowledge-tag-title',
        'codex-knowledge-title-only',
        'codex-knowledge-body-only'
      ]
    );
    assert.ok(response.results[0].matchedTags.includes('orm'));
    assert.ok((response.results[0].score || 0) >= (response.results[1].score || 0));
    assert.ok((response.results[1].score || 0) >= (response.results[2].score || 0));
  });
});
