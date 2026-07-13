'use strict';

const crypto = require('node:crypto');

const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  validateVcpMemoryGovernedMutationProposalModeContract
} = require('./VcpMemoryGovernedMutationProposalModeContract');

const SCHEMA_VERSION = 'propose_memory_delta_v1';
const DEFAULT_TASK_ID = 'CM-2011';
const MAX_CANDIDATES = 5;
const FORBIDDEN_INPUT_KEYS = Object.freeze([
  'apiKey',
  'approvalLine',
  'approvalLineValue',
  'bearerToken',
  'commit',
  'confirm',
  'content',
  'credential',
  'credentials',
  'cutoverReady',
  'durableWrite',
  'endpoint',
  'execute',
  'fullBridgeCompletion',
  'locator',
  'memoryContent',
  'memory_id',
  'path',
  'productionReady',
  'production_write',
  'providerPayload',
  'rawAuditRow',
  'rawJsonlRow',
  'rawMemory',
  'rawOutput',
  'rawPath',
  'rawPayload',
  'rawPrompt',
  'readinessClaim',
  'releaseReady',
  'responseBody',
  'secret',
  'secrets',
  'snippet',
  'token',
  'write'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeString(value, maxLength = 300) {
  if (typeof value !== 'string') return '';
  return redactSensitiveFragments(value)
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function normalizeStringList(value, { maxItems = 5, maxLength = 180 } = {}) {
  const values = Array.isArray(value) ? value : (typeof value === 'string' ? [value] : []);
  return values
    .map(item => safeString(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function collectForbiddenKeys(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenKeys(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (FORBIDDEN_INPUT_KEYS.includes(key)) {
      found.push(path);
      continue;
    }
    found.push(...collectForbiddenKeys(nested, path));
  }
  return found;
}

function requestWriteIntentPresent(value) {
  if (!isPlainObject(value)) return false;
  const options = isPlainObject(value.options) ? value.options : {};
  return [
    value.commit,
    value.confirm,
    value.execute,
    value.write,
    value.durableWrite,
    value.production_write,
    options.commit,
    options.confirm,
    options.execute,
    options.write,
    options.durableWrite,
    options.production_write
  ].some(item => item === true);
}

function normalizeTask(input = {}) {
  const task = isPlainObject(input.task) ? input.task : {};
  const explicitTaskId = safeString(input.task_id || task.task_id, 40);
  return {
    task_id: /^CM-[0-9]{4}$/.test(explicitTaskId) ? explicitTaskId : DEFAULT_TASK_ID,
    title: safeString(task.title || input.title, 220),
    project_id_present: Boolean(safeString(task.project_id || input.project_id, 200)),
    workspace_id_present: Boolean(safeString(task.workspace_id || input.workspace_id, 200)),
    client_id: safeString(task.client_id || input.client_id, 80) || 'codex',
    visibility: safeString(task.visibility || input.visibility, 80) || 'project'
  };
}

function normalizeCandidate(candidate, index) {
  const intent = safeString(candidate.intent || candidate.summary || candidate.kind || candidate.title, 220);
  const evidenceRefs = normalizeStringList(candidate.evidence_refs || candidate.evidence || candidate.sources, {
    maxItems: 3,
    maxLength: 160
  });
  const tags = normalizeStringList(candidate.tags, { maxItems: 8, maxLength: 60 });
  return {
    ordinal: index + 1,
    target: ['process', 'knowledge'].includes(candidate.target) ? candidate.target : 'process',
    intent: intent || 'memory_delta_candidate_shape',
    evidence_refs: evidenceRefs,
    tags,
    reusable: candidate.reusable !== false,
    sensitivity: safeString(candidate.sensitivity, 80) || 'low_disclosure_project_fact',
    raw_values_included: false
  };
}

function normalizeCandidates(input = {}) {
  const source = Array.isArray(input.candidates)
    ? input.candidates
    : Array.isArray(input.candidate_memories)
      ? input.candidate_memories
      : [];
  return source
    .filter(isPlainObject)
    .slice(0, MAX_CANDIDATES)
    .map(normalizeCandidate);
}

function buildCounters(reviewDecision) {
  return {
    proposalsGenerated: 1,
    proposalAcceptances: reviewDecision === 'accept' ? 1 : 0,
    proposalRejections: reviewDecision === 'reject' ? 1 : 0,
    proposalReceiptsAudited: 1,
    proposalSubmissions: 0,
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
    mcpToolCalls: 0,
    memoryReads: 0,
    memoryWrites: 0,
    memoryUpdates: 0,
    memorySupersedes: 0,
    memoryTombstones: 0,
    durableAuditWrites: 0,
    durableMemoryWrites: 0,
    providerApiCalls: 0,
    publicMcpExpansions: 0,
    approvalLineOperations: 0,
    approvalRequestSubmissions: 0,
    readinessClaims: 0
  };
}

function buildProposalModeContract({ taskId, reviewDecision, expectedDecision }) {
  return {
    schemaVersion: 1,
    taskId,
    evidenceType: 'local-contract-only',
    profile: 'governed-mutation-proposal',
    entryEvidence: {
      m8TrustedFullReadWorkflowEvidenceAccepted: true,
      mutationProposalEnvelopeSpecified: true,
      l4WriteIntentShieldTested: true
    },
    boundary: {
      targetReferenceCategory: 'safe_target_reference_only',
      clientScopeCategory: 'bounded_client_aliases_only',
      visibilityCategory: 'bounded_visibility',
      operationFamily: 'propose_memory_delta_proposal_only',
      proposalOnly: true,
      directWriteRequested: false,
      durableWriteRequested: false,
      updateRequested: false,
      supersedeRequested: false,
      tombstoneRequested: false,
      irreversibleDeleteRequested: false,
      memoryWriteAllowed: false,
      durableWriteAllowed: false,
      providerApiAllowed: false,
      publicMcpExpansionAllowed: false
    },
    proposalEnvelope: {
      scopeCategory: 'shape_only_scope',
      intentCategory: 'redacted_intent_shape_only',
      diffCategory: 'redacted_diff_shape_only',
      rollbackPostureCategory: 'rollback_posture_shape_only',
      payloadShapeOnly: true,
      rawValuesIncluded: false
    },
    review: {
      generateProposal: true,
      reviewDecision,
      autoAccept: false,
      executionAuthorized: false
    },
    audit: {
      auditReceiptRequested: true,
      lowDisclosureReceipt: true,
      rawPayloadIncluded: false
    },
    expectedDecision,
    counters: buildCounters(reviewDecision)
  };
}

function buildCommitContractDraft() {
  return {
    tool: 'commit_memory_delta',
    status: 'operator_preflight_available_no_write',
    preflight_service: 'MemoryDeltaCommitPreflightService',
    exposed_by_default: false,
    public_mcp_registered: false,
    operator_only: true,
    exact_approval_required: true,
    requires_reviewed_proposal_id: true,
    requires_governance_receipt: true,
    requires_rollback_posture: true,
    durable_write_default: false,
    production_write_default: false,
    provider_call_allowed: false,
    readiness_claim_allowed: false
  };
}

function proposalIdFor(payload) {
  return `memory-delta-${crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 16)}`;
}

function buildRejectedResponse({ task, reasonCode, forbiddenFields = [] }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    status: 'PROPOSE_MEMORY_DELTA_REJECTED',
    accepted: false,
    reasonCode,
    forbiddenFields,
    proposal_only: true,
    task,
    staging: {
      staged: false,
      durable: false,
      production_write: false,
      review_required: true
    },
    access: {
      memoryWritten: false,
      durableMemoryWritten: false,
      productionWritePerformed: false,
      mcpMemoryWriteCalled: false,
      providerApiCalled: false,
      vcpToolBoxRuntimeCalled: false,
      publicMcpExpanded: false,
      readinessClaimed: false
    },
    commit_contract: buildCommitContractDraft(),
    low_disclosure: true,
    raw_values_included: false
  };
}

class MemoryDeltaProposalService {
  propose(args = {}) {
    const input = isPlainObject(args) ? args : {};
    const task = normalizeTask(input);
    const forbiddenFields = collectForbiddenKeys(input);
    if (forbiddenFields.length > 0) {
      return buildRejectedResponse({
        task,
        reasonCode: 'forbidden_raw_secret_write_or_overclaim_fields',
        forbiddenFields
      });
    }

    if (requestWriteIntentPresent(input)) {
      return buildRejectedResponse({
        task,
        reasonCode: 'write_commit_or_production_intent_not_allowed_on_proposal_path'
      });
    }

    const evidenceRefs = normalizeStringList(input.evidence_refs || input.evidence, {
      maxItems: 8,
      maxLength: 180
    });
    const candidates = normalizeCandidates(input);
    if (evidenceRefs.length === 0 || candidates.length === 0) {
      return buildRejectedResponse({
        task,
        reasonCode: 'evidence_refs_and_candidate_memories_required'
      });
    }

    const reviewDecision = input.review_decision === 'reject' ? 'reject' : 'accept';
    const expectedDecision = reviewDecision === 'reject' ? 'proposal_mode_reject' : 'proposal_mode_accept';
    const governanceContract = validateVcpMemoryGovernedMutationProposalModeContract(
      buildProposalModeContract({
        taskId: task.task_id,
        reviewDecision,
        expectedDecision
      })
    );

    if (!governanceContract.accepted) {
      return buildRejectedResponse({
        task,
        reasonCode: governanceContract.reasonCode || 'proposal_mode_contract_rejected'
      });
    }

    const proposalShape = {
      task,
      evidence_refs: evidenceRefs,
      candidates,
      reviewDecision
    };

    return {
      schemaVersion: SCHEMA_VERSION,
      status: reviewDecision === 'reject' ? 'PROPOSE_MEMORY_DELTA_REVIEW_REJECTED' : 'PROPOSE_MEMORY_DELTA_ACCEPTED',
      accepted: true,
      proposal_id: proposalIdFor(proposalShape),
      proposal_only: true,
      task,
      evidence_refs: evidenceRefs,
      candidates,
      staging: {
        staged: true,
        durable: false,
        production_write: false,
        review_required: true,
        proposal_submitted: false,
        operator_commit_required: true
      },
      validation: {
        evidence_required: true,
        evidence_present: true,
        candidate_count: candidates.length,
        proposal_mode_contract_decision: governanceContract.decision,
        accepted: governanceContract.accepted
      },
      audit_receipt: {
        schemaVersion: 'propose_memory_delta_audit_receipt_v1',
        low_disclosure: true,
        raw_payload_included: false,
        raw_values_included: false,
        memory_written: false,
        durable_memory_written: false,
        production_write_performed: false,
        provider_api_called: false,
        public_mcp_expanded: false,
        readiness_claimed: false,
        review_status: governanceContract.proposalReviewStatus
      },
      rollback_posture: {
        current_step: 'proposal_only_no_runtime_state_to_rollback',
        durable_write: false,
        rollback_required_now: false,
        future_commit_requires_rollback_plan: true
      },
      commit_contract: buildCommitContractDraft(),
      governance_contract: {
        contractName: governanceContract.contractName,
        contractMode: governanceContract.contractMode,
        decision: governanceContract.decision,
        proposalGenerated: governanceContract.proposalGenerated,
        proposalSubmitted: governanceContract.proposalSubmitted,
        auditReceiptGenerated: governanceContract.auditReceiptGenerated,
        memoryWritten: governanceContract.memoryWritten,
        durableMemoryWritten: governanceContract.durableMemoryWritten,
        providerApiCalled: governanceContract.providerApiCalled,
        publicMcpExpanded: governanceContract.publicMcpExpanded,
        readinessClaimed: governanceContract.readinessClaimed
      },
      access: {
        memoryRead: false,
        memoryWritten: false,
        durableMemoryWritten: false,
        productionWritePerformed: false,
        mcpMemoryWriteCalled: false,
        providerApiCalled: false,
        vcpToolBoxRuntimeCalled: false,
        publicMcpExpanded: false,
        readinessClaimed: false
      },
      low_disclosure: true,
      raw_values_included: false
    };
  }
}

module.exports = {
  MemoryDeltaProposalService,
  buildCommitContractDraft,
  collectForbiddenKeys
};
