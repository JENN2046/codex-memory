'use strict';

const { execFileSync } = require('node:child_process');

const ENV_NAMES = [
  'CODEX_MEMORY_BASE_PATH',
  'CODEX_MEMORY_EMBED_DIMS',
  'CODEX_MEMORY_LOCAL_EMBEDDING_PROVIDER',
  'CODEX_MEMORY_LOCAL_EMBEDDING_URL',
  'CODEX_MEMORY_LOCAL_EMBEDDING_MODEL',
  'CODEX_MEMORY_FALLBACK_EMBEDDING_PROVIDER',
  'CODEX_MEMORY_FALLBACK_EMBEDDING_URL',
  'CODEX_MEMORY_FALLBACK_EMBEDDING_API_KEY',
  'CODEX_MEMORY_FALLBACK_EMBEDDING_MODEL',
  'CODEX_MEMORY_HTTP_HOST',
  'CODEX_MEMORY_HTTP_PORT',
  'CODEX_MEMORY_HTTP_PATH',
  'CODEX_MEMORY_HTTP_TOKEN'
];

function readUserEnvironmentValue(name) {
  try {
    const output = execFileSync(
      'reg.exe',
      ['query', 'HKCU\\Environment', '/v', name],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true
      }
    );

    const lines = output.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    for (const line of lines) {
      if (!line.toLowerCase().startsWith(name.toLowerCase())) {
        continue;
      }

      const parts = line.split(/\s{2,}/).filter(Boolean);
      if (parts.length >= 3) {
        return parts.slice(2).join(' ').trim();
      }
    }
  } catch {
    return '';
  }

  return '';
}

function bootstrapUserEnvironment(envNames = ENV_NAMES) {
  for (const name of envNames) {
    if (typeof process.env[name] === 'string' && process.env[name].trim()) {
      continue;
    }

    const value = readUserEnvironmentValue(name);
    if (value) {
      process.env[name] = value;
    }
  }
}

module.exports = {
  ENV_NAMES,
  bootstrapUserEnvironment,
  readUserEnvironmentValue
};
