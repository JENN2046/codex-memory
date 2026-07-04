'use strict';

const CONTRACT_NAME =
  'VcpMemoryExactLiveRuntimeAuthorizationRequestReadinessBlockedContract';
const CONTRACT_MODE =
  'fixture_exact_live_runtime_authorization_request_readiness_blocked_only';
const SCHEMA_VERSION = 1;
const CONTRACT_VERSION =
  'vcp_memory_exact_live_runtime_authorization_request_readiness_blocked_v1';
const READINESS_ID_PREFIX =
  'cm1902_fixture_exact_live_runtime_authorization_request_readiness_blocked_';

const ALLOWED_EVIDENCE_TYPES = Object.freeze(['fixture-only', 'schema-only']);
const ALLOWED_PROFILES = Object.freeze([
  'exact-live-runtime-authorization-request-readiness-blocked'
]);
const ALLOWED_DECISIONS = Object.freeze([
  'authorization_request_readiness_blocked_missing_exact_authorization_request_material',
  'authorization_request_readiness_incomplete',
  'stop_l4'
]);
const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'authorization_request_readiness_blocked_categories_only',
  'none'
]);
const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'cm1902_authorization_request_readiness_blocked_fixture_contract',
  'cm1903_authorization_request_readiness_blocked_fixture_closeout_gate_review'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'packet',
  'evidence',
  'blockedReadiness',
  'authorization',
  'output',
  'expectedDecision',
  'nextActionAllowed',
  'counters'
]);

const REQUIRED_PACKET_FIELDS = Object.freeze([
  'readiness_id',
  'contract_version',
  'evidence_type',
  'profile',
  'non_authorizing',
  'authorization_request_readiness_blocked_fixture_only'
]);

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'cm1898_authorization_request_boundary_preflight_present',
  'cm1899_authorization_request_boundary_fixture_contract_present',
  'cm1900_authorization_request_boundary_fixture_closeout_present',
  'cm1901_authorization_request_readiness_blocked_precondition_refresh_present',
  'validation_cmv2004_present'
]);

const REQUIRED_BLOCKED_READINESS_FIELDS = Object.freeze([
  'authorization_request_readiness_precondition_reviewed',
  'boundary_evidence_is_authorization_request_readiness',
  'fixture_closeout_is_authorization_request_readiness',
  'authorization_request_readiness_may_open',
  'authorization_request_readiness_blocked',
  'authorization_request_readiness_block_reason_declared',
  'current_green_chain_schedules_authorization_request_creation',
  'current_green_chain_schedules_authorization_request_submission',
  'current_green_chain_schedules_approval_request_packet_creation',
  'current_green_chain_schedules_approval_request_packet_submission',
  'current_green_chain_schedules_request_packet_creation',
  'current_green_chain_schedules_request_packet_rendering',
  'current_green_chain_schedules_request_packet_storage',
  'current_green_chain_schedules_request_packet_submission',
  'current_green_chain_schedules_request_body_generation',
  'current_green_chain_schedules_request_body_submission',
  'current_green_chain_schedules_approval_line_generation',
  'current_green_chain_schedules_approval_line_submission',
  'current_green_chain_schedules_true_runtime',
  'current_green_chain_schedules_true_memory_read',
  'current_green_chain_schedules_true_memory_write',
  'current_green_chain_schedules_config_startup_change',
  'authorization_gate_opened',
  'authorization_requested',
  'authorization_request_creation_allowed',
  'authorization_request_created',
  'authorization_request_ready',
  'authorization_request_submitted',
  'approval_granted',
  'dedicated_exact_approval_text_present',
  'approval_request_packet_created',
  'approval_request_packet_ready',
  'approval_request_submitted',
  'approval_packet_ready',
  'approval_request_ready',
  'approval_line_present',
  'approval_line_generated',
  'approval_line_exposed',
  'approval_line_submitted',
  'request_packet_readiness_may_open',
  'request_packet_readiness_blocked',
  'exact_request_packet_ready',
  'exact_request_packet_present',
  'request_packet_creation_allowed',
  'request_packet_rendering_allowed',
  'request_packet_storage_allowed',
  'request_packet_submission_allowed',
  'request_packet_created',
  'request_packet_rendered',
  'request_packet_stored',
  'request_packet_submitted',
  'request_assembly_allowed',
  'request_assembly_authorized',
  'assembled_request_generated',
  'concrete_exact_values_allowed',
  'live_values_bound',
  'exact_request_identity_bound',
  'exact_target_alias_bound',
  'exact_transport_family_bound',
  'exact_client_workspace_owner_aliases_bound',
  'exact_operation_family_bound',
  'exact_runtime_budget_bound',
  'exact_output_policy_bound',
  'exact_log_stdout_stderr_policy_bound',
  'exact_memory_policy_bound',
  'exact_config_policy_bound',
  'exact_provider_policy_bound',
  'exact_cleanup_policy_bound',
  'exact_receipt_path_class_bound',
  'exact_validation_command_list_bound',
  'request_body_authority_bound',
  'request_submission_authority_bound',
  'approval_line_handling_authority_bound',
  'runtime_authority_bound',
  'memory_read_authority_bound',
  'memory_write_authority_bound',
  'config_authority_bound',
  'missing_authorities_declared',
  'next_fixture_contract_allowed'
]);

