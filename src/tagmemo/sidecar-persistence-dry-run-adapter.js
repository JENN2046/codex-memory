'use strict';

const INPUT_SCHEMA_VERSION = 'tagmemo-sidecar-persistence-dry-run-input-v1';
const OUTPUT_SCHEMA_VERSION = 'tagmemo-sidecar-persistence-dry-run-output-v1';
const ADAPTER_MODE = 'dry_run';

const ALLOWED_INPUT_KEYS = new Set([
  'schemaVersion',
  'adapterMode',
  'sourceVersion',
  'boundedTagProjection',
  'rollbackToken',
  'cleanupPlanRef',
  'tombstoneSyncState'
]);

const ALLOWED_TAG_PROJECTION_KEYS = new Set([
  'schemaVersion',
  'tagRecordId',
  'memoryId',
  'tagId',
  'tagLabel',
  'confidenceScore',
  'derivedFromProjectionHash'
]);

const ALLOWED_SOURCE_VERSIONS = new Set([
  'deterministic_tagmemo_projection_v1'
]);

const ALLOWED_TOMBSTONE_SYNC_STATES = new Set([
  'active',
  'suppressed_by_tombstone',
  'sync_pending_fail_closed'
]);

const FORBIDDEN_RAW_PRIVATE_KEYS = new Set([
  'rawText',
  'rawContent',
  'content',
  'snippet',
  'sourceFile',
  'fullPath',
  'filePath',
  'relativePath',
  'provider',
  'apiKey',
  'token',
  'authorization',
  'bearer',
  'rawAudit',
  'rawJsonl',
  'sqliteRow',
  'vectorPayload',
  'privateLifecycleState',
  'providerEndpoint',
  'publicMcpResponsePayload',
  'storageHandle',
  'dbConnection',
  'rawMemoryRecord',
  'providerPayload'
]);

const UNSAFE_VALUE_PATTERN = /(?:provider|api[ _-]?(?:key|endpoint)?|token|bearer|raw[ _-]?(?:scan|audit|text|content|body|memory)|jsonl|sqlite|vector|secret|[a-z]:[\\/]|[\\/])/i;

function objectKeys(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value)
    : [];
}

function hasForbiddenKey(value) {
  if (Array.isArray(value)) return value.some(item => hasForbiddenKey(item));
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, nested]) => (
    FORBIDDEN_RAW_PRIVATE_KEYS.has(key) || hasForbiddenKey(nested)
  ));
}

function hasUnsafeString(value) {
  if (typeof value === 'string') return UNSAFE_VALUE_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(item => hasUnsafeString(item));
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some(nested => hasUnsafeString(nested));
}

function isBoundedId(value, prefix) {
  return typeof value === 'string'
    && value.startsWith(`${prefix}:`)
    && /^[a-z-]+:[a-z0-9:_-]+$/i.test(value)
    && !/[\\/]/.test(value)
    && !/^[A-Za-z]:[\\/]/.test(value);
}

function buildRollbackPlan(input = {}) {
  return {
    selector: {
      sourceVersion: typeof input.sourceVersion === 'string' ? input.sourceVersion : null,
      rollbackToken: typeof input.rollbackToken === 'string' ? input.rollbackToken : null,
      cleanupPlanRef: typeof input.cleanupPlanRef === 'string' ? input.cleanupPlanRef : null
    },
    dryRunOnly: true,
    destructiveCleanupApproved: false
  };
}

function buildCleanupPlan(input = {}) {
  return {
    cleanupPlanRef: typeof input.cleanupPlanRef === 'string' ? input.cleanupPlanRef : null,
    dryRunOnly: true,
    wouldDeleteRows: false
  };
}

function buildTombstoneSyncPlan(tombstoneSyncState = null, failClosed = true) {
  return {
    tombstoneSyncState,
    failClosed,
    writeAllowedInContract: false
  };
}

function buildDryRunWritePlan(input = {}, options = {}) {
  const tagRecordId = typeof input?.boundedTagProjection?.tagRecordId === 'string'
    && isBoundedId(input.boundedTagProjection.tagRecordId, 'sidecar-tag')
    ? input.boundedTagProjection.tagRecordId
    : null;
  const rejectedRows = tagRecordId ? [tagRecordId] : [];

  return {
    acceptedRows: [],
    rejectedRows,
    rejectionReasons: [options.reason || 'invalid_input'],
    rollbackPlan: buildRollbackPlan(input),
    cleanupPlan: buildCleanupPlan(input),
    tombstoneSyncPlan: buildTombstoneSyncPlan(
      typeof input.tombstoneSyncState === 'string' ? input.tombstoneSyncState : null,
      true
    ),
    wouldPersist: false,
    persisted: false,
    publicResponse: false,
    publicMcpExpansion: 0
  };
}

