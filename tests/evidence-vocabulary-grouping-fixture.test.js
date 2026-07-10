'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');

const fixturePath = path.join(__dirname, 'fixtures', 'evidence-vocabulary-grouping-cm1513-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const BOUNDED_GROUPS = new Set([
  'public_contract_evidence',
  'readonly_audit_evidence',
  'bounded_search_projection_evidence',
  'audit_rollup_evidence',
  'write_preflight_evidence'
]);

const FORBIDDEN_FAMILIES = new Set(fixture.forbiddenFamilies);

const ALLOWED_FAMILIES_BY_GROUP = Object.freeze({
  public_contract_evidence: new Set([
    'docs_only_receipt',
    'fixture_test_evidence',
    'in_process_bounded_proof',
    'no_mutation_bounded_proof',
    'invalid_args_rejection'
  ]),
  readonly_audit_evidence: new Set([
    'docs_only_receipt',
    'fixture_test_evidence',
    'in_process_bounded_proof',
    'no_mutation_bounded_proof'
  ]),
  bounded_search_projection_evidence: new Set([
    'docs_only_receipt',
    'fixture_test_evidence',
    'no_mutation_bounded_proof'
  ]),
  audit_rollup_evidence: new Set([
    'docs_only_receipt',
    'fixture_test_evidence',
    'no_mutation_bounded_proof'
  ]),
  write_preflight_evidence: new Set([
    'docs_only_receipt',
    'fixture_test_evidence',
    'invalid_write_rejection',
    'no_op_guard',
    'dry_run_guard'
  ]),
  deferred_rc_proof_evidence: new Set(['blocked_deferred_proof']),
  forbidden_or_unavailable_evidence: new Set(fixture.forbiddenFamilies)
});

const FORBIDDEN_KEYS = Object.freeze([
  'memoryId',
  'memory_id',
  'title',
  'content',
  'snippet',
  'filePath',
  'sourceFile',
  'path',
  'rawAudit',
  'rawMemory',
  'rawText',
  'providerPayload',
  'providerApiPayload',
  'apiKey',
  'bearerToken',
  'token',
  'authorization',
  'liveClientTranscript'
]);

const FORBIDDEN_VALUES = Object.freeze([
  'cm1513-raw-audit-must-not-leak',
  'cm1513-bearer-token-must-not-leak',
  'cm1513-effective-write-content-must-not-leak'
]);

function sorted(values) {
  return [...values].sort();
}

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      keys.push(key);
      collectKeys(nested, keys);
    }
  }
  return keys;
}

function assertNoForbiddenLeak(value) {
  const keys = collectKeys(value);
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(keys.includes(key), false, key);
  }

  const serialized = JSON.stringify(value);
  for (const forbidden of FORBIDDEN_VALUES) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
}

function classifyEvidenceUnit(unit) {
  const requestedGroup = fixture.groups.includes(unit?.requestedGroup)
    ? unit.requestedGroup
    : 'forbidden_or_unavailable_evidence';
  const family = typeof unit?.family === 'string' ? unit.family : 'unknown';
  const group = FORBIDDEN_FAMILIES.has(family)
    ? 'forbidden_or_unavailable_evidence'
    : requestedGroup;
  const allowedFamilies = ALLOWED_FAMILIES_BY_GROUP[group] || new Set();
  const allowedInGroup = allowedFamilies.has(family);
  const normalizedStatus = group === 'deferred_rc_proof_evidence'
    ? 'open_deferred'
    : group === 'forbidden_or_unavailable_evidence'
      ? 'forbidden_or_unavailable'
      : String(unit?.status || 'unknown');

  return {
    taskId: String(unit?.taskId || 'UNKNOWN'),
    validationId: typeof unit?.validationId === 'string' ? unit.validationId : null,
    family,
    group,
    allowedInGroup,
    status: normalizedStatus,
    summary: String(unit?.summary || 'not available').slice(0, 160),
    blockerState: {
      liveClientEvidence: unit?.blockerState?.liveClientEvidence || 'OPEN / DEFERRED',
      effectiveWriteReliability: unit?.blockerState?.effectiveWriteReliability || 'OPEN / DEFERRED'
    }
  };
}

function buildGroupedEvidence(units) {
  const groups = Object.fromEntries(fixture.groups.map(group => [group, []]));
  for (const unit of units) {
    const projected = classifyEvidenceUnit(unit);
    groups[projected.group].push(projected);
  }
  return groups;
}

function publicToolNames() {
  return TOOL_DEFINITIONS.map(tool => tool.name);
}

test('CM1513 bounded evidence groups do not contain forbidden families or raw/private fields', () => {
  const groups = buildGroupedEvidence(fixture.evidenceUnits);

  for (const groupName of BOUNDED_GROUPS) {
    for (const unit of groups[groupName]) {
      assert.equal(FORBIDDEN_FAMILIES.has(unit.family), false, `${groupName}:${unit.family}`);
      assert.equal(unit.allowedInGroup, true, `${groupName}:${unit.family}`);
      assertNoForbiddenLeak(unit);
    }
  }
});

test('CM1513 forbidden evidence families are quarantined under forbidden_or_unavailable_evidence', () => {
  const groups = buildGroupedEvidence(fixture.evidenceUnits);
  const forbiddenUnits = groups.forbidden_or_unavailable_evidence;

  assert.equal(forbiddenUnits.length, 3);
  assert.deepEqual(
    sorted(forbiddenUnits.map(unit => unit.family)),
    ['bearer_token', 'effective_write_payload', 'raw_audit']
  );
  for (const unit of forbiddenUnits) {
    assert.equal(unit.status, 'forbidden_or_unavailable');
    assertNoForbiddenLeak(unit);
  }
});

test('CM1513 deferred RC proof evidence is not marked completed and blockers remain open/deferred', () => {
  const groups = buildGroupedEvidence(fixture.evidenceUnits);
  const deferred = groups.deferred_rc_proof_evidence;

  assert.equal(deferred.length, 1);
  assert.equal(deferred[0].status, 'open_deferred');
  assert.notEqual(deferred[0].status, 'completed');
  assert.deepEqual(deferred[0].blockerState, {
    liveClientEvidence: 'OPEN / DEFERRED',
    effectiveWriteReliability: 'OPEN / DEFERRED'
  });
});

test('CM1513 evidence vocabulary fixture preserves the seven-tool public MCP surface', () => {
  assert.deepEqual(sorted(publicToolNames()), sorted(fixture.expectedPublicTools));
  assert.equal(publicToolNames().length, fixture.expectedPublicTools.length);
});

test('CM1513 grouping projection strips adversarial private and sensitive fields', () => {
  const projected = classifyEvidenceUnit({
    taskId: 'CM-1513-ADVERSARIAL',
    validationId: 'CMV-1618',
    family: 'fixture_test_evidence',
    requestedGroup: 'audit_rollup_evidence',
    status: 'completed',
    summary: 'synthetic adversarial fixture',
    memoryId: 'cm1513-memory-id-must-not-leak',
    title: 'cm1513-title-must-not-leak',
    content: 'cm1513-effective-write-content-must-not-leak',
    rawAudit: 'cm1513-raw-audit-must-not-leak',
    bearerToken: 'cm1513-bearer-token-must-not-leak',
    providerPayload: 'cm1513-provider-payload-must-not-leak'
  });

  assert.equal(projected.group, 'audit_rollup_evidence');
  assert.equal(projected.status, 'completed');
  assertNoForbiddenLeak(projected);
});
