const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  ACCESS_MODE,
  AuditMemoryReadonlyService,
  FORBIDDEN_OUTPUT_KEYS,
  SERVICE_STATUS_ACCEPTED,
  SERVICE_STATUS_REJECTED,
  ensureNoForbiddenOutputKeys
} = require('../src/core/AuditMemoryReadonlyService');
const {
  MUTATION_INPUT_KEYS
} = require('../src/core/AuditMemoryReadonlyToolDraft');

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

const CM1507_FORBIDDEN_OUTPUT_KEYS = Object.freeze([
  ...FORBIDDEN_OUTPUT_KEYS,
  'apiKey',
  'api_key',
  'bearer',
  'bearerToken',
  'providerPayload',
  'providerApi',
  'providerAPI',
  'requestHeaders',
  'authorizationHeader'
]);

const CM1507_PRIVATE_FIXTURE_VALUES = Object.freeze([
  'cm1507-memory-id-must-not-leak',
  'cm1507-title-must-not-leak',
  'cm1507-content-must-not-leak',
  'cm1507-snippet-must-not-leak',
  'A:/cm1507/must/not/leak',
  'cm1507-raw-audit-must-not-leak',
  'cm1507-provider-url-must-not-leak',
  'cm1507-provider-payload-must-not-leak',
  'cm1507-api-key-must-not-leak',
  'cm1507-bearer-token-must-not-leak',
  'cm1507-authorization-must-not-leak'
]);

function assertNoCm1507PrivateFixtureLeak(report) {
  const outputKeys = collectKeys(report);
  for (const forbidden of CM1507_FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(outputKeys.includes(forbidden), false, forbidden);
  }

  const serialized = JSON.stringify(report);
  for (const value of CM1507_PRIVATE_FIXTURE_VALUES) {
    assert.equal(serialized.includes(value), false, value);
  }
}

test('CM1460 audit_memory readonly service returns bounded empty projection by default', async () => {
  const service = new AuditMemoryReadonlyService();
  const report = await service.run({
    audit_family: 'all',
    window: 50,
    include_raw: false
  });

  assert.equal(report.status, SERVICE_STATUS_ACCEPTED);
  assert.equal(report.accepted, true);
  assert.equal(report.access.mode, ACCESS_MODE);
  assert.equal(report.access.selectedProjection, true);
  assert.equal(report.access.rawMemoryReturned, false);
  assert.equal(report.access.rawAuditReturned, false);
  assert.equal(report.access.filesystemPathsReturned, false);
  assert.equal(report.access.tokenMaterialReturned, false);
  assert.equal(report.access.providerPayloadReturned, false);
  assert.equal(report.access.memoryIdsReturned, false);
  assert.equal(report.access.titlesReturned, false);
  assert.equal(report.access.snippetsReturned, false);
  assert.equal(report.access.contentReturned, false);
  assert.deepEqual(report.summary, {
    requestedFamily: 'all',
    window: 50,
    visibleDecisionCount: 0,
    hiddenDecisionCount: 0,
    suppressedDecisionCount: 0
  });
  assert.equal(report.policy.lifecyclePolicyExplained, true);
  assert.equal(report.policy.scopePolicyExplained, true);
  assert.equal(report.policy.redactionApplied, true);
  assert.equal(report.policy.rawAuditScanPerformed, false);
  assert.equal(report.policy.providerCalled, false);
  assert.equal(report.policy.durableMutationPerformed, false);
  assert.equal(report.policy.publicMcpExpanded, false);
  assert.equal(report.policy.readinessClaimed, false);
  assert.equal(report.policy.rcReadyClaimed, false);
  assert.deepEqual(report.findings, []);
  ensureNoForbiddenOutputKeys(report);
});

