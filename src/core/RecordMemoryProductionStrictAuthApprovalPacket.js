'use strict';

const OBSERVE_APPROVAL_TOKEN = 'APPROVE_RECORD_MEMORY_PRODUCTION_OBSERVE_ONLY_ROLLOUT_CM1664';
const STRICT_APPROVAL_TOKEN = 'APPROVE_RECORD_MEMORY_PRODUCTION_STRICT_AUTH_ROLLOUT_CM1664';

const REQUIRED_FIELDS = Object.freeze([
  'task_id',
  'approval_token',
  'target_commit',
  'target_runtime_surface',
  'target_mode',
  'trusted_context_source',
  'policy_source',
  'rollback_mode',
  'rollback_owner',
  'max_runtime_probe_minutes',
  'allowed_validation_commands',
  'production_identifiers_sanitized_in_evidence',
  'secret_values_print_allowed',
  'raw_memory_scan_allowed',
  'provider_api_allowed',
  'public_mcp_expansion_allowed',
  'startup_watchdog_change_allowed',
  'push_release_deploy_cutover_allowed'
]);

const ALLOWED_RUNTIME_SURFACES = Object.freeze([
  'http_mcp',
  'stdio_mcp',
  'http_mcp_and_stdio_mcp'
]);

const ALLOWED_CONTEXT_SOURCES = Object.freeze([
  'env',
  'operator_profile',
  'trusted_server_context'
]);

const REQUIRED_VALIDATION_COMMANDS = Object.freeze([
  'git status --short --branch',
  'npm run gate:mainline',
  'node --test tests\\mcp-http.test.js',
  'node --test tests\\record-memory-strict-auth-stdio-runtime-candidate.test.js',
  'node --test tests\\record-memory-principal-scope-authorization-config.test.js tests\\record-memory-principal-scope-observe-only-integration.test.js'
]);

