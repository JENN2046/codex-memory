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