test('CM1460 audit_memory readonly service aggregates explicit safe decisions only', async () => {
  const service = new AuditMemoryReadonlyService({
    decisionProvider: () => [
      {
        auditFamily: 'write',
        decision: 'visible',
        reasonCode: 'scope_visible',
        lifecyclePolicy: 'active_visible',
        scopePolicy: 'project_scope_match',
        memoryId: 'must-not-leak',
        title: 'must-not-leak',
        content: 'must-not-leak',
        filePath: 'A:/must/not/leak'
      },
      {
        auditFamily: 'recall',
        decision: 'hidden',
        reasonCode: 'lifecycle_hidden',
        lifecyclePolicy: 'tombstoned_hidden',
        scopePolicy: 'scope_match'
      },
      {
        auditFamily: 'governance',
        decision: 'suppressed',
        reasonCode: 'scope_suppressed',
        lifecyclePolicy: 'active',
        scopePolicy: 'private_cross_client_blocked'
      }
    ]
  });
  const report = await service.run({
    audit_family: 'all',
    window: 10,
    include_raw: false
  });

  assert.equal(report.status, SERVICE_STATUS_ACCEPTED);
  assert.equal(report.summary.visibleDecisionCount, 1);
  assert.equal(report.summary.hiddenDecisionCount, 1);
  assert.equal(report.summary.suppressedDecisionCount, 1);
  assert.deepEqual(report.findings, [
    {
      auditFamily: 'write',
      decision: 'visible',
      reasonCode: 'scope_visible',
      lifecyclePolicy: 'active_visible',
      scopePolicy: 'project_scope_match',
      redacted: true
    },
    {
      auditFamily: 'recall',
      decision: 'hidden',
      reasonCode: 'lifecycle_hidden',
      lifecyclePolicy: 'tombstoned_hidden',
      scopePolicy: 'scope_match',
      redacted: true
    },
    {
      auditFamily: 'governance',
      decision: 'suppressed',
      reasonCode: 'scope_suppressed',
      lifecyclePolicy: 'active',
      scopePolicy: 'private_cross_client_blocked',
      redacted: true
    }
  ]);

  const outputKeys = collectKeys(report);
  for (const forbidden of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(outputKeys.includes(forbidden), false, forbidden);
  }
});

test('CM1460 audit_memory readonly service rejects raw unbounded and mutation-like inputs', async () => {
  const service = new AuditMemoryReadonlyService();
  const raw = await service.run({
    audit_family: 'raw',
    window: 201,
    include_raw: true
  });

  assert.equal(raw.status, SERVICE_STATUS_REJECTED);
  assert.equal(raw.accepted, false);
  assert.deepEqual(raw.blockerReasons, [
    'include_raw_not_allowed',
    'audit_family_not_allowed',
    'window_out_of_bounds'
  ]);
  assert.equal(raw.access.rawAuditReturned, false);
  assert.equal(raw.policy.durableMutationPerformed, false);

  for (const key of MUTATION_INPUT_KEYS) {
    const report = await service.run({
      audit_family: 'governance',
      window: 10,
      include_raw: false,
      [key]: true
    });
    assert.equal(report.status, SERVICE_STATUS_REJECTED, key);
    assert.deepEqual(report.blockerReasons, ['mutation_input_not_allowed'], key);
  }
});

test('CM1460 audit_memory readonly service does not call provider fetch or mutate DB-like input', async () => {
  const oldFetch = global.fetch;
  let fetchCalls = 0;
  const mutable = {
    changed: false,
    update() {
      this.changed = true;
    }
  };

  global.fetch = async () => {
    fetchCalls += 1;
    throw new Error('provider must not be called');
  };

  try {
    const service = new AuditMemoryReadonlyService({
      decisionProvider: () => [
        {
          auditFamily: 'write',
          decision: 'visible',
          reasonCode: mutable.changed ? 'mutated' : 'not_mutated',
          lifecyclePolicy: 'active',
          scopePolicy: 'scope_match'
        }
      ]
    });
    const report = await service.run({ audit_family: 'write', window: 1, include_raw: false });

    assert.equal(fetchCalls, 0);
    assert.equal(mutable.changed, false);
    assert.equal(report.policy.providerCalled, false);
    assert.equal(report.policy.durableMutationPerformed, false);
    assert.equal(report.findings[0].reasonCode, 'not_mutated');
  } finally {
    global.fetch = oldFetch;
  }
});

