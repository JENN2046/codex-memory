'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { postCheckNativeDiaryResults } = require('../src/core/NativeDiaryResultPostCheck');

test('single diary post-check accepts normalized slash and backslash relative paths', () => {
  for (const fullPath of ['DIARY_PRIVATE/note.md', 'DIARY_PRIVATE\\nested\\note.md']) {
    const result = postCheckNativeDiaryResults([{ fullPath }], ['DIARY_PRIVATE']);
    assert.equal(result.accepted, true, fullPath);
  }
});

test('single diary post-check rejects absolute traversal missing and mismatch paths atomically', () => {
  for (const fullPath of [
    '/DIARY_PRIVATE/note.md',
    'C:/DIARY_PRIVATE/note.md',
    '..\\DIARY_PRIVATE\\note.md',
    'DIARY_PRIVATE/../other.md',
    'OTHER/note.md',
    null
  ]) {
    const results = [{ fullPath: 'DIARY_PRIVATE/ok.md' }, { fullPath }];
    assert.equal(postCheckNativeDiaryResults(results, ['DIARY_PRIVATE']).accepted, false, String(fullPath));
  }
});

test('multi diary post-check requires explicit matching diaryName on every result', () => {
  assert.equal(postCheckNativeDiaryResults([
    { diaryName: 'DIARY_PROJECT' },
    { diaryName: 'DIARY_WORKSPACE' }
  ], ['DIARY_PROJECT', 'DIARY_WORKSPACE']).accepted, true);

  for (const result of [{}, { diaryName: 'OTHER' }, null]) {
    assert.equal(postCheckNativeDiaryResults([
      { diaryName: 'DIARY_PROJECT' },
      result
    ], ['DIARY_PROJECT', 'DIARY_WORKSPACE']).accepted, false);
  }
});
