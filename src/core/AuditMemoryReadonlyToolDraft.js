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
  'memory_overview'
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
      const: false,
      description: 'Raw audit, raw memory, raw jsonl, token material, and filesystem paths are outside this draft.'
    }
  }
});

const draftToolDefinition = Object.freeze({
  name: TOOL_NAME,
  title: 'Audit Memory Readonly Draft',
  description: 'Internal draft only. It describes a future bounded, low-disclosure audit summary surface and is not registered as a public MCP tool.',
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
  if (registeredPublicly) blockers.push('audit_memory_registered_publicly_without_approval');

  return {
    taskId: TASK_ID,
    schemaVersion: SCHEMA_VERSION,
    status: blockers.length === 0 ? RESULT_STATUS_ACCEPTED : RESULT_STATUS_BLOCKED,
    acceptedForPlanning: blockers.length === 0,
    toolName: TOOL_NAME,
    draftOnly: true,
    publicMcpRegistered: registeredPublicly,
    publicMcpExpanded: registeredPublicly,
    publicToolsFrozen,
    publicTools: currentPublicTools,
    draftToolDefinition,
    readonly: true,
    selectedProjection: true,
    selectedProjectionVersion: 1,
    lowDisclosure: true,
    disclosure,
    sideEffects,
    requiresExactApprovalBeforePublicExposure: true,
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

  return {
    accepted: blockers.length === 0,
    blockerReasons: blockers
  };
}

module.exports = {
  ALLOWED_AUDIT_FAMILIES,
  DISCLOSURE_FLAGS,
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
