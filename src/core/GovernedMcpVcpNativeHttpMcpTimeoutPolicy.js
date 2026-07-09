'use strict';

const DEFAULT_REQUEST_TIMEOUT_MS = 3000;
const MAX_REQUEST_TIMEOUT_MS = 300_000;

function normalizeHttpMcpRequestTimeoutMs(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_REQUEST_TIMEOUT_MS) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }
  return parsed;
}

module.exports = {
  DEFAULT_REQUEST_TIMEOUT_MS,
  MAX_REQUEST_TIMEOUT_MS,
  normalizeHttpMcpRequestTimeoutMs
};
