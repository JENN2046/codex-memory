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

test('readSelectedWriteAuditCorrelation falls through blank mutation audit aliases', async () => {
  await withAuditStore(async ({ store }) => {
    await store.appendWriteAudit({
      timestamp: '2026-05-26T00:00:00.000Z',
      decision: 'pending',
      target: 'process',
      memoryId: 'raw top-level id must not be selected',
      requestSource: 'raw top-level source must not be selected',
      mutationAuditEvent: {
        event_id: '   ',
        eventId: 'event-snake-fallback',
        correlation_id: '',
        memory_id: '   ',
        memoryId: 'mem-snake-fallback',
        event_type: '',
        eventType: 'memory_tombstone',
        audit_phase: '   ',
        auditPhase: 'pending',
        tool_name: '',
        toolName: 'memory_tombstone',
        actor_client_id: '   ',
        actorClientId: 'codex',
        request_source: '   ',
        requestSource: 'CM-1308-audit-alias-fallback',
        from_status: '',
        fromStatus: 'active',
        to_status: '   ',
        toStatus: 'tombstoned',
        tombstone_reason: '',
        tombstoneReason: 'proof-memory-retention-expired-after-validation',
        mutation_applied: false
      }
    });
    await store.appendWriteAudit({
      timestamp: '2026-05-26T00:01:00.000Z',
      decision: 'committed',
      target: 'process',
      mutationAuditEvent: {
        event_id: 'event-snake-fallback',
        correlation_id: 'event-snake-fallback',
        memory_id: 'mem-snake-fallback',
        event_type: 'memory_tombstone',
        audit_phase: 'committed',
        tool_name: 'memory_tombstone',
        actor_client_id: 'codex',
        request_source: 'CM-1308-audit-alias-fallback',
        from_status: 'active',
        to_status: 'tombstoned',
        tombstone_reason: 'proof-memory-retention-expired-after-validation',
        mutation_applied: true
      }
    });

    const result = await store.readSelectedWriteAuditCorrelation({
      memoryId: 'mem-snake-fallback',
      requestSource: 'CM-1308-audit-alias-fallback'
    });

    assert.equal(result.found, true);
    assert.equal(result.pending.eventId, 'event-snake-fallback');
    assert.equal(result.pending.memoryId, 'mem-snake-fallback');
    assert.equal(result.pending.requestSource, 'CM-1308-audit-alias-fallback');
    assert.equal(result.pending.auditPhase, 'pending');
    assert.equal(result.pending.toStatus, 'tombstoned');
    assert.equal(result.committed.mutationApplied, true);
  });
});

test('readSelectedWriteManifestAuditCorrelation returns selected manifest metadata only', async () => {
  await withAuditStore(async ({ store }) => {
    await store.appendWriteAudit({
      timestamp: '2026-05-26T00:00:00.000Z',
      decision: 'accepted',
      target: 'process',
      title: 'raw durable kernel title must not be projected',
      memoryId: 'mem-manifest-1',
      reason: 'raw durable kernel reason must not be projected',
      content: 'raw durable kernel content must not be projected',
      evidence: 'raw durable kernel evidence must not be projected',
      requestSource: 'durable-write-kernel-audit-manifest-test',
      shadowWrite: { status: 'ok', failures: [] },
      writeManifest: {
        authoritativeStore: 'sqlite',
        idempotencyKey: 'memory-write-v1:abc123',
        canonicalHash: 'abc123',
        status: 'committed',
        replayed: false,
        recovered: false,
        recoveryRequired: false
      }
    });
    await store.appendWriteAudit({
      timestamp: '2026-05-26T00:01:00.000Z',
      decision: 'accepted',
      target: 'process',
      title: 'raw replay title must not be projected',
      memoryId: 'mem-manifest-1',
      reason: 'raw replay reason must not be projected',
      content: 'raw replay content must not be projected',
      evidence: 'raw replay evidence must not be projected',
      requestSource: 'durable-write-kernel-audit-manifest-test',
      shadowWrite: { status: 'ok', failures: [] },
      writeManifest: {
        authoritativeStore: 'sqlite',
        idempotencyKey: 'memory-write-v1:abc123',
        canonicalHash: 'abc123',
        status: 'committed',
        replayed: true,
        recovered: false,
        recoveryRequired: false
      }
    });

    const result = await store.readSelectedWriteManifestAuditCorrelation({
      memoryId: 'mem-manifest-1',
      idempotencyKey: 'memory-write-v1:abc123',
      canonicalHash: 'abc123',
      requestSource: 'durable-write-kernel-audit-manifest-test'
    });
    const serialized = JSON.stringify(result);

    assert.equal(result.found, true);
    assert.equal(result.selectedFieldsOnly, true);
    assert.equal(result.rawAuditReturned, false);
    assert.equal(result.matchedEventCount, 2);
    assert.equal(result.latest.replayed, true);
    assert.equal(result.committed.memoryId, 'mem-manifest-1');
    assert.equal(result.committed.authoritativeStore, 'sqlite');
    assert.equal(result.committed.shadowWriteStatus, 'ok');
    assert.equal(result.replayed.idempotencyKey, 'memory-write-v1:abc123');
    assert.equal(serialized.includes('raw durable kernel title'), false);
    assert.equal(serialized.includes('raw durable kernel reason'), false);
    assert.equal(serialized.includes('raw durable kernel content'), false);
    assert.equal(serialized.includes('raw durable kernel evidence'), false);
    assert.equal(serialized.includes('raw replay title'), false);
  });
});

