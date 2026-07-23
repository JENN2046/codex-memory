#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const { constants: fsConstants } = require('node:fs');
const crypto = require('node:crypto');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const {
  REQUIRED_ACCESS_PATH,
  REQUIRED_CLIENTS,
  REQUIRED_GOVERNED_DIMENSIONS,
  REQUIRED_LOCAL_MEMORY_ROLE,
  REQUIRED_PRIMARY_RUNTIME,
  REQUIRED_PRIMARY_VALUE
} = require('../core/CurrentProductGoalContract');

const DEFAULT_TARGET_REFERENCE_NAME = 'operator-vcp-toolbox-service-ref';
const DEFAULT_VCP_TOOLBOX_ROOT = '/home/jenn/AGENTS_OS_Workspace/runtime/VCPToolBox';
const DEFAULT_PROJECT_ID = 'codex-memory';
const DEFAULT_WORKSPACE_ID = 'workspace-alpha';
const DEFAULT_VISIBILITY = 'private';
const DEFAULT_FIXTURE_EMBEDDING_MODEL = 'codex-memory-fixture-embedding';
const DEFAULT_FIXTURE_EMBEDDING_DIMENSION = 3072;
const NATIVE_PROVIDER_ENV_KEYS = Object.freeze([
  'API_URL',
  'API_Key',
  'WhitelistEmbeddingModel',
  'VECTORDB_DIMENSION'
]);
const PRODUCT_GOAL_DIMENSION_MATRIX_KEYS = Object.freeze({
  'client_id': 'client_id',
  'scope': 'scope',
  'visibility': 'visibility',
  'runtime target': 'runtime_target',
  'invocation profile': 'invocation_profile',
  'read/write authority': 'read_write_authority',
  'output disclosure budget': 'output_disclosure_budget',
  'audit receipt': 'audit_receipt',
  'rollback posture': 'rollback_posture'
});
let cachedDefaultAcceptanceRunner = null;
let cachedDefaultAcceptanceEvidenceVerifier = null;

function isSQLiteExperimentalWarning(warning, args = []) {
  const message = typeof warning === 'string'
    ? warning
    : warning && typeof warning.message === 'string'
      ? warning.message
      : '';
  const warningName = warning && typeof warning.name === 'string'
    ? warning.name
    : typeof args[0] === 'string'
      ? args[0]
      : args[0] && typeof args[0].type === 'string'
        ? args[0].type
        : '';
  return warningName === 'ExperimentalWarning' && message.includes('SQLite');
}

function loadDefaultAcceptanceRunner() {
  if (cachedDefaultAcceptanceRunner) return cachedDefaultAcceptanceRunner;
  const originalEmitWarning = process.emitWarning;
  process.emitWarning = function emitWarningWithoutSQLiteNoise(warning, ...args) {
    if (isSQLiteExperimentalWarning(warning, args)) return undefined;
    return originalEmitWarning.call(process, warning, ...args);
  };
  try {
    cachedDefaultAcceptanceRunner = require('./governed-vcp-native-acceptance').runGovernedVcpNativeAcceptance;
  } finally {
    process.emitWarning = originalEmitWarning;
  }
  return cachedDefaultAcceptanceRunner;
}

function loadDefaultAcceptanceEvidenceVerifier() {
  if (cachedDefaultAcceptanceEvidenceVerifier) return cachedDefaultAcceptanceEvidenceVerifier;
  const originalEmitWarning = process.emitWarning;
  process.emitWarning = function emitWarningWithoutSQLiteNoise(warning, ...args) {
    if (isSQLiteExperimentalWarning(warning, args)) return undefined;
    return originalEmitWarning.call(process, warning, ...args);
  };
  try {
    cachedDefaultAcceptanceEvidenceVerifier =
      require('./governed-vcp-native-acceptance').verifyGovernedVcpNativeAcceptanceEvidenceFile;
  } finally {
    process.emitWarning = originalEmitWarning;
  }
  return cachedDefaultAcceptanceEvidenceVerifier;
}

function parseArgs(argv = [], env = process.env) {
  const options = {
    json: false,
    includeReadSuite: false,
    includeWrite: false,
    includeWriteSuite: false,
    vcpToolBoxRoot: env.VCPTOOLBOX_ROOT || DEFAULT_VCP_TOOLBOX_ROOT,
    knowledgeBaseRootPath: env.KNOWLEDGEBASE_ROOT_PATH || '',
    knowledgeBaseStorePath: env.CODEX_MEMORY_VCP_NATIVE_ISOLATED_KB_STORE || '',
    operatorApprovedRealRootWriteProof:
      env.CODEX_MEMORY_VCP_NATIVE_OPERATOR_APPROVED_REAL_ROOT_WRITE_PROOF === '1',
    requireOperatorApprovedRealRootWriteProof:
      env.CODEX_MEMORY_VCP_NATIVE_REQUIRE_OPERATOR_APPROVED_REAL_ROOT_WRITE_PROOF === '1',
    targetReferenceName:
      env.CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TARGET_REFERENCE_NAME ||
      env.CODEX_MEMORY_VCP_NATIVE_TARGET_REFERENCE_NAME ||
      DEFAULT_TARGET_REFERENCE_NAME,
    projectBasePath: env.CODEX_MEMORY_BASE_PATH || '',
    dataDir: env.CODEX_MEMORY_DATA_DIR || '',
    logsDir: env.CODEX_MEMORY_LOGS_DIR || '',
    projectId: env.CODEX_MEMORY_PROJECT_ID || DEFAULT_PROJECT_ID,
    workspaceId: env.CODEX_MEMORY_WORKSPACE_ID || DEFAULT_WORKSPACE_ID,
    scopeId: env.CODEX_MEMORY_SCOPE_ID || '',
    visibility: env.CODEX_MEMORY_VISIBILITY || DEFAULT_VISIBILITY,
    query: 'codex memory governed native live read proof',
    limit: 1,
    evidenceOutputPath: '',
    requestTimeoutMs: env.CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TIMEOUT_MS || '3000',
    shimStartTimeoutMs: env.CODEX_MEMORY_VCP_NATIVE_SHIM_START_TIMEOUT_MS || '10000',
    useVcpConfigEnv: env.CODEX_MEMORY_VCP_NATIVE_USE_CONFIG_ENV === '1',
    providerEnvFilePath: env.CODEX_MEMORY_VCP_NATIVE_PROVIDER_ENV_FILE || '',
    requireProductionProvider: env.CODEX_MEMORY_VCP_NATIVE_REQUIRE_PRODUCTION_PROVIDER === '1',
    fixtureEmbeddingProvider: env.CODEX_MEMORY_VCP_NATIVE_FIXTURE_EMBEDDING_PROVIDER === '1',
    fixtureEmbeddingModel: env.CODEX_MEMORY_VCP_NATIVE_FIXTURE_EMBEDDING_MODEL ||
      DEFAULT_FIXTURE_EMBEDDING_MODEL,
    fixtureEmbeddingDimension: normalizePositiveInteger(
      env.CODEX_MEMORY_VCP_NATIVE_FIXTURE_EMBEDDING_DIMENSION,
      DEFAULT_FIXTURE_EMBEDDING_DIMENSION
    )
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--include-read-suite') {
      options.includeReadSuite = true;
      continue;
    }
    if (token === '--include-write') {
      options.includeWrite = true;
      continue;
    }
    if (token === '--include-write-suite') {
      options.includeWrite = true;
      options.includeWriteSuite = true;
      continue;
    }
    if (token === '--approve-real-root-write-proof') {
      options.operatorApprovedRealRootWriteProof = true;
      continue;
    }
    if (token === '--require-operator-approved-real-root-write-proof') {
      options.requireOperatorApprovedRealRootWriteProof = true;
      continue;
    }
    if (token === '--vcp-root') {
      options.vcpToolBoxRoot = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--kb-root') {
      options.knowledgeBaseRootPath = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--kb-store') {
      options.knowledgeBaseStorePath = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--target-ref') {
      options.targetReferenceName = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--base-path') {
      options.projectBasePath = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--data-dir') {
      options.dataDir = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--logs-dir') {
      options.logsDir = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--project-id') {
      options.projectId = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--workspace-id') {
      options.workspaceId = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--scope-id') {
      options.scopeId = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--visibility') {
      options.visibility = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--query') {
      options.query = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--limit') {
      options.limit = normalizePositiveInteger(argv[index + 1], options.limit);
      index += 1;
      continue;
    }
    if (token === '--timeout-ms') {
      options.requestTimeoutMs = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--shim-start-timeout-ms') {
      options.shimStartTimeoutMs = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--evidence-output') {
      options.evidenceOutputPath = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--use-vcp-config-env') {
      options.useVcpConfigEnv = true;
      continue;
    }
    if (token === '--provider-env-file') {
      options.providerEnvFilePath = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--require-production-provider') {
      options.requireProductionProvider = true;
      continue;
    }
    if (token === '--fixture-embedding-provider') {
      options.fixtureEmbeddingProvider = true;
      continue;
    }
    if (token === '--fixture-embedding-model') {
      options.fixtureEmbeddingModel = argv[index + 1] || DEFAULT_FIXTURE_EMBEDDING_MODEL;
      index += 1;
      continue;
    }
    if (token === '--fixture-embedding-dimension') {
      options.fixtureEmbeddingDimension = normalizePositiveInteger(
        argv[index + 1],
        options.fixtureEmbeddingDimension
      );
      index += 1;
    }
  }

  return options;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function lowDisclosureShimEvidence(overrides = {}) {
  return {
    started: overrides.started === true,
    stopped: overrides.stopped === true,
    lowDisclosure: true,
    targetReferenceName: DEFAULT_TARGET_REFERENCE_NAME,
    isolatedRuntimeStoreConfigured: overrides.isolatedRuntimeStoreConfigured === true,
    endpointDisclosed: false,
    runtimeStorePathDisclosed: false,
    vcpToolBoxRootDisclosed: false,
    knowledgeBaseRootPathDisclosed: false,
    isolatedKnowledgeBaseRootConfigured: overrides.isolatedKnowledgeBaseRootConfigured === true,
    operatorProvidedKnowledgeBaseRootConfigured:
      overrides.operatorProvidedKnowledgeBaseRootConfigured === true,
    temporaryIsolatedKnowledgeBaseRootCreated:
      overrides.temporaryIsolatedKnowledgeBaseRootCreated === true,
    operatorApprovedRealRootWriteProof:
      overrides.operatorApprovedRealRootWriteProof === true,
    nativeWriteToolsEnabled: overrides.nativeWriteToolsEnabled === true,
    tokenMaterialDisclosed: false,
    rawStdoutDisclosed: false,
    rawStderrDisclosed: false,
    readinessClaimed: false,
    reasonCode: typeof overrides.reasonCode === 'string' ? overrides.reasonCode : null
  };
}

