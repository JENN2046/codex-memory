'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  ALLOWED_FIELD_NAMES,
  buildRecordMemoryStrictAuthObserveReadout
} = require('../src/core/RecordMemoryStrictAuthObserveReadout');

test('CM1660 observe readout aggregates accepted and rejected fixture summaries', () => {
  const result = buildRecordMemoryStrictAuthObserveReadout({
    mode: 'observe',
    strictEnforcementEnabled: false,
    observations: [
      {
        acceptedForPrincipalScopeAuthorizationPreflight: true,
        missingRequiredContextFields: [],
        mismatchedFields: []
      },
      {
        acceptedForPrincipalScopeAuthorizationPreflight: false,
        missingRequiredContextFields: ['workspaceId'],
        mismatchedFields: ['clientId']
      }
    ]
  });

  assert.equal(result.accepted, true);
  assert.equal(result.mode, 'observe');
  assert.equal(result.readoutMode, 'fixture_only');
  assert.equal(result.strictEnforcementEnabled, false);
  assert.equal(result.counters.observedRecordMemoryCalls, 2);
  assert.equal(result.counters.acceptedForPrincipalScopeAuthorizationPreflight, 1);
  assert.equal(result.counters.rejectedForPrincipalScopeAuthorizationPreflight, 1);
  assert.equal(result.counters.missingRequiredContextFieldCount, 1);
  assert.equal(result.counters.mismatchedFieldCount, 1);
  assert.deepEqual(result.fieldNamesOnly.missingRequiredContextFields, ['workspaceId']);
  assert.deepEqual(result.fieldNamesOnly.mismatchedFields, ['clientId']);
});

test('CM1660 observe readout permits only known principal/scope field names', () => {
  const result = buildRecordMemoryStrictAuthObserveReadout({
    mode: 'observe',
    observations: [
      {
        acceptedForPrincipalScopeAuthorizationPreflight: false,
        missingRequiredContextFields: [
          'agentAlias',
          'workspaceId',
          'real-workspace-value',
          'privateKey'
        ],
        mismatchedFields: [
          'agentId',
          'clientId',
          'unexpectedRawField'
        ]
      }
    ]
  });

  assert.equal(result.accepted, true);
  assert.deepEqual(result.fieldNamesOnly.missingRequiredContextFields, [
    'agentAlias',
    'workspaceId'
  ]);
  assert.deepEqual(result.fieldNamesOnly.mismatchedFields, [
    'agentId',
    'clientId'
  ]);
  for (const field of [
    ...result.fieldNamesOnly.missingRequiredContextFields,
    ...result.fieldNamesOnly.mismatchedFields
  ]) {
    assert.ok(ALLOWED_FIELD_NAMES.includes(field));
  }
});

test('CM1660 observe readout rejects raw principal scope and secret-shaped fixture fields', () => {
  const result = buildRecordMemoryStrictAuthObserveReadout({
    mode: 'observe',
    observations: [
      {
        acceptedForPrincipalScopeAuthorizationPreflight: false,
        missingRequiredContextFields: ['workspaceId'],
        workspaceIdValue: 'real-workspace-value'
      }
    ],
    bearerToken: 'secret-token'
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'raw_or_secret_fields_not_allowed');
  assert.deepEqual(result.forbiddenFields, [
    'observations[0].workspaceIdValue',
    'bearerToken'
  ]);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /real-workspace-value/);
  assert.doesNotMatch(serialized, /secret-token/);
});

test('CM1661 observe readout rejects direct camelCase and snake_case principal scope values', () => {
  const result = buildRecordMemoryStrictAuthObserveReadout({
    mode: 'observe',
    observations: [
      {
        acceptedForPrincipalScopeAuthorizationPreflight: false,
        missingRequiredContextFields: ['workspaceId'],
        workspaceId: 'real-workspace-value',
        client_id: 'real-client-value'
      }
    ],
    project_id: 'real-project-value'
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'raw_or_secret_fields_not_allowed');
  assert.deepEqual(result.forbiddenFields, [
    'observations[0].workspaceId',
    'observations[0].client_id',
    'project_id'
  ]);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /real-workspace-value/);
  assert.doesNotMatch(serialized, /real-client-value/);
  assert.doesNotMatch(serialized, /real-project-value/);
});

test('CM1660 observe readout rejects strict enforcement and non-observe modes', () => {
  const strictResult = buildRecordMemoryStrictAuthObserveReadout({
    mode: 'observe',
    strictEnforcementEnabled: true
  });
  assert.equal(strictResult.accepted, false);
  assert.equal(strictResult.reasonCode, 'strict_enforcement_not_allowed_in_stage1_readout');

  const strictModeResult = buildRecordMemoryStrictAuthObserveReadout({
    mode: 'strict'
  });
  assert.equal(strictModeResult.accepted, false);
  assert.equal(strictModeResult.reasonCode, 'observe_mode_required');
});

test('CM1660 observe readout rejects provider raw scan and public expansion counters', () => {
  const result = buildRecordMemoryStrictAuthObserveReadout({
    mode: 'observe',
    counters: {
      payloadScopeAuthorityUsedCount: 1,
      providerApiCallCount: 1,
      rawScanCount: 1,
      publicMcpExpansionCount: 1
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_boundary_counters_must_be_zero');
  assert.deepEqual(result.forbiddenCounters, [
    'payloadScopeAuthorityUsedCount',
    'publicMcpExpansionCount',
    'providerApiCallCount',
    'rawScanCount'
  ]);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.rawScanPerformed, false);
  assert.equal(result.runtimeWiringChanged, false);
});

test('CM1660 observe readout does not claim readiness or runtime wiring', () => {
  const result = buildRecordMemoryStrictAuthObserveReadout({
    mode: 'observe',
    observations: []
  });

  assert.equal(result.accepted, true);
  assert.equal(result.runtimeWiringChanged, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.rawScanPerformed, false);
  assert.equal(result.broadScanPerformed, false);
  assert.equal(result.productionReadinessClaimed, false);
  assert.equal(result.releaseReadinessClaimed, false);
  assert.equal(result.cutoverReadinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
});
