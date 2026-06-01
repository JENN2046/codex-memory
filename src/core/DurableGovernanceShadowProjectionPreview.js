const crypto = require('node:crypto');

const {
  normalizeDurableGovernanceMutationDryRunInput,
  summarizeDurableGovernanceMutationDryRun
} = require('./DurableGovernanceMutationDryRunHelper');
const {
  firstNonEmptyAliasString,
  normalizeLifecycleStatus,
  normalizeMemoryId
} = require('./FieldAliasNormalizer');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const SUPPORTED_PROJECTION_FAMILIES = Object.freeze([
  'memory_supersede',
  'memory_tombstone'
]);

const FAMILY_ALLOWED_STATUSES = Object.freeze({
  memory_supersede: Object.freeze({
    old: Object.freeze(['active', 'stale']),
    replacement: Object.freeze(['proposal', 'stale', 'active']),
    toStatus: 'superseded',
    replacementToStatus: 'active'
  }),
  memory_tombstone: Object.freeze({
    target: Object.freeze(['active', 'stale', 'superseded']),
    toStatus: 'tombstoned'
  })
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeStatus(value) {
  return normalizeString(value).toLowerCase();
}

function firstAliasString(source, aliases) {
  return normalizeString(firstNonEmptyAliasString(source, aliases));
}

function normalizeStringArray(values) {
  return [...new Set(
    cloneArray(values)
      .map(normalizeString)
      .filter(Boolean)
  )];
}

function normalizeProjectionRecord(record = {}) {
  const safeRecord = isPlainObject(record) ? record : {};
  return {
    memoryId: normalizeString(normalizeMemoryId(safeRecord)),
    status: normalizeStatus(normalizeLifecycleStatus(safeRecord)),
    statusReason: firstAliasString(safeRecord, ['statusReason', 'status_reason']),
    projectId: firstAliasString(safeRecord, ['projectId', 'project_id']),
    workspaceId: firstAliasString(safeRecord, ['workspaceId', 'workspace_id']),
    clientId: firstAliasString(safeRecord, ['clientId', 'client_id']),
    taskId: firstAliasString(safeRecord, ['taskId', 'task_id']),
    conversationId: firstAliasString(safeRecord, ['conversationId', 'conversation_id']),
    visibility: firstAliasString(safeRecord, ['visibility', 'visibility_policy']),
    retentionPolicy: firstAliasString(safeRecord, ['retentionPolicy', 'retention_policy']),
    supersededBy: firstAliasString(safeRecord, ['supersededBy', 'superseded_by_memory_id']),
    supersedes: firstAliasString(safeRecord, ['supersedes', 'supersedes_memory_id']),
    tombstoneReason: firstAliasString(safeRecord, ['tombstoneReason', 'tombstone_reason']),
    lifecycleUpdatedAt: firstAliasString(safeRecord, ['lifecycleUpdatedAt', 'lifecycle_updated_at']),
    lifecycleActorClientId: firstAliasString(safeRecord, ['lifecycleActorClientId', 'lifecycle_actor_client_id'])
  };
}

function normalizeExactScopeTuple(scopeTuple = {}) {
  const safeTuple = isPlainObject(scopeTuple) ? scopeTuple : {};
  return {
    projectId: firstAliasString(safeTuple, ['projectId', 'project_id']),
    workspaceId: firstAliasString(safeTuple, ['workspaceId', 'workspace_id']),
    clientId: firstAliasString(safeTuple, ['clientId', 'client_id']),
    taskId: firstAliasString(safeTuple, ['taskId', 'task_id']),
    conversationId: firstAliasString(safeTuple, ['conversationId', 'conversation_id']),
    visibility: firstAliasString(safeTuple, ['visibility', 'visibility_policy']),
    retentionPolicy: firstAliasString(safeTuple, ['retentionPolicy', 'retention_policy'])
  };
}

function normalizeProjectionPreviewInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  return {
    dryRunInput: normalizeDurableGovernanceMutationDryRunInput(safeInput.dryRunInput),
    currentProjectionRecords: cloneArray(safeInput.currentProjectionRecords).map(normalizeProjectionRecord),
    previewedAt: normalizeString(safeInput.previewedAt) || '<preview>'
  };
}

function buildRecordMap(records) {
  return new Map(records
    .filter(record => record.memoryId)
    .map(record => [record.memoryId, record]));
}

function buildProjectionRevisionToken({ mutationFamily, changedMemoryIds, previewedAt }) {
  const digest = crypto.createHash('sha256')
    .update(JSON.stringify({
      mutationFamily,
      changedMemoryIds: [...changedMemoryIds].sort(),
      previewedAt
    }))
    .digest('hex')
    .slice(0, 16);
  return `projection-preview:${digest}`;
}

function buildScopePreview(scopeTuple) {
  const preview = {};
  for (const [key, value] of Object.entries(scopeTuple)) {
    if (!value) {
      continue;
    }
    preview[key] = /(projectId|workspaceId|clientId|taskId|conversationId)/i.test(key)
      ? '<redacted>'
      : value;
  }
  return preview;
}

function compareScopeTuple(record, exactScopeTuple) {
  const mismatches = [];
  for (const [key, value] of Object.entries(exactScopeTuple)) {
    if (!value) {
      continue;
    }
    if (normalizeString(record[key]) !== value) {
      mismatches.push(key);
    }
  }
  return mismatches;
}

function buildAffectedRecordPreview({ record, after, fieldChanges, scopeMismatches }) {
  const before = {
    status: record.status,
    statusReason: record.statusReason || null,
    supersededBy: record.supersededBy || null,
    supersedes: record.supersedes || null,
    tombstoneReason: record.tombstoneReason || null,
    lifecycleUpdatedAt: record.lifecycleUpdatedAt || null,
    lifecycleActorClientId: record.lifecycleActorClientId || null
  };
  return {
    memoryId: record.memoryId,
    before,
    beforeSqliteColumns: buildSqliteProjectionColumns(before),
    after,
    afterSqliteColumns: buildSqliteProjectionColumns(after),
    fieldChanges,
    fieldChangesSqliteColumns: fieldChanges.map(mapFieldChangeToSqliteColumn),
    scopeVerified: scopeMismatches.length === 0,
    scopeMismatchKeys: scopeMismatches
  };
}

function buildSqliteProjectionColumns(record = {}) {
  return {
    status: record.status || null,
    status_reason: record.statusReason || null,
    superseded_by_memory_id: record.supersededBy || null,
    supersedes_memory_id: record.supersedes || null,
    tombstone_reason: record.tombstoneReason || null,
    lifecycle_updated_at: record.lifecycleUpdatedAt || null,
    lifecycle_actor_client_id: record.lifecycleActorClientId || null
  };
}

function mapFieldChangeToSqliteColumn(fieldName) {
  const mapping = {
    status: 'status',
    statusReason: 'status_reason',
    supersededBy: 'superseded_by_memory_id',
    supersedes: 'supersedes_memory_id',
    tombstoneReason: 'tombstone_reason',
    lifecycleUpdatedAt: 'lifecycle_updated_at',
    lifecycleActorClientId: 'lifecycle_actor_client_id'
  };
  return mapping[fieldName] || fieldName;
}

function previewSupersede({ normalizedInput, dryRunPreview, exactScopeTuple, recordMap }) {
  const blockingFindings = [];
  const fieldValues = isPlainObject(normalizedInput.dryRunInput.mutationFieldValues)
    ? normalizedInput.dryRunInput.mutationFieldValues
    : {};
  const oldMemoryId = normalizeString(fieldValues.oldMemoryId);
  const newMemoryId = normalizeString(fieldValues.newMemoryId);
  const supersedesLink = normalizeString(fieldValues.supersedesLink);
  const supersededByLink = normalizeString(fieldValues.supersededByLink);
  const oldRecord = recordMap.get(oldMemoryId) || null;
  const newRecord = recordMap.get(newMemoryId) || null;
  const familyRules = FAMILY_ALLOWED_STATUSES.memory_supersede;

  if (!oldRecord) {
    blockingFindings.push('missing_old_projection_record');
  }
  if (!newRecord) {
    blockingFindings.push('missing_replacement_projection_record');
  }
  if (supersedesLink !== oldMemoryId) {
    blockingFindings.push('supersedes_link_mismatch');
  }
  if (supersededByLink !== newMemoryId) {
    blockingFindings.push('superseded_by_link_mismatch');
  }
  if (dryRunPreview.lifecycleTransition.to !== familyRules.toStatus) {
    blockingFindings.push('lifecycle_transition_to_mismatch');
  }

  let affectedRecords = [];
  if (oldRecord) {
    if (!familyRules.old.includes(oldRecord.status)) {
      blockingFindings.push('old_record_status_not_supersedable');
    }
    if (dryRunPreview.lifecycleTransition.from && oldRecord.status !== dryRunPreview.lifecycleTransition.from) {
      blockingFindings.push('lifecycle_transition_from_mismatch');
    }
  }
  if (newRecord && !familyRules.replacement.includes(newRecord.status)) {
    blockingFindings.push('replacement_record_status_not_activatable');
  }

  const oldScopeMismatches = oldRecord ? compareScopeTuple(oldRecord, exactScopeTuple) : [];
  const newScopeMismatches = newRecord ? compareScopeTuple(newRecord, exactScopeTuple) : [];
  if (oldScopeMismatches.length > 0) {
    blockingFindings.push('old_record_scope_mismatch');
  }
  if (newScopeMismatches.length > 0) {
    blockingFindings.push('replacement_record_scope_mismatch');
  }

  if (blockingFindings.length === 0) {
    affectedRecords = [
      buildAffectedRecordPreview({
        record: oldRecord,
        after: {
          status: familyRules.toStatus,
          statusReason: dryRunPreview.packetFields.requiredPresent ? normalizeString(normalizedInput.dryRunInput.reason) : null,
          supersededBy: newMemoryId,
          supersedes: oldRecord.supersedes || null,
          tombstoneReason: oldRecord.tombstoneReason || null,
          lifecycleUpdatedAt: normalizedInput.previewedAt,
          lifecycleActorClientId: '<redacted>'
        },
        fieldChanges: ['status', 'statusReason', 'supersededBy', 'lifecycleUpdatedAt', 'lifecycleActorClientId'],
        scopeMismatches: oldScopeMismatches
      }),
      buildAffectedRecordPreview({
        record: newRecord,
        after: {
          status: familyRules.replacementToStatus,
          statusReason: newRecord.status === familyRules.replacementToStatus
            ? (newRecord.statusReason || null)
            : normalizeString(normalizedInput.dryRunInput.reason),
          supersededBy: newRecord.supersededBy || null,
          supersedes: oldMemoryId,
          tombstoneReason: newRecord.tombstoneReason || null,
          lifecycleUpdatedAt: normalizedInput.previewedAt,
          lifecycleActorClientId: '<redacted>'
        },
        fieldChanges: ['status', 'statusReason', 'supersedes', 'lifecycleUpdatedAt', 'lifecycleActorClientId'],
        scopeMismatches: newScopeMismatches
      })
    ];
  }

  return {
    blockingFindings,
    affectedRecords
  };
}

function previewTombstone({ normalizedInput, dryRunPreview, exactScopeTuple, recordMap }) {
  const blockingFindings = [];
  const fieldValues = isPlainObject(normalizedInput.dryRunInput.mutationFieldValues)
    ? normalizedInput.dryRunInput.mutationFieldValues
    : {};
  const targetMemoryId = normalizeString(fieldValues.targetMemoryId);
  const tombstoneReason = normalizeString(fieldValues.tombstoneReason);
  const targetRecord = recordMap.get(targetMemoryId) || null;
  const familyRules = FAMILY_ALLOWED_STATUSES.memory_tombstone;

  if (!targetRecord) {
    blockingFindings.push('missing_target_projection_record');
  }
  if (!tombstoneReason) {
    blockingFindings.push('missing_tombstone_reason');
  }
  if (dryRunPreview.lifecycleTransition.to !== familyRules.toStatus) {
    blockingFindings.push('lifecycle_transition_to_mismatch');
  }

  const scopeMismatches = targetRecord ? compareScopeTuple(targetRecord, exactScopeTuple) : [];
  if (scopeMismatches.length > 0) {
    blockingFindings.push('target_record_scope_mismatch');
  }

  if (targetRecord) {
    if (!familyRules.target.includes(targetRecord.status)) {
      blockingFindings.push('target_record_status_not_tombstonable');
    }
    if (dryRunPreview.lifecycleTransition.from && targetRecord.status !== dryRunPreview.lifecycleTransition.from) {
      blockingFindings.push('lifecycle_transition_from_mismatch');
    }
  }

  const affectedRecords = [];
  if (blockingFindings.length === 0) {
    affectedRecords.push(buildAffectedRecordPreview({
      record: targetRecord,
      after: {
        status: familyRules.toStatus,
        statusReason: normalizeString(normalizedInput.dryRunInput.reason),
        supersededBy: targetRecord.supersededBy || null,
        supersedes: targetRecord.supersedes || null,
        tombstoneReason,
        lifecycleUpdatedAt: normalizedInput.previewedAt,
        lifecycleActorClientId: '<redacted>'
      },
      fieldChanges: ['status', 'statusReason', 'tombstoneReason', 'lifecycleUpdatedAt', 'lifecycleActorClientId'],
      scopeMismatches
    }));
  }

  return {
    blockingFindings,
    affectedRecords
  };
}

function previewDurableGovernanceShadowProjection(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const normalizedInput = normalizeProjectionPreviewInput(safeInput);
  const rawDryRunInput = isPlainObject(safeInput.dryRunInput)
    ? safeInput.dryRunInput
    : normalizedInput.dryRunInput;
  const dryRunPreview = summarizeDurableGovernanceMutationDryRun(rawDryRunInput);
  const mutationFamily = dryRunPreview.mutationFamily;
  const exactScopeTuple = normalizeExactScopeTuple(rawDryRunInput.scopeTuple);
  const recordMap = buildRecordMap(normalizedInput.currentProjectionRecords);
  const blockingFindings = [];

  if (dryRunPreview.acceptedForDryRunPreview !== true) {
    blockingFindings.push('dry_run_preview_not_accepted');
  }
  if (!SUPPORTED_PROJECTION_FAMILIES.includes(mutationFamily)) {
    blockingFindings.push('unsupported_projection_family');
  }
  if (normalizedInput.currentProjectionRecords.length === 0) {
    blockingFindings.push('current_projection_records_missing');
  }

  let familyPreview = {
    blockingFindings: [],
    affectedRecords: []
  };

  if (SUPPORTED_PROJECTION_FAMILIES.includes(mutationFamily)) {
    if (mutationFamily === 'memory_supersede') {
      familyPreview = previewSupersede({
        normalizedInput,
        dryRunPreview,
        exactScopeTuple,
        recordMap
      });
    } else if (mutationFamily === 'memory_tombstone') {
      familyPreview = previewTombstone({
        normalizedInput,
        dryRunPreview,
        exactScopeTuple,
        recordMap
      });
    }
  }

  blockingFindings.push(...familyPreview.blockingFindings);
  const acceptedForProjectionPreview = blockingFindings.length === 0;
  const projectedChangedMemoryIds = acceptedForProjectionPreview
    ? dryRunPreview.targeting.changedMemoryIds
    : [];

  return {
    sourceMode: 'explicit_input',
    acceptedForProjectionPreview,
    decision: dryRunPreview.decision || 'NOT_READY_BLOCKED',
    approvalStatus: dryRunPreview.approvalStatus || 'BLOCKED_PENDING_APPROVAL',
    mutationFamily,
    executionApproved: false,
    runtimeIntegrated: false,
    mutated: false,
    durableAuditWritten: false,
    durableProjectionApplied: false,
    publicMcpExpanded: false,
    realMemoryScanned: false,
    previewedAt: normalizedInput.previewedAt,
    dryRunPreview: {
      acceptedForDryRunPreview: dryRunPreview.acceptedForDryRunPreview === true,
      blockingFindings: dryRunPreview.blockers.blockingFindings || []
    },
    projectionContract: {
      supportedFamilies: SUPPORTED_PROJECTION_FAMILIES,
      scopeKeysVerified: Object.keys(buildScopePreview(exactScopeTuple)),
      scopePreview: buildScopePreview(exactScopeTuple),
      projectionPolicy: dryRunPreview.projectionPreview.policy || ''
    },
    projectionResult: {
      affectedRecords: familyPreview.affectedRecords,
      affectedCount: familyPreview.affectedRecords.length,
      projectedChangedMemoryIds,
      projectedRevisionToken: acceptedForProjectionPreview
        ? buildProjectionRevisionToken({
            mutationFamily,
            changedMemoryIds: projectedChangedMemoryIds,
            previewedAt: normalizedInput.previewedAt
          })
        : null
    },
    blockers: {
      ids: dryRunPreview.blockers.ids || [],
      requiredPresent: dryRunPreview.blockers.requiredPresent === true,
      blockingFindings
    },
    safety: {
      noSideEffects: true,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      rawSecretExposed: false,
      rawWorkspaceIdExposed: false
    },
    nextStep: acceptedForProjectionPreview
      ? 'Keep this projection preview fixture-backed or temp-local only until future runtime durable governance mutation wiring is explicitly approved.'
      : 'Repair the dry-run packet or synthetic projection records and keep runtime durable governance mutation blocked.'
  };
}

module.exports = {
  SUPPORTED_PROJECTION_FAMILIES,
  normalizeDurableGovernanceShadowProjectionPreviewInput: normalizeProjectionPreviewInput,
  previewDurableGovernanceShadowProjection
};