function safeEvidenceVerificationBlocker(value) {
  const text = typeof value === 'string' ? value : '';
  if (!text || text.length > 160) return 'unapproved_evidence_verification_blocker';
  if (!/^[a-zA-Z0-9_.-]+$/.test(text)) return 'unapproved_evidence_verification_blocker';
  return text;
}

function lowDisclosureAcceptanceEvidenceArtifactVerification(overrides = {}) {
  const requested = overrides.requested === true;
  const blockers = Array.isArray(overrides.blockers)
    ? [...new Set(overrides.blockers.map(safeEvidenceVerificationBlocker))].sort()
    : [];
  return {
    schemaVersion: 'codex_memory_acceptance_evidence_artifact_verification_v1',
    lowDisclosure: true,
    requested,
    verified: requested && overrides.verified === true,
    valid: requested && overrides.valid === true,
    status: typeof overrides.status === 'string' && /^[a-zA-Z0-9_.-]+$/.test(overrides.status)
      ? overrides.status
      : requested
        ? 'not_verified'
        : 'not_requested',
    acceptedEvidence: requested && overrides.acceptedEvidence === true,
    blockers,
    evidencePathDisclosed: false,
    outputPathDisclosed: false,
    endpointDisclosed: false,
    runtimeStorePathDisclosed: false,
    vcpToolBoxRootDisclosed: false,
    tokenMaterialDisclosed: false,
    rawArtifactDisclosed: false,
    readinessClaimed: false
  };
}

async function verifyAcceptanceEvidenceArtifact(evidenceOutputPath = '', verifier = loadDefaultAcceptanceEvidenceVerifier()) {
  const requested = typeof evidenceOutputPath === 'string' && evidenceOutputPath.trim().length > 0;
  if (!requested) return lowDisclosureAcceptanceEvidenceArtifactVerification({ requested: false });

  try {
    const verification = await verifier(evidenceOutputPath);
    return lowDisclosureAcceptanceEvidenceArtifactVerification({
      requested: true,
      verified: true,
      valid: verification?.valid === true,
      status: verification?.status || 'invalid',
      acceptedEvidence: verification?.acceptedEvidence === true,
      blockers: verification?.blockers || []
    });
  } catch {
    return lowDisclosureAcceptanceEvidenceArtifactVerification({
      requested: true,
      verified: false,
      valid: false,
      status: 'verification_failed',
      blockers: ['evidence_artifact_verification_failed']
    });
  }
}

async function defaultStartShim(options = {}) {
  const bearerToken = typeof options.bearerToken === 'string'
    ? options.bearerToken
    : '';
  if (!bearerToken ||
      bearerToken.trim() !== bearerToken ||
      /[\r\n\u0000]/u.test(bearerToken)) {
    throw new Error('live_read_proof_bearer_token_required');
  }
  const shimPath = path.join(__dirname, 'vcp-toolbox-native-mcp-shim.js');
  const args = [
    shimPath,
    '--host',
    '127.0.0.1',
    '--port',
    '0',
    '--vcp-root',
    options.vcpToolBoxRoot,
    '--kb-store',
    options.knowledgeBaseStorePath
  ];
  if (options.knowledgeBaseRootPath) {
    args.push('--kb-root', options.knowledgeBaseRootPath);
  }
  if (options.enableWrite === true || options.includeWrite === true || options.includeWriteSuite === true) {
    args.push('--enable-write');
  }

  const child = spawn(process.execPath, args, {
    cwd: path.resolve(__dirname, '..', '..'),
    env: {
      ...process.env,
      ...(options.providerEnvPatch || {}),
      VCPTOOLBOX_ROOT: options.vcpToolBoxRoot,
      KNOWLEDGEBASE_STORE_PATH: options.knowledgeBaseStorePath,
      CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN: bearerToken,
      ...(options.knowledgeBaseRootPath ? { KNOWLEDGEBASE_ROOT_PATH: options.knowledgeBaseRootPath } : {})
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  return waitForShimStart(child, normalizePositiveInteger(options.shimStartTimeoutMs, 10000));
}

function waitForShimStart(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      reject(new Error('shim_start_timeout'));
    }, timeoutMs);
    if (typeof timeout.unref === 'function') timeout.unref();

    child.stdout.on('data', chunk => {
      if (settled) return;
      stdout += chunk.toString('utf8');
      const start = stdout.indexOf('{');
      if (start < 0) return;
      try {
        const parsed = JSON.parse(stdout.slice(start).split(/\r?\n/)[0]);
        if (typeof parsed.endpoint !== 'string' || !parsed.endpoint) return;
        settled = true;
        clearTimeout(timeout);
        resolve({
          endpoint: parsed.endpoint,
          isolatedRuntimeStoreConfigured: parsed.isolatedRuntimeStoreConfigured === true,
          stop: () => stopChild(child)
        });
      } catch {
        // Wait for a complete JSON line.
      }
    });

    child.once('error', error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error('shim_exited_before_ready'));
    });
  });
}

function stopChild(child) {
  return new Promise(resolve => {
    if (!child || child.killed || child.exitCode !== null) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      resolve();
    }, 2000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

async function ensureRuntimeDirs(options = {}) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-vcp-native-live-read-'));
  const writeProofRequested = options.includeWrite === true || options.includeWriteSuite === true;
  const operatorProvidedKnowledgeBaseRootConfigured =
    typeof options.knowledgeBaseRootPath === 'string' && options.knowledgeBaseRootPath.trim().length > 0;
  const temporaryIsolatedKnowledgeBaseRootCreated =
    operatorProvidedKnowledgeBaseRootConfigured !== true && writeProofRequested === true;
  const operatorApprovedRealRootWriteProof =
    operatorProvidedKnowledgeBaseRootConfigured === true &&
    writeProofRequested === true &&
    options.operatorApprovedRealRootWriteProof === true;
  const knowledgeBaseRootPath = options.knowledgeBaseRootPath ||
    (writeProofRequested ? path.join(tempRoot, 'vcp-kb-root') : '');
  if (knowledgeBaseRootPath) {
    await fs.mkdir(knowledgeBaseRootPath, { recursive: true });
  }
  return {
    tempRoot,
    projectBasePath: options.projectBasePath || path.join(tempRoot, 'codex-memory'),
    dataDir: options.dataDir || path.join(tempRoot, 'data'),
    logsDir: options.logsDir || path.join(tempRoot, 'logs'),
    knowledgeBaseStorePath: options.knowledgeBaseStorePath || path.join(tempRoot, 'vcp-derived-store'),
    knowledgeBaseRootPath,
    operatorProvidedKnowledgeBaseRootConfigured,
    temporaryIsolatedKnowledgeBaseRootCreated,
    operatorApprovedRealRootWriteProof
  };
}

async function pathAccessible(targetPath, mode) {
  if (!targetPath) return false;
  try {
    await fs.access(targetPath, mode);
    return true;
  } catch {
    return false;
  }
}

async function directoryWritable(directoryPath) {
  if (!directoryPath) return false;
  const probePath = path.join(
    directoryPath,
    `.codex-memory-vcp-native-precondition-${process.pid}-${Date.now()}`
  );
  try {
    await fs.mkdir(directoryPath, { recursive: true });
    await fs.writeFile(probePath, 'probe', { encoding: 'utf8', flag: 'wx' });
    await fs.unlink(probePath);
    return true;
  } catch {
    try {
      await fs.unlink(probePath);
    } catch {
      // Best-effort cleanup only; no path or raw error is disclosed.
    }
    return false;
  }
}

function envPresence(env = process.env) {
  return Object.fromEntries(NATIVE_PROVIDER_ENV_KEYS.map(key => [
    key,
    typeof env[key] === 'string' && env[key].trim().length > 0
  ]));
}

function lowDisclosureFixtureEmbeddingProviderEvidence(overrides = {}) {
  return {
    schemaVersion: 'codex_memory_fixture_embedding_provider_evidence_v1',
    lowDisclosure: true,
    included: overrides.included === true,
    started: overrides.started === true,
    stopped: overrides.stopped === true,
    providerApiCalled: overrides.providerApiCalled === true,
    requestCountBucket: safeRequestCountBucket(overrides.requestCount),
    validationFixtureRole: 'validation fixture',
    productionReadinessClaimed: false,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    rawRequestBodyDisclosed: false,
    rawResponseBodyDisclosed: false,
    rawEmbeddingVectorDisclosed: false,
    readinessClaimed: false,
    reasonCode: typeof overrides.reasonCode === 'string' ? overrides.reasonCode : null
  };
}

function safeRequestCountBucket(value) {
  const count = Number.isInteger(value) && value >= 0 ? value : 0;
  if (count === 0) return 'zero';
  if (count === 1) return 'one';
  if (count <= 5) return 'two_to_five';
  if (count <= 25) return 'six_to_twenty_five';
  return 'more_than_twenty_five';
}

function deterministicEmbeddingVector(text, dimension) {
  const vector = new Array(dimension);
  let seed = 2166136261;
  const input = String(text || '');
  for (let index = 0; index < input.length; index += 1) {
    seed ^= input.charCodeAt(index);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  for (let index = 0; index < dimension; index += 1) {
    seed ^= index + 0x9e3779b9;
    seed = Math.imul(seed, 16777619) >>> 0;
    vector[index] = ((seed % 2000) - 1000) / 1000;
  }
  return vector;
}

function readHttpJsonBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('request_body_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('invalid_json'));
      }
    });
    req.on('error', reject);
  });
}

