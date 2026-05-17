const assert = require('node:assert/strict');
const test = require('node:test');

const {
  redactSensitiveFragments
} = require('../src/core/SensitiveFragmentRedaction');

test('sensitive redaction covers provider keys, workspace ids, env files, URLs, and absolute paths', () => {
  const redacted = redactSensitiveFragments([
    'providerapikey=PROVIDER_API_KEY_1234567890',
    'workspace_id=workspace-secret-value',
    'raw_workspace_id=workspace-raw-value',
    'load .env.production',
    'https://example.test/private/path?token=URL_TOKEN_1234567890',
    'file:///Users/example/private/.env',
    'postgres://user:password@example.test:5432/memory',
    'wss://example.test/socket',
    'A:\\secret\\.env',
    '\\\\server\\share\\private\\memory.db',
    '/srv/codex-memory/private/config.env'
  ].join(' ')).toLowerCase();

  for (const forbidden of [
    'provider_api_key_1234567890',
    'workspace-secret-value',
    'workspace-raw-value',
    '.env.production',
    'https://example.test',
    'file:///users/example',
    'postgres://',
    'wss://example.test',
    'a:\\secret',
    '\\\\server\\share',
    '/srv/codex-memory'
  ]) {
    assert.equal(redacted.includes(forbidden), false, forbidden);
  }
});
