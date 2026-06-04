'use strict';

const { TOOL_DEFINITIONS } = require('./constants');

const TASK_ID = 'CM-1414';
const TOOL_NAME = 'audit_memory';
const SCHEMA_VERSION = 'audit-memory-readonly-tool-draft-v1';
const RESULT_STATUS_ACCEPTED = 'AUDIT_MEMORY_READONLY_TOOL_DRAFT_ACCEPTED_NOT_PUBLIC_NOT_READY';
const RESULT_STATUS_BLOCKED = 'AUDIT_MEMORY_READONLY_TOOL_DRAFT_BLOCKED_NOT_READY';

const PUBLIC_MCP_TOOL_NAMES = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory',
  'validate_memory',
  'tombstone_memory',
  'supersede_memory'
]);

const ALLOWED_AUDIT_FAMILIES = Object.freeze([
  'write',
  'recall',
  'governance',
  'all'
]);

const DISCLOSURE_FLAGS = Object.freeze([
  'tokenMaterialReturned',
  'rawMemoryReturned',
  'rawJsonlReturned',
  'rawAuditReturned',
  'rawStoreFieldsReturned',
  'filesystemPathsReturned',
  'embeddingFingerprintReturned',
  'providerPayloadReturned'
]);

const SIDE_EFFECT_FLAGS = Object.freeze([
  'readsLiveStore',
  'readsRawAudit',
  'scansBroadStore',
  'writesDurableMemory',
  'writesDurableAudit',
  'callsProvider',
  'callsPublicMcpTool',
  'changesConfigWatchdogStartup',
  'expandsPublicMcpTools',
  'claimsReadiness'
]);

const MUTATION_INPUT_KEYS = Object.freeze([
  'apply',
  'confirm',
  'delete',
  'forget',
  'mutate',
  'record_memory',
  'supersede',
  'tombstone',
  'update',
  'write'
]);

const PUBLIC_EXPOSURE_REQUIREMENTS = Object.freeze([
  'exact_public_contract_approval',
  'tools_list_registration_test',
  'low_disclosure_projection_test',
  'mutation_input_negative_controls',
  'raw_audit_store_exclusion_test',
  'readiness_claim_exclusion_test'
]);

const PUBLIC_EXPOSURE_APPROVAL_TASK_ID = 'CM-1461';

const inputSchema = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: {
    audit_family: {
      type: 'string',
      enum: ALLOWED_AUDIT_FAMILIES,
      description: 'Draft selector for future bounded audit summaries only.'
    },
    window: {
      type: 'integer',
      minimum: 1,
      maximum: 200
    },
    scope: {
      type: 'object',
      additionalProperties: false,
      properties: {
        project_id: { type: 'string', maxLength: 200 },
        workspace_id_present: { type: 'boolean' },
        client_id: { type: 'string', maxLength: 200 },
        visibility: { type: 'string', maxLength: 200 },
        task_id: { type: 'string', maxLength: 200 }
      }
    },
    include_raw: {
      type: 'boolean',
      enum: [false],
      description: 'Raw audit, raw memory, raw jsonl, token material, and filesystem paths are outside this draft.'
    }
  }
});

const draftToolDefinition = Object.freeze({
  name: TOOL_NAME,
  title: 'Audit Memory Readonly',
  description: 'Readonly bounded, low-disclosure audit summary surface registered through CM-1461 approval. It does not expose raw memory, raw audit rows, filesystem paths, provider payloads, token material, or mutation behavior.',
  inputSchema
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function publicMcpToolNames() {
  return TOOL_DEFINITIONS.map(tool => tool.name);
}

function hasExactPublicToolFreeze(names) {
  const sorted = [...names].sort();
  return sorted.length === PUBLIC_MCP_TOOL_NAMES.length &&
    sorted.every((name, index) => name === [...PUBLIC_MCP_TOOL_NAMES].sort()[index]);
}

function buildFalseFlagMap(flags) {
  return Object.fromEntries(flags.map(flag => [flag, false]));
}

function buildAuditMemoryReadonlyToolDraftReport() {
  const currentPublicTools = publicMcpToolNames();
  const publicToolsFrozen = hasExactPublicToolFreeze(currentPublicTools);
  const registeredPublicly = currentPublicTools.includes(TOOL_NAME);
  const disclosure = buildFalseFlagMap(DISCLOSURE_FLAGS);
  const sideEffects = buildFalseFlagMap(SIDE_EFFECT_FLAGS);
  const blockers = [];

  if (!publicToolsFrozen) blockers.push('public_mcp_tool_freeze_drift');
  if (!registeredPublicly) blockers.push('audit_memory_not_registered_after_cm1461_approval');

  return {
    taskId: TASK_ID,
    schemaVersion: SCHEMA_VERSION,
    status: blockers.length === 0 ? RESULT_STATUS_ACCEPTED : RESULT_STATUS_BLOCKED,
    acceptedForPlanning: blockers.length === 0,
    toolName: TOOL_NAME,
    draftOnly: false,
    publicMcpRegistered: registeredPublicly,
    publicMcpExpanded: registeredPublicly,
    publicExposureApprovalTaskId: PUBLIC_EXPOSURE_APPROVAL_TASK_ID,
    publicToolsFrozen,
    publicTools: currentPublicTools,
    draftToolDefinition,
    readonly: true,
    selectedProjection: true,
    selectedProjectionVersion: 1,
    lowDisclosure: true,
    disclosure,
    sideEffects,
    publicExposureApprovalPacket: {
      status: registeredPublicly ? 'approved_and_registered_readonly_bounded' : 'required_before_registration',
      requirements: PUBLIC_EXPOSURE_REQUIREMENTS,
      allowedPublicBehavior: 'bounded_readonly_selected_projection',
      forbiddenPublicBehavior: [
        'raw_memory_return',
        'raw_audit_return',
        'filesystem_path_return',
        'provider_payload_return',
        'durable_mutation',
        'readiness_claim'
      ]
    },
    requiresExactApprovalBeforePublicExposure: !registeredPublicly,
    readinessClaimed: false,
    rcReadyClaimed: false,
    blockerReasons: blockers
  };
}

function validateAuditMemoryReadonlyDraftInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const blockers = [];

  if (safeInput.include_raw === true) blockers.push('include_raw_not_allowed');
  if (
    Object.prototype.hasOwnProperty.call(safeInput, 'audit_family') &&
    !ALLOWED_AUDIT_FAMILIES.includes(safeInput.audit_family)
  ) {
    blockers.push('audit_family_not_allowed');
  }
  if (
    Object.prototype.hasOwnProperty.call(safeInput, 'window') &&
    (!Number.isInteger(safeInput.window) || safeInput.window < 1 || safeInput.window > 200)
  ) {
    blockers.push('window_out_of_bounds');
  }
  for (const key of MUTATION_INPUT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(safeInput, key)) {
      blockers.push('mutation_input_not_allowed');
      break;
    }
  }

  return {
    accepted: blockers.length === 0,
    blockerReasons: blockers
  };
}

module.exports = {
  ALLOWED_AUDIT_FAMILIES,
  DISCLOSURE_FLAGS,
  MUTATION_INPUT_KEYS,
  PUBLIC_EXPOSURE_REQUIREMENTS,
  PUBLIC_MCP_TOOL_NAMES,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  SCHEMA_VERSION,
  SIDE_EFFECT_FLAGS,
  TASK_ID,
  TOOL_NAME,
  buildAuditMemoryReadonlyToolDraftReport,
  draftToolDefinition,
  validateAuditMemoryReadonlyDraftInput
};
