#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createCodexMemoryApplication } = require('../app');
const { createStdioServer } = require('../adapters/codex-mcp/stdio');
const { createGovernedMcpVcpNativeVcpToolBoxMcpShimServer } = require('../core/GovernedMcpVcpNativeVcpToolBoxMcpShim');
const { Phase8OneShotAuthorizationRegistry } = require('../core/Phase8OneShotNativeWriteExecutionGate');
const {
  createCm2113VcpToolBoxOwnerNativeProofGate,
  intakeCm2113AuthorizationContentDecision,
  intakeCm2113FinalExecutionReleaseDecision,
  sha256Canonical
} = require('../core/Cm2113VcpToolBoxOwnerNativeProofGate');
const {
  contentDecisionTemplateFromPacket,
  validateCm2113VcpToolBoxOwnerNativeProofPacket
} = require('../core/Cm2113VcpToolBoxOwnerNativeProofPacketContract');
const {
  DEFAULT_STORE_IDENTITY_FILENAME,
  createVcpToolBoxDailyNoteOwnerRuntimeAdapter,
  sha256
} = require('../core/VcpToolBoxDailyNoteOwnerRuntimeAdapter');
const { BOOTSTRAP_DIRECTORY_NAME } = require('../core/Cm2113VcpToolBoxOwnerRuntimeBootstrap');

const PACKET_PATH = 'docs/near-model-memory-plan-pack/phase8_vcptoolbox_owner_native_proof_execution_packet_cm2113.json';
const CONTENT_DECISION_PATH = 'docs/near-model-memory-plan-pack/phase8_vcptoolbox_owner_native_proof_content_decision_cm2113.json';
const FINAL_DECISION_PATH = 'docs/near-model-memory-plan-pack/phase8_vcptoolbox_owner_native_proof_final_release_cm2113.json';
const BOOTSTRAP_RECEIPT_PATH = 'docs/near-model-memory-plan-pack/phase8_vcptoolbox_owner_runtime_bootstrap_receipt_cm2113.json';
const EXECUTION_RECEIPT_FILENAME = 'cm2113-vcptoolbox-owner-native-proof-execution-receipt.json';

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: options.cwd || process.cwd(),
    encoding: options.encoding || 'utf8',
    maxBuffer: 2 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function gitBytes(commit, file, cwd = process.cwd()) {
  return Buffer.from(git(['show', `${commit}:${file}`], { cwd, encoding: 'buffer' }));
}

function gitIdentity(commit, file, cwd = process.cwd()) {
  const bytes = gitBytes(commit, file, cwd);
  return {
    sourceCommit: commit,
    blobOid: git(['rev-parse', `${commit}:${file}`], { cwd }).trim(),
    bytes: bytes.length,
    sha256: sha256(bytes),
    rawBytes: bytes
  };
}

function resolveGovernancePaths() {
  const common = path.resolve(git(['rev-parse', '--git-common-dir']).trim());
  const governance = path.join(common, 'codex-memory-governance');
  const bootstrapRoot = path.join(governance, BOOTSTRAP_DIRECTORY_NAME);
  return {
    common,
    governance,
    bootstrapRoot,
    runtimeRoot: path.join(bootstrapRoot, 'owner-runtime'),
    storeRoot: path.join(bootstrapRoot, 'store'),
    appStateRoot: path.join(bootstrapRoot, 'codex-app-state'),
    receiptPath: path.join(bootstrapRoot, EXECUTION_RECEIPT_FILENAME),
    registryRoot: path.join(governance, 'phase8-one-shot-authorization-registries')
  };
}

