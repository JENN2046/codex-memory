'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const RUNTIME_FINGERPRINT_FILES = Object.freeze([
  'scripts/serve-codex-memory-http.js',
  'src/app.js',
  'src/http-index.js',
  'src/adapters/codex-mcp/http.js',
  'src/adapters/codex-mcp/server.js',
  'src/core/MemoryOverviewService.js',
  'src/core/PhaseF1LiveClientNoWriteEvidenceRunner.js'
]);

function normalizeRoot(rootDir = path.resolve(__dirname, '..', '..')) {
  return path.resolve(rootDir);
}

function computeRuntimeSourceFingerprint({ rootDir = path.resolve(__dirname, '..', '..') } = {}) {
  const root = normalizeRoot(rootDir);
  const hash = crypto.createHash('sha256');
  const files = [];

  for (const relativePath of RUNTIME_FINGERPRINT_FILES) {
    const normalizedRelativePath = relativePath.replace(/\\/g, '/');
    const absolutePath = path.join(root, normalizedRelativePath);
    const content = fs.readFileSync(absolutePath);
    hash.update(normalizedRelativePath);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
    files.push(normalizedRelativePath);
  }

  return {
    algorithm: 'sha256',
    sourceFingerprint: hash.digest('hex'),
    sourceFileCount: files.length,
    files
  };
}

module.exports = {
  RUNTIME_FINGERPRINT_FILES,
  computeRuntimeSourceFingerprint
};
