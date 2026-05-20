'use strict';

const DEFAULT_SEARCH_MEMORY_TIMEOUT_MS = 30000;

class SearchMemoryTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`search_memory timed out after ${timeoutMs} ms`);
    this.name = 'SearchMemoryTimeoutError';
    this.code = 'SEARCH_MEMORY_TIMEOUT';
    this.timeoutMs = timeoutMs;
    this.jsonRpcCode = -32002;
    this.jsonRpcMessage = 'Search memory timeout';
    this.jsonRpcData = {
      code: 'SEARCH_MEMORY_TIMEOUT',
      reason: 'search_memory exceeded the configured timeout.',
      timeoutMs
    };
  }
}

function normalizeSearchMemoryTimeoutMs(value, fallback = DEFAULT_SEARCH_MEMORY_TIMEOUT_MS) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function runSearchMemoryWithTimeout(operation, { timeoutMs = DEFAULT_SEARCH_MEMORY_TIMEOUT_MS } = {}) {
  const boundedTimeoutMs = normalizeSearchMemoryTimeoutMs(timeoutMs);
  let timeout = null;

  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new SearchMemoryTimeoutError(boundedTimeoutMs)), boundedTimeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

module.exports = {
  DEFAULT_SEARCH_MEMORY_TIMEOUT_MS,
  SearchMemoryTimeoutError,
  normalizeSearchMemoryTimeoutMs,
  runSearchMemoryWithTimeout
};
