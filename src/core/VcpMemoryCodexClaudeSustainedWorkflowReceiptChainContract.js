'use strict';

const {
  FORBIDDEN_FIELD_NAMES: ENVELOPE_FORBIDDEN_FIELD_NAMES,
  ZERO_COUNTER_FIELDS: ENVELOPE_ZERO_COUNTER_FIELDS,
  validateVcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract
} = require('./VcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract');

const CONTRACT_NAME = 'VcpMemoryCodexClaudeSustainedWorkflowReceiptChainContract';
const CONTRACT_MODE = 'fixture_receipt_chain_contract_only';
const SCHEMA_VERSION = 1;
const RECEIPT_CHAIN_CONTRACT_VERSION = 'vcp_memory_codex_claude_workflow_receipt_chain_v1';

const ALLOWED_EVIDENCE_TYPES = Object.freeze([
  'fixture-only',
  'schema-only'
]);

const ALLOWED_CHAIN_DECISIONS = Object.freeze([
  'receipt_accept',
  'receipt_deny',
  'receipt_stop_l4'
]);

const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'm12_fixture_receipt_chain_contract',
  'm12_fixture_boundary'
]);

const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'summary',
  'structured',
  'none'
]);

const ALLOWED_RECEIPT_FIELDS = Object.freeze([
  'workflow_envelope_id',
  'receipt_chain_id',
  'client_family',
  'visibility',
  'decision',
  'chain_decision',
  'scope_present',
  'next_action_allowed',
  'abort_reason'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'workflowEnvelopeContractInput',
  'receiptChain',
  'counters'
]);

const REQUIRED_RECEIPT_CHAIN_FIELDS = Object.freeze([
  'chain_id',
  'contract_version',
  'evidence_type',
  'chain_mode',
  'workflow_envelope_id',
  'chain_decision',
  'checkpointReceipt',
  'handoffReceipt',
  'auditReceiptPlan',
  'ordering',
  'report',
  'aborts',
  'next_action_allowed'
]);

const REQUIRED_RECEIPT_FIELDS = Object.freeze([
  'receipt_id',
  'receipt_type',
  'workflow_envelope_id',
  'low_disclosure',
  'fields',
  'client_id_value_disclosed',
  'raw_private_payload_disclosed',
  'memory_write_performed',
  'durable_write_performed',
  'submitted_to_runtime'
]);

const REQUIRED_AUDIT_PLAN_FIELDS = Object.freeze([
  'low_disclosure',
  'audit_event_written',
  'durable_audit_write_planned',
  'raw_audit_row_disclosed',
  'raw_private_payload_disclosed'
]);

const REQUIRED_ORDERING_FIELDS = Object.freeze([
  'requires_envelope_acceptance',
  'checkpoint_before_handoff',
  'handoff_after_checkpoint'
]);

const REQUIRED_REPORT_FIELDS = Object.freeze([
  'disclosure_level',
  'low_disclosure',
  'raw_private_output_allowed',
  'readiness_claim_allowed'
]);

const REQUIRED_ABORT_FIELDS = Object.freeze([
  'missing_envelope_abort',
  'envelope_rejection_abort',
  'receipt_mismatch_abort',
  'write_expansion_abort',
  'raw_private_output_abort',
  'durable_audit_write_abort',
  'public_mcp_expansion_abort',
  'readiness_overclaim_abort'
]);

