'use strict';

const path = require('node:path');

const MAX_API_KEY_CHARACTERS = 4096;
const MAX_QUERY_CHARACTERS = 2000;
const MAX_VECTOR_DIMENSION = 65_536;
const MODEL_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u;
const PROVIDER_TASK_KIND = 'governed_read_provider_task';
const PROVIDER_RESULT_KIND = 'governed_read_provider_result';
const FORBIDDEN_ENVIRONMENT_KEYS = Object.freeze([
  'API_URL',
  'API_Key',
  'OPENAI_API_KEY',
  'EDGE_AUTH_TOKEN',
  'EDGE_RELAY_AUTH_TOKEN',
  'CODEX_MEMORY_EDGE_TOKEN'
]);

function codedError(code) {
  return Object.assign(new Error(code), { code });
}

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

function validateLoopbackProviderUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw codedError('governed_read_provider_task_invalid');
  }
  if (parsed.protocol !== 'http:' ||
      parsed.hostname !== '127.0.0.1' ||
      !parsed.port ||
      parsed.pathname !== '/' ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash) {
    throw codedError('governed_read_provider_task_invalid');
  }
  return parsed.origin;
}

function validateProviderTask(task) {
  if (!exactKeys(task, [
    'api_key',
    'api_url',
    'dimension',
    'model',
    'query',
    'vcp_toolbox_root'
  ]) ||
      !absolutePath(task.vcp_toolbox_root) ||
      typeof task.api_key !== 'string' ||
      task.api_key.length < 1 ||
      task.api_key.length > MAX_API_KEY_CHARACTERS ||
      task.api_key.trim() !== task.api_key ||
      /[\r\n\0]/u.test(task.api_key) ||
      validateLoopbackProviderUrl(task.api_url) !== task.api_url ||
      !MODEL_PATTERN.test(task.model || '') ||
      typeof task.query !== 'string' ||
      task.query.length < 1 ||
      task.query.length > MAX_QUERY_CHARACTERS ||
      task.query.trim() !== task.query ||
      !Number.isInteger(task.dimension) ||
      task.dimension < 1 ||
      task.dimension > MAX_VECTOR_DIMENSION) {
    throw codedError('governed_read_provider_task_invalid');
  }
  return task;
}

function validateProviderMessage(message) {
  if (!exactKeys(message, ['kind', 'schema_version', 'task']) ||
      message.kind !== PROVIDER_TASK_KIND ||
      message.schema_version !== 1) {
    throw codedError('governed_read_provider_message_invalid');
  }
  return validateProviderTask(message.task);
}

function normalizeVector(value, dimension) {
  const vector = ArrayBuffer.isView(value)
    ? Array.from(value)
    : value;
  if (!Array.isArray(vector) ||
      vector.length !== dimension ||
      vector.some(item =>
        typeof item !== 'number' || !Number.isFinite(item))) {
    throw codedError('governed_read_provider_response_invalid');
  }
  return Object.freeze([...vector]);
}

function validateProviderResponse(response) {
  if (!exactKeys(response, [
    'accepted',
    'kind',
    'reason_code',
    'schema_version',
    'vector'
  ]) ||
      response.kind !== PROVIDER_RESULT_KIND ||
      response.schema_version !== 1 ||
      typeof response.accepted !== 'boolean') {
    throw codedError('governed_read_provider_response_invalid');
  }
  if (response.accepted === true) {
    if (response.reason_code !== null ||
        !Array.isArray(response.vector) ||
        response.vector.length < 1 ||
        response.vector.length > MAX_VECTOR_DIMENSION ||
        response.vector.some(item =>
          typeof item !== 'number' || !Number.isFinite(item))) {
      throw codedError('governed_read_provider_response_invalid');
    }
  } else if (response.vector !== null ||
      ![
        'governed_read_provider_call_failed',
        'governed_read_provider_response_invalid',
        'governed_read_provider_runtime_invalid'
      ].includes(response.reason_code)) {
    throw codedError('governed_read_provider_response_invalid');
  }
  return response;
}

function assertMinimalEnvironment(environment = process.env) {
  for (const key of FORBIDDEN_ENVIRONMENT_KEYS) {
    if (Object.hasOwn(environment, key)) {
      throw codedError('governed_read_provider_environment_invalid');
    }
  }
}

function loadVcpEmbeddingUtils(vcpToolBoxRoot) {
  const embeddingUtilsPath = path.join(
    vcpToolBoxRoot,
    'EmbeddingUtils.js'
  );
  return require(embeddingUtilsPath);
}

async function invokeWithSuppressedProviderConsole(operation) {
  const methods = ['debug', 'error', 'info', 'log', 'warn'];
  const original = Object.fromEntries(
    methods.map(method => [method, console[method]])
  );
  const suppressed = () => {};
  try {
    for (const method of methods) console[method] = suppressed;
    return await operation();
  } finally {
    for (const method of methods) console[method] = original[method];
  }
}

async function runVcpQueryEmbeddingTask(task, {
  environment = process.env,
  loadEmbeddingUtils = loadVcpEmbeddingUtils
} = {}) {
  assertMinimalEnvironment(environment);
  validateProviderTask(task);
  let embeddingUtils;
  try {
    embeddingUtils = loadEmbeddingUtils(task.vcp_toolbox_root);
    if (typeof embeddingUtils?.getEmbeddingsBatch !== 'function') {
      throw codedError('governed_read_provider_runtime_invalid');
    }
  } catch {
    throw codedError('governed_read_provider_runtime_invalid');
  }
  let vectors;
  try {
    vectors = await invokeWithSuppressedProviderConsole(
      () => embeddingUtils.getEmbeddingsBatch(
        [task.query],
        {
          apiUrl: task.api_url,
          apiKey: task.api_key,
          model: task.model
        }
      )
    );
  } catch {
    throw codedError('governed_read_provider_call_failed');
  }
  if (!Array.isArray(vectors) || vectors.length !== 1) {
    throw codedError('governed_read_provider_response_invalid');
  }
  return Object.freeze({
    accepted: true,
    kind: PROVIDER_RESULT_KIND,
    reason_code: null,
    schema_version: 1,
    vector: normalizeVector(vectors[0], task.dimension)
  });
}

function safeFailureResponse(error) {
  const reasonCode = [
    'governed_read_provider_call_failed',
    'governed_read_provider_response_invalid',
    'governed_read_provider_runtime_invalid'
  ].includes(error?.code)
    ? error.code
    : 'governed_read_provider_call_failed';
  return Object.freeze({
    accepted: false,
    kind: PROVIDER_RESULT_KIND,
    reason_code: reasonCode,
    schema_version: 1,
    vector: null
  });
}

if (require.main === module) {
  let consumed = false;
  process.on('message', async message => {
    if (consumed) return;
    consumed = true;
    let response;
    try {
      response = await runVcpQueryEmbeddingTask(
        validateProviderMessage(message)
      );
    } catch (error) {
      response = safeFailureResponse(error);
    }
    if (typeof process.send !== 'function' || !process.connected) {
      process.exit(1);
    }
    process.send(response, error => {
      try {
        process.disconnect();
      } catch {}
      process.exit(error ? 1 : 0);
    });
  });
}

module.exports = {
  FORBIDDEN_ENVIRONMENT_KEYS,
  PROVIDER_RESULT_KIND,
  PROVIDER_TASK_KIND,
  assertMinimalEnvironment,
  runVcpQueryEmbeddingTask,
  safeFailureResponse,
  validateProviderMessage,
  validateProviderResponse,
  validateProviderTask
};
