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

function collectKeyPaths(value, path = '') {
  const paths = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const childPath = `${path}[${index}]`;
      paths.push(childPath);
      paths.push(...collectKeyPaths(item, childPath));
    });
    return paths;
  }
  if (!isPlainObject(value)) {
    return paths;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = joinPath(path, key);
    paths.push(childPath);
    paths.push(...collectKeyPaths(child, childPath));
  }
  return paths;
}

function readAccessFlag(access, key) {
  return isPlainObject(access) && access[key] === true;
}

function inspectBoundedSearchEvidenceShape(payload) {
  const shape = inspectSearchMemoryResponseShape(payload);
  const structuredContent = isPlainObject(payload)
    ? payload?.result?.structuredContent
    : null;
  const access = isPlainObject(structuredContent?.access) ? structuredContent.access : {};
  const results = Array.isArray(structuredContent?.results) ? structuredContent.results : [];
  const structuredKeyPaths = isPlainObject(structuredContent)
    ? collectKeyPaths(structuredContent, STRUCTURED_ROOT_PATH)
    : [];

  const resultItemMemoryIdPaths = [];
  const resultItemPathPaths = [];
  const resultItemTitlePaths = [];
  const resultItemSnippetPaths = [];
  const resultItemRawContentPaths = [];

  results.forEach((item, index) => {
    if (!isPlainObject(item)) return;
    for (const key of Object.keys(item)) {
      const keyPath = `${STRUCTURED_ROOT_PATH}.results[${index}].${key}`;
      if (['memoryId', 'memoryIds', 'topMemoryId'].includes(key)) {
        resultItemMemoryIdPaths.push(keyPath);
      }
      if (['path', 'filePath', 'sourceFile', 'sourceFiles', 'topSourceFile'].includes(key)) {
        resultItemPathPaths.push(keyPath);
      }
      if (key === 'title') {
        resultItemTitlePaths.push(keyPath);
      }
      if (key === 'snippet') {
        resultItemSnippetPaths.push(keyPath);
      }
      if (['content', 'text', 'raw_text', 'rawText'].includes(key)) {
        resultItemRawContentPaths.push(keyPath);
      }
    }
  });

  const rawContentReturned = readAccessFlag(access, 'rawContentReturned') || resultItemRawContentPaths.length > 0;
  const pathsReturned = readAccessFlag(access, 'pathsReturned') || resultItemPathPaths.length > 0;
  const memoryIdsReturned = readAccessFlag(access, 'memoryIdsReturned') || resultItemMemoryIdPaths.length > 0;
  const titlesReturned = readAccessFlag(access, 'titlesReturned') || resultItemTitlePaths.length > 0;
  const snippetsReturned = readAccessFlag(access, 'snippetsReturned') || resultItemSnippetPaths.length > 0;

  const flagViolations = [];
  if (readAccessFlag(access, 'rawContentReturned')) flagViolations.push({ path: `${STRUCTURED_ROOT_PATH}.access.rawContentReturned`, reason: 'access_flag_true' });
  if (readAccessFlag(access, 'pathsReturned')) flagViolations.push({ path: `${STRUCTURED_ROOT_PATH}.access.pathsReturned`, reason: 'access_flag_true' });
  if (readAccessFlag(access, 'memoryIdsReturned')) flagViolations.push({ path: `${STRUCTURED_ROOT_PATH}.access.memoryIdsReturned`, reason: 'access_flag_true' });
  if (readAccessFlag(access, 'titlesReturned')) flagViolations.push({ path: `${STRUCTURED_ROOT_PATH}.access.titlesReturned`, reason: 'access_flag_true' });
  if (readAccessFlag(access, 'snippetsReturned')) flagViolations.push({ path: `${STRUCTURED_ROOT_PATH}.access.snippetsReturned`, reason: 'access_flag_true' });

  const resultCount = Number.isFinite(Number(structuredContent?.resultCount))
    ? Number(structuredContent.resultCount)
    : shape.resultCount;
  const violations = [...shape.violations, ...flagViolations];

  return {
    accepted: violations.length === 0
      && rawContentReturned === false
      && pathsReturned === false
      && memoryIdsReturned === false
      && titlesReturned === false
      && snippetsReturned === false,
    resultCount,
    resultsLength: results.length,
    violations,
    structuredKeyPaths,
    wrapperContentIgnored: shape.wrapperContentIgnored,
    flags: {
      rawContentReturned,
      pathsReturned,
      memoryIdsReturned,
      titlesReturned,
      snippetsReturned
    }
  };
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
  inspectBoundedSearchEvidenceShape,
  inspectSearchMemoryResponseShape
};