function appOverrides({ endpoint, bearerToken, appStateRoot, packet }) {
  return {
    securityProfile: 'default',
    projectBasePath: appStateRoot,
    dataDir: path.join(appStateRoot, 'data'),
    logsDir: path.join(appStateRoot, 'logs'),
    dailyNoteRootPath: path.join(appStateRoot, 'local-fallback-disabled'),
    auditLogPath: path.join(appStateRoot, 'logs', 'write-audit.jsonl'),
    recallLogPath: path.join(appStateRoot, 'logs', 'recall-audit.jsonl'),
    dbPath: path.join(appStateRoot, 'data', 'memory.sqlite'),
    vectorIndexPath: path.join(appStateRoot, 'data', 'vector-index.json'),
    chatIndexPath: path.join(appStateRoot, 'data', 'chat-index.json'),
    candidateCachePath: path.join(appStateRoot, 'data', 'candidate-cache.json'),
    allowExternalProvider: false,
    enableShadowWrites: false,
    enableVectorIndex: false,
    enableCandidateCache: false,
    autoRebuildShadowOnStart: false,
    autoRebuildActiveMemoryOnStart: false,
    mcpPublicToolNames: ['record_memory'],
    exposeControlledMutationMcpTools: false,
    exposeWriteMcpTools: true,
    governedMcpVcpNativeRuntimeProfile: 'off',
    governedMcpVcpNativeBridgeGateMode: 'strict',
    governedMcpVcpNativeReadDelegationMode: 'off',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: packet.runtimeTarget.targetReferenceName,
      targetKind: 'mcp_server',
      primaryRuntime: 'VCPToolBox native memory',
      storeReference: packet.storeReference,
      storeInstanceId: packet.storeInstanceId,
      storeIdentitySha256: packet.storeIdentitySha256
    },
    governedMcpVcpNativeHttpMcpTarget: {
      targetReferenceName: packet.runtimeTarget.targetReferenceName,
      endpoint,
      bearerToken,
      requestTimeoutMs: 30_000,
      mcpToolNameByAction: { record_memory: 'knowledge_base.record' }
    }
  };
}

