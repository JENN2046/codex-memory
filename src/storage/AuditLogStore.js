const fs = require('node:fs/promises');
const path = require('node:path');

const {
  firstAliasBoolean,
  firstNonEmptyAliasString,
  firstNonEmptyNormalizedString,
  normalizeString
} = require('../core/FieldAliasNormalizer');

const DEFAULT_AUDIT_WINDOW = 500;
const MAX_AUDIT_BYTES = 1024 * 1024;

function normalizeAuditPhase(value) {
  return normalizeString(value).toLowerCase();
}

function selectMutationAuditEvent(event) {
  if (!event || typeof event !== 'object') return null;
  return {
    eventId: firstNonEmptyAliasString(event, ['event_id', 'eventId']) || null,
    correlationId: firstNonEmptyAliasString(event, ['correlation_id', 'correlationId']) || null,
    auditPhase: firstNonEmptyAliasString(event, ['audit_phase', 'auditPhase']) || null,
    mutationApplied: firstAliasBoolean(event, ['mutation_applied', 'mutationApplied']),
    memoryId: firstNonEmptyAliasString(event, ['memory_id', 'memoryId']) || null,
    eventType: firstNonEmptyAliasString(event, ['event_type', 'eventType']) || null,
    toolName: firstNonEmptyAliasString(event, ['tool_name', 'toolName']) || null,
    actorClientId: firstNonEmptyAliasString(event, ['actor_client_id', 'actorClientId']) || null,
    requestSource: firstNonEmptyAliasString(event, ['request_source', 'requestSource']) || null,
    fromStatus: firstNonEmptyAliasString(event, ['from_status', 'fromStatus']) || null,
    toStatus: firstNonEmptyAliasString(event, ['to_status', 'toStatus']) || null,
    tombstoneReason: firstNonEmptyAliasString(event, ['tombstone_reason', 'tombstoneReason']) || null
  };
}

function selectWriteManifestAuditEvent(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const manifest = entry.writeManifest;
  if (!manifest || typeof manifest !== 'object') return null;

  return {
    timestamp: firstNonEmptyNormalizedString(entry.timestamp) || null,
    decision: firstNonEmptyNormalizedString(entry.decision) || null,
    target: firstNonEmptyNormalizedString(entry.target) || null,
    memoryId: firstNonEmptyAliasString(entry, ['memoryId', 'memory_id']) || null,
    requestSource: firstNonEmptyAliasString(entry, ['requestSource', 'request_source']) || null,
    shadowWriteStatus: firstNonEmptyAliasString(entry.shadowWrite, ['status']) || null,
    authoritativeStore: firstNonEmptyAliasString(manifest, ['authoritativeStore', 'authoritative_store']) || null,
    idempotencyKey: firstNonEmptyAliasString(manifest, ['idempotencyKey', 'idempotency_key']) || null,
    canonicalHash: firstNonEmptyAliasString(manifest, ['canonicalHash', 'canonical_hash']) || null,
    status: firstNonEmptyNormalizedString(manifest.status) || null,
    replayed: firstAliasBoolean(manifest, ['replayed']),
    recovered: firstAliasBoolean(manifest, ['recovered']),
    recoveryRequired: firstAliasBoolean(manifest, ['recoveryRequired', 'recovery_required']),
    repaired: firstAliasBoolean(manifest, ['repaired']),
    repairReason: firstNonEmptyAliasString(manifest, ['repairReason', 'repair_reason']) || null,
    cancelled: firstAliasBoolean(manifest, ['cancelled']),
    cancelReason: firstNonEmptyAliasString(manifest, ['cancelReason', 'cancel_reason']) || null,
    lifecycle: manifest.lifecycle && typeof manifest.lifecycle === 'object'
      ? {
          pending: firstAliasBoolean(manifest.lifecycle, ['pending']),
          committed: firstAliasBoolean(manifest.lifecycle, ['committed']),
          projected: firstAliasBoolean(manifest.lifecycle, ['projected']),
          audited: firstAliasBoolean(manifest.lifecycle, ['audited'])
        }
      : null
  };
}