function buildAdapterFailure(reason, input = {}) {
  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    adapterMode: ADAPTER_MODE,
    dryRunWritePlan: buildDryRunWritePlan(input, { reason }),
    rejected: true,
    reason,
    lowDisclosure: true,
    providerCalls: 0,
    effectiveRecordMemoryWrites: 0,
    persistentTagWrites: 0,
    publicMcpExpansion: 0
  };
}

function validateTagProjection(tagProjection) {
  if (!tagProjection || typeof tagProjection !== 'object' || Array.isArray(tagProjection)) {
    return { ok: false, reason: 'invalid_bounded_tag_projection' };
  }

  for (const key of objectKeys(tagProjection)) {
    if (!ALLOWED_TAG_PROJECTION_KEYS.has(key)) {
      return { ok: false, reason: 'unsupported_bounded_tag_projection_field' };
    }
  }

  if (tagProjection.schemaVersion !== 'tagmemo-sidecar-tag-record-v1') {
    return { ok: false, reason: 'invalid_tag_projection_schema_version' };
  }
  if (!isBoundedId(tagProjection.tagRecordId, 'sidecar-tag')
    || !isBoundedId(tagProjection.memoryId, 'memory')
    || !isBoundedId(tagProjection.tagId, 'tag')) {
    return { ok: false, reason: 'invalid_bounded_tag_projection_id' };
  }
  if (typeof tagProjection.tagLabel !== 'string'
    || !tagProjection.tagLabel
    || tagProjection.tagLabel.trim() !== tagProjection.tagLabel) {
    return { ok: false, reason: 'invalid_tag_label' };
  }
  if (!Number.isFinite(tagProjection.confidenceScore)
    || tagProjection.confidenceScore < 0
    || tagProjection.confidenceScore > 1) {
    return { ok: false, reason: 'invalid_confidence_score' };
  }
  if (!/^sha256:[a-f0-9]{64}$/i.test(tagProjection.derivedFromProjectionHash)) {
    return { ok: false, reason: 'invalid_projection_hash' };
  }

  return { ok: true };
}

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, reason: 'invalid_input' };
  }
  if (hasForbiddenKey(input)) return { ok: false, reason: 'forbidden_raw_private_field' };

  for (const key of objectKeys(input)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) return { ok: false, reason: 'unsupported_input_field' };
  }

  if (input.schemaVersion !== INPUT_SCHEMA_VERSION) return { ok: false, reason: 'invalid_schema_version' };
  if (input.adapterMode !== ADAPTER_MODE) return { ok: false, reason: 'invalid_adapter_mode' };
  if (!ALLOWED_SOURCE_VERSIONS.has(input.sourceVersion)) return { ok: false, reason: 'unsupported_source_version' };
  if (!isBoundedId(input.rollbackToken, 'rollback')) return { ok: false, reason: 'invalid_rollback_token' };
  if (!isBoundedId(input.cleanupPlanRef, 'cleanup-plan')) return { ok: false, reason: 'invalid_cleanup_plan_ref' };
  if (!ALLOWED_TOMBSTONE_SYNC_STATES.has(input.tombstoneSyncState)) {
    return { ok: false, reason: 'invalid_tombstone_sync_state' };
  }

  const tagValidation = validateTagProjection(input.boundedTagProjection);
  if (!tagValidation.ok) return tagValidation;

  if (hasUnsafeString(input)) return { ok: false, reason: 'forbidden_raw_private_value' };

  return { ok: true };
}

function createAcceptedDryRunPlan(input) {
  const failClosed = input.tombstoneSyncState !== 'active';
  const acceptedRows = failClosed ? [] : [input.boundedTagProjection.tagRecordId];
  const rejectedRows = failClosed ? [input.boundedTagProjection.tagRecordId] : [];
  const rejectionReasons = failClosed ? ['tombstone_sync_suppressed'] : [];

  return {
    acceptedRows,
    rejectedRows,
    rejectionReasons,
    rollbackPlan: buildRollbackPlan(input),
    cleanupPlan: buildCleanupPlan(input),
    tombstoneSyncPlan: buildTombstoneSyncPlan(input.tombstoneSyncState, failClosed),
    wouldPersist: false,
    persisted: false,
    publicResponse: false,
    publicMcpExpansion: 0
  };
}

function createTagMemoSidecarPersistenceDryRunPlan(input = {}) {
  const validation = validateInput(input);
  if (!validation.ok) return buildAdapterFailure(validation.reason, input);

  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    adapterMode: ADAPTER_MODE,
    dryRunWritePlan: createAcceptedDryRunPlan(input),
    rejected: false,
    reason: null,
    lowDisclosure: true,
    providerCalls: 0,
    effectiveRecordMemoryWrites: 0,
    persistentTagWrites: 0,
    publicMcpExpansion: 0
  };
}

module.exports = {
  ADAPTER_MODE,
  INPUT_SCHEMA_VERSION,
  OUTPUT_SCHEMA_VERSION,
  buildAdapterFailure,
  createTagMemoSidecarPersistenceDryRunPlan,
  validateInput
};