const FORBIDDEN_TRUE_FLAGS = Object.freeze([
  'secret_values_print_allowed',
  'raw_memory_scan_allowed',
  'provider_api_allowed',
  'public_mcp_expansion_allowed',
  'startup_watchdog_change_allowed',
  'push_release_deploy_cutover_allowed'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function makeRejected(reasonCode, details = {}) {
  return {
    accepted: false,
    scope: 'record_memory_production_strict_auth_approval_packet',
    mode: 'fixture_only',
    reasonCode,
    missingFields: details.missingFields || [],
    invalidFields: details.invalidFields || [],
    missingValidationCommands: details.missingValidationCommands || [],
    approvalTokenAccepted: false,
    rolloutAuthorized: false,
    strictAuthorized: false,
    observeOnlyAuthorized: false,
    lowDisclosure: true,
    secretValuesPrinted: false,
    providerApiAllowed: false,
    rawMemoryScanAllowed: false,
    publicMcpExpansionAllowed: false,
    startupWatchdogChangeAllowed: false,
    pushReleaseDeployCutoverAllowed: false,
    runtimeWiringChanged: false,
    productionStrictEnabled: false,
    nextAllowedStep: 'fix_packet_or_stop'
  };
}

function validateRecordMemoryProductionStrictAuthApprovalPacket(packet = {}, {
  expectedTargetCommit,
  now
} = {}) {
  if (!isPlainObject(packet)) {
    return makeRejected('approval_packet_not_plain_object');
  }

  const missingFields = REQUIRED_FIELDS.filter(field => !(field in packet));
  if (missingFields.length > 0) {
    return makeRejected('missing_required_fields', { missingFields });
  }

  const invalidFields = [];
  const approvalToken = normalizeString(packet.approval_token);
  const targetMode = normalizeString(packet.target_mode);

  if (!/^[0-9a-f]{40}$/i.test(normalizeString(packet.target_commit))) {
    invalidFields.push('target_commit');
  }
  if (
    expectedTargetCommit &&
    normalizeString(packet.target_commit).toLowerCase() !== normalizeString(expectedTargetCommit).toLowerCase()
  ) {
    invalidFields.push('target_commit');
  }

  if (!ALLOWED_RUNTIME_SURFACES.includes(normalizeString(packet.target_runtime_surface))) {
    invalidFields.push('target_runtime_surface');
  }

  if (!['observe', 'strict'].includes(targetMode)) {
    invalidFields.push('target_mode');
  }

  if (!ALLOWED_CONTEXT_SOURCES.includes(normalizeString(packet.trusted_context_source))) {
    invalidFields.push('trusted_context_source');
  }

  if (!ALLOWED_CONTEXT_SOURCES.includes(normalizeString(packet.policy_source))) {
    invalidFields.push('policy_source');
  }

  if (normalizeString(packet.rollback_mode) !== 'off') {
    invalidFields.push('rollback_mode');
  }

  if (!normalizeString(packet.rollback_owner)) {
    invalidFields.push('rollback_owner');
  }

  if (Number(packet.max_runtime_probe_minutes) !== 10) {
    invalidFields.push('max_runtime_probe_minutes');
  }

  if (packet.production_identifiers_sanitized_in_evidence !== true) {
    invalidFields.push('production_identifiers_sanitized_in_evidence');
  }

  for (const field of FORBIDDEN_TRUE_FLAGS) {
    if (packet[field] !== false) {
      invalidFields.push(field);
    }
  }

  if (targetMode === 'observe' && approvalToken !== OBSERVE_APPROVAL_TOKEN) {
    invalidFields.push('approval_token');
  }
  if (targetMode === 'strict' && approvalToken !== STRICT_APPROVAL_TOKEN) {
    invalidFields.push('approval_token');
  }

  if (packet.expires_at && now) {
    const expiresAtMs = Date.parse(packet.expires_at);
    const nowMs = Date.parse(now);
    if (!Number.isFinite(expiresAtMs) || !Number.isFinite(nowMs) || expiresAtMs <= nowMs) {
      invalidFields.push('expires_at');
    }
  }

  const commandSet = new Set(Array.isArray(packet.allowed_validation_commands)
    ? packet.allowed_validation_commands.map(normalizeString)
    : []);
  const missingValidationCommands = REQUIRED_VALIDATION_COMMANDS
    .filter(command => !commandSet.has(command));
  if (missingValidationCommands.length > 0) {
    invalidFields.push('allowed_validation_commands');
  }

  if (invalidFields.length > 0) {
    return makeRejected('invalid_approval_packet_fields', {
      invalidFields: [...new Set(invalidFields)],
      missingValidationCommands
    });
  }

  return {
    accepted: true,
    scope: 'record_memory_production_strict_auth_approval_packet',
    mode: 'fixture_only',
    reasonCode: 'approval_packet_shape_validated',
    missingFields: [],
    invalidFields: [],
    missingValidationCommands: [],
    approvalTokenAccepted: true,
    rolloutAuthorized: true,
    strictAuthorized: targetMode === 'strict',
    observeOnlyAuthorized: targetMode === 'observe',
    targetRuntimeSurface: normalizeString(packet.target_runtime_surface),
    targetMode,
    lowDisclosure: true,
    secretValuesPrinted: false,
    providerApiAllowed: false,
    rawMemoryScanAllowed: false,
    publicMcpExpansionAllowed: false,
    startupWatchdogChangeAllowed: false,
    pushReleaseDeployCutoverAllowed: false,
    runtimeWiringChanged: false,
    productionStrictEnabled: false,
    nextAllowedStep: 'approval_bound_runtime_preflight'
  };
}

module.exports = {
  OBSERVE_APPROVAL_TOKEN,
  REQUIRED_FIELDS,
  REQUIRED_VALIDATION_COMMANDS,
  STRICT_APPROVAL_TOKEN,
  validateRecordMemoryProductionStrictAuthApprovalPacket
};
