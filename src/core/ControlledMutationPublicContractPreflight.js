'use strict';

const { TOOL_DEFINITIONS } = require('./constants');

const TASK_ID = 'CM-1468';
const SCHEMA_VERSION = 'controlled-mutation-public-contract-preflight-v1';
const STATUS_ACCEPTED = 'CONTROLLED_MUTATION_PUBLIC_CONTRACT_OPERATOR_SURFACE_READY_CM1472';

const CORE_TOOL_NAMES_FROZEN = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory',
  'prepare_memory_context',
  'propose_memory_delta',
  'validate_memory',
  'tombstone_memory',
  'supersede_memory'
]);

const PUBLIC_TOOL_NAMES_FROZEN = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory',
  'prepare_memory_context',
  'propose_memory_delta'
]);

const CANDIDATE_TOOL_NAMES = Object.freeze([
  'validate_memory',
  'tombstone_memory',
  'supersede_memory'
]);

const DISCLOSURE_FLAGS = Object.freeze([
  'rawMemoryReturned',
  'rawAuditReturned',
  'rawJsonlReturned',
  'filesystemPathsReturned',
  'tokenMaterialReturned',
  'providerPayloadReturned',
  'memoryContentReturned',
  'secretMaterialReturned'
]);

const SIDE_EFFECT_FLAGS = Object.freeze([
  'publicMcpExpanded',
  'runtimeMutationExecuted',
  'durableMemoryMutated',
  'durableAuditMutated',
  'rawStoreScanned',
  'providerCalled',
  'bearerTokenUsed',
  'readinessClaimed',
  'rcReadyClaimed'
]);

const PUBLIC_EXPOSURE_REQUIREMENTS = Object.freeze([
  'exact_public_mcp_expansion_approval',
  'tools_list_registration_test',
  'tool_call_schema_validation_tests',
  'low_disclosure_projection_tests',
  'dry_run_negative_control_tests',
  'confirm_path_exact_approval_tests',
  'raw_store_audit_exclusion_tests',
  'readiness_claim_exclusion_tests'
]);

const FORBIDDEN_PUBLIC_BEHAVIOR = Object.freeze([
  'raw_memory_return',
  'raw_audit_return',
  'raw_jsonl_return',
  'filesystem_path_return',
  'provider_payload_return',
  'token_material_return',
  'silent_overwrite',
  'unconfirmed_mutation',
  'readiness_claim'
]);

function falseFlagMap(flags) {
  return Object.fromEntries(flags.map(flag => [flag, false]));
}

function currentCoreToolNames() {
  return TOOL_DEFINITIONS.map(tool => tool.name);
}

function sorted(values) {
  return [...values].sort();
}

function publicToolsRemainFrozen(names = PUBLIC_TOOL_NAMES_FROZEN) {
  const expected = sorted(PUBLIC_TOOL_NAMES_FROZEN);
  const actual = sorted(names);
  return actual.length === expected.length && actual.every((name, index) => name === expected[index]);
}

function coreToolsRemainFrozen(names = currentCoreToolNames()) {
  const expected = sorted(CORE_TOOL_NAMES_FROZEN);
  const actual = sorted(names);
  return actual.length === expected.length && actual.every((name, index) => name === expected[index]);
}

function boundedString(maxLength = 200) {
  return { type: 'string', minLength: 1, maxLength };
}

function buildValidateMemorySchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['memory_id', 'reason', 'evidence', 'actor_client_id', 'request_source'],
    properties: {
      memory_id: boundedString(200),
      reason: boundedString(1000),
      evidence: boundedString(4000),
      actor_client_id: boundedString(200),
      request_source: boundedString(200),
      dry_run: { type: 'boolean' },
      confirm: { type: 'boolean' }
    }
  };
}

function buildTombstoneMemorySchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['memory_id', 'reason', 'evidence', 'tombstone_reason', 'actor_client_id', 'request_source'],
    properties: {
      memory_id: boundedString(200),
      reason: boundedString(1000),
      evidence: boundedString(4000),
      tombstone_reason: boundedString(1000),
      actor_client_id: boundedString(200),
      request_source: boundedString(200),
      dry_run: { type: 'boolean' },
      confirm: { type: 'boolean' }
    }
  };
}

function buildSupersedeMemorySchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'old_memory_id',
      'new_memory_id',
      'reason',
      'evidence',
      'supersedes_link',
      'superseded_by_link',
      'actor_client_id',
      'request_source'
    ],
    properties: {
      old_memory_id: boundedString(200),
      new_memory_id: boundedString(200),
      reason: boundedString(1000),
      evidence: boundedString(4000),
      supersedes_link: boundedString(200),
      superseded_by_link: boundedString(200),
      actor_client_id: boundedString(200),
      request_source: boundedString(200),
      dry_run: { type: 'boolean' },
      confirm: { type: 'boolean' }
    }
  };
}

const CANDIDATE_TOOL_DEFINITIONS = Object.freeze([
  {
    name: 'validate_memory',
    title: 'Validate Memory',
    description: 'Controlled mutation public MCP tool registered in CM-1472 for dry-run bounded validation preflights. Confirmed durable mutation requires separate exact mutation approval.',
    inputSchema: buildValidateMemorySchema()
  },
  {
    name: 'tombstone_memory',
    title: 'Tombstone Memory',
    description: 'Controlled mutation public MCP tool registered in CM-1472 for dry-run bounded tombstone preflights. Confirmed durable mutation requires separate exact mutation approval.',
    inputSchema: buildTombstoneMemorySchema()
  },
  {
    name: 'supersede_memory',
    title: 'Supersede Memory',
    description: 'Controlled mutation public MCP tool registered in CM-1472 for dry-run bounded supersede preflights. Confirmed durable mutation requires separate exact mutation approval.',
    inputSchema: buildSupersedeMemorySchema()
  }
]);

function buildControlledMutationPublicContractPreflightReport() {
  const publicTools = [...PUBLIC_TOOL_NAMES_FROZEN];
  const coreTools = currentCoreToolNames();
  const publicMcpExpanded = CANDIDATE_TOOL_NAMES.some(name => publicTools.includes(name));
  const sideEffects = falseFlagMap(SIDE_EFFECT_FLAGS);
  sideEffects.publicMcpExpanded = publicMcpExpanded;
  return {
    taskId: TASK_ID,
    schemaVersion: SCHEMA_VERSION,
    status: STATUS_ACCEPTED,
    acceptedForPlanning: true,
    candidateToolNames: CANDIDATE_TOOL_NAMES,
    candidateToolDefinitions: CANDIDATE_TOOL_DEFINITIONS,
    coreTools,
    coreToolsFrozen: coreToolsRemainFrozen(coreTools),
    publicTools,
    publicToolsFrozen: publicToolsRemainFrozen(publicTools),
    publicMcpExpanded,
    registeredPublicly: publicMcpExpanded,
    draftOnly: !publicMcpExpanded,
    lowDisclosure: true,
    selectedProjection: true,
    disclosure: falseFlagMap(DISCLOSURE_FLAGS),
    sideEffects,
    approvalRequiredBeforeRegistration: !publicMcpExpanded,
    publicExposureRequirements: PUBLIC_EXPOSURE_REQUIREMENTS,
    forbiddenPublicBehavior: FORBIDDEN_PUBLIC_BEHAVIOR,
    outputProjection: {
      returnsRawMemory: false,
      returnsRawAudit: false,
      returnsMemoryContent: false,
      returnsFilesystemPath: false,
      returnsTokenMaterial: false,
      returnsProviderPayload: false,
      allowedFields: [
        'accepted',
        'decision',
        'toolCandidate',
        'dryRun',
        'mutated',
        'fromStatus',
        'toStatus',
        'reasonCode',
        'policy',
        'approvalRequired'
      ]
    },
    readinessClaimed: false,
    rcReadyClaimed: false
  };
}

module.exports = {
  CANDIDATE_TOOL_DEFINITIONS,
  CANDIDATE_TOOL_NAMES,
  CORE_TOOL_NAMES_FROZEN,
  DISCLOSURE_FLAGS,
  FORBIDDEN_PUBLIC_BEHAVIOR,
  PUBLIC_EXPOSURE_REQUIREMENTS,
  PUBLIC_TOOL_NAMES_FROZEN,
  SCHEMA_VERSION,
  SIDE_EFFECT_FLAGS,
  STATUS_ACCEPTED,
  TASK_ID,
  buildControlledMutationPublicContractPreflightReport,
  publicToolsRemainFrozen
};