test('readSelectedWriteManifestAuditCorrelation falls through blank manifest aliases', async () => {
  await withAuditStore(async ({ store }) => {
    await store.appendWriteAudit({
      timestamp: '2026-05-26T00:00:00.000Z',
      decision: 'accepted',
      target: 'process',
      memoryId: '   ',
      memory_id: 'mem-manifest-snake',
      requestSource: '',
      request_source: 'CM-1308-manifest-alias-fallback',
      shadowWrite: { status: 'ok', failures: [] },
      writeManifest: {
        authoritativeStore: '',
        authoritative_store: 'sqlite',
        idempotencyKey: '   ',
        idempotency_key: 'memory-write-v1:snake',
        canonicalHash: '',
        canonical_hash: 'snake-hash',
        status: 'committed',
        replayed: false,
        recovered: false,
        recoveryRequired: false
      }
    });

    const result = await store.readSelectedWriteManifestAuditCorrelation({
      memoryId: 'mem-manifest-snake',
      idempotencyKey: 'memory-write-v1:snake',
      canonicalHash: 'snake-hash',
      requestSource: 'CM-1308-manifest-alias-fallback'
    });

    assert.equal(result.found, true);
    assert.equal(result.matchedEventCount, 1);
    assert.equal(result.latest.memoryId, 'mem-manifest-snake');
    assert.equal(result.latest.requestSource, 'CM-1308-manifest-alias-fallback');
    assert.equal(result.latest.authoritativeStore, 'sqlite');
    assert.equal(result.latest.idempotencyKey, 'memory-write-v1:snake');
    assert.equal(result.latest.canonicalHash, 'snake-hash');
    assert.equal(result.committed.memoryId, 'mem-manifest-snake');
  });
});

test('readSelectedWriteManifestAuditCorrelation fails closed without selector or match', async () => {
  await withAuditStore(async ({ store }) => {
    const missingSelector = await store.readSelectedWriteManifestAuditCorrelation({
      requestSource: 'durable-write-kernel-audit-manifest-test'
    });
    assert.equal(missingSelector.found, false);
    assert.equal(missingSelector.reason, 'write_manifest_selector_required');
    assert.equal(missingSelector.rawAuditReturned, false);
    assert.equal(missingSelector.inspectedEntryCount, 0);

    await store.appendWriteAudit({
      timestamp: '2026-05-26T00:00:00.000Z',
      decision: 'accepted',
      target: 'process',
      memoryId: 'mem-manifest-2',
      requestSource: 'durable-write-kernel-audit-manifest-test',
      shadowWrite: { status: 'degraded', failures: ['vector:synthetic'] },
      writeManifest: {
        authoritativeStore: 'sqlite',
        idempotencyKey: 'memory-write-v1:def456',
        canonicalHash: 'def456',
        status: 'degraded',
        replayed: false,
        recovered: false,
        recoveryRequired: false
      }
    });

    const result = await store.readSelectedWriteManifestAuditCorrelation({
      idempotencyKey: 'memory-write-v1:not-found',
      requestSource: 'durable-write-kernel-audit-manifest-test'
    });

    assert.equal(result.found, false);
    assert.equal(result.reason, 'write_manifest_audit_not_found');
    assert.equal(result.selectedFieldsOnly, true);
    assert.equal(result.rawAuditReturned, false);
    assert.equal(result.inspectedEntryCount, 1);
    assert.equal(result.matchedEventCount, 0);
  });
});