const RECEIPT_CHAIN_ZERO_COUNTER_FIELDS = Object.freeze([
  ...new Set([
    ...ENVELOPE_ZERO_COUNTER_FIELDS,
    'checkpointReceiptWrites',
    'handoffReceiptWrites',
    'receiptChainDurableWrites',
    'auditReceiptWrites',
    'runtimeReceiptPublishes',
    'receiptChainSubmissions'
  ])
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  ...new Set([
    ...ENVELOPE_FORBIDDEN_FIELD_NAMES,
    'checkpointMemoryContent',
    'handoffMemoryContent',
    'rawCheckpoint',
    'rawHandoff',
    'rawReceipt',
    'rawReceiptChain',
    'approvalRequest',
    'approvalGrant',
    'approvalValue',
    'runtimeTarget',
    'runtimeEndpoint'
  ])
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function missingFields(required, value, prefix = '') {
  const actual = isPlainObject(value) ? value : {};
  return required
    .filter(field => !(field in actual))
    .map(field => (prefix ? `${prefix}.${field}` : field));
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

function collectForbiddenFields(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenFields(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = pathJoin(prefix, key);
    if (FORBIDDEN_FIELD_NAMES.includes(key)) {
      found.push(path);
      continue;
    }
    found.push(...collectForbiddenFields(nested, path));
  }
  return found;
}

function collectPositiveCounters(counters) {
  if (!isPlainObject(counters)) return RECEIPT_CHAIN_ZERO_COUNTER_FIELDS;
  return RECEIPT_CHAIN_ZERO_COUNTER_FIELDS.filter(field => Number(counters[field] || 0) > 0);
}

function lowDisclosureProjection(input, envelopeResult = null) {
  const chain = isPlainObject(input) ? input.receiptChain : null;
  return {
    chainId: isPlainObject(chain) && typeof chain.chain_id === 'string' ? chain.chain_id : null,
    envelopeId: isPlainObject(chain) && typeof chain.workflow_envelope_id === 'string'
      ? chain.workflow_envelope_id
      : envelopeResult?.envelopeId || null,
    chainDecision: isPlainObject(chain) && typeof chain.chain_decision === 'string' ? chain.chain_decision : null,
    envelopeDecision: envelopeResult?.decision || null,
    clientFamily: envelopeResult?.clientFamily || null,
    visibility: envelopeResult?.visibility || null,
    evidenceType: isPlainObject(chain) && typeof chain.evidence_type === 'string' ? chain.evidence_type : null
  };
}

function rejected(reasonCode, input, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input, details.envelopeResult || null),
    missingFields: details.missingFields || [],
    forbiddenFields: details.forbiddenFields || [],
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    nextAction: 'fix_fixture_or_stop',
    fixtureReceiptChainOnly: true,
    receiptChainValidated: false,
    runtimeWiringExecuted: false,
    workflowHarnessStarted: false,
    workflowStepsExecuted: 0,
    liveVcpToolBoxCalled: false,
    mcpToolCalled: false,
    memoryRead: false,
    memoryWritten: false,
    checkpointReceiptWritten: false,
    handoffReceiptWritten: false,
    checkpointMemoryWritten: false,
    handoffMemoryWritten: false,
    auditReceiptWritten: false,
    durableAuditWritten: false,
    durableMemoryWritten: false,
    providerApiCalled: false,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false
  };
}

function validateReceiptShape(receipt, expectedType, envelopeId, prefix) {
  const invalidFields = [];
  if (!isPlainObject(receipt)) return [prefix];

  if (receipt.receipt_type !== expectedType) invalidFields.push(`${prefix}.receipt_type`);
  if (receipt.workflow_envelope_id !== envelopeId) invalidFields.push(`${prefix}.workflow_envelope_id`);
  if (receipt.low_disclosure !== true) invalidFields.push(`${prefix}.low_disclosure`);
  if (!Array.isArray(receipt.fields) || receipt.fields.length === 0) {
    invalidFields.push(`${prefix}.fields`);
  } else {
    for (const field of receipt.fields) {
      if (!ALLOWED_RECEIPT_FIELDS.includes(field)) invalidFields.push(`${prefix}.fields`);
    }
  }
  if (receipt.client_id_value_disclosed !== false) invalidFields.push(`${prefix}.client_id_value_disclosed`);
  if (receipt.raw_private_payload_disclosed !== false) invalidFields.push(`${prefix}.raw_private_payload_disclosed`);
  if (receipt.memory_write_performed !== false) invalidFields.push(`${prefix}.memory_write_performed`);
  if (receipt.durable_write_performed !== false) invalidFields.push(`${prefix}.durable_write_performed`);
  if (receipt.submitted_to_runtime !== false) invalidFields.push(`${prefix}.submitted_to_runtime`);

  return invalidFields;
}

function expectedChainDecision(envelopeDecision) {
  if (envelopeDecision === 'fixture_accept') return 'receipt_accept';
  if (envelopeDecision === 'deny') return 'receipt_deny';
  if (envelopeDecision === 'stop_l4') return 'receipt_stop_l4';
  return null;
}

function validateReceiptChainShape(chain, envelopeResult) {
  const invalidFields = [];
  if (!isPlainObject(chain)) return ['receiptChain'];

  if (chain.contract_version !== RECEIPT_CHAIN_CONTRACT_VERSION) invalidFields.push('receiptChain.contract_version');
  if (!ALLOWED_EVIDENCE_TYPES.includes(chain.evidence_type)) invalidFields.push('receiptChain.evidence_type');
  if (chain.chain_mode !== 'fixture-only') invalidFields.push('receiptChain.chain_mode');
  if (chain.workflow_envelope_id !== envelopeResult.envelopeId) invalidFields.push('receiptChain.workflow_envelope_id');
  if (!ALLOWED_CHAIN_DECISIONS.includes(chain.chain_decision)) invalidFields.push('receiptChain.chain_decision');
  if (chain.chain_decision !== expectedChainDecision(envelopeResult.decision)) {
    invalidFields.push('receiptChain.chain_decision');
  }
  if (!ALLOWED_NEXT_ACTIONS.includes(chain.next_action_allowed)) invalidFields.push('receiptChain.next_action_allowed');

  invalidFields.push(
    ...validateReceiptShape(chain.checkpointReceipt, 'checkpoint', chain.workflow_envelope_id, 'receiptChain.checkpointReceipt'),
    ...validateReceiptShape(chain.handoffReceipt, 'handoff', chain.workflow_envelope_id, 'receiptChain.handoffReceipt')
  );

  const auditPlan = isPlainObject(chain.auditReceiptPlan) ? chain.auditReceiptPlan : {};
  if (auditPlan.low_disclosure !== true) invalidFields.push('receiptChain.auditReceiptPlan.low_disclosure');
  if (auditPlan.audit_event_written !== false) invalidFields.push('receiptChain.auditReceiptPlan.audit_event_written');
  if (auditPlan.durable_audit_write_planned !== false) {
    invalidFields.push('receiptChain.auditReceiptPlan.durable_audit_write_planned');
  }
  if (auditPlan.raw_audit_row_disclosed !== false) {
    invalidFields.push('receiptChain.auditReceiptPlan.raw_audit_row_disclosed');
  }
  if (auditPlan.raw_private_payload_disclosed !== false) {
    invalidFields.push('receiptChain.auditReceiptPlan.raw_private_payload_disclosed');
  }

  const ordering = isPlainObject(chain.ordering) ? chain.ordering : {};
  if (ordering.requires_envelope_acceptance !== true) {
    invalidFields.push('receiptChain.ordering.requires_envelope_acceptance');
  }
  if (ordering.checkpoint_before_handoff !== true) {
    invalidFields.push('receiptChain.ordering.checkpoint_before_handoff');
  }
  if (ordering.handoff_after_checkpoint !== true) {
    invalidFields.push('receiptChain.ordering.handoff_after_checkpoint');
  }

  const report = isPlainObject(chain.report) ? chain.report : {};
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(report.disclosure_level)) {
    invalidFields.push('receiptChain.report.disclosure_level');
  }
  if (report.low_disclosure !== true) invalidFields.push('receiptChain.report.low_disclosure');
  if (report.raw_private_output_allowed !== false) {
    invalidFields.push('receiptChain.report.raw_private_output_allowed');
  }
  if (report.readiness_claim_allowed !== false) invalidFields.push('receiptChain.report.readiness_claim_allowed');

  const aborts = isPlainObject(chain.aborts) ? chain.aborts : {};
  for (const field of REQUIRED_ABORT_FIELDS) {
    if (aborts[field] !== true) invalidFields.push(`receiptChain.aborts.${field}`);
  }

  return invalidFields;
}

