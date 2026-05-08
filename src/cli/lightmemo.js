#!/usr/bin/env node
const { runActiveMemoryCli } = require('./active-memory-cli-common');

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    return value;
  }
  return undefined;
}

function buildLightMemoErrorMeta({ options, rawInput, parsedInput, error, parseFailed }) {
  if (parseFailed) {
    return {
      inputSource: options?.inputFile ? 'file' : 'stdin',
      rawInputPreview: String(rawInput || '').trim().replace(/\s+/g, ' ').slice(0, 120)
    };
  }

  const maid = firstNonEmpty(parsedInput?.maid, parsedInput?.maidName, '');
  const keyword = firstNonEmpty(parsedInput?.keyword, parsedInput?.query, '');
  return {
    command: 'Search',
    maid: typeof maid === 'string' ? maid : '',
    maidName: typeof maid === 'string' ? maid : '',
    keyword: typeof keyword === 'string' ? keyword : '',
    query: typeof keyword === 'string' ? keyword : ''
  };
}

runActiveMemoryCli({
  toolName: 'LightMemo',
  argv: process.argv.slice(2),
  execute: async (app, input) => app.adapters.vcpLightMemoryAdapter.search(input),
  buildErrorMeta: buildLightMemoErrorMeta
});