async function startFixtureEmbeddingProvider(rawOptions = {}) {
  const options = {
    ...parseArgs([], process.env),
    ...rawOptions
  };
  if (options.fixtureEmbeddingProvider !== true) {
    return {
      envPatch: {},
      evidence: lowDisclosureFixtureEmbeddingProviderEvidence({ included: false }),
      stop: async () => lowDisclosureFixtureEmbeddingProviderEvidence({ included: false })
    };
  }
  const dimension = normalizePositiveInteger(
    options.fixtureEmbeddingDimension,
    DEFAULT_FIXTURE_EMBEDDING_DIMENSION
  );
  const model = String(options.fixtureEmbeddingModel || DEFAULT_FIXTURE_EMBEDDING_MODEL);
  let requestCount = 0;
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/v1/embeddings') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'not found' } }));
      return;
    }
    try {
      const body = await readHttpJsonBody(req);
      const inputs = Array.isArray(body.input) ? body.input : [body.input || ''];
      requestCount += 1;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        object: 'list',
        model,
        data: inputs.map((input, index) => ({
          object: 'embedding',
          index,
          embedding: deterministicEmbeddingVector(input, dimension)
        }))
      }));
    } catch {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'bad request' } }));
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  const envPatch = {
    API_URL: `http://127.0.0.1:${port}`,
    API_Key: 'codex-memory-fixture-provider-key',
    WhitelistEmbeddingModel: model,
    VECTORDB_DIMENSION: String(dimension)
  };
  const stop = async () => new Promise(resolve => {
    server.close(() => resolve(lowDisclosureFixtureEmbeddingProviderEvidence({
      included: true,
      started: true,
      stopped: true,
      providerApiCalled: requestCount > 0,
      requestCount
    })));
  });
  return {
    envPatch,
    evidence: lowDisclosureFixtureEmbeddingProviderEvidence({
      included: true,
      started: true,
      stopped: false,
      providerApiCalled: false,
      requestCount: 0
    }),
    stop
  };
}

function parseConfigEnvSubset(raw = '') {
  const parsed = {};
  for (const rawLine of String(raw).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equalsIndex = line.indexOf('=');
    if (equalsIndex <= 0) continue;
    const key = line.slice(0, equalsIndex).trim();
    if (!NATIVE_PROVIDER_ENV_KEYS.includes(key)) continue;
    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) parsed[key] = value;
  }
  return parsed;
}

async function readVcpConfigEnvIntake(rawOptions = {}, env = process.env) {
  const options = {
    ...parseArgs([], env),
    ...rawOptions
  };
  const vcpToolBoxRoot = path.resolve(options.vcpToolBoxRoot || DEFAULT_VCP_TOOLBOX_ROOT);
  const configEnvPath = path.join(vcpToolBoxRoot, 'config.env');
  const providerEnvPresentBeforeIntake = envPresence(env);
  const evidence = {
    schemaVersion: 'codex_memory_vcp_config_env_intake_v1',
    lowDisclosure: true,
    included: options.useVcpConfigEnv === true,
    configEnvReadAllowed: options.useVcpConfigEnv === true,
    configEnvReadAttempted: false,
    configEnvPresent: false,
    configEnvParsed: false,
    providerEnvPresentBeforeIntake,
    providerEnvPresentFromConfigEnv: Object.fromEntries(NATIVE_PROVIDER_ENV_KEYS.map(key => [key, false])),
    providerEnvPresentAfterIntake: providerEnvPresentBeforeIntake,
    providerEnvConfiguredAfterIntake: NATIVE_PROVIDER_ENV_KEYS.every(
      key => providerEnvPresentBeforeIntake[key] === true
    ),
    rawConfigDisclosed: false,
    rawConfigPersisted: false,
    configEnvPathDisclosed: false,
    tokenMaterialDisclosed: false,
    endpointDisclosed: false,
    readinessClaimed: false,
    blockers: []
  };
  if (options.useVcpConfigEnv !== true) {
    return { envPatch: {}, evidence };
  }

  evidence.configEnvReadAttempted = true;
  try {
    const raw = await fs.readFile(configEnvPath, 'utf8');
    evidence.configEnvPresent = true;
    const parsed = parseConfigEnvSubset(raw);
    evidence.configEnvParsed = true;
    const envPatch = {};
    for (const key of NATIVE_PROVIDER_ENV_KEYS) {
      const presentFromConfig = typeof parsed[key] === 'string' && parsed[key].trim().length > 0;
      evidence.providerEnvPresentFromConfigEnv[key] = presentFromConfig;
      if (presentFromConfig && !(typeof env[key] === 'string' && env[key].trim().length > 0)) {
        envPatch[key] = parsed[key];
      }
    }
    const providerEnvPresentAfterIntake = envPresence({ ...env, ...envPatch });
    evidence.providerEnvPresentAfterIntake = providerEnvPresentAfterIntake;
    evidence.providerEnvConfiguredAfterIntake = NATIVE_PROVIDER_ENV_KEYS.every(
      key => providerEnvPresentAfterIntake[key] === true
    );
    if (evidence.providerEnvConfiguredAfterIntake !== true) {
      evidence.blockers.push('provider_env_not_configured_after_config_env_intake');
    }
    return { envPatch, evidence };
  } catch {
    evidence.blockers.push('config_env_unreadable');
    evidence.blockers.push('provider_env_not_configured_after_config_env_intake');
    return { envPatch: {}, evidence };
  }
}

async function readProviderEnvFileIntake(rawOptions = {}, env = process.env) {
  const options = {
    ...parseArgs([], env),
    ...rawOptions
  };
  const included = typeof options.providerEnvFilePath === 'string' && options.providerEnvFilePath.trim().length > 0;
  const providerEnvFilePath = included ? path.resolve(options.providerEnvFilePath) : '';
  const providerEnvPresentBeforeIntake = envPresence(env);
  const evidence = {
    schemaVersion: 'codex_memory_provider_env_file_intake_v1',
    lowDisclosure: true,
    included,
    providerEnvFileReadAllowed: included,
    providerEnvFileReadAttempted: false,
    providerEnvFilePresent: false,
    providerEnvFileParsed: false,
    providerEnvPresentBeforeIntake,
    providerEnvPresentFromProviderEnvFile: Object.fromEntries(NATIVE_PROVIDER_ENV_KEYS.map(key => [key, false])),
    providerEnvPresentAfterIntake: providerEnvPresentBeforeIntake,
    providerEnvConfiguredAfterIntake: NATIVE_PROVIDER_ENV_KEYS.every(
      key => providerEnvPresentBeforeIntake[key] === true
    ),
    rawProviderEnvDisclosed: false,
    rawProviderEnvPersisted: false,
    providerEnvFilePathDisclosed: false,
    tokenMaterialDisclosed: false,
    endpointDisclosed: false,
    readinessClaimed: false,
    blockers: []
  };
  if (!included) {
    return { envPatch: {}, evidence };
  }

  evidence.providerEnvFileReadAttempted = true;
  try {
    const raw = await fs.readFile(providerEnvFilePath, 'utf8');
    evidence.providerEnvFilePresent = true;
    const parsed = parseConfigEnvSubset(raw);
    evidence.providerEnvFileParsed = true;
    const envPatch = {};
    for (const key of NATIVE_PROVIDER_ENV_KEYS) {
      const presentFromFile = typeof parsed[key] === 'string' && parsed[key].trim().length > 0;
      evidence.providerEnvPresentFromProviderEnvFile[key] = presentFromFile;
      if (presentFromFile && !(typeof env[key] === 'string' && env[key].trim().length > 0)) {
        envPatch[key] = parsed[key];
      }
    }
    const providerEnvPresentAfterIntake = envPresence({ ...env, ...envPatch });
    evidence.providerEnvPresentAfterIntake = providerEnvPresentAfterIntake;
    evidence.providerEnvConfiguredAfterIntake = NATIVE_PROVIDER_ENV_KEYS.every(
      key => providerEnvPresentAfterIntake[key] === true
    );
    if (evidence.providerEnvConfiguredAfterIntake !== true) {
      evidence.blockers.push('provider_env_not_configured_after_provider_env_file_intake');
    }
    return { envPatch, evidence };
  } catch {
    evidence.blockers.push('provider_env_file_unreadable');
    evidence.blockers.push('provider_env_not_configured_after_provider_env_file_intake');
    return { envPatch: {}, evidence };
  }
}

async function defaultLoadNativeModuleProbe(options = {}) {
  const probeScript = [
    "try {",
    "  require(process.argv[1]);",
    "  require(process.argv[2]);",
    "  process.exit(0);",
    "} catch {",
    "  process.exit(2);",
    "}"
  ].join('\n');
  const child = spawn(process.execPath, [
    '-e',
    probeScript,
    path.join(options.vcpToolBoxRoot, 'KnowledgeBaseManager.js'),
    path.join(options.vcpToolBoxRoot, 'EmbeddingUtils.js')
  ], {
    cwd: path.resolve(__dirname, '..', '..'),
    env: {
      ...process.env,
      ...(options.providerEnvPatch || {}),
      NODE_OPTIONS: [
        process.env.NODE_OPTIONS || '',
        '--no-warnings'
      ].filter(Boolean).join(' '),
      VCPTOOLBOX_ROOT: options.vcpToolBoxRoot,
      KNOWLEDGEBASE_ROOT_PATH: options.knowledgeBaseRootPath,
      KNOWLEDGEBASE_STORE_PATH: options.knowledgeBaseStorePath
    },
    stdio: ['ignore', 'ignore', 'ignore'],
    windowsHide: true
  });
  return new Promise(resolve => {
    child.once('error', () => resolve(false));
    child.once('exit', code => resolve(code === 0));
  });
}

