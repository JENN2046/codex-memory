#!/usr/bin/env node
'use strict';

const {
  createGovernedMcpVcpNativeVcpToolBoxMcpShimServer
} = require('../core/GovernedMcpVcpNativeVcpToolBoxMcpShim');

function parseArgs(argv = [], env = process.env) {
  const options = {
    host: env.CODEX_MEMORY_VCP_TOOLBOX_NATIVE_MCP_SHIM_HOST || '127.0.0.1',
    port: normalizePort(env.CODEX_MEMORY_VCP_TOOLBOX_NATIVE_MCP_SHIM_PORT, 7615),
    vcpToolBoxRoot: env.VCPTOOLBOX_ROOT || '/home/jenn/AGENTS_OS_Workspace/runtime/VCPToolBox',
    knowledgeBaseRootPath: env.KNOWLEDGEBASE_ROOT_PATH || '',
    knowledgeBaseStorePath: env.KNOWLEDGEBASE_STORE_PATH || '',
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
    if (token === '--enable-write') {
      options.enableWrite = true;
    }
  }

  return options;
}

function normalizePort(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 65535 ? parsed : fallback;
}

async function main() {
  const options = parseArgs(process.argv.slice(2), process.env);
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
    nativeTools: ['knowledge_base.search', ...(options.enableWrite ? ['knowledge_base.record'] : [])],
    endpointDisclosed: true,
    isolatedRuntimeStoreConfigured: Boolean(options.knowledgeBaseStorePath),
    runtimeStorePathDisclosed: false,
    tokenMaterialDisclosed: false,
    readinessClaimed: false
  }) + '\n');

  const close = () => {
    server.close(() => process.exit(0));
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

module.exports = {
  normalizePort,
  parseArgs
};
