'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  OBSERVE_APPROVAL_TOKEN,
  REQUIRED_FIELDS,
  REQUIRED_VALIDATION_COMMANDS,
  STRICT_APPROVAL_TOKEN,
  validateRecordMemoryProductionStrictAuthApprovalPacket
} = require('../src/core/RecordMemoryProductionStrictAuthApprovalPacket');

function validPacket(overrides = {}) {
  return {
    task_id: 'CM-1664-execution',
    approval_token: OBSERVE_APPROVAL_TOKEN,
    target_commit: 'e81f5db2e81f5db2e81f5db2e81f5db2e81f5db2',
    target_runtime_surface: 'http_mcp',
    target_mode: 'observe',
    trusted_context_source: 'env',
    policy_source: 'env',
    rollback_mode: 'off',
    rollback_owner: 'operator-owned-role-placeholder',
    max_runtime_probe_minutes: 10,
    allowed_validation_commands: [...REQUIRED_VALIDATION_COMMANDS],
    production_identifiers_sanitized_in_evidence: true,
    secret_values_print_allowed: false,
    raw_memory_scan_allowed: false,
    provider_api_allowed: false,
    public_mcp_expansion_allowed: false,
    startup_watchdog_change_allowed: false,
    push_release_deploy_cutover_allowed: false,
    ...overrides
  };
}

test('CM1668 accepts complete observe-only approval packet shape without runtime wiring', () => {
  const result = validateRecordMemoryProductionStrictAuthApprovalPacket(validPacket());

  assert.equal(result.accepted, true);
  assert.equal(result.observeOnlyAuthorized, true);
  assert.equal(result.strictAuthorized, false);
  assert.equal(result.productionStrictEnabled, false);
  assert.equal(result.runtimeWiringChanged, false);
  assert.equal(result.secretValuesPrinted, false);
  assert.equal(result.nextAllowedStep, 'approval_bound_runtime_preflight');
});

test('CM1668 accepts strict packet only with strict token and strict target mode', () => {
  const result = validateRecordMemoryProductionStrictAuthApprovalPacket(validPacket({
    approval_token: STRICT_APPROVAL_TOKEN,
    target_runtime_surface: 'http_mcp_and_stdio_mcp',
    target_mode: 'strict',
    trusted_context_source: 'trusted_server_context',
    policy_source: 'operator_profile'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.strictAuthorized, true);
  assert.equal(result.observeOnlyAuthorized, false);
  assert.equal(result.targetRuntimeSurface, 'http_mcp_and_stdio_mcp');
});

test('CM1668 fails closed when required approval packet fields are missing', () => {
  const packet = validPacket();
  delete packet.rollback_owner;
  delete packet.allowed_validation_commands;

  const result = validateRecordMemoryProductionStrictAuthApprovalPacket(packet);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_fields');
  assert.deepEqual(result.missingFields, ['rollback_owner', 'allowed_validation_commands']);
  assert.equal(result.rolloutAuthorized, false);
});

test('CM1668 fails closed when observe token is used for strict rollout', () => {
  const result = validateRecordMemoryProductionStrictAuthApprovalPacket(validPacket({
    approval_token: OBSERVE_APPROVAL_TOKEN,
    target_mode: 'strict'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_approval_packet_fields');
  assert.ok(result.invalidFields.includes('approval_token'));
  assert.equal(result.strictAuthorized, false);
});

test('CM1668 fails closed for missing required validation commands', () => {
  const result = validateRecordMemoryProductionStrictAuthApprovalPacket(validPacket({
    allowed_validation_commands: REQUIRED_VALIDATION_COMMANDS.slice(0, -1)
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_approval_packet_fields');
  assert.ok(result.invalidFields.includes('allowed_validation_commands'));
  assert.deepEqual(result.missingValidationCommands, [REQUIRED_VALIDATION_COMMANDS.at(-1)]);
});

test('CM1668 rejects forbidden rollout expansion flags and expired packets', () => {
  const result = validateRecordMemoryProductionStrictAuthApprovalPacket(validPacket({
    provider_api_allowed: true,
    public_mcp_expansion_allowed: true,
    push_release_deploy_cutover_allowed: true,
    expires_at: '2026-06-12T00:00:00.000Z'
  }), {
    now: '2026-06-12T01:00:00.000Z'
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_approval_packet_fields');
  assert.ok(result.invalidFields.includes('provider_api_allowed'));
  assert.ok(result.invalidFields.includes('public_mcp_expansion_allowed'));
  assert.ok(result.invalidFields.includes('push_release_deploy_cutover_allowed'));
  assert.ok(result.invalidFields.includes('expires_at'));
  assert.equal(result.providerApiAllowed, false);
  assert.equal(result.publicMcpExpansionAllowed, false);
});

test('CM1668 exported required field list matches CM-1664 packet surface', () => {
  assert.deepEqual(REQUIRED_FIELDS, [
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
});
