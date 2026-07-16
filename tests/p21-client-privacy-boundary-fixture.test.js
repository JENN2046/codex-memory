const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'p21-client-privacy-boundary-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

function normalizeScopeRecord(record) {
  return {
    memory_id: record.memory_id,
    title: record.title,
    client_id: record.client_id || 'unknown',
    project_id: record.project_id || 'unknown',
    workspace_id: record.workspace_id || null,
    visibility: record.visibility || 'unknown',
    content_ref: record.content_ref || null,
    content_classification: record.content_classification || 'unknown',
    secret_sentinel: record.secret_sentinel || null
  };
}

function isVisibleToRequest(record, request) {
  const normalized = normalizeScopeRecord(record);
  if (normalized.visibility === 'shared') return true;
  if (normalized.visibility === 'project') return normalized.project_id === request.project_id;
  if (normalized.visibility === 'workspace') return normalized.workspace_id === request.workspace_id;
  if (normalized.visibility === 'private') return normalized.client_id === request.client_id;
  return false;
}

function filterVisibleRecords(records, request) {
  return records.map(normalizeScopeRecord).filter(record => isVisibleToRequest(record, request));
}

function hashWorkspaceId(workspaceId) {
  if (!workspaceId) return null;
  return `sha256:${crypto.createHash('sha256').update(workspaceId).digest('hex').slice(0, 16)}`;
}

function buildLowRiskSummary(records, request) {
  const visible = filterVisibleRecords(records, request);
  const hidden = records.map(normalizeScopeRecord).filter(record => !isVisibleToRequest(record, request));
  const workspaceHashes = [...new Set(visible.map(record => hashWorkspaceId(record.workspace_id)).filter(Boolean))].sort();

  return {
    requestId: request.request_id,
    clientId: request.client_id,
    visibleCount: visible.length,
    hiddenCount: hidden.length,
    hiddenCrossClientPrivateCount: hidden.filter(record => (
      record.visibility === 'private' && record.client_id !== request.client_id
    )).length,
    workspaceIdMode: 'hashed',
    workspaceHashes,
    rawWorkspaceIdExposed: false,
    rawSecretExposed: false,
    mutated: false,
    providerCalls: 0
  };
}

function collectStrings(value, strings = []) {
  if (typeof value === 'string') {
    strings.push(value);
    return strings;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, strings);
    return strings;
  }
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) collectStrings(child, strings);
  }
  return strings;
}

test('fixture parses and stays fixture-only', () => {
  assert.equal(fixture.schemaVersion, 'p21-client-privacy-boundary-v1');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.runtimeBehaviorImplemented, false);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.providerCalls, 0);
  assert.equal(fixture.durableMemoryTouched, false);
  assert.equal(fixture.realMemoryPreview, false);
});

test('public MCP tools remain frozen', () => {
  assert.deepEqual(fixture.publicTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
});

test('same-client private records remain visible', () => {
  for (const request of fixture.requests) {
    const visibleIds = filterVisibleRecords(fixture.records, request).map(record => record.memory_id);
    const sameClientPrivate = `p21-${request.client_id}-private`;
    assert.equal(visibleIds.includes(sameClientPrivate), true, `${sameClientPrivate} should be visible`);
  }
});

test('cross-client private records remain hidden', () => {
  for (const request of fixture.requests) {
    const visibleIds = filterVisibleRecords(fixture.records, request).map(record => record.memory_id);
    for (const hiddenId of request.expected_hidden) {
      assert.equal(visibleIds.includes(hiddenId), false, `${hiddenId} should be hidden`);
    }
  }
});

test('project, workspace, and shared records remain visible when scope matches', () => {
  for (const request of fixture.requests) {
    const visibleIds = filterVisibleRecords(fixture.records, request).map(record => record.memory_id).sort();
    assert.deepEqual(visibleIds, request.expected_visible.slice().sort());
  }
});

test('missing optional scope fields normalize to unknown and are not inferred', () => {
  const record = normalizeScopeRecord(fixture.records.find(item => item.memory_id === 'p21-missing-optional-scope'));
  assert.equal(record.client_id, 'unknown');
  assert.equal(record.project_id, 'unknown');
  assert.equal(record.workspace_id, null);
  assert.equal(record.visibility, 'unknown');
  assert.equal(isVisibleToRequest(record, fixture.requests[0]), false);
});

test('low-risk summary does not expose raw workspace ids or secret sentinels', () => {
  const rawWorkspaceIds = fixture.records.map(record => record.workspace_id).filter(Boolean);
  const summaries = fixture.requests.map(request => buildLowRiskSummary(fixture.records, request));
  const summaryText = collectStrings(summaries).join('\n');

  for (const rawWorkspaceId of rawWorkspaceIds) {
    assert.equal(summaryText.includes(rawWorkspaceId), false, `${rawWorkspaceId} leaked`);
  }
  assert.equal(summaryText.includes('SECRET_SENTINEL_DO_NOT_EMIT'), false);
  for (const summary of summaries) {
    assert.equal(summary.rawWorkspaceIdExposed, false);
    assert.equal(summary.rawSecretExposed, false);
    assert.equal(summary.mutated, false);
    assert.equal(summary.providerCalls, 0);
    assert.equal(summary.workspaceIdMode, 'hashed');
    assert.ok(summary.workspaceHashes.every(value => value.startsWith('sha256:')));
  }
});

test('fixture read is side-effect free', () => {
  buildLowRiskSummary(fixture.records, fixture.requests[0]);
  assert.equal(fs.readFileSync(fixturePath, 'utf8'), fixtureText);
});
