'use strict';

const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const {
  failureRegistryEntry
} = require('../../../packages/chatgpt-r4-contracts');
const {
  createProductionSelectedDiarySourceProjection
} = require('./production-selected-diary-hydrator');

const FORBIDDEN_ENVIRONMENT_KEYS = Object.freeze([
  'API_URL',
  'API_Key',
  'OPENAI_API_KEY',
  'EDGE_AUTH_TOKEN',
  'EDGE_RELAY_AUTH_TOKEN',
  'CODEX_MEMORY_EDGE_TOKEN'
]);

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}

function absolutePath(value) {
  return typeof value === 'string' &&
    path.isAbsolute(value) &&
    path.resolve(value) === value &&
    !value.includes('\0');
}

function validateMessage(message) {
  if (!exactKeys(message, ['kind', 'schema_version', 'task']) ||
      message.schema_version !== 1 ||
      message.kind !== 'governed_read_source_preflight_task' ||
      !exactKeys(message.task, [
        'allowed_diary_names',
        'dimension',
        'source_knowledge_base_store_path',
        'source_runtime_root'
      ]) ||
      !Array.isArray(message.task.allowed_diary_names) ||
      message.task.allowed_diary_names.length < 1 ||
      message.task.allowed_diary_names.length > 8 ||
      !Number.isInteger(message.task.dimension) ||
      message.task.dimension < 1 ||
      message.task.dimension > 65_536 ||
      !absolutePath(message.task.source_knowledge_base_store_path) ||
      !absolutePath(message.task.source_runtime_root)) {
    throw new Error('source_preflight_message_invalid');
  }
  return message.task;
}

function assertMinimalEnvironment() {
  for (const key of FORBIDDEN_ENVIRONMENT_KEYS) {
    if (Object.hasOwn(process.env, key)) {
      throw new Error('source_preflight_forbidden_environment');
    }
  }
}

function openReadOnlySourceDatabase(file) {
  const database = new DatabaseSync(file, { readOnly: true });
  Object.defineProperty(database, 'readonly', {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false
  });
  return database;
}

function safePreflightReason(error) {
  const reasonCode = error?.reasonCode;
  if (typeof reasonCode !== 'string') return 'source_preflight_failed';
  try {
    const entry = failureRegistryEntry(reasonCode);
    return entry.stage === 'SOURCE_PREFLIGHT' &&
      entry.origin === 'persistent_shim'
      ? reasonCode
      : 'source_preflight_failed';
  } catch {
    return 'source_preflight_failed';
  }
}

function runSourcePreflightTask(task) {
  assertMinimalEnvironment();
  try {
    const projection =
      createProductionSelectedDiarySourceProjection({
        sourceKnowledgeBaseStorePath:
          task.source_knowledge_base_store_path,
        vcpToolBoxRoot: task.source_runtime_root,
        openSourceDatabase: openReadOnlySourceDatabase
      });
    return Object.freeze({
      kind: 'governed_read_source_preflight_result',
      schema_version: 1,
      accepted: true,
      projection_plan: projection.preflight({
        allowedDiaryNames: task.allowed_diary_names,
        dimension: task.dimension
      }),
      reason_code: null
    });
  } catch (error) {
    return Object.freeze({
      kind: 'governed_read_source_preflight_result',
      schema_version: 1,
      accepted: false,
      projection_plan: null,
      reason_code: safePreflightReason(error)
    });
  }
}

if (require.main === module) {
  let consumed = false;
  process.on('message', message => {
    if (consumed) return;
    consumed = true;
    let response;
    try {
      response = runSourcePreflightTask(validateMessage(message));
    } catch {
      response = Object.freeze({
        kind: 'governed_read_source_preflight_result',
        schema_version: 1,
        accepted: false,
        projection_plan: null,
        reason_code: 'source_preflight_failed'
      });
    }
    if (typeof process.send === 'function' && process.connected) {
      process.send(response, () => process.disconnect());
    }
  });
}

module.exports = {
  FORBIDDEN_ENVIRONMENT_KEYS,
  runSourcePreflightTask,
  validateMessage
};
