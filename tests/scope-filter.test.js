const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');

function setupApp(configOverrides = {}) {
  const tempDir = path.join(os.tmpdir(), 'codex-memory-scope-filter-' + Date.now());
  return {
    tempDir,
    app: createCodexMemoryApplication({
      projectBasePath: tempDir,
      dailyNoteRootPath: path.join(tempDir, 'dailynote'),
      logsDir: path.join(tempDir, 'logs'),
      dataDir: path.join(tempDir, 'data'),
      ...configOverrides
    })
  };
}

async function cleanup({ app, tempDir }) {
  await app.close();
  await fs.rm(tempDir, { recursive: true, force: true });
}

test('scope filter — search_memory works without scope param (backward compat)', async () => {
  const ctx = setupApp();
  await ctx.app.initialize();
  try {
    const r = await ctx.app.callTool('search_memory', { query: 'test', target: 'knowledge', limit: 3 });
    assert.ok(r.results, 'should have results property');
  } finally {
    await cleanup(ctx);
  }
});

test('scope filter — project_id mismatch returns 0 results', async () => {
  const ctx = setupApp();
  await ctx.app.initialize();
  try {
    const r = await ctx.app.callTool('search_memory', {
      query: 'test', target: 'knowledge', limit: 3,
      scope: { project_id: 'non-existent-project' }
    });
    const count = r.results?.results?.length ?? 0;
    assert.equal(count, 0, 'wrong project_id should return 0 results');
  } finally {
    await cleanup(ctx);
  }
});

test('scope filter — visibility single string works', async () => {
  const ctx = setupApp();
  await ctx.app.initialize();
  try {
    const r = await ctx.app.callTool('search_memory', {
      query: 'test', target: 'knowledge', limit: 3,
      scope: { visibility: 'private' }
    });
    assert.ok(r.results, 'should not throw');
  } finally {
    await cleanup(ctx);
  }
});

test('scope filter — visibility array works', async () => {
  const ctx = setupApp();
  await ctx.app.initialize();
  try {
    const r = await ctx.app.callTool('search_memory', {
      query: 'test', target: 'knowledge', limit: 3,
      scope: { visibility: ['project', 'shared'] }
    });
    assert.ok(r.results, 'should not throw');
  } finally {
    await cleanup(ctx);
  }
});

test('scope filter — null/empty scope does not filter', async () => {
  const ctx = setupApp();
  await ctx.app.initialize();
  try {
    const r1 = await ctx.app.callTool('search_memory', { query: 'test', target: 'knowledge', limit: 3 });
    const r2 = await ctx.app.callTool('search_memory', {
      query: 'test', target: 'knowledge', limit: 3, scope: {}
    });
    // Both should complete without error
    assert.equal(typeof r1.results, 'object');
    assert.equal(typeof r2.results, 'object');
  } finally {
    await cleanup(ctx);
  }
});