function matchesSelectedCorrelationFilter(event, {
  memoryId,
  eventType,
  toolName,
  requestSource
}) {
  if (!event) return false;
  if (memoryId && event.memoryId !== memoryId) return false;
  if (eventType && event.eventType !== eventType) return false;
  if (toolName && event.toolName !== toolName) return false;
  if (requestSource && event.requestSource !== requestSource) return false;
  return true;
}

function matchesWriteManifestAuditFilter(event, {
  memoryId,
  idempotencyKey,
  canonicalHash,
  requestSource
}) {
  if (!event) return false;
  if (memoryId && event.memoryId !== memoryId) return false;
  if (idempotencyKey && event.idempotencyKey !== idempotencyKey) return false;
  if (canonicalHash && event.canonicalHash !== canonicalHash) return false;
  if (requestSource && event.requestSource !== requestSource) return false;
  return true;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

class AuditLogStore {
  constructor(config) {
    this.config = config;
  }

  async ensureReady() {
    await fs.mkdir(path.dirname(this.config.auditLogPath), { recursive: true });
    await fs.mkdir(path.dirname(this.config.recallLogPath), { recursive: true });

    if (!(await pathExists(this.config.auditLogPath))) {
      await fs.writeFile(this.config.auditLogPath, '', 'utf8');
    }

    if (!(await pathExists(this.config.recallLogPath))) {
      await fs.writeFile(this.config.recallLogPath, '', 'utf8');
    }
  }

  async appendWriteAudit(entry) {
    await this.ensureReady();
    await fs.appendFile(this.config.auditLogPath, `${JSON.stringify(entry)}\n`, 'utf8');
  }

  async ensureWriteAuditWritable() {
    await this.ensureReady();
    const handle = await fs.open(this.config.auditLogPath, 'a');
    await handle.close();
  }

  async appendRecallAudit(entry) {
    await this.ensureReady();
    await fs.appendFile(this.config.recallLogPath, `${JSON.stringify(entry)}\n`, 'utf8');
  }

  async readRecentWriteAudit(maxLines = DEFAULT_AUDIT_WINDOW, maxBytes = MAX_AUDIT_BYTES) {
    return this.readRecentJsonlEntries(this.config.auditLogPath, maxLines, maxBytes);
  }

  async readRecentRecallAudit(maxLines = DEFAULT_AUDIT_WINDOW, maxBytes = MAX_AUDIT_BYTES) {
    return this.readRecentJsonlEntries(this.config.recallLogPath, maxLines, maxBytes);
  }

  async readSelectedWriteAuditCorrelation({
    memoryId,
    eventType = 'memory_tombstone',
    toolName = 'memory_tombstone',
    requestSource = '',
    maxLines = DEFAULT_AUDIT_WINDOW,
    maxBytes = MAX_AUDIT_BYTES
  } = {}) {
    const selectedMemoryId = normalizeString(memoryId);
    if (!selectedMemoryId) {
      return {
        found: false,
        reason: 'memory_id_required',
        selectedFieldsOnly: true,
        rawAuditReturned: false,
        inspectedEntryCount: 0,
        memoryId: null,
        eventType,
        toolName,
        requestSource: normalizeString(requestSource),
        pending: null,
        committed: null
      };
    }

    const entries = await this.readRecentWriteAudit(maxLines, maxBytes);
    const filter = {
      memoryId: selectedMemoryId,
      eventType: normalizeString(eventType),
      toolName: normalizeString(toolName),
      requestSource: normalizeString(requestSource)
    };
    const selectedEvents = entries
      .map(entry => selectMutationAuditEvent(entry.mutationAuditEvent))
      .filter(event => matchesSelectedCorrelationFilter(event, filter));
    const pending = selectedEvents.find(event => normalizeAuditPhase(event.auditPhase) === 'pending') || null;
    const committed = pending
      ? selectedEvents.find(event => {
        if (normalizeAuditPhase(event.auditPhase) !== 'committed') return false;
        return event.correlationId === pending.eventId || event.eventId === pending.eventId;
      }) || null
      : null;

    return {
      found: Boolean(pending && committed),
      reason: pending && committed ? null : 'selected_audit_correlation_not_found',
      selectedFieldsOnly: true,
      rawAuditReturned: false,
      inspectedEntryCount: entries.length,
      matchedEventCount: selectedEvents.length,
      memoryId: selectedMemoryId,
      eventType: filter.eventType,
      toolName: filter.toolName,
      requestSource: filter.requestSource,
      pending,
      committed
    };
  }

  async readSelectedWriteManifestAuditCorrelation(options = {}) {
    const {
      maxLines = DEFAULT_AUDIT_WINDOW,
      maxBytes = MAX_AUDIT_BYTES
    } = options;
    const selectedMemoryId = firstNonEmptyAliasString(options, ['memoryId', 'memory_id']);
    const selectedIdempotencyKey = firstNonEmptyAliasString(options, ['idempotencyKey', 'idempotency_key']);
    const selectedCanonicalHash = firstNonEmptyAliasString(options, ['canonicalHash', 'canonical_hash']);
    const selectedRequestSource = firstNonEmptyAliasString(options, ['requestSource', 'request_source']);

    if (!selectedMemoryId && !selectedIdempotencyKey && !selectedCanonicalHash) {
      return {
        found: false,
        reason: 'write_manifest_selector_required',
        selectedFieldsOnly: true,
        rawAuditReturned: false,
        inspectedEntryCount: 0,
        matchedEventCount: 0,
        memoryId: selectedMemoryId || null,
        idempotencyKey: selectedIdempotencyKey || null,
        canonicalHash: selectedCanonicalHash || null,
        requestSource: selectedRequestSource,
        latest: null,
        committed: null,
        degraded: null,
        replayed: null,
        recovered: null,
        recoveryRequired: null,
        repaired: null,
        cancelled: null
      };
    }

    const entries = await this.readRecentWriteAudit(maxLines, maxBytes);
    const filter = {
      memoryId: selectedMemoryId,
      idempotencyKey: selectedIdempotencyKey,
      canonicalHash: selectedCanonicalHash,
      requestSource: selectedRequestSource
    };
    const selectedEvents = entries
      .map(entry => selectWriteManifestAuditEvent(entry))
      .filter(event => matchesWriteManifestAuditFilter(event, filter));
    const latest = selectedEvents.length > 0
      ? selectedEvents[selectedEvents.length - 1]
      : null;

    return {
      found: selectedEvents.length > 0,
      reason: selectedEvents.length > 0 ? null : 'write_manifest_audit_not_found',
      selectedFieldsOnly: true,
      rawAuditReturned: false,
      inspectedEntryCount: entries.length,
      matchedEventCount: selectedEvents.length,
      memoryId: selectedMemoryId || null,
      idempotencyKey: selectedIdempotencyKey || null,
      canonicalHash: selectedCanonicalHash || null,
      requestSource: selectedRequestSource,
      latest,
      committed: selectedEvents.find(event => normalizeAuditPhase(event.status) === 'committed') || null,
      degraded: selectedEvents.find(event => normalizeAuditPhase(event.status) === 'degraded') || null,
      repaired: selectedEvents.find(event => normalizeAuditPhase(event.status) === 'repaired') || null,
      cancelled: selectedEvents.find(event => normalizeAuditPhase(event.status) === 'cancelled') || null,
      replayed: selectedEvents.find(event => event.replayed === true) || null,
      recovered: selectedEvents.find(event => event.recovered === true) || null,
      recoveryRequired: selectedEvents.find(event => event.recoveryRequired === true) || null
    };
  }

  async readRecentJsonlEntries(filePath, maxLines = DEFAULT_AUDIT_WINDOW, maxBytes = MAX_AUDIT_BYTES) {
    if (!(await pathExists(filePath))) return [];

    const stats = await fs.stat(filePath);
    const start = Math.max(0, stats.size - maxBytes);
    const handle = await fs.open(filePath, 'r');

    try {
      const buffer = Buffer.alloc(stats.size - start);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
      let content = buffer.toString('utf8', 0, bytesRead);

      if (start > 0) {
        const firstNewline = content.indexOf('\n');
        content = firstNewline >= 0 ? content.slice(firstNewline + 1) : '';
      }

      return content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .slice(-maxLines)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } finally {
      await handle.close();
    }
  }
}

module.exports = {
  AuditLogStore,
  DEFAULT_AUDIT_WINDOW,
  MAX_AUDIT_BYTES,
  pathExists
};