async function diagnoseVcpToolBoxNativePreconditions(rawOptions = {}, deps = {}) {
  const options = {
    ...parseArgs([], process.env),
    ...rawOptions
  };
  const vcpToolBoxRoot = path.resolve(options.vcpToolBoxRoot || DEFAULT_VCP_TOOLBOX_ROOT);
  const knowledgeBaseRootPath = path.resolve(
    options.knowledgeBaseRootPath || path.join(vcpToolBoxRoot, 'dailynote')
  );
  const knowledgeBaseStorePath = options.knowledgeBaseStorePath
    ? path.resolve(options.knowledgeBaseStorePath)
    : '';
  const knowledgeBaseManagerPath = path.join(vcpToolBoxRoot, 'KnowledgeBaseManager.js');
  const embeddingUtilsPath = path.join(vcpToolBoxRoot, 'EmbeddingUtils.js');
  const rustVexusLitePath = path.join(vcpToolBoxRoot, 'rust-vexus-lite');
  const rustVexusLiteIndexPath = path.join(rustVexusLitePath, 'index.js');
  const configEnvPath = path.join(vcpToolBoxRoot, 'config.env');
  const effectiveEnv = deps.env || { ...process.env, ...(options.providerEnvPatch || {}) };
  const providerEnvPresent = envPresence(effectiveEnv);
  const providerEnvConfigured = NATIVE_PROVIDER_ENV_KEYS.every(key => providerEnvPresent[key] === true);
  const [
    vcpRootAccessible,
    knowledgeBaseManagerPresent,
    embeddingUtilsPresent,
    rustVexusLitePresent,
    rustVexusLiteIndexPresent,
    configEnvPresent,
    knowledgeBaseRootReadable,
    isolatedRuntimeStoreWritable
  ] = await Promise.all([
    pathAccessible(vcpToolBoxRoot, fsConstants.R_OK),
    pathAccessible(knowledgeBaseManagerPath, fsConstants.R_OK),
    pathAccessible(embeddingUtilsPath, fsConstants.R_OK),
    pathAccessible(rustVexusLitePath, fsConstants.R_OK),
    pathAccessible(rustVexusLiteIndexPath, fsConstants.R_OK),
    pathAccessible(configEnvPath, fsConstants.R_OK),
    pathAccessible(knowledgeBaseRootPath, fsConstants.R_OK),
    knowledgeBaseStorePath ? directoryWritable(knowledgeBaseStorePath) : Promise.resolve(false)
  ]);
  const loadNativeModuleProbe = deps.loadNativeModuleProbe || defaultLoadNativeModuleProbe;
  const nativeModuleLoadSucceeded = knowledgeBaseManagerPresent && embeddingUtilsPresent
    ? await loadNativeModuleProbe({
        vcpToolBoxRoot,
        knowledgeBaseRootPath,
        knowledgeBaseStorePath,
        providerEnvPatch: options.providerEnvPatch || {}
      })
    : false;
  const blockers = [];
  if (!vcpRootAccessible) blockers.push('vcp_toolbox_root_inaccessible');
  if (!knowledgeBaseManagerPresent) blockers.push('knowledge_base_manager_missing');
  if (!embeddingUtilsPresent) blockers.push('embedding_utils_missing');
  if (!rustVexusLitePresent || !rustVexusLiteIndexPresent) blockers.push('rust_vexus_lite_missing');
  if (!knowledgeBaseRootReadable) blockers.push('knowledge_base_root_unreadable');
  if (!knowledgeBaseStorePath) blockers.push('isolated_runtime_store_not_configured');
  if (knowledgeBaseStorePath && !isolatedRuntimeStoreWritable) blockers.push('isolated_runtime_store_not_writable');
  if (!providerEnvConfigured) blockers.push('provider_env_not_configured');
  if (!nativeModuleLoadSucceeded) blockers.push('native_module_load_failed');

  return {
    schemaVersion: 'codex_memory_vcp_toolbox_native_precondition_diagnosis_v1',
    lowDisclosure: true,
    included: true,
    targetRuntimeCategory: 'VCPToolBox native memory',
    vcpToolBoxRootConfigured: Boolean(options.vcpToolBoxRoot),
    vcpToolBoxRootAccessible: vcpRootAccessible,
    knowledgeBaseManagerPresent,
    embeddingUtilsPresent,
    rustVexusLitePresent,
    rustVexusLiteIndexPresent,
    knowledgeBaseRootConfigured: Boolean(options.knowledgeBaseRootPath),
    knowledgeBaseRootDefaulted: !options.knowledgeBaseRootPath,
    knowledgeBaseRootReadable,
    isolatedRuntimeStoreConfigured: Boolean(knowledgeBaseStorePath),
    isolatedRuntimeStoreWritable,
    providerEnvPresent,
    providerEnvConfigured,
    configEnvPresent,
    configEnvRead: false,
    providerApiCalled: false,
    nativeModuleLoadProbeAttempted: knowledgeBaseManagerPresent && embeddingUtilsPresent,
    nativeModuleLoadSucceeded,
    rawErrorDisclosed: false,
    rawStdoutDisclosed: false,
    rawStderrDisclosed: false,
    endpointDisclosed: false,
    runtimeLocatorDisclosed: false,
    runtimeStorePathDisclosed: false,
    vcpToolBoxRootDisclosed: false,
    knowledgeBaseRootPathDisclosed: false,
    tokenMaterialDisclosed: false,
    readinessClaimed: false,
    blockers
  };
}

function missingProviderEnvKeys(providerEnvPresent = {}) {
  return NATIVE_PROVIDER_ENV_KEYS.filter(key => providerEnvPresent[key] !== true);
}

function buildRuntimePreconditionOperatorPacket({
  accepted = false,
  configEnvIntakeEvidence = null,
  providerEnvFileIntakeEvidence = null,
  fixtureEmbeddingProviderEvidence = null,
  nativePreconditionDiagnosis = null,
  acceptance = null
} = {}) {
  const configBlockers = Array.isArray(configEnvIntakeEvidence?.blockers)
    ? configEnvIntakeEvidence.blockers
    : [];
  const diagnosisBlockers = Array.isArray(nativePreconditionDiagnosis?.blockers)
    ? nativePreconditionDiagnosis.blockers
    : [];
  const providerEnvFileBlockers = Array.isArray(providerEnvFileIntakeEvidence?.blockers)
    ? providerEnvFileIntakeEvidence.blockers
    : [];
  const acceptanceBlockers = Array.isArray(acceptance?.summary?.acceptanceBlockers?.all)
    ? acceptance.summary.acceptanceBlockers.all
    : [];
  const providerEnvPresent = nativePreconditionDiagnosis?.providerEnvPresent ||
    providerEnvFileIntakeEvidence?.providerEnvPresentAfterIntake ||
    configEnvIntakeEvidence?.providerEnvPresentAfterIntake ||
    {};
  const missingKeys = missingProviderEnvKeys(providerEnvPresent);
  const providerEnvConfigured = nativePreconditionDiagnosis?.providerEnvConfigured === true ||
    configEnvIntakeEvidence?.providerEnvConfiguredAfterIntake === true ||
    providerEnvFileIntakeEvidence?.providerEnvConfiguredAfterIntake === true;
  const nativeRuntimeCallFailed =
    acceptance?.summary?.nativeRuntimePreconditionEvidence?.nativeRuntimeCallFailed === true ||
    acceptanceBlockers.some(blocker => String(blocker).includes('native_runtime_call_failed'));
  const providerEnvMissing = providerEnvConfigured !== true && (
    missingKeys.length > 0 ||
    diagnosisBlockers.includes('provider_env_not_configured') ||
    configBlockers.some(blocker => String(blocker).includes('provider_env_not_configured')) ||
    providerEnvFileBlockers.some(blocker => String(blocker).includes('provider_env_not_configured'))
  );
  const nativeModuleMissing = diagnosisBlockers.includes('native_module_load_failed') ||
    diagnosisBlockers.includes('knowledge_base_manager_missing') ||
    diagnosisBlockers.includes('embedding_utils_missing') ||
    diagnosisBlockers.includes('rust_vexus_lite_missing');
  const isolatedStoreBlocked = diagnosisBlockers.includes('isolated_runtime_store_not_configured') ||
    diagnosisBlockers.includes('isolated_runtime_store_not_writable');
  const included = accepted !== true && (
    providerEnvMissing ||
    nativeModuleMissing ||
    isolatedStoreBlocked ||
    nativeRuntimeCallFailed ||
    configBlockers.length > 0 ||
    diagnosisBlockers.length > 0 ||
    acceptanceBlockers.length > 0
  );
  const actionCategory = included
    ? providerEnvMissing
      ? 'provider_env_configuration_required'
      : nativeModuleMissing
        ? 'native_module_precondition_required'
        : isolatedStoreBlocked
          ? 'isolated_runtime_store_precondition_required'
          : nativeRuntimeCallFailed
            ? 'native_runtime_precondition_review_required'
            : 'governed_live_read_proof_followup_required'
    : null;

  return {
    schemaVersion: 'codex_memory_vcp_native_runtime_precondition_operator_packet_v1',
    packetKind: included ? 'vcp_native_runtime_precondition_operator_packet' : null,
    included,
    lowDisclosure: true,
    operatorActionRequired: included,
    packetUsableNow: included,
    actionCategory,
    targetRuntimeCategory: 'VCPToolBox native memory',
    accessPath: 'governed MCP tools',
    fixtureEmbeddingProviderIncluded: fixtureEmbeddingProviderEvidence?.included === true,
    fixtureEmbeddingProviderStarted: fixtureEmbeddingProviderEvidence?.started === true,
    fixtureEmbeddingProviderApiCalled: fixtureEmbeddingProviderEvidence?.providerApiCalled === true,
    productionReadinessClaimedFromFixture: false,
    configEnvIntakeIncluded: configEnvIntakeEvidence?.included === true,
    configEnvReadAllowedByOperatorFlag: configEnvIntakeEvidence?.configEnvReadAllowed === true,
    configEnvReadAttempted: configEnvIntakeEvidence?.configEnvReadAttempted === true,
    configEnvPresent: configEnvIntakeEvidence?.configEnvPresent === true ||
      nativePreconditionDiagnosis?.configEnvPresent === true,
    providerEnvFileIntakeIncluded: providerEnvFileIntakeEvidence?.included === true,
    providerEnvFileReadAllowedByOperatorFlag: providerEnvFileIntakeEvidence?.providerEnvFileReadAllowed === true,
    providerEnvFileReadAttempted: providerEnvFileIntakeEvidence?.providerEnvFileReadAttempted === true,
    providerEnvFilePresent: providerEnvFileIntakeEvidence?.providerEnvFilePresent === true,
    providerEnvConfigured,
    requiredProviderEnvKeys: NATIVE_PROVIDER_ENV_KEYS,
    missingProviderEnvKeys: missingKeys,
    allowedRemediationMethods: providerEnvMissing
        ? [
            'provide_provider_env_to_live_proof_process',
            'provide_whitelisted_provider_env_file_then_rerun_with_provider_env_file',
            'populate_whitelisted_vcp_config_env_keys_then_rerun_with_use_vcp_config_env'
          ]
      : [],
    requiredEvidenceCategory: included
      ? 'fresh_governed_vcp_native_live_read_proof_with_native_runtime_receipt'
      : null,
    requiredRetryCommandCategory: included
      ? 'npm_run_vcp_native_live_read_proof'
      : null,
    bridgeMayAutoModifyVcpToolBoxNativeCode: false,
    bridgeMayAutoWriteConfigEnv: false,
    bridgeMayCallProviderForDiagnosis: false,
    bridgeMayClaimReadiness: false,
    rollbackPosture: 'no_runtime_write_to_rollback',
    rollbackApplyAttempted: false,
    rollbackAutoApplyAllowed: false,
    rawConfigDisclosed: false,
    rawConfigPersisted: false,
    rawProviderEnvDisclosed: false,
    rawProviderEnvPersisted: false,
    providerEnvFilePathDisclosed: false,
    rawErrorDisclosed: false,
    rawStdoutDisclosed: false,
    rawStderrDisclosed: false,
    endpointDisclosed: false,
    runtimeLocatorDisclosed: false,
    runtimeStorePathDisclosed: false,
    vcpToolBoxRootDisclosed: false,
    knowledgeBaseRootPathDisclosed: false,
    tokenMaterialDisclosed: false,
    readinessClaimed: false,
    blockers: included ? [...new Set([
      ...configBlockers,
      ...providerEnvFileBlockers,
      ...diagnosisBlockers,
      ...(nativeRuntimeCallFailed ? ['native_runtime_call_failed'] : []),
      ...acceptanceBlockers
    ])].sort() : []
  };
}

