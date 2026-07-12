#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const {
  createCm2113StdioMcpFrameClient,
  executeCm2113RecordMemoryStdioSequence
} = require('../core/Cm2113StdioMcpTransport');
const { sha256 } = require('../core/VcpToolBoxDailyNoteOwnerRuntimeAdapter');
const { validateCm2113VcpToolBoxOwnerNativeProofPacket } = require('../core/Cm2113VcpToolBoxOwnerNativeProofPacketContract');
const {
  PACKET_PATH,
  CONTENT_DECISION_PATH,
  FINAL_DECISION_PATH,
  EXECUTION_RECEIPT_FILENAME,
  resolveGovernancePaths
} = require('./cm2113-vcptoolbox-owner-native-proof-runtime');

const TRANSPORT_RECEIPT_FILENAME = 'cm2113-vcptoolbox-owner-native-proof-transport-receipt.json';

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: options.cwd || process.cwd(),
    encoding: options.encoding || 'utf8',
    maxBuffer: 2 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function gitBytes(commit, file) {
  return Buffer.from(git(['show', `${commit}:${file}`], { encoding: 'buffer' }));
}

function gitIdentity(commit, file) {
  const bytes = gitBytes(commit, file);
  return {
    sourceCommit: commit,
    blobOid: git(['rev-parse', `${commit}:${file}`]).trim(),
    bytes: bytes.length,
    sha256: sha256(bytes)
  };
}

async function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

