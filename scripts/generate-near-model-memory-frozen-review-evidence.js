#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const {
  runGovernedVcpNativeLiveReadProof
} = require('../src/cli/governed-vcp-native-live-read-proof');
const {
  verifyGovernedVcpNativeAcceptanceEvidenceFile
} = require('../src/cli/governed-vcp-native-acceptance');
const {
  canonicalCallHash,
  evaluatePhase2MachineExecutionEvidenceManifestContract
} = require('../src/core/Phase2MachineExecutionEvidenceManifestContract');
const {
  DEFAULT_RUNTIME_ALLOWED_TOOLS,
  evaluateDefaultRuntimePolicyObservationGate
} = require('../src/core/DefaultRuntimePolicyObservationGate');
const {
  hash,
  hashJson,
  evaluatePhase9MachineObservationArtifactContract
} = require('../src/core/Phase9MachineObservationArtifactContract');
const {
  EXPECTED_EVIDENCE_REFS,
  evaluateNearModelMemoryPlanPackCanonicalReviewBundleContract,
  renderCanonicalReviewBundleMarkdown,
  sha256,
  stableCanonicalJson
} = require('../src/core/NearModelMemoryPlanPackCanonicalReviewBundleContract');

const ROOT = path.resolve(__dirname, '..');
const PLAN_DIR = path.join(ROOT, 'docs', 'near-model-memory-plan-pack');
const PHASE2_PATH = path.join(PLAN_DIR, 'phase2_machine_execution_evidence_manifest.json');
const WINDOWS_PATH = path.join(PLAN_DIR, 'windows_wsl_machine_smoke_receipt.json');
const PHASE9_PATH = path.join(PLAN_DIR, 'phase9_machine_observation_artifact.json');
const BUNDLE_PATH = path.join(PLAN_DIR, 'external_review_handoff_bundle_v2.json');
const CANONICAL_PATH = path.join(PLAN_DIR, 'external_review_handoff_bundle_canonical.md');
const CONFLICT_REPORT_PATH = path.join(PLAN_DIR, 'external_review_conflict_resolution_report.md');
const EXPECTED_TOOLS = Object.freeze([
  'audit_memory',
  'memory_overview',
  'prepare_memory_context',
  'propose_memory_delta',
  'search_memory'
]);

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (result.status !== 0) throw new Error(`git_${args[0]}_failed`);
  return result.stdout.trim();
}

function assertFrozenCheckout() {
  const sourceCommit = runGit(['rev-parse', 'HEAD']);
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) throw new Error('invalid_source_commit');
  if (runGit(['status', '--porcelain=v1']) !== '') throw new Error('worktree_not_clean_before_replay');
  return sourceCommit;
}

function runCommand(command, args, options = {}) {
  const startedAt = new Date().toISOString();
  return new Promise(resolve => {
    const child = spawn(command, args, {
      cwd: options.cwd || ROOT,
      env: options.env || process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', chunk => stdout.push(chunk));
    child.stderr.on('data', chunk => stderr.push(chunk));
    child.once('error', error => resolve({
      startedAt,
      completedAt: new Date().toISOString(),
      status: null,
      signal: null,
      stdout: Buffer.concat(stdout),
      stderr: Buffer.concat(stderr),
      errorCategory: error && error.code === 'ENOENT' ? 'not_available' : 'spawn_failed'
    }));
    child.once('exit', (status, signal) => resolve({
      startedAt,
      completedAt: new Date().toISOString(),
      status,
      signal,
      stdout: Buffer.concat(stdout),
      stderr: Buffer.concat(stderr),
      errorCategory: null
    }));
  });
}

function makeFrame(message) {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  return Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'utf8'), body]);
}

