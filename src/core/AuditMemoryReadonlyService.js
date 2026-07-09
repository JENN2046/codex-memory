'use strict';

const {
  ALLOWED_AUDIT_FAMILIES,
  MUTATION_INPUT_KEYS,
  validateAuditMemoryReadonlyDraftInput
} = require('./AuditMemoryReadonlyToolDraft');

const DEFAULT_WINDOW = 50;
const MAX_WINDOW = 200;
const ACCESS_MODE = 'audit_memory_readonly_bounded';
const SERVICE_STATUS_ACCEPTED = 'AUDIT_MEMORY_READONLY_BOUNDED_ACCEPTED_NOT_PUBLIC';
const SERVICE_STATUS_REJECTED = 'AUDIT_MEMORY_READONLY_BOUNDED_REJECTED';

const FORBIDDEN_OUTPUT_KEYS = Object.freeze([
  'memoryId',
  'memory_id',
  'title',
  'content',
  'snippet',
  'filePath',
  'relativePath',
  'sourceFile',
  'path',
  'rawText',
  'raw_text',
  'rawJsonl',
  'rawAudit',
  'providerUrl',
  'providerURL',
  'embeddingFingerprint',
  'token',
  'authorization'
]);

const DECISION_TYPES = Object.freeze([
  'visible',
  'hidden',
  'suppressed'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeFamily(value) {
  return ALLOWED_AUDIT_FAMILIES.includes(value) ? value : 'all';
}

function normalizeWindow(value) {
  return Number.isInteger(value) && value >= 1 && value <= MAX_WINDOW ? value : DEFAULT_WINDOW;
}

function buildAccess() {
  return {
    mode: ACCESS_MODE,
    selectedProjection: true,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    filesystemPathsReturned: false,
    tokenMaterialReturned: false,
    providerPayloadReturned: false,
    memoryIdsReturned: false,
    titlesReturned: false,
    snippetsReturned: false,
    contentReturned: false
  };
}

function buildPolicy() {
  return {
    lifecyclePolicyExplained: true,
    scopePolicyExplained: true,
    redactionApplied: true,
    governedNativeBridgeAuditReceiptProjection: false,
    rawAuditScanPerformed: false,
    providerCalled: false,
    durableMutationPerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    rcReadyClaimed: false
  };
}

function emptyCounts() {
  return {
    visibleDecisionCount: 0,
    hiddenDecisionCount: 0,
    suppressedDecisionCount: 0
  };
}

function sanitizeReason(value) {
  if (typeof value !== 'string' || value.length === 0) return 'unspecified';
  return value.slice(0, 120);
}

function sanitizeFinding(decision) {
  const decisionType = DECISION_TYPES.includes(decision?.decision) ? decision.decision : 'hidden';
  const finding = {
    auditFamily: normalizeFamily(decision?.auditFamily),
    decision: decisionType,
    reasonCode: sanitizeReason(decision?.reasonCode),
    lifecyclePolicy: sanitizeReason(decision?.lifecyclePolicy),
    scopePolicy: sanitizeReason(decision?.scopePolicy),
    redacted: true
  };
  if (
    isPlainObject(decision?.governedNativeBridgeReceipt) &&
    decision.governedNativeBridgeReceipt.schemaVersion === 'governed_native_bridge_audit_memory_projection_v1'
  ) {
    finding.governedNativeBridgeReceipt = decision.governedNativeBridgeReceipt;
  }
  if (
    isPlainObject(decision?.governedNativeReadFallbackReceipt) &&
    decision.governedNativeReadFallbackReceipt.schemaVersion ===
      'governed_native_read_fallback_audit_memory_projection_v1'
  ) {
    finding.governedNativeReadFallbackReceipt = decision.governedNativeReadFallbackReceipt;
  }
  return finding;
}

function ensureNoForbiddenOutputKeys(value, path = []) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      ensureNoForbiddenOutputKeys(value[index], [...path, String(index)]);
    }
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_OUTPUT_KEYS.includes(key)) {
      throw new Error(`Forbidden audit_memory output key: ${[...path, key].join('.')}`);
    }
    ensureNoForbiddenOutputKeys(nested, [...path, key]);
  }
}

class AuditMemoryReadonlyService {
  constructor({ decisionProvider = null } = {}) {
    this.decisionProvider = typeof decisionProvider === 'function' ? decisionProvider : () => [];
  }

  async run(input = {}) {
    const validation = validateAuditMemoryReadonlyDraftInput(input);
    const requestedFamily = normalizeFamily(input.audit_family);
    const window = normalizeWindow(input.window);

    if (!validation.accepted) {
      return {
        status: SERVICE_STATUS_REJECTED,
        accepted: false,
        blockerReasons: validation.blockerReasons,
        access: buildAccess(),
        summary: {
          requestedFamily,
          window,
          ...emptyCounts()
        },
        policy: buildPolicy(),
        findings: []
      };
    }

    const decisions = await this.decisionProvider({
      auditFamily: requestedFamily,
      window,
      scope: isPlainObject(input.scope) ? input.scope : {}
    });
    const safeDecisions = Array.isArray(decisions) ? decisions.slice(0, window) : [];
    const findings = safeDecisions.map(sanitizeFinding);
    const counts = emptyCounts();

    for (const finding of findings) {
      if (finding.decision === 'visible') counts.visibleDecisionCount += 1;
      if (finding.decision === 'hidden') counts.hiddenDecisionCount += 1;
      if (finding.decision === 'suppressed') counts.suppressedDecisionCount += 1;
    }

    const report = {
      status: SERVICE_STATUS_ACCEPTED,
      accepted: true,
      blockerReasons: [],
      access: buildAccess(),
      summary: {
        requestedFamily,
        window,
        ...counts
      },
      policy: {
        ...buildPolicy(),
        governedNativeBridgeAuditReceiptProjection: findings.some(finding =>
          isPlainObject(finding.governedNativeBridgeReceipt) ||
          isPlainObject(finding.governedNativeReadFallbackReceipt)
        )
      },
      findings
    };

    ensureNoForbiddenOutputKeys(report);
    return report;
  }
}

module.exports = {
  ACCESS_MODE,
  AuditMemoryReadonlyService,
  DEFAULT_WINDOW,
  FORBIDDEN_OUTPUT_KEYS,
  MUTATION_INPUT_KEYS,
  SERVICE_STATUS_ACCEPTED,
  SERVICE_STATUS_REJECTED,
  ensureNoForbiddenOutputKeys
};
