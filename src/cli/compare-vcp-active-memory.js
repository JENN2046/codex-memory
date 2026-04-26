#!/usr/bin/env node
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const { readStdin } = require('./active-memory-cli-common');

const TOOL_MAP = {
  deepmemo: 'deepmemo',
  topicmemo: 'topicmemo'
};

const DEFAULT_NEW_SCRIPT = {
  deepmemo: path.resolve(__dirname, 'deepmemo.js'),
  topicmemo: path.resolve(__dirname, 'topicmemo.js')
};

const DEFAULT_LEGACY_SCRIPT = {
  deepmemo: path.resolve(__dirname, '../../../VCP/VCPChat/VCPDistributedServer/Plugin/DeepMemo/DeepMemo.js'),
  topicmemo: path.resolve(__dirname, '../../../VCP/VCPChat/VCPDistributedServer/Plugin/TopicMemo/TopicMemo.js')
};

const CORE_DIFF_FIELDS = ['status', 'exitCode', 'result', 'error'];
const EXTENDED_DIFF_FIELDS = [
  'status',
  'exitCode',
  'code',
  'toolName',
  'tool_name',
  'command',
  'maid',
  'maidName',
  'agentId',
  'agent_id',
  'topicId',
  'topic_id',
  'topicName',
  'historyStatus',
  'resultCount',
  'result_count',
  'topicCount',
  'topic_count',
  'result',
  'error'
];
const ERROR_ONLY_EXTENDED_DIFF_FIELDS = [
  'keyword',
  'rawKeyword',
  'raw_keyword',
  'query',
  'rawQuery',
  'raw_query',
  'inputSource',
  'rawInputPreview',
  'blockedKeywords',
  'blockedKeywordCount',
  'blocked_keyword_count',
  'effectiveKeywords',
  'effectiveKeywordCount',
  'effective_keyword_count',
  'effectiveKeywordText',
  'effective_keyword_text'
];
const SUCCESS_META_EXTENDED_DIFF_FIELDS = [
  'blockedKeywords',
  'blockedKeywordCount',
  'blocked_keyword_count',
  'effectiveKeywords',
  'effectiveKeywordCount',
  'effective_keyword_count',
  'effectiveKeywordText',
  'effective_keyword_text'
];
const FIXTURE_MANIFEST_BASENAME = '.codex-fixture-manifest.json';