function buildProductGoalProgressEvidence({
  accepted = false,
  acceptance = null,
  shimEvidence = null,
  fixtureEmbeddingProviderEvidence = null,
  nativePreconditionDiagnosis = null,
  acceptanceEvidenceArtifactVerification = null
} = {}) {
  const summary = acceptance?.summary || {};
  const matrix = summary.governanceEvidenceMatrix || {};
  const selectedOperations = Array.isArray(summary.selectedOperations)
    ? summary.selectedOperations.filter(operation => typeof operation === 'string').sort()
    : [];
  const nativeRuntimePreconditionEvidence = summary.nativeRuntimePreconditionEvidence || {};
  const localMemoryAuxiliaryEvidence = summary.localMemoryAuxiliaryEvidence || {};
  const governedDimensions = Object.fromEntries(REQUIRED_GOVERNED_DIMENSIONS.map(dimension => {
    const matrixKey = PRODUCT_GOAL_DIMENSION_MATRIX_KEYS[dimension];
    const source = matrix[matrixKey] || {};
    return [matrixKey, {
      dimension,
      covered: source.covered === true,
      lowDisclosure: true,
      rawValueDisclosed: false,
      endpointDisclosed: false,
      tokenMaterialDisclosed: false
    }];
  }));
  const allGovernedDimensionsCovered = Object.values(governedDimensions)
    .every(evidence => evidence.covered === true);
  const acceptanceArtifactVerified =
    acceptanceEvidenceArtifactVerification?.requested === true &&
    acceptanceEvidenceArtifactVerification?.verified === true &&
    acceptanceEvidenceArtifactVerification?.valid === true &&
    acceptanceEvidenceArtifactVerification?.acceptedEvidence === true;
  const validationFixtureUsed = fixtureEmbeddingProviderEvidence?.included === true;
  const productionProviderLiveProofCovered = accepted === true &&
    validationFixtureUsed !== true &&
    nativePreconditionDiagnosis?.providerEnvConfigured === true &&
    nativeRuntimePreconditionEvidence.nativeProviderApiCalledFromReceipt === true;
  const localMemoryAuxiliaryOnly =
    localMemoryAuxiliaryEvidence.primaryRuntime === false &&
    localMemoryAuxiliaryEvidence.localMemoryPrimaryRuntime !== true &&
    localMemoryAuxiliaryEvidence.localMemoryResultCanBeMistakenForVcpNative !== true &&
    localMemoryAuxiliaryEvidence.localMemoryRawContentDisclosed !== true &&
    localMemoryAuxiliaryEvidence.rawLocalMemoryDisclosed !== true;
  const readProofCovered = selectedOperations.includes('search_memory') &&
    nativeRuntimePreconditionEvidence.nativeMemoryReadPerformedFromReceipt === true;
  const writeSuiteProofCovered = [
    'record_memory',
    'tombstone_memory',
    'supersede_memory'
  ].every(toolName => selectedOperations.includes(toolName)) &&
    nativeRuntimePreconditionEvidence.nativeMemoryWritePerformedFromReceipt === true &&
    nativeRuntimePreconditionEvidence.rollbackPostureBound === true &&
    nativeRuntimePreconditionEvidence.rollbackApplyAttempted === false &&
    nativeRuntimePreconditionEvidence.rollbackAutoApplyAllowed === false;
  const operatorApprovedRealRootWriteProofCovered = writeSuiteProofCovered === true &&
    shimEvidence?.nativeWriteToolsEnabled === true &&
    shimEvidence?.operatorProvidedKnowledgeBaseRootConfigured === true &&
    shimEvidence?.operatorApprovedRealRootWriteProof === true &&
    shimEvidence?.temporaryIsolatedKnowledgeBaseRootCreated !== true;
  const remainingWork = [];
  if (accepted !== true) remainingWork.push('accepted_live_proof_missing');
  if (allGovernedDimensionsCovered !== true) remainingWork.push('governed_dimensions_not_fully_covered');
  if (acceptanceArtifactVerified !== true) remainingWork.push('acceptance_evidence_artifact_verification_missing');
  if (localMemoryAuxiliaryOnly !== true) remainingWork.push('local_memory_auxiliary_role_not_proven');
  if (productionProviderLiveProofCovered !== true) remainingWork.push('production_provider_live_proof_missing');
  if (writeSuiteProofCovered !== true) remainingWork.push('governed_write_suite_proof_missing');
  if (operatorApprovedRealRootWriteProofCovered !== true) {
    remainingWork.push('operator_approved_real_root_write_proof_not_run');
  }

  return {
    schemaVersion: 'codex_memory_governed_vcp_native_product_goal_progress_v1',
    lowDisclosure: true,
    primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
    primaryValue: REQUIRED_PRIMARY_VALUE,
    clients: [...REQUIRED_CLIENTS],
    accessPath: REQUIRED_ACCESS_PATH,
    governedDimensions,
    allGovernedDimensionsCovered,
    localMemoryRole: [...REQUIRED_LOCAL_MEMORY_ROLE],
    localMemoryAuxiliaryOnly,
    selectedOperations,
    readProofCovered,
    writeSuiteProofCovered,
    operatorApprovedRealRootWriteProofCovered,
    operatorProvidedKnowledgeBaseRootConfigured:
      shimEvidence?.operatorProvidedKnowledgeBaseRootConfigured === true,
    temporaryIsolatedKnowledgeBaseRootCreated:
      shimEvidence?.temporaryIsolatedKnowledgeBaseRootCreated === true,
    operatorApprovedRealRootWriteProof:
      shimEvidence?.operatorApprovedRealRootWriteProof === true,
    nativeRuntimeReceiptBound: nativeRuntimePreconditionEvidence.nativeRuntimeReceiptBound === true,
    nativeRuntimeCalledFromReceipt: nativeRuntimePreconditionEvidence.nativeRuntimeCalledFromReceipt === true,
    nativeProviderApiCalledFromReceipt: nativeRuntimePreconditionEvidence.nativeProviderApiCalledFromReceipt === true,
    nativeMemoryReadPerformedFromReceipt: nativeRuntimePreconditionEvidence.nativeMemoryReadPerformedFromReceipt === true,
    nativeMemoryWritePerformedFromReceipt: nativeRuntimePreconditionEvidence.nativeMemoryWritePerformedFromReceipt === true,
    acceptanceArtifactVerified,
    validationFixtureUsed,
    productionProviderLiveProofCovered,
    productionReadinessClaimed: false,
    goalCompletionClaimed: false,
    readyForCompletion: remainingWork.length === 0,
    remainingWork: [...new Set(remainingWork)].sort(),
    endpointDisclosed: false,
    runtimeStorePathDisclosed: false,
    vcpToolBoxRootDisclosed: false,
    knowledgeBaseRootPathDisclosed: false,
    evidencePathDisclosed: false,
    tokenMaterialDisclosed: false,
    rawMemoryDisclosed: false,
    rawArtifactDisclosed: false,
    readinessClaimed: false
  };
}

