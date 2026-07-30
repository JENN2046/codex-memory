'use strict';

const path = require('node:path');

const {
  appendGovernedReadAttemptStage,
  validateGovernedReadAttemptWorkingSet
} = require('../../../packages/chatgpt-r4-contracts/governed-read-attempt');
const {
  createProductionSelectedDiarySourceProjection
} = require('./production-selected-diary-hydrator');
const {
  executeGovernedReadLeaseTask
} = require('./governed-read-lease-task');

const FORBIDDEN_ENVIRONMENT_KEYS = Object.freeze([
  'API_URL',
  'API_Key',
  'OPENAI_API_KEY',
  'EDGE_AUTH_TOKEN',
  'EDGE_RELAY_AUTH_TOKEN',
  'CODEX_MEMORY_EDGE_TOKEN'
]);

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
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
      message.kind !== 'governed_read_lease_task' ||
      !exactKeys(message.task, [
        'authorization',
        'derived_store_path',
        'knowledge_base_root_path',
        'projection_plan',
        'query_limit',
        'query_vector',
        'source_knowledge_base_store_path',
        'source_runtime_root',
        'vcp_code_root',
        'working_set'
      ]) ||
      !exactKeys(message.task.authorization, [
        'accepted',
        'allowedDiaryCount',
        'allowedDiaryNames'
      ]) ||
      message.task.authorization.accepted !== true ||
      !Array.isArray(
        message.task.authorization.allowedDiaryNames
      ) ||
      message.task.authorization.allowedDiaryNames.length < 1 ||
      message.task.authorization.allowedDiaryNames.length > 8 ||
      message.task.authorization.allowedDiaryCount !==
        message.task.authorization.allowedDiaryNames.length ||
      message.task.authorization.allowedDiaryNames.some(name =>
        typeof name !== 'string' ||
        name.length < 1 ||
        name.length > 255
      ) ||
      !Number.isInteger(message.task.query_limit) ||
      message.task.query_limit < 1 ||
      message.task.query_limit > 5 ||
      !Array.isArray(message.task.query_vector) ||
      !Number.isInteger(message.task.projection_plan?.dimension) ||
      message.task.query_vector.length !==
        message.task.projection_plan.dimension ||
      message.task.query_vector.some(value =>
        typeof value !== 'number' || !Number.isFinite(value)
      )) {
    throw new Error('lease_worker_message_invalid');
  }
  validateGovernedReadAttemptWorkingSet(message.task.working_set);
  for (const key of [
    'derived_store_path',
    'knowledge_base_root_path',
    'source_knowledge_base_store_path',
    'source_runtime_root',
    'vcp_code_root'
  ]) {
    if (!absolutePath(message.task[key])) {
      throw new Error('lease_worker_path_invalid');
    }
  }
  return message.task;
}

function assertMinimalEnvironment() {
  for (const key of FORBIDDEN_ENVIRONMENT_KEYS) {
    if (Object.hasOwn(process.env, key)) {
      throw new Error('lease_worker_forbidden_environment');
    }
  }
}

function exactDatabaseConstructor(vcpCodeRoot) {
  const modulePath = require.resolve('better-sqlite3', {
    paths: [vcpCodeRoot]
  });
  return require(modulePath);
}

