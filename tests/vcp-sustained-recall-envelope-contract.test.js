'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  ALLOWED_SOURCE_COMPONENTS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpSustainedRecallEnvelope
} = require('../src/core/VcpSustainedRecallEnvelopeContract');

const fixture = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'fixtures', 'vcp-sustained-recall-envelope-cm1685-v1.json'),
  'utf8'
));

test('CM1685 accepts summary-only no-write VCP sustained recall envelope fixture', () => {
  const result = validateVcpSustainedRecallEnvelope(fixture.acceptedSummaryOnlyCase);

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_only');
  assert.equal(result.action, 'vcp_recall_no_write');
  assert.equal(result.sourceSystem, 'VCPToolBox');
  assert.equal(result.sourceComponent, 'LightMemo');
  assert.equal(result.lowDisclosure, true);
  assert.equal(result.summaryOnly, true);
  assert.deepEqual(result.missingFields, []);
  assert.deepEqual(result.forbiddenFields, []);
  assert.deepEqual(result.forbiddenCounters, []);
  assert.deepEqual(result.invalidFields, []);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
});

test('CM1685 fails closed when required principal scope fields are missing', () => {
  const result = validateVcpSustainedRecallEnvelope(fixture.missingScopeCase);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_fields');
  assert.ok(result.missingFields.includes('principal.clientIdPresent'));
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.rawMemoryRead, false);
});

test('CM1685 rejects raw VCP memory content without echoing the value', () => {
  const result = validateVcpSustainedRecallEnvelope(fixture.rawContentCase);
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_or_secret_fields');
  assert.deepEqual(result.forbiddenFields, ['rawDailyNoteContent']);
  assert.equal(serialized.includes('RAW_DAILY_NOTE_PRIVATE_CONTENT'), false);
  assert.equal(result.lowDisclosure, true);
});

test('CM1685 rejects write provider raw broad mutation and public MCP counters', () => {
  const result = validateVcpSustainedRecallEnvelope({
    ...fixture.writeCounterCase,
    counters: {
      ...fixture.writeCounterCase.counters,
      providerApiCalls: 1,
      rawDailyNoteReads: 1,
      rawRagReads: 1,
      rawVectorReads: 1,
      rawPromptReads: 1,
      broadMemoryScans: 1,
      publicMcpExpansions: 1,
      confirmedMutations: 1
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_positive_counters');
  for (const field of ZERO_COUNTER_FIELDS) {
    assert.ok(result.forbiddenCounters.includes(field));
  }
  assert.equal(result.recordMemoryCalled, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
});

test('CM1685 rejects non-summary projection and over-budget limits', () => {
  const result = validateVcpSustainedRecallEnvelope(fixture.invalidProjectionCase);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_recall_envelope_contract');
  assert.ok(result.invalidFields.includes('queryTextIncluded'));
  assert.ok(result.invalidFields.includes('limits.maxSnippets'));
  assert.ok(result.invalidFields.includes('limits.maxCharsPerSnippet'));
  assert.ok(result.invalidFields.includes('limits.timeoutMs'));
  assert.ok(result.invalidFields.includes('projection.rawContentIncluded'));
  assert.ok(result.invalidFields.includes('projection.snippetBodiesAllowed'));
  assert.ok(result.invalidFields.includes('projection.summaryOnly'));
});

test('CM1685 locks allowed VCP components and forbidden raw field vocabulary', () => {
  assert.ok(REQUIRED_TOP_LEVEL_FIELDS.includes('sourceComponent'));
  assert.ok(ALLOWED_SOURCE_COMPONENTS.includes('LightMemo'));
  assert.ok(ALLOWED_SOURCE_COMPONENTS.includes('KnowledgeBaseManager'));
  assert.ok(ALLOWED_SOURCE_COMPONENTS.includes('RAGDiaryPlugin'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawDailyNoteContent'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawRagInjectedContext'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawVectorRows'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('bearerToken'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('providerApiKey'));
});

test('CM1685 helper never performs runtime or external actions', () => {
  const result = validateVcpSustainedRecallEnvelope(fixture.acceptedSummaryOnlyCase);

  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.mcpCalled, false);
  assert.equal(result.recordMemoryCalled, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.rawMemoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
});