async function startOwnerGateway(adapter, bearerToken) {
  const server = createGovernedMcpVcpNativeVcpToolBoxMcpShimServer({
    adapter,
    enableWrite: true,
    expectedBearerToken: bearerToken
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  const address = server.address();
  if (!address || typeof address !== 'object') throw new Error('cm2113_owner_gateway_address_invalid');
  return {
    endpoint: `http://127.0.0.1:${address.port}/mcp/vcptoolbox-owner`,
    authorizationProjection: () => server.getLowDisclosureAuthorizationProjection(),
    async close() { await new Promise(resolve => server.close(resolve)); }
  };
}

async function collectStoreProjection(storeRoot, packet) {
  const identityPath = path.join(storeRoot, DEFAULT_STORE_IDENTITY_FILENAME);
  const identityStat = await fs.lstat(identityPath);
  if (!identityStat.isFile() || identityStat.isSymbolicLink()) throw new Error('cm2113_store_identity_shape_drift');
  const identityBytes = await fs.readFile(identityPath);
  if (sha256(identityBytes) !== packet.storeIdentitySha256) throw new Error('cm2113_store_identity_drift');
  const markdown = [];
  async function walk(current, depth) {
    if (depth > 2) throw new Error('cm2113_store_depth_exceeded');
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('cm2113_store_symlink_rejected');
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(child, depth + 1);
      else if (entry.isFile() && entry.name.endsWith('.md')) markdown.push(child);
      else if (!(current === storeRoot && entry.name === DEFAULT_STORE_IDENTITY_FILENAME)) {
        throw new Error('cm2113_store_unexpected_file');
      }
    }
  }
  await walk(storeRoot, 0);
  if (markdown.length !== 1) throw new Error('cm2113_store_markdown_count_mismatch');
  const bytes = await fs.readFile(markdown[0]);
  return {
    accepted: bytes.length === packet.durableBytes && sha256(bytes) === packet.durableSha256,
    storeIdentityMatched: true,
    recordCount: 1,
    durableBytes: bytes.length,
    durableSha256: sha256(bytes),
    rawMemoryReturned: false,
    rawPathDisclosed: false
  };
}

async function runCm2113Runtime(packetCommit, contentCommit, finalCommit) {
  for (const value of [packetCommit, contentCommit, finalCommit]) {
    if (!/^[a-f0-9]{40}$/.test(value || '')) throw new Error('cm2113_git_commit_argument_required');
  }
  const packetIdentity = gitIdentity(packetCommit, PACKET_PATH);
  const packet = JSON.parse(packetIdentity.rawBytes.toString('utf8'));
  const packetContract = validateCm2113VcpToolBoxOwnerNativeProofPacket(packet);
  if (!packetContract.accepted) throw new Error('cm2113_packet_contract_rejected');
  const executionPacketGitIdentity = {
    sourceCommit: packetIdentity.sourceCommit,
    blobOid: packetIdentity.blobOid,
    bytes: packetIdentity.bytes,
    sha256: packetIdentity.sha256
  };
  const bootstrapIdentity = gitIdentity(
    packet.bootstrapReceiptGitIdentity.sourceCommit,
    BOOTSTRAP_RECEIPT_PATH
  );
  const observedBootstrapIdentity = {
    sourceCommit: bootstrapIdentity.sourceCommit,
    blobOid: bootstrapIdentity.blobOid,
    bytes: bootstrapIdentity.bytes,
    sha256: bootstrapIdentity.sha256
  };
  if (JSON.stringify(observedBootstrapIdentity) !== JSON.stringify(packet.bootstrapReceiptGitIdentity)) {
    throw new Error('cm2113_bootstrap_receipt_git_identity_mismatch');
  }
  const bootstrapReceipt = JSON.parse(bootstrapIdentity.rawBytes.toString('utf8'));
  if (
    bootstrapReceipt.result !== 'PASS' || bootstrapReceipt.finalState !== 'CONSUMED_SUCCESS' ||
    bootstrapReceipt.memoryIntelligenceOwner !== 'VCPToolBox' ||
    bootstrapReceipt.runtimeIdentitySha256 !== packet.runtimeIdentitySha256 ||
    bootstrapReceipt.storeIdentitySha256 !== packet.storeIdentitySha256 ||
    bootstrapReceipt.markdownCount !== 0 || bootstrapReceipt.nativeWrites !== 0 ||
    bootstrapReceipt.recordMemoryCalls !== 0 || bootstrapReceipt.authorizationConsumed !== true ||
    bootstrapReceipt.authorizationReplayAllowed !== false
  ) throw new Error('cm2113_bootstrap_receipt_rejected');

  const head = git(['rev-parse', 'HEAD']).trim();
  const tree = git(['show', '-s', '--format=%T', 'HEAD']).trim();
  const clean = git(['status', '--porcelain']).trim() === '';
  if (head !== packet.implementation.commit || tree !== packet.implementation.tree || !clean) {
    throw new Error('cm2113_runtime_checkout_binding_mismatch');
  }

  const contentIdentity = gitIdentity(contentCommit, CONTENT_DECISION_PATH);
  const finalIdentity = gitIdentity(finalCommit, FINAL_DECISION_PATH);
  const contentDecision = JSON.parse(contentIdentity.rawBytes.toString('utf8'));
  const releaseDecision = JSON.parse(finalIdentity.rawBytes.toString('utf8'));
  const contentDecisionTemplate = contentDecisionTemplateFromPacket(packet);
  const contentExpected = {
    contentDecisionReference: packet.contentDecisionReference,
    contentDecision: contentDecisionTemplate,
    executionPacketGitIdentity
  };
  const contentIntake = intakeCm2113AuthorizationContentDecision({
    decision: contentDecision,
    expected: contentExpected,
    gitIdentity: contentIdentity
  });
  const finalExpected = {
    ...contentExpected,
    finalReleaseDecisionReference: packet.finalReleaseDecisionReference,
    contentDecisionGitIdentity: contentIntake.gitIdentity
  };
  const releaseIntake = intakeCm2113FinalExecutionReleaseDecision({
    decision: releaseDecision,
    expected: finalExpected,
    gitIdentity: finalIdentity
  });
  if (!contentIntake.accepted || !releaseIntake.accepted) throw new Error('cm2113_decision_intake_rejected');
  const expected = {
    ...finalExpected,
    executionBinding: {
      implementation: packet.implementation,
      ownerRuntime: packet.ownerRuntime,
      transport: packet.transport,
      store: contentDecisionTemplate.store,
      payload: contentDecisionTemplate.payload,
      bootstrapReceiptGitIdentity: packet.bootstrapReceiptGitIdentity,
      governanceRootIdentitySha256: packet.governanceRootIdentitySha256
    },
    allowedScope: packet.allowedScope,
    runtimeTarget: packet.runtimeTarget,
    rollbackPlanReference: packet.rollbackPlanReference,
    durableBytes: packet.durableBytes,
    durableSha256: packet.durableSha256
  };

  const paths = resolveGovernancePaths();
  const vcpRepo = path.resolve(process.cwd(), '../../runtime/VCPToolBox');
  const vcpHead = git(['rev-parse', 'HEAD'], { cwd: vcpRepo }).trim();
  const vcpTree = git(['show', '-s', '--format=%T', 'HEAD'], { cwd: vcpRepo }).trim();
  if (vcpHead !== packet.ownerRuntime.runtimeSourceCommit || vcpTree !== packet.ownerRuntime.runtimeSourceTree) {
    throw new Error('cm2113_vcptoolbox_source_binding_mismatch');
  }
  for (const [sourcePath, expectedBlob, expectedSha] of [
    ['Plugin/DailyNote/dailynote.js', packet.ownerRuntime.pluginBlobOid, packet.ownerRuntime.pluginSha256],
    ['Plugin/DailyNote/plugin-manifest.json', packet.ownerRuntime.manifestBlobOid, packet.ownerRuntime.manifestSha256],
    ['package-lock.json', packet.ownerRuntime.dependencyLockBlobOid, packet.ownerRuntime.dependencyLockSha256]
  ]) {
    if (
      git(['rev-parse', `HEAD:${sourcePath}`], { cwd: vcpRepo }).trim() !== expectedBlob ||
      sha256(gitBytes('HEAD', sourcePath, vcpRepo)) !== expectedSha
    ) throw new Error('cm2113_vcptoolbox_git_object_binding_mismatch');
  }
  const dotenvPath = require.resolve('dotenv', { paths: [vcpRepo] });
  const dotenvPackagePath = path.join(vcpRepo, 'node_modules', 'dotenv', 'package.json');
  const dotenvPackageBytes = await fs.readFile(dotenvPackagePath);
  const dotenvPackage = JSON.parse(dotenvPackageBytes.toString('utf8'));
  if (
    dotenvPackage.version !== packet.ownerRuntime.dotenvVersion ||
    sha256(dotenvPackageBytes) !== packet.ownerRuntime.dotenvPackageSha256 ||
    sha256(await fs.readFile(dotenvPath)) !== packet.ownerRuntime.dotenvMainSha256
  ) throw new Error('cm2113_vcptoolbox_dependency_binding_mismatch');

  const ownerExpected = {
    ...packet.ownerRuntime,
    runtimeIdentitySha256: packet.runtimeIdentitySha256,
    storeIdentitySha256: packet.storeIdentitySha256,
    storeReference: packet.storeReference,
    storeInstanceId: packet.storeInstanceId,
    lifecycleReference: packet.lifecycleReference,
    recordArgumentsCanonicalSha256: packet.payloadCanonicalSha256,
    durableMarkdownSha256: packet.durableSha256
  };
  const adapter = createVcpToolBoxDailyNoteOwnerRuntimeAdapter({
    runtimeRoot: paths.runtimeRoot,
    storeRoot: paths.storeRoot,
    dependencyRoot: path.join(vcpRepo, 'node_modules'),
    fixedRecord: packet.fixedRecord,
    expected: ownerExpected
  });
  await adapter.preflight();
  const bearerToken = crypto.randomBytes(32).toString('hex');
  const gateway = await startOwnerGateway(adapter, bearerToken);
  const overrides = appOverrides({ endpoint: gateway.endpoint, bearerToken, appStateRoot: paths.appStateRoot, packet });
  const rootIdentity = JSON.parse(await fs.readFile(path.join(paths.registryRoot, '.phase8-registry-root-identity.json'), 'utf8'));
  const registry = new Phase8OneShotAuthorizationRegistry({
    governanceRoot: paths.registryRoot,
    rootIdentity,
    identity: packet.authorizationRegistryIdentity
  });
  const gate = createCm2113VcpToolBoxOwnerNativeProofGate({ registry, expected });
  const app = createCodexMemoryApplication({
    ...overrides,
    phase8OneShotNativeWriteEnforcementEnabled: true,
    phase8OneShotAuthorizationAssertionVerifier: gate.verifyAssertion
  });
  await app.initialize();
  let callResolve;
  let callReject;
  const callResult = new Promise((resolve, reject) => { callResolve = resolve; callReject = reject; });
  const originalCallTool = app.callTool.bind(app);
  app.callTool = async (...args) => {
    try {
      const result = await originalCallTool(...args);
      if (args[0] === 'record_memory') callResolve(result);
      return result;
    } catch (error) {
      if (args[0] === 'record_memory') callReject(error);
      throw error;
    }
  };

  try {
    const execution = await gate.execute({
      contentDecision: contentIntake.decision,
      releaseDecision: releaseIntake.decision,
      executeNativeWrite: async ({ assertion }) => {
        createStdioServer({
          app,
          input: process.stdin,
          output: process.stdout,
          baseRequestContext: {
            executionContext: packet.executionContext,
            phase8OneShotAuthorizationAssertion: assertion,
            auditReceipt: { receiptId: releaseDecision.authorization.receiptId },
            rollbackPosture: { mode: 'bounded_rollback_plan', rollbackPlanRef: packet.rollbackPlanReference },
            outputDisclosureBudget: { level: 'summary', lowDisclosure: true, rawOutput: false, maxItems: 5, maxBytes: 4096 }
          }
        });
        return callResult;
      },
      verifyWrite: async () => collectStoreProjection(paths.storeRoot, packet)
    });
    const storeProjection = execution.verifyResult || null;
    const native = execution.nativeResult?.receipt?.nativeInvocationReceipt?.nativeRuntimeReceipt || {};
    const gatewayAuthorization = gateway.authorizationProjection();
    const transportAuthorizationMatched = gatewayAuthorization.authorizationRequired === true &&
      gatewayAuthorization.authorizedRequestCount === 1 &&
      gatewayAuthorization.rejectedAuthorizationCount === 0;
    if (execution.accepted && !transportAuthorizationMatched) {
      throw new Error('cm2113_inner_transport_authorization_not_matched');
    }
    const receipt = {
      schemaVersion: 1,
      taskId: 'CM-2113',
      receiptType: 'vcptoolbox_owner_native_proof_execution_receipt',
      result: execution.accepted ? 'PASS' : 'STOPPED',
      finalState: execution.state,
      implementation: packet.implementation,
      executionPacketGitIdentity,
      contentDecisionGitIdentity: contentIntake.gitIdentity,
      finalReleaseDecisionGitIdentity: releaseIntake.gitIdentity,
      memoryIntelligenceOwner: native.memoryIntelligenceOwner || null,
      ownerRuntimeComponent: native.ownerRuntimeComponent || null,
      ownerRuntimeCommunication: native.ownerRuntimeCommunication || null,
      ownerRuntimeSourceCommitMatched: native.ownerRuntimeSourceCommitMatched === true,
      ownerRuntimeSourceTreeMatched: native.ownerRuntimeSourceTreeMatched === true,
      ownerRuntimePluginBlobMatched: native.ownerRuntimePluginBlobMatched === true,
      ownerRuntimeManifestBlobMatched: native.ownerRuntimeManifestBlobMatched === true,
      outerTransport: 'stdio_mcp_process',
      outerTransportProcessBoundary: true,
      innerTransport: execution.nativeResult?.receipt?.nativeInvocationReceipt?.transportCategory || null,
      innerTransportAuthorizationMatched: transportAuthorizationMatched,
      ownerRuntimeTransport: native.ownerRuntimeCommunication || null,
      stableStoreIdentityMatched: native.stableStoreIdentityMatched === true && storeProjection?.storeIdentityMatched === true,
      storeIdentitySha256: packet.storeIdentitySha256,
      durableBytes: storeProjection?.durableBytes || null,
      durableSha256: storeProjection?.durableSha256 || null,
      authorizationUseCount: 1,
      authorizationConsumed: execution.authorizationConsumed === true,
      authorizationReplayAllowed: false,
      nativeWriteCalls: execution.nativeWriteCalls,
      verifyOperations: execution.verifyOperations,
      localFallbackUsed: false,
      providerCalled: false,
      automaticRetryPerformed: false,
      rollbackOrCompensationPerformed: false,
      realMemoryRead: false,
      realMemoryModified: false,
      rawMemoryReturned: false,
      rawAuditReturned: false,
      rawPathDisclosed: false,
      endpointDisclosed: false,
      tokenMaterialDisclosed: false,
      phase8Completed: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    };
    await fs.writeFile(paths.receiptPath, JSON.stringify(receipt), { flag: 'wx' });
    return receipt;
  } finally {
    await app.close().catch(() => {});
    await gateway.close().catch(() => {});
  }
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (require.main === module) {
  runCm2113Runtime(arg('--packet-commit'), arg('--content-decision-commit'), arg('--final-release-decision-commit'))
    .then(async () => {
      while (process.stdout.writableLength > 0) await new Promise(resolve => setTimeout(resolve, 5));
    })
    .catch(error => {
      process.stderr.write(`${String(error?.message || '').startsWith('cm2113_') ? error.message : 'cm2113_runtime_failed'}\n`);
      process.exitCode = 1;
    });
}

module.exports = {
  BOOTSTRAP_RECEIPT_PATH,
  EXECUTION_RECEIPT_FILENAME,
  PACKET_PATH,
  CONTENT_DECISION_PATH,
  FINAL_DECISION_PATH,
  resolveGovernancePaths,
  runCm2113Runtime
};