function freshKnowledgeBaseManager(vcpCodeRoot) {
  const modulePath = path.join(vcpCodeRoot, 'KnowledgeBaseManager.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function clearTimer(owner, key, clear = clearTimeout) {
  if (!owner?.[key]) return;
  clear(owner[key]);
  owner[key] = null;
}

async function quiesceManager(manager) {
  if (manager.watcher) {
    if (manager.watcherType === 'rust') {
      const stop = manager.watcher.stopWatch || manager.watcher.stop_watch;
      if (typeof stop === 'function') await stop.call(manager.watcher);
    } else if (typeof manager.watcher.close === 'function') {
      await manager.watcher.close();
    }
    manager.watcher = null;
  }
  if (manager.ragParamsWatcher) {
    await manager.ragParamsWatcher.close();
    manager.ragParamsWatcher = null;
  }
  clearTimer(manager, 'idleSweepTimer', clearInterval);
  clearTimer(manager, 'eventLoopWatchdogTimer', clearInterval);
  clearTimer(manager, 'batchTimer');
  clearTimer(manager, 'deleteBatchTimer');
  clearTimer(manager?.tagMemoEngine, '_postStartupDerivedRefreshTimer');
  clearTimer(manager?.tagMemoEngine, '_matrixRebuildTimer');
  clearTimer(manager?.tagMemoEngine, '_derivedTaskTimer');
  if (Number(manager.pendingFiles?.size || 0) !== 0 ||
      Number(manager.pendingDeletes?.size || 0) !== 0 ||
      manager.isProcessing === true ||
      manager.isProcessingDeletes === true) {
    throw new Error('lease_worker_source_mutation_pending');
  }
}

function initializationFailure(workingSet) {
  return Object.freeze({
    accepted: false,
    working_set: appendGovernedReadAttemptStage(workingSet, {
      stage: 'HYDRATION',
      outcome: 'failed',
      reasonCode: 'hydration_failed',
      counterFacts: {
        native_invocation: { failed: 1 },
        primary_memory: {
          write_attempts: 0,
          writes_committed: 0
        },
        derived_transaction: {
          started: 0,
          committed: 0,
          rolled_back: 0
        }
      }
    }),
    evidence_complete: true,
    result: null
  });
}

async function runWorkerTask(task) {
  assertMinimalEnvironment();
  process.env.KNOWLEDGEBASE_ROOT_PATH = task.knowledge_base_root_path;
  process.env.KNOWLEDGEBASE_STORE_PATH = task.derived_store_path;
  process.env.KNOWLEDGEBASE_FULL_SCAN_ON_STARTUP = 'false';
  process.env.VECTORDB_DIMENSION = String(task.projection_plan.dimension);

  const Database = exactDatabaseConstructor(task.vcp_code_root);
  const projection = createProductionSelectedDiarySourceProjection({
    sourceKnowledgeBaseStorePath:
      task.source_knowledge_base_store_path,
    vcpToolBoxRoot: task.source_runtime_root,
    sourceDatabaseConstructor: Database
  });
  const manager = freshKnowledgeBaseManager(task.vcp_code_root);
  let initializationStarted = false;
  let result;
  let shutdownComplete = true;
  try {
    try {
      initializationStarted = true;
      await manager.initialize();
      await quiesceManager(manager);
    } catch {
      result = initializationFailure(task.working_set);
    }
    if (!result) {
      result = await executeGovernedReadLeaseTask({
        workingSet: task.working_set,
        projection,
        projectionPlan: task.projection_plan,
        authorization: task.authorization,
        queryVector: task.query_vector,
        queryLimit: task.query_limit,
        knowledgeBaseManager: manager,
        knowledgeBaseRootPath: task.knowledge_base_root_path,
        knowledgeBaseStorePath: task.derived_store_path
      });
    }
  } finally {
    if (initializationStarted) {
      try {
        await quiesceManager(manager);
        await manager.shutdown();
      } catch {
        shutdownComplete = false;
      }
    }
  }
  return Object.freeze({
    kind: 'governed_read_lease_result',
    schema_version: 1,
    result,
    shutdown_complete: shutdownComplete
  });
}

if (require.main === module) {
  let consumed = false;
  process.on('message', async message => {
    if (consumed) return;
    consumed = true;
    let response;
    try {
      const task = validateMessage(message);
      response = await runWorkerTask(task);
    } catch {
      response = Object.freeze({
        kind: 'governed_read_lease_result',
        schema_version: 1,
        result: null,
        shutdown_complete: false
      });
    }
    if (typeof process.send === 'function' && process.connected) {
      process.send(response, () => process.disconnect());
    }
  });
}

module.exports = {
  FORBIDDEN_ENVIRONMENT_KEYS,
  assertMinimalEnvironment,
  quiesceManager,
  runWorkerTask,
  validateMessage
};
