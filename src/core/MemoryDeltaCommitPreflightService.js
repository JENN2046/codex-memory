'use strict';

const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const SCHEMA_VERSION = 'commit_memory_delta_operator_preflight_v1';
const DEFAULT_TASK_ID = 'CM-2035';

const FORBIDDEN_INPUT_KEYS = Object.freeze([
  'apiKey',
  'approvalLine',
  'approvalLineValue',
  'bearerToken',
  'content',
  'credential',
  'credentials',
  'cutoverReady',
  'endpoint',
  'execute',
  'fullBridgeCompletion',
  'locator',
  'memoryContent',
  'memory_id',
  'path',
  'productionReady',
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
  'token'
]);

const STOP_TRUE_PATHS = Object.freeze([
  ['commit'],
  ['write'],
  ['confirm'],
  ['durableWrite'],
  ['durable_write'],
  ['productionWrite'],
  ['production_write'],
  ['readinessClaimed'],
  ['rcReadyClaimed'],
  ['deployReadyClaimed'],
  ['fullCapabilityClaimed'],
  ['modelMemoryCompleteClaimed'],
  ['operator', 'defaultExposed'],
  ['operator', 'publicMcpRegistered'],
  ['operator', 'exactApprovalAccepted'],
  ['operator', 'commitExecutionAuthorized'],
  ['operator', 'durableWriteAuthorized'],
  ['operator', 'productionWriteAuthorized'],
  ['operator', 'providerCallAuthorized'],
  ['operator', 'readinessClaimAuthorized'],
  ['requestedAction', 'commitNow'],
  ['requestedAction', 'writeNow'],
  ['requestedAction', 'durableWriteNow'],
  ['requestedAction', 'productionWriteNow'],
  ['requestedAction', 'callProviderNow'],
  ['requestedAction', 'publishReadinessNow']
]);