async function observeActualDefaultTools() {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'codex-memory-frozen-tools-list-'));
  const child = spawn(process.execPath, ['./src/index.js'], {
    cwd: ROOT,
    env: {
      PATH: process.env.PATH || '',
      HOME: tempRoot,
      CODEX_MEMORY_BASE_PATH: path.join(tempRoot, 'base'),
      CODEX_MEMORY_DATA_DIR: path.join(tempRoot, 'data'),
      CODEX_MEMORY_LOGS_DIR: path.join(tempRoot, 'logs'),
      CODEX_MEMORY_SECURITY_PROFILE: 'local'
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  });
  let buffer = Buffer.alloc(0);
  let stderrBytes = 0;
  const pending = new Map();
  child.stderr.on('data', chunk => { stderrBytes += chunk.length; });
  child.stdout.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const separator = buffer.indexOf('\r\n\r\n');
      if (separator < 0) return;
      const header = buffer.slice(0, separator).toString('utf8');
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) throw new Error('tools_list_missing_content_length');
      const length = Number(match[1]);
      const bodyStart = separator + 4;
      if (buffer.length < bodyStart + length) return;
      const message = JSON.parse(buffer.slice(bodyStart, bodyStart + length).toString('utf8'));
      buffer = buffer.slice(bodyStart + length);
      const receiver = pending.get(message.id);
      if (receiver) {
        pending.delete(message.id);
        receiver(message);
      }
    }
  });

  function request(id, method, params) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method.replace('/', '_')}_timeout`));
      }, 10000);
      pending.set(id, message => {
        clearTimeout(timer);
        resolve(message);
      });
      child.stdin.write(makeFrame({ jsonrpc: '2.0', id, method, params }));
    });
  }

  try {
    const initialized = await request(1, 'initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'near-model-memory-frozen-replay', version: '1' }
    });
    if (initialized.error || initialized.result?.serverInfo?.name !== 'vcp_codex_memory') {
      throw new Error('stdio_initialize_rejected');
    }
    const listed = await request(2, 'tools/list', {});
    if (listed.error || !Array.isArray(listed.result?.tools)) throw new Error('stdio_tools_list_rejected');
    const tools = listed.result.tools.map(tool => tool.name).sort();
    if (JSON.stringify(tools) !== JSON.stringify(EXPECTED_TOOLS)) throw new Error('default_tools_list_drift');
    return {
      observedAt: new Date().toISOString(),
      serverName: initialized.result.serverInfo.name,
      tools,
      sha256: hashJson(tools),
      stderrCategory: stderrBytes > 0 ? 'nonempty_redacted' : 'empty',
      rawToolSchemasCaptured: false,
      rawRuntimeOutputCaptured: false
    };
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 2000);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}

function observeWindowsBridge(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'ignore',
    windowsHide: true,
    timeout: 15000
  });
  const present = !(result.error && result.error.code === 'ENOENT');
  const passed = present && result.status === 0;
  return {
    present,
    passed,
    exitStatusCategory: passed ? 'zero' : present ? 'nonzero' : 'not_available'
  };
}

function buildCallProjection(operation, index, observedAt) {
  const receipt = operation.receipt || {};
  const native = receipt.nativeInvocation || {};
  const call = {
    safeCallRef: `CM-2077-P2-${index + 1}-${operation.toolName}`,
    toolName: operation.toolName,
    observedAt,
    accepted: operation.accepted === true,
    statusCategory: operation.status,
    targetReferenceName: receipt.targetReferenceName,
    primaryRuntime: operation.primaryRuntime,
    routeCategory: 'vcp_native_primary',
    nativeInvocationAttempted: operation.access?.runtimeCalled === true,
    nativeInvocationSucceeded: native.statusClass === 'success',
    responseShapeCategory: receipt.responseShapeCategory,
    itemCountBucket: operation.toolName === 'search_memory' ? 'zero_or_one' : 'object_not_counted',
    invocationBindingMatched: receipt.runtimeTargetBound === true && native.governanceMetadataSent === true,
    scopeBoundaryBound: receipt.scopeBoundaryBound === true,
    visibilityBound: receipt.visibilityBound === true,
    readAllowed: receipt.readAllowed === true,
    writeAllowed: receipt.writeAllowed === true,
    outputDisclosureBudgetBound: receipt.outputDisclosureBudgetBound === true,
    auditReceiptRequired: receipt.auditReceiptRequired === true,
    auditReceiptLowDisclosureBound: receipt.auditReceiptLowDisclosureBound === true,
    localAuditAppended: receipt.localAuditReceipt?.appended === true,
    localAuditStatusCategory: receipt.localAuditReceipt?.status,
    localAuditLowDisclosure: receipt.localAuditReceipt?.lowDisclosure === true,
    nativeRuntimeReceiptPresent: native.nativeRuntimeReceiptPresent === true,
    nativeRuntimeCalled: native.nativeRuntimeCalled === true,
    providerApiCalled: native.nativeProviderApiCalled === true,
    memoryReadPerformed: native.nativeMemoryReadPerformed === true,
    memoryWritePerformed: native.nativeMemoryWritePerformed === true,
    durableWritePerformed: native.nativeDurableWritePerformed === true,
    durableWriteScope: native.nativeDurableWriteScope,
    isolatedRuntimeStoreUsed: native.nativeIsolatedRuntimeStoreUsed === true,
    primaryMemoryStoreWritePerformed: native.nativePrimaryMemoryStoreWritePerformed === true,
    derivedIndexWritePerformed: native.nativeDerivedIndexWritePerformed === true,
    localFallbackUsed: operation.access?.localMemoryFallbackUsed === true,
    rawOutputReturned: operation.access?.rawOutputReturned === true,
    rawMemoryReturned: native.nativeRawMemoryContentDisclosed === true,
    rawAuditReturned: false,
    memoryContentReturned: native.nativeRawMemoryContentDisclosed === true,
    memoryIdsReturned: false,
    filesystemPathsReturned: false,
    tokenMaterialReturned: operation.access?.tokenMaterialReturned === true,
    providerPayloadReturned: native.nativeRawRuntimeOutputDisclosed === true,
    readinessClaimed: operation.readinessClaimed === true
  };
  call.receiptSummarySha256 = canonicalCallHash(call);
  return call;
}

function summarizeTestAll(result, sourceCommit) {
  if (result.status !== 0) throw new Error('test_all_failed');
  const output = result.stdout.toString('utf8');
  const suites = [...output.matchAll(/# tests (\d+)[\s\S]*?# pass (\d+)[\s\S]*?# fail (\d+)/g)]
    .map(match => ({ tests: Number(match[1]), passed: Number(match[2]), failed: Number(match[3]) }));
  const expected = [5091, 94, 6];
  if (suites.length < 3 || expected.some((count, index) => suites[index]?.passed !== count || suites[index]?.failed !== 0)) {
    throw new Error('test_all_summary_drift');
  }
  return {
    commandCategory: 'npm_test_all',
    executedAt: result.completedAt,
    exitStatusCategory: 'zero',
    passed: true,
    recordRef: `CM-2079-TEST-ALL-${sourceCommit.slice(0, 12)}`,
    suitePassCounts: expected,
    stdoutSha256: digest(result.stdout),
    stderrSha256: digest(result.stderr),
    rawOutputPersisted: false
  };
}

function summarizeGateCi(result, sourceCommit) {
  if (result.status !== 0) throw new Error('gate_ci_failed');
  const lines = result.stdout.toString('utf8').trim().split(/\r?\n/);
  const payload = JSON.parse(lines[lines.length - 1]);
  if (payload.summary?.ok !== true || payload.summary?.fixtureOnly !== true ||
      payload.summary?.noNetwork !== true || payload.summary?.noProvider !== true ||
      payload.summary?.failedChecks?.length !== 0) {
    throw new Error('gate_ci_summary_rejected');
  }
  return {
    commandCategory: 'npm_gate_ci_json',
    executedAt: result.completedAt,
    exitStatusCategory: 'zero',
    passed: true,
    recordRef: `CM-2079-GATE-CI-${sourceCommit.slice(0, 12)}`,
    fixtureOnly: true,
    noNetwork: true,
    noProvider: true,
    failedCheckCount: 0,
    resultSha256: digest(JSON.stringify(payload)),
    rawOutputPersisted: false
  };
}

async function writeJson(filePath, value) {
  await fsp.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main() {
  const sourceCommit = assertFrozenCheckout();
  const phase2ObservedAt = new Date().toISOString();
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'codex-memory-frozen-review-evidence-'));
  const acceptanceEvidencePath = path.join(tempRoot, 'phase2-acceptance-evidence.json');

  const phase2Proof = await runGovernedVcpNativeLiveReadProof({
    includeReadSuite: true,
    fixtureEmbeddingProvider: true,
    evidenceOutputPath: acceptanceEvidencePath
  });
  if (phase2Proof.accepted !== true) throw new Error('phase2_live_read_proof_rejected');
  const verifiedAcceptance = await verifyGovernedVcpNativeAcceptanceEvidenceFile(acceptanceEvidencePath);
  if (verifiedAcceptance.valid !== true || verifiedAcceptance.acceptedEvidence !== true) {
    throw new Error('phase2_acceptance_artifact_verification_failed');
  }
  const acceptanceArtifactRaw = await fsp.readFile(acceptanceEvidencePath);
  const acceptanceArtifact = JSON.parse(acceptanceArtifactRaw.toString('utf8'));
  const operationOrder = ['read', 'memoryOverview', 'audit'];
  const calls = operationOrder.map((key, index) =>
    buildCallProjection(acceptanceArtifact.operations[key], index, phase2ObservedAt));

  const windowsObservedAt = new Date().toISOString();
  const windowsReceipt = {
    schemaVersion: 1,
    taskId: 'CM-2077',
    replayTaskId: 'CM-2079',
    observedAt: windowsObservedAt,
    sourceCommit,
    worktreeClean: true,
    loadedRuntimeHead: sourceCommit,
    runtimeHeadEvidenceSource: 'local_process_executed_from_clean_frozen_checkout',
    runtimeHeadMatchesSourceCommit: true,
    platformCategory: 'linux_wsl',
    cmdBridge: observeWindowsBridge('cmd.exe', ['/c', 'exit', '0']),
    powershellBridge: observeWindowsBridge('powershell.exe', ['-NoProfile', '-Command', 'exit 0']),
    rawOutputCaptured: false,
    absolutePathCaptured: false,
    environmentValuesCaptured: false,
    completionEligible: true,
    completionBlocker: null
  };

  const phase2Manifest = {
    schemaVersion: 1,
    taskId: 'CM-2077',
    replayTaskId: 'CM-2079',
    generatedAt: new Date().toISOString(),
    generationMethod: 'sanitized_mcp_projection_captured_by_tool_orchestration',
    sourceCommit,
    sourceTree: runGit(['rev-parse', 'HEAD^{tree}']),
    worktreeClean: true,
    loadedRuntimeHead: sourceCommit,
    loadedRuntimeHeadEvidenceSource: 'local_process_executed_from_clean_frozen_checkout',
    runtimeHeadMatchesSourceCommit: true,
    runtimeDriftDisposition: 'none_clean_frozen_runtime_matched_replay',
    acceptanceArtifactSha256: digest(acceptanceArtifactRaw),
    validationFixtureUsed: true,
    productionProviderProofClaimed: false,
    calls,
    aggregate: {
      mcpCalls: 3,
      nativeReadAttempts: 3,
      nativeReadSuccesses: 3,
      providerApiCalls: 3,
      memoryReads: 3,
      memoryWrites: 0,
      primaryMemoryStoreWrites: 0,
      isolatedDerivedIndexWrites: 3,
      localAuditAppends: 3,
      localFallbackUses: 0,
      rawPrivateReturns: 0,
      readinessClaims: 0
    },
    phase2CompletionDerivation: {
      eligible: true,
      reason: 'clean_frozen_runtime_matched_machine_replay_passed',
      phase2AcceptedFromThisManifest: true
    }
  };
  const phase2Result = evaluatePhase2MachineExecutionEvidenceManifestContract(phase2Manifest, windowsReceipt);
  if (phase2Result.phase2MachineExecutionEvidenceManifestPassed !== true) {
    throw new Error(`phase2_manifest_contract_rejected:${phase2Result.blockers.join(',')}`);
  }
  const actualToolsList = await observeActualDefaultTools();
  const gate = evaluateDefaultRuntimePolicyObservationGate({
    publicToolNames: actualToolsList.tools,
    policy: {
      expansionRequested: false,
      requestedDefaultTools: DEFAULT_RUNTIME_ALLOWED_TOOLS
    },
    observation: {
      observationWindowDays: 0,
      equivalentDogfoodReviewAccepted: true
    },
    review: { externalReviewAccepted: false }
  });
  const gateSummary = {
    accepted: gate.accepted,
    status: gate.status,
    toolNames: gate.publicSurface.toolNames,
    missingDefaultTools: gate.publicSurface.missingDefaultTools,
    forbiddenDefaultTools: gate.publicSurface.forbiddenDefaultTools,
    commitMemoryDeltaPublicRegistered: gate.publicSurface.commitMemoryDeltaPublicRegistered,
    observationComplete: gate.observation.observationComplete,
    equivalentDogfoodReviewAccepted: gate.observation.equivalentDogfoodReviewAccepted,
    externalReviewAccepted: gate.externalReview.externalReviewAccepted,
    defaultExpansionAllowed: gate.policy.defaultExpansionAllowed,
    productionWriteDefaultAllowed: gate.policy.productionWriteDefaultAllowed,
    durableMutationPerformed: gate.policy.durableMutationPerformed,
    providerApiCalled: gate.policy.providerApiCalled,
    readinessClaimed: gate.policy.readinessClaimed
  };
  gateSummary.sha256 = hashJson(gateSummary);

  const testAllRaw = await runCommand('npm', ['run', 'test:all']);
  const gateCiRaw = await runCommand('npm', ['run', 'gate:ci', '--', '--json']);
  const validationExecutionRecords = {
    testAll: summarizeTestAll(testAllRaw, sourceCommit),
    gateCi: summarizeGateCi(gateCiRaw, sourceCommit)
  };

  const phase2Raw = `${JSON.stringify(phase2Manifest, null, 2)}\n`;
  const phase9Artifact = {
    schemaVersion: 1,
    taskId: 'CM-2078',
    replayTaskId: 'CM-2079',
    generatedAt: new Date().toISOString(),
    sourceCommit,
    sourceTree: runGit(['rev-parse', 'HEAD^{tree}']),
    worktreeClean: true,
    loadedRuntimeHead: sourceCommit,
    runtimeHeadEvidenceSource: 'actual_stdio_process_executed_from_clean_frozen_checkout',
    runtimeHeadMatchesSourceCommit: true,
    actualToolsList: {
      source: 'actual_stdio_initialize_and_tools_list_from_frozen_checkout',
      observedAt: actualToolsList.observedAt,
      serverName: actualToolsList.serverName,
      tools: actualToolsList.tools,
      sha256: actualToolsList.sha256,
      stderrCategory: actualToolsList.stderrCategory,
      rawToolSchemasCaptured: false,
      rawRuntimeOutputCaptured: false
    },
    defaultRuntimePolicyGateSummary: gateSummary,
    boundedDogfoodWorkflow: {
      workflowClass: 'governed_native_read_three_tool_bounded_workflow',
      phase2ManifestRef: 'docs/near-model-memory-plan-pack/phase2_machine_execution_evidence_manifest.json',
      phase2ManifestSha256: hash(phase2Raw),
      safeCallRefs: calls.map(call => call.safeCallRef),
      actualRuntimeCallsObserved: true,
      lowDisclosureOnly: true,
      validationFixtureUsed: true,
      productionProviderProofClaimed: false,
      memoryWrites: 0,
      primaryMemoryStoreWrites: 0,
      defaultRuntimeExpansions: 0
    },
    validationExecutionRecords,
    observationCompletionDerivation: {
      eligible: true,
      reason: 'clean_frozen_runtime_matched_phase2_and_validation_replay_passed',
      phase9ObservationAcceptedFromThisArtifact: true
    },
    rawOutputCaptured: false,
    privateMemoryCaptured: false,
    readinessClaimed: false
  };
  const phase9Result = evaluatePhase9MachineObservationArtifactContract(
    phase9Artifact,
    phase2Manifest,
    phase2Raw
  );
  if (phase9Result.phase9MachineObservationArtifactPassed !== true) {
    throw new Error(`phase9_artifact_contract_rejected:${phase9Result.blockers.join(',')}`);
  }
  const conflictReportBody = await fsp.readFile(CONFLICT_REPORT_PATH, 'utf8');
  const evidenceBodies = {
    [EXPECTED_EVIDENCE_REFS[0]]: phase2Raw,
    [EXPECTED_EVIDENCE_REFS[1]]: `${JSON.stringify(windowsReceipt, null, 2)}\n`,
    [EXPECTED_EVIDENCE_REFS[2]]: `${JSON.stringify(phase9Artifact, null, 2)}\n`,
    [EXPECTED_EVIDENCE_REFS[3]]: conflictReportBody
  };
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceCommit,
    sourceTree: runGit(['rev-parse', 'HEAD^{tree}']),
    worktreeClean: true,
    loadedRuntimeHead: sourceCommit,
    runtimeHeadMatchesSourceCommit: true,
    runtimeEvidenceClass: 'clean_frozen_local_process_replay',
    validationFixtureUsed: true,
    productionProviderProofClaimed: false,
    reviewDisposition: 'changes_required_fail_closed',
    reviewReferences: [
      'CM-2076-ER-20260710-H3-fba72d91-bedadb40-f18fe2de',
      'CM-ER-20260710-ddfc67d2-fba72d91-bedadb40-f18fe2de'
    ],
    evidenceEntries: [
      {
        evidenceClass: 'machine_generated_phase2_execution_manifest',
        lowDisclosureOnly: true,
        sha256: sha256(evidenceBodies[EXPECTED_EVIDENCE_REFS[0]]),
        sourceRef: EXPECTED_EVIDENCE_REFS[0]
      },
      {
        evidenceClass: 'machine_generated_windows_wsl_smoke_receipt',
        lowDisclosureOnly: true,
        sha256: sha256(evidenceBodies[EXPECTED_EVIDENCE_REFS[1]]),
        sourceRef: EXPECTED_EVIDENCE_REFS[1]
      },
      {
        evidenceClass: 'machine_generated_phase9_observation',
        lowDisclosureOnly: true,
        sha256: sha256(evidenceBodies[EXPECTED_EVIDENCE_REFS[2]]),
        sourceRef: EXPECTED_EVIDENCE_REFS[2]
      },
      {
        evidenceClass: 'fail_closed_external_review_conflict_resolution',
        lowDisclosureOnly: true,
        sha256: sha256(evidenceBodies[EXPECTED_EVIDENCE_REFS[3]]),
        sourceRef: EXPECTED_EVIDENCE_REFS[3]
      }
    ],
    effectiveDecisions: {
      externalReviewPassed: false,
      externalReviewEvidenceBundleAppliedToCompletionAudit: false,
      tagApprovalPacketPassed: false,
      phase8NativeWriteAuthorizationGranted: false
    },
    completionDerivation: {
      eligible: false,
      fullPlanPackCompleted: false,
      reason: 'machine_replay_eligible_but_four_independent_decisions_remain_false'
    },
    canonicalRenderedBundleRef: 'docs/near-model-memory-plan-pack/external_review_handoff_bundle_canonical.md',
    canonicalRenderedBundleAvailable: true,
    rawPrivateMemoryAccessed: false,
    defaultMcpExpanded: false,
    readinessClaimed: false
  };
  const bundle = {
    schemaVersion: 2,
    taskId: 'CM-2078',
    replayTaskId: 'CM-2079',
    mode: 'canonical-external-review-bundle-v2',
    canonicalPayloadSha256: sha256(stableCanonicalJson(payload)),
    payload
  };
  const bundleResult = evaluateNearModelMemoryPlanPackCanonicalReviewBundleContract(bundle, evidenceBodies);
  if (bundleResult.canonicalReviewBundlePassed !== true) {
    throw new Error(`canonical_bundle_contract_rejected:${bundleResult.blockers.join(',')}`);
  }
  await writeJson(PHASE2_PATH, phase2Manifest);
  await writeJson(WINDOWS_PATH, windowsReceipt);
  await writeJson(PHASE9_PATH, phase9Artifact);
  await writeJson(BUNDLE_PATH, bundle);
  await fsp.writeFile(CANONICAL_PATH, renderCanonicalReviewBundleMarkdown(bundle), 'utf8');

  process.stdout.write(`${JSON.stringify({
    status: 'frozen_review_evidence_generated',
    sourceCommit,
    sourceTree: payload.sourceTree,
    phase2MachineExecutionEvidenceManifestPassed: true,
    phase9MachineObservationArtifactPassed: true,
    canonicalReviewBundlePassed: true,
    canonicalPayloadSha256: bundle.canonicalPayloadSha256,
    evidenceHashes: Object.fromEntries(payload.evidenceEntries.map(entry => [entry.sourceRef, entry.sha256])),
    effectiveDecisions: payload.effectiveDecisions,
    validationExecutionRecords,
    validationFixtureUsed: true,
    productionProviderProofClaimed: false,
    primaryMemoryStoreWrites: 0,
    nativeMemoryWrites: 0,
    readinessClaimed: false
  }, null, 2)}\n`);
}

main().catch(error => {
  process.stderr.write(`frozen_review_evidence_generation_failed:${error.message}\n`);
  process.exitCode = 1;
});