function buildProductGoalCompletionProofPacket({
  productGoalProgress = null,
  configEnvIntakeEvidence = null,
  providerEnvFileIntakeEvidence = null,
  nativePreconditionDiagnosis = null
} = {}) {
  const remainingWork = Array.isArray(productGoalProgress?.remainingWork)
    ? productGoalProgress.remainingWork.filter(item => typeof item === 'string').sort()
    : [];
  const providerEnvPresent = nativePreconditionDiagnosis?.providerEnvPresent ||
    providerEnvFileIntakeEvidence?.providerEnvPresentAfterIntake ||
    configEnvIntakeEvidence?.providerEnvPresentAfterIntake ||
    {};
  const missingProviderKeys = missingProviderEnvKeys(providerEnvPresent);
  const productionProviderLiveProofReady =
    nativePreconditionDiagnosis?.providerEnvConfigured === true &&
    nativePreconditionDiagnosis?.nativeModuleLoadSucceeded === true &&
    nativePreconditionDiagnosis?.isolatedRuntimeStoreConfigured === true &&
    nativePreconditionDiagnosis?.isolatedRuntimeStoreWritable === true;
  const operatorApprovedRealRootWriteProofReady =
    productGoalProgress?.operatorProvidedKnowledgeBaseRootConfigured === true &&
    productGoalProgress?.operatorApprovedRealRootWriteProof === true &&
    productGoalProgress?.temporaryIsolatedKnowledgeBaseRootCreated !== true;
  const requiredProofs = [];
  if (remainingWork.includes('accepted_live_proof_missing')) {
    requiredProofs.push({
      proofId: 'accepted_live_proof',
      required: true,
      readyToRun: productionProviderLiveProofReady,
      commandCategory: 'npm_run_vcp_native_live_read_proof_until_accepted',
      requiredSignals: [
        'shim_started',
        'shim_stopped',
        'acceptance_accepted',
        'low_disclosure_output',
        'readiness_not_claimed'
      ],
      bridgeMayIgnoreAcceptanceFailure: false,
      bridgeMayClaimReadinessFromPartialProof: false
    });
  }
  if (remainingWork.includes('governed_dimensions_not_fully_covered')) {
    requiredProofs.push({
      proofId: 'governed_dimensions_full_coverage',
      required: true,
      readyToRun: true,
      commandCategory: 'rerun_acceptance_with_current_product_goal_dimension_matrix',
      requiredSignals: REQUIRED_GOVERNED_DIMENSIONS.map(dimension => `dimension_${dimension.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_covered`),
      bridgeMayDropGovernedDimension: false,
      bridgeMayClaimCoverageFromUntestedDimension: false
    });
  }
  if (remainingWork.includes('local_memory_auxiliary_role_not_proven')) {
    requiredProofs.push({
      proofId: 'local_memory_auxiliary_role',
      required: true,
      readyToRun: true,
      commandCategory: 'rerun_acceptance_with_local_memory_auxiliary_evidence',
      requiredSignals: REQUIRED_LOCAL_MEMORY_ROLE.map(role => `local_memory_role_${role.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`),
      bridgeMayPromoteLocalMemoryToPrimaryRuntime: false,
      bridgeMayReturnLocalMemoryAsNativeResult: false
    });
  }
  if (remainingWork.includes('production_provider_live_proof_missing')) {
    requiredProofs.push({
      proofId: 'production_provider_live_proof',
      required: true,
      readyToRun: productionProviderLiveProofReady,
      commandCategory: 'npm_run_vcp_native_live_read_proof_without_fixture_provider',
      requiredSignals: [
        'fixture_embedding_provider_not_included',
        'provider_env_configured',
        'native_provider_api_called_from_receipt',
        'native_memory_read_performed_from_receipt',
        'acceptance_evidence_artifact_verified'
      ],
      missingProviderEnvKeys: missingProviderKeys,
      bridgeMayAutoWriteProviderConfig: false,
      bridgeMayCallProviderForDiagnosisOnly: false
    });
  }
  if (remainingWork.includes('operator_approved_real_root_write_proof_not_run')) {
    requiredProofs.push({
      proofId: 'operator_approved_real_root_write_proof',
      required: true,
      readyToRun: operatorApprovedRealRootWriteProofReady,
      commandCategory: 'npm_run_vcp_native_live_read_proof_with_include_write_suite_kb_root_and_approval_flag',
      requiredSignals: [
        'include_write_suite',
        'operator_provided_knowledge_base_root_configured',
        'approve_real_root_write_proof_flag_present',
        'temporary_isolated_knowledge_base_root_not_created',
        'native_memory_write_performed_from_receipt',
        'rollback_posture_bound',
        'rollback_not_auto_applied'
      ],
      bridgeMayAutoApproveRealRootWriteProof: false,
      bridgeMayInferApprovalFromPath: false,
      bridgeMayModifyVcpToolBoxNativeCode: false
    });
  }
  if (remainingWork.includes('acceptance_evidence_artifact_verification_missing')) {
    requiredProofs.push({
      proofId: 'acceptance_evidence_artifact_verification',
      required: true,
      readyToRun: true,
      commandCategory: 'rerun_live_proof_with_evidence_output_or_verify_evidence_artifact',
      requiredSignals: [
        'evidence_output_requested',
        'artifact_verified',
        'artifact_valid',
        'accepted_evidence_true'
      ],
      bridgeMayDiscloseEvidencePath: false,
      bridgeMayDiscloseRawArtifact: false
    });
  }
  if (remainingWork.includes('governed_write_suite_proof_missing')) {
    requiredProofs.push({
      proofId: 'governed_write_suite_proof',
      required: true,
      readyToRun: productGoalProgress?.nativeRuntimeReceiptBound === true,
      commandCategory: 'npm_run_vcp_native_live_read_proof_with_include_write_suite',
      requiredSignals: [
        'record_memory_selected',
        'tombstone_memory_selected',
        'supersede_memory_selected',
        'native_memory_write_performed_from_receipt',
        'rollback_posture_bound'
      ],
      bridgeMayBypassReadWriteAuthority: false,
      bridgeMayAutoApplyRollback: false
    });
  }

  return {
    schemaVersion: 'codex_memory_governed_vcp_native_product_goal_completion_proof_packet_v1',
    lowDisclosure: true,
    included: remainingWork.length > 0,
    packetKind: remainingWork.length > 0
      ? 'product_goal_completion_proof_packet'
      : null,
    targetRuntimeCategory: 'VCPToolBox native memory',
    accessPath: 'governed MCP tools',
    remainingWork,
    requiredProofs,
    productionProviderLiveProofReady,
    operatorApprovedRealRootWriteProofReady,
    configEnvIntakeIncluded: configEnvIntakeEvidence?.included === true,
    providerEnvFileIntakeIncluded: providerEnvFileIntakeEvidence?.included === true,
    providerEnvConfigured: nativePreconditionDiagnosis?.providerEnvConfigured === true,
    missingProviderEnvKeys: missingProviderKeys,
    bridgeMayAutoModifyVcpToolBoxNativeCode: false,
    bridgeMayAutoWriteConfigEnv: false,
    bridgeMayAutoApproveRealRootWriteProof: false,
    bridgeMayClaimReadiness: false,
    endpointDisclosed: false,
    runtimeStorePathDisclosed: false,
    vcpToolBoxRootDisclosed: false,
    knowledgeBaseRootPathDisclosed: false,
    tokenMaterialDisclosed: false,
    rawArtifactDisclosed: false,
    rawMemoryDisclosed: false,
    readinessClaimed: false
  };
}

function buildProductionProviderProofGate({
  required = false,
  fixtureEmbeddingProviderEvidence = null,
  nativePreconditionDiagnosis = null
} = {}) {
  const fixtureProviderRequested = fixtureEmbeddingProviderEvidence?.included === true;
  const providerEnvPresent = nativePreconditionDiagnosis?.providerEnvPresent || {};
  const missingKeys = missingProviderEnvKeys(providerEnvPresent);
  const blockers = [];
  if (fixtureProviderRequested) blockers.push('fixture_provider_not_allowed_for_production_proof');
  if (nativePreconditionDiagnosis?.providerEnvConfigured !== true) {
    blockers.push('provider_env_not_configured_for_production_proof');
  }
  if (nativePreconditionDiagnosis?.nativeModuleLoadSucceeded !== true) {
    blockers.push('native_module_load_not_ready_for_production_proof');
  }
  if (nativePreconditionDiagnosis?.isolatedRuntimeStoreConfigured !== true ||
    nativePreconditionDiagnosis?.isolatedRuntimeStoreWritable !== true) {
    blockers.push('isolated_runtime_store_not_ready_for_production_proof');
  }
  const readyToRun = required === true && blockers.length === 0;

  return {
    schemaVersion: 'codex_memory_governed_vcp_native_production_provider_proof_gate_v1',
    lowDisclosure: true,
    included: required === true,
    required: required === true,
    readyToRun,
    runtimeExecutionAllowed: readyToRun,
    failFast: required === true && readyToRun !== true,
    actionCategory: required === true && readyToRun !== true
      ? 'production_provider_proof_precondition_required'
      : null,
    fixtureEmbeddingProviderAllowed: false,
    fixtureEmbeddingProviderRequested: fixtureProviderRequested,
    providerEnvConfigured: nativePreconditionDiagnosis?.providerEnvConfigured === true,
    missingProviderEnvKeys: missingKeys,
    nativeModuleLoadSucceeded: nativePreconditionDiagnosis?.nativeModuleLoadSucceeded === true,
    isolatedRuntimeStoreConfigured: nativePreconditionDiagnosis?.isolatedRuntimeStoreConfigured === true,
    isolatedRuntimeStoreWritable: nativePreconditionDiagnosis?.isolatedRuntimeStoreWritable === true,
    blockers: required === true ? [...new Set(blockers)].sort() : [],
    bridgeMayAutoWriteProviderConfig: false,
    bridgeMayUseFixtureProvider: false,
    bridgeMayCallProviderForDiagnosisOnly: false,
    bridgeMayModifyVcpToolBoxNativeCode: false,
    bridgeMayClaimReadiness: false,
    endpointDisclosed: false,
    runtimeStorePathDisclosed: false,
    vcpToolBoxRootDisclosed: false,
    knowledgeBaseRootPathDisclosed: false,
    tokenMaterialDisclosed: false,
    rawErrorDisclosed: false,
    readinessClaimed: false
  };
}

