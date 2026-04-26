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

function normalizeKeywordUnit(segment = '') {
  return String(segment || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^[([{]/, '')
    .replace(/[\])}]$/, '')
    .replace(/:(-?\d+(?:\.\d+)?)$/, '')
    .trim()
    .toLowerCase();
}

function extractDeepMemoKeywordUnits(query = '') {
  const source = String(query || '');
  const segments = source.match(/"[^"]+"|'[^']+'|[^,，\s]+/g) || [];
  const units = [];

  for (const segment of segments) {
    const normalizedSegment = normalizeKeywordUnit(segment);
    if (!normalizedSegment) continue;

    if (normalizedSegment.includes('|')) {
      normalizedSegment.split('|').map(item => item.trim()).filter(Boolean).forEach(item => units.push(item));
      continue;
    }

    units.push(normalizedSegment);
  }

  return [...new Set(units)];
}

function buildDeepMemoErrorMeta({ app, options, rawInput, parsedInput, error, parseFailed }) {
  if (parseFailed) {
    return {
      inputSource: options?.inputFile ? 'file' : 'stdin',
      rawInputPreview: String(rawInput || '').trim().replace(/\s+/g, ' ').slice(0, 120)
    };
  }

  const maid = firstNonEmpty(parsedInput?.maid, parsedInput?.maidName, '');
  const agentId = firstNonEmpty(parsedInput?.agentId, null);
  const keyword = firstNonEmpty(parsedInput?.keyword, parsedInput?.query, '');
  const meta = {
    command: 'Search',
    maid: typeof maid === 'string' ? maid : '',
    maidName: typeof maid === 'string' ? maid : '',
    agentId,
    agent_id: agentId,
    keyword,
    rawKeyword: keyword,
    raw_keyword: keyword,
    query: keyword,
    rawQuery: keyword,
    raw_query: keyword
  };

  if (error?.code === 'all-keywords-blocked') {
    const blockedSet = new Set(
      (app?.config?.activeMemoryBlockedKeywords || [])
        .map(item => String(item || '').trim().toLowerCase())
        .filter(Boolean)
    );
    const queryUnits = extractDeepMemoKeywordUnits(keyword);
    const blockedKeywords = queryUnits.filter(unit => blockedSet.has(unit));
    const effectiveKeywords = queryUnits.filter(unit => !blockedSet.has(unit));
    meta.blockedKeywords = blockedKeywords;
    meta.blocked_keyword_count = blockedKeywords.length;
    meta.blockedKeywordCount = blockedKeywords.length;
    meta.effectiveKeywords = effectiveKeywords;
    meta.effective_keyword_count = effectiveKeywords.length;
    meta.effectiveKeywordCount = effectiveKeywords.length;
    meta.effective_keyword_text = effectiveKeywords.join(', ');
    meta.effectiveKeywordText = effectiveKeywords.join(', ');
  }

  return meta;
}

runActiveMemoryCli({
  toolName: 'DeepMemo',
  argv: process.argv.slice(2),
  execute: async (app, input) => app.adapters.vcpActiveMemoryAdapter.search(input),
  buildErrorMeta: buildDeepMemoErrorMeta
});
