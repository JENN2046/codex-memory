const fs = require('node:fs');
const path = require('node:path');

const ADAPTER_CONTRACT_REJECTED_FLAGS = Object.freeze(new Set([
  '--write',
  '--execute',
  '--run-adapter',
  '--provider',
  '--api-call',
  '--mcp-call',
  '--record-memory',
  '--search-memory',
  '--memory-overview',
  '--memory-read',
  '--memory-write',
  '--runtime-probe',
  '--dependency-change',
  '--config-change',
  '--push',
  '--pr',
  '--deploy',
  '--release',
  '--tag',
  '--cutover',
  '--readiness-claim'
]));

const REQUIRED_ADAPTERS = Object.freeze([
  'file_edit_adapter',
  'validation_command_adapter',
  'provider_call_adapter',
  'mcp_tool_adapter',
  'memory_read_adapter',
  'memory_write_adapter',
  'dependency_action_adapter',
  'runtime_probe_adapter',
  'git_remote_adapter',
  'approval_packet_adapter'
]);

const REQUIRED_FAIL_CLOSED_FIXTURES = Object.freeze([
  'budget_exhausted',
  'missing_receipt',
  'red_gate_attempted',
  'second_repair_attempted',
  'unknown_cost',
  'secret_access_attempted',
  'broad_memory_scan_attempted',
  'push_attempted'
]);

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function exists(workspaceRoot, relativePath) {
  return fs.existsSync(path.join(workspaceRoot, relativePath));
}

function hasRequiredFields(item, requiredFields) {
  return requiredFields.every(field => Object.prototype.hasOwnProperty.call(item, field));
}

function collectAutopilotActionAdapterContract(options = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const examplePath = path.join(workspaceRoot, 'tests', 'schema_examples', 'autopilot_action_adapter_contract.example.json');
  const example = readJsonSafe(examplePath) || {};
  const contract = example.action_adapter_contract || {};
  const adapters = Array.isArray(contract.adapters) ? contract.adapters : [];
  const fixtures = Array.isArray(contract.fail_closed_fixtures) ? contract.fail_closed_fixtures : [];
  const adapterIds = new Set(adapters.map(adapter => adapter.adapter_id));
  const fixtureIds = new Set(fixtures.map(fixture => fixture.fixture_id));
  const missingAdapters = REQUIRED_ADAPTERS.filter(adapter => !adapterIds.has(adapter));
  const missingFailClosedFixtures = REQUIRED_FAIL_CLOSED_FIXTURES.filter(fixture => !fixtureIds.has(fixture));
  const requiredAdapterFields = [
    'adapter_id',
    'preflight',
    'lane_allowed',
    'budget_required',
    'budget_debit',
    'receipt_required',
    'rollback_or_cleanup',
    'red_gate_conditions',
    'forbidden_without_explicit_approval',
    'validation_required',
    'stop_reason'
  ];
  const completeAdapters = adapters.filter(adapter => hasRequiredFields(adapter, requiredAdapterFields));
  const redGateCoverage = adapters.filter(adapter => Array.isArray(adapter.red_gate_conditions) && adapter.red_gate_conditions.length > 0).length;
  const receiptCoverage = adapters.filter(adapter => adapter.receipt_required && typeof adapter.receipt_required.required === 'boolean').length;
  const budgetCoverage = adapters.filter(adapter => adapter.budget_required && adapter.budget_debit).length;
  const failClosedCoverage = fixtures.filter(fixture => fixture.expected_decision === 'BLOCKED_RED_OR_FAIL_CLOSED' && fixture.mutated === false).length;
  const filesPresent = exists(workspaceRoot, 'schemas/autopilot_action_adapter_contract.schema.yaml')
    && exists(workspaceRoot, 'tests/schema_examples/autopilot_action_adapter_contract.example.json')
    && exists(workspaceRoot, 'docs/AUTOPILOT_ACTION_ADAPTER_CONTRACT.md')
    && exists(workspaceRoot, 'scripts/validate_autopilot_action_adapter_contract.js');
  const status = filesPresent
    && contract.readiness_claim_allowed === false
    && contract.runtime_actions_connected === false
    && contract.provider_calls_connected === false
    && contract.mcp_calls_connected === false
    && missingAdapters.length === 0
    && missingFailClosedFixtures.length === 0
    && completeAdapters.length === adapters.length
    && redGateCoverage === adapters.length
    && receiptCoverage === adapters.length
    && budgetCoverage === adapters.length
    && failClosedCoverage === fixtures.length
      ? 'ok'
      : 'warn';

  return {
    mode: 'autopilot-action-adapter-contract-read-only',
    status,
    decision: 'NOT_READY_BLOCKED',
    evidenceClass: 'fixture_only_read_only_local_filesystem_summary',
    contract_id: contract.contract_id || 'not_recorded',
    adapter_count: adapters.length,
    required_adapter_count: REQUIRED_ADAPTERS.length,
    missing_adapters: missingAdapters,
    complete_adapter_count: completeAdapters.length,
    red_gate_coverage_count: redGateCoverage,
    receipt_coverage_count: receiptCoverage,
    budget_coverage_count: budgetCoverage,
    fail_closed_fixture_count: fixtures.length,
    required_fail_closed_fixture_count: REQUIRED_FAIL_CLOSED_FIXTURES.length,
    missing_fail_closed_fixtures: missingFailClosedFixtures,
    fail_closed_coverage_count: failClosedCoverage,
    readiness_claim_allowed: false,
    runtime_actions_connected: contract.runtime_actions_connected === true,
    provider_calls_connected: contract.provider_calls_connected === true,
    mcp_calls_connected: contract.mcp_calls_connected === true,
    mutated: false,
    executes_adapters: false,
    provider_calls_performed: false,
    mcp_calls_performed: false,
    real_memory_access_performed: false,
    dependency_changes_performed: false,
    config_changes_performed: false,
    runtime_probe_performed: false,
    remote_actions_performed: false,
    stop_reason: status === 'ok' ? 'none' : 'action_adapter_contract_surface_incomplete'
  };
}

module.exports = {
  ADAPTER_CONTRACT_REJECTED_FLAGS,
  REQUIRED_ADAPTERS,
  REQUIRED_FAIL_CLOSED_FIXTURES,
  collectAutopilotActionAdapterContract
};
