const fs = require('node:fs');
const path = require('node:path');

const STATE_STORE_REJECTED_FLAGS = Object.freeze(new Set([
  '--write',
  '--append',
  '--migrate',
  '--create-db',
  '--durable-write',
  '--execute',
  '--provider',
  '--api-call',
  '--mcp-call',
  '--record-memory',
  '--search-memory',
  '--memory-overview',
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

const REQUIRED_RECORD_TYPES = Object.freeze([
  'goal',
  'route_plan',
  'task_queue_snapshot',
  'task_attempt',
  'lane_decision',
  'action_preflight',
  'budget_debit',
  'execution_receipt',
  'validation_run',
  'repair_attempt',
  'checkpoint',
  'approval_packet',
  'red_gate_event',
  'stop_reason',
  'resume_token'
]);

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function readTextSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function exists(workspaceRoot, relativePath) {
  return fs.existsSync(path.join(workspaceRoot, relativePath));
}

function collectAutopilotStateStoreDraft(options = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const examplePath = path.join(workspaceRoot, 'tests', 'schema_examples', 'autopilot_structured_state_store.example.json');
  const schemaPath = path.join(workspaceRoot, 'schemas', 'autopilot_structured_state_store.schema.yaml');
  const docsPath = path.join(workspaceRoot, 'docs', 'AUTOPILOT_STRUCTURED_STATE_STORE_DRAFT.md');
  const validatorPath = path.join(workspaceRoot, 'scripts', 'validate_autopilot_state_store_draft.js');
  const validationLogText = readTextSafe(path.join(workspaceRoot, '.agent_board', 'VALIDATION_LOG.md'));
  const example = readJsonSafe(examplePath) || {};
  const draft = example.structured_state_store_draft || {};
  const records = Array.isArray(draft.records) ? draft.records : [];
  const recordTypes = new Set(records.map(record => record.record_type));
  const missingRecordTypes = REQUIRED_RECORD_TYPES.filter(type => !recordTypes.has(type));
  const mutationBoundaryCount = records.filter(record => record.mutation_boundary && record.mutation_boundary.mutated === false).length;
  const readinessBlockedCount = records.filter(record => record.readiness_claim_allowed === false).length;
  const sourceSurfaces = new Set(records.map(record => record.source_surface).filter(Boolean));
  const validationRecorded = validationLogText.includes('CM-0693') && validationLogText.includes('COMPLETED_VALIDATED');
  const filesPresent = exists(workspaceRoot, 'schemas/autopilot_structured_state_store.schema.yaml')
    && exists(workspaceRoot, 'tests/schema_examples/autopilot_structured_state_store.example.json')
    && exists(workspaceRoot, 'docs/AUTOPILOT_STRUCTURED_STATE_STORE_DRAFT.md')
    && exists(workspaceRoot, 'scripts/validate_autopilot_state_store_draft.js');
  const noMigration = draft.no_migration === true
    && draft.database_created === false
    && draft.durable_write_enabled === false
    && draft.board_migration_performed === false;
  const status = filesPresent
    && noMigration
    && missingRecordTypes.length === 0
    && mutationBoundaryCount === records.length
    && readinessBlockedCount === records.length
      ? 'ok'
      : 'warn';

  return {
    mode: 'autopilot-structured-state-store-draft-read-only',
    status,
    decision: 'NOT_READY_BLOCKED',
    evidenceClass: 'fixture_only_read_only_local_filesystem_summary',
    model_id: draft.model_id || 'not_recorded',
    append_only: draft.append_only === true,
    no_migration: noMigration,
    database_created: draft.database_created === true,
    durable_write_enabled: draft.durable_write_enabled === true,
    board_migration_performed: draft.board_migration_performed === true,
    record_type_count: recordTypes.size,
    required_record_type_count: REQUIRED_RECORD_TYPES.length,
    missing_record_types: missingRecordTypes,
    record_count: records.length,
    mutation_boundary_count: mutationBoundaryCount,
    readiness_claim_allowed_count: records.length - readinessBlockedCount,
    readiness_claim_allowed: false,
    source_surface_count: sourceSurfaces.size,
    schema_present: fs.existsSync(schemaPath),
    example_present: fs.existsSync(examplePath),
    docs_present: fs.existsSync(docsPath),
    validator_present: fs.existsSync(validatorPath),
    validation_recorded: validationRecorded,
    mutated: false,
    writes_runtime_state: false,
    real_database_created: false,
    real_board_migration_performed: false,
    provider_calls_performed: false,
    mcp_calls_performed: false,
    real_memory_access_performed: false,
    dependency_changes_performed: false,
    config_changes_performed: false,
    runtime_probe_performed: false,
    remote_actions_performed: false,
    stop_reason: status === 'ok' ? 'none' : 'state_store_draft_surface_incomplete'
  };
}

module.exports = {
  REQUIRED_RECORD_TYPES,
  STATE_STORE_REJECTED_FLAGS,
  collectAutopilotStateStoreDraft
};
