'use strict';

const CONTRACT_NAME =
  'VcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract';
const CONTRACT_MODE =
  'fixture_exact_live_runtime_authorization_request_exact_material_boundary_only';
const SCHEMA_VERSION = 1;
const CONTRACT_VERSION =
  'vcp_memory_exact_live_runtime_authorization_request_exact_material_boundary_v1';
const MATERIAL_BOUNDARY_ID_PREFIX =
  'cm1905_fixture_exact_live_runtime_authorization_request_exact_material_boundary_';

const ALLOWED_EVIDENCE_TYPES = Object.freeze(['fixture-only', 'schema-only']);
const ALLOWED_PROFILES = Object.freeze([
  'exact-live-runtime-authorization-request-exact-material-boundary'
]);
const ALLOWED_DECISIONS = Object.freeze([
  'exact_material_boundary_accepted_categories_only_no_values',
  'exact_material_boundary_incomplete',
  'stop_l4'
]);
const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'exact_material_boundary_categories_only',
  'none'
]);
const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'cm1905_exact_material_boundary_fixture_contract',
  'cm1906_exact_material_boundary_fixture_closeout_gate_review'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'packet',
  'evidence',
  'materialBoundary',
  'materialFamilies',
  'authorization',
  'output',
  'expectedDecision',
  'nextActionAllowed',
  'counters'
]);

const REQUIRED_PACKET_FIELDS = Object.freeze([
  'material_boundary_id',
  'contract_version',
  'evidence_type',
  'profile',
  'non_authorizing',
  'exact_material_categories_only',
  'concrete_values_absent'
]);

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'cm1901_readiness_blocked_precondition_refresh_present',
  'cm1902_readiness_blocked_fixture_contract_present',
  'cm1903_readiness_blocked_fixture_closeout_present',
  'cm1904_exact_material_boundary_preflight_present',
  'validation_cmv2007_present'
]);

const REQUIRED_MATERIAL_BOUNDARY_FIELDS = Object.freeze([
  'cm1904_preflight_reviewed',
  'exact_material_families_defined',
  'exact_material_values_bound',
  'request_identity_value_bound',
  'target_alias_value_bound',
  'transport_endpoint_value_bound',
  'principal_tuple_value_bound',
  'operation_payload_value_bound',
  'runtime_budget_value_bound',
  'output_policy_value_bound',
  'memory_policy_value_bound',
  'config_policy_value_bound',
  'provider_policy_value_bound',
  'cleanup_policy_value_bound',
  'receipt_path_value_bound',
  'validation_command_values_bound',
  'abort_condition_values_bound',
  'authorization_gate_opened',
  'authorization_requested',
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
  'request_packet_created',
  'request_packet_rendered',
  'request_packet_stored',
  'request_packet_submitted',
  'request_assembly_allowed',
  'request_assembly_authorized',
  'assembled_request_generated',
  'concrete_exact_values_allowed',
  'live_values_bound',
  'request_body_generated',
  'request_body_submitted',
  'runtime_execution_authorized',
  'runtime_executed',
  'vcp_toolbox_runtime_called',
  'mcp_memory_tool_called',
  'response_body_read',
  'runtime_log_read',
  'stdout_read',
  'stderr_read',
  'config_env_content_read',
  'secrets_read',
  'private_runtime_read_performed',
  'raw_store_read_performed',
  'raw_audit_row_read_performed',
  'real_query_performed',
  'provider_api_called_by_agent',
  'memory_read_performed_by_agent',
  'memory_write_performed',
  'durable_audit_write_performed',
  'durable_memory_write_performed',
  'config_changed',
  'startup_changed',
  'watchdog_changed',
  'public_mcp_expansion_performed',
  'push_performed',
  'tag_performed',
  'release_performed',
  'deploy_performed',
  'cutover_performed',
  'readiness_claimed',
  'rc_ready_claimed',
  'release_ready_claimed',
  'production_ready_claimed',
  'cutover_ready_claimed',
  'complete_v8_claimed',
  'full_bridge_completion_claimed',
  'next_gate_may_open_live',
  'missing_authorities_declared',
  'future_fixture_closeout_allowed'
]);

