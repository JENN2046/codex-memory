#!/usr/bin/env node
'use strict';

const path = require('node:path');

const {
  createGovernedMcpVcpNativeVcpToolBoxMcpShimServer
} = require('../core/GovernedMcpVcpNativeVcpToolBoxMcpShim');
const {
  DERIVED_RUNTIME_MUTATION_POLICY
} = require('../core/DerivedRuntimeMutationLifecycle');
const {
  createProductionSelectedDiaryRuntimeHydrator
} = require('../runtime/vcp-native/production-selected-diary-hydrator');

function parseArgs(argv = [], env = process.env) {
  const options = {
    host: env.CODEX_MEMORY_VCP_TOOLBOX_NATIVE_MCP_SHIM_HOST || '127.0.0.1',
    port: normalizePort(env.CODEX_MEMORY_VCP_TOOLBOX_NATIVE_MCP_SHIM_PORT, 7615),
    vcpToolBoxRoot: env.VCPTOOLBOX_ROOT || '/home/jenn/AGENTS_OS_Workspace/runtime/VCPToolBox',
    knowledgeBaseRootPath: env.KNOWLEDGEBASE_ROOT_PATH || '',
    knowledgeBaseStorePath: env.KNOWLEDGEBASE_STORE_PATH || '',
    sourceKnowledgeBaseStorePath:
      env.CODEX_MEMORY_VCP_SOURCE_KB_STORE_PATH || '',
    diaryScopeMappingPath: env.CODEX_MEMORY_DIARY_SCOPE_MAPPING_PATH || '',
    expectedBearerToken: env.CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN || '',
    derivedRuntimeMutationPolicy: env.CODEX_MEMORY_DERIVED_RUNTIME_MUTATION_POLICY ||
      DERIVED_RUNTIME_MUTATION_POLICY,
    selectedDiaryHydrationEnabled: false,
    enableWrite: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--host') {
      options.host = argv[index + 1] || options.host;
      index += 1;
      continue;
    }
    if (token === '--port') {
      options.port = normalizePort(argv[index + 1], options.port);
      index += 1;
      continue;
    }
    if (token === '--vcp-root') {
      options.vcpToolBoxRoot = argv[index + 1] || options.vcpToolBoxRoot;
      index += 1;
      continue;
    }
    if (token === '--kb-root') {
      options.knowledgeBaseRootPath = argv[index + 1] || options.knowledgeBaseRootPath;
      index += 1;
      continue;
    }
    if (token === '--kb-store') {
      options.knowledgeBaseStorePath = argv[index + 1] || options.knowledgeBaseStorePath;
      index += 1;
      continue;
    }
    if (token === '--source-kb-store') {
      options.sourceKnowledgeBaseStorePath =
        argv[index + 1] || options.sourceKnowledgeBaseStorePath;
      index += 1;
      continue;
    }
    if (token === '--diary-scope-mapping') {
      options.diaryScopeMappingPath = argv[index + 1] || options.diaryScopeMappingPath;
      index += 1;
      continue;
    }
    if (token === '--selected-diary-hydration') {
      options.selectedDiaryHydrationEnabled = true;
      continue;
    }
    if (token === '--enable-write') {
      options.enableWrite = true;
    }
  }

  return options;
}

function configureSelectedDiaryHydration(options, {
  createHydrator = createProductionSelectedDiaryRuntimeHydrator
} = {}) {
  if (!options || typeof options !== 'object' || typeof createHydrator !== 'function') {
    throw new Error('selected_diary_hydration_cli_invalid');
  }
  if (options.selectedDiaryHydrationEnabled !== true) {
    if (options.sourceKnowledgeBaseStorePath) {
      throw new Error('selected_diary_hydration_cli_flag_required');
    }
    return options;
  }
  if (options.enableWrite === true ||
      !pathIsAbsoluteDirectoryReference(options.vcpToolBoxRoot) ||
      !pathIsAbsoluteDirectoryReference(options.knowledgeBaseRootPath) ||
      !pathIsAbsoluteDirectoryReference(options.knowledgeBaseStorePath) ||
      !pathIsAbsoluteDirectoryReference(options.sourceKnowledgeBaseStorePath)) {
    throw new Error('selected_diary_hydration_cli_boundary_invalid');
  }
  options.selectedDiaryRuntimeHydrator = createHydrator({
    sourceKnowledgeBaseStorePath: options.sourceKnowledgeBaseStorePath,
    vcpToolBoxRoot: options.vcpToolBoxRoot
  });
  if (typeof options.selectedDiaryRuntimeHydrator !== 'function') {
    throw new Error('selected_diary_hydration_cli_factory_invalid');
  }
  return options;
}

function pathIsAbsoluteDirectoryReference(value) {
  return typeof value === 'string' &&
    value.length > 1 &&
    path.isAbsolute(value) &&
    !value.includes('\u0000');
}

function normalizePort(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 65535 ? parsed : fallback;
}

async function main(
  argv = process.argv.slice(2),
  environment = process.env
) {
  const options = configureSelectedDiaryHydration(parseArgs(argv, environment));
  options.expectedBearerToken = requireExpectedBearerToken(options.expectedBearerToken);
  const server = createGovernedMcpVcpNativeVcpToolBoxMcpShimServer(options);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, options.host, () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : options.port;
  process.stdout.write(JSON.stringify({
    status: 'listening',
    endpoint: `http://${options.host}:${port}/mcp/vcp-native`,
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    nativeTools: [
      'knowledge_base.search',
      'memory_overview',
      'audit_memory',
      ...(options.enableWrite ? ['knowledge_base.record'] : [])
    ],
    endpointDisclosed: true,
    isolatedRuntimeStoreConfigured: Boolean(options.knowledgeBaseStorePath),
    selectedDiaryHydrationConfigured:
      typeof options.selectedDiaryRuntimeHydrator === 'function',
    diaryScopeMappingConfigured: Boolean(options.diaryScopeMappingPath),
    runtimeStorePathDisclosed: false,
    tokenMaterialDisclosed: false,
    readinessClaimed: false
  }) + '\n');

  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    try {
      const finalReceipt = await server.shutdownGovernedRuntime();
      process.stdout.write(JSON.stringify({
        status: 'stopped',
        derived_runtime_mutation_receipt: finalReceipt,
        rawRuntimeOutputDisclosed: false,
        runtimeStorePathDisclosed: false,
        tokenMaterialDisclosed: false,
        readinessClaimed: false
      }) + '\n');
      process.exit(0);
    } catch (error) {
      process.stderr.write(JSON.stringify({
        status: 'shutdown_failed',
        reasonCode: /^[a-z][a-z0-9_]{0,100}$/u.test(error?.message || '')
          ? error.message
          : 'governed_runtime_shutdown_failed',
        rawRuntimeOutputDisclosed: false,
        runtimeStorePathDisclosed: false,
        tokenMaterialDisclosed: false
      }) + '\n');
      process.exit(1);
    }
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error && error.message ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

function requireExpectedBearerToken(value) {
  if (typeof value !== 'string' ||
      value.length < 1 ||
      value.length > 4096 ||
      value.trim() !== value ||
      /[\r\n\u0000]/u.test(value)) {
    throw new Error('vcp_native_mcp_shim_bearer_token_required');
  }
  return value;
}

module.exports = {
  configureSelectedDiaryHydration,
  main,
  normalizePort,
  parseArgs,
  requireExpectedBearerToken
};
