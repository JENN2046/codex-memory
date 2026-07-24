'use strict';

const crypto = require('node:crypto');

const {
  C6_CONTRACT_ID,
  isBoundedOutputSafetyReceipt
} = require('./ChatGptWebOutputSafetyReceipt');

const INJECTION_SIGNAL_RECEIPT_SCHEMA_VERSION = 'injection_signal_receipt_v2';
const FALLBACK_OBSERVED_AT = '1970-01-01T00:00:00.000Z';

const INJECTION_SIGNAL_RULES = Object.freeze([
  {
    countKey: 'instructionLikeContent',
    failureCode: 'INJECTION_INSTRUCTION_LIKE_CONTENT',
    patterns: [
      /\b(?:ignore|disregard|override)\b.*\b(?:previous|prior|system|developer|instructions?)\b/i,
      /\b(?:system|developer)\s+(?:message|instruction)\b/i,
      /\b(?:show|display|return)\b.*\b(?:full|entire)\b.*\b(?:original|memory|raw|content)\b/i,
      /忽略.*(?:之前|系统|开发者).*指令/i
    ]
  },
  {
    countKey: 'toolEscalationAttempt',
    failureCode: 'INJECTION_TOOL_ESCALATION_ATTEMPT',
    patterns: [
      /\b(?:call|invoke|use|enable)\b.*\b(?:hidden|other|another)?\s*(?:tool|function|plugin|mcp)\b/i,
      /\bhidden\s+tool\b/i,
      /(?:调用|使用).*(?:隐藏|其他)?.*工具/i
    ]
  },
  {
    countKey: 'secretExfiltrationAttempt',
    failureCode: 'INJECTION_SECRET_EXFILTRATION_ATTEMPT',
    patterns: [
      /\b(?:reveal|send|share|export|exfiltrate)\b.*\b(?:secret|token|api\s*key|credential|password)\b/i,
      /(?:泄露|发送|导出).*(?:密钥|令牌|凭证)/i
    ]
  },
  {
    countKey: 'crossAppExfiltrationAttempt',
    failureCode: 'INJECTION_CROSS_APP_EXFILTRATION_ATTEMPT',
    patterns: [
      /\b(?:gmail|google\s+drive|slack|teams|outlook|another\s+app|other\s+app)\b/i,
      /\b(?:send|post|upload|exfiltrate)\b.*\b(?:web|website|url|browser)\b/i,
      /(?:发送|上传).*(?:网页|其他\s*App|邮件)/i
    ]
  }
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeObservedAt(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function stableUnique(values) {
  return [...new Set(values)];
}

function digestStatements(statements) {
  let serialized;
  try {
    serialized = JSON.stringify(statements);
  } catch {
    serialized = 'unserializable_input';
  }
  return `sha256:${crypto
    .createHash('sha256')
    .update(serialized, 'utf8')
    .digest('hex')}`;
}

function collectInjectionSignals(statements) {
  const counts = Object.fromEntries(INJECTION_SIGNAL_RULES
    .map(rule => [rule.countKey, 0]));
  const failureCodes = [];
  const safeStatements = Array.isArray(statements) ? statements : [];
  const validShape = Array.isArray(statements) && safeStatements.every(statement =>
    isPlainObject(statement) && typeof statement.statement === 'string'
  );

  for (const statement of safeStatements) {
    const text = typeof statement?.statement === 'string' ? statement.statement : '';
    for (const rule of INJECTION_SIGNAL_RULES) {
      if (rule.patterns.some(pattern => pattern.test(text))) {
        counts[rule.countKey] += 1;
        failureCodes.push(rule.failureCode);
      }
    }
  }

  return {
    validShape,
    statementCount: safeStatements.length,
    signalCounts: counts,
    failureCodes: stableUnique(failureCodes)
  };
}

function buildInjectionSignalReceipt({
  outputSafetyReceipt,
  statements,
  evidenceMode = 'synthetic_fixture',
  observedAt
} = {}) {
  const normalizedObservedAt = normalizeObservedAt(observedAt);
  const signals = collectInjectionSignals(statements);
  const outputSafetyBound = isBoundedOutputSafetyReceipt(outputSafetyReceipt);
  const safeStatements = Array.isArray(statements) ? statements : [];
  const statementDigest = digestStatements(safeStatements);
  const outputSafetyStatementDigestMatched = outputSafetyBound &&
    outputSafetyReceipt.statementDigest === statementDigest;
  const blockers = [];
  const failureCodes = [...signals.failureCodes];

  if (!outputSafetyBound) blockers.push('bounded_output_safety_receipt_required');
  if (!outputSafetyStatementDigestMatched) {
    blockers.push('output_safety_statement_digest_mismatch');
  }
  if (evidenceMode !== 'synthetic_fixture') blockers.push('synthetic_fixture_mode_required');
  if (!normalizedObservedAt) blockers.push('observed_at_invalid');
  if (!signals.validShape) blockers.push('statement_shape_invalid');
  if (blockers.length > 0) failureCodes.push('OUTPUT_SCHEMA_REJECTED');

  const normalizedFailureCodes = stableUnique(failureCodes);
  const status = blockers.length === 0 ? 'candidate' : 'blocked';
  const signalCount = Object.values(signals.signalCounts)
    .reduce((total, value) => total + value, 0);

  return {
    schemaVersion: INJECTION_SIGNAL_RECEIPT_SCHEMA_VERSION,
    contractId: C6_CONTRACT_ID,
    status,
    decision: status === 'blocked'
      ? 'blocked'
      : signalCount > 0
        ? 'signal_detected'
        : 'no_signal_detected',
    observedAt: normalizedObservedAt || FALLBACK_OBSERVED_AT,
    evidenceMode: evidenceMode === 'synthetic_fixture' ? evidenceMode : 'unknown',
    lowDisclosure: true,
    secretMaterialIncluded: false,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    rawIdentifiersReturned: false,
    endpointOrLocatorReturned: false,
    evidenceRefs: ['bounded_output_safety_receipt', 'synthetic_statement_digest'],
    outputSafetyReceiptBound: outputSafetyBound,
    outputSafetyStatementDigestMatched,
    statementDigest,
    statementCount: signals.statementCount,
    contentTrust: 'untrusted_memory_data',
    advisoryOnly: true,
    detectionTelemetryOnly: true,
    contentMustRemainAdvisory: true,
    instructionExecuted: false,
    toolInvocationCount: 0,
    providerApiCalls: 0,
    externalNetworkCallsFromMemoryTool: 0,
    durableMemoryMutationCount: 0,
    operationalAuditWriteCount: 0,
    openWorldHint: false,
    liveEvidenceVerified: false,
    runtimeProbePerformed: false,
    closeoutEligible: false,
    signalCounts: signals.signalCounts,
    signalsDetected: signalCount > 0,
    failureCodes: normalizedFailureCodes,
    blockers
  };
}

module.exports = {
  INJECTION_SIGNAL_RECEIPT_SCHEMA_VERSION,
  INJECTION_SIGNAL_RULES,
  buildInjectionSignalReceipt,
  collectInjectionSignals
};