test('CM1460 audit_memory readonly output key guard rejects forbidden keys recursively', () => {
  assert.throws(
    () => ensureNoForbiddenOutputKeys({ findings: [{ nested: { memoryId: 'x' } }] }),
    /Forbidden audit_memory output key/
  );
});

test('CM1507 audit_memory readonly projection strips raw private provider token fixture fields', async () => {
  let providerCalls = 0;
  const oldFetch = global.fetch;

  global.fetch = async () => {
    providerCalls += 1;
    throw new Error('provider must not be called');
  };

  try {
    const service = new AuditMemoryReadonlyService({
      decisionProvider: () => [
        {
          auditFamily: 'write',
          decision: 'visible',
          reasonCode: 'scope_visible',
          lifecyclePolicy: 'active_visible',
          scopePolicy: 'project_scope_match',
          memoryId: 'cm1507-memory-id-must-not-leak',
          title: 'cm1507-title-must-not-leak',
          content: 'cm1507-content-must-not-leak',
          snippet: 'cm1507-snippet-must-not-leak',
          filePath: 'A:/cm1507/must/not/leak',
          rawAudit: 'cm1507-raw-audit-must-not-leak',
          providerUrl: 'cm1507-provider-url-must-not-leak',
          providerPayload: 'cm1507-provider-payload-must-not-leak',
          apiKey: 'cm1507-api-key-must-not-leak',
          bearerToken: 'cm1507-bearer-token-must-not-leak',
          authorization: 'cm1507-authorization-must-not-leak'
        }
      ]
    });

    const report = await service.run({
      audit_family: 'write',
      window: 1,
      include_raw: false
    });

    assert.equal(report.status, SERVICE_STATUS_ACCEPTED);
    assert.equal(report.access.mode, ACCESS_MODE);
    assert.equal(report.access.selectedProjection, true);
    assert.equal(report.access.rawMemoryReturned, false);
    assert.equal(report.access.rawAuditReturned, false);
    assert.equal(report.access.filesystemPathsReturned, false);
    assert.equal(report.access.tokenMaterialReturned, false);
    assert.equal(report.access.providerPayloadReturned, false);
    assert.equal(report.access.memoryIdsReturned, false);
    assert.equal(report.policy.rawAuditScanPerformed, false);
    assert.equal(report.policy.providerCalled, false);
    assert.equal(report.policy.durableMutationPerformed, false);
    assert.equal(providerCalls, 0);
    assert.deepEqual(report.findings, [
      {
        auditFamily: 'write',
        decision: 'visible',
        reasonCode: 'scope_visible',
        lifecyclePolicy: 'active_visible',
        scopePolicy: 'project_scope_match',
        redacted: true
      }
    ]);
    assertNoCm1507PrivateFixtureLeak(report);
  } finally {
    global.fetch = oldFetch;
  }
});

test('CM1507 audit_memory rejected path stays low-disclosure and no-mutation', async () => {
  const service = new AuditMemoryReadonlyService();
  const report = await service.run({
    audit_family: 'raw',
    window: 999,
    include_raw: true,
    write: true,
    bearerToken: 'cm1507-bearer-token-must-not-leak',
    providerPayload: 'cm1507-provider-payload-must-not-leak',
    rawAudit: 'cm1507-raw-audit-must-not-leak'
  });

  assert.equal(report.status, SERVICE_STATUS_REJECTED);
  assert.equal(report.accepted, false);
  assert.deepEqual(report.blockerReasons, [
    'include_raw_not_allowed',
    'audit_family_not_allowed',
    'window_out_of_bounds',
    'mutation_input_not_allowed'
  ]);
  assert.equal(report.access.selectedProjection, true);
  assert.equal(report.access.rawMemoryReturned, false);
  assert.equal(report.access.rawAuditReturned, false);
  assert.equal(report.access.filesystemPathsReturned, false);
  assert.equal(report.access.tokenMaterialReturned, false);
  assert.equal(report.access.providerPayloadReturned, false);
  assert.equal(report.policy.rawAuditScanPerformed, false);
  assert.equal(report.policy.providerCalled, false);
  assert.equal(report.policy.durableMutationPerformed, false);
  assert.deepEqual(report.findings, []);
  assertNoCm1507PrivateFixtureLeak(report);
});
