const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createConfig } = require('../src/config/createConfig');
const { DiaryStore } = require('../src/storage/DiaryStore');

test('DiaryStore readRecord should parse CRLF content and evidence sections', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-diary-crlf-'));
  const filePath = path.join(tempBasePath, 'crlf-memory.md');
  const raw = [
    '[2026-05-22] - Codex',
    'Title: CRLF imported record',
    'Memory-ID: cm-crlf-import',
    'Record-Type: process',
    'Validated: yes',
    'Reusable: no',
    '',
    'Content:',
    'Type: checkpoint',
    'CRLF content survives import.',
    '',
    'Evidence:',
    'CRLF evidence survives import.',
    '',
    'Tag: crlf, import'
  ].join('\r\n');

  try {
    await fs.writeFile(filePath, raw, 'utf8');
    const store = new DiaryStore(createConfig({
      projectBasePath: tempBasePath,
      dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
      logsDir: path.join(tempBasePath, 'logs'),
      dataDir: path.join(tempBasePath, 'data')
    }));

    const record = await store.readRecord(filePath, 'process');

    assert.equal(record.content, 'Type: checkpoint\nCRLF content survives import.');
    assert.equal(record.evidence, 'CRLF evidence survives import.');
    assert.deepEqual(record.tags, ['crlf', 'import']);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
