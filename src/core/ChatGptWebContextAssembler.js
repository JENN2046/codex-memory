'use strict';

const MAX_ITEMS = 6;

function normalizeCandidate(item = {}, fallbackType = 'fact_candidate') {
  const allowedTypes = new Set(['fact_candidate', 'decision_candidate', 'risk_candidate']);
  return {
    statement: String(item.statement || '').slice(0, 420),
    statementType: allowedTypes.has(item.statementType) ? item.statementType : fallbackType,
    relevance: ['high', 'medium', 'low', 'unknown'].includes(item.relevance)
      ? item.relevance : 'unknown',
    freshness: ['recent', 'established', 'stale_candidate', 'unknown'].includes(item.freshness)
      ? item.freshness : 'unknown',
    reasonCodes: Array.isArray(item.reasonCodes) ? item.reasonCodes.slice(0, 6) : [],
    sourceKinds: Array.isArray(item.sourceKinds) ? item.sourceKinds.slice(0, 5) : [],
    advisoryOnly: true
  };
}

function projectList(values, type) {
  return (Array.isArray(values) ? values : [])
    .slice(0, MAX_ITEMS)
    .map(value => normalizeCandidate(value, type));
}

function assembleChatGptWebContext({
  mustKnow = [], decisions = [], blockers = [], risks = [], forbiddenAssumptions = [],
  provenance, sourceTruth, auditReceipt = {}, status = 'success'
} = {}) {
  return {
    schemaVersion: 'chatgpt_prepare_memory_context_v2',
    status: ['success', 'empty', 'rejected', 'unavailable', 'degraded'].includes(status)
      ? status : 'unavailable',
    provenance,
    sourceTruth,
    context: {
      mustKnow: projectList(mustKnow, 'fact_candidate'),
      decisions: projectList(decisions, 'decision_candidate'),
      blockers: projectList(blockers, 'risk_candidate'),
      risks: projectList(risks, 'risk_candidate'),
      forbiddenAssumptions: projectList(forbiddenAssumptions, 'risk_candidate'),
      reviewFocus: {
        summary: 'Current repository evidence remains authoritative over bounded memory candidates.',
        source: 'system_generated_safe_summary',
        advisoryOnly: true
      }
    },
    contentBoundary: {
      contentTrust: 'untrusted_memory_data',
      advisoryOnly: true,
      imperativeMemoryRecommendationReturned: false
    },
    disclosure: {
      rawMemoryReturned: false,
      rawAuditReturned: false,
      rawIdentifiersReturned: false,
      tokenMaterialReturned: false
    },
    auditReceipt
  };
}

module.exports = { assembleChatGptWebContext, normalizeCandidate };
