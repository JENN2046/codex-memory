const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { AuditLogStore } = require('../src/storage/AuditLogStore');

async function withAuditStore(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-audit-correlation-'));
  const config = {
    auditLogPath: path.join(tempBasePath, 'logs', 'write-audit.jsonl'),
    recallLogPath: path.join(tempBasePath, 'logs', 'recall-audit.jsonl')
  };
  const store = new AuditLogStore(config);
  try {
    await handler({ config, store });
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

function writeAuditEntry(mutationAuditEvent, overrides = {}) {
  return {
    timestamp: '2026-05-26T00:00:00.000Z',
    decision: mutationAuditEvent.audit_phase,
    target: 'process',
    title: 'raw title must not be projected',
    memoryId: mutationAuditEvent.memory_id,
    reason: 'raw reason must not be projected',
    requestSource: mutationAuditEvent.request_source,
    mutationAuditEvent,
    ...overrides
  };
}

test('readSelectedWriteAuditCorrelation returns selected pending and committed metadata only', async () => {
  await withAuditStore(async ({ store }) => {
    await store.appendWriteAudit(writeAuditEntry({
      event_id: 'event-1',
      memory_id: 'mem-1',
      event_type: 'memory_tombstone',
      tool_name: 'memory_tombstone',
      actor_client_id: 'codex',
      request_source: 'CM-1111-proof-memory-retention-apply',
      from_status: 'active',
      to_status: 'tombstoned',
      reason: 'raw pending reason must not be projected',
      evidence: 'raw pending evidence must not be projected',
      tombstone_reason: 'proof-memory-retention-expired-after-validation',
      audit_phase: 'pending',
      mutation_applied: false
    }));
    await store.appendWriteAudit(writeAuditEntry({
      event_id: 'event-1',
      correlation_id: 'event-1',
      memory_id: 'mem-1',
      event_type: 'memory_tombstone',
      audit_phase: 'committed',
      tool_name: 'memory_tombstone',
      actor_client_id: 'codex',
      request_source: 'CM-1111-proof-memory-retention-apply',
      from_status: 'active',
      to_status: 'tombstoned',
      tombstone_reason: 'proof-memory-retention-expired-after-validation',
      mutation_applied: true
    }));

    const result = await store.readSelectedWriteAuditCorrelation({
      memoryId: 'mem-1',
      requestSource: 'CM-1111-proof-memory-retention-apply'
    });
    const serialized = JSON.stringify(result);

    assert.equal(result.found, true);
    assert.equal(result.selectedFieldsOnly, true);
    assert.equal(result.rawAuditReturned, false);
    assert.equal(result.pending.eventId, 'event-1');
    assert.equal(result.pending.auditPhase, 'pending');
    assert.equal(result.pending.mutationApplied, false);
    assert.equal(result.committed.eventId, 'event-1');
    assert.equal(result.committed.correlationId, 'event-1');
    assert.equal(result.committed.auditPhase, 'committed');
    assert.equal(result.committed.mutationApplied, true);
    assert.equal(result.committed.toStatus, 'tombstoned');
    assert.equal(serialized.includes('raw title'), false);
    assert.equal(serialized.includes('raw reason'), false);
    assert.equal(serialized.includes('raw pending evidence'), false);
  });
});

test('readSelectedWriteAuditCorrelation fails closed when memory id is missing or committed pair is absent', async () => {
  await withAuditStore(async ({ store }) => {
    const missingMemory = await store.readSelectedWriteAuditCorrelation({
      requestSource: 'CM-1111-proof-memory-retention-apply'
    });
    assert.equal(missingMemory.found, false);
    assert.equal(missingMemory.reason, 'memory_id_required');
    assert.equal(missingMemory.rawAuditReturned, false);

    await store.appendWriteAudit(writeAuditEntry({
      event_id: 'event-2',
      memory_id: 'mem-2',
      event_type: 'memory_tombstone',
      tool_name: 'memory_tombstone',
      actor_client_id: 'codex',
      request_source: 'CM-1111-proof-memory-retention-apply',
      from_status: 'active',
      to_status: 'tombstoned',
      tombstone_reason: 'proof-memory-retention-expired-after-validation',
      audit_phase: 'pending',
      mutation_applied: false
    }));

    const result = await store.readSelectedWriteAuditCorrelation({
      memoryId: 'mem-2',
      requestSource: 'CM-1111-proof-memory-retention-apply'
    });

    assert.equal(result.found, false);
    assert.equal(result.reason, 'selected_audit_correlation_not_found');
    assert.equal(result.pending.auditPhase, 'pending');
    assert.equal(result.committed, null);
    assert.equal(result.selectedFieldsOnly, true);
    assert.equal(result.rawAuditReturned, false);
  });
});

test('readSelectedWriteAuditCorrelation does not return an uncorrelated committed event without pending intent', async () => {
  await withAuditStore(async ({ store }) => {
    await store.appendWriteAudit(writeAuditEntry({
      event_id: 'event-3',
      correlation_id: 'event-3',
      memory_id: 'mem-3',
      event_type: 'memory_tombstone',
      audit_phase: 'committed',
      tool_name: 'memory_tombstone',
      actor_client_id: 'codex',
      request_source: 'CM-1111-proof-memory-retention-apply',
      from_status: 'active',
      to_status: 'tombstoned',
      tombstone_reason: 'proof-memory-retention-expired-after-validation',
      mutation_applied: true
    }));

    const result = await store.readSelectedWriteAuditCorrelation({
      memoryId: 'mem-3',
      requestSource: 'CM-1111-proof-memory-retention-apply'
    });

    assert.equal(result.found, false);
    assert.equal(result.reason, 'selected_audit_correlation_not_found');
    assert.equal(result.pending, null);
    assert.equal(result.committed, null);
    assert.equal(result.matchedEventCount, 1);
  });
});