const REQUIRED_MATERIAL_FAMILY_FIELDS = Object.freeze([
  'request_identity_family_declared',
  'target_alias_family_declared',
  'transport_family_declared',
  'principal_tuple_family_declared',
  'operation_family_declared',
  'runtime_budget_family_declared',
  'output_policy_family_declared',
  'memory_policy_family_declared',
  'config_policy_family_declared',
  'provider_policy_family_declared',
  'cleanup_policy_family_declared',
  'receipt_path_class_family_declared',
  'validation_command_class_family_declared',
  'abort_condition_family_declared'
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
  'concreteExactValueBindings',
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
  'requestIdentityValue',
  'targetAliasValue',
  'transportEndpointValue',
  'principalTupleValue',
  'operationPayloadValue',
  'runtimeBudgetValue',
  'outputPolicyValue',
  'memoryPolicyValue',
  'configPolicyValue',
  'providerPolicyValue',
  'cleanupPolicyValue',
  'receiptPathValue',
  'validationCommandValue',
  'abortConditionValue',
  'exactMaterialValues',
  'concreteExactValues',
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
      input.materialBoundary,
      REQUIRED_MATERIAL_BOUNDARY_FIELDS,
      'materialBoundary'
    ),
    ...collectUnexpectedKeys(
      input.materialFamilies,
      REQUIRED_MATERIAL_FAMILY_FIELDS,
      'materialFamilies'
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

function safeMaterialBoundaryId(input) {
  const boundaryId = isPlainObject(input?.packet) ? input.packet.material_boundary_id : null;
  return isFixtureIdentifier(boundaryId, MATERIAL_BOUNDARY_ID_PREFIX) ? boundaryId : null;
}

function lowDisclosureProjection(input) {
  const evidence = isPlainObject(input) ? input.evidence : null;
  const materialBoundary = isPlainObject(input) ? input.materialBoundary : null;
  return {
    expectedDecision: safeExpectedDecision(input),
    materialBoundaryId: safeMaterialBoundaryId(input),
    cm1904ExactMaterialBoundaryPreflightPresent: isPlainObject(evidence)
      ? evidence.cm1904_exact_material_boundary_preflight_present === true
      : false,
    cm1904PreflightReviewed: isPlainObject(materialBoundary)
      ? materialBoundary.cm1904_preflight_reviewed === true
      : false,
    exactMaterialFamiliesDefined: isPlainObject(materialBoundary)
      ? materialBoundary.exact_material_families_defined === true
      : false,
    exactMaterialValuesBound: isPlainObject(materialBoundary)
      ? materialBoundary.exact_material_values_bound === true
      : false,
    authorizationRequestCreated: isPlainObject(materialBoundary)
      ? materialBoundary.authorization_request_created === true
      : false,
    requestPacketCreated: isPlainObject(materialBoundary)
      ? materialBoundary.request_packet_created === true
      : false
  };
}

function sideEffectPosture(computedDecision = null) {
  return {
    exactMaterialBoundaryAccepted:
      computedDecision === 'exact_material_boundary_accepted_categories_only_no_values',
    nonAuthorizingCategoryBoundaryOnly: true,
    exactMaterialFamiliesDefined:
      computedDecision === 'exact_material_boundary_accepted_categories_only_no_values',
    exactMaterialValuesBound: false,
    concreteExactValuesBound: false,
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
  if (!isFixtureIdentifier(input.packet.material_boundary_id, MATERIAL_BOUNDARY_ID_PREFIX)) {
    invalid.push('packet.material_boundary_id');
  }
  if (input.packet.contract_version !== CONTRACT_VERSION) invalid.push('packet.contract_version');
  if (!ALLOWED_EVIDENCE_TYPES.includes(input.packet.evidence_type)) {
    invalid.push('packet.evidence_type');
  }
  if (!ALLOWED_PROFILES.includes(input.packet.profile)) invalid.push('packet.profile');
  if (input.packet.non_authorizing !== true) invalid.push('packet.non_authorizing');
  if (input.packet.exact_material_categories_only !== true) {
    invalid.push('packet.exact_material_categories_only');
  }
  if (input.packet.concrete_values_absent !== true) {
    invalid.push('packet.concrete_values_absent');
  }
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (!ALLOWED_NEXT_ACTIONS.includes(input.nextActionAllowed)) invalid.push('nextActionAllowed');
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(input.output.disclosure_level)) {
    invalid.push('output.disclosure_level');
  }

  invalid.push(...validateBooleanFields(input.evidence, REQUIRED_EVIDENCE_FIELDS, 'evidence'));
  invalid.push(...validateBooleanFields(
    input.materialBoundary,
    REQUIRED_MATERIAL_BOUNDARY_FIELDS,
    'materialBoundary'
  ));
  invalid.push(...validateBooleanFields(
    input.materialFamilies,
    REQUIRED_MATERIAL_FAMILY_FIELDS,
    'materialFamilies'
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
  const materialBoundary = input.materialBoundary;
  const authorization = input.authorization;
  const output = input.output;

  return (
    materialBoundary.exact_material_values_bound ||
    materialBoundary.request_identity_value_bound ||
    materialBoundary.target_alias_value_bound ||
    materialBoundary.transport_endpoint_value_bound ||
    materialBoundary.principal_tuple_value_bound ||
    materialBoundary.operation_payload_value_bound ||
    materialBoundary.runtime_budget_value_bound ||
    materialBoundary.output_policy_value_bound ||
    materialBoundary.memory_policy_value_bound ||
    materialBoundary.config_policy_value_bound ||
    materialBoundary.provider_policy_value_bound ||
    materialBoundary.cleanup_policy_value_bound ||
    materialBoundary.receipt_path_value_bound ||
    materialBoundary.validation_command_values_bound ||
    materialBoundary.abort_condition_values_bound ||
    materialBoundary.authorization_gate_opened ||
    materialBoundary.authorization_requested ||
    materialBoundary.authorization_request_created ||
    materialBoundary.authorization_request_ready ||
    materialBoundary.authorization_request_submitted ||
    materialBoundary.approval_granted ||
    materialBoundary.dedicated_exact_approval_text_present ||
    materialBoundary.approval_request_packet_created ||
    materialBoundary.approval_request_packet_ready ||
    materialBoundary.approval_request_submitted ||
    materialBoundary.approval_packet_ready ||
    materialBoundary.approval_request_ready ||
    materialBoundary.approval_line_present ||
    materialBoundary.approval_line_generated ||
    materialBoundary.approval_line_exposed ||
    materialBoundary.approval_line_submitted ||
    materialBoundary.request_packet_readiness_may_open ||
    !materialBoundary.request_packet_readiness_blocked ||
    materialBoundary.exact_request_packet_ready ||
    materialBoundary.exact_request_packet_present ||
    materialBoundary.request_packet_created ||
    materialBoundary.request_packet_rendered ||
    materialBoundary.request_packet_stored ||
    materialBoundary.request_packet_submitted ||
    materialBoundary.request_assembly_allowed ||
    materialBoundary.request_assembly_authorized ||
    materialBoundary.assembled_request_generated ||
    materialBoundary.concrete_exact_values_allowed ||
    materialBoundary.live_values_bound ||
    materialBoundary.request_body_generated ||
    materialBoundary.request_body_submitted ||
    materialBoundary.runtime_execution_authorized ||
    materialBoundary.runtime_executed ||
    materialBoundary.vcp_toolbox_runtime_called ||
    materialBoundary.mcp_memory_tool_called ||
    materialBoundary.response_body_read ||
    materialBoundary.runtime_log_read ||
    materialBoundary.stdout_read ||
    materialBoundary.stderr_read ||
    materialBoundary.config_env_content_read ||
    materialBoundary.secrets_read ||
    materialBoundary.private_runtime_read_performed ||
    materialBoundary.raw_store_read_performed ||
    materialBoundary.raw_audit_row_read_performed ||
    materialBoundary.real_query_performed ||
    materialBoundary.provider_api_called_by_agent ||
    materialBoundary.memory_read_performed_by_agent ||
    materialBoundary.memory_write_performed ||
    materialBoundary.durable_audit_write_performed ||
    materialBoundary.durable_memory_write_performed ||
    materialBoundary.config_changed ||
    materialBoundary.startup_changed ||
    materialBoundary.watchdog_changed ||
    materialBoundary.public_mcp_expansion_performed ||
    materialBoundary.push_performed ||
    materialBoundary.tag_performed ||
    materialBoundary.release_performed ||
    materialBoundary.deploy_performed ||
    materialBoundary.cutover_performed ||
    materialBoundary.readiness_claimed ||
    materialBoundary.rc_ready_claimed ||
    materialBoundary.release_ready_claimed ||
    materialBoundary.production_ready_claimed ||
    materialBoundary.cutover_ready_claimed ||
    materialBoundary.complete_v8_claimed ||
    materialBoundary.full_bridge_completion_claimed ||
    materialBoundary.next_gate_may_open_live ||
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

function isMaterialFamiliesComplete(materialFamilies) {
  return REQUIRED_MATERIAL_FAMILY_FIELDS.every(field => materialFamilies[field] === true);
}

function isMaterialBoundaryComplete(materialBoundary) {
  return (
    materialBoundary.cm1904_preflight_reviewed === true &&
    materialBoundary.exact_material_families_defined === true &&
    materialBoundary.exact_material_values_bound === false &&
    materialBoundary.missing_authorities_declared === true &&
    materialBoundary.future_fixture_closeout_allowed === true &&
    !hasL4Stop({
      materialBoundary,
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
  if (!isEvidenceComplete(input.evidence)) return 'exact_material_boundary_incomplete';
  if (!isMaterialFamiliesComplete(input.materialFamilies)) {
    return 'exact_material_boundary_incomplete';
  }
  if (!isMaterialBoundaryComplete(input.materialBoundary)) {
    return 'exact_material_boundary_incomplete';
  }
  return 'exact_material_boundary_accepted_categories_only_no_values';
}

function validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PACKET_FIELDS, input.packet, 'packet'),
    ...missingFields(REQUIRED_EVIDENCE_FIELDS, input.evidence, 'evidence'),
    ...missingFields(REQUIRED_MATERIAL_BOUNDARY_FIELDS, input.materialBoundary, 'materialBoundary'),
    ...missingFields(REQUIRED_MATERIAL_FAMILY_FIELDS, input.materialFamilies, 'materialFamilies'),
    ...missingFields(REQUIRED_AUTHORIZATION_FIELDS, input.authorization, 'authorization'),
    ...missingFields(REQUIRED_OUTPUT_FIELDS, input.output, 'output'),
    ...(hasOwn(input, 'counters') ? missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters') : [])
  ];
  if (missing.length > 0) return rejected('missing_required_fields', input, { missingFields: missing });

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_exact_material_request_approval_or_overclaim_fields', input, {
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
      'invalid_exact_live_runtime_authorization_request_exact_material_boundary_contract',
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
    materialBoundaryId: input.packet.material_boundary_id,
    profile: input.packet.profile,
    decision: computedDecision,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unexpectedFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'exact_material_boundary_validated_no_values_no_authority',
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
  MATERIAL_BOUNDARY_ID_PREFIX,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_MATERIAL_BOUNDARY_FIELDS,
  REQUIRED_MATERIAL_FAMILY_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_PACKET_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract
};