async function runCm2113ProofController(packetCommit, contentCommit, finalCommit) {
  for (const value of [packetCommit, contentCommit, finalCommit]) {
    if (!/^[a-f0-9]{40}$/.test(value || '')) throw new Error('cm2113_controller_git_commit_argument_required');
  }
  const packetIdentity = gitIdentity(packetCommit, PACKET_PATH);
  const packet = JSON.parse(gitBytes(packetCommit, PACKET_PATH).toString('utf8'));
  const packetContract = validateCm2113VcpToolBoxOwnerNativeProofPacket(packet);
  if (!packetContract.accepted) throw new Error('cm2113_controller_packet_contract_rejected');
  const contentIdentity = gitIdentity(contentCommit, CONTENT_DECISION_PATH);
  const finalIdentity = gitIdentity(finalCommit, FINAL_DECISION_PATH);
  const paths = resolveGovernancePaths();
  const receiptPath = path.join(paths.bootstrapRoot, EXECUTION_RECEIPT_FILENAME);
  const transportReceiptPath = path.join(paths.bootstrapRoot, TRANSPORT_RECEIPT_FILENAME);
  for (const candidate of [receiptPath, transportReceiptPath]) {
    try {
      await fs.lstat(candidate);
      throw new Error('cm2113_controller_receipt_already_exists');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  const runtimeScript = path.join(__dirname, 'cm2113-vcptoolbox-owner-native-proof-runtime.js');
  const child = spawn(process.execPath, [
    runtimeScript,
    '--packet-commit', packetCommit,
    '--content-decision-commit', contentCommit,
    '--final-release-decision-commit', finalCommit
  ], {
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH || '/usr/bin:/bin',
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
      TZ: 'Asia/Shanghai',
      GIT_CONFIG_NOSYSTEM: '1',
      NODE_NO_WARNINGS: '1'
    },
    shell: false,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  let stderrBytes = 0;
  let safeStderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => {
    stderrBytes += Buffer.byteLength(chunk, 'utf8');
    if (Buffer.byteLength(safeStderr, 'utf8') <= 1024) safeStderr += chunk;
  });
  const exitPromise = waitForExit(child);
  const client = createCm2113StdioMcpFrameClient({ input: child.stdin, output: child.stdout, processBoundary: true, timeoutMs: 60_000 });
  let transportResult;
  try {
    transportResult = await executeCm2113RecordMemoryStdioSequence({ client, arguments: packet.recordArguments });
  } catch (error) {
    child.kill('SIGKILL');
    await exitPromise.catch(() => {});
    client.close();
    const safeReason = safeStderr.trim();
    if (/^cm2113_[a-z0-9_]+$/.test(safeReason)) throw new Error(safeReason);
    throw error;
  } finally {
    child.stdin.end();
  }
  const exit = await exitPromise;
  client.close();
  if (exit.code !== 0) throw new Error('cm2113_controller_runtime_child_failed');
  const receiptBytes = await fs.readFile(receiptPath);
  const receipt = JSON.parse(receiptBytes.toString('utf8'));
  if (
    receipt.result !== 'PASS' ||
    receipt.finalState !== 'CONSUMED_SUCCESS' ||
    receipt.memoryIntelligenceOwner !== 'VCPToolBox' ||
    receipt.ownerRuntimeComponent !== 'DailyNote' ||
    receipt.outerTransportProcessBoundary !== true ||
    receipt.innerTransport !== 'local_http_transport' ||
    receipt.innerTransportAuthorizationMatched !== true ||
    receipt.stableStoreIdentityMatched !== true ||
    receipt.durableSha256 !== packet.durableSha256 ||
    receipt.nativeWriteCalls !== 1 ||
    receipt.verifyOperations !== 1
  ) throw new Error('cm2113_controller_execution_receipt_rejected');
  for (const [observed, expected] of [
    [receipt.executionPacketGitIdentity, packetIdentity],
    [receipt.contentDecisionGitIdentity, contentIdentity],
    [receipt.finalReleaseDecisionGitIdentity, finalIdentity]
  ]) {
    if (JSON.stringify(observed) !== JSON.stringify(expected)) {
      throw new Error('cm2113_controller_decision_chain_mismatch');
    }
  }
  if (stderrBytes !== 0) throw new Error('cm2113_controller_runtime_stderr_present');
  const controllerReceipt = {
    schemaVersion: 1,
    result: 'PASS',
    taskId: 'CM-2113',
    receiptType: 'vcptoolbox_owner_native_proof_transport_receipt',
    executionPacketGitIdentity: packetIdentity,
    contentDecisionGitIdentity: contentIdentity,
    finalReleaseDecisionGitIdentity: finalIdentity,
    executionReceiptSha256: sha256(receiptBytes),
    memoryIntelligenceOwner: receipt.memoryIntelligenceOwner,
    ownerRuntimeComponent: receipt.ownerRuntimeComponent,
    ownerRuntimeCommunication: receipt.ownerRuntimeCommunication,
    outerTransport: transportResult.receipt.outerTransport,
    outerTransportProcessBoundary: transportResult.receipt.processBoundary,
    contentLengthFramesSent: transportResult.receipt.framesSent,
    contentLengthFramesReceived: transportResult.receipt.framesReceived,
    exposedToolNames: transportResult.receipt.exposedToolNames,
    recordMemoryCallCount: transportResult.receipt.recordMemoryCallCount,
    directApplicationCallByClient: transportResult.receipt.directApplicationCallByClient,
    innerTransport: receipt.innerTransport,
    innerTransportAuthorizationMatched: receipt.innerTransportAuthorizationMatched,
    stableStoreIdentityMatched: receipt.stableStoreIdentityMatched,
    durableBytes: receipt.durableBytes,
    durableSha256: receipt.durableSha256,
    authorizationConsumed: receipt.authorizationConsumed,
    authorizationReplayAllowed: false,
    nativeWriteCalls: receipt.nativeWriteCalls,
    verifyOperations: receipt.verifyOperations,
    runtimeChildStderrPresent: stderrBytes > 0,
    localFallbackUsed: false,
    providerCalled: false,
    rollbackOrCompensationPerformed: false,
    realMemoryRead: false,
    rawPathDisclosed: false,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    phase8Completed: false,
    readinessClaimed: false
  };
  if (
    controllerReceipt.contentLengthFramesSent !== 3 ||
    controllerReceipt.contentLengthFramesReceived !== 3 ||
    JSON.stringify(controllerReceipt.exposedToolNames) !== JSON.stringify(['record_memory']) ||
    controllerReceipt.recordMemoryCallCount !== 1 ||
    controllerReceipt.directApplicationCallByClient !== false
  ) throw new Error('cm2113_controller_transport_receipt_rejected');
  await fs.writeFile(transportReceiptPath, JSON.stringify(controllerReceipt), { flag: 'wx' });
  return controllerReceipt;
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (require.main === module) {
  runCm2113ProofController(arg('--packet-commit'), arg('--content-decision-commit'), arg('--final-release-decision-commit'))
    .then(result => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch(error => {
      process.stderr.write(`${String(error?.message || '').startsWith('cm2113_') ? error.message : 'cm2113_controller_failed'}\n`);
      process.exitCode = 1;
    });
}

module.exports = { TRANSPORT_RECEIPT_FILENAME, runCm2113ProofController };
