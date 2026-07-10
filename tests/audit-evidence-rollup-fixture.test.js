'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');

const fixturePath = path.join(__dirname, 'fixtures', 'audit-evidence-rollup-cm1510-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const ALLOWED_EVIDENCE_TYPES = new Set([
  'docs-only',
  'fixture/test-only',
  'in-process proof',
  'blocked/deferred'
]);

const FORBIDDEN_KEYS = Object.freeze([
  'memoryId',
  'memory_id',
  'title',
  'content',
  'snippet',
  'filePath',
  'relativePath',
  'sourceFile',
  'path',
  'rawText',
  'raw_text',
  'rawJsonl',
  'rawAudit',
  'providerUrl',
  'providerURL',
  'providerPayload',
  'apiKey',
  'api_key',
  'bearer',
  'bearerToken',
  'token',
  'authorization',
  'requestHeaders'
]);

const FORBIDDEN_VALUES = Object.freeze([
  'cm1510-memory-id-must-not-leak',
  'cm1510-title-must-not-leak',
  'cm1510-content-must-not-leak',
  'cm1510-snippet-must-not-leak',
  'A:/cm1510/must/not/leak',
  'cm1510-raw-audit-must-not-leak',
  'cm1510-provider-payload-must-not-leak',
  'cm1510-api-key-must-not-leak',
  'cm1510-bearer-token-must-not-leak',
  'cm1510-authorization-must-not-leak'
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

function assertNoForbiddenRollupLeak(value) {
  const keys = collectKeys(value);
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(keys.includes(key), false, key);
  }

  const serialized = JSON.stringify(value);
  for (const forbidden of FORBIDDEN_VALUES) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
}

function projectEvidenceUnit(unit) {
  const evidenceType = ALLOWED_EVIDENCE_TYPES.has(unit?.evidenceType) ? unit.evidenceType : 'blocked/deferred';
  const unavailable = evidenceType === 'blocked/deferred' || unit?.available === false;

  return {
    taskId: typeof unit?.taskId === 'string' ? unit.taskId : 'UNKNOWN',
    validationId: typeof unit?.validationId === 'string' ? unit.validationId : null,
    evidenceType,
    commandSummary: typeof unit?.commandSummary === 'string' ? unit.commandSummary.slice(0, 160) : 'not available',
    result: unavailable ? 'unavailable_or_deferred' : String(unit?.result || 'unknown').slice(0, 120),
    nonActions: Array.isArray(unit?.nonActions) ? unit.nonActions.map(String).slice(0, 12) : [],
    blockerState: {
      liveClientEvidence: unit?.blockerState?.liveClientEvidence || 'OPEN / DEFERRED',
      effectiveWriteReliability: unit?.blockerState?.effectiveWriteReliability || 'OPEN / DEFERRED'
    }
  };
}

function buildRollup(units) {
  const projectedUnits = units.map(projectEvidenceUnit);
  const countsByType = Object.fromEntries([...ALLOWED_EVIDENCE_TYPES].map(type => [type, 0]));
  for (const unit of projectedUnits) countsByType[unit.evidenceType] += 1;

  return {
    taskId: 'CM-1510',
    status: 'AUDIT_EVIDENCE_ROLLUP_FIXTURE_ONLY',
    boundedEvidenceOnly: true,
    evidenceTypes: countsByType,
    units: projectedUnits,
    safety: {
      rawAuditScanPerformed: false,
      broadMemoryScanPerformed: false,
      providerApiCalled: false,
      bearerTokenUsed: false,
      effectiveRecordMemoryWrite: false,
      confirmedMutationExecuted: false,
      publicMcpExpanded: false,
      readinessClaimed: false,
      rcReadyClaimed: false
    },
    blockerState: {
      liveClientEvidence: 'OPEN / DEFERRED',
      effectiveWriteReliability: 'OPEN / DEFERRED'
    }
  };
}

test('CM1510 audit evidence rollup fixture uses only bounded evidence vocabulary', () => {
  assert.equal(fixture.version, 'audit-evidence-rollup-cm1510-v1');
  assert.deepEqual(fixture.rollup.excludedEvidenceTypes, ['live-runtime', 'effective write']);

  const rollup = buildRollup(fixture.rollup.sourceUnits);

  assert.equal(rollup.boundedEvidenceOnly, true);
  assert.equal(rollup.evidenceTypes['docs-only'], 1);
  assert.equal(rollup.evidenceTypes['fixture/test-only'], 1);
  assert.equal(rollup.evidenceTypes['in-process proof'], 1);
  assert.equal(rollup.evidenceTypes['blocked/deferred'], 1);
  assert.equal(Object.prototype.hasOwnProperty.call(rollup.evidenceTypes, 'live-runtime'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(rollup.evidenceTypes, 'effective write'), false);
  assertNoForbiddenRollupLeak(rollup);
});

test('CM1510 audit evidence rollup projection strips raw private and sensitive fields', () => {
  const adversarialUnit = {
    taskId: 'CM-1510-ADVERSARIAL',
    validationId: 'CMV-1615',
    evidenceType: 'fixture/test-only',
    commandSummary: 'synthetic adversarial fixture',
    result: 'pass',
    memoryId: 'cm1510-memory-id-must-not-leak',
    title: 'cm1510-title-must-not-leak',
    content: 'cm1510-content-must-not-leak',
    snippet: 'cm1510-snippet-must-not-leak',
    filePath: 'A:/cm1510/must/not/leak',
    rawAudit: 'cm1510-raw-audit-must-not-leak',
    providerPayload: 'cm1510-provider-payload-must-not-leak',
    apiKey: 'cm1510-api-key-must-not-leak',
    bearerToken: 'cm1510-bearer-token-must-not-leak',
    authorization: 'cm1510-authorization-must-not-leak',
    blockerState: {
      liveClientEvidence: 'OPEN / DEFERRED',
      effectiveWriteReliability: 'OPEN / DEFERRED'
    }
  };

  const projected = projectEvidenceUnit(adversarialUnit);

  assert.equal(projected.taskId, 'CM-1510-ADVERSARIAL');
  assert.equal(projected.evidenceType, 'fixture/test-only');
  assertNoForbiddenRollupLeak(projected);
});

test('CM1510 audit evidence rollup rejected or unavailable evidence stays low-disclosure', () => {
  const unavailable = projectEvidenceUnit({
    taskId: 'CM-1510-UNAVAILABLE',
    evidenceType: 'live-runtime',
    available: false,
    commandSummary: 'not executed',
    result: 'cm1510-content-must-not-leak',
    rawAudit: 'cm1510-raw-audit-must-not-leak',
    bearerToken: 'cm1510-bearer-token-must-not-leak'
  });

  assert.equal(unavailable.evidenceType, 'blocked/deferred');
  assert.equal(unavailable.result, 'unavailable_or_deferred');
  assert.deepEqual(unavailable.blockerState, {
    liveClientEvidence: 'OPEN / DEFERRED',
    effectiveWriteReliability: 'OPEN / DEFERRED'
  });
  assertNoForbiddenRollupLeak(unavailable);
});

test('CM1510 audit evidence rollup fixture records no raw scan write mutation or readiness', () => {
  const rollup = buildRollup(fixture.rollup.sourceUnits);

  assert.equal(rollup.safety.rawAuditScanPerformed, false);
  assert.equal(rollup.safety.broadMemoryScanPerformed, false);
  assert.equal(rollup.safety.providerApiCalled, false);
  assert.equal(rollup.safety.bearerTokenUsed, false);
  assert.equal(rollup.safety.effectiveRecordMemoryWrite, false);
  assert.equal(rollup.safety.confirmedMutationExecuted, false);
  assert.equal(rollup.safety.publicMcpExpanded, false);
  assert.equal(rollup.safety.readinessClaimed, false);
  assert.equal(rollup.safety.rcReadyClaimed, false);
  assert.equal(rollup.blockerState.liveClientEvidence, 'OPEN / DEFERRED');
  assert.equal(rollup.blockerState.effectiveWriteReliability, 'OPEN / DEFERRED');
});

test('CM1510 audit evidence rollup fixture preserves seven-tool public MCP surface', () => {
  const toolNames = sorted(TOOL_DEFINITIONS.map(tool => tool.name));

  assert.equal(toolNames.length, fixture.expectedPublicTools.length);
  assert.deepEqual(toolNames, sorted(fixture.expectedPublicTools));
});
