'use strict';

const MCP_WRAPPER_CONTENT_PATH = 'result.content';
const STRUCTURED_ROOT_PATH = 'result.structuredContent';

const FORBIDDEN_RESULT_KEYS = new Set([
  'content',
  'text',
  'snippet',
  'raw_text',
  'rawText',
  'filePath',
  'sourceFile',
  'memoryId',
  'title',
  'path',
  'fullPath',
  'relativePath',
  'auditLogPath',
  'jsonlLine',
  'sqlitePath',
  'vectorPayload',
  'candidateCachePayload'
]);

const STORE_PATH_PATTERNS = [
  /\.jsonl$/i,
  /\.sqlite$/i,
  /\.sqlite3$/i,
  /[/\\][^/\\]*(?:audit|vector|cache|candidate)[^/\\]*[/\\]?/i
];

const SAFE_RESULT_KEYS = new Set([
  'target',
  'score',
  'baseScore',
  'rerankScore',
  'matchedTags',
  'coreTags',
  'titleHitCount',
  'tagHitCount',
  'contentHitCount',
  'evidenceHitCount',
  'exactCoreTagCount',
  'tagMemoSurfaceScore',
  'dynamicCoreWeight',
  'createdAt',
  'updatedAt',
  'sourceKinds',
  'resultCount'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function joinPath(parent, key) {
  return parent ? `${parent}.${key}` : String(key);
}

function valueLooksLikeStorePath(value) {
  if (typeof value !== 'string') return false;
  return STORE_PATH_PATTERNS.some(pattern => pattern.test(value));
}

function inspectResultItem(item, path, violations) {
  if (!isPlainObject(item)) return;

  for (const [key, value] of Object.entries(item)) {
    const keyPath = joinPath(path, key);
    if (FORBIDDEN_RESULT_KEYS.has(key)) {
      violations.push({ path: keyPath, reason: 'forbidden_result_key' });
      continue;
    }
    if (valueLooksLikeStorePath(value)) {
      violations.push({ path: keyPath, reason: 'store_path_value' });
      continue;
    }
    if (!SAFE_RESULT_KEYS.has(key)) {
      violations.push({ path: keyPath, reason: 'unknown_result_key' });
    }
  }
}

function inspectStructuredContent(structuredContent, violations) {
  if (!isPlainObject(structuredContent)) {
    violations.push({ path: STRUCTURED_ROOT_PATH, reason: 'missing_structured_content' });
    return;
  }

  const results = structuredContent.results;
  if (results === undefined) {
    return;
  }
  if (!Array.isArray(results)) {
    violations.push({ path: `${STRUCTURED_ROOT_PATH}.results`, reason: 'results_not_array' });
    return;
  }

  results.forEach((item, index) => {
    inspectResultItem(item, `${STRUCTURED_ROOT_PATH}.results[${index}]`, violations);
  });
}

function inspectSearchMemoryResponseShape(payload) {
  const violations = [];
  if (!isPlainObject(payload)) {
    violations.push({ path: '$', reason: 'payload_not_object' });
    return {
      accepted: false,
      resultCount: 0,
      violations,
      wrapperContentIgnored: false
    };
  }

  const structuredContent = payload?.result?.structuredContent;
  inspectStructuredContent(structuredContent, violations);

  const results = Array.isArray(structuredContent?.results) ? structuredContent.results : [];

  return {
    accepted: violations.length === 0,
    resultCount: results.length,
    violations,
    wrapperContentIgnored: Array.isArray(payload?.result?.content)
      && payload.result.content.some(item => item?.type === 'text' && typeof item?.text === 'string')
  };
}

module.exports = {
  FORBIDDEN_RESULT_KEYS,
  SAFE_RESULT_KEYS,
  inspectSearchMemoryResponseShape
};