const COUNTER_FIELDS = Object.freeze([
  'operatorApprovalsAccepted',
  'commitExecutions',
  'memoryWrites',
  'memoryUpdates',
  'memorySupersedes',
  'memoryTombstones',
  'durableMemoryWrites',
  'durableAuditWrites',
  'providerApiCalls',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'publicMcpExpansions',
  'approvalLineOperations',
  'approvalRequestSubmissions',
  'readinessClaims'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeString(value, maxLength = 220) {
  if (typeof value !== 'string') return '';
  return redactSensitiveFragments(value)
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

function collectForbiddenKeys(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenKeys(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = pathJoin(prefix, key);
    if (FORBIDDEN_INPUT_KEYS.includes(key)) {
      found.push(path);
      continue;
    }
    found.push(...collectForbiddenKeys(nested, path));
  }
  return found;
}

function valueAtPath(value, path) {
  return path.reduce((current, key) => (isPlainObject(current) ? current[key] : undefined), value);
}

function collectStopTruePaths(input) {
  return STOP_TRUE_PATHS
    .filter(path => valueAtPath(input, path) === true)
    .map(path => path.join('.'));
}

function invalidCounters(counters) {
  if (!isPlainObject(counters)) return [];
  return COUNTER_FIELDS.filter(field => (
    counters[field] !== undefined &&
    (!Number.isInteger(counters[field]) || counters[field] < 0)
  ));
}

function nonZeroCounters(counters) {
  if (!isPlainObject(counters)) return [];
  return COUNTER_FIELDS.filter(field => counters[field] !== undefined && counters[field] !== 0);
}

function normalizeTask(input) {
  const task = isPlainObject(input.task) ? input.task : {};
  const taskId = safeString(input.task_id || task.task_id, 40);
  return {
    task_id: /^CM-[0-9]{4}$/.test(taskId) ? taskId : DEFAULT_TASK_ID,
    title: safeString(task.title || input.title),
    client_id: safeString(task.client_id || input.client_id, 80) || 'codex',
    visibility: safeString(task.visibility || input.visibility, 80) || 'project'
  };
}

function isAcceptedProposal(proposal) {
  return isPlainObject(proposal) &&
    proposal.status === 'PROPOSE_MEMORY_DELTA_ACCEPTED' &&
    proposal.accepted === true &&
    proposal.proposal_only === true &&
    typeof proposal.proposal_id === 'string' &&
    /^memory-delta-[a-f0-9]{16}$/.test(proposal.proposal_id) &&
    isPlainObject(proposal.staging) &&
    proposal.staging.staged === true &&
    proposal.staging.durable === false &&
    proposal.staging.production_write === false &&
    proposal.staging.operator_commit_required === true &&
    isPlainObject(proposal.audit_receipt) &&
    proposal.audit_receipt.low_disclosure === true &&
    proposal.audit_receipt.memory_written === false &&
    proposal.audit_receipt.durable_memory_written === false &&
    proposal.audit_receipt.production_write_performed === false &&
    proposal.audit_receipt.provider_api_called === false &&
    proposal.audit_receipt.public_mcp_expanded === false &&
    proposal.audit_receipt.readiness_claimed === false &&
    isPlainObject(proposal.governance_contract) &&
    proposal.governance_contract.memoryWritten === false &&
    proposal.governance_contract.durableMemoryWritten === false &&
    proposal.governance_contract.providerApiCalled === false &&
    proposal.governance_contract.publicMcpExpanded === false &&
    proposal.governance_contract.readinessClaimed === false &&
    isPlainObject(proposal.access) &&
    proposal.access.memoryWritten === false &&
    proposal.access.durableMemoryWritten === false &&
    proposal.access.productionWritePerformed === false &&
    proposal.access.mcpMemoryWriteCalled === false &&
    proposal.access.providerApiCalled === false &&
    proposal.access.vcpToolBoxRuntimeCalled === false &&
    proposal.access.publicMcpExpanded === false &&
    proposal.access.readinessClaimed === false &&
    isPlainObject(proposal.rollback_posture) &&
    proposal.rollback_posture.future_commit_requires_rollback_plan === true &&
    isPlainObject(proposal.commit_contract) &&
    proposal.commit_contract.tool === 'commit_memory_delta' &&
    proposal.commit_contract.operator_only === true &&
    proposal.commit_contract.exposed_by_default === false &&
    proposal.commit_contract.public_mcp_registered === false;
}

function rejected({ task, reasonCode, blockers = [], forbiddenFields = [] }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    status: 'COMMIT_MEMORY_DELTA_PREFLIGHT_REJECTED',
    accepted: false,
    reasonCode,
    blockers,
    forbiddenFields,
    task,
    operator_only: true,
    default_exposed: false,
    public_mcp_registered: false,
    exact_approval_required: true,
    exact_approval_accepted: false,
    commit_allowed_now: false,
    memory_written: false,
    durable_memory_written: false,
    production_write_performed: false,
    provider_api_called: false,
    vcp_toolbox_runtime_called: false,
    public_mcp_expanded: false,
    readiness_claimed: false,
    low_disclosure: true,
    raw_values_included: false
  };
}

class MemoryDeltaCommitPreflightService {
  preflight(args = {}) {
    const input = isPlainObject(args) ? args : {};
    const task = normalizeTask(input);
    const forbiddenFields = collectForbiddenKeys(input);
    if (forbiddenFields.length > 0) {
      return rejected({
        task,
        reasonCode: 'forbidden_raw_secret_or_private_commit_fields',
        forbiddenFields
      });
    }

    const invalidCounterFields = invalidCounters(input.counters);
    if (invalidCounterFields.length > 0) {
      return rejected({
        task,
        reasonCode: 'invalid_counter_fields',
        blockers: invalidCounterFields.map(field => `counters.${field}`)
      });
    }

    const stopBlockers = [
      ...collectStopTruePaths(input),
      ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
    ];
    if (stopBlockers.length > 0) {
      return rejected({
        task,
        reasonCode: 'stop_l4',
        blockers: stopBlockers
      });
    }

    if (!isAcceptedProposal(input.proposal)) {
      return rejected({
        task,
        reasonCode: 'accepted_low_disclosure_proposal_required',
        blockers: ['proposal']
      });
    }
    if (input.proposal.task?.task_id !== task.task_id) {
      return rejected({
        task,
        reasonCode: 'proposal_task_mismatch',
        blockers: ['proposal.task.task_id']
      });
    }

    return {
      schemaVersion: SCHEMA_VERSION,
      status: 'COMMIT_MEMORY_DELTA_PREFLIGHT_READY_FOR_FUTURE_OPERATOR_REVIEW',
      accepted: true,
      task,
      proposal_id: input.proposal.proposal_id,
      operator_only: true,
      default_exposed: false,
      public_mcp_registered: false,
      exact_approval_required: true,
      exact_approval_accepted: false,
      commit_allowed_now: false,
      required_future_evidence: {
        reviewed_proposal_id: 'present_low_disclosure_proposal_id',
        exact_operator_approval: 'requires_future_exact_operator_approval',
        governance_receipt: 'requires_future_governance_receipt',
        rollback_posture: 'requires_future_rollback_posture',
        durable_write_receipt: 'requires_future_exact_authorized_commit_receipt'
      },
      preflight: {
        proposal_reviewed: true,
        low_disclosure: true,
        raw_values_included: false,
        operator_commit_path_prepared: true,
        durable_write_default: false,
        production_write_default: false,
        provider_call_allowed: false,
        readiness_claim_allowed: false
      },
      access: {
        memory_written: false,
        durable_memory_written: false,
        production_write_performed: false,
        provider_api_called: false,
        vcp_toolbox_runtime_called: false,
        public_mcp_expanded: false,
        readiness_claimed: false
      },
      low_disclosure: true,
      raw_values_included: false
    };
  }
}

module.exports = {
  MemoryDeltaCommitPreflightService,
  collectForbiddenKeys
};
