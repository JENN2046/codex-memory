'use strict';

const {
  buildReconcileRetryBackoffMetadata
} = require('./MemoryWriteReconcileRetryBackoffMetadata');

const TASK_ID = 'CM-1083_MEMORY_WRITE_RECONCILE_RETRY_BACKOFF_DURABLE_PERSISTENCE_PREVIEW';
const REQUIRED_RECONCILE_RETRY_COLUMNS = Object.freeze([
  'retry_metadata_json',
  'retry_state',
  'retry_attempt_count',
  'next_attempt_after',
  'last_attempt_at',
  'last_error_code'
]);
const BASE_RECONCILE_QUEUE_COLUMNS = Object.freeze([
  'id',
  'memory_id',
  'store_kind',
  'reason',
  'payload_json',
  'created_at'
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeColumnNames(columnNames = []) {
  return new Set(
    (Array.isArray(columnNames) ? columnNames : [])
      .map(columnName => normalizeString(columnName).toLowerCase())
      .filter(Boolean)
  );
}

function normalizeTask(task = {}) {
  const id = Number.parseInt(task.id, 10);
  return {
    id: Number.isInteger(id) && id > 0 ? id : null,
    memoryId: normalizeString(task.memoryId),
    storeKind: normalizeString(task.storeKind).toLowerCase(),
    reason: normalizeString(task.reason),
    previousMetadata: isPlainObject(task.retryBackoffMetadata)
      ? task.retryBackoffMetadata
      : null,
    retryBackoffMetadataMalformed: task.retryBackoffMetadataMalformed === true
  };
}

function buildBlockedPreview(blockers, overrides = {}) {
  return {
    taskId: TASK_ID,
    accepted: false,
    status: 'blocked',
    blockerReasons: blockers,
    schemaReady: false,
    durablePersistencePreviewed: false,
    plannedUpdate: null,
    applyGate: {
      applyApproved: false,
      applyExecuted: false,
      cleanupApplyExecuted: false,
      rollbackApplyExecuted: false,
      schemaMigrationApplied: false
    },
    automaticStartupWorkerEnabled: false,
    requiresExplicitReplay: true,
    publicMcpExpansion: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    rawErrorStored: false,
    ...overrides
  };
}

function buildReconcileRetryBackoffPersistencePreview({
  task = {},
  availableColumns = [],
  failedAt = new Date().toISOString(),
  error = null,
  policy = {},
  applyApproved = false
} = {}) {
  const blockers = [];
  const normalizedTask = normalizeTask(task);
  const columnSet = normalizeColumnNames(availableColumns);
  const missingBaseColumns = BASE_RECONCILE_QUEUE_COLUMNS.filter(column => !columnSet.has(column));
  const missingRetryColumns = REQUIRED_RECONCILE_RETRY_COLUMNS.filter(column => !columnSet.has(column));

  if (applyApproved === true) {
    blockers.push('apply_requested_but_not_allowed_in_cm1083');
  }
  if (!normalizedTask.id) {
    blockers.push('reconcile_task_id_required');
  }
  if (!normalizedTask.memoryId) {
    blockers.push('reconcile_task_memory_id_required');
  }
  if (!normalizedTask.storeKind) {
    blockers.push('reconcile_task_store_kind_required');
  }
  if (normalizedTask.retryBackoffMetadataMalformed) {
    blockers.push('existing_retry_metadata_malformed');
  }
  if (missingBaseColumns.length > 0) {
    blockers.push('reconcile_queue_base_columns_missing');
  }
  if (missingRetryColumns.length > 0) {
    blockers.push('reconcile_queue_retry_columns_missing');
  }

  if (blockers.length > 0) {
    return buildBlockedPreview(blockers, {
      normalizedTask,
      missingBaseColumns,
      missingRetryColumns,
      schemaReady: missingBaseColumns.length === 0 && missingRetryColumns.length === 0
    });
  }

  const metadata = buildReconcileRetryBackoffMetadata({
    previousMetadata: normalizedTask.previousMetadata,
    failedAt,
    error,
    policy
  });
  const retryMetadataJson = JSON.stringify(metadata);

  return {
    taskId: TASK_ID,
    accepted: true,
    status: 'previewed_not_applied',
    blockerReasons: [],
    normalizedTask,
    missingBaseColumns: [],
    missingRetryColumns: [],
    schemaReady: true,
    durablePersistencePreviewed: true,
    plannedUpdate: {
      table: 'reconcile_queue',
      where: {
        id: normalizedTask.id,
        memoryId: normalizedTask.memoryId,
        storeKind: normalizedTask.storeKind
      },
      columns: {
        retry_metadata_json: retryMetadataJson,
        retry_state: metadata.state,
        retry_attempt_count: metadata.attemptCount,
        next_attempt_after: metadata.nextAttemptAfter,
        last_attempt_at: metadata.lastAttemptAt,
        last_error_code: metadata.lastErrorCode
      },
      applies: false
    },
    retryBackoffMetadata: metadata,
    applyGate: {
      applyApproved: false,
      applyExecuted: false,
      cleanupApplyExecuted: false,
      rollbackApplyExecuted: false,
      schemaMigrationApplied: false
    },
    automaticStartupWorkerEnabled: false,
    requiresExplicitReplay: true,
    publicMcpExpansion: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    rawErrorStored: false
  };
}

async function buildStoreBackedReconcileRetryBackoffPersistencePreview({
  shadowStore,
  taskId,
  failedAt = new Date().toISOString(),
  error = null,
  policy = {},
  applyApproved = false
} = {}) {
  const blockers = [];
  if (!shadowStore || typeof shadowStore.getReconcileTaskById !== 'function') {
    blockers.push('shadowStore_getReconcileTaskById_missing');
  }
  if (!shadowStore || typeof shadowStore.getReconcileQueueColumnNames !== 'function') {
    blockers.push('shadowStore_getReconcileQueueColumnNames_missing');
  }
  if (blockers.length > 0) {
    return buildBlockedPreview(blockers);
  }

  const task = await shadowStore.getReconcileTaskById(taskId);
  if (!task) {
    return buildBlockedPreview(['reconcile_task_not_found']);
  }

  const availableColumns = await shadowStore.getReconcileQueueColumnNames();
  return buildReconcileRetryBackoffPersistencePreview({
    task,
    availableColumns,
    failedAt,
    error,
    policy,
    applyApproved
  });
}

module.exports = {
  BASE_RECONCILE_QUEUE_COLUMNS,
  REQUIRED_RECONCILE_RETRY_COLUMNS,
  TASK_ID,
  buildReconcileRetryBackoffPersistencePreview,
  buildStoreBackedReconcileRetryBackoffPersistencePreview
};