const REQUIRED_AUTHORIZATION_FIELDS = Object.freeze([
  'authorization_gate_open_authorized',
  'authorization_request_creation_authorized',
  'authorization_request_submission_authorized',
  'approval_request_packet_creation_authorized',
  'approval_request_submission_authorized',
  'request_packet_creation_authorized',
  'request_packet_render_authorized',
  'request_packet_storage_authorized',
  'request_packet_submission_authorized',
  'request_assembly_authorized',
  'request_body_generation_authorized',
  'request_body_submission_authorized',
  'request_submission_authorized',
  'approval_line_generation_authorized',
  'approval_line_exposure_authorized',
  'approval_line_submission_authorized',
  'approval_granted',
  'runtime_execution_authorized',
  'memory_read_authorized',
  'memory_write_authorized',
  'durable_write_authorized',
  'provider_api_authorized',
  'config_startup_watchdog_change_authorized',
  'public_mcp_expansion_authorized',
  'release_deploy_cutover_push_authorized',
  'readiness_claim_authorized'
]);

const REQUIRED_OUTPUT_FIELDS = Object.freeze([
  'disclosure_level',
  'raw_private_output_allowed',
  'concrete_values_disclosed',
  'authorization_request_disclosed',
  'approval_request_packet_disclosed',
  'request_packet_disclosed',
  'assembled_request_disclosed',
  'request_body_disclosed',
  'approval_line_value_disclosed',
  'runtime_command_disclosed',
  'memory_payload_disclosed',
  'config_value_disclosed',
  'readiness_claim_allowed'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'authorizationRequestsCreated',
  'authorizationRequestSubmissions',
  'approvalRequestPacketsCreated',
  'approvalRequestSubmissions',
  'requestPacketsCreated',
  'requestPacketRenders',
  'requestPacketStores',
  'requestPacketSubmissions',
  'requestPreparations',
  'requestAssemblies',
  'assembledRequests',
  'requestBodiesGenerated',
  'requestSubmissions',
  'approvalLineOperations',
  'approvalGrants',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'mcpMemoryToolCalls',
  'responseBodyReads',
  'runtimeLogReads',
  'stdoutReads',
  'stderrReads',
  'configEnvReads',
  'rawPrivateReads',
  'rawStoreReads',
  'rawAuditRowReads',
  'realQueries',
  'memoryReads',
  'memoryWrites',
  'durableAuditWrites',
  'durableMemoryWrites',
  'providerApiCalls',
  'configStartupWatchdogChanges',
  'publicMcpExpansions',
  'releaseDeployCutoverPushActions',
  'readinessClaims'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'rawPayload',
  'raw_payload',
  'rawOutput',
  'raw_output',
  'rawPrivatePayload',
  'raw_private_payload',
  'requestPayload',
  'request_payload',
  'authorizationRequest',
  'authorization_request',
  'authorizationPayload',
  'authorization_payload',
  'approvalRequestPacket',
  'approval_request_packet',
  'approvalRequest',
  'approval_request',
  'requestPacket',
  'request_packet',
  'requestPacketSkeleton',
  'request_packet_skeleton',
  'skeletonArtifact',
  'skeleton_artifact',
  'requestTemplate',
  'request_template',
  'executableApprovalTemplate',
  'executable_approval_template',
  'assembledRequest',
  'assembled_request',
  'requestObject',
  'request_object',
  'approvalPayload',
  'approval_payload',
  'debugPayload',
  'debug_payload',
  'secret',
  'secrets',
  'credential',
  'credentials',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'privateKey',
  'endpoint',
  'runtimeEndpoint',
  'runtimeTarget',
  'targetValue',
  'transportValue',
  'operationValue',
  'workspaceId',
  'ownerId',
  'clientId',
  'exactTarget',
  'exactTransport',
  'exactWorkspace',
  'exactOwner',
  'exactClient',
  'exactOperation',
  'exactRequestIdentity',
  'budgetValue',
  'rawPath',
  'configEnvPath',
  'requestBody',
  'request_body',
  'approvalLine',
  'approvalLineValue',
  'approval_line_value',
  'runtimeCommand',
  'memoryQuery',
  'memoryWritePayload',
  'providerPayload',
  'configChange',
  'startupChange',
  'watchdogChange',
  'rawAuditRow',
  'rawSqliteRow',
  'rawJsonlRow',
  'rawStoreRow',
  'rawMemory',
  'rawDailyNote',
  'rawDailyNoteContent',
  'productionReady',
  'releaseReady',
  'cutoverReady',
  'rcReady',
  'RC_READY',
  'completeV8',
  'fullBridgeCompletion'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value, field) {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFixtureIdentifier(value, prefix) {
  if (!isNonEmptyString(value) || !value.startsWith(prefix)) return false;
  return /^[a-z0-9][a-z0-9_.-]{0,63}$/.test(value.slice(prefix.length));
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

function missingFields(required, value, prefix = '') {
  const actual = isPlainObject(value) ? value : {};
  return required
    .filter(field => !hasOwn(actual, field))
    .map(field => (prefix ? `${prefix}.${field}` : field));
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

function collectUnexpectedKeys(value, allowedFields, prefix = '') {
  if (!isPlainObject(value)) return [];
  return Object.keys(value)
    .filter(key => !allowedFields.includes(key))
    .map(key => pathJoin(prefix, key));
}

function collectUnexpectedFields(input) {
  if (!isPlainObject(input)) return [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.packet, REQUIRED_PACKET_FIELDS, 'packet'),
    ...collectUnexpectedKeys(input.evidence, REQUIRED_EVIDENCE_FIELDS, 'evidence'),
    ...collectUnexpectedKeys(
      input.blockedReadiness,
      REQUIRED_BLOCKED_READINESS_FIELDS,
      'blockedReadiness'
    ),
    ...collectUnexpectedKeys(input.authorization, REQUIRED_AUTHORIZATION_FIELDS, 'authorization'),
    ...collectUnexpectedKeys(input.output, REQUIRED_OUTPUT_FIELDS, 'output'),
    ...collectUnexpectedKeys(input.counters, ZERO_COUNTER_FIELDS, 'counters')
  ];
}

function collectPositiveCounters(counters) {
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS;
  return ZERO_COUNTER_FIELDS.filter(field => Number(counters[field] || 0) > 0);
}

function safeExpectedDecision(input) {
  return isPlainObject(input) && ALLOWED_DECISIONS.includes(input.expectedDecision)
    ? input.expectedDecision
    : null;
}

function safeReadinessId(input) {
  const readinessId = isPlainObject(input?.packet) ? input.packet.readiness_id : null;
  return isFixtureIdentifier(readinessId, READINESS_ID_PREFIX) ? readinessId : null;
}

function lowDisclosureProjection(input) {
  const evidence = isPlainObject(input) ? input.evidence : null;
  const readiness = isPlainObject(input) ? input.blockedReadiness : null;
  return {
    expectedDecision: safeExpectedDecision(input),
    readinessId: safeReadinessId(input),
    cm1901AuthorizationRequestReadinessBlockedPreconditionRefreshPresent: isPlainObject(evidence)
      ? evidence.cm1901_authorization_request_readiness_blocked_precondition_refresh_present === true
      : false,
    authorizationRequestReadinessPreconditionReviewed: isPlainObject(readiness)
      ? readiness.authorization_request_readiness_precondition_reviewed === true
      : false,
    authorizationRequestReadinessBlocked: isPlainObject(readiness)
      ? readiness.authorization_request_readiness_blocked === true
      : false,
    authorizationRequestReadinessMayOpen: isPlainObject(readiness)
      ? readiness.authorization_request_readiness_may_open === true
      : false,
    authorizationRequestCreated: isPlainObject(readiness)
      ? readiness.authorization_request_created === true
      : false
  };
}

function sideEffectPosture(computedDecision = null) {
  return {
    authorizationRequestReadinessBlockedFixtureAccepted:
      computedDecision ===
      'authorization_request_readiness_blocked_missing_exact_authorization_request_material',
    authorizationRequestReadinessMayOpen: false,
    authorizationRequestReadinessBlocked: true,
    boundaryEvidenceIsAuthorizationRequestReadiness: false,
    fixtureCloseoutIsAuthorizationRequestReadiness: false,
    authorizationGateOpened: false,
    authorizationRequested: false,
    authorizationRequestCreated: false,
    authorizationRequestReady: false,
    authorizationRequestSubmitted: false,
    approvalRequestPacketCreated: false,
    approvalRequestReady: false,
    approvalRequestSubmitted: false,
    requestPacketReadinessMayOpen: false,
    requestPacketReadinessBlocked: true,
    exactRequestPacketReady: false,
    exactRequestPacketPresent: false,
    requestPacketCreationAllowed: false,
    requestPacketCreated: false,
    requestPacketRendered: false,
    requestPacketStored: false,
    requestPacketSubmitted: false,
    requestAssemblyAllowed: false,
    assembledRequestGenerated: false,
    liveValuesBound: false,
    requestBodyGenerated: false,
    requestSubmitted: false,
    approvalLineGenerated: false,
    approvalLineExposed: false,
    approvalLineSubmitted: false,
    approvalGranted: false,
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    mcpMemoryToolCalled: false,
    responseBodyRead: false,
    runtimeLogRead: false,
    stdoutRead: false,
    stderrRead: false,
    configEnvRead: false,
    realQueryPerformed: false,
    memoryRead: false,
    memoryWritten: false,
    durableAuditWritePerformed: false,
    durableMemoryWritePerformed: false,
    providerApiCalled: false,
    configStartupWatchdogChanged: false,
    publicMcpExpanded: false,
    releaseDeployCutoverPushPerformed: false,
    readinessClaimAllowed: false
  };
}

function rejected(reasonCode, input, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: details.missingFields || [],
    forbiddenFields: details.forbiddenFields || [],
    unexpectedFields: details.unexpectedFields || [],
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    computedDecision: details.computedDecision || null,
    expectedDecision: safeExpectedDecision(input),
    nextAction: 'fix_fixture_or_stop',
    ...sideEffectPosture(details.computedDecision || null)
  };
}

function validateBooleanFields(value, requiredFields, prefix) {
  const invalid = [];
  for (const field of requiredFields) {
    if (typeof value[field] !== 'boolean') invalid.push(`${prefix}.${field}`);
  }
  return invalid;
}

function validateShape(input) {
  const invalid = [];

  if (input.schemaVersion !== SCHEMA_VERSION) invalid.push('schemaVersion');
  if (!isFixtureIdentifier(input.packet.readiness_id, READINESS_ID_PREFIX)) {
    invalid.push('packet.readiness_id');
  }
  if (input.packet.contract_version !== CONTRACT_VERSION) invalid.push('packet.contract_version');
  if (!ALLOWED_EVIDENCE_TYPES.includes(input.packet.evidence_type)) {
    invalid.push('packet.evidence_type');
  }
  if (!ALLOWED_PROFILES.includes(input.packet.profile)) invalid.push('packet.profile');
  if (input.packet.non_authorizing !== true) invalid.push('packet.non_authorizing');
  if (input.packet.authorization_request_readiness_blocked_fixture_only !== true) {
    invalid.push('packet.authorization_request_readiness_blocked_fixture_only');
  }
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (!ALLOWED_NEXT_ACTIONS.includes(input.nextActionAllowed)) invalid.push('nextActionAllowed');
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(input.output.disclosure_level)) {
    invalid.push('output.disclosure_level');
  }

  invalid.push(...validateBooleanFields(input.evidence, REQUIRED_EVIDENCE_FIELDS, 'evidence'));
  invalid.push(...validateBooleanFields(
    input.blockedReadiness,
    REQUIRED_BLOCKED_READINESS_FIELDS,
    'blockedReadiness'
  ));
  invalid.push(...validateBooleanFields(input.authorization, REQUIRED_AUTHORIZATION_FIELDS, 'authorization'));
  invalid.push(...validateBooleanFields(
    input.output,
    REQUIRED_OUTPUT_FIELDS.filter(field => field !== 'disclosure_level'),
    'output'
  ));

  for (const field of ZERO_COUNTER_FIELDS) {
    if (input.counters[field] !== 0) invalid.push(`counters.${field}`);
  }

  return invalid;
}

function hasL4Stop(input) {
  const readiness = input.blockedReadiness;
  const authorization = input.authorization;
  const output = input.output;

  return (
    readiness.boundary_evidence_is_authorization_request_readiness ||
    readiness.fixture_closeout_is_authorization_request_readiness ||
    readiness.authorization_request_readiness_may_open ||
    !readiness.authorization_request_readiness_blocked ||
    readiness.current_green_chain_schedules_authorization_request_creation ||
    readiness.current_green_chain_schedules_authorization_request_submission ||
    readiness.current_green_chain_schedules_approval_request_packet_creation ||
    readiness.current_green_chain_schedules_approval_request_packet_submission ||
    readiness.current_green_chain_schedules_request_packet_creation ||
    readiness.current_green_chain_schedules_request_packet_rendering ||
    readiness.current_green_chain_schedules_request_packet_storage ||
    readiness.current_green_chain_schedules_request_packet_submission ||
    readiness.current_green_chain_schedules_request_body_generation ||
    readiness.current_green_chain_schedules_request_body_submission ||
    readiness.current_green_chain_schedules_approval_line_generation ||
    readiness.current_green_chain_schedules_approval_line_submission ||
    readiness.current_green_chain_schedules_true_runtime ||
    readiness.current_green_chain_schedules_true_memory_read ||
    readiness.current_green_chain_schedules_true_memory_write ||
    readiness.current_green_chain_schedules_config_startup_change ||
    readiness.authorization_gate_opened ||
    readiness.authorization_requested ||
    readiness.authorization_request_creation_allowed ||
    readiness.authorization_request_created ||
    readiness.authorization_request_ready ||
    readiness.authorization_request_submitted ||
    readiness.approval_granted ||
    readiness.dedicated_exact_approval_text_present ||
    readiness.approval_request_packet_created ||
    readiness.approval_request_packet_ready ||
    readiness.approval_request_submitted ||
    readiness.approval_packet_ready ||
    readiness.approval_request_ready ||
    readiness.approval_line_present ||
    readiness.approval_line_generated ||
    readiness.approval_line_exposed ||
    readiness.approval_line_submitted ||
    readiness.request_packet_readiness_may_open ||
    !readiness.request_packet_readiness_blocked ||
    readiness.exact_request_packet_ready ||
    readiness.exact_request_packet_present ||
    readiness.request_packet_creation_allowed ||
    readiness.request_packet_rendering_allowed ||
    readiness.request_packet_storage_allowed ||
    readiness.request_packet_submission_allowed ||
    readiness.request_packet_created ||
    readiness.request_packet_rendered ||
    readiness.request_packet_stored ||
    readiness.request_packet_submitted ||
    readiness.request_assembly_allowed ||
    readiness.request_assembly_authorized ||
    readiness.assembled_request_generated ||
    readiness.concrete_exact_values_allowed ||
    readiness.live_values_bound ||
    readiness.exact_request_identity_bound ||
    readiness.exact_target_alias_bound ||
    readiness.exact_transport_family_bound ||
    readiness.exact_client_workspace_owner_aliases_bound ||
    readiness.exact_operation_family_bound ||
    readiness.exact_runtime_budget_bound ||
    readiness.exact_output_policy_bound ||
    readiness.exact_log_stdout_stderr_policy_bound ||
    readiness.exact_memory_policy_bound ||
    readiness.exact_config_policy_bound ||
    readiness.exact_provider_policy_bound ||
    readiness.exact_cleanup_policy_bound ||
    readiness.exact_receipt_path_class_bound ||
    readiness.exact_validation_command_list_bound ||
    readiness.request_body_authority_bound ||
    readiness.request_submission_authority_bound ||
    readiness.approval_line_handling_authority_bound ||
    readiness.runtime_authority_bound ||
    readiness.memory_read_authority_bound ||
    readiness.memory_write_authority_bound ||
    readiness.config_authority_bound ||
    Object.values(authorization).some(value => value === true) ||
    output.raw_private_output_allowed ||
    output.concrete_values_disclosed ||
    output.authorization_request_disclosed ||
    output.approval_request_packet_disclosed ||
    output.request_packet_disclosed ||
    output.assembled_request_disclosed ||
    output.request_body_disclosed ||
    output.approval_line_value_disclosed ||
    output.runtime_command_disclosed ||
    output.memory_payload_disclosed ||
    output.config_value_disclosed ||
    output.readiness_claim_allowed
  );
}

function isEvidenceComplete(evidence) {
  return REQUIRED_EVIDENCE_FIELDS.every(field => evidence[field] === true);
}

function isBlockedReadinessComplete(blockedReadiness) {
  return (
    blockedReadiness.authorization_request_readiness_precondition_reviewed === true &&
    blockedReadiness.authorization_request_readiness_blocked === true &&
    blockedReadiness.authorization_request_readiness_block_reason_declared === true &&
    blockedReadiness.missing_authorities_declared === true &&
    blockedReadiness.next_fixture_contract_allowed === true &&
    !hasL4Stop({
      blockedReadiness,
      authorization: Object.fromEntries(REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, false])),
      output: {
        raw_private_output_allowed: false,
        concrete_values_disclosed: false,
        authorization_request_disclosed: false,
        approval_request_packet_disclosed: false,
        request_packet_disclosed: false,
        assembled_request_disclosed: false,
        request_body_disclosed: false,
        approval_line_value_disclosed: false,
        runtime_command_disclosed: false,
        memory_payload_disclosed: false,
        config_value_disclosed: false,
        readiness_claim_allowed: false
      }
    })
  );
}

