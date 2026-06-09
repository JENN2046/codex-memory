'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('CM-1531 source path has low-disclosure no-token response shape', () => {
  const httpSource = read('src/adapters/codex-mcp/http.js');

  assert.match(httpSource, /const PUBLIC_REQUEST_BLOCKED = 'PUBLIC_REQUEST_BLOCKED'/);
  assert.match(httpSource, /function createForbiddenJsonRpcPayload/);
  assert.match(httpSource, /code:\s*PUBLIC_REQUEST_BLOCKED/);
  assert.match(httpSource, /status:\s*'rejected'/);
  assert.match(httpSource, /reason:\s*'blocked'/);
  assert.doesNotMatch(httpSource, /NO_TOKEN_MUTATION_REJECTED/);
  assert.doesNotMatch(httpSource, /NO_TOKEN_SEARCH_REJECTED/);
});

test('CM-1531 source path has memory_overview selected projection v2', () => {
  const overviewSource = read('src/core/MemoryOverviewService.js');

  assert.match(overviewSource, /async getNoTokenSelectedOverview/);
  assert.match(overviewSource, /mode:\s*'public_selected_overview'/);
  assert.match(overviewSource, /selectedProjectionVersion:\s*2/);
  assert.match(overviewSource, /publicAccess:\s*'blocked'/);
  assert.match(overviewSource, /detailFieldsReturned:\s*false/);
  assert.doesNotMatch(overviewSource, /mode:\s*'no_token_selected_overview'/);
});

test('CM-1531 HTTP tests cover current source low-disclosure path', () => {
  const httpTest = read('tests/mcp-http.test.js');

  assert.match(httpTest, /HTTP MCP should reject no-token mutation tool calls/);
  assert.match(httpTest, /payload\.error\.data\.code,\s*PUBLIC_REQUEST_BLOCKED/);
  assert.match(httpTest, /HTTP MCP no-token memory_overview should return selected safe overview/);
  assert.match(httpTest, /const overview = payload\.result\.structuredContent/);
  assert.match(httpTest, /overview\.access\.mode,\s*'public_selected_overview'/);
  assert.match(httpTest, /overview\.access\.selectedProjectionVersion,\s*2/);
});

test('CM-1531 startup ensure path can leave a healthy stale runtime in place', () => {
  const ensureScript = read('scripts/ensure-codex-memory-http.ps1');
  const serveScript = read('scripts/serve-codex-memory-http.js');

  assert.match(ensureScript, /if \(Test-Health -url \$healthUrl\) \{/);
  assert.match(ensureScript, /already healthy/);
  assert.match(ensureScript, /exit 0/);
  assert.doesNotMatch(ensureScript, /rev-parse/);
  assert.doesNotMatch(ensureScript, /HEAD/);
  assert.match(serveScript, /require\(path\.resolve\(__dirname, '\.\.', 'src', 'http-index\.js'\)\)/);
});
