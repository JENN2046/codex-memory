'use strict';

const crypto = require('node:crypto');

const {
  createTagMemoSidecarPersistenceDryRunPlan
} = require('./sidecar-persistence-dry-run-adapter');

const OUTPUT_SCHEMA_VERSION = 'tagmemo-persistent-enrichment-proof-command-output-v1';
const COMMAND_VERSION = 'persistent_tagmemo_enrichment_proof_command_skeleton_v1';
const EXACT_APPROVAL_TOKEN = 'APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF';
const OPERATOR_EXECUTION_TOKEN = 'APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF_EXECUTION_AFTER_AUDIT';
const SIDECAR_TARGET = 'temp-local-tagmemo-proof-sidecar';

const ALLOWED_MODES = new Set([
  'dry-run',
  'apply',
  'rollback',
  'tombstone-sync-proof'
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

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(item => stableStringify(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => (
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashRedacted(value) {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
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

function makeBoundaryCounters() {
  return {
    providerApiCalls: 0,
    bearerTokenUse: 0,
    rawScanRun: false,
    broadMemoryScanRun: false,
    secondEffectiveRecordMemoryWrite: 0,
    confirmedMutation: 0,
    publicMcpExpansion: 0,
    persistentTagWrites: 0,
    productionReadyClaim: false,
    releaseReadyClaim: false,
    cutoverReadyClaim: false,
    completeV8Claim: false
  };
}

function makeBaseOutput({
  mode,
  approvalStringExactMatch = false,
  operatorExecutionTokenExactMatch = false,
  skeletonGuardTokenExactMatch = false
}) {
  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    commandVersion: COMMAND_VERSION,
    executionMode: mode,
    approvalStringExactMatch,
    operatorExecutionTokenExactMatch,
    skeletonGuardTokenExactMatch,
    sidecarTarget: SIDECAR_TARGET,
    writeCountLimit: null,
    writeCountRequested: 0,
    writeCountExecuted: 0,
    persistentTagRecordsWritten: 0,
    dryRunPlanHash: null,
    rollbackPlanHash: null,
    cleanupPlanHash: null,
    tombstoneSyncState: null,
    boundaryCounters: makeBoundaryCounters(),
    redacted: true,
    lowDisclosure: true,
    publicMcpResponse: false
  };
}

function makeFailure(reason, options = {}) {
  return {
    ...makeBaseOutput(options),
    status: 'rejected',
    reason
  };
}

function validateMode(mode) {
  if (!ALLOWED_MODES.has(mode)) return { ok: false, reason: 'unsupported_execution_mode' };
  return { ok: true };
}

function validateInputBoundary(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, reason: 'invalid_bounded_input' };
  }
  if (hasForbiddenKey(input)) return { ok: false, reason: 'forbidden_raw_private_field' };
  if (hasUnsafeString(input)) return { ok: false, reason: 'forbidden_raw_private_value' };
  return { ok: true };
}

function validateMaxWriteCount(mode, maxWriteCount) {
  if (mode === 'tombstone-sync-proof') {
    return maxWriteCount === 0
      ? { ok: true, writeCountLimit: 0 }
      : { ok: false, reason: 'invalid_tombstone_max_write_count' };
  }
  if (maxWriteCount !== 1) return { ok: false, reason: 'invalid_max_write_count' };
  return { ok: true, writeCountLimit: 1 };
}

function buildRedactedRollbackPlan(dryRunWritePlan = {}) {
  const rollbackPlan = dryRunWritePlan.rollbackPlan || {};
  return {
    selectorHash: hashRedacted(rollbackPlan.selector || {}),
    dryRunOnly: rollbackPlan.dryRunOnly === true,
    destructiveCleanupApproved: false,
    affectsProofRowsOnly: true
  };
}

function buildRedactedCleanupPlan(dryRunWritePlan = {}) {
  const cleanupPlan = dryRunWritePlan.cleanupPlan || {};
  return {
    cleanupPlanHash: hashRedacted(cleanupPlan),
    dryRunOnly: cleanupPlan.dryRunOnly !== false,
    wouldDeleteRows: false,
    affectsProofRowsOnly: true
  };
}

function buildRedactedTombstoneSyncPlan(dryRunWritePlan = {}) {
  const tombstoneSyncPlan = dryRunWritePlan.tombstoneSyncPlan || {};
  return {
    tombstoneSyncState: typeof tombstoneSyncPlan.tombstoneSyncState === 'string'
      ? tombstoneSyncPlan.tombstoneSyncState
      : 'sync_pending_fail_closed',
    failClosed: tombstoneSyncPlan.failClosed !== false,
    writeAllowedInContract: false
  };
}

function buildPlanSkeleton(input) {
  const adapterOutput = createTagMemoSidecarPersistenceDryRunPlan(input);
  const dryRunWritePlan = adapterOutput.dryRunWritePlan || {};
  const acceptedRows = Array.isArray(dryRunWritePlan.acceptedRows) ? dryRunWritePlan.acceptedRows : [];
  const redactedRollbackPlan = buildRedactedRollbackPlan(dryRunWritePlan);
  const redactedCleanupPlan = buildRedactedCleanupPlan(dryRunWritePlan);
  const redactedTombstoneSyncPlan = buildRedactedTombstoneSyncPlan(dryRunWritePlan);

  return {
    adapterOutput,
    writeCountRequested: acceptedRows.length,
    dryRunPlanHash: hashRedacted(dryRunWritePlan),
    rollbackPlan: redactedRollbackPlan,
    cleanupPlan: redactedCleanupPlan,
    tombstoneSyncPlan: redactedTombstoneSyncPlan,
    rollbackPlanHash: hashRedacted(redactedRollbackPlan),
    cleanupPlanHash: hashRedacted(redactedCleanupPlan),
    tombstoneSyncPlanHash: hashRedacted(redactedTombstoneSyncPlan)
  };
}

function buildPersistentTagMemoEnrichmentProofCommand(input = {}, options = {}) {
  const mode = options.mode || 'dry-run';
  const modeValidation = validateMode(mode);
  if (!modeValidation.ok) return makeFailure(modeValidation.reason, { mode });

  const inputValidation = validateInputBoundary(input);
  if (!inputValidation.ok) return makeFailure(inputValidation.reason, { mode });

  const maxWriteCountValidation = validateMaxWriteCount(mode, options.maxWriteCount);
  if (!maxWriteCountValidation.ok) return makeFailure(maxWriteCountValidation.reason, { mode });

  const operatorExecutionTokenExactMatch = options.operatorExecutionToken === OPERATOR_EXECUTION_TOKEN;
  const skeletonGuardTokenExactMatch = options.approvalToken === EXACT_APPROVAL_TOKEN;
  const approvalStringExactMatch = operatorExecutionTokenExactMatch && skeletonGuardTokenExactMatch;
  const plan = buildPlanSkeleton(input);
  const base = {
    ...makeBaseOutput({
      mode,
      approvalStringExactMatch,
      operatorExecutionTokenExactMatch,
      skeletonGuardTokenExactMatch
    }),
    writeCountLimit: maxWriteCountValidation.writeCountLimit,
    writeCountRequested: plan.writeCountRequested,
    dryRunPlanHash: plan.dryRunPlanHash,
    rollbackPlanHash: plan.rollbackPlanHash,
    cleanupPlanHash: plan.cleanupPlanHash,
    tombstoneSyncState: plan.tombstoneSyncPlan.tombstoneSyncState,
    rollbackPlan: plan.rollbackPlan,
    cleanupPlan: plan.cleanupPlan,
    tombstoneSyncPlan: plan.tombstoneSyncPlan
  };

  if (plan.adapterOutput.rejected) {
    return {
      ...base,
      status: 'rejected',
      reason: plan.adapterOutput.reason || 'adapter_rejected_bounded_input'
    };
  }

  if (plan.writeCountRequested > maxWriteCountValidation.writeCountLimit) {
    return {
      ...base,
      status: 'rejected',
      reason: 'write_count_exceeds_limit'
    };
  }

  if (mode === 'dry-run') {
    return {
      ...base,
      status: 'planned',
      reason: null
    };
  }

  if (mode === 'apply') {
    if (!operatorExecutionTokenExactMatch) {
      return {
        ...base,
        status: 'rejected',
        reason: 'missing_operator_execution_token'
      };
    }
    if (!skeletonGuardTokenExactMatch) {
      return {
        ...base,
        status: 'rejected',
        reason: 'missing_skeleton_guard_token'
      };
    }
    return {
      ...base,
      status: 'gated',
      reason: 'ready_for_proof_no_write'
    };
  }

  if (mode === 'rollback') {
    if (!operatorExecutionTokenExactMatch) {
      return {
        ...base,
        status: 'rejected',
        reason: 'missing_operator_execution_token'
      };
    }
    if (!skeletonGuardTokenExactMatch) {
      return {
        ...base,
        status: 'rejected',
        reason: 'missing_skeleton_guard_token'
      };
    }
    return {
      ...base,
      status: 'blocked',
      reason: 'rollback_stub_no_mutation_executed'
    };
  }

  return {
    ...base,
    status: 'planned',
    reason: null,
    writeCountRequested: 0
  };
}

module.exports = {
  COMMAND_VERSION,
  EXACT_APPROVAL_TOKEN,
  OPERATOR_EXECUTION_TOKEN,
  OUTPUT_SCHEMA_VERSION,
  SIDECAR_TARGET,
  buildPersistentTagMemoEnrichmentProofCommand,
  hashRedacted
};