function computeDecision(input) {
  if (hasL4Stop(input)) return 'stop_l4';
  if (!isEvidenceComplete(input.evidence)) return 'authorization_request_readiness_incomplete';
  if (!isBlockedReadinessComplete(input.blockedReadiness)) {
    return 'authorization_request_readiness_incomplete';
  }
  return 'authorization_request_readiness_blocked_missing_exact_authorization_request_material';
}

function validateVcpMemoryExactLiveRuntimeAuthorizationRequestReadinessBlockedContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PACKET_FIELDS, input.packet, 'packet'),
    ...missingFields(REQUIRED_EVIDENCE_FIELDS, input.evidence, 'evidence'),
    ...missingFields(REQUIRED_BLOCKED_READINESS_FIELDS, input.blockedReadiness, 'blockedReadiness'),
    ...missingFields(REQUIRED_AUTHORIZATION_FIELDS, input.authorization, 'authorization'),
    ...missingFields(REQUIRED_OUTPUT_FIELDS, input.output, 'output'),
    ...(hasOwn(input, 'counters') ? missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters') : [])
  ];
  if (missing.length > 0) return rejected('missing_required_fields', input, { missingFields: missing });

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_exact_value_request_approval_or_overclaim_fields', input, {
      forbiddenFields
    });
  }

  const unexpectedFields = collectUnexpectedFields(input);
  if (unexpectedFields.length > 0) {
    return rejected('unexpected_fields', input, { unexpectedFields });
  }

  const forbiddenCounters = collectPositiveCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_positive_side_effect_counters', input, { forbiddenCounters });
  }

  const invalidFields = validateShape(input);
  if (invalidFields.length > 0) {
    return rejected(
      'invalid_exact_live_runtime_authorization_request_readiness_blocked_contract',
      input,
      { invalidFields }
    );
  }

  const computedDecision = computeDecision(input);
  if (input.expectedDecision !== computedDecision) {
    return rejected('decision_mismatch', input, {
      computedDecision,
      invalidFields: ['expectedDecision']
    });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    contractVersion: CONTRACT_VERSION,
    readinessId: input.packet.readiness_id,
    profile: input.packet.profile,
    decision: computedDecision,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unexpectedFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'authorization_request_readiness_blocked_validated_no_authority',
    ...sideEffectPosture(computedDecision)
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_DISCLOSURE_LEVELS,
  ALLOWED_EVIDENCE_TYPES,
  ALLOWED_NEXT_ACTIONS,
  ALLOWED_PROFILES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  CONTRACT_VERSION,
  FORBIDDEN_FIELD_NAMES,
  READINESS_ID_PREFIX,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_BLOCKED_READINESS_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_PACKET_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryExactLiveRuntimeAuthorizationRequestReadinessBlockedContract
};
