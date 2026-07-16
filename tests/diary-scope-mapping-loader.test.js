'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { loadDiaryScopeMapping } = require('../src/core/DiaryScopeMappingLoader');

function mapping() {
  return {
    schemaVersion: 1,
    mappingReference: 'jenn-vcp-diary-scope-v1',
    defaultPolicy: 'deny',
    entries: [{
      partitionReference: 'codex-private-v1',
      diaryName: 'SYNTHETIC_CODEX_PRIVATE',
      classification: 'client_private',
      clientId: 'Codex',
      projectId: null,
      workspaceId: null,
      readProfiles: ['exact_visibility', 'task_start_context'],
      writeEligible: true
    }]
  };
}

test('unconfigured mapping permits startup but keeps governed reads disabled', () => {
  const result = loadDiaryScopeMapping();
  assert.equal(result.configured, false);
  assert.equal(result.accepted, false);
  assert.equal(result.startupOnly, true);
  assert.equal(result.hotReloadAllowed, false);
});

test('constructor injection validates and freezes startup binding facts', () => {
  const result = loadDiaryScopeMapping({ mapping: mapping() });
  assert.equal(result.accepted, true);
  assert.equal(result.mappingReference, 'jenn-vcp-diary-scope-v1');
  assert.match(result.mappingDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(result.startupOnly, true);
  assert.equal(result.hotReloadAllowed, false);
});

test('dedicated mapping path is read once and invalid JSON fails startup', () => {
  let reads = 0;
  const result = loadDiaryScopeMapping({
    mappingPath: '/synthetic/mapping.json',
    readFileSync: () => {
      reads += 1;
      return JSON.stringify(mapping());
    }
  });
  assert.equal(result.accepted, true);
  assert.equal(reads, 1);

  assert.throws(() => loadDiaryScopeMapping({
    mappingPath: '/synthetic/invalid.json',
    readFileSync: () => '{'
  }), /diary_scope_mapping_load_failed/);
});

test('invalid configured mapping and ambiguous source fail startup', () => {
  assert.throws(() => loadDiaryScopeMapping({ mapping: {} }), /diary_scope_mapping_invalid/);
  assert.throws(() => loadDiaryScopeMapping({
    mapping: mapping(),
    mappingPath: '/synthetic/mapping.json'
  }), /diary_scope_mapping_source_ambiguous/);
});
