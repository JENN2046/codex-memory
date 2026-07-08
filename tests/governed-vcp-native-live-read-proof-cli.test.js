'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildProductGoalCompletionProofPacket,
  buildProductGoalProgressEvidence,
  buildOperatorApprovedRealRootWriteProofGate,
  buildProductionProviderProofGate,
  buildRuntimePreconditionOperatorPacket,
  diagnoseVcpToolBoxNativePreconditions,
  parseArgs,
  parseConfigEnvSubset,
  readProviderEnvFileIntake,
  readVcpConfigEnvIntake,
  runGovernedVcpNativeLiveReadProof,
  startFixtureEmbeddingProvider
} = require('../src/cli/governed-vcp-native-live-read-proof');

function completeGovernanceEvidenceMatrix() {
  return {
    client_id: { covered: true },
    scope: { covered: true },
    visibility: { covered: true },
    runtime_target: { covered: true },
    invocation_profile: { covered: true },
    read_write_authority: { covered: true },
    output_disclosure_budget: { covered: true },
    audit_receipt: { covered: true },
    rollback_posture: { covered: true }
  };
}

test('governed VCP native live read proof starts isolated shim and returns low-disclosure accepted evidence', async () => {
  const privateEndpoint = 'http://127.0.0.1:65530/private-native-mcp';
  const privateVcpRoot = '/PRIVATE/VCPToolBox';
  const privateKbStore = '/PRIVATE/codex-memory-isolated-vcp-store';
  let stopCalled = false;
  let acceptanceEndpoint = null;

  const result = await runGovernedVcpNativeLiveReadProof({
    vcpToolBoxRoot: privateVcpRoot,
    knowledgeBaseStorePath: privateKbStore,
    projectBasePath: '/PRIVATE/codex-memory-live-proof',
    dataDir: '/PRIVATE/codex-memory-live-proof/data',
    logsDir: '/PRIVATE/codex-memory-live-proof/logs',
    projectId: 'codex-memory',
    workspaceId: 'workspace-alpha',
    scopeId: 'scope-alpha',
    visibility: 'private',
    query: 'live read proof'
  }, {
    startShim: async options => {
      assert.equal(options.vcpToolBoxRoot, privateVcpRoot);
      assert.equal(options.knowledgeBaseStorePath, privateKbStore);
      return {
        endpoint: privateEndpoint,
        isolatedRuntimeStoreConfigured: true,
        stop: async () => {
          stopCalled = true;
        }
      };
    },
    runAcceptance: async options => {
      acceptanceEndpoint = options.endpoint;
      return {
        accepted: true,
        status: 'accepted',
        summary: {
          acceptanceBlockers: {
            count: 0,
            all: []
          },
          nativeRuntimePreconditionEvidence: {
            nativeRuntimeReceiptBound: true,
            readNativeIsolatedDerivedIndexWritePerformedFromReceipt: true,
            readNativeNonIsolatedDurableWritePerformedFromReceipt: false
          }
        },
        config: {
          endpointDisclosed: false,
          tokenMaterialDisclosed: false
        },
        operations: {},
        readinessClaimed: false
      };
    },
    diagnoseNativePreconditions: async options => {
      assert.equal(options.vcpToolBoxRoot, privateVcpRoot);
      assert.equal(options.knowledgeBaseStorePath, privateKbStore);
      return {
        lowDisclosure: true,
        included: true,
        providerEnvConfigured: true,
        nativeModuleLoadSucceeded: true,
        endpointDisclosed: false,
        runtimeStorePathDisclosed: false,
        vcpToolBoxRootDisclosed: false,
        tokenMaterialDisclosed: false,
        readinessClaimed: false,
        blockers: []
      };
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(result.status, 'accepted');
  assert.equal(result.shim.started, true);
  assert.equal(result.shim.stopped, true);
  assert.equal(result.shim.isolatedRuntimeStoreConfigured, true);
  assert.equal(result.shim.endpointDisclosed, false);
  assert.equal(result.shim.runtimeStorePathDisclosed, false);
  assert.equal(result.disclosure.endpointDisclosed, false);
  assert.equal(result.disclosure.runtimeStorePathDisclosed, false);
  assert.equal(result.nativePreconditionDiagnosis.lowDisclosure, true);
  assert.deepEqual(result.nativePreconditionDiagnosis.blockers, []);
  assert.equal(result.runtimePreconditionOperatorPacket.included, false);
  assert.equal(result.runtimePreconditionOperatorPacket.operatorActionRequired, false);
  assert.equal(stopCalled, true);
  assert.equal(acceptanceEndpoint, privateEndpoint);
  assert.equal(serialized.includes(privateEndpoint), false);
  assert.equal(serialized.includes(privateVcpRoot), false);
  assert.equal(serialized.includes(privateKbStore), false);
  assert.equal(serialized.includes('/PRIVATE/codex-memory-live-proof'), false);
});

test('product goal progress marks fixture-backed accepted proof as substantive but incomplete', () => {
  const progress = buildProductGoalProgressEvidence({
    accepted: true,
    shimEvidence: {
      isolatedKnowledgeBaseRootConfigured: true,
      operatorProvidedKnowledgeBaseRootConfigured: false,
      temporaryIsolatedKnowledgeBaseRootCreated: true,
      operatorApprovedRealRootWriteProof: false,
      nativeWriteToolsEnabled: true
    },
    fixtureEmbeddingProviderEvidence: {
      included: true
    },
    nativePreconditionDiagnosis: {
      providerEnvConfigured: true
    },
    acceptanceEvidenceArtifactVerification: {
      requested: true,
      verified: true,
      valid: true,
      acceptedEvidence: true
    },
    acceptance: {
      summary: {
        governanceEvidenceMatrix: completeGovernanceEvidenceMatrix(),
        selectedOperations: [
          'search_memory',
          'record_memory',
          'tombstone_memory',
          'supersede_memory'
        ],
        nativeRuntimePreconditionEvidence: {
          nativeRuntimeReceiptBound: true,
          nativeRuntimeCalledFromReceipt: true,
          nativeProviderApiCalledFromReceipt: true,
          nativeMemoryReadPerformedFromReceipt: true,
          nativeMemoryWritePerformedFromReceipt: true,
          rollbackPostureBound: true,
          rollbackApplyAttempted: false,
          rollbackAutoApplyAllowed: false
        },
        localMemoryAuxiliaryEvidence: {
          primaryRuntime: false,
          localMemoryPrimaryRuntime: false,
          localMemoryResultCanBeMistakenForVcpNative: false,
          localMemoryRawContentDisclosed: false,
          rawLocalMemoryDisclosed: false
        }
      }
    }
  });

  assert.equal(progress.primaryRuntime, 'VCPToolBox native memory');
  assert.equal(progress.primaryValue, 'governance, not memory intelligence');
  assert.deepEqual(progress.clients, ['Codex']);
  assert.equal(progress.accessPath, 'governed MCP tools');
  assert.equal(progress.allGovernedDimensionsCovered, true);
  assert.equal(progress.acceptanceArtifactVerified, true);
  assert.equal(progress.readProofCovered, true);
  assert.equal(progress.writeSuiteProofCovered, true);
  assert.equal(progress.operatorApprovedRealRootWriteProofCovered, false);
  assert.equal(progress.operatorProvidedKnowledgeBaseRootConfigured, false);
  assert.equal(progress.temporaryIsolatedKnowledgeBaseRootCreated, true);
  assert.equal(progress.operatorApprovedRealRootWriteProof, false);
  assert.equal(progress.localMemoryAuxiliaryOnly, true);
  assert.equal(progress.validationFixtureUsed, true);
  assert.equal(progress.productionProviderLiveProofCovered, false);
  assert.equal(progress.goalCompletionClaimed, false);
  assert.equal(progress.readyForCompletion, false);
  assert.deepEqual(progress.remainingWork, [
    'operator_approved_real_root_write_proof_not_run',
    'production_provider_live_proof_missing'
  ]);
  assert.equal(progress.endpointDisclosed, false);
  assert.equal(progress.evidencePathDisclosed, false);
  assert.equal(progress.rawArtifactDisclosed, false);
  assert.equal(progress.readinessClaimed, false);
});

test('product goal progress can clear remaining work only with production provider and operator root proof', () => {
  const progress = buildProductGoalProgressEvidence({
    accepted: true,
    shimEvidence: {
      isolatedKnowledgeBaseRootConfigured: true,
      operatorProvidedKnowledgeBaseRootConfigured: true,
      temporaryIsolatedKnowledgeBaseRootCreated: false,
      operatorApprovedRealRootWriteProof: true,
      nativeWriteToolsEnabled: true
    },
    fixtureEmbeddingProviderEvidence: {
      included: false
    },
    nativePreconditionDiagnosis: {
      providerEnvConfigured: true
    },
    acceptanceEvidenceArtifactVerification: {
      requested: true,
      verified: true,
      valid: true,
      acceptedEvidence: true
    },
    acceptance: {
      summary: {
        governanceEvidenceMatrix: completeGovernanceEvidenceMatrix(),
        selectedOperations: [
          'search_memory',
          'record_memory',
          'tombstone_memory',
          'supersede_memory'
        ],
        nativeRuntimePreconditionEvidence: {
          nativeRuntimeReceiptBound: true,
          nativeRuntimeCalledFromReceipt: true,
          nativeProviderApiCalledFromReceipt: true,
          nativeMemoryReadPerformedFromReceipt: true,
          nativeMemoryWritePerformedFromReceipt: true,
          rollbackPostureBound: true,
          rollbackApplyAttempted: false,
          rollbackAutoApplyAllowed: false
        },
        localMemoryAuxiliaryEvidence: {
          primaryRuntime: false,
          localMemoryPrimaryRuntime: false,
          localMemoryResultCanBeMistakenForVcpNative: false,
          localMemoryRawContentDisclosed: false,
          rawLocalMemoryDisclosed: false
        }
      }
    }
  });

  assert.equal(progress.allGovernedDimensionsCovered, true);
  assert.equal(progress.validationFixtureUsed, false);
  assert.equal(progress.productionProviderLiveProofCovered, true);
  assert.equal(progress.operatorProvidedKnowledgeBaseRootConfigured, true);
  assert.equal(progress.temporaryIsolatedKnowledgeBaseRootCreated, false);
  assert.equal(progress.operatorApprovedRealRootWriteProof, true);
  assert.equal(progress.operatorApprovedRealRootWriteProofCovered, true);
  assert.equal(progress.readyForCompletion, true);
  assert.deepEqual(progress.remainingWork, []);
  assert.equal(progress.goalCompletionClaimed, false);
  assert.equal(progress.readinessClaimed, false);
});

test('product goal completion proof packet makes remaining proof gates explicit without disclosure', () => {
  const progress = {
    remainingWork: [
      'accepted_live_proof_missing',
      'production_provider_live_proof_missing',
      'operator_approved_real_root_write_proof_not_run',
      'acceptance_evidence_artifact_verification_missing'
    ],
    operatorProvidedKnowledgeBaseRootConfigured: false,
    operatorApprovedRealRootWriteProof: false,
    temporaryIsolatedKnowledgeBaseRootCreated: true,
    nativeRuntimeReceiptBound: true
  };
  const packet = buildProductGoalCompletionProofPacket({
    productGoalProgress: progress,
    configEnvIntakeEvidence: {
      included: true,
      providerEnvPresentAfterIntake: {
        API_URL: false,
        API_Key: false,
        WhitelistEmbeddingModel: false,
        VECTORDB_DIMENSION: true
      }
    },
    nativePreconditionDiagnosis: {
      providerEnvConfigured: false,
      nativeModuleLoadSucceeded: true,
      isolatedRuntimeStoreConfigured: true,
      isolatedRuntimeStoreWritable: true,
      providerEnvPresent: {
        API_URL: false,
        API_Key: false,
        WhitelistEmbeddingModel: false,
        VECTORDB_DIMENSION: true
      }
    }
  });
  const serialized = JSON.stringify(packet);

  assert.equal(packet.included, true);
  assert.equal(packet.packetKind, 'product_goal_completion_proof_packet');
  assert.equal(packet.productionProviderLiveProofReady, false);
  assert.equal(packet.operatorApprovedRealRootWriteProofReady, false);
  assert.deepEqual(packet.missingProviderEnvKeys, [
    'API_URL',
    'API_Key',
    'WhitelistEmbeddingModel'
  ]);
  assert.deepEqual(packet.requiredProofs.map(proof => proof.proofId).sort(), [
    'acceptance_evidence_artifact_verification',
    'accepted_live_proof',
    'operator_approved_real_root_write_proof',
    'production_provider_live_proof'
  ]);
  const acceptedProof = packet.requiredProofs.find(
    proof => proof.proofId === 'accepted_live_proof'
  );
  const productionProof = packet.requiredProofs.find(
    proof => proof.proofId === 'production_provider_live_proof'
  );
  const realRootProof = packet.requiredProofs.find(
    proof => proof.proofId === 'operator_approved_real_root_write_proof'
  );
  assert.equal(acceptedProof.readyToRun, false);
  assert.equal(acceptedProof.bridgeMayIgnoreAcceptanceFailure, false);
  assert.equal(productionProof.readyToRun, false);
  assert.equal(productionProof.bridgeMayAutoWriteProviderConfig, false);
  assert.equal(realRootProof.readyToRun, false);
  assert.equal(realRootProof.bridgeMayAutoApproveRealRootWriteProof, false);
  assert.equal(realRootProof.bridgeMayInferApprovalFromPath, false);
  assert.equal(packet.bridgeMayAutoModifyVcpToolBoxNativeCode, false);
  assert.equal(packet.bridgeMayAutoWriteConfigEnv, false);
  assert.equal(packet.bridgeMayClaimReadiness, false);
  assert.equal(packet.tokenMaterialDisclosed, false);
  assert.equal(packet.readinessClaimed, false);
  assert.equal(serialized.includes('PRIVATE_VALUE_SHOULD_NOT_LEAK'), false);
  assert.equal(serialized.includes('/PRIVATE/'), false);
});

test('product goal completion proof packet is absent when no remaining proof work exists', () => {
  const packet = buildProductGoalCompletionProofPacket({
    productGoalProgress: {
      remainingWork: [],
      operatorProvidedKnowledgeBaseRootConfigured: true,
      operatorApprovedRealRootWriteProof: true,
      temporaryIsolatedKnowledgeBaseRootCreated: false,
      nativeRuntimeReceiptBound: true
    },
    nativePreconditionDiagnosis: {
      providerEnvConfigured: true,
      nativeModuleLoadSucceeded: true,
      isolatedRuntimeStoreConfigured: true,
      isolatedRuntimeStoreWritable: true,
      providerEnvPresent: {
        API_URL: true,
        API_Key: true,
        WhitelistEmbeddingModel: true,
        VECTORDB_DIMENSION: true
      }
    }
  });

  assert.equal(packet.included, false);
  assert.equal(packet.packetKind, null);
  assert.deepEqual(packet.requiredProofs, []);
  assert.deepEqual(packet.remainingWork, []);
  assert.equal(packet.productionProviderLiveProofReady, true);
  assert.equal(packet.operatorApprovedRealRootWriteProofReady, true);
  assert.equal(packet.readinessClaimed, false);
});

test('production provider proof gate fails closed without provider env or when fixture is requested', () => {
  const gate = buildProductionProviderProofGate({
    required: true,
    fixtureEmbeddingProviderEvidence: {
      included: true
    },
    nativePreconditionDiagnosis: {
      providerEnvConfigured: false,
      nativeModuleLoadSucceeded: true,
      isolatedRuntimeStoreConfigured: true,
      isolatedRuntimeStoreWritable: true,
      providerEnvPresent: {
        API_URL: false,
        API_Key: false,
        WhitelistEmbeddingModel: false,
        VECTORDB_DIMENSION: true
      }
    }
  });
  const serialized = JSON.stringify(gate);

  assert.equal(gate.included, true);
  assert.equal(gate.readyToRun, false);
  assert.equal(gate.runtimeExecutionAllowed, false);
  assert.equal(gate.failFast, true);
  assert.equal(gate.actionCategory, 'production_provider_proof_precondition_required');
  assert.deepEqual(gate.missingProviderEnvKeys, [
    'API_URL',
    'API_Key',
    'WhitelistEmbeddingModel'
  ]);
  assert.deepEqual(gate.blockers, [
    'fixture_provider_not_allowed_for_production_proof',
    'provider_env_not_configured_for_production_proof'
  ]);
  assert.equal(gate.bridgeMayAutoWriteProviderConfig, false);
  assert.equal(gate.bridgeMayUseFixtureProvider, false);
  assert.equal(gate.bridgeMayModifyVcpToolBoxNativeCode, false);
  assert.equal(gate.tokenMaterialDisclosed, false);
  assert.equal(gate.readinessClaimed, false);
  assert.equal(serialized.includes('PRIVATE_VALUE_SHOULD_NOT_LEAK'), false);
  assert.equal(serialized.includes('/PRIVATE/'), false);
});

test('operator-approved real-root write proof gate fails closed without explicit write-suite root approval', () => {
  const gate = buildOperatorApprovedRealRootWriteProofGate({
    required: true,
    includeWriteSuite: false,
    nativeWriteToolsEnabled: false,
    operatorProvidedKnowledgeBaseRootConfigured: false,
    operatorApprovedRealRootWriteProof: false,
    temporaryIsolatedKnowledgeBaseRootCreated: true
  });
  const serialized = JSON.stringify(gate);

  assert.equal(gate.included, true);
  assert.equal(gate.readyToRun, false);
  assert.equal(gate.runtimeExecutionAllowed, false);
  assert.equal(gate.failFast, true);
  assert.equal(gate.actionCategory, 'operator_approved_real_root_write_proof_precondition_required');
  assert.deepEqual(gate.blockers, [
    'native_write_tools_not_enabled_for_real_root_write_proof',
    'operator_kb_root_not_configured_for_real_root_write_proof',
    'operator_real_root_write_approval_missing',
    'temporary_isolated_kb_root_created_for_real_root_write_proof',
    'write_suite_not_requested_for_real_root_write_proof'
  ]);
  assert.equal(gate.bridgeMayAutoApproveRealRootWriteProof, false);
  assert.equal(gate.bridgeMayInferApprovalFromPath, false);
  assert.equal(gate.bridgeMayUseTemporaryRootForRealRootProof, false);
  assert.equal(gate.bridgeMayModifyVcpToolBoxNativeCode, false);
  assert.equal(gate.knowledgeBaseRootPathDisclosed, false);
  assert.equal(gate.readinessClaimed, false);
  assert.equal(serialized.includes('/PRIVATE/'), false);
});

test('governed VCP native real-root write proof mode fails fast before provider intake or shim when root approval is missing', async () => {
  let readConfigCalled = false;
  let readProviderFileCalled = false;
  let startFixtureCalled = false;
  let diagnoseCalled = false;
  let startShimCalled = false;
  let runAcceptanceCalled = false;
  const result = await runGovernedVcpNativeLiveReadProof({
    requireOperatorApprovedRealRootWriteProof: true,
    vcpToolBoxRoot: '/PRIVATE/VCPToolBox',
    knowledgeBaseStorePath: '/PRIVATE/codex-memory-isolated-vcp-store'
  }, {
    readConfigEnvIntake: async () => {
      readConfigCalled = true;
      return { envPatch: {}, evidence: { lowDisclosure: true, included: false } };
    },
    readProviderEnvFileIntake: async () => {
      readProviderFileCalled = true;
      return { envPatch: {}, evidence: { lowDisclosure: true, included: false } };
    },
    startFixtureEmbeddingProvider: async () => {
      startFixtureCalled = true;
      return { envPatch: {}, evidence: { lowDisclosure: true, included: false } };
    },
    diagnoseNativePreconditions: async () => {
      diagnoseCalled = true;
      return { lowDisclosure: true, included: true };
    },
    startShim: async () => {
      startShimCalled = true;
      throw new Error('shim should not start');
    },
    runAcceptance: async () => {
      runAcceptanceCalled = true;
      throw new Error('acceptance should not run');
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'operator_approved_real_root_write_proof_precondition_failed');
  assert.equal(readConfigCalled, false);
  assert.equal(readProviderFileCalled, false);
  assert.equal(startFixtureCalled, false);
  assert.equal(diagnoseCalled, false);
  assert.equal(startShimCalled, false);
  assert.equal(runAcceptanceCalled, false);
  assert.equal(result.shim.started, false);
  assert.equal(result.shim.reasonCode, 'operator_approved_real_root_write_proof_precondition_failed');
  assert.equal(result.operatorApprovedRealRootWriteProofGate.included, true);
  assert.equal(result.operatorApprovedRealRootWriteProofGate.readyToRun, false);
  assert.equal(result.operatorApprovedRealRootWriteProofGate.runtimeExecutionAllowed, false);
  assert.deepEqual(result.operatorApprovedRealRootWriteProofGate.blockers, [
    'native_write_tools_not_enabled_for_real_root_write_proof',
    'operator_kb_root_not_configured_for_real_root_write_proof',
    'operator_real_root_write_approval_missing',
    'write_suite_not_requested_for_real_root_write_proof'
  ]);
  assert.equal(result.operatorApprovedRealRootWriteProofGate.bridgeMayAutoApproveRealRootWriteProof, false);
  assert.equal(result.operatorApprovedRealRootWriteProofGate.bridgeMayInferApprovalFromPath, false);
  assert.equal(result.operatorApprovedRealRootWriteProofGate.knowledgeBaseRootPathDisclosed, false);
  assert.equal(serialized.includes('/PRIVATE/VCPToolBox'), false);
  assert.equal(serialized.includes('/PRIVATE/codex-memory-isolated-vcp-store'), false);
});

test('governed VCP native real-root write proof mode allows shim only with write suite root and explicit approval', async t => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-real-root-gate-'));
  const operatorKnowledgeBaseRoot = path.join(root, 'dailynote');
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });
  let startShimCalled = false;
  let runAcceptanceCalled = false;
  const result = await runGovernedVcpNativeLiveReadProof({
    requireOperatorApprovedRealRootWriteProof: true,
    includeWriteSuite: true,
    operatorApprovedRealRootWriteProof: true,
    vcpToolBoxRoot: '/PRIVATE/VCPToolBox',
    knowledgeBaseRootPath: operatorKnowledgeBaseRoot,
    knowledgeBaseStorePath: '/PRIVATE/codex-memory-isolated-vcp-store'
  }, {
    readConfigEnvIntake: async () => ({ envPatch: {}, evidence: { lowDisclosure: true, included: false, blockers: [] } }),
    readProviderEnvFileIntake: async () => ({ envPatch: {}, evidence: { lowDisclosure: true, included: false, blockers: [] } }),
    startFixtureEmbeddingProvider: async () => ({
      envPatch: {},
      evidence: { lowDisclosure: true, included: false },
      stop: async () => ({ lowDisclosure: true, included: false })
    }),
    diagnoseNativePreconditions: async () => ({
      lowDisclosure: true,
      included: true,
      providerEnvConfigured: true,
      nativeModuleLoadSucceeded: true,
      isolatedRuntimeStoreConfigured: true,
      isolatedRuntimeStoreWritable: true,
      providerEnvPresent: {
        API_URL: true,
        API_Key: true,
        WhitelistEmbeddingModel: true,
        VECTORDB_DIMENSION: true
      },
      blockers: [],
      tokenMaterialDisclosed: false,
      endpointDisclosed: false,
      readinessClaimed: false
    }),
    startShim: async options => {
      startShimCalled = true;
      assert.equal(options.includeWriteSuite, true);
      assert.equal(options.knowledgeBaseRootPath, operatorKnowledgeBaseRoot);
      return {
        endpoint: 'http://127.0.0.1:65543/private-native-mcp',
        isolatedRuntimeStoreConfigured: true,
        stop: async () => {}
      };
    },
    runAcceptance: async options => {
      runAcceptanceCalled = true;
      assert.equal(options.includeWriteSuite, true);
      return {
        accepted: true,
        status: 'accepted',
        summary: {
          selectedOperations: [
            'search_memory',
            'record_memory',
            'tombstone_memory',
            'supersede_memory'
          ],
          acceptanceBlockers: { count: 0, all: [] }
        },
        readinessClaimed: false
      };
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(startShimCalled, true);
  assert.equal(runAcceptanceCalled, true);
  assert.equal(result.shim.operatorProvidedKnowledgeBaseRootConfigured, true);
  assert.equal(result.shim.temporaryIsolatedKnowledgeBaseRootCreated, false);
  assert.equal(result.shim.operatorApprovedRealRootWriteProof, true);
  assert.equal(result.operatorApprovedRealRootWriteProofGate.included, true);
  assert.equal(result.operatorApprovedRealRootWriteProofGate.readyToRun, true);
  assert.equal(result.operatorApprovedRealRootWriteProofGate.runtimeExecutionAllowed, true);
  assert.deepEqual(result.operatorApprovedRealRootWriteProofGate.blockers, []);
  assert.equal(result.operatorApprovedRealRootWriteProofGate.bridgeMayUseTemporaryRootForRealRootProof, false);
  assert.equal(result.operatorApprovedRealRootWriteProofGate.knowledgeBaseRootPathDisclosed, false);
  assert.equal(serialized.includes(operatorKnowledgeBaseRoot), false);
  assert.equal(serialized.includes('/PRIVATE/VCPToolBox'), false);
});

test('governed VCP native production provider proof mode fails fast before shim when preconditions are missing', async () => {
  let startFixtureCalled = false;
  let startShimCalled = false;
  let runAcceptanceCalled = false;
  const result = await runGovernedVcpNativeLiveReadProof({
    requireProductionProvider: true,
    fixtureEmbeddingProvider: true,
    vcpToolBoxRoot: '/PRIVATE/VCPToolBox',
    knowledgeBaseStorePath: '/PRIVATE/codex-memory-isolated-vcp-store'
  }, {
    readConfigEnvIntake: async () => ({
      envPatch: {},
      evidence: {
        lowDisclosure: true,
        included: false,
        providerEnvPresentAfterIntake: {
          API_URL: false,
          API_Key: false,
          WhitelistEmbeddingModel: false,
          VECTORDB_DIMENSION: false
        },
        blockers: []
      }
    }),
    readProviderEnvFileIntake: async () => ({
      envPatch: {},
      evidence: {
        lowDisclosure: true,
        included: false,
        providerEnvPresentAfterIntake: {
          API_URL: false,
          API_Key: false,
          WhitelistEmbeddingModel: false,
          VECTORDB_DIMENSION: false
        },
        blockers: []
      }
    }),
    startFixtureEmbeddingProvider: async () => {
      startFixtureCalled = true;
      return {
        envPatch: {},
        evidence: { lowDisclosure: true, included: true },
        stop: async () => ({ lowDisclosure: true, included: true })
      };
    },
    diagnoseNativePreconditions: async () => ({
      lowDisclosure: true,
      included: true,
      providerEnvConfigured: false,
      nativeModuleLoadSucceeded: true,
      isolatedRuntimeStoreConfigured: true,
      isolatedRuntimeStoreWritable: true,
      providerEnvPresent: {
        API_URL: false,
        API_Key: false,
        WhitelistEmbeddingModel: false,
        VECTORDB_DIMENSION: false
      },
      blockers: ['provider_env_not_configured'],
      tokenMaterialDisclosed: false,
      endpointDisclosed: false,
      readinessClaimed: false
    }),
    startShim: async () => {
      startShimCalled = true;
      throw new Error('shim should not start');
    },
    runAcceptance: async () => {
      runAcceptanceCalled = true;
      throw new Error('acceptance should not run');
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'production_provider_proof_precondition_failed');
  assert.equal(startFixtureCalled, false);
  assert.equal(startShimCalled, false);
  assert.equal(runAcceptanceCalled, false);
  assert.equal(result.shim.started, false);
  assert.equal(result.shim.reasonCode, 'production_provider_proof_precondition_failed');
  assert.equal(result.fixtureEmbeddingProvider.included, true);
  assert.equal(result.fixtureEmbeddingProvider.started, false);
  assert.equal(result.fixtureEmbeddingProvider.reasonCode, 'fixture_provider_not_allowed_for_production_proof');
  assert.equal(result.productionProviderProofGate.included, true);
  assert.equal(result.productionProviderProofGate.readyToRun, false);
  assert.equal(result.productionProviderProofGate.runtimeExecutionAllowed, false);
  assert.deepEqual(result.productionProviderProofGate.blockers, [
    'fixture_provider_not_allowed_for_production_proof',
    'provider_env_not_configured_for_production_proof'
  ]);
  assert.equal(result.productionProviderProofGate.bridgeMayAutoWriteProviderConfig, false);
  assert.equal(result.productionProviderProofGate.bridgeMayModifyVcpToolBoxNativeCode, false);
  assert.equal(result.productionProviderProofGate.tokenMaterialDisclosed, false);
  assert.equal(serialized.includes('/PRIVATE/VCPToolBox'), false);
  assert.equal(serialized.includes('/PRIVATE/codex-memory-isolated-vcp-store'), false);
});

test('governed VCP native production provider proof mode allows shim only after production preconditions pass', async () => {
  let startShimCalled = false;
  let runAcceptanceCalled = false;
  const result = await runGovernedVcpNativeLiveReadProof({
    requireProductionProvider: true,
    vcpToolBoxRoot: '/PRIVATE/VCPToolBox',
    knowledgeBaseStorePath: '/PRIVATE/codex-memory-isolated-vcp-store'
  }, {
    readConfigEnvIntake: async () => ({
      envPatch: {},
      evidence: { lowDisclosure: true, included: false, blockers: [] }
    }),
    readProviderEnvFileIntake: async () => ({
      envPatch: {
        API_URL: 'https://private.example.invalid',
        API_Key: 'PRIVATE_VALUE_SHOULD_NOT_LEAK',
        WhitelistEmbeddingModel: 'private-model',
        VECTORDB_DIMENSION: '3072'
      },
      evidence: {
        lowDisclosure: true,
        included: true,
        providerEnvConfiguredAfterIntake: true,
        rawProviderEnvDisclosed: false,
        tokenMaterialDisclosed: false,
        blockers: []
      }
    }),
    diagnoseNativePreconditions: async options => {
      assert.equal(options.providerEnvPatch.API_Key, 'PRIVATE_VALUE_SHOULD_NOT_LEAK');
      return {
        lowDisclosure: true,
        included: true,
        providerEnvConfigured: true,
        nativeModuleLoadSucceeded: true,
        isolatedRuntimeStoreConfigured: true,
        isolatedRuntimeStoreWritable: true,
        providerEnvPresent: {
          API_URL: true,
          API_Key: true,
          WhitelistEmbeddingModel: true,
          VECTORDB_DIMENSION: true
        },
        blockers: [],
        tokenMaterialDisclosed: false,
        endpointDisclosed: false,
        readinessClaimed: false
      };
    },
    startShim: async options => {
      startShimCalled = true;
      assert.equal(options.providerEnvPatch.API_Key, 'PRIVATE_VALUE_SHOULD_NOT_LEAK');
      return {
        endpoint: 'http://127.0.0.1:65542/private-native-mcp',
        isolatedRuntimeStoreConfigured: true,
        stop: async () => {}
      };
    },
    runAcceptance: async () => {
      runAcceptanceCalled = true;
      return {
        accepted: true,
        status: 'accepted',
        summary: {
          acceptanceBlockers: { count: 0, all: [] }
        },
        readinessClaimed: false
      };
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(startShimCalled, true);
  assert.equal(runAcceptanceCalled, true);
  assert.equal(result.productionProviderProofGate.included, true);
  assert.equal(result.productionProviderProofGate.readyToRun, true);
  assert.equal(result.productionProviderProofGate.runtimeExecutionAllowed, true);
  assert.deepEqual(result.productionProviderProofGate.blockers, []);
  assert.equal(result.fixtureEmbeddingProvider.included, false);
  assert.equal(result.productionProviderProofGate.bridgeMayUseFixtureProvider, false);
  assert.equal(result.productionProviderProofGate.tokenMaterialDisclosed, false);
  assert.equal(serialized.includes('PRIVATE_VALUE_SHOULD_NOT_LEAK'), false);
  assert.equal(serialized.includes('https://private.example.invalid'), false);
  assert.equal(serialized.includes('/PRIVATE/VCPToolBox'), false);
});

test('governed VCP native live read proof verifies acceptance evidence artifact offline', async () => {
  const privateEndpoint = 'http://127.0.0.1:65539/private-native-mcp';
  const privateEvidencePath = '/PRIVATE/codex-memory-vcp-native-evidence.json';
  let acceptanceEvidencePath = null;
  let verifierEvidencePath = null;

  const result = await runGovernedVcpNativeLiveReadProof({
    evidenceOutputPath: privateEvidencePath,
    vcpToolBoxRoot: '/PRIVATE/VCPToolBox',
    knowledgeBaseStorePath: '/PRIVATE/codex-memory-isolated-vcp-store'
  }, {
    readConfigEnvIntake: async () => ({ envPatch: {}, evidence: { lowDisclosure: true, included: false, blockers: [] } }),
    readProviderEnvFileIntake: async () => ({ envPatch: {}, evidence: { lowDisclosure: true, included: false, blockers: [] } }),
    startFixtureEmbeddingProvider: async () => ({
      envPatch: {},
      evidence: { lowDisclosure: true, included: false },
      stop: async () => ({ lowDisclosure: true, included: false })
    }),
    diagnoseNativePreconditions: async () => ({
      lowDisclosure: true,
      included: true,
      providerEnvConfigured: true,
      providerEnvPresent: {
        API_URL: true,
        API_Key: true,
        WhitelistEmbeddingModel: true,
        VECTORDB_DIMENSION: true
      },
      blockers: [],
      endpointDisclosed: false,
      tokenMaterialDisclosed: false,
      readinessClaimed: false
    }),
    startShim: async () => ({
      endpoint: privateEndpoint,
      isolatedRuntimeStoreConfigured: true,
      stop: async () => {}
    }),
    runAcceptance: async options => {
      acceptanceEvidencePath = options.evidenceOutputPath;
      return {
        accepted: true,
        status: 'accepted',
        summary: {
          acceptanceBlockers: {
            count: 0,
            all: []
          }
        },
        readinessClaimed: false
      };
    },
    verifyAcceptanceEvidenceArtifact: async evidencePath => {
      verifierEvidencePath = evidencePath;
      return {
        valid: true,
        status: 'valid_low_disclosure_evidence',
        blockers: [],
        acceptedEvidence: true,
        lowDisclosure: true,
        evidencePathDisclosed: false,
        readinessClaimed: false
      };
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(acceptanceEvidencePath, privateEvidencePath);
  assert.equal(verifierEvidencePath, privateEvidencePath);
  assert.equal(result.acceptanceEvidenceArtifactVerification.requested, true);
  assert.equal(result.acceptanceEvidenceArtifactVerification.verified, true);
  assert.equal(result.acceptanceEvidenceArtifactVerification.valid, true);
  assert.equal(result.acceptanceEvidenceArtifactVerification.acceptedEvidence, true);
  assert.equal(result.acceptanceEvidenceArtifactVerification.evidencePathDisclosed, false);
  assert.equal(result.acceptanceEvidenceArtifactVerification.rawArtifactDisclosed, false);
  assert.equal(serialized.includes(privateEvidencePath), false);
  assert.equal(serialized.includes(privateEndpoint), false);
});

test('governed VCP native live read proof fails closed when evidence artifact verification fails', async () => {
  const privateEvidencePath = '/PRIVATE/codex-memory-vcp-native-evidence.json';

  const result = await runGovernedVcpNativeLiveReadProof({
    evidenceOutputPath: privateEvidencePath,
    vcpToolBoxRoot: '/PRIVATE/VCPToolBox',
    knowledgeBaseStorePath: '/PRIVATE/codex-memory-isolated-vcp-store'
  }, {
    readConfigEnvIntake: async () => ({ envPatch: {}, evidence: { lowDisclosure: true, included: false, blockers: [] } }),
    readProviderEnvFileIntake: async () => ({ envPatch: {}, evidence: { lowDisclosure: true, included: false, blockers: [] } }),
    startFixtureEmbeddingProvider: async () => ({
      envPatch: {},
      evidence: { lowDisclosure: true, included: false },
      stop: async () => ({ lowDisclosure: true, included: false })
    }),
    diagnoseNativePreconditions: async () => ({
      lowDisclosure: true,
      included: true,
      providerEnvConfigured: true,
      providerEnvPresent: {
        API_URL: true,
        API_Key: true,
        WhitelistEmbeddingModel: true,
        VECTORDB_DIMENSION: true
      },
      blockers: [],
      endpointDisclosed: false,
      tokenMaterialDisclosed: false,
      readinessClaimed: false
    }),
    startShim: async () => ({
      endpoint: 'http://127.0.0.1:65540/private-native-mcp',
      isolatedRuntimeStoreConfigured: true,
      stop: async () => {}
    }),
    runAcceptance: async () => ({
      accepted: true,
      status: 'accepted',
      summary: {
        acceptanceBlockers: {
          count: 0,
          all: []
        }
      },
      readinessClaimed: false
    }),
    verifyAcceptanceEvidenceArtifact: async () => ({
      valid: false,
      status: 'invalid',
      blockers: ['PRIVATE/path/should/not/leak'],
      acceptedEvidence: false,
      lowDisclosure: true,
      evidencePathDisclosed: false,
      readinessClaimed: false
    })
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'not_accepted');
  assert.equal(result.acceptanceEvidenceArtifactVerification.requested, true);
  assert.equal(result.acceptanceEvidenceArtifactVerification.verified, true);
  assert.equal(result.acceptanceEvidenceArtifactVerification.valid, false);
  assert.deepEqual(result.acceptanceEvidenceArtifactVerification.blockers, [
    'unapproved_evidence_verification_blocker'
  ]);
  assert.equal(result.acceptanceEvidenceArtifactVerification.evidencePathDisclosed, false);
  assert.equal(serialized.includes(privateEvidencePath), false);
  assert.equal(serialized.includes('PRIVATE/path/should/not/leak'), false);
});

test('governed VCP native live read proof fails closed without leaking shim startup details', async () => {
  const privateVcpRoot = '/PRIVATE/VCPToolBox';
  const privateKbStore = '/PRIVATE/codex-memory-isolated-vcp-store';

  const result = await runGovernedVcpNativeLiveReadProof({
    vcpToolBoxRoot: privateVcpRoot,
    knowledgeBaseStorePath: privateKbStore
  }, {
    startShim: async () => {
      throw new Error('PRIVATE_SHIM_START_FAILURE_SHOULD_NOT_ECHO');
    },
    runAcceptance: async () => {
      throw new Error('acceptance should not run if shim startup fails');
    },
    diagnoseNativePreconditions: async () => ({
      lowDisclosure: true,
      included: true,
      providerEnvConfigured: false,
      nativeModuleLoadSucceeded: false,
      endpointDisclosed: false,
      runtimeStorePathDisclosed: false,
      vcpToolBoxRootDisclosed: false,
      tokenMaterialDisclosed: false,
      readinessClaimed: false,
      blockers: ['provider_env_not_configured', 'native_module_load_failed']
    })
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'live_read_proof_not_accepted');
  assert.equal(result.shim.started, false);
  assert.equal(result.shim.stopped, false);
  assert.equal(result.shim.reasonCode, 'shim_start_failed');
  assert.equal(result.nativePreconditionDiagnosis.providerEnvConfigured, false);
  assert.equal(result.runtimePreconditionOperatorPacket.included, true);
  assert.equal(
    result.runtimePreconditionOperatorPacket.actionCategory,
    'provider_env_configuration_required'
  );
  assert.equal(result.runtimePreconditionOperatorPacket.bridgeMayAutoModifyVcpToolBoxNativeCode, false);
  assert.equal(result.runtimePreconditionOperatorPacket.bridgeMayAutoWriteConfigEnv, false);
  assert.equal(result.runtimePreconditionOperatorPacket.rollbackApplyAttempted, false);
  assert.equal(result.runtimePreconditionOperatorPacket.tokenMaterialDisclosed, false);
  assert.deepEqual(result.nativePreconditionDiagnosis.blockers, [
    'provider_env_not_configured',
    'native_module_load_failed'
  ]);
  assert.equal(result.shim.endpointDisclosed, false);
  assert.equal(result.shim.runtimeStorePathDisclosed, false);
  assert.equal(result.disclosure.rawStderrDisclosed, false);
  assert.equal(serialized.includes('PRIVATE_SHIM_START_FAILURE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes(privateVcpRoot), false);
  assert.equal(serialized.includes(privateKbStore), false);
});

test('governed VCP native live read proof carries low-disclosure diagnosis on acceptance failure', async () => {
  const privateEndpoint = 'http://127.0.0.1:65531/private-native-mcp';
  const privateVcpRoot = '/PRIVATE/VCPToolBox';
  const privateKbStore = '/PRIVATE/codex-memory-isolated-vcp-store';
  let stopCalled = false;

  const result = await runGovernedVcpNativeLiveReadProof({
    vcpToolBoxRoot: privateVcpRoot,
    knowledgeBaseStorePath: privateKbStore
  }, {
    startShim: async () => ({
      endpoint: privateEndpoint,
      isolatedRuntimeStoreConfigured: true,
      stop: async () => {
        stopCalled = true;
      }
    }),
    runAcceptance: async () => ({
      accepted: false,
      status: 'not_accepted',
      summary: {
        acceptanceBlockers: {
          count: 1,
          all: ['native_runtime_call_failed']
        },
        nativeRuntimePreconditionEvidence: {
          nativeRuntimeCallFailed: true,
          reasonCodes: ['native_runtime_call_failed'],
          rawErrorDisclosed: false,
          tokenMaterialDisclosed: false
        }
      },
      readinessClaimed: false
    }),
    diagnoseNativePreconditions: async () => ({
      lowDisclosure: true,
      included: true,
      providerEnvConfigured: false,
      nativeModuleLoadSucceeded: true,
      configEnvPresent: true,
      configEnvRead: false,
      providerApiCalled: false,
      endpointDisclosed: false,
      runtimeStorePathDisclosed: false,
      vcpToolBoxRootDisclosed: false,
      knowledgeBaseRootPathDisclosed: false,
      tokenMaterialDisclosed: false,
      readinessClaimed: false,
      blockers: ['provider_env_not_configured']
    })
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'not_accepted');
  assert.equal(result.shim.started, true);
  assert.equal(result.shim.stopped, true);
  assert.equal(stopCalled, true);
  assert.equal(result.acceptance.summary.nativeRuntimePreconditionEvidence.nativeRuntimeCallFailed, true);
  assert.equal(result.nativePreconditionDiagnosis.configEnvRead, false);
  assert.equal(result.nativePreconditionDiagnosis.providerApiCalled, false);
  assert.deepEqual(result.nativePreconditionDiagnosis.blockers, ['provider_env_not_configured']);
  assert.equal(
    result.runtimePreconditionOperatorPacket.actionCategory,
    'provider_env_configuration_required'
  );
  assert.deepEqual(result.runtimePreconditionOperatorPacket.missingProviderEnvKeys, [
    'API_URL',
    'API_Key',
    'WhitelistEmbeddingModel',
    'VECTORDB_DIMENSION'
  ]);
  assert.equal(result.shim.endpointDisclosed, false);
  assert.equal(result.shim.runtimeStorePathDisclosed, false);
  assert.equal(result.nativePreconditionDiagnosis.endpointDisclosed, false);
  assert.equal(result.nativePreconditionDiagnosis.tokenMaterialDisclosed, false);
  assert.equal(serialized.includes(privateEndpoint), false);
  assert.equal(serialized.includes(privateVcpRoot), false);
  assert.equal(serialized.includes(privateKbStore), false);
});

test('VCP native precondition diagnosis reports buckets without reading config.env or leaking paths', async t => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-vcp-native-diagnosis-'));
  const store = path.join(root, 'isolated-store');
  await fs.mkdir(path.join(root, 'rust-vexus-lite'), { recursive: true });
  await fs.mkdir(path.join(root, 'dailynote'), { recursive: true });
  await fs.writeFile(path.join(root, 'KnowledgeBaseManager.js'), 'module.exports = {};\n');
  await fs.writeFile(path.join(root, 'EmbeddingUtils.js'), 'module.exports = {};\n');
  await fs.writeFile(path.join(root, 'rust-vexus-lite', 'index.js'), 'module.exports = {};\n');
  await fs.writeFile(path.join(root, 'config.env'), 'API_Key=PRIVATE_VALUE_SHOULD_NOT_LEAK\n');
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  const diagnosis = await diagnoseVcpToolBoxNativePreconditions({
    vcpToolBoxRoot: root,
    knowledgeBaseStorePath: store
  }, {
    env: {
      API_URL: 'https://private.example.invalid',
      API_Key: 'PRIVATE_VALUE_SHOULD_NOT_LEAK',
      WhitelistEmbeddingModel: 'private-model',
      VECTORDB_DIMENSION: '3072'
    },
    loadNativeModuleProbe: async () => true
  });
  const serialized = JSON.stringify(diagnosis);

  assert.equal(diagnosis.lowDisclosure, true);
  assert.equal(diagnosis.vcpToolBoxRootAccessible, true);
  assert.equal(diagnosis.knowledgeBaseManagerPresent, true);
  assert.equal(diagnosis.embeddingUtilsPresent, true);
  assert.equal(diagnosis.rustVexusLitePresent, true);
  assert.equal(diagnosis.rustVexusLiteIndexPresent, true);
  assert.equal(diagnosis.configEnvPresent, true);
  assert.equal(diagnosis.configEnvRead, false);
  assert.equal(diagnosis.providerEnvConfigured, true);
  assert.equal(diagnosis.providerApiCalled, false);
  assert.equal(diagnosis.isolatedRuntimeStoreWritable, true);
  assert.equal(diagnosis.nativeModuleLoadSucceeded, true);
  assert.deepEqual(diagnosis.blockers, []);
  assert.equal(serialized.includes(root), false);
  assert.equal(serialized.includes(store), false);
  assert.equal(serialized.includes('PRIVATE_VALUE_SHOULD_NOT_LEAK'), false);
  assert.equal(serialized.includes('https://private.example.invalid'), false);
});

test('VCP config.env intake is explicit, whitelisted, and low-disclosure', async t => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-vcp-config-env-intake-'));
  await fs.writeFile(path.join(root, 'config.env'), [
    'API_URL=https://private.example.invalid',
    'API_Key=PRIVATE_VALUE_SHOULD_NOT_LEAK',
    'WhitelistEmbeddingModel=private-model',
    'VECTORDB_DIMENSION=3072',
    'UNRELATED_SECRET=SHOULD_NOT_BE_PARSED'
  ].join('\n'));
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  const disabled = await readVcpConfigEnvIntake({
    vcpToolBoxRoot: root,
    useVcpConfigEnv: false
  }, {});
  assert.equal(disabled.evidence.included, false);
  assert.equal(disabled.evidence.configEnvReadAttempted, false);
  assert.deepEqual(disabled.envPatch, {});

  const enabled = await readVcpConfigEnvIntake({
    vcpToolBoxRoot: root,
    useVcpConfigEnv: true
  }, {});
  const serialized = JSON.stringify(enabled.evidence);

  assert.equal(enabled.evidence.included, true);
  assert.equal(enabled.evidence.configEnvReadAllowed, true);
  assert.equal(enabled.evidence.configEnvReadAttempted, true);
  assert.equal(enabled.evidence.configEnvPresent, true);
  assert.equal(enabled.evidence.configEnvParsed, true);
  assert.equal(enabled.evidence.providerEnvConfiguredAfterIntake, true);
  assert.equal(enabled.evidence.rawConfigDisclosed, false);
  assert.equal(enabled.evidence.configEnvPathDisclosed, false);
  assert.equal(enabled.evidence.tokenMaterialDisclosed, false);
  assert.deepEqual(enabled.evidence.blockers, []);
  assert.deepEqual(Object.keys(enabled.envPatch).sort(), [
    'API_Key',
    'API_URL',
    'VECTORDB_DIMENSION',
    'WhitelistEmbeddingModel'
  ].sort());
  assert.equal(enabled.envPatch.UNRELATED_SECRET, undefined);
  assert.equal(serialized.includes(root), false);
  assert.equal(serialized.includes('PRIVATE_VALUE_SHOULD_NOT_LEAK'), false);
  assert.equal(serialized.includes('https://private.example.invalid'), false);
  assert.equal(serialized.includes('SHOULD_NOT_BE_PARSED'), false);
});

test('provider env-file intake is explicit, whitelisted, and low-disclosure', async t => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-provider-env-file-'));
  const envFile = path.join(root, 'provider.env');
  await fs.writeFile(envFile, [
    'API_URL=https://private.example.invalid',
    'API_Key=PRIVATE_VALUE_SHOULD_NOT_LEAK',
    'WhitelistEmbeddingModel=private-model',
    'VECTORDB_DIMENSION=3072',
    'UNRELATED_SECRET=SHOULD_NOT_BE_PARSED'
  ].join('\n'));
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  const disabled = await readProviderEnvFileIntake({ providerEnvFilePath: '' }, {});
  assert.equal(disabled.evidence.included, false);
  assert.equal(disabled.evidence.providerEnvFileReadAttempted, false);
  assert.deepEqual(disabled.envPatch, {});

  const enabled = await readProviderEnvFileIntake({ providerEnvFilePath: envFile }, {});
  const serialized = JSON.stringify(enabled.evidence);

  assert.equal(enabled.evidence.included, true);
  assert.equal(enabled.evidence.providerEnvFileReadAllowed, true);
  assert.equal(enabled.evidence.providerEnvFileReadAttempted, true);
  assert.equal(enabled.evidence.providerEnvFilePresent, true);
  assert.equal(enabled.evidence.providerEnvFileParsed, true);
  assert.equal(enabled.evidence.providerEnvConfiguredAfterIntake, true);
  assert.equal(enabled.evidence.rawProviderEnvDisclosed, false);
  assert.equal(enabled.evidence.providerEnvFilePathDisclosed, false);
  assert.equal(enabled.evidence.tokenMaterialDisclosed, false);
  assert.deepEqual(enabled.evidence.blockers, []);
  assert.deepEqual(Object.keys(enabled.envPatch).sort(), [
    'API_Key',
    'API_URL',
    'VECTORDB_DIMENSION',
    'WhitelistEmbeddingModel'
  ].sort());
  assert.equal(enabled.envPatch.UNRELATED_SECRET, undefined);
  assert.equal(serialized.includes(envFile), false);
  assert.equal(serialized.includes(root), false);
  assert.equal(serialized.includes('PRIVATE_VALUE_SHOULD_NOT_LEAK'), false);
  assert.equal(serialized.includes('https://private.example.invalid'), false);
  assert.equal(serialized.includes('SHOULD_NOT_BE_PARSED'), false);
});

test('fixture embedding provider serves OpenAI-compatible embeddings with low-disclosure evidence', async () => {
  const fixture = await startFixtureEmbeddingProvider({
    fixtureEmbeddingProvider: true,
    fixtureEmbeddingDimension: 8,
    fixtureEmbeddingModel: 'fixture-model-private-name'
  });
  const response = await fetch(`${fixture.envPatch.API_URL}/v1/embeddings`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${fixture.envPatch.API_Key}`
    },
    body: JSON.stringify({
      model: fixture.envPatch.WhitelistEmbeddingModel,
      input: ['alpha', 'beta']
    })
  });
  const body = await response.json();
  const stoppedEvidence = await fixture.stop();
  const serialized = JSON.stringify(stoppedEvidence);

  assert.equal(response.ok, true);
  assert.equal(Array.isArray(body.data), true);
  assert.equal(body.data.length, 2);
  assert.equal(body.data[0].embedding.length, 8);
  assert.equal(fixture.evidence.endpointDisclosed, false);
  assert.equal(stoppedEvidence.started, true);
  assert.equal(stoppedEvidence.stopped, true);
  assert.equal(stoppedEvidence.providerApiCalled, true);
  assert.equal(stoppedEvidence.productionReadinessClaimed, false);
  assert.equal(stoppedEvidence.endpointDisclosed, false);
  assert.equal(stoppedEvidence.tokenMaterialDisclosed, false);
  assert.equal(stoppedEvidence.rawEmbeddingVectorDisclosed, false);
  assert.equal(serialized.includes(fixture.envPatch.API_URL), false);
  assert.equal(serialized.includes(fixture.envPatch.API_Key), false);
  assert.equal(serialized.includes('fixture-model-private-name'), false);
});

test('governed VCP native live read proof can use fixture embedding provider as validation fixture', async () => {
  let shimProviderEnvPatch = null;
  let fixtureStopped = false;

  const result = await runGovernedVcpNativeLiveReadProof({
    fixtureEmbeddingProvider: true,
    fixtureEmbeddingDimension: 8
  }, {
    readConfigEnvIntake: async () => ({
      envPatch: {},
      evidence: {
        lowDisclosure: true,
        included: false,
        providerEnvConfiguredAfterIntake: false,
        blockers: ['provider_env_not_configured']
      }
    }),
    readProviderEnvFileIntake: async () => ({
      envPatch: {},
      evidence: {
        lowDisclosure: true,
        included: false,
        providerEnvConfiguredAfterIntake: false,
        blockers: []
      }
    }),
    startFixtureEmbeddingProvider: async () => ({
      envPatch: {
        API_URL: 'http://127.0.0.1:65534/private-fixture',
        API_Key: 'PRIVATE_FIXTURE_KEY_SHOULD_NOT_LEAK',
        WhitelistEmbeddingModel: 'private-fixture-model',
        VECTORDB_DIMENSION: '8'
      },
      evidence: {
        lowDisclosure: true,
        included: true,
        started: true,
        stopped: false,
        providerApiCalled: false,
        endpointDisclosed: false,
        tokenMaterialDisclosed: false,
        productionReadinessClaimed: false
      },
      stop: async () => {
        fixtureStopped = true;
        return {
          lowDisclosure: true,
          included: true,
          started: true,
          stopped: true,
          providerApiCalled: true,
          endpointDisclosed: false,
          tokenMaterialDisclosed: false,
          productionReadinessClaimed: false
        };
      }
    }),
    diagnoseNativePreconditions: async options => {
      assert.equal(options.providerEnvPatch.API_Key, 'PRIVATE_FIXTURE_KEY_SHOULD_NOT_LEAK');
      return {
        lowDisclosure: true,
        included: true,
        providerEnvPresent: {
          API_URL: true,
          API_Key: true,
          WhitelistEmbeddingModel: true,
          VECTORDB_DIMENSION: true
        },
        providerEnvConfigured: true,
        tokenMaterialDisclosed: false,
        endpointDisclosed: false,
        readinessClaimed: false,
        blockers: []
      };
    },
    startShim: async options => {
      shimProviderEnvPatch = options.providerEnvPatch;
      return {
        endpoint: 'http://127.0.0.1:65535/private-native-mcp',
        isolatedRuntimeStoreConfigured: true,
        stop: async () => {}
      };
    },
    runAcceptance: async () => ({
      accepted: true,
      status: 'accepted',
      summary: {
        acceptanceBlockers: {
          count: 0,
          all: []
        }
      },
      readinessClaimed: false
    })
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(shimProviderEnvPatch.API_Key, 'PRIVATE_FIXTURE_KEY_SHOULD_NOT_LEAK');
  assert.equal(result.fixtureEmbeddingProvider.included, true);
  assert.equal(result.fixtureEmbeddingProvider.started, true);
  assert.equal(result.fixtureEmbeddingProvider.stopped, true);
  assert.equal(result.fixtureEmbeddingProvider.providerApiCalled, true);
  assert.equal(result.fixtureEmbeddingProvider.productionReadinessClaimed, false);
  assert.equal(result.runtimePreconditionOperatorPacket.included, false);
  assert.equal(result.runtimePreconditionOperatorPacket.actionCategory, null);
  assert.deepEqual(result.runtimePreconditionOperatorPacket.blockers, []);
  assert.equal(result.runtimePreconditionOperatorPacket.fixtureEmbeddingProviderIncluded, true);
  assert.equal(result.runtimePreconditionOperatorPacket.productionReadinessClaimedFromFixture, false);
  assert.equal(fixtureStopped, true);
  assert.equal(serialized.includes('PRIVATE_FIXTURE_KEY_SHOULD_NOT_LEAK'), false);
  assert.equal(serialized.includes('private-fixture-model'), false);
  assert.equal(serialized.includes('http://127.0.0.1:65534/private-fixture'), false);
});

test('governed VCP native live read proof injects explicit provider env-file after VCP config env', async () => {
  const privateVcpRoot = '/PRIVATE/VCPToolBox';
  const privateSecret = 'PRIVATE_VALUE_SHOULD_NOT_LEAK';
  let shimProviderEnvPatch = null;

  const result = await runGovernedVcpNativeLiveReadProof({
    vcpToolBoxRoot: privateVcpRoot,
    useVcpConfigEnv: true,
    providerEnvFilePath: '/PRIVATE/provider.env'
  }, {
    readConfigEnvIntake: async () => ({
      envPatch: {
        VECTORDB_DIMENSION: '3072'
      },
      evidence: {
        lowDisclosure: true,
        included: true,
        configEnvReadAllowed: true,
        configEnvReadAttempted: true,
        providerEnvConfiguredAfterIntake: false,
        rawConfigDisclosed: false,
        configEnvPathDisclosed: false,
        tokenMaterialDisclosed: false,
        readinessClaimed: false,
        blockers: ['provider_env_not_configured_after_config_env_intake']
      }
    }),
    readProviderEnvFileIntake: async (options, env) => {
      assert.equal(options.providerEnvFilePath, '/PRIVATE/provider.env');
      assert.equal(env.VECTORDB_DIMENSION, '3072');
      return {
        envPatch: {
          API_URL: 'https://private.example.invalid',
          API_Key: privateSecret,
          WhitelistEmbeddingModel: 'private-model'
        },
        evidence: {
          lowDisclosure: true,
          included: true,
          providerEnvFileReadAllowed: true,
          providerEnvFileReadAttempted: true,
          providerEnvFilePresent: true,
          providerEnvConfiguredAfterIntake: true,
          rawProviderEnvDisclosed: false,
          providerEnvFilePathDisclosed: false,
          tokenMaterialDisclosed: false,
          readinessClaimed: false,
          blockers: []
        }
      };
    },
    diagnoseNativePreconditions: async options => ({
      lowDisclosure: true,
      included: true,
      providerEnvPresent: {
        API_URL: true,
        API_Key: true,
        WhitelistEmbeddingModel: true,
        VECTORDB_DIMENSION: true
      },
      providerEnvConfigured: true,
      tokenMaterialDisclosed: false,
      endpointDisclosed: false,
      readinessClaimed: false,
      blockers: []
    }),
    startShim: async options => {
      shimProviderEnvPatch = options.providerEnvPatch;
      return {
        endpoint: 'http://127.0.0.1:65533/private-native-mcp',
        isolatedRuntimeStoreConfigured: true,
        stop: async () => {}
      };
    },
    runAcceptance: async () => ({
      accepted: true,
      status: 'accepted',
      summary: {
        acceptanceBlockers: {
          count: 0,
          all: []
        }
      },
      readinessClaimed: false
    })
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(shimProviderEnvPatch.API_Key, privateSecret);
  assert.equal(shimProviderEnvPatch.VECTORDB_DIMENSION, '3072');
  assert.equal(result.providerEnvFileIntake.included, true);
  assert.equal(result.providerEnvFileIntake.providerEnvConfiguredAfterIntake, true);
  assert.equal(result.runtimePreconditionOperatorPacket.included, false);
  assert.equal(serialized.includes(privateSecret), false);
  assert.equal(serialized.includes('https://private.example.invalid'), false);
  assert.equal(serialized.includes('/PRIVATE/provider.env'), false);
  assert.equal(serialized.includes(privateVcpRoot), false);
});

test('governed VCP native live proof enables bounded write with isolated knowledge base root', async () => {
  let startShimOptions = null;
  let acceptanceOptions = null;

  const result = await runGovernedVcpNativeLiveReadProof({
    includeWrite: true,
    fixtureEmbeddingProvider: true,
    vcpToolBoxRoot: '/PRIVATE/VCPToolBox'
  }, {
    readConfigEnvIntake: async () => ({
      envPatch: {},
      evidence: {
        lowDisclosure: true,
        included: false,
        blockers: []
      }
    }),
    readProviderEnvFileIntake: async () => ({
      envPatch: {},
      evidence: {
        lowDisclosure: true,
        included: false,
        blockers: []
      }
    }),
    startFixtureEmbeddingProvider: async () => ({
      envPatch: {
        API_URL: 'http://127.0.0.1:65536/private-fixture',
        API_Key: 'PRIVATE_FIXTURE_KEY_SHOULD_NOT_LEAK',
        WhitelistEmbeddingModel: 'private-fixture-model',
        VECTORDB_DIMENSION: '3072'
      },
      evidence: {
        lowDisclosure: true,
        included: true,
        started: true,
        stopped: false,
        providerApiCalled: false,
        endpointDisclosed: false,
        tokenMaterialDisclosed: false,
        productionReadinessClaimed: false
      },
      stop: async () => ({
        lowDisclosure: true,
        included: true,
        started: true,
        stopped: true,
        providerApiCalled: true,
        endpointDisclosed: false,
        tokenMaterialDisclosed: false,
        productionReadinessClaimed: false
      })
    }),
    diagnoseNativePreconditions: async options => {
      assert.ok(options.knowledgeBaseRootPath.includes('vcp-kb-root'));
      return {
        lowDisclosure: true,
        included: true,
        providerEnvConfigured: true,
        providerEnvPresent: {
          API_URL: true,
          API_Key: true,
          WhitelistEmbeddingModel: true,
          VECTORDB_DIMENSION: true
        },
        blockers: [],
        endpointDisclosed: false,
        tokenMaterialDisclosed: false,
        readinessClaimed: false
      };
    },
    startShim: async options => {
      startShimOptions = options;
      return {
        endpoint: 'http://127.0.0.1:65537/private-native-mcp',
        isolatedRuntimeStoreConfigured: true,
        stop: async () => {}
      };
    },
    runAcceptance: async options => {
      acceptanceOptions = options;
      return {
        accepted: true,
        status: 'accepted',
        summary: {
          acceptanceBlockers: {
            count: 0,
            all: []
          },
          writeRollbackEvidence: {
            included: true,
            lowDisclosure: true,
            rollbackPlanBound: true,
            rollbackRequired: false,
            rollbackApplyPolicy: 'not_applicable',
            rollbackApplyAttempted: false,
            rollbackAutoApplyAllowed: false,
            rollbackPlanReferenceDisclosed: false,
            rawRollbackPlanReturned: false
          }
        },
        readinessClaimed: false
      };
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(startShimOptions.includeWrite, true);
  assert.ok(startShimOptions.knowledgeBaseRootPath.includes('vcp-kb-root'));
  assert.equal(acceptanceOptions.includeWrite, true);
  assert.equal(acceptanceOptions.includeWriteSuite, false);
  assert.equal(result.shim.nativeWriteToolsEnabled, true);
  assert.equal(result.shim.isolatedKnowledgeBaseRootConfigured, true);
  assert.equal(result.shim.operatorProvidedKnowledgeBaseRootConfigured, false);
  assert.equal(result.shim.temporaryIsolatedKnowledgeBaseRootCreated, true);
  assert.equal(result.shim.operatorApprovedRealRootWriteProof, false);
  assert.equal(result.productGoalProgress.operatorApprovedRealRootWriteProofCovered, false);
  assert.equal(result.acceptance.summary.writeRollbackEvidence.included, true);
  assert.equal(result.acceptance.summary.writeRollbackEvidence.rollbackPlanBound, true);
  assert.equal(result.acceptance.summary.writeRollbackEvidence.rollbackRequired, false);
  assert.equal(serialized.includes('PRIVATE_FIXTURE_KEY_SHOULD_NOT_LEAK'), false);
  assert.equal(serialized.includes('http://127.0.0.1:65536/private-fixture'), false);
});

test('governed VCP native live proof passes write suite mode through acceptance', async () => {
  let acceptanceOptions = null;
  const result = await runGovernedVcpNativeLiveReadProof({
    includeWriteSuite: true,
    vcpToolBoxRoot: '/PRIVATE/VCPToolBox'
  }, {
    readConfigEnvIntake: async () => ({ envPatch: {}, evidence: { lowDisclosure: true, included: false, blockers: [] } }),
    readProviderEnvFileIntake: async () => ({ envPatch: {}, evidence: { lowDisclosure: true, included: false, blockers: [] } }),
    startFixtureEmbeddingProvider: async () => ({
      envPatch: {},
      evidence: { lowDisclosure: true, included: false },
      stop: async () => ({ lowDisclosure: true, included: false })
    }),
    diagnoseNativePreconditions: async options => {
      assert.ok(options.knowledgeBaseRootPath.includes('vcp-kb-root'));
      return {
        lowDisclosure: true,
        included: true,
        providerEnvConfigured: true,
        providerEnvPresent: {
          API_URL: true,
          API_Key: true,
          WhitelistEmbeddingModel: true,
          VECTORDB_DIMENSION: true
        },
        blockers: [],
        endpointDisclosed: false,
        tokenMaterialDisclosed: false,
        readinessClaimed: false
      };
    },
    startShim: async options => {
      assert.equal(options.includeWrite, true);
      assert.equal(options.includeWriteSuite, true);
      return {
        endpoint: 'http://127.0.0.1:65538/private-native-mcp',
        isolatedRuntimeStoreConfigured: true,
        stop: async () => {}
      };
    },
    runAcceptance: async options => {
      acceptanceOptions = options;
      return {
        accepted: true,
        status: 'accepted',
        summary: {
          selectedOperations: [
            'search_memory',
            'record_memory',
            'tombstone_memory',
            'supersede_memory'
          ],
          acceptanceBlockers: { count: 0, all: [] },
          writeRollbackEvidence: {
            included: true,
            operationKeys: ['write', 'tombstone', 'supersede']
          }
        },
        readinessClaimed: false
      };
    }
  });

  assert.equal(result.accepted, true);
  assert.equal(acceptanceOptions.includeWrite, true);
  assert.equal(acceptanceOptions.includeWriteSuite, true);
  assert.equal(result.shim.nativeWriteToolsEnabled, true);
  assert.equal(result.shim.isolatedKnowledgeBaseRootConfigured, true);
  assert.equal(result.shim.operatorProvidedKnowledgeBaseRootConfigured, false);
  assert.equal(result.shim.temporaryIsolatedKnowledgeBaseRootCreated, true);
  assert.equal(result.shim.operatorApprovedRealRootWriteProof, false);
  assert.deepEqual(result.acceptance.summary.writeRollbackEvidence.operationKeys, [
    'write',
    'tombstone',
    'supersede'
  ]);
});

test('governed VCP native live proof distinguishes operator-provided knowledge base root', async t => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-operator-kb-root-'));
  const operatorKnowledgeBaseRoot = path.join(root, 'dailynote');
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });
  let startShimOptions = null;
  const result = await runGovernedVcpNativeLiveReadProof({
    includeWriteSuite: true,
    vcpToolBoxRoot: '/PRIVATE/VCPToolBox',
    knowledgeBaseRootPath: operatorKnowledgeBaseRoot
  }, {
    readConfigEnvIntake: async () => ({ envPatch: {}, evidence: { lowDisclosure: true, included: false, blockers: [] } }),
    readProviderEnvFileIntake: async () => ({ envPatch: {}, evidence: { lowDisclosure: true, included: false, blockers: [] } }),
    startFixtureEmbeddingProvider: async () => ({
      envPatch: {},
      evidence: { lowDisclosure: true, included: false },
      stop: async () => ({ lowDisclosure: true, included: false })
    }),
    diagnoseNativePreconditions: async options => {
      assert.equal(options.knowledgeBaseRootPath, operatorKnowledgeBaseRoot);
      return {
        lowDisclosure: true,
        included: true,
        providerEnvConfigured: true,
        providerEnvPresent: {
          API_URL: true,
          API_Key: true,
          WhitelistEmbeddingModel: true,
          VECTORDB_DIMENSION: true
        },
        blockers: [],
        endpointDisclosed: false,
        tokenMaterialDisclosed: false,
        readinessClaimed: false
      };
    },
    startShim: async options => {
      startShimOptions = options;
      return {
        endpoint: 'http://127.0.0.1:65541/private-native-mcp',
        isolatedRuntimeStoreConfigured: true,
        stop: async () => {}
      };
    },
    runAcceptance: async () => ({
      accepted: true,
      status: 'accepted',
      summary: {
        selectedOperations: [
          'search_memory',
          'record_memory',
          'tombstone_memory',
          'supersede_memory'
        ],
        acceptanceBlockers: { count: 0, all: [] },
        writeRollbackEvidence: {
          included: true,
          operationKeys: ['write', 'tombstone', 'supersede']
        }
      },
      readinessClaimed: false
    })
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(startShimOptions.knowledgeBaseRootPath, operatorKnowledgeBaseRoot);
  assert.equal(result.shim.isolatedKnowledgeBaseRootConfigured, true);
  assert.equal(result.shim.operatorProvidedKnowledgeBaseRootConfigured, true);
  assert.equal(result.shim.temporaryIsolatedKnowledgeBaseRootCreated, false);
  assert.equal(result.shim.operatorApprovedRealRootWriteProof, false);
  assert.equal(result.productGoalProgress.operatorProvidedKnowledgeBaseRootConfigured, true);
  assert.equal(result.productGoalProgress.temporaryIsolatedKnowledgeBaseRootCreated, false);
  assert.equal(result.productGoalProgress.operatorApprovedRealRootWriteProof, false);
  assert.equal(result.productGoalProgress.operatorApprovedRealRootWriteProofCovered, false);
  assert.equal(serialized.includes(operatorKnowledgeBaseRoot), false);
});

test('governed VCP native live read proof injects explicit config.env provider env without disclosure', async () => {
  const privateVcpRoot = '/PRIVATE/VCPToolBox';
  const privateSecret = 'PRIVATE_VALUE_SHOULD_NOT_LEAK';
  let shimProviderEnvPatch = null;
  let diagnosisProviderEnvPatch = null;

  const result = await runGovernedVcpNativeLiveReadProof({
    vcpToolBoxRoot: privateVcpRoot,
    useVcpConfigEnv: true
  }, {
    readConfigEnvIntake: async () => ({
      envPatch: {
        API_URL: 'https://private.example.invalid',
        API_Key: privateSecret,
        WhitelistEmbeddingModel: 'private-model',
        VECTORDB_DIMENSION: '3072'
      },
      evidence: {
        lowDisclosure: true,
        included: true,
        configEnvReadAllowed: true,
        configEnvReadAttempted: true,
        providerEnvConfiguredAfterIntake: true,
        rawConfigDisclosed: false,
        configEnvPathDisclosed: false,
        tokenMaterialDisclosed: false,
        readinessClaimed: false,
        blockers: []
      }
    }),
    diagnoseNativePreconditions: async options => {
      diagnosisProviderEnvPatch = options.providerEnvPatch;
      return {
        lowDisclosure: true,
        included: true,
        providerEnvConfigured: true,
        tokenMaterialDisclosed: false,
        endpointDisclosed: false,
        readinessClaimed: false,
        blockers: []
      };
    },
    startShim: async options => {
      shimProviderEnvPatch = options.providerEnvPatch;
      return {
        endpoint: 'http://127.0.0.1:65532/private-native-mcp',
        isolatedRuntimeStoreConfigured: true,
        stop: async () => {}
      };
    },
    runAcceptance: async () => ({
      accepted: true,
      status: 'accepted',
      summary: {
        acceptanceBlockers: {
          count: 0,
          all: []
        }
      },
      readinessClaimed: false
    })
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(shimProviderEnvPatch.API_Key, privateSecret);
  assert.equal(diagnosisProviderEnvPatch.API_Key, privateSecret);
  assert.equal(result.configEnvIntake.included, true);
  assert.equal(result.configEnvIntake.providerEnvConfiguredAfterIntake, true);
  assert.equal(result.configEnvIntake.tokenMaterialDisclosed, false);
  assert.equal(result.runtimePreconditionOperatorPacket.included, false);
  assert.equal(serialized.includes(privateSecret), false);
  assert.equal(serialized.includes('https://private.example.invalid'), false);
  assert.equal(serialized.includes(privateVcpRoot), false);
});

test('runtime precondition operator packet formalizes provider env follow-up without leaking values', () => {
  const privateEndpoint = 'https://private.example.invalid';
  const packet = buildRuntimePreconditionOperatorPacket({
    accepted: false,
    configEnvIntakeEvidence: {
      included: true,
      configEnvReadAllowed: true,
      configEnvReadAttempted: true,
      configEnvPresent: true,
      providerEnvPresentAfterIntake: {
        API_URL: false,
        API_Key: false,
        WhitelistEmbeddingModel: false,
        VECTORDB_DIMENSION: true
      },
      providerEnvConfiguredAfterIntake: false,
      blockers: ['provider_env_not_configured_after_config_env_intake']
    },
    nativePreconditionDiagnosis: {
      providerEnvPresent: {
        API_URL: false,
        API_Key: false,
        WhitelistEmbeddingModel: false,
        VECTORDB_DIMENSION: true
      },
      providerEnvConfigured: false,
      configEnvPresent: true,
      blockers: ['provider_env_not_configured']
    },
    acceptance: {
      summary: {
        acceptanceBlockers: {
          all: ['read_native_json_rpc_error_reason_native_runtime_call_failed']
        },
        nativeRuntimePreconditionEvidence: {
          nativeRuntimeCallFailed: true
        }
      }
    }
  });
  const serialized = JSON.stringify(packet);

  assert.equal(packet.included, true);
  assert.equal(packet.packetKind, 'vcp_native_runtime_precondition_operator_packet');
  assert.equal(packet.operatorActionRequired, true);
  assert.equal(packet.packetUsableNow, true);
  assert.equal(packet.actionCategory, 'provider_env_configuration_required');
  assert.deepEqual(packet.missingProviderEnvKeys, [
    'API_URL',
    'API_Key',
    'WhitelistEmbeddingModel'
  ]);
  assert.deepEqual(packet.allowedRemediationMethods, [
    'provide_provider_env_to_live_proof_process',
    'provide_whitelisted_provider_env_file_then_rerun_with_provider_env_file',
    'populate_whitelisted_vcp_config_env_keys_then_rerun_with_use_vcp_config_env'
  ]);
  assert.equal(packet.requiredEvidenceCategory, 'fresh_governed_vcp_native_live_read_proof_with_native_runtime_receipt');
  assert.equal(packet.bridgeMayAutoModifyVcpToolBoxNativeCode, false);
  assert.equal(packet.bridgeMayAutoWriteConfigEnv, false);
  assert.equal(packet.bridgeMayCallProviderForDiagnosis, false);
  assert.equal(packet.rollbackPosture, 'no_runtime_write_to_rollback');
  assert.equal(packet.rollbackApplyAttempted, false);
  assert.equal(packet.rawConfigDisclosed, false);
  assert.equal(packet.tokenMaterialDisclosed, false);
  assert.equal(packet.readinessClaimed, false);
  assert.equal(serialized.includes(privateEndpoint), false);
  assert.equal(serialized.includes('PRIVATE_VALUE_SHOULD_NOT_LEAK'), false);
});

test('governed VCP native live read proof CLI parses isolated runtime store options', () => {
  const options = parseArgs([
    '--json',
    '--include-read-suite',
    '--include-write',
    '--approve-real-root-write-proof',
    '--require-operator-approved-real-root-write-proof',
    '--vcp-root',
    '/PRIVATE/VCPToolBox',
    '--kb-root',
    '/PRIVATE/VCPToolBox/dailynote',
    '--kb-store',
    '/PRIVATE/isolated-store',
    '--target-ref',
    'operator-vcp-toolbox-service-ref',
    '--use-vcp-config-env',
    '--provider-env-file',
    '/PRIVATE/provider.env',
    '--require-production-provider',
    '--fixture-embedding-provider',
    '--fixture-embedding-dimension',
    '8',
    '--fixture-embedding-model',
    'fixture-model',
    '--query',
    'needle',
    '--limit',
    '2'
  ], {});

  assert.equal(options.json, true);
  assert.equal(options.includeReadSuite, true);
  assert.equal(options.includeWrite, true);
  assert.equal(options.includeWriteSuite, false);
  assert.equal(options.operatorApprovedRealRootWriteProof, true);
  assert.equal(options.requireOperatorApprovedRealRootWriteProof, true);
  assert.equal(options.vcpToolBoxRoot, '/PRIVATE/VCPToolBox');
  assert.equal(options.knowledgeBaseRootPath, '/PRIVATE/VCPToolBox/dailynote');
  assert.equal(options.knowledgeBaseStorePath, '/PRIVATE/isolated-store');
  assert.equal(options.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(options.useVcpConfigEnv, true);
  assert.equal(options.providerEnvFilePath, '/PRIVATE/provider.env');
  assert.equal(options.requireProductionProvider, true);
  assert.equal(options.fixtureEmbeddingProvider, true);
  assert.equal(options.fixtureEmbeddingDimension, 8);
  assert.equal(options.fixtureEmbeddingModel, 'fixture-model');
  assert.equal(options.query, 'needle');
  assert.equal(options.limit, 2);
});

test('VCP config.env parser only accepts governed provider env keys', () => {
  const parsed = parseConfigEnvSubset([
    'API_URL="https://private.example.invalid"',
    "API_Key='PRIVATE_VALUE_SHOULD_NOT_LEAK'",
    'WhitelistEmbeddingModel=model-a',
    'VECTORDB_DIMENSION=3072',
    'UNRELATED_SECRET=ignored'
  ].join('\n'));

  assert.deepEqual(Object.keys(parsed).sort(), [
    'API_Key',
    'API_URL',
    'VECTORDB_DIMENSION',
    'WhitelistEmbeddingModel'
  ].sort());
  assert.equal(parsed.API_URL, 'https://private.example.invalid');
  assert.equal(parsed.API_Key, 'PRIVATE_VALUE_SHOULD_NOT_LEAK');
  assert.equal(parsed.UNRELATED_SECRET, undefined);
});