function parseArgs(argv = []) {
  const options = {
    json: false,
    tool: '',
    category: '',
    expectation: '',
    fixture: '',
    tag: '',
    tagAll: '',
    excludeTag: '',
    excludeFixture: '',
    suiteFile: '',
    inputFile: '',
    legacyScript: '',
    newScript: '',
    timeoutMs: 30000,
    requireMatch: false,
    requireLegacy: false,
    cwd: process.cwd()
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--tool') {
      options.tool = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--category') {
      options.category = String(argv[index + 1] || '').trim().toLowerCase();
      index += 1;
      continue;
    }
    if (token === '--expectation') {
      options.expectation = String(argv[index + 1] || '').trim().toLowerCase();
      index += 1;
      continue;
    }
    if (token === '--fixture') {
      options.fixture = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--tag') {
      options.tag = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--tag-all') {
      options.tagAll = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--exclude-tag') {
      options.excludeTag = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--exclude-fixture') {
      options.excludeFixture = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--suite') {
      options.suiteFile = path.resolve(process.cwd(), argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--input-file') {
      options.inputFile = path.resolve(process.cwd(), argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--legacy-script') {
      options.legacyScript = path.resolve(process.cwd(), argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--new-script') {
      options.newScript = path.resolve(process.cwd(), argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--timeout-ms') {
      const parsed = Number.parseInt(String(argv[index + 1] || ''), 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        options.timeoutMs = parsed;
      }
      index += 1;
      continue;
    }
    if (token === '--cwd') {
      options.cwd = path.resolve(process.cwd(), argv[index + 1] || '.');
      index += 1;
      continue;
    }
    if (token === '--require-match') {
      options.requireMatch = true;
      continue;
    }
    if (token === '--require-legacy') {
      options.requireLegacy = true;
    }
  }

  return options;
}

async function loadInput(options) {
  if (options.inputFile) {
    return fs.readFile(options.inputFile, 'utf8');
  }
  return readStdin();
}

function resolvePathLike(baseDir, targetPath) {
  if (typeof targetPath !== 'string' || !targetPath.trim()) return '';
  return path.isAbsolute(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(baseDir, targetPath);
}

function resolveTimeout(...values) {
  for (const value of values) {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 30000;
}

function normalizeTool(rawTool) {
  const normalized = String(rawTool || '').trim().toLowerCase();
  return TOOL_MAP[normalized] || '';
}

async function fileExists(targetPath) {
  if (!targetPath) return false;
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function parseMaybeJson(text = '') {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;

  const lines = trimmed
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    try {
      return JSON.parse(line);
    } catch {
      // Continue scanning upward until we find the last JSON line.
    }
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : null;
}

function normalizeScalarForDiff(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return JSON.stringify(value);
}

function buildComparableFieldMap(execution, options = {}) {
  const payload = execution?.payload && typeof execution.payload === 'object'
    ? execution.payload
    : {};
  const status = execution?.status ?? payload.status ?? null;
  const payloadMeta = options.includePayloadMeta
    && payload.meta
    && typeof payload.meta === 'object'
    && !Array.isArray(payload.meta)
    ? payload.meta
    : null;
  const errorMeta = status === 'error' && payload.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta)
    ? payload.meta
    : null;
  const getComparableValue = field => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      return payload[field];
    }
    if (errorMeta && Object.prototype.hasOwnProperty.call(errorMeta, field)) {
      return errorMeta[field];
    }
    if (payloadMeta && Object.prototype.hasOwnProperty.call(payloadMeta, field)) {
      return payloadMeta[field];
    }
    return undefined;
  };

  return {
    status: normalizeScalarForDiff(status),
    exitCode: Number.isInteger(execution?.code) ? execution.code : execution?.code ?? null,
    code: normalizeScalarForDiff(getComparableValue('code')),
    toolName: normalizeScalarForDiff(getComparableValue('toolName')),
    tool_name: normalizeScalarForDiff(getComparableValue('tool_name')),
    command: normalizeScalarForDiff(getComparableValue('command')),
    maid: normalizeScalarForDiff(getComparableValue('maid')),
    maidName: normalizeScalarForDiff(getComparableValue('maidName')),
    agentId: normalizeScalarForDiff(getComparableValue('agentId')),
    agent_id: normalizeScalarForDiff(getComparableValue('agent_id')),
    keyword: normalizeScalarForDiff(getComparableValue('keyword')),
    rawKeyword: normalizeScalarForDiff(getComparableValue('rawKeyword')),
    raw_keyword: normalizeScalarForDiff(getComparableValue('raw_keyword')),
    query: normalizeScalarForDiff(getComparableValue('query')),
    rawQuery: normalizeScalarForDiff(getComparableValue('rawQuery')),
    raw_query: normalizeScalarForDiff(getComparableValue('raw_query')),
    topicId: normalizeScalarForDiff(getComparableValue('topicId')),
    topic_id: normalizeScalarForDiff(getComparableValue('topic_id')),
    topicName: normalizeScalarForDiff(getComparableValue('topicName')),
    historyStatus: normalizeScalarForDiff(getComparableValue('historyStatus')),
    inputSource: normalizeScalarForDiff(getComparableValue('inputSource')),
    rawInputPreview: normalizeScalarForDiff(getComparableValue('rawInputPreview')),
    blockedKeywords: normalizeScalarForDiff(getComparableValue('blockedKeywords')),
    blockedKeywordCount: normalizeScalarForDiff(getComparableValue('blockedKeywordCount')),
    blocked_keyword_count: normalizeScalarForDiff(getComparableValue('blocked_keyword_count')),
    effectiveKeywords: normalizeScalarForDiff(getComparableValue('effectiveKeywords')),
    effectiveKeywordCount: normalizeScalarForDiff(getComparableValue('effectiveKeywordCount')),
    effective_keyword_count: normalizeScalarForDiff(getComparableValue('effective_keyword_count')),
    effectiveKeywordText: normalizeScalarForDiff(getComparableValue('effectiveKeywordText')),
    effective_keyword_text: normalizeScalarForDiff(getComparableValue('effective_keyword_text')),
    resultCount: normalizeScalarForDiff(getComparableValue('resultCount')),
    result_count: normalizeScalarForDiff(getComparableValue('result_count')),
    topicCount: normalizeScalarForDiff(getComparableValue('topicCount')),
    topic_count: normalizeScalarForDiff(getComparableValue('topic_count')),
    result: normalizeScalarForDiff(execution?.resultText ?? payload.result),
    error: normalizeScalarForDiff(execution?.errorText ?? payload.error)
  };
}

function buildFieldDiff(newMap, legacyMap, fields) {
  const comparedFields = [];
  const mismatchedFields = [];

  for (const field of fields) {
    const newValue = newMap[field] ?? null;
    const legacyValue = legacyMap[field] ?? null;
    if (newValue === null && legacyValue === null) {
      continue;
    }

    const match = newValue === legacyValue;
    const payload = {
      field,
      match,
      newValue,
      legacyValue
    };
    comparedFields.push(payload);
    if (!match) {
      mismatchedFields.push(payload);
    }
  }

  return {
    comparedCount: comparedFields.length,
    mismatchedCount: mismatchedFields.length,
    matched: mismatchedFields.length === 0,
    comparedFields,
    mismatchedFields
  };
}

function normalizeExecution(execution) {
  const stdoutJson = parseMaybeJson(execution.stdout);
  const stderrJson = parseMaybeJson(execution.stderr);
  const payload = stdoutJson || stderrJson;
  const normalizedStatus = payload?.status || (execution.code === 0 ? 'success' : 'error');
  const normalizedErrorText = normalizeText(payload?.error)
    || (
      normalizedStatus === 'error'
        ? (normalizeText(execution.error) || normalizeText(execution.stderr))
        : null
    );

  return {
    ...execution,
    payload,
    payloadSource: stdoutJson ? 'stdout' : stderrJson ? 'stderr' : 'none',
    status: normalizedStatus,
    resultText: normalizeText(payload?.result),
    errorText: normalizedErrorText
  };
}

function compareExecutions(newExecution, legacyExecution) {
  if (!legacyExecution) {
    return {
      available: false,
      statusMatch: null,
      exitCodeMatch: null,
      resultMatch: null,
      errorMatch: null,
      coreDiff: null,
      extendedDiff: null,
      matched: null,
      outcome: 'legacy-unavailable',
      driftReasons: ['legacy-unavailable']
    };
  }

  const successMetaComparable = newExecution.status === 'success'
    && legacyExecution.status === 'success'
    && newExecution?.payload?.meta
    && typeof newExecution.payload.meta === 'object'
    && !Array.isArray(newExecution.payload.meta)
    && legacyExecution?.payload?.meta
    && typeof legacyExecution.payload.meta === 'object'
    && !Array.isArray(legacyExecution.payload.meta);
  const newFieldMap = buildComparableFieldMap(newExecution, { includePayloadMeta: successMetaComparable });
  const legacyFieldMap = buildComparableFieldMap(legacyExecution, { includePayloadMeta: successMetaComparable });
  const statusMatch = newExecution.status === legacyExecution.status;
  const exitCodeMatch = newExecution.code === legacyExecution.code;
  const resultMatch = newExecution.resultText === legacyExecution.resultText;
  const errorMatch = newExecution.errorText === legacyExecution.errorText;
  const coreDiff = buildFieldDiff(newFieldMap, legacyFieldMap, CORE_DIFF_FIELDS);
  const extendedFields = newExecution.status === 'error' || legacyExecution.status === 'error'
    ? [...EXTENDED_DIFF_FIELDS, ...ERROR_ONLY_EXTENDED_DIFF_FIELDS]
    : successMetaComparable
      ? SUCCESS_META_EXTENDED_DIFF_FIELDS
      : EXTENDED_DIFF_FIELDS;
  const extendedDiff = buildFieldDiff(newFieldMap, legacyFieldMap, extendedFields);
  const matched = statusMatch && exitCodeMatch && (
    newExecution.status === 'success'
      ? resultMatch
      : errorMatch
  ) && coreDiff.matched;

  const comparison = {
    available: true,
    statusMatch,
    exitCodeMatch,
    resultMatch,
    errorMatch,
    coreDiff,
    extendedDiff,
    matched
  };

  return {
    ...comparison,
    outcome: getComparisonOutcome(comparison),
    driftReasons: getDriftReasonsFromComparison(comparison)
  };
}

function buildSummary(options, comparison, legacyAvailable, legacySelected) {
  if (options.requireLegacy && !legacyAvailable) {
    return {
      ok: false,
      comparable: false,
      matched: comparison.matched,
      message: `Legacy script is required but unavailable: ${legacySelected || 'not provided'}`
    };
  }

  if (options.requireMatch && comparison.matched !== true) {
    return {
      ok: false,
      comparable: comparison.available,
      matched: comparison.matched,
      message: 'Comparison did not match.'
    };
  }

  if (!legacyAvailable) {
    return {
      ok: true,
      comparable: false,
      matched: comparison.matched,
      message: 'New CLI executed. Legacy comparison was skipped.'
    };
  }

  return {
    ok: true,
    comparable: true,
    matched: comparison.matched,
    message: comparison.matched
      ? 'New CLI matches the legacy output.'
      : 'New CLI and legacy output differ.'
  };
}

function buildAggregateFieldReport(caseReports = [], diffKey) {
  const counts = new Map();
  let totalMismatchCount = 0;

  for (const caseReport of caseReports) {
    const mismatchedFields = caseReport?.comparison?.[diffKey]?.mismatchedFields || [];
    totalMismatchCount += mismatchedFields.length;
    for (const diff of mismatchedFields) {
      counts.set(diff.field, (counts.get(diff.field) || 0) + 1);
    }
  }

  return {
    totalMismatchCount,
    fields: [...counts.entries()]
      .map(([field, count]) => ({ field, count }))
      .sort((left, right) => right.count - left.count || left.field.localeCompare(right.field))
  };
}

function incrementBreakdownCount(map, key) {
  if (!(map instanceof Map) || typeof key !== 'string' || !key.trim()) {
    return;
  }
  map.set(key, (map.get(key) || 0) + 1);
}

function finalizeBreakdownMap(map) {
  if (!(map instanceof Map) || map.size === 0) {
    return {};
  }
  return Object.fromEntries(
    [...map.entries()].sort((left, right) => left[0].localeCompare(right[0]))
  );
}

function formatBreakdownInline(breakdown = {}, { limit = 6 } = {}) {
  if (!breakdown || typeof breakdown !== 'object') {
    return '';
  }

  const entries = Object.entries(breakdown)
    .filter(([, count]) => Number.isFinite(count) && count > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));

  if (entries.length === 0) {
    return '';
  }

  return entries
    .slice(0, limit)
    .map(([key, count]) => `${key}=${count}`)
    .join(', ');
}

function getComparisonOutcome(comparison) {
  if (comparison?.available === false) {
    return 'legacy-unavailable';
  }
  if (comparison?.matched === true) {
    return 'matched';
  }
  return 'mismatched';
}

function getDriftReasonsFromComparison(comparison) {
  if (comparison?.available === false) {
    return ['legacy-unavailable'];
  }

  const reasons = new Set();
  if (comparison?.statusMatch === false) {
    reasons.add('status-mismatch');
  }
  if (comparison?.exitCodeMatch === false) {
    reasons.add('exit-code-mismatch');
  }
  if (comparison?.resultMatch === false) {
    reasons.add('result-mismatch');
  }
  if (comparison?.errorMatch === false) {
    reasons.add('error-mismatch');
  }
  if ((comparison?.coreDiff?.mismatchedCount ?? 0) > 0) {
    reasons.add('core-diff');
  }
  if (
    (comparison?.extendedDiff?.mismatchedCount ?? 0) > 0
    && (comparison?.coreDiff?.mismatchedCount ?? 0) === 0
  ) {
    reasons.add('extended-only-drift');
  }

  return [...reasons].sort((left, right) => left.localeCompare(right));
}

function getComparisonBreakdownKey(caseReport) {
  return getComparisonOutcome(caseReport?.comparison);
}

function getDriftReasons(caseReport) {
  return getDriftReasonsFromComparison(caseReport?.comparison);
}

function normalizeCaseCategory(meta = null) {
  const category = typeof meta?.category === 'string' ? meta.category.trim() : '';
  return category || 'uncategorized';
}

function normalizeCategoryFilter(rawCategory = '') {
  return [...new Set(
    String(rawCategory || '')
      .split(',')
      .map(item => item.trim().toLowerCase())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right));
}

function normalizeExpectationFilter(rawExpectation = '') {
  return [...new Set(
    String(rawExpectation || '')
      .split(',')
      .map(item => item.trim().toLowerCase())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right));
}

function normalizeListFilter(rawValue = '') {
  return [...new Set(
    String(rawValue || '')
      .split(',')
      .map(item => item.trim().toLowerCase())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right));
}

function normalizeCaseFixture(meta = null) {
  const fixture = typeof meta?.fixture === 'string' ? meta.fixture.trim() : '';
  return fixture || 'unknown';
}

function normalizeCaseTags(meta = null) {
  if (!Array.isArray(meta?.tags)) {
    return [];
  }
  return meta.tags
    .map(tag => String(tag || '').trim())
    .filter(Boolean);
}

function normalizeTagAllFilter(rawTagAll = '') {
  return [...new Set(
    String(rawTagAll || '')
      .split(',')
      .map(item => item.trim().toLowerCase())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right));
}

function normalizeCaseExpectation(meta = null) {
  const expectation = typeof meta?.expectation === 'string' ? meta.expectation.trim() : '';
  return expectation || 'unknown';
}

function normalizeToolFilter(rawTool = '') {
  return [...new Set(
    String(rawTool || '')
      .split(',')
      .map(item => normalizeTool(item))
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right));
}

function matchesCategoryFilter(meta = null, categoryFilter = []) {
  if (!Array.isArray(categoryFilter) || categoryFilter.length === 0) {
    return true;
  }
  return categoryFilter.includes(normalizeCaseCategory(meta).toLowerCase());
}

function matchesExpectationFilter(meta = null, expectationFilter = []) {
  if (!Array.isArray(expectationFilter) || expectationFilter.length === 0) {
    return true;
  }
  return expectationFilter.includes(normalizeCaseExpectation(meta).toLowerCase());
}

function matchesFixtureFilter(meta = null, fixtureFilter = []) {
  if (!Array.isArray(fixtureFilter) || fixtureFilter.length === 0) {
    return true;
  }
  return fixtureFilter.includes(normalizeCaseFixture(meta).toLowerCase());
}

function matchesFixtureExcludeFilter(meta = null, fixtureExcludeFilter = []) {
  if (!Array.isArray(fixtureExcludeFilter) || fixtureExcludeFilter.length === 0) {
    return false;
  }
  return fixtureExcludeFilter.includes(normalizeCaseFixture(meta).toLowerCase());
}

function matchesTagFilter(meta = null, tagFilter = []) {
  if (!Array.isArray(tagFilter) || tagFilter.length === 0) {
    return true;
  }
  return normalizeCaseTags(meta)
    .map(tag => tag.toLowerCase())
    .some(tag => tagFilter.includes(tag));
}

function matchesTagAllFilter(meta = null, tagAllFilter = []) {
  if (!Array.isArray(tagAllFilter) || tagAllFilter.length === 0) {
    return true;
  }

  const lowerTags = normalizeCaseTags(meta)
    .map(tag => tag.toLowerCase());
  return tagAllFilter.every(tag => lowerTags.includes(tag));
}

function matchesExcludeTagFilter(meta = null, excludeTagFilter = []) {
  if (!Array.isArray(excludeTagFilter) || excludeTagFilter.length === 0) {
    return false;
  }

  const lowerTags = normalizeCaseTags(meta)
    .map(tag => tag.toLowerCase());
  return lowerTags.some(tag => excludeTagFilter.includes(tag));
}

function matchesToolFilter(caseTool = '', toolFilter = []) {
  if (!Array.isArray(toolFilter) || toolFilter.length === 0) {
    return true;
  }
  return toolFilter.includes(caseTool);
}

function buildCategoryAggregate(caseReports = []) {
  const categoryMap = new Map();

  for (const caseReport of caseReports) {
    const category = normalizeCaseCategory(caseReport?.meta);
    const fixture = normalizeCaseFixture(caseReport?.meta);
    let aggregate = categoryMap.get(category);
    if (!aggregate) {
      aggregate = {
        category,
        totalCaseCount: 0,
        comparableCaseCount: 0,
        matchedCaseCount: 0,
        mismatchedCaseCount: 0,
        legacyUnavailableCaseCount: 0,
        coreMismatchCountTotal: 0,
        extendedMismatchCountTotal: 0,
        expectedSuccessCaseCount: 0,
        expectedErrorCaseCount: 0,
        fixtures: new Set(),
        caseNames: [],
        comparisonBreakdownMap: new Map(),
        driftReasonBreakdownMap: new Map(),
        fixtureAggregateMap: new Map()
      };
      categoryMap.set(category, aggregate);
    }

    let fixtureAggregate = aggregate.fixtureAggregateMap.get(fixture);
    if (!fixtureAggregate) {
      fixtureAggregate = {
        fixture,
        totalCaseCount: 0,
        comparableCaseCount: 0,
        matchedCaseCount: 0,
        mismatchedCaseCount: 0,
        legacyUnavailableCaseCount: 0,
        coreMismatchCountTotal: 0,
        extendedMismatchCountTotal: 0,
        expectedSuccessCaseCount: 0,
        expectedErrorCaseCount: 0,
        caseNames: [],
        comparisonBreakdownMap: new Map(),
        driftReasonBreakdownMap: new Map()
      };
      aggregate.fixtureAggregateMap.set(fixture, fixtureAggregate);
    }

    aggregate.totalCaseCount += 1;
    fixtureAggregate.totalCaseCount += 1;
    if (caseReport?.comparison?.available) {
      aggregate.comparableCaseCount += 1;
      fixtureAggregate.comparableCaseCount += 1;
    }
    if (caseReport?.comparison?.matched === true) {
      aggregate.matchedCaseCount += 1;
      fixtureAggregate.matchedCaseCount += 1;
    }
    if (caseReport?.comparison?.available && caseReport?.comparison?.matched === false) {
      aggregate.mismatchedCaseCount += 1;
      fixtureAggregate.mismatchedCaseCount += 1;
    }
    if (caseReport?.comparison?.available === false) {
      aggregate.legacyUnavailableCaseCount += 1;
      fixtureAggregate.legacyUnavailableCaseCount += 1;
    }
    aggregate.coreMismatchCountTotal += caseReport?.comparison?.coreDiff?.mismatchedCount ?? 0;
    aggregate.extendedMismatchCountTotal += caseReport?.comparison?.extendedDiff?.mismatchedCount ?? 0;
    fixtureAggregate.coreMismatchCountTotal += caseReport?.comparison?.coreDiff?.mismatchedCount ?? 0;
    fixtureAggregate.extendedMismatchCountTotal += caseReport?.comparison?.extendedDiff?.mismatchedCount ?? 0;
    incrementBreakdownCount(aggregate.comparisonBreakdownMap, getComparisonBreakdownKey(caseReport));
    incrementBreakdownCount(fixtureAggregate.comparisonBreakdownMap, getComparisonBreakdownKey(caseReport));
    for (const reason of getDriftReasons(caseReport)) {
      incrementBreakdownCount(aggregate.driftReasonBreakdownMap, reason);
      incrementBreakdownCount(fixtureAggregate.driftReasonBreakdownMap, reason);
    }

    const expectation = typeof caseReport?.meta?.expectation === 'string'
      ? caseReport.meta.expectation.trim()
      : '';
    if (expectation === 'success') {
      aggregate.expectedSuccessCaseCount += 1;
      fixtureAggregate.expectedSuccessCaseCount += 1;
    } else if (expectation === 'error') {
      aggregate.expectedErrorCaseCount += 1;
      fixtureAggregate.expectedErrorCaseCount += 1;
    }

    aggregate.fixtures.add(fixture);
    aggregate.caseNames.push(caseReport?.name || '');
    fixtureAggregate.caseNames.push(caseReport?.name || '');
  }

  return [...categoryMap.values()]
    .map(item => {
      const {
        fixtureAggregateMap,
        comparisonBreakdownMap,
        driftReasonBreakdownMap,
        ...rest
      } = item;
      return {
        ...rest,
        comparisonBreakdown: finalizeBreakdownMap(comparisonBreakdownMap),
        driftReasonBreakdown: finalizeBreakdownMap(driftReasonBreakdownMap),
        fixtures: [...item.fixtures].sort((left, right) => left.localeCompare(right)),
        caseNames: item.caseNames.filter(Boolean).sort((left, right) => left.localeCompare(right)),
        fixtureAggregate: [...fixtureAggregateMap.values()]
          .map(fixtureItem => {
            const {
              comparisonBreakdownMap: fixtureComparisonBreakdownMap,
              driftReasonBreakdownMap: fixtureDriftReasonBreakdownMap,
              ...fixtureRest
            } = fixtureItem;
            return {
              ...fixtureRest,
              comparisonBreakdown: finalizeBreakdownMap(fixtureComparisonBreakdownMap),
              driftReasonBreakdown: finalizeBreakdownMap(fixtureDriftReasonBreakdownMap),
              caseNames: fixtureItem.caseNames
                .filter(Boolean)
                .sort((left, right) => left.localeCompare(right))
            };
          })
          .sort((left, right) => left.fixture.localeCompare(right.fixture))
      };
    })
    .sort((left, right) => left.category.localeCompare(right.category));
}

function buildSuiteSummary(options, caseReports = []) {
  const totalCaseCount = caseReports.length;
  const comparableCaseCount = caseReports.filter(report => report.comparison?.available).length;
  const matchedCaseCount = caseReports.filter(report => report.comparison?.matched === true).length;
  const mismatchedCaseCount = caseReports.filter(report => report.comparison?.available && report.comparison?.matched === false).length;
  const legacyUnavailableCaseCount = caseReports.filter(report => report.comparison?.available === false).length;
  const coreAggregate = buildAggregateFieldReport(caseReports, 'coreDiff');
  const extendedAggregate = buildAggregateFieldReport(caseReports, 'extendedDiff');
  const matchedAll = totalCaseCount > 0 && matchedCaseCount === totalCaseCount;
  const comparisonBreakdownMap = new Map();
  const driftReasonBreakdownMap = new Map();

  for (const caseReport of caseReports) {
    incrementBreakdownCount(comparisonBreakdownMap, getComparisonBreakdownKey(caseReport));
    for (const reason of getDriftReasons(caseReport)) {
      incrementBreakdownCount(driftReasonBreakdownMap, reason);
    }
  }

  let ok = true;
  let message = matchedAll
    ? 'All suite cases match the legacy output.'
    : 'Suite completed with compatibility differences.';

  if (options.requireLegacy && legacyUnavailableCaseCount > 0) {
    ok = false;
    message = 'Suite contains cases without an available legacy script.';
  } else if (options.requireMatch && (mismatchedCaseCount > 0 || legacyUnavailableCaseCount > 0)) {
    ok = false;
    message = 'Suite contains unmatched cases.';
  }

  return {
    ok,
    totalCaseCount,
    comparableCaseCount,
    matchedCaseCount,
    mismatchedCaseCount,
    legacyUnavailableCaseCount,
    matchedAll,
    comparisonBreakdown: finalizeBreakdownMap(comparisonBreakdownMap),
    driftReasonBreakdown: finalizeBreakdownMap(driftReasonBreakdownMap),
    coreMismatchCountTotal: coreAggregate.totalMismatchCount,
    extendedMismatchCountTotal: extendedAggregate.totalMismatchCount,
    message
  };
}

function formatTextReport(report) {
  const lines = [
    `status: ${report.summary.ok ? 'ok' : 'error'}`,
    report.summary.message,
    '',
    `[tool] ${report.tool}`,
    `[comparison] available=${report.comparison.available} matched=${report.comparison.matched} outcome=${report.comparison.outcome}`
  ];
  if (Array.isArray(report.comparison.driftReasons) && report.comparison.driftReasons.length > 0) {
    lines.push(`[drift-reasons] ${report.comparison.driftReasons.join(', ')}`);
  }

  if (report.comparison.coreDiff) {
    lines.push(`[core-diff] mismatched=${report.comparison.coreDiff.mismatchedCount}/${report.comparison.coreDiff.comparedCount}`);
  }
  if (report.comparison.extendedDiff?.mismatchedFields?.length) {
    lines.push('[extended-diff]');
    for (const diff of report.comparison.extendedDiff.mismatchedFields) {
      lines.push(`  ${diff.field}: new=${JSON.stringify(diff.newValue)} legacy=${JSON.stringify(diff.legacyValue)}`);
    }
  }

  for (const [label, execution] of [
    ['new', report.newRun],
    ['legacy', report.legacyRun]
  ]) {
    if (!execution) continue;
    lines.push('');
    lines.push(`[${label}] status=${execution.status} code=${execution.code}`);
    if (execution.resultText) {
      lines.push(`  result: ${execution.resultText}`);
    }
    if (execution.errorText) {
      lines.push(`  error: ${execution.errorText}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function formatSuiteTextReport(report) {
  const lines = [
    `status: ${report.summary.ok ? 'ok' : 'error'}`,
    report.summary.message,
    `[suite] cases=${report.summary.totalCaseCount} comparable=${report.summary.comparableCaseCount} matched=${report.summary.matchedCaseCount} mismatched=${report.summary.mismatchedCaseCount}`,
    `[aggregate] coreMismatchCount=${report.summary.coreMismatchCountTotal} extendedMismatchCount=${report.summary.extendedMismatchCountTotal}`
  ];
  const comparisonBreakdownText = formatBreakdownInline(report.summary.comparisonBreakdown);
  if (comparisonBreakdownText) {
    lines.push(`[comparison-breakdown] ${comparisonBreakdownText}`);
  }
  const driftReasonBreakdownText = formatBreakdownInline(report.summary.driftReasonBreakdown);
  if (driftReasonBreakdownText) {
    lines.push(`[drift-reason-breakdown] ${driftReasonBreakdownText}`);
  }

  if ((report.fixturePreparation?.preparedFixtureCount || 0) > 0) {
    lines.push(`[fixtures] prepared=${report.fixturePreparation.preparedFixtureCount}`);
  }
  if (report.categoryFilter) {
    lines.push(`[category-filter] ${report.categoryFilter}`);
  }
  if (Array.isArray(report.expectationFilter) && report.expectationFilter.length > 0) {
    lines.push(`[expectation-filter] ${report.expectationFilter.join(', ')}`);
  }
  if (Array.isArray(report.toolFilter) && report.toolFilter.length > 0) {
    lines.push(`[tool-filter] ${report.toolFilter.join(', ')}`);
  }
  if (Array.isArray(report.fixtureFilter) && report.fixtureFilter.length > 0) {
    lines.push(`[fixture-filter] ${report.fixtureFilter.join(', ')}`);
  }
  if (Array.isArray(report.tagFilter) && report.tagFilter.length > 0) {
    lines.push(`[tag-filter] ${report.tagFilter.join(', ')}`);
  }
  if (Array.isArray(report.tagAllFilter) && report.tagAllFilter.length > 0) {
    lines.push(`[tag-all-filter] ${report.tagAllFilter.join(', ')}`);
  }
  if (Array.isArray(report.excludeTagFilter) && report.excludeTagFilter.length > 0) {
    lines.push(`[exclude-tag-filter] ${report.excludeTagFilter.join(', ')}`);
  }
  if (Array.isArray(report.excludeFixtureFilter) && report.excludeFixtureFilter.length > 0) {
    lines.push(`[exclude-fixture-filter] ${report.excludeFixtureFilter.join(', ')}`);
  }

  if (Array.isArray(report.categoryAggregate) && report.categoryAggregate.length > 0) {
    lines.push('[category-aggregate]');
    for (const item of report.categoryAggregate) {
      const driftPreview = formatBreakdownInline(item.driftReasonBreakdown, { limit: 3 });
      lines.push(
        `  ${item.category}: total=${item.totalCaseCount} matched=${item.matchedCaseCount} mismatched=${item.mismatchedCaseCount} coreMismatchCount=${item.coreMismatchCountTotal}${driftPreview ? ` drift=${driftPreview}` : ''}`
      );
      if (Array.isArray(item.fixtureAggregate) && item.fixtureAggregate.length > 0) {
        for (const fixtureItem of item.fixtureAggregate) {
          const fixtureDriftPreview = formatBreakdownInline(fixtureItem.driftReasonBreakdown, { limit: 2 });
          lines.push(
            `    ${fixtureItem.fixture}: total=${fixtureItem.totalCaseCount} matched=${fixtureItem.matchedCaseCount} mismatched=${fixtureItem.mismatchedCaseCount} coreMismatchCount=${fixtureItem.coreMismatchCountTotal}${fixtureDriftPreview ? ` drift=${fixtureDriftPreview}` : ''}`
          );
        }
      }
    }
  }

  if (report.aggregateDiff.core.fields.length > 0) {
    lines.push('[aggregate-core-diff]');
    for (const item of report.aggregateDiff.core.fields.slice(0, 10)) {
      lines.push(`  ${item.field}: ${item.count}`);
    }
  }

  if (report.aggregateDiff.extended.fields.length > 0) {
    lines.push('[aggregate-extended-diff]');
    for (const item of report.aggregateDiff.extended.fields.slice(0, 10)) {
      lines.push(`  ${item.field}: ${item.count}`);
    }
  }

  for (const caseReport of report.cases) {
    lines.push('');
    lines.push(
      `[case:${caseReport.name}] tool=${caseReport.tool} matched=${caseReport.comparison.matched} outcome=${caseReport.comparison.outcome}`
    );
    if (caseReport.comparison.coreDiff) {
      lines.push(`  coreMismatchCount: ${caseReport.comparison.coreDiff.mismatchedCount}`);
    }
    if (Array.isArray(caseReport.comparison.driftReasons) && caseReport.comparison.driftReasons.length > 0) {
      lines.push(`  driftReasons: ${caseReport.comparison.driftReasons.join(', ')}`);
    }
    if (caseReport.comparison.extendedDiff?.mismatchedFields?.length) {
      const preview = caseReport.comparison.extendedDiff.mismatchedFields
        .slice(0, 5)
        .map(diff => diff.field)
        .join(', ');
      lines.push(`  extendedMismatchFields: ${preview}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function normalizeEnvOverrides(source = {}) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {};
  }

  const result = {};
  for (const [key, value] of Object.entries(source)) {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey || value === undefined || value === null) continue;
    result[normalizedKey] = String(value);
  }
  return result;
}

function resolveSuiteEnvValue(suiteDir, key, value) {
  const normalizedKey = String(key || '').trim();
  const normalizedValue = String(value || '').trim();
  if (!normalizedKey || !normalizedValue) return normalizedValue;

  const looksPathLikeKey = /(?:_PATH|_ROOT|_DIR)$/i.test(normalizedKey);
  const looksRelativePathValue = normalizedValue.startsWith('./')
    || normalizedValue.startsWith('.\\')
    || normalizedValue.startsWith('../')
    || normalizedValue.startsWith('..\\');

  if (looksPathLikeKey && looksRelativePathValue) {
    return path.resolve(suiteDir, normalizedValue);
  }

  return normalizedValue;
}

function normalizeFixtureManifestPath(relativePath = '') {
  return String(relativePath || '')
    .trim()
    .replace(/[\\/]+/g, path.sep)
    .replace(new RegExp(`^\\${path.sep}+`), '');
}

function normalizeFixtureManifestTimestamp(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function readFixtureManifest(rootPath) {
  const manifestPath = path.join(rootPath, FIXTURE_MANIFEST_BASENAME);

  try {
    const rawContent = await fs.readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(rawContent);
    const timestamps = parsed && typeof parsed.timestamps === 'object' && !Array.isArray(parsed.timestamps)
      ? parsed.timestamps
      : {};
    const entries = Object.entries(timestamps)
      .map(([relativePath, timestamp]) => ({
        relativePath: normalizeFixtureManifestPath(relativePath),
        timestamp: normalizeFixtureManifestTimestamp(timestamp)
      }))
      .filter(entry => entry.relativePath && entry.timestamp);

    if (entries.length === 0) {
      return null;
    }

    return {
      manifestPath,
      entries
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function createSuiteFixtureRuntime() {
  const preparedFixtureMap = new Map();
  const tempDirectories = [];

  async function prepareFixtureRoot(rootPath) {
    const resolvedRoot = path.resolve(rootPath);
    if (preparedFixtureMap.has(resolvedRoot)) {
      return preparedFixtureMap.get(resolvedRoot);
    }

    const rootStats = await fs.stat(resolvedRoot).catch(() => null);
    if (!rootStats?.isDirectory()) {
      const passthrough = {
        sourceRoot: resolvedRoot,
        preparedRoot: resolvedRoot,
        manifestPath: null,
        stampedEntryCount: 0,
        copied: false
      };
      preparedFixtureMap.set(resolvedRoot, passthrough);
      return passthrough;
    }

    const manifest = await readFixtureManifest(resolvedRoot);
    if (!manifest) {
      const passthrough = {
        sourceRoot: resolvedRoot,
        preparedRoot: resolvedRoot,
        manifestPath: null,
        stampedEntryCount: 0,
        copied: false
      };
      preparedFixtureMap.set(resolvedRoot, passthrough);
      return passthrough;
    }

    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-suite-fixture-'));
    const preparedRoot = path.join(tempDirectory, path.basename(resolvedRoot));
    await fs.cp(resolvedRoot, preparedRoot, { recursive: true });

    for (const entry of manifest.entries) {
      const targetPath = path.join(preparedRoot, entry.relativePath);
      const targetStats = await fs.stat(targetPath).catch(() => null);
      if (!targetStats) {
        throw new Error(`Fixture manifest entry does not exist: ${targetPath}`);
      }
      await fs.utimes(targetPath, entry.timestamp, entry.timestamp);
    }

    tempDirectories.push(tempDirectory);
    const prepared = {
      sourceRoot: resolvedRoot,
      preparedRoot,
      manifestPath: manifest.manifestPath,
      stampedEntryCount: manifest.entries.length,
      copied: true
    };
    preparedFixtureMap.set(resolvedRoot, prepared);
    return prepared;
  }

  return {
    async prepareEnvOverrides(envOverrides = {}) {
      const normalizedEnv = normalizeEnvOverrides(envOverrides);
      const preparedEnv = {};

      for (const [key, value] of Object.entries(normalizedEnv)) {
        const normalizedKey = String(key || '').trim();
        const normalizedValue = String(value || '').trim();
        if (!normalizedKey || !normalizedValue) {
          continue;
        }

        if (/(?:_PATH|_ROOT|_DIR)$/i.test(normalizedKey)) {
          const preparedFixture = await prepareFixtureRoot(normalizedValue);
          preparedEnv[normalizedKey] = preparedFixture.preparedRoot;
          continue;
        }

        preparedEnv[normalizedKey] = normalizedValue;
      }

      return preparedEnv;
    },
    getReport() {
      const preparedFixtures = [...preparedFixtureMap.values()]
        .filter(item => item.copied)
        .map(item => ({
          sourceRoot: item.sourceRoot,
          preparedRoot: item.preparedRoot,
          manifestPath: item.manifestPath,
          stampedEntryCount: item.stampedEntryCount
        }))
        .sort((left, right) => left.sourceRoot.localeCompare(right.sourceRoot));

      return {
        preparedFixtureCount: preparedFixtures.length,
        preparedFixtures
      };
    },
    async cleanup() {
      while (tempDirectories.length > 0) {
        const tempDirectory = tempDirectories.pop();
        await fs.rm(tempDirectory, { recursive: true, force: true });
      }
    }
  };
}

function runNodeScript(scriptPath, { input, args = [], cwd, timeoutMs, envOverrides = {} }) {
  return new Promise(resolve => {
    let stdout = '';
    let stderr = '';
    let finished = false;
    let timedOut = false;
    const startedAt = Date.now();
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd,
      env: {
        ...process.env,
        ...normalizeEnvOverrides(envOverrides)
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const finalize = extra => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      resolve({
        scriptPath,
        cwd,
        stdout,
        stderr,
        runtimeMs: Date.now() - startedAt,
        timedOut,
        ...extra
      });
    };

    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on('data', chunk => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', error => {
      finalize({
        code: null,
        signal: null,
        error: error.message
      });
    });
    child.on('close', (code, signal) => {
      finalize({
        code,
        signal,
        error: null
      });
    });

    child.stdin.end(input);
  });
}

async function buildSingleCompareReport({
  tool,
  rawInput,
  options,
  newScriptOverride = '',
  legacyScriptOverride = '',
  cwdOverride = '',
  envOverrides = {}
}) {
  const newScript = newScriptOverride || options.newScript || DEFAULT_NEW_SCRIPT[tool];
  const requestedLegacyScript = legacyScriptOverride || options.legacyScript || DEFAULT_LEGACY_SCRIPT[tool];
  const executionCwd = cwdOverride || options.cwd;
  const legacyAvailable = await fileExists(requestedLegacyScript);

  const newExecution = normalizeExecution(await runNodeScript(newScript, {
    input: rawInput,
    args: ['--full'],
    cwd: executionCwd,
    timeoutMs: options.timeoutMs,
    envOverrides
  }));

  const legacyExecution = legacyAvailable
    ? normalizeExecution(await runNodeScript(requestedLegacyScript, {
        input: rawInput,
        args: [],
        cwd: path.dirname(requestedLegacyScript),
        timeoutMs: options.timeoutMs,
        envOverrides
      }))
    : null;

  const comparison = compareExecutions(newExecution, legacyExecution);
  const summary = buildSummary(options, comparison, legacyAvailable, requestedLegacyScript);
  return {
    generatedAt: new Date().toISOString(),
    tool,
    requestedLegacyScript,
    resolvedNewScript: newScript,
    summary,
    comparison,
    newRun: newExecution,
    legacyRun: legacyExecution
  };
}

async function loadSuiteDefinition(suiteFile) {
  const resolvedSuiteFile = path.resolve(process.cwd(), suiteFile);
  const rawContent = await fs.readFile(resolvedSuiteFile, 'utf8');
  const parsed = JSON.parse(rawContent);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.cases) || parsed.cases.length === 0) {
    throw new Error('Suite file must be a JSON object with a non-empty cases array.');
  }

  return {
    ...parsed,
    suiteFile: resolvedSuiteFile,
    suiteDir: path.dirname(resolvedSuiteFile)
  };
}

async function loadSuiteCaseInput(suite, caseDefinition) {
  if (Object.prototype.hasOwnProperty.call(caseDefinition, 'input')) {
    return typeof caseDefinition.input === 'string'
      ? caseDefinition.input
      : JSON.stringify(caseDefinition.input);
  }

  if (typeof caseDefinition.inputFile === 'string' && caseDefinition.inputFile.trim()) {
    return fs.readFile(resolvePathLike(suite.suiteDir, caseDefinition.inputFile), 'utf8');
  }

  throw new Error(`Suite case "${caseDefinition.name || 'unnamed'}" is missing input or inputFile.`);
}

function resolveSuiteCaseOptions(options, suite, caseDefinition) {
  return {
    ...options,
    timeoutMs: resolveTimeout(caseDefinition.timeoutMs, suite.timeoutMs, options.timeoutMs),
    cwd: resolvePathLike(suite.suiteDir, caseDefinition.cwd || suite.cwd || options.cwd) || options.cwd
  };
}

async function resolveSuiteCaseEnv(suite, caseDefinition, fixtureRuntime) {
  const merged = {
    ...normalizeEnvOverrides(suite.env),
    ...normalizeEnvOverrides(caseDefinition.env)
  };

  const resolvedEnv = Object.fromEntries(
    Object.entries(merged).map(([key, value]) => [key, resolveSuiteEnvValue(suite.suiteDir, key, value)])
  );
  return fixtureRuntime.prepareEnvOverrides(resolvedEnv);
}

async function buildSuiteCompareReport(suite, options) {
  const caseReports = [];
  const fixtureRuntime = createSuiteFixtureRuntime();
  const categoryFilter = normalizeCategoryFilter(options.category);
  const expectationFilter = normalizeExpectationFilter(options.expectation);
  const toolFilter = normalizeToolFilter(options.tool);
  const fixtureFilter = normalizeListFilter(options.fixture);
  const tagFilter = normalizeListFilter(options.tag);
  const tagAllFilter = normalizeTagAllFilter(options.tagAll);
  const excludeTagFilter = normalizeListFilter(options.excludeTag);
  const excludeFixtureFilter = normalizeListFilter(options.excludeFixture);

  try {
    for (let index = 0; index < suite.cases.length; index += 1) {
      const caseDefinition = suite.cases[index] || {};
      const tool = normalizeTool(caseDefinition.tool || suite.tool || options.tool);
      if (
        !matchesCategoryFilter(caseDefinition.meta, categoryFilter)
        || !matchesExpectationFilter(caseDefinition.meta, expectationFilter)
        || !matchesToolFilter(tool, toolFilter)
        || !matchesFixtureFilter(caseDefinition.meta, fixtureFilter)
        || !matchesTagFilter(caseDefinition.meta, tagFilter)
        || !matchesTagAllFilter(caseDefinition.meta, tagAllFilter)
        || matchesExcludeTagFilter(caseDefinition.meta, excludeTagFilter)
        || matchesFixtureExcludeFilter(caseDefinition.meta, excludeFixtureFilter)
      ) {
        continue;
      }
      if (!tool) {
        throw new Error(`Suite case ${index + 1} is missing a supported tool.`);
      }

      const rawInput = await loadSuiteCaseInput(suite, caseDefinition);
      const caseOptions = resolveSuiteCaseOptions(options, suite, caseDefinition);
      const envOverrides = await resolveSuiteCaseEnv(suite, caseDefinition, fixtureRuntime);
      const report = await buildSingleCompareReport({
        tool,
        rawInput,
        options: caseOptions,
        newScriptOverride: resolvePathLike(suite.suiteDir, caseDefinition.newScript || suite.newScript),
        legacyScriptOverride: resolvePathLike(suite.suiteDir, caseDefinition.legacyScript || suite.legacyScript),
        cwdOverride: caseOptions.cwd,
        envOverrides
      });

      caseReports.push({
        name: String(caseDefinition.name || `case-${index + 1}`).trim() || `case-${index + 1}`,
        index,
        meta: caseDefinition.meta || null,
        ...report
      });
    }

    if ((categoryFilter.length > 0
      || expectationFilter.length > 0
      || toolFilter.length > 0
      || fixtureFilter.length > 0
      || tagFilter.length > 0
      || tagAllFilter.length > 0
      || excludeTagFilter.length > 0
      || excludeFixtureFilter.length > 0
    ) && caseReports.length === 0) {
      const filters = [
        categoryFilter.length > 0 ? `--category ${categoryFilter.join(',')}` : '',
        expectationFilter.length > 0 ? `--expectation ${expectationFilter.join(',')}` : '',
        toolFilter.length > 0 ? `--tool ${toolFilter.join(',')}` : '',
        fixtureFilter.length > 0 ? `--fixture ${fixtureFilter.join(',')}` : '',
        tagFilter.length > 0 ? `--tag ${tagFilter.join(',')}` : '',
        tagAllFilter.length > 0 ? `--tag-all ${tagAllFilter.join(',')}` : '',
        excludeTagFilter.length > 0 ? `--exclude-tag ${excludeTagFilter.join(',')}` : '',
        excludeFixtureFilter.length > 0 ? `--exclude-fixture ${excludeFixtureFilter.join(',')}` : ''
      ].filter(Boolean);
      throw new Error(`No suite cases match ${filters.join(' ')}.`);
    }

    const summary = buildSuiteSummary(options, caseReports);
    const categoryAggregate = buildCategoryAggregate(caseReports);
    return {
      generatedAt: new Date().toISOString(),
      mode: 'suite',
      suiteFile: suite.suiteFile,
      categoryFilter: categoryFilter.length === 1
        ? categoryFilter[0]
        : categoryFilter.length > 1
          ? categoryFilter
          : null,
      expectationFilter: expectationFilter.length > 0 ? expectationFilter : null,
      toolFilter: toolFilter.length > 0 ? toolFilter : null,
      fixtureFilter: fixtureFilter.length > 0 ? fixtureFilter : null,
      tagFilter: tagFilter.length > 0 ? tagFilter : null,
      tagAllFilter: tagAllFilter.length > 0 ? tagAllFilter : null,
      excludeTagFilter: excludeTagFilter.length > 0 ? excludeTagFilter : null,
      excludeFixtureFilter: excludeFixtureFilter.length > 0 ? excludeFixtureFilter : null,
      metaVersion: suite.metaVersion ?? null,
      metaSchema: suite.metaSchema ?? null,
      summary,
      categoryAggregate,
      fixturePreparation: fixtureRuntime.getReport(),
      aggregateDiff: {
        core: buildAggregateFieldReport(caseReports, 'coreDiff'),
        extended: buildAggregateFieldReport(caseReports, 'extendedDiff')
      },
      cases: caseReports
    };
  } finally {
    await fixtureRuntime.cleanup();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let report;

  if (options.suiteFile) {
    const suite = await loadSuiteDefinition(options.suiteFile);
    report = await buildSuiteCompareReport(suite, options);
  } else {
    const tool = normalizeTool(options.tool);
    if (!tool) {
      throw new Error('Missing or unsupported --tool. Supported values: deepmemo, topicmemo.');
    }

    const rawInput = await loadInput(options);
    report = await buildSingleCompareReport({
      tool,
      rawInput,
      options
    });
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(report.mode === 'suite' ? formatSuiteTextReport(report) : formatTextReport(report));
  }

  if (!report.summary.ok) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