function buildOperatorApprovedRealRootWriteProofGate({
  required = false,
  includeWriteSuite = false,
  nativeWriteToolsEnabled = false,
  operatorProvidedKnowledgeBaseRootConfigured = false,
  operatorApprovedRealRootWriteProof = false,
  temporaryIsolatedKnowledgeBaseRootCreated = false
} = {}) {
  const blockers = [];
  if (includeWriteSuite !== true) {
    blockers.push('write_suite_not_requested_for_real_root_write_proof');
  }
  if (nativeWriteToolsEnabled !== true) {
    blockers.push('native_write_tools_not_enabled_for_real_root_write_proof');
  }
  if (operatorProvidedKnowledgeBaseRootConfigured !== true) {
    blockers.push('operator_kb_root_not_configured_for_real_root_write_proof');
  }
  if (operatorApprovedRealRootWriteProof !== true) {
    blockers.push('operator_real_root_write_approval_missing');
  }
  if (temporaryIsolatedKnowledgeBaseRootCreated === true) {
    blockers.push('temporary_isolated_kb_root_created_for_real_root_write_proof');
  }
  const readyToRun = required === true && blockers.length === 0;

  return {
    schemaVersion: 'codex_memory_governed_vcp_native_operator_approved_real_root_write_proof_gate_v1',
    lowDisclosure: true,
    included: required === true,
    required: required === true,
    readyToRun,
    runtimeExecutionAllowed: readyToRun,
    failFast: required === true && readyToRun !== true,
    actionCategory: required === true && readyToRun !== true
      ? 'operator_approved_real_root_write_proof_precondition_required'
      : null,
    includeWriteSuite: includeWriteSuite === true,
    nativeWriteToolsEnabled: nativeWriteToolsEnabled === true,
    operatorProvidedKnowledgeBaseRootConfigured:
      operatorProvidedKnowledgeBaseRootConfigured === true,
    operatorApprovedRealRootWriteProof:
      operatorApprovedRealRootWriteProof === true,
    temporaryIsolatedKnowledgeBaseRootCreated:
      temporaryIsolatedKnowledgeBaseRootCreated === true,
    blockers: required === true ? [...new Set(blockers)].sort() : [],
    bridgeMayAutoApproveRealRootWriteProof: false,
    bridgeMayInferApprovalFromPath: false,
    bridgeMayUseTemporaryRootForRealRootProof: false,
    bridgeMayModifyVcpToolBoxNativeCode: false,
    bridgeMayAutoApplyRollback: false,
    bridgeMayClaimReadiness: false,
    endpointDisclosed: false,
    runtimeStorePathDisclosed: false,
    vcpToolBoxRootDisclosed: false,
    knowledgeBaseRootPathDisclosed: false,
    tokenMaterialDisclosed: false,
    rawMemoryDisclosed: false,
    rawErrorDisclosed: false,
    readinessClaimed: false
  };
}

async function runGovernedVcpNativeLiveReadProof(rawOptions = {}, deps = {}) {
  const options = {
    ...parseArgs([], process.env),
    ...rawOptions
  };
  if (options.includeWriteSuite === true) options.includeWrite = true;
  const dirs = await ensureRuntimeDirs(options);
  const nativeWriteToolsEnabled = options.includeWrite === true || options.includeWriteSuite === true;
  const operatorApprovedRealRootWriteProofGate = buildOperatorApprovedRealRootWriteProofGate({
    required: options.requireOperatorApprovedRealRootWriteProof === true,
    includeWriteSuite: options.includeWriteSuite === true,
    nativeWriteToolsEnabled,
    operatorProvidedKnowledgeBaseRootConfigured: dirs.operatorProvidedKnowledgeBaseRootConfigured,
    operatorApprovedRealRootWriteProof: dirs.operatorApprovedRealRootWriteProof,
    temporaryIsolatedKnowledgeBaseRootCreated: dirs.temporaryIsolatedKnowledgeBaseRootCreated
  });
  if (operatorApprovedRealRootWriteProofGate.failFast === true) {
    return buildResult({
      acceptance: null,
      operatorApprovedRealRootWriteProofGateEvidence: operatorApprovedRealRootWriteProofGate,
      status: 'operator_approved_real_root_write_proof_precondition_failed',
      shimEvidence: lowDisclosureShimEvidence({
        started: false,
        stopped: false,
        isolatedRuntimeStoreConfigured: Boolean(options.knowledgeBaseStorePath || dirs.knowledgeBaseStorePath),
        isolatedKnowledgeBaseRootConfigured: Boolean(dirs.knowledgeBaseRootPath),
        operatorProvidedKnowledgeBaseRootConfigured: dirs.operatorProvidedKnowledgeBaseRootConfigured,
        temporaryIsolatedKnowledgeBaseRootCreated: dirs.temporaryIsolatedKnowledgeBaseRootCreated,
        operatorApprovedRealRootWriteProof: dirs.operatorApprovedRealRootWriteProof,
        nativeWriteToolsEnabled,
        reasonCode: 'operator_approved_real_root_write_proof_precondition_failed'
      })
    });
  }
  const startShim = deps.startShim || defaultStartShim;
  const runAcceptance = deps.runAcceptance || loadDefaultAcceptanceRunner();
  const acceptanceEvidenceVerifier =
    deps.verifyAcceptanceEvidenceArtifact || loadDefaultAcceptanceEvidenceVerifier();
  const diagnoseNativePreconditions = deps.diagnoseNativePreconditions || diagnoseVcpToolBoxNativePreconditions;
  const readConfigEnvIntake = deps.readConfigEnvIntake || readVcpConfigEnvIntake;
  const readProviderEnvFile = deps.readProviderEnvFileIntake || readProviderEnvFileIntake;
  const startFixtureProvider = deps.startFixtureEmbeddingProvider || startFixtureEmbeddingProvider;
  const configEnvIntake = await readConfigEnvIntake(options, process.env);
  const providerEnvFileIntake = await readProviderEnvFile(
    options,
    { ...process.env, ...(configEnvIntake.envPatch || {}) }
  );
  const fixtureEmbeddingProvider = options.requireProductionProvider === true
    ? {
        envPatch: {},
        evidence: lowDisclosureFixtureEmbeddingProviderEvidence({
          included: options.fixtureEmbeddingProvider === true,
          reasonCode: options.fixtureEmbeddingProvider === true
            ? 'fixture_provider_not_allowed_for_production_proof'
            : null
        }),
        stop: async () => lowDisclosureFixtureEmbeddingProviderEvidence({
          included: options.fixtureEmbeddingProvider === true,
          reasonCode: options.fixtureEmbeddingProvider === true
            ? 'fixture_provider_not_allowed_for_production_proof'
            : null
        })
      }
    : await startFixtureProvider(options);
  let fixtureEmbeddingProviderEvidence = fixtureEmbeddingProvider.evidence ||
    lowDisclosureFixtureEmbeddingProviderEvidence({ included: options.fixtureEmbeddingProvider === true });
  const providerEnvPatch = {
    ...(configEnvIntake.envPatch || {}),
    ...(providerEnvFileIntake.envPatch || {}),
    ...(fixtureEmbeddingProvider.envPatch || {})
  };
  const nativePreconditionDiagnosis = await diagnoseNativePreconditions({
    ...options,
    knowledgeBaseStorePath: dirs.knowledgeBaseStorePath,
    knowledgeBaseRootPath: dirs.knowledgeBaseRootPath || options.knowledgeBaseRootPath,
    providerEnvPatch
  });
  const productionProviderProofGate = buildProductionProviderProofGate({
    required: options.requireProductionProvider === true,
    fixtureEmbeddingProviderEvidence,
    nativePreconditionDiagnosis
  });
  let shim = null;
  let stopped = false;
  let acceptanceEvidenceArtifactVerification =
    lowDisclosureAcceptanceEvidenceArtifactVerification({
      requested: Boolean(options.evidenceOutputPath)
    });
  const shimBearerToken = crypto.randomBytes(32).toString('hex');
  if (productionProviderProofGate.failFast === true) {
    return buildResult({
      acceptance: null,
      configEnvIntakeEvidence: configEnvIntake.evidence,
      providerEnvFileIntakeEvidence: providerEnvFileIntake.evidence,
      fixtureEmbeddingProviderEvidence,
      nativePreconditionDiagnosis,
      operatorApprovedRealRootWriteProofGateEvidence: operatorApprovedRealRootWriteProofGate,
      productionProviderProofGateEvidence: productionProviderProofGate,
      acceptanceEvidenceArtifactVerification,
      status: 'production_provider_proof_precondition_failed',
      shimEvidence: lowDisclosureShimEvidence({
        started: false,
        stopped: false,
        isolatedRuntimeStoreConfigured: Boolean(options.knowledgeBaseStorePath || dirs.knowledgeBaseStorePath),
        isolatedKnowledgeBaseRootConfigured: Boolean(dirs.knowledgeBaseRootPath),
        operatorProvidedKnowledgeBaseRootConfigured: dirs.operatorProvidedKnowledgeBaseRootConfigured,
        temporaryIsolatedKnowledgeBaseRootCreated: dirs.temporaryIsolatedKnowledgeBaseRootCreated,
        operatorApprovedRealRootWriteProof: dirs.operatorApprovedRealRootWriteProof,
        nativeWriteToolsEnabled,
        reasonCode: 'production_provider_proof_precondition_failed'
      })
    });
  }

  try {
    shim = await startShim({
      ...options,
      knowledgeBaseStorePath: dirs.knowledgeBaseStorePath,
      knowledgeBaseRootPath: dirs.knowledgeBaseRootPath || options.knowledgeBaseRootPath,
      providerEnvPatch,
      bearerToken: shimBearerToken
    });
    const acceptance = await runAcceptance({
      includeReadSuite: options.includeReadSuite,
      includeWrite: options.includeWrite,
      includeWriteSuite: options.includeWriteSuite,
      endpoint: shim.endpoint,
      targetReferenceName: options.targetReferenceName,
      timeoutMs: options.requestTimeoutMs,
      projectBasePath: dirs.projectBasePath,
      dataDir: dirs.dataDir,
      logsDir: dirs.logsDir,
      projectId: options.projectId,
      workspaceId: options.workspaceId,
      scopeId: options.scopeId,
      visibility: options.visibility,
      query: options.query,
      limit: options.limit,
      evidenceOutputPath: options.evidenceOutputPath,
      bearerToken: shimBearerToken
    });
    acceptanceEvidenceArtifactVerification = await verifyAcceptanceEvidenceArtifact(
      options.evidenceOutputPath,
      acceptanceEvidenceVerifier
    );
    if (shim && typeof shim.stop === 'function') {
      await shim.stop();
      stopped = true;
    }
    if (fixtureEmbeddingProvider && typeof fixtureEmbeddingProvider.stop === 'function') {
      fixtureEmbeddingProviderEvidence = await fixtureEmbeddingProvider.stop();
    }
    return buildResult({
      acceptance,
      configEnvIntakeEvidence: configEnvIntake.evidence,
      providerEnvFileIntakeEvidence: providerEnvFileIntake.evidence,
      fixtureEmbeddingProviderEvidence,
      nativePreconditionDiagnosis,
      operatorApprovedRealRootWriteProofGateEvidence: operatorApprovedRealRootWriteProofGate,
      productionProviderProofGateEvidence: productionProviderProofGate,
      acceptanceEvidenceArtifactVerification,
      shimEvidence: lowDisclosureShimEvidence({
        started: true,
        stopped,
        isolatedRuntimeStoreConfigured: shim?.isolatedRuntimeStoreConfigured === true,
        isolatedKnowledgeBaseRootConfigured: Boolean(dirs.knowledgeBaseRootPath),
        operatorProvidedKnowledgeBaseRootConfigured: dirs.operatorProvidedKnowledgeBaseRootConfigured,
        temporaryIsolatedKnowledgeBaseRootCreated: dirs.temporaryIsolatedKnowledgeBaseRootCreated,
        operatorApprovedRealRootWriteProof: dirs.operatorApprovedRealRootWriteProof,
        nativeWriteToolsEnabled
      })
    });
  } catch {
    if (shim && typeof shim.stop === 'function') {
      await shim.stop();
      stopped = true;
    }
    if (fixtureEmbeddingProvider && typeof fixtureEmbeddingProvider.stop === 'function') {
      fixtureEmbeddingProviderEvidence = await fixtureEmbeddingProvider.stop();
    }
    return buildResult({
      acceptance: null,
      configEnvIntakeEvidence: configEnvIntake.evidence,
      providerEnvFileIntakeEvidence: providerEnvFileIntake.evidence,
      fixtureEmbeddingProviderEvidence,
      nativePreconditionDiagnosis,
      operatorApprovedRealRootWriteProofGateEvidence: operatorApprovedRealRootWriteProofGate,
      productionProviderProofGateEvidence: productionProviderProofGate,
      acceptanceEvidenceArtifactVerification,
      status: 'live_read_proof_not_accepted',
      shimEvidence: lowDisclosureShimEvidence({
        started: Boolean(shim),
        stopped,
        isolatedRuntimeStoreConfigured: Boolean(options.knowledgeBaseStorePath || dirs.knowledgeBaseStorePath),
        isolatedKnowledgeBaseRootConfigured: Boolean(dirs.knowledgeBaseRootPath),
        operatorProvidedKnowledgeBaseRootConfigured: dirs.operatorProvidedKnowledgeBaseRootConfigured,
        temporaryIsolatedKnowledgeBaseRootCreated: dirs.temporaryIsolatedKnowledgeBaseRootCreated,
        operatorApprovedRealRootWriteProof: dirs.operatorApprovedRealRootWriteProof,
        nativeWriteToolsEnabled,
        reasonCode: shim ? 'live_read_acceptance_failed' : 'shim_start_failed'
      })
    });
  }
}