function validateVcpMemoryCodexClaudeSustainedWorkflowReceiptChainContract(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_RECEIPT_CHAIN_FIELDS, input.receiptChain, 'receiptChain'),
    ...missingFields(REQUIRED_RECEIPT_FIELDS, input.receiptChain?.checkpointReceipt, 'receiptChain.checkpointReceipt'),
    ...missingFields(REQUIRED_RECEIPT_FIELDS, input.receiptChain?.handoffReceipt, 'receiptChain.handoffReceipt'),
    ...missingFields(REQUIRED_AUDIT_PLAN_FIELDS, input.receiptChain?.auditReceiptPlan, 'receiptChain.auditReceiptPlan'),
    ...missingFields(REQUIRED_ORDERING_FIELDS, input.receiptChain?.ordering, 'receiptChain.ordering'),
    ...missingFields(REQUIRED_REPORT_FIELDS, input.receiptChain?.report, 'receiptChain.report'),
    ...missingFields(REQUIRED_ABORT_FIELDS, input.receiptChain?.aborts, 'receiptChain.aborts')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const envelopeResult = validateVcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract(input.workflowEnvelopeContractInput);
  if (!envelopeResult.accepted) {
    return rejected('invalid_workflow_envelope_contract', input, {
      envelopeResult,
      invalidFields: envelopeResult.invalidFields || []
    });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_runtime_or_overclaim_fields', input, {
      envelopeResult,
      forbiddenFields
    });
  }

  const forbiddenCounters = collectPositiveCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_positive_side_effect_counters', input, {
      envelopeResult,
      forbiddenCounters
    });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  invalidFields.push(...validateReceiptChainShape(input.receiptChain, envelopeResult));

  if (invalidFields.length > 0) {
    return rejected('invalid_codex_claude_sustained_workflow_receipt_chain_contract', input, {
      envelopeResult,
      invalidFields
    });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    chainId: input.receiptChain.chain_id,
    envelopeId: envelopeResult.envelopeId,
    chainDecision: input.receiptChain.chain_decision,
    envelopeDecision: envelopeResult.decision,
    clientFamily: envelopeResult.clientFamily,
    visibility: envelopeResult.visibility,
    evidenceType: input.receiptChain.evidence_type,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input, envelopeResult),
    missingFields: [],
    forbiddenFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'fixture_receipt_chain_validated_no_runtime_no_write',
    fixtureReceiptChainOnly: true,
    receiptChainValidated: true,
    runtimeWiringExecuted: false,
    workflowHarnessStarted: false,
    workflowStepsExecuted: 0,
    liveVcpToolBoxCalled: false,
    mcpToolCalled: false,
    memoryRead: false,
    memoryWritten: false,
    checkpointReceiptWritten: false,
    handoffReceiptWritten: false,
    checkpointMemoryWritten: false,
    handoffMemoryWritten: false,
    auditReceiptWritten: false,
    durableAuditWritten: false,
    durableMemoryWritten: false,
    providerApiCalled: false,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false
  };
}

module.exports = {
  ALLOWED_CHAIN_DECISIONS,
  ALLOWED_RECEIPT_FIELDS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  RECEIPT_CHAIN_CONTRACT_VERSION,
  RECEIPT_CHAIN_ZERO_COUNTER_FIELDS,
  REQUIRED_RECEIPT_CHAIN_FIELDS,
  REQUIRED_RECEIPT_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  validateVcpMemoryCodexClaudeSustainedWorkflowReceiptChainContract
};
