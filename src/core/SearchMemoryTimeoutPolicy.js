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

function throwIfSearchMemoryAborted(signal, timeoutMs = DEFAULT_SEARCH_MEMORY_TIMEOUT_MS) {
  if (signal?.aborted) {
    throw new SearchMemoryTimeoutError(timeoutMs);
  }
}

function normalizeSearchMemoryTimeoutMs(value, fallback = DEFAULT_SEARCH_MEMORY_TIMEOUT_MS) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function runSearchMemoryWithTimeout(operation, { timeoutMs = DEFAULT_SEARCH_MEMORY_TIMEOUT_MS } = {}) {
  const boundedTimeoutMs = normalizeSearchMemoryTimeoutMs(timeoutMs);
  const controller = new AbortController();
  let timeout = null;
  let timedOut = false;

  try {
    return await Promise.race([
      Promise.resolve()
        .then(() => operation({ signal: controller.signal }))
        .then(result => {
          if (timedOut || controller.signal.aborted) {
            throw new SearchMemoryTimeoutError(boundedTimeoutMs);
          }
          return result;
        }),
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          timedOut = true;
          const error = new SearchMemoryTimeoutError(boundedTimeoutMs);
          reject(error);
          controller.abort();
        }, boundedTimeoutMs);
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
  runSearchMemoryWithTimeout,
  throwIfSearchMemoryAborted
};