function buildResult({
  acceptance = null,
  shimEvidence,
  configEnvIntakeEvidence = null,
  providerEnvFileIntakeEvidence = null,
  fixtureEmbeddingProviderEvidence = null,
  nativePreconditionDiagnosis = null,
  operatorApprovedRealRootWriteProofGateEvidence = null,
  productionProviderProofGateEvidence = null,
  acceptanceEvidenceArtifactVerification = lowDisclosureAcceptanceEvidenceArtifactVerification(),
  status = null
} = {}) {
  const evidenceVerificationAccepted = acceptanceEvidenceArtifactVerification?.requested === true
    ? acceptanceEvidenceArtifactVerification?.valid === true
    : true;
  const accepted = acceptance?.accepted === true &&
    shimEvidence?.started === true &&
    shimEvidence?.stopped === true &&
    evidenceVerificationAccepted === true;
  const runtimePreconditionOperatorPacket = buildRuntimePreconditionOperatorPacket({
    accepted,
    configEnvIntakeEvidence,
    providerEnvFileIntakeEvidence,
    fixtureEmbeddingProviderEvidence,
    nativePreconditionDiagnosis,
    acceptance
  });
  const productGoalProgress = buildProductGoalProgressEvidence({
    accepted,
    acceptance,
    shimEvidence,
    fixtureEmbeddingProviderEvidence,
    nativePreconditionDiagnosis,
    acceptanceEvidenceArtifactVerification
  });
  const productGoalCompletionProofPacket = buildProductGoalCompletionProofPacket({
    productGoalProgress,
    configEnvIntakeEvidence,
    providerEnvFileIntakeEvidence,
    nativePreconditionDiagnosis
  });
  return {
    schemaVersion: 'codex_memory_governed_vcp_native_live_read_proof_v1',
    proofKind: 'low_disclosure_governed_vcp_native_live_read_proof',
    accepted,
    status: status || (accepted ? 'accepted' : 'not_accepted'),
    shim: shimEvidence,
    configEnvIntake: configEnvIntakeEvidence,
    providerEnvFileIntake: providerEnvFileIntakeEvidence,
    fixtureEmbeddingProvider: fixtureEmbeddingProviderEvidence,
    nativePreconditionDiagnosis,
    operatorApprovedRealRootWriteProofGate:
      operatorApprovedRealRootWriteProofGateEvidence ||
      buildOperatorApprovedRealRootWriteProofGate(),
    productionProviderProofGate: productionProviderProofGateEvidence ||
      buildProductionProviderProofGate(),
    runtimePreconditionOperatorPacket,
    acceptanceEvidenceArtifactVerification,
    productGoalProgress,
    productGoalCompletionProofPacket,
    acceptance,
    disclosure: {
      endpointDisclosed: false,
      runtimeStorePathDisclosed: false,
      vcpToolBoxRootDisclosed: false,
      rawStdoutDisclosed: false,
      rawStderrDisclosed: false,
      tokenMaterialDisclosed: false
    },
    readinessClaimed: false
  };
}

function renderText(result = {}) {
  const blockers = result.acceptance?.summary?.acceptanceBlockers?.all || [];
  const configEnvBlockers = result.configEnvIntake?.blockers || [];
  const providerEnvFileBlockers = result.providerEnvFileIntake?.blockers || [];
  const diagnosisBlockers = result.nativePreconditionDiagnosis?.blockers || [];
  const operatorPacket = result.runtimePreconditionOperatorPacket || {};
  return [
    `status: ${result.status}`,
    `accepted: ${result.accepted === true}`,
    `shim_started: ${result.shim?.started === true}`,
    `shim_stopped: ${result.shim?.stopped === true}`,
    `isolated_runtime_store_configured: ${result.shim?.isolatedRuntimeStoreConfigured === true}`,
    `isolated_knowledge_base_root_configured: ${result.shim?.isolatedKnowledgeBaseRootConfigured === true}`,
    `operator_provided_knowledge_base_root_configured: ${result.shim?.operatorProvidedKnowledgeBaseRootConfigured === true}`,
    `temporary_isolated_knowledge_base_root_created: ${result.shim?.temporaryIsolatedKnowledgeBaseRootCreated === true}`,
    `operator_approved_real_root_write_proof: ${result.shim?.operatorApprovedRealRootWriteProof === true}`,
    `native_write_tools_enabled: ${result.shim?.nativeWriteToolsEnabled === true}`,
    'endpoint_disclosed: false',
    'runtime_store_path_disclosed: false',
    `fixture_embedding_provider_started: ${result.fixtureEmbeddingProvider?.started === true}`,
    `fixture_embedding_provider_api_called: ${result.fixtureEmbeddingProvider?.providerApiCalled === true}`,
    `production_provider_proof_gate_ready: ${result.productionProviderProofGate?.readyToRun === true}`,
    `production_provider_proof_gate_blockers: ${(result.productionProviderProofGate?.blockers || []).join(',') || 'none'}`,
    `operator_approved_real_root_write_proof_gate_ready: ${result.operatorApprovedRealRootWriteProofGate?.readyToRun === true}`,
    `operator_approved_real_root_write_proof_gate_blockers: ${(result.operatorApprovedRealRootWriteProofGate?.blockers || []).join(',') || 'none'}`,
    `acceptance_evidence_artifact_verified: ${result.acceptanceEvidenceArtifactVerification?.verified === true}`,
    `acceptance_evidence_artifact_valid: ${result.acceptanceEvidenceArtifactVerification?.valid === true}`,
    `product_goal_dimensions_covered: ${result.productGoalProgress?.allGovernedDimensionsCovered === true}`,
    `product_goal_ready_for_completion: ${result.productGoalProgress?.readyForCompletion === true}`,
    `product_goal_remaining_work: ${(result.productGoalProgress?.remainingWork || []).join(',') || 'none'}`,
    `product_goal_completion_proof_packet_included: ${result.productGoalCompletionProofPacket?.included === true}`,
    `runtime_precondition_operator_action: ${operatorPacket.actionCategory || 'none'}`,
    `config_env_intake_blockers: ${configEnvBlockers.join(',') || 'none'}`,
    `provider_env_file_intake_blockers: ${providerEnvFileBlockers.join(',') || 'none'}`,
    `acceptance_blockers: ${blockers.join(',') || 'none'}`,
    `native_precondition_blockers: ${diagnosisBlockers.join(',') || 'none'}`,
    'readiness_claimed: false'
  ].join('\n') + '\n';
}

async function main() {
  const options = parseArgs(process.argv.slice(2), process.env);
  const result = await runGovernedVcpNativeLiveReadProof(options);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(renderText(result));
  }
  if (result.accepted !== true) process.exitCode = 2;
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error && error.message ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildResult,
  buildProductGoalCompletionProofPacket,
  buildProductGoalProgressEvidence,
  buildOperatorApprovedRealRootWriteProofGate,
  buildProductionProviderProofGate,
  buildRuntimePreconditionOperatorPacket,
  diagnoseVcpToolBoxNativePreconditions,
  defaultStartShim,
  lowDisclosureAcceptanceEvidenceArtifactVerification,
  parseArgs,
  parseConfigEnvSubset,
  readProviderEnvFileIntake,
  readVcpConfigEnvIntake,
  runGovernedVcpNativeLiveReadProof,
  startFixtureEmbeddingProvider,
  verifyAcceptanceEvidenceArtifact
};
