'use strict';

const {
  digestObject,
  reject
} = require('../../../packages/chatgpt-r4-contracts');

const MIN_PUBLIC_RELEVANCE = 0.5;

function isPlainObject(value) {
  return value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value);
}

function searchProjection(result, projectContextRef) {
  const source = Array.isArray(result?.results) ? result.results : [];
  const results = source.slice(0, 5).flatMap((item, index) => {
    const projection = item?.memoryContextProjection;
    if (!isPlainObject(projection) ||
        projection.lowDisclosure !== true ||
        typeof projection.statement !== 'string' ||
        !projection.statement.trim()) {
      return [];
    }
    const numeric = item.score;
    if (typeof numeric !== 'number' ||
        !Number.isFinite(numeric)) {
      return [];
    }
    const relevance = Math.max(0, Math.min(1, numeric));
    if (relevance < MIN_PUBLIC_RELEVANCE) return [];
    return [{
      result_ref:
        `mref_${digestObject({
          projectContextRef,
          index,
          projection
        }).slice(7, 31)}`,
      summary: projection.statement,
      relevance
    }];
  });
  return {
    status: results.length > 0 ? 'found' : 'empty',
    result_count: results.length,
    results
  };
}

function structuredProjection(
  toolName,
  nativeResult,
  projectContextRef
) {
  if (toolName === 'search_memory') {
    return searchProjection(nativeResult, projectContextRef);
  }
  if (toolName === 'prepare_memory_context') {
    const search = searchProjection(
      nativeResult,
      projectContextRef
    );
    return {
      status: search.status,
      kind: 'context',
      item_count: search.result_count
    };
  }
  if (toolName === 'memory_overview') {
    return {
      status: 'available',
      kind: 'overview',
      item_count: 1
    };
  }
  if (toolName === 'audit_memory') {
    return {
      status: 'available',
      kind: 'audit',
      item_count: 1
    };
  }
  reject('r4_live_read_tool_invalid');
}

module.exports = {
  searchProjection,
  structuredProjection
};
