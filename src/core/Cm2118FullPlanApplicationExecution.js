'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  DECISION_PATH: CONTENT_DECISION_PATH,
  DECISION_MARKDOWN_PATH: CONTENT_DECISION_MARKDOWN_PATH,
  DECISION_READINESS_FIELDS,
  buildExpectedAfterBytes,
  evaluateDecision,
  gitBlobOid,
  sameJson,
  serializeArtifact,
  sha256
} = require('./Cm2117ExactFullPlanApplicationDecision');
const {
  canonicalize,
  sha256Canonical
} = require('./Cm2115CanonicalFullPlanEvidenceSnapshot');

const TASK_ID = 'CM-2118';
const FINAL_RELEASE_TASK_ID = 'CM-2119';
const PACKET_PATH = 'docs/near-model-memory-plan-pack/cm2118_full_plan_application_execution_packet.json';
const PACKET_MARKDOWN_PATH = PACKET_PATH.replace(/\.json$/, '.md');
const FINAL_RELEASE_PATH = 'docs/near-model-memory-plan-pack/cm2119_full_plan_final_execution_release.json';
const FINAL_RELEASE_MARKDOWN_PATH = FINAL_RELEASE_PATH.replace(/\.json$/, '.md');
const APPLICATION_STATE_PATH = 'docs/near-model-memory-plan-pack/cm2116_full_plan_application_state.json';
const EXECUTION_RECEIPT_FILENAME = 'cm2118-full-plan-application-execution-receipt-001.json';
const BINDING_RECEIPT_FILENAME = 'cm2118-full-plan-application-commit-binding-receipt-001.json';
const REGISTRY_REFERENCE = 'cm2116-full-plan-application-registry-001';
const NONCE = 'cm2116-full-plan-application-001';
const RECEIPT_ID = 'cm2116-full-plan-application-receipt-001';
const ACTION = 'apply_exact_full_plan_completion_state';
const FINAL_RELEASE_APPROVED_AT = '2026-07-12T18:00:00+08:00';
const FINAL_RELEASE_EXPIRES_AT = '2026-07-19T18:00:00+08:00';

const GOVERNANCE_ROOT_IDENTITY = Object.freeze({
  registryRootInstanceId: 'cm2093-phase8-governance-root-instance-001',
  registryRootReference: 'codex-memory-phase8-governance-root',
  registryRootReinitializationAllowed: false,
  registryRootReplacementAllowed: false
});
const GOVERNANCE_ROOT_IDENTITY_SHA256 = '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0';

const CONTENT_DECISION_FREEZE = Object.freeze({
  reference: 'CM-2117-EXACT-FULL-PLAN-APPLICATION-CONTENT-DECISION-7591EFB0-F6B7F9A5-249C9BA1',
  commit: 'b1245149e2b94248a39213737ea05adae4d53f5e',
  tree: 'f59b578a039e1fc615e6c8e3bbb83a826b833792',
  parentCommit: '249c9ba173b1849ef59bef2410e3d874e1750f31',
  parentTree: 'f993c3a2abf0cd17bddb90c418cb06cf95e6cdfe',
  diffPathsSha256: 'bc443d2ad9ce5e89d4cb1a95056fdfe6f307fb01b902adcc28f4a7936ff0c08a',
  diffEntriesSha256: '73ffa5f64f8bbe38f6faebe12d5671a2818039f4b240d70d5b43fdb9fac60fda',
  canonicalPayloadSha256: '50ae5da8e81885abf2f45af87d41bef19ea0cb355999cd76449f52ed53c22a5a',
  patchPayloadSha256: '988386ae254f401e7e682ba4b09f26a0dc5ba96bee3c7a68200cbe4218cc49bd',
  json: Object.freeze({
    path: CONTENT_DECISION_PATH,
    blobOid: '8427d80c60cf49b96a0b84a24300cba41b5049b3',
    bytes: 18810,
    sha256: '1d4feb41e67e5439a84122ec149d7b35c7495b803c1af2d1e6b2842b660f6a27'
  }),
  markdown: Object.freeze({
    path: CONTENT_DECISION_MARKDOWN_PATH,
    blobOid: '51d5d3df69fca4e647cf8d866d27436e61c51c57',
    bytes: 19419,
    sha256: '18e959fb39acd9f5ee518cb9e6cc8fce49bfe3ceb5f5b3469a2da2d1ae50341c'
  })
});

const IMPLEMENTATION_PARENT_FREEZE = Object.freeze({
  commit: 'd04ee13f854eb4396da17bfee0d46adf588b0832',
  tree: '50b1baf196d199f13691f2a9d153a51799cece59'
});

const IMPLEMENTATION_DIFF_PATHS = Object.freeze([
  'package.json',
  'scripts/generate-cm2118-full-plan-application-execution-packet.js',
  'scripts/generate-cm2119-full-plan-final-execution-release.js',
  'src/cli/cm2118-full-plan-application.js',
  'src/core/Cm2118FullPlanApplicationExecution.js',
  'tests/cm2118-full-plan-application-execution.test.js'
]);

const IMPLEMENTATION_ARTIFACT_PATHS = Object.freeze([
  ...IMPLEMENTATION_DIFF_PATHS,
  'scripts/cm2115-r2-git.js',
  'scripts/generate-cm2116-exact-full-plan-application-gate.js',
  'src/core/Cm2115CanonicalFullPlanEvidenceSnapshot.js',
  'src/core/Cm2116ExactFullPlanApplicationGate.js',
  'src/core/Cm2117ExactFullPlanApplicationDecision.js'
]);
const IMPLEMENTATION_KEYS = Object.freeze([
  'commit',
  'tree',
  'parentCommit',
  'parentTree',
  'diffPaths',
  'diffPathsSha256',
  'diffEntries',
  'diffEntriesSha256',
  'artifacts'
]);

const STATUS_SYNC_PATHS = Object.freeze([
  '.agent_board/AUTOPILOT_LEDGER.md',
  '.agent_board/CHECKPOINT.md',
  '.agent_board/CURRENT_FACTS.json',
  '.agent_board/HANDOFF.md',
  '.agent_board/RUN_STATE.md',
  '.agent_board/TASK_QUEUE.md',
  '.agent_board/VALIDATION_LOG.md',
  'CURRENT_STATE.md',
  'STATUS.md'
]);

const PACKET_DIFF_PATHS = Object.freeze([PACKET_PATH, PACKET_MARKDOWN_PATH]);
const FINAL_RELEASE_DIFF_PATHS = Object.freeze([FINAL_RELEASE_PATH, FINAL_RELEASE_MARKDOWN_PATH]);
const APPLICATION_DIFF_PATHS = Object.freeze([
  'docs/near-model-memory-plan-pack/06_ACCEPTANCE_MATRIX.md',
  'docs/near-model-memory-plan-pack/07_CAPABILITY_MATRIX.md',
  APPLICATION_STATE_PATH,
  'docs/near-model-memory-plan-pack/completion_audit_report.md',
  'docs/near-model-memory-plan-pack/evidence_trace_matrix_report.md'
].sort());
const APPLICATION_DIFF_ENTRIES = Object.freeze(APPLICATION_DIFF_PATHS.map(sourcePath => ({
  status: sourcePath === APPLICATION_STATE_PATH ? 'A' : 'M',
  path: sourcePath
})));

const machineBoundContentDecisions = new WeakSet();
const machineBoundExecutionPackets = new WeakSet();
const machineBoundFinalReleases = new WeakSet();
const UNSAFE_GIT_ENV_KEYS = Object.freeze(new Set([
  'GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_NAMESPACE', 'GIT_REPLACE_REF_BASE', 'GIT_SHALLOW_FILE',
  'GIT_GRAFT_FILE', 'GIT_NO_REPLACE_OBJECTS', 'GIT_PREFIX', 'GIT_IMPLICIT_WORK_TREE',
  'GIT_QUARANTINE_PATH', 'GIT_CONFIG', 'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_SYSTEM',
  'GIT_CONFIG_NOSYSTEM', 'GIT_CONFIG_PARAMETERS', 'GIT_CONFIG_COUNT', 'GIT_CEILING_DIRECTORIES',
  'GIT_DISCOVERY_ACROSS_FILESYSTEM', 'GIT_EXEC_PATH'
]));

function unsafeGitEnvironmentKeys(env = process.env) {
  return Object.keys(env).filter(key => UNSAFE_GIT_ENV_KEYS.has(key) ||
    /^GIT_CONFIG_(?:KEY|VALUE)_\d+$/.test(key));
}

function assertSafeGitEnvironment(env = process.env) {
  const keys = unsafeGitEnvironmentKeys(env);
  if (keys.length) throw new Error(`cm2118_unsafe_git_environment:${keys.sort().join(',')}`);
  return true;
}

function sanitizedGitEnvironment(env = process.env) {
  const result = { ...env };
  for (const key of unsafeGitEnvironmentKeys(result)) delete result[key];
  return result;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Buffer.isBuffer(value) || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function wrapPayload(payload, type, taskId = TASK_ID) {
  return {
    schemaVersion: 1,
    taskId,
    artifactType: type,
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function identityWithoutContent(value) {
  const { content, ...identity } = value;
  return identity;
}

function expectedAddEntries(paths) {
  return [...paths].sort().map(sourcePath => ({ status: 'A', path: sourcePath }));
}

function expectedImplementationEntries() {
  return [...IMPLEMENTATION_DIFF_PATHS].sort().map(sourcePath => ({
    status: sourcePath === 'package.json' ? 'M' : 'A',
    path: sourcePath
  }));
}

function expectedFinalReleaseEntries() {
  return expectedAddEntries(FINAL_RELEASE_DIFF_PATHS);
}

function verifyIdentity(actual, expected, blockers, label) {
  if (!actual || actual.sourcePath !== expected.path || actual.gitMode !== '100644' ||
      actual.gitObjectType !== 'blob' || actual.blobOid !== expected.blobOid ||
      actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256 ||
      !Buffer.isBuffer(actual.content) || gitBlobOid(actual.content) !== expected.blobOid ||
      sha256(actual.content) !== expected.sha256) blockers.push(label);
}

function validResolvers(options, names) {
  return names.every(name => typeof options?.[name] === 'function');
}

function intakeContentDecision(options = {}) {
  const blockers = [];
  const required = ['resolveCommitTree', 'resolveParentCommit', 'resolveDiffPaths', 'resolveDiffEntries',
    'resolveGitFile', 'resolveGitPathState', 'resolveDurableClaim', 'isCommitAncestor'];
  if (!validResolvers(options, required)) return { accepted: false, blockers: ['contentDecision.gitResolversRequired'] };
  let decision = null;
  let jsonIdentity = null;
  let markdownIdentity = null;
  try {
    const paths = options.resolveDiffPaths(CONTENT_DECISION_FREEZE.parentCommit, CONTENT_DECISION_FREEZE.commit).sort();
    const entries = options.resolveDiffEntries(CONTENT_DECISION_FREEZE.parentCommit, CONTENT_DECISION_FREEZE.commit)
      .sort((a, b) => a.path.localeCompare(b.path));
    if (options.resolveCommitTree(CONTENT_DECISION_FREEZE.commit) !== CONTENT_DECISION_FREEZE.tree ||
        options.resolveParentCommit(CONTENT_DECISION_FREEZE.commit) !== CONTENT_DECISION_FREEZE.parentCommit ||
        options.resolveCommitTree(CONTENT_DECISION_FREEZE.parentCommit) !== CONTENT_DECISION_FREEZE.parentTree ||
        !sameJson(paths, [CONTENT_DECISION_PATH, CONTENT_DECISION_MARKDOWN_PATH].sort()) ||
        sha256Canonical(paths) !== CONTENT_DECISION_FREEZE.diffPathsSha256 ||
        !sameJson(entries, expectedAddEntries([CONTENT_DECISION_PATH, CONTENT_DECISION_MARKDOWN_PATH])) ||
        sha256Canonical(entries) !== CONTENT_DECISION_FREEZE.diffEntriesSha256) {
      blockers.push('contentDecision.lineageOrDiff');
    }
    jsonIdentity = options.resolveGitFile(CONTENT_DECISION_FREEZE.commit, CONTENT_DECISION_PATH);
    markdownIdentity = options.resolveGitFile(CONTENT_DECISION_FREEZE.commit, CONTENT_DECISION_MARKDOWN_PATH);
    verifyIdentity(jsonIdentity, CONTENT_DECISION_FREEZE.json, blockers, 'contentDecision.jsonGitObject');
    verifyIdentity(markdownIdentity, CONTENT_DECISION_FREEZE.markdown, blockers, 'contentDecision.markdownGitObject');
    decision = JSON.parse(jsonIdentity.content.toString('utf8'));
    if (decision.canonicalPayloadSha256 !== CONTENT_DECISION_FREEZE.canonicalPayloadSha256 ||
        decision.payload?.decisionReference !== CONTENT_DECISION_FREEZE.reference ||
        decision.payload?.patchPlan?.patchPayloadSha256 !== CONTENT_DECISION_FREEZE.patchPayloadSha256 ||
        !markdownIdentity.content.toString('utf8').includes(jsonIdentity.content.toString('utf8').trimEnd())) {
      blockers.push('contentDecision.exactFrozenContent');
    }
    const evaluation = evaluateDecision(decision, options);
    if (!evaluation.accepted || evaluation.applicationExecutionAuthorized !== false ||
        evaluation.fullPlanPackCompleted !== false || evaluation.readinessClaimed !== false) {
      blockers.push(...evaluation.blockers.map(item => `contentDecision.${item}`));
      blockers.push('contentDecision.nonExecutableBoundary');
    }
  } catch {
    blockers.push('contentDecision.unreadable');
  }
  const accepted = blockers.length === 0;
  if (accepted) {
    deepFreeze(decision);
    machineBoundContentDecisions.add(decision);
  }
  return {
    accepted,
    blockers: [...new Set(blockers)],
    decision,
    jsonIdentity,
    markdownIdentity,
    contentDecisionMachineBound: accepted,
    applicationExecutionAuthorized: false
  };
}

function isMachineBoundContentDecision(value) {
  return !!value && machineBoundContentDecisions.has(value);
}

function buildExecutionPacket({ implementation, contentEvidence }) {
  if (!contentEvidence?.accepted || !isMachineBoundContentDecision(contentEvidence.decision)) {
    throw new Error('cm2118_machine_bound_content_decision_required');
  }
  const decision = contentEvidence.decision;
  const payload = {
    packetReference: `CM-2118-FULL-PLAN-APPLICATION-EXECUTION-PACKET-${decision.canonicalPayloadSha256.slice(0, 8)}-${implementation.commit.slice(0, 8)}`.toUpperCase(),
    packetType: 'non_executing_one_shot_full_plan_application_packet',
    implementation,
    contentDecision: {
      reference: CONTENT_DECISION_FREEZE.reference,
      commit: CONTENT_DECISION_FREEZE.commit,
      tree: CONTENT_DECISION_FREEZE.tree,
      parentCommit: CONTENT_DECISION_FREEZE.parentCommit,
      parentTree: CONTENT_DECISION_FREEZE.parentTree,
      diffPathsSha256: CONTENT_DECISION_FREEZE.diffPathsSha256,
      diffEntriesSha256: CONTENT_DECISION_FREEZE.diffEntriesSha256,
      canonicalPayloadSha256: CONTENT_DECISION_FREEZE.canonicalPayloadSha256,
      patchPayloadSha256: CONTENT_DECISION_FREEZE.patchPayloadSha256,
      json: identityWithoutContent(contentEvidence.jsonIdentity),
      markdown: identityWithoutContent(contentEvidence.markdownIdentity)
    },
    applicationBoundary: {
      sourceBaselineCommit: decision.payload.patchPlan.sourceBaselineCommit,
      sourceBaselineTree: decision.payload.patchPlan.sourceBaselineTree,
      targets: decision.payload.patchPlan.targets,
      exactDiffPaths: APPLICATION_DIFF_PATHS,
      exactDiffEntries: APPLICATION_DIFF_ENTRIES,
      exactDiffPathsSha256: sha256Canonical(APPLICATION_DIFF_PATHS),
      exactDiffEntriesSha256: sha256Canonical(APPLICATION_DIFF_ENTRIES),
      patchPayloadSha256: decision.payload.patchPlan.patchPayloadSha256,
      applicationCommitParentMustBeFrozenContentDecisionCommit: true,
      applicationCommitParent: CONTENT_DECISION_FREEZE.commit,
      applicationCommitParentTree: CONTENT_DECISION_FREEZE.tree,
      executionReceiptIncludedInApplicationCommit: false,
      bindingReceiptIncludedInApplicationCommit: false,
      exactFivePathDiffOnly: true
    },
    oneShotRegistry: {
      governanceRootAuthority: 'git_common_dir_fixed_governance_root',
      governanceRootIdentitySha256: GOVERNANCE_ROOT_IDENTITY_SHA256,
      registryReference: REGISTRY_REFERENCE,
      nonce: NONCE,
      receiptId: RECEIPT_ID,
      claimIdDerivationExcludesBindingHash: true,
      atomicExclusiveCreateRequired: true,
      exactReadbackRequired: true,
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      alternateRootAllowed: false,
      automaticRetryAllowed: false,
      automaticCleanupAllowed: false
    },
    receiptBoundary: {
      executionReceiptFilename: EXECUTION_RECEIPT_FILENAME,
      applicationBindingReceiptFilename: BINDING_RECEIPT_FILENAME,
      receiptsStoredOutsideApplicationCommit: true,
      receiptRootAuthority: 'git_common_dir_fixed_governance_root',
      receiptTimeContentDecisionRevalidationRequired: true,
      receiptTimeExecutionPacketRevalidationRequired: true,
      receiptTimeFinalReleaseRevalidationRequired: true
    },
    finalReleaseRequirements: {
      separateFinalExecutionReleaseRequired: true,
      finalReleaseMustBindPacketGitIdentity: true,
      finalReleaseMustBindContentDecisionGitIdentity: true,
      finalReleaseMustBindImplementationGitIdentity: true,
      finalReleaseCommitMustBeDirectChildOfPacketCommit: true,
      finalReleaseExactDiffPaths: [...FINAL_RELEASE_DIFF_PATHS].sort(),
      finalReleaseExactDiffEntries: expectedFinalReleaseEntries(),
      finalReleaseMayAuthorizeOneClaimAndOneApplicationCommit: true,
      finalReleaseMayAuthorizeStatusSync: false
    },
    currentAuthority: {
      authorizationContentApproved: true,
      executionReleaseAuthorized: false,
      applicationExecutionAuthorized: false,
      applicationCommitCreationAuthorized: false,
      statusSyncAuthorized: false
    },
    currentState: {
      claimCreated: false,
      applicationExecuted: false,
      applicationCommitCreated: false,
      applicationCommitBound: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    sideEffectLimits: {
      claimCreates: 1,
      repositoryPatches: 1,
      applicationCommits: 1,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    },
    currentSideEffects: {
      claimCreates: 0,
      repositoryPatches: 0,
      applicationCommits: 0,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    },
    nonClaims: Object.fromEntries(DECISION_READINESS_FIELDS.map(field => [field, false]))
  };
  return wrapPayload(payload, 'cm2118_non_executing_full_plan_application_packet_v1');
}

function verifyImplementation(implementation, options, blockers) {
  try {
    const diffPaths = options.resolveDiffPaths(IMPLEMENTATION_PARENT_FREEZE.commit, implementation.commit).sort();
    const diffEntries = options.resolveDiffEntries(IMPLEMENTATION_PARENT_FREEZE.commit, implementation.commit)
      .sort((a, b) => a.path.localeCompare(b.path));
    if (JSON.stringify(Object.keys(implementation).sort()) !== JSON.stringify([...IMPLEMENTATION_KEYS].sort()) ||
        options.resolveCommitTree(implementation.commit) !== implementation.tree ||
        options.resolveParentCommit(implementation.commit) !== IMPLEMENTATION_PARENT_FREEZE.commit ||
        implementation.parentCommit !== IMPLEMENTATION_PARENT_FREEZE.commit ||
        options.resolveCommitTree(IMPLEMENTATION_PARENT_FREEZE.commit) !== IMPLEMENTATION_PARENT_FREEZE.tree ||
        implementation.parentTree !== IMPLEMENTATION_PARENT_FREEZE.tree ||
        !sameJson(diffPaths, [...IMPLEMENTATION_DIFF_PATHS].sort()) ||
        !sameJson(implementation.diffPaths, diffPaths) ||
        !sameJson(diffEntries, expectedImplementationEntries()) ||
        !sameJson(implementation.diffEntries, diffEntries) ||
        implementation.diffPathsSha256 !== sha256Canonical(diffPaths) ||
        implementation.diffEntriesSha256 !== sha256Canonical(diffEntries) ||
        !options.isCommitAncestor(CONTENT_DECISION_FREEZE.commit, implementation.commit)) {
      blockers.push('packet.implementationLineageOrDiff');
    }
    if (!Array.isArray(implementation.artifacts) ||
        !sameJson(implementation.artifacts.map(item => item.path), IMPLEMENTATION_ARTIFACT_PATHS)) {
      blockers.push('packet.implementationArtifacts');
    } else {
      for (const artifact of implementation.artifacts) {
        const actual = options.resolveGitFile(implementation.commit, artifact.path);
        if (actual.blobOid !== artifact.blobOid || actual.gitObjectType !== 'blob') {
          blockers.push(`packet.implementationArtifact.${artifact.path}`);
        }
      }
    }
  } catch {
    blockers.push('packet.implementationUnreadable');
  }
}

function evaluateExecutionPacket(packet = {}, options = {}) {
  const blockers = [];
  if (packet.schemaVersion !== 1 || packet.taskId !== TASK_ID ||
      packet.artifactType !== 'cm2118_non_executing_full_plan_application_packet_v1' ||
      packet.canonicalPayloadSha256 !== sha256Canonical(packet.payload || {})) blockers.push('packet.identityOrHash');
  const contentEvidence = intakeContentDecision(options);
  if (!contentEvidence.accepted) blockers.push(...contentEvidence.blockers.map(item => `packet.${item}`));
  const implementation = packet.payload?.implementation;
  if (!implementation || !validResolvers(options, ['resolveCommitTree', 'resolveParentCommit', 'resolveDiffPaths',
    'resolveDiffEntries', 'resolveGitFile', 'isCommitAncestor'])) {
    blockers.push('packet.implementationOrResolvers');
  } else {
    verifyImplementation(implementation, options, blockers);
  }
  if (contentEvidence.accepted && implementation) {
    try {
      const expected = buildExecutionPacket({ implementation, contentEvidence });
      if (!sameJson(packet, expected)) blockers.push('packet.exactContent');
    } catch {
      blockers.push('packet.exactContent');
    }
  }
  const authority = packet.payload?.currentAuthority || {};
  const current = packet.payload?.currentState || {};
  if (authority.executionReleaseAuthorized !== false || authority.applicationExecutionAuthorized !== false ||
      authority.applicationCommitCreationAuthorized !== false || authority.statusSyncAuthorized !== false ||
      current.claimCreated !== false || current.applicationExecuted !== false ||
      current.applicationCommitCreated !== false || current.applicationCommitBound !== false ||
      current.fullPlanPackCompleted !== false || current.readinessClaimed !== false) blockers.push('packet.nonExecutingBoundary');
  if (Object.values(packet.payload?.currentSideEffects || {}).some(value => value !== 0) ||
      Object.values(packet.payload?.nonClaims || {}).some(value => value !== false)) blockers.push('packet.currentEffectsOrClaims');
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    packetPrepared: blockers.length === 0,
    executionReleaseAuthorized: false,
    applicationExecutionAuthorized: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    contentEvidence
  };
}

function intakeExecutionPacket({ packetCommit, ...options } = {}) {
  const blockers = [];
  let packet = null;
  let jsonIdentity = null;
  let markdownIdentity = null;
  let packetTree = null;
  let packetParentCommit = null;
  let packetParentTree = null;
  let diffPaths = null;
  let diffEntries = null;
  if (!/^[a-f0-9]{40}$/.test(packetCommit || '') || !validResolvers(options, [
    'resolveCommitTree', 'resolveParentCommit', 'resolveDiffPaths', 'resolveDiffEntries', 'resolveGitFile',
    'resolveGitPathState', 'isCommitAncestor'
  ])) return { accepted: false, blockers: ['packetIntake.commitOrResolversRequired'] };
  try {
    packetTree = options.resolveCommitTree(packetCommit);
    packetParentCommit = options.resolveParentCommit(packetCommit);
    packetParentTree = options.resolveCommitTree(packetParentCommit);
    diffPaths = options.resolveDiffPaths(packetParentCommit, packetCommit).sort();
    diffEntries = options.resolveDiffEntries(packetParentCommit, packetCommit).sort((a, b) => a.path.localeCompare(b.path));
    jsonIdentity = options.resolveGitFile(packetCommit, PACKET_PATH);
    markdownIdentity = options.resolveGitFile(packetCommit, PACKET_MARKDOWN_PATH);
    packet = JSON.parse(jsonIdentity.content.toString('utf8'));
    const evaluation = evaluateExecutionPacket(packet, options);
    if (!evaluation.accepted) blockers.push(...evaluation.blockers.map(item => `packetIntake.${item}`));
    if (packetParentCommit !== packet.payload?.implementation?.commit ||
        packetParentTree !== packet.payload?.implementation?.tree ||
        !sameJson(diffPaths, [...PACKET_DIFF_PATHS].sort()) || !sameJson(diffEntries, expectedAddEntries(PACKET_DIFF_PATHS)) ||
        !markdownIdentity.content.toString('utf8').includes(jsonIdentity.content.toString('utf8').trimEnd())) {
      blockers.push('packetIntake.lineageDiffOrMirror');
    }
    for (const sourcePath of PACKET_DIFF_PATHS) {
      const state = options.resolveGitPathState(packetParentCommit, sourcePath);
      if (!state || state.exists !== false) blockers.push(`packetIntake.parentPath.${sourcePath}`);
    }
  } catch {
    blockers.push('packetIntake.unreadable');
  }
  const accepted = blockers.length === 0;
  if (accepted) {
    deepFreeze(packet);
    machineBoundExecutionPackets.add(packet);
  }
  return {
    accepted,
    blockers: [...new Set(blockers)],
    packet,
    packetCommit,
    packetTree: accepted ? packetTree : null,
    packetParentCommit: accepted ? packetParentCommit : null,
    packetParentTree: accepted ? packetParentTree : null,
    diffPaths: accepted ? diffPaths : null,
    diffPathsSha256: accepted ? sha256Canonical(diffPaths) : null,
    diffEntries: accepted ? diffEntries : null,
    diffEntriesSha256: accepted ? sha256Canonical(diffEntries) : null,
    jsonIdentity,
    markdownIdentity,
    packetMachineBound: accepted,
    applicationExecutionAuthorized: false
  };
}

function isMachineBoundExecutionPacket(value) {
  return !!value && machineBoundExecutionPackets.has(value);
}

function buildFinalReleaseDecision({ packetEvidence, approvedAt, expiresAt }) {
  if (!packetEvidence?.accepted || !isMachineBoundExecutionPacket(packetEvidence.packet)) {
    throw new Error('cm2119_machine_bound_execution_packet_required');
  }
  if (approvedAt !== FINAL_RELEASE_APPROVED_AT || expiresAt !== FINAL_RELEASE_EXPIRES_AT) {
    throw new Error('cm2119_exact_authorization_window_required');
  }
  const packet = packetEvidence.packet;
  const payload = {
    decisionReference: `CM-2119-FULL-PLAN-FINAL-EXECUTION-RELEASE-${packet.payload.contentDecision.canonicalPayloadSha256.slice(0, 8)}-${packet.canonicalPayloadSha256.slice(0, 8)}-${packet.payload.implementation.commit.slice(0, 8)}`.toUpperCase(),
    decisionType: 'exact_one_shot_full_plan_application_final_execution_release',
    approvedAt,
    expiresAt,
    authority: {
      action: ACTION,
      executionReleaseAuthorized: true,
      applicationExecutionAuthorized: true,
      applicationCommitCreationAuthorized: true,
      claimCreateAuthorized: true,
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      statusSyncAuthorized: false,
      alternateOutputPathAllowed: false,
      callerSuppliedAcceptedBooleanAllowed: false,
      automaticRetryAllowed: false,
      automaticCleanupAllowed: false,
      remoteActionAuthorized: false,
      nativeMemoryActionAuthorized: false,
      providerActionAuthorized: false,
      realMemoryReadAuthorized: false,
      readinessClaimAuthorized: false
    },
    contentDecision: packet.payload.contentDecision,
    implementation: packet.payload.implementation,
    executionPacket: {
      packetReference: packet.payload.packetReference,
      commit: packetEvidence.packetCommit,
      tree: packetEvidence.packetTree,
      parentCommit: packetEvidence.packetParentCommit,
      parentTree: packetEvidence.packetParentTree,
      diffPaths: packetEvidence.diffPaths,
      diffPathsSha256: packetEvidence.diffPathsSha256,
      diffEntries: packetEvidence.diffEntries,
      diffEntriesSha256: packetEvidence.diffEntriesSha256,
      canonicalPayloadSha256: packet.canonicalPayloadSha256,
      json: identityWithoutContent(packetEvidence.jsonIdentity),
      markdown: identityWithoutContent(packetEvidence.markdownIdentity)
    },
    applicationBoundary: packet.payload.applicationBoundary,
    oneShotRegistry: packet.payload.oneShotRegistry,
    receiptBoundary: packet.payload.receiptBoundary,
    finalReleaseCommitPolicy: {
      directChildOfExecutionPacketCommitRequired: true,
      exactDiffPaths: packet.payload.finalReleaseRequirements.finalReleaseExactDiffPaths,
      exactDiffEntries: packet.payload.finalReleaseRequirements.finalReleaseExactDiffEntries,
      applicationCommitMustBeDirectChildOfFrozenContentDecisionCommit: true,
      applicationCommitParent: CONTENT_DECISION_FREEZE.commit,
      applicationCommitParentTree: CONTENT_DECISION_FREEZE.tree
    },
    currentState: {
      finalReleaseDecisionContentPrepared: true,
      finalReleaseDecisionGitIntakeCompleted: false,
      claimCreated: false,
      applicationExecuted: false,
      applicationCommitCreated: false,
      applicationCommitBound: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    currentSideEffects: packet.payload.currentSideEffects,
    nonClaims: packet.payload.nonClaims
  };
  return wrapPayload(payload, 'cm2119_full_plan_final_execution_release_v1', FINAL_RELEASE_TASK_ID);
}

function evaluateFinalReleaseDecision(decision = {}, { packetEvidence, now = new Date() } = {}) {
  const blockers = [];
  if (decision.schemaVersion !== 1 || decision.taskId !== FINAL_RELEASE_TASK_ID ||
      decision.artifactType !== 'cm2119_full_plan_final_execution_release_v1' ||
      decision.canonicalPayloadSha256 !== sha256Canonical(decision.payload || {})) blockers.push('finalRelease.identityOrHash');
  if (!packetEvidence?.accepted || !isMachineBoundExecutionPacket(packetEvidence.packet)) {
    blockers.push('finalRelease.machineBoundPacketRequired');
  } else {
    try {
      const expected = buildFinalReleaseDecision({
        packetEvidence,
        approvedAt: FINAL_RELEASE_APPROVED_AT,
        expiresAt: FINAL_RELEASE_EXPIRES_AT
      });
      if (!sameJson(decision, expected)) blockers.push('finalRelease.exactContent');
    } catch {
      blockers.push('finalRelease.exactContent');
    }
  }
  const approved = Date.parse(decision.payload?.approvedAt || '');
  const expires = Date.parse(decision.payload?.expiresAt || '');
  const observedNow = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(approved) || !Number.isFinite(expires) || expires <= approved ||
      !Number.isFinite(observedNow) || observedNow < approved || observedNow >= expires) blockers.push('finalRelease.expiry');
  const authority = decision.payload?.authority || {};
  if (authority.executionReleaseAuthorized !== true || authority.applicationExecutionAuthorized !== true ||
      authority.applicationCommitCreationAuthorized !== true || authority.claimCreateAuthorized !== true ||
      authority.authorizationUseCount !== 1 || authority.authorizationReplayAllowed !== false ||
      authority.statusSyncAuthorized !== false || authority.alternateOutputPathAllowed !== false ||
      authority.automaticRetryAllowed !== false || authority.automaticCleanupAllowed !== false ||
      authority.remoteActionAuthorized !== false || authority.nativeMemoryActionAuthorized !== false ||
      authority.providerActionAuthorized !== false || authority.realMemoryReadAuthorized !== false ||
      authority.readinessClaimAuthorized !== false) blockers.push('finalRelease.authorityBoundary');
  if (decision.payload?.currentState?.claimCreated !== false ||
      decision.payload?.currentState?.applicationExecuted !== false ||
      decision.payload?.currentState?.applicationCommitCreated !== false ||
      decision.payload?.currentState?.applicationCommitBound !== false ||
      decision.payload?.currentState?.fullPlanPackCompleted !== false ||
      decision.payload?.currentState?.readinessClaimed !== false ||
      Object.values(decision.payload?.currentSideEffects || {}).some(value => value !== 0) ||
      Object.values(decision.payload?.nonClaims || {}).some(value => value !== false)) blockers.push('finalRelease.currentBoundary');
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    executionReleaseAuthorized: blockers.length === 0,
    applicationExecutionAuthorized: blockers.length === 0,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

function verifyTargetsAtCommit(commit, targets, options, blockers, prefix) {
  for (const target of targets) {
    try {
      if (target.operation === 'add') {
        const state = options.resolveGitPathState(commit, target.sourcePath);
        if (!state || state.exists !== false) blockers.push(`${prefix}.${target.sourcePath}`);
      } else {
        const actual = options.resolveGitFile(commit, target.sourcePath);
        if (actual.gitMode !== target.before.gitMode || actual.blobOid !== target.before.blobOid ||
            actual.bytes !== target.before.bytes || actual.sha256 !== target.before.sha256) {
          blockers.push(`${prefix}.${target.sourcePath}`);
        }
      }
    } catch {
      blockers.push(`${prefix}.${target.sourcePath}`);
    }
  }
}

function intakeFinalReleaseDecision({ finalReleaseCommit, packetEvidence, now = new Date(), ...options } = {}) {
  const blockers = [];
  let decision = null;
  let jsonIdentity = null;
  let markdownIdentity = null;
  if (!/^[a-f0-9]{40}$/.test(finalReleaseCommit || '') || !packetEvidence?.accepted ||
      !isMachineBoundExecutionPacket(packetEvidence.packet) || !validResolvers(options, [
        'resolveCommitTree', 'resolveParentCommit', 'resolveDiffPaths', 'resolveDiffEntries', 'resolveGitFile',
        'resolveGitPathState', 'isCommitAncestor'
      ])) return { accepted: false, blockers: ['finalReleaseIntake.commitPacketOrResolversRequired'] };
  try {
    const parentCommit = options.resolveParentCommit(finalReleaseCommit);
    const paths = options.resolveDiffPaths(parentCommit, finalReleaseCommit).sort();
    const entries = options.resolveDiffEntries(parentCommit, finalReleaseCommit).sort((a, b) => a.path.localeCompare(b.path));
    jsonIdentity = options.resolveGitFile(finalReleaseCommit, FINAL_RELEASE_PATH);
    markdownIdentity = options.resolveGitFile(finalReleaseCommit, FINAL_RELEASE_MARKDOWN_PATH);
    decision = JSON.parse(jsonIdentity.content.toString('utf8'));
    const evaluation = evaluateFinalReleaseDecision(decision, { packetEvidence, now });
    if (!evaluation.accepted) blockers.push(...evaluation.blockers.map(item => `finalReleaseIntake.${item}`));
    if (parentCommit !== packetEvidence.packetCommit ||
        options.resolveCommitTree(parentCommit) !== packetEvidence.packetTree ||
        !sameJson(paths, [...FINAL_RELEASE_DIFF_PATHS].sort()) ||
        !sameJson(entries, expectedFinalReleaseEntries()) ||
        !markdownIdentity.content.toString('utf8').includes(jsonIdentity.content.toString('utf8').trimEnd())) {
      blockers.push('finalReleaseIntake.lineageDiffOrMirror');
    }
    for (const sourcePath of [FINAL_RELEASE_PATH, FINAL_RELEASE_MARKDOWN_PATH]) {
      const state = options.resolveGitPathState(parentCommit, sourcePath);
      if (!state || state.exists !== false) blockers.push(`finalReleaseIntake.parentPath.${sourcePath}`);
    }
    verifyTargetsAtCommit(
      finalReleaseCommit,
      packetEvidence.packet.payload.applicationBoundary.targets,
      options,
      blockers,
      'finalReleaseIntake.baselineTargetDrift'
    );
  } catch {
    blockers.push('finalReleaseIntake.unreadable');
  }
  const accepted = blockers.length === 0;
  if (accepted) {
    deepFreeze(decision);
    machineBoundFinalReleases.add(decision);
  }
  return {
    accepted,
    blockers: [...new Set(blockers)],
    decision,
    finalReleaseCommit,
    finalReleaseTree: accepted ? options.resolveCommitTree(finalReleaseCommit) : null,
    finalReleaseParentCommit: accepted ? options.resolveParentCommit(finalReleaseCommit) : null,
    jsonIdentity,
    markdownIdentity,
    finalReleaseMachineBound: accepted,
    executionReleaseAuthorized: accepted,
    applicationExecutionAuthorized: accepted
  };
}

function isMachineBoundFinalReleaseDecision(value) {
  return !!value && machineBoundFinalReleases.has(value);
}

function claimId() {
  return sha256Canonical({
    registryReference: REGISTRY_REFERENCE,
    nonceHash: sha256(NONCE),
    receiptIdHash: sha256(RECEIPT_ID)
  });
}

function claimFileName() {
  return `.cm2118-full-plan-application-claim-${claimId()}.json`;
}

function exactRootIdentityBytes() {
  return Buffer.from(JSON.stringify(canonicalize(GOVERNANCE_ROOT_IDENTITY)));
}

function governanceDescriptorPath(rootHandle, filename) {
  return `/proc/self/fd/${rootHandle.fd}/${filename}`;
}

async function openVerifiedGovernanceRoot(registry) {
  const rootIdentity = await registry.verifyRoot();
  if (process.platform !== 'linux' || !Number.isInteger(fs.constants.O_DIRECTORY) ||
      !Number.isInteger(fs.constants.O_NOFOLLOW)) {
    throw new Error('cm2118_descriptor_relative_governance_access_unsupported');
  }
  const rootHandle = await registry.fs.open(
    registry.governanceRoot,
    fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW
  );
  try {
    const descriptorStat = await rootHandle.stat();
    if (!descriptorStat.isDirectory() || descriptorStat.dev !== rootIdentity.dev ||
        descriptorStat.ino !== rootIdentity.ino) {
      throw new Error('cm2118_governance_root_descriptor_identity_mismatch');
    }
    return rootHandle;
  } catch (error) {
    await rootHandle.close().catch(() => {});
    throw error;
  }
}

async function readClaimFromGovernanceRootHandle(registry, rootHandle, bindingHash = null) {
  const claimHandle = await registry.fs.open(
    governanceDescriptorPath(rootHandle, claimFileName()),
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW
  );
  try {
    const stat = await claimHandle.stat();
    if (!stat.isFile()) throw new Error('cm2118_claim_invalid');
    let value;
    try {
      value = JSON.parse(await claimHandle.readFile('utf8'));
    } catch {
      throw new Error('cm2118_claim_corrupt_or_unreadable');
    }
    return registry.validateEnvelope(value, bindingHash);
  } finally {
    await claimHandle.close().catch(() => {});
  }
}

class Cm2118FullPlanApplicationClaimRegistry {
  constructor({ governanceRoot, filesystem = fsPromises }) {
    if (typeof governanceRoot !== 'string' || governanceRoot.trim() === '') {
      throw new Error('cm2118_governance_root_required');
    }
    this.governanceRoot = governanceRoot;
    this.fs = filesystem;
    this.claimPath = path.join(governanceRoot, claimFileName());
  }

  async verifyRoot() {
    let verifiedRootStat = null;
    for (const directory of [path.dirname(this.governanceRoot), this.governanceRoot]) {
      const stat = await this.fs.lstat(directory);
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new Error('cm2118_governance_root_invalid');
      }
      if (path.resolve(directory) === path.resolve(this.governanceRoot)) verifiedRootStat = stat;
    }
    const realRoot = await this.fs.realpath(this.governanceRoot);
    if (path.resolve(realRoot) !== path.resolve(this.governanceRoot)) {
      throw new Error('cm2118_governance_root_symlink_forbidden');
    }
    const identityPath = path.join(this.governanceRoot, '.phase8-registry-root-identity.json');
    const identityStat = await this.fs.lstat(identityPath);
    if (!identityStat.isFile() || identityStat.isSymbolicLink()) throw new Error('cm2118_governance_root_identity_invalid');
    const bytes = await this.fs.readFile(identityPath);
    if (!bytes.equals(exactRootIdentityBytes()) || sha256(bytes) !== GOVERNANCE_ROOT_IDENTITY_SHA256) {
      throw new Error('cm2118_governance_root_identity_mismatch');
    }
    return { dev: verifiedRootStat.dev, ino: verifiedRootStat.ino };
  }

  baseEnvelope(bindingHash, finalReleaseEvidence, claimedAt) {
    return {
      schemaVersion: 1,
      registryReference: REGISTRY_REFERENCE,
      claimId: claimId(),
      nonceHash: sha256(NONCE),
      receiptIdHash: sha256(RECEIPT_ID),
      bindingHash,
      action: ACTION,
      contentDecisionReference: CONTENT_DECISION_FREEZE.reference,
      finalReleaseDecisionReference: finalReleaseEvidence.decision.payload.decisionReference,
      finalReleaseApprovedAt: finalReleaseEvidence.decision.payload.approvedAt,
      finalReleaseExpiresAt: finalReleaseEvidence.decision.payload.expiresAt,
      claimedAt,
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      patchInvocationCount: 1,
      state: 'APPLICATION_COMMIT_INVOCATION_CONSUMED',
      applicationCommitAttempted: true,
      applicationCommitCreated: null,
      executionReceiptCreated: false,
      bindingReceiptCreated: false,
      reconciliationRequired: true,
      applicationCommit: null,
      applicationTree: null,
      executionReceiptSha256: null,
      bindingReceiptSha256: null
    };
  }

  validateEnvelope(value, bindingHash = null) {
    const expectedKeys = [
      'schemaVersion', 'registryReference', 'claimId', 'nonceHash', 'receiptIdHash', 'bindingHash',
      'action', 'contentDecisionReference', 'finalReleaseDecisionReference', 'authorizationUseCount',
      'authorizationReplayAllowed', 'patchInvocationCount', 'state', 'applicationCommit',
      'applicationTree', 'executionReceiptSha256', 'bindingReceiptSha256',
      'applicationCommitAttempted', 'applicationCommitCreated', 'executionReceiptCreated',
      'bindingReceiptCreated', 'reconciliationRequired', 'finalReleaseApprovedAt',
      'finalReleaseExpiresAt', 'claimedAt'
    ].sort();
    const allowedStates = [
      'APPLICATION_COMMIT_INVOCATION_CONSUMED',
      'APPLICATION_COMMIT_CREATED',
      'EXECUTION_RECEIPT_WRITTEN',
      'BINDING_RECEIPT_WRITTEN',
      'CONSUMED_SUCCESS',
      'CONSUMED_AMBIGUOUS'
    ];
    const approvedAt = Date.parse(value?.finalReleaseApprovedAt || '');
    const expiresAt = Date.parse(value?.finalReleaseExpiresAt || '');
    const claimedAt = Date.parse(value?.claimedAt || '');
    if (!value || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(expectedKeys) ||
        value.schemaVersion !== 1 || value.registryReference !== REGISTRY_REFERENCE || value.claimId !== claimId() ||
        value.nonceHash !== sha256(NONCE) || value.receiptIdHash !== sha256(RECEIPT_ID) || value.action !== ACTION ||
        value.contentDecisionReference !== CONTENT_DECISION_FREEZE.reference ||
        !/^CM-2119-FULL-PLAN-FINAL-EXECUTION-RELEASE-[A-F0-9-]+$/.test(value.finalReleaseDecisionReference || '') ||
        !Number.isFinite(approvedAt) || !Number.isFinite(expiresAt) || !Number.isFinite(claimedAt) ||
        expiresAt <= approvedAt || claimedAt < approvedAt || claimedAt >= expiresAt ||
        value.authorizationUseCount !== 1 ||
        value.authorizationReplayAllowed !== false || value.patchInvocationCount !== 1 ||
        !allowedStates.includes(value.state) || value.applicationCommitAttempted !== true ||
        ![true, false, null].includes(value.applicationCommitCreated) ||
        ![true, false, null].includes(value.executionReceiptCreated) ||
        ![true, false, null].includes(value.bindingReceiptCreated) ||
        !(value.applicationCommit === null || /^[a-f0-9]{40}$/.test(value.applicationCommit || '')) ||
        !(value.applicationTree === null || /^[a-f0-9]{40}$/.test(value.applicationTree || '')) ||
        !(value.executionReceiptSha256 === null || /^[a-f0-9]{64}$/.test(value.executionReceiptSha256 || '')) ||
        !(value.bindingReceiptSha256 === null || /^[a-f0-9]{64}$/.test(value.bindingReceiptSha256 || '')) ||
        typeof value.reconciliationRequired !== 'boolean' ||
        (bindingHash !== null && value.bindingHash !== bindingHash) ||
        (value.state === 'APPLICATION_COMMIT_INVOCATION_CONSUMED' &&
          (value.applicationCommitCreated !== null || value.executionReceiptCreated !== false ||
           value.bindingReceiptCreated !== false ||
           [value.applicationCommit, value.applicationTree, value.executionReceiptSha256, value.bindingReceiptSha256]
             .some(item => item !== null))) ||
        (['APPLICATION_COMMIT_CREATED', 'EXECUTION_RECEIPT_WRITTEN', 'BINDING_RECEIPT_WRITTEN', 'CONSUMED_SUCCESS']
          .includes(value.state) &&
          (value.applicationCommitCreated !== true || !/^[a-f0-9]{40}$/.test(value.applicationCommit || '') ||
           !/^[a-f0-9]{40}$/.test(value.applicationTree || ''))) ||
        (['EXECUTION_RECEIPT_WRITTEN', 'BINDING_RECEIPT_WRITTEN', 'CONSUMED_SUCCESS'].includes(value.state) &&
          (value.executionReceiptCreated !== true || !/^[a-f0-9]{64}$/.test(value.executionReceiptSha256 || ''))) ||
        (['BINDING_RECEIPT_WRITTEN', 'CONSUMED_SUCCESS'].includes(value.state) &&
          (value.bindingReceiptCreated !== true || !/^[a-f0-9]{64}$/.test(value.bindingReceiptSha256 || ''))) ||
        (value.state === 'CONSUMED_SUCCESS' &&
          (value.reconciliationRequired !== false || value.applicationCommitCreated !== true ||
           value.executionReceiptCreated !== true || value.bindingReceiptCreated !== true))) {
      throw new Error('cm2118_claim_binding_mismatch');
    }
    return value;
  }

  async claim(bindingHash, finalReleaseEvidence) {
    const claimedAt = new Date().toISOString();
    const approvedAt = Date.parse(finalReleaseEvidence?.decision?.payload?.approvedAt || '');
    const expiresAt = Date.parse(finalReleaseEvidence?.decision?.payload?.expiresAt || '');
    const observedAt = Date.parse(claimedAt);
    if (!Number.isFinite(approvedAt) || !Number.isFinite(expiresAt) ||
        observedAt < approvedAt || observedAt >= expiresAt) {
      throw new Error('cm2118_claim_outside_final_release_window');
    }
    const envelope = this.baseEnvelope(bindingHash, finalReleaseEvidence, claimedAt);
    const bytes = Buffer.from(JSON.stringify(canonicalize(envelope)));
    const rootHandle = await openVerifiedGovernanceRoot(this);
    try {
      try {
        await this.fs.writeFile(
          governanceDescriptorPath(rootHandle, claimFileName()),
          bytes,
          { flag: 'wx' }
        );
      } catch (error) {
        if (error?.code === 'EEXIST') throw new Error('cm2118_authorization_already_claimed');
        throw new Error('cm2118_claim_persistence_ambiguous');
      }
      const observed = await readClaimFromGovernanceRootHandle(this, rootHandle, bindingHash);
      if (!sameJson(observed, envelope)) throw new Error('cm2118_claim_readback_mismatch');
      return observed;
    } finally {
      await rootHandle.close().catch(() => {});
    }
  }

  async read(bindingHash = null) {
    const rootHandle = await openVerifiedGovernanceRoot(this);
    try {
      return await readClaimFromGovernanceRootHandle(this, rootHandle, bindingHash);
    } finally {
      await rootHandle.close().catch(() => {});
    }
  }

  async inspectExisting(bindingHash = null) {
    await this.verifyRoot();
    try {
      const value = await this.read(bindingHash);
      return {
        claimEnvelopePresent: true,
        claimEnvelopeBindingVerified: true,
        state: value.state,
        authorizationConsumed: true,
        authorizationReplayAllowed: false,
        reconciliationRequired: value.state !== 'CONSUMED_SUCCESS',
        applicationCommitCreated: value.applicationCommitCreated,
        executionReceiptCreated: value.executionReceiptCreated,
        bindingReceiptCreated: value.bindingReceiptCreated,
        envelope: value
      };
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return {
          claimEnvelopePresent: false,
          claimEnvelopeBindingVerified: false,
          state: 'UNCLAIMED',
          authorizationConsumed: false,
          authorizationReplayAllowed: false,
          reconciliationRequired: false,
          applicationCommitCreated: false,
          executionReceiptCreated: false,
          bindingReceiptCreated: false,
          envelope: null
        };
      }
      return {
        claimEnvelopePresent: true,
        claimEnvelopeBindingVerified: false,
        state: 'CLAIM_REGISTRY_AMBIGUOUS',
        authorizationConsumed: true,
        authorizationReplayAllowed: false,
        reconciliationRequired: true,
        applicationCommitCreated: null,
        executionReceiptCreated: null,
        bindingReceiptCreated: null,
        envelope: null
      };
    }
  }

  async transition(bindingHash, expectedState, state, details = {}) {
    const allowed = {
      APPLICATION_COMMIT_INVOCATION_CONSUMED: ['APPLICATION_COMMIT_CREATED', 'CONSUMED_AMBIGUOUS'],
      APPLICATION_COMMIT_CREATED: ['EXECUTION_RECEIPT_WRITTEN', 'CONSUMED_AMBIGUOUS'],
      EXECUTION_RECEIPT_WRITTEN: ['BINDING_RECEIPT_WRITTEN', 'CONSUMED_AMBIGUOUS'],
      BINDING_RECEIPT_WRITTEN: ['CONSUMED_SUCCESS', 'CONSUMED_AMBIGUOUS']
    };
    if (!allowed[expectedState]?.includes(state)) throw new Error('cm2118_claim_transition_invalid');
    const current = await this.read(bindingHash);
    if (current.state !== expectedState) throw new Error('cm2118_claim_state_mismatch');
    const next = {
      ...current,
      state,
      applicationCommitCreated: Object.hasOwn(details, 'applicationCommitCreated')
        ? details.applicationCommitCreated : current.applicationCommitCreated,
      executionReceiptCreated: Object.hasOwn(details, 'executionReceiptCreated')
        ? details.executionReceiptCreated : current.executionReceiptCreated,
      bindingReceiptCreated: Object.hasOwn(details, 'bindingReceiptCreated')
        ? details.bindingReceiptCreated : current.bindingReceiptCreated,
      reconciliationRequired: state !== 'CONSUMED_SUCCESS',
      applicationCommit: Object.hasOwn(details, 'applicationCommit')
        ? details.applicationCommit : current.applicationCommit,
      applicationTree: Object.hasOwn(details, 'applicationTree')
        ? details.applicationTree : current.applicationTree,
      executionReceiptSha256: Object.hasOwn(details, 'executionReceiptSha256')
        ? details.executionReceiptSha256 : current.executionReceiptSha256,
      bindingReceiptSha256: Object.hasOwn(details, 'bindingReceiptSha256')
        ? details.bindingReceiptSha256 : current.bindingReceiptSha256
    };
    this.validateEnvelope(next, bindingHash);
    const temporary = `${this.claimPath}.${state}.tmp`;
    await this.fs.writeFile(temporary, JSON.stringify(canonicalize(next)), { flag: 'wx' });
    await this.fs.rename(temporary, this.claimPath);
    return this.read(bindingHash);
  }
}

function buildClaimBindingHash({ packetEvidence, finalReleaseEvidence }) {
  return sha256Canonical({
    action: ACTION,
    registryReference: REGISTRY_REFERENCE,
    nonce: NONCE,
    receiptId: RECEIPT_ID,
    contentDecisionCommit: CONTENT_DECISION_FREEZE.commit,
    contentDecisionBlobOid: CONTENT_DECISION_FREEZE.json.blobOid,
    executionPacketCommit: packetEvidence.packetCommit,
    executionPacketBlobOid: packetEvidence.jsonIdentity.blobOid,
    finalReleaseCommit: finalReleaseEvidence.finalReleaseCommit,
    finalReleaseBlobOid: finalReleaseEvidence.jsonIdentity.blobOid,
    finalReleaseTree: finalReleaseEvidence.finalReleaseTree,
    patchPayloadSha256: CONTENT_DECISION_FREEZE.patchPayloadSha256,
    applicationDiffEntriesSha256: sha256Canonical(APPLICATION_DIFF_ENTRIES)
  });
}

function buildExecutionReceipt({
  packetEvidence,
  finalReleaseEvidence,
  bindingHash,
  applicationCommit,
  applicationTree,
  claimedAt
}) {
  const payload = {
    receiptType: 'full_plan_application_execution_receipt',
    contentDecision: {
      reference: CONTENT_DECISION_FREEZE.reference,
      commit: CONTENT_DECISION_FREEZE.commit,
      blobOid: CONTENT_DECISION_FREEZE.json.blobOid,
      canonicalPayloadSha256: CONTENT_DECISION_FREEZE.canonicalPayloadSha256
    },
    executionPacket: {
      reference: packetEvidence.packet.payload.packetReference,
      commit: packetEvidence.packetCommit,
      blobOid: packetEvidence.jsonIdentity.blobOid,
      canonicalPayloadSha256: packetEvidence.packet.canonicalPayloadSha256
    },
    finalRelease: {
      reference: finalReleaseEvidence.decision.payload.decisionReference,
      commit: finalReleaseEvidence.finalReleaseCommit,
      tree: finalReleaseEvidence.finalReleaseTree,
      blobOid: finalReleaseEvidence.jsonIdentity.blobOid,
      canonicalPayloadSha256: finalReleaseEvidence.decision.canonicalPayloadSha256
    },
    registry: {
      registryReference: REGISTRY_REFERENCE,
      claimId: claimId(),
      bindingHash,
      claimedAt,
      finalReleaseApprovedAt: finalReleaseEvidence.decision.payload.approvedAt,
      finalReleaseExpiresAt: finalReleaseEvidence.decision.payload.expiresAt,
      stateAtReceipt: 'APPLICATION_COMMIT_CREATED',
      finalStateRequired: 'CONSUMED_SUCCESS',
      authorizationUseCount: 1,
      authorizationConsumed: true,
      authorizationReplayAllowed: false,
      patchInvocationCount: 1
    },
    application: {
      commit: applicationCommit,
      tree: applicationTree,
      parentCommit: CONTENT_DECISION_FREEZE.commit,
      parentTree: CONTENT_DECISION_FREEZE.tree,
      exactDiffPaths: APPLICATION_DIFF_PATHS,
      exactDiffEntries: APPLICATION_DIFF_ENTRIES,
      diffPathsSha256: sha256Canonical(APPLICATION_DIFF_PATHS),
      diffEntriesSha256: sha256Canonical(APPLICATION_DIFF_ENTRIES),
      targets: packetEvidence.packet.payload.applicationBoundary.targets,
      applicationCommitBindingRequired: true,
      applicationCommitBoundByThisReceipt: false
    },
    candidateState: {
      applicationExecuted: true,
      fullPlanPackCompletedAfterBinding: true,
      statusSyncPerformed: false,
      readiness: Object.fromEntries(DECISION_READINESS_FIELDS.map(field => [field, false]))
    },
    sideEffects: {
      repositoryPatches: 1,
      applicationCommits: 1,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    }
  };
  return wrapPayload(payload, 'cm2118_full_plan_application_execution_receipt_v1');
}

function evaluateExecutionReceipt(receipt = {}, { packetEvidence, finalReleaseEvidence } = {}) {
  const blockers = [];
  if (receipt.schemaVersion !== 1 || receipt.taskId !== TASK_ID ||
      receipt.artifactType !== 'cm2118_full_plan_application_execution_receipt_v1' ||
      receipt.canonicalPayloadSha256 !== sha256Canonical(receipt.payload || {})) blockers.push('executionReceipt.identityOrHash');
  if (!packetEvidence?.accepted || !isMachineBoundExecutionPacket(packetEvidence.packet) ||
      !finalReleaseEvidence?.accepted || !isMachineBoundFinalReleaseDecision(finalReleaseEvidence.decision)) {
    blockers.push('executionReceipt.machineBoundEvidenceRequired');
  } else {
    const expected = buildExecutionReceipt({
      packetEvidence,
      finalReleaseEvidence,
      bindingHash: buildClaimBindingHash({ packetEvidence, finalReleaseEvidence }),
      applicationCommit: receipt.payload?.application?.commit,
      applicationTree: receipt.payload?.application?.tree,
      claimedAt: receipt.payload?.registry?.claimedAt
    });
    if (!sameJson(receipt, expected)) blockers.push('executionReceipt.exactContent');
  }
  if (receipt.payload?.candidateState?.statusSyncPerformed !== false ||
      Object.values(receipt.payload?.candidateState?.readiness || {}).some(value => value !== false) ||
      ['nativeReads', 'nativeWrites', 'providerCalls', 'realMemoryReads', 'remoteActions', 'readinessClaims']
        .some(field => receipt.payload?.sideEffects?.[field] !== 0)) blockers.push('executionReceipt.nonClaimBoundary');
  const claimedAt = Date.parse(receipt.payload?.registry?.claimedAt || '');
  const approvedAt = Date.parse(receipt.payload?.registry?.finalReleaseApprovedAt || '');
  const expiresAt = Date.parse(receipt.payload?.registry?.finalReleaseExpiresAt || '');
  if (!Number.isFinite(claimedAt) || !Number.isFinite(approvedAt) || !Number.isFinite(expiresAt) ||
      claimedAt < approvedAt || claimedAt >= expiresAt) blockers.push('executionReceipt.authorizationWindow');
  return { accepted: blockers.length === 0, blockers: [...new Set(blockers)] };
}

function verifyApplicationCommitBinding({ applicationCommit, finalReleaseEvidence, packetEvidence, ...options }) {
  const blockers = [];
  const targets = packetEvidence?.packet?.payload?.applicationBoundary?.targets || [];
  if (!/^[a-f0-9]{40}$/.test(applicationCommit || '') || !finalReleaseEvidence?.accepted ||
      !isMachineBoundFinalReleaseDecision(finalReleaseEvidence.decision) ||
      !validResolvers(options, ['resolveCommitTree', 'resolveParentCommit', 'resolveDiffPaths', 'resolveDiffEntries',
        'resolveGitFile', 'resolveGitPathState'])) {
    return { accepted: false, blockers: ['applicationBinding.inputsOrResolversRequired'] };
  }
  let applicationTree = null;
  try {
    applicationTree = options.resolveCommitTree(applicationCommit);
    const parentCommit = options.resolveParentCommit(applicationCommit);
    const paths = options.resolveDiffPaths(parentCommit, applicationCommit).sort();
    const entries = options.resolveDiffEntries(parentCommit, applicationCommit).sort((a, b) => a.path.localeCompare(b.path));
    if (parentCommit !== CONTENT_DECISION_FREEZE.commit ||
        options.resolveCommitTree(parentCommit) !== CONTENT_DECISION_FREEZE.tree ||
        !sameJson(paths, APPLICATION_DIFF_PATHS) || !sameJson(entries, APPLICATION_DIFF_ENTRIES) ||
        sha256Canonical(paths) !== sha256Canonical(APPLICATION_DIFF_PATHS) ||
        sha256Canonical(entries) !== sha256Canonical(APPLICATION_DIFF_ENTRIES)) {
      blockers.push('applicationBinding.lineageOrExactDiff');
    }
    verifyTargetsAtCommit(parentCommit, targets, options, blockers, 'applicationBinding.beforeTarget');
    for (const target of targets) {
      const actual = options.resolveGitFile(applicationCommit, target.sourcePath);
      if (actual.gitMode !== target.after.gitMode || actual.blobOid !== target.after.blobOid ||
          actual.bytes !== target.after.bytes || actual.sha256 !== target.after.sha256) {
        blockers.push(`applicationBinding.afterTarget.${target.sourcePath}`);
      }
    }
  } catch {
    blockers.push('applicationBinding.unreadable');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    applicationCommit,
    applicationTree,
    parentCommit: CONTENT_DECISION_FREEZE.commit,
    parentTree: CONTENT_DECISION_FREEZE.tree,
    fullPlanPackCompletedCandidate: blockers.length === 0,
    readinessClaimed: false
  };
}

function buildApplicationBindingReceipt({ applicationBinding, executionReceipt, claimEnvelope, packetEvidence, finalReleaseEvidence }) {
  if (!applicationBinding?.accepted) throw new Error('cm2118_application_binding_required');
  if (claimEnvelope?.state !== 'EXECUTION_RECEIPT_WRITTEN' ||
      claimEnvelope?.bindingHash !== executionReceipt?.payload?.registry?.bindingHash ||
      claimEnvelope?.claimedAt !== executionReceipt?.payload?.registry?.claimedAt ||
      claimEnvelope?.executionReceiptSha256 !== sha256(serializeArtifact(executionReceipt))) {
    throw new Error('cm2118_exact_durable_execution_receipt_claim_required');
  }
  const payload = {
    receiptType: 'full_plan_application_commit_binding_receipt',
    application: {
      commit: applicationBinding.applicationCommit,
      tree: applicationBinding.applicationTree,
      parentCommit: applicationBinding.parentCommit,
      parentTree: applicationBinding.parentTree,
      exactDiffPaths: APPLICATION_DIFF_PATHS,
      exactDiffEntries: APPLICATION_DIFF_ENTRIES,
      targets: packetEvidence.packet.payload.applicationBoundary.targets
    },
    contentDecision: {
      commit: CONTENT_DECISION_FREEZE.commit,
      blobOid: CONTENT_DECISION_FREEZE.json.blobOid,
      canonicalPayloadSha256: CONTENT_DECISION_FREEZE.canonicalPayloadSha256
    },
    executionPacket: {
      commit: packetEvidence.packetCommit,
      blobOid: packetEvidence.jsonIdentity.blobOid,
      canonicalPayloadSha256: packetEvidence.packet.canonicalPayloadSha256
    },
    finalRelease: {
      commit: finalReleaseEvidence.finalReleaseCommit,
      blobOid: finalReleaseEvidence.jsonIdentity.blobOid,
      canonicalPayloadSha256: finalReleaseEvidence.decision.canonicalPayloadSha256
    },
    executionReceipt: {
      canonicalPayloadSha256: executionReceipt.canonicalPayloadSha256,
      rawSha256: sha256(serializeArtifact(executionReceipt))
    },
    registry: {
      registryReference: REGISTRY_REFERENCE,
      claimId: claimId(),
      bindingHash: claimEnvelope.bindingHash,
      claimedAt: claimEnvelope.claimedAt,
      finalReleaseApprovedAt: claimEnvelope.finalReleaseApprovedAt,
      finalReleaseExpiresAt: claimEnvelope.finalReleaseExpiresAt,
      stateAtBindingReceipt: claimEnvelope.state,
      finalStateRequired: 'CONSUMED_SUCCESS',
      authorizationUseCount: 1,
      authorizationConsumed: true,
      authorizationReplayAllowed: false,
      patchInvocationCount: 1
    },
    appliedState: {
      fullPlanPackCompleted: true,
      statusSyncPerformed: false,
      readiness: Object.fromEntries(DECISION_READINESS_FIELDS.map(field => [field, false]))
    },
    sideEffects: executionReceipt.payload.sideEffects
  };
  return wrapPayload(payload, 'cm2118_full_plan_application_commit_binding_receipt_v1');
}

function evaluateApplicationBindingReceipt(receipt = {}, {
  packetCommit,
  finalReleaseCommit,
  executionReceipt,
  claimEnvelope,
  now = new Date(),
  ...options
} = {}) {
  const blockers = [];
  if (receipt.schemaVersion !== 1 || receipt.taskId !== TASK_ID ||
      receipt.artifactType !== 'cm2118_full_plan_application_commit_binding_receipt_v1' ||
      receipt.canonicalPayloadSha256 !== sha256Canonical(receipt.payload || {})) blockers.push('bindingReceipt.identityOrHash');
  const contentEvidence = intakeContentDecision(options);
  const packetEvidence = intakeExecutionPacket({ packetCommit, ...options });
  const finalReleaseEvidence = intakeFinalReleaseDecision({ finalReleaseCommit, packetEvidence, now, ...options });
  if (!contentEvidence.accepted || !packetEvidence.accepted || !finalReleaseEvidence.accepted) {
    blockers.push('bindingReceipt.upstreamRevalidation');
  }
  if (packetEvidence.accepted && finalReleaseEvidence.accepted) {
    const applicationBinding = verifyApplicationCommitBinding({
      applicationCommit: receipt.payload?.application?.commit,
      finalReleaseEvidence,
      packetEvidence,
      ...options
    });
    if (!applicationBinding.accepted) blockers.push(...applicationBinding.blockers.map(item => `bindingReceipt.${item}`));
    const executionEvaluation = evaluateExecutionReceipt(executionReceipt, { packetEvidence, finalReleaseEvidence });
    if (!executionEvaluation.accepted) blockers.push(...executionEvaluation.blockers.map(item => `bindingReceipt.${item}`));
    try {
      if (executionReceipt?.payload?.application?.commit !== applicationBinding.applicationCommit ||
          executionReceipt?.payload?.application?.tree !== applicationBinding.applicationTree ||
          executionReceipt?.payload?.application?.parentCommit !== applicationBinding.parentCommit ||
          executionReceipt?.payload?.application?.parentTree !== applicationBinding.parentTree) {
        blockers.push('bindingReceipt.executionReceiptApplicationBinding');
      }
      if (claimEnvelope?.state !== 'EXECUTION_RECEIPT_WRITTEN' ||
          claimEnvelope?.bindingHash !== executionReceipt?.payload?.registry?.bindingHash ||
          claimEnvelope?.finalReleaseDecisionReference !== finalReleaseEvidence.decision.payload.decisionReference ||
          claimEnvelope?.applicationCommit !== applicationBinding.applicationCommit ||
          claimEnvelope?.applicationTree !== applicationBinding.applicationTree ||
          claimEnvelope?.executionReceiptSha256 !== sha256(serializeArtifact(executionReceipt))) {
        blockers.push('bindingReceipt.claimEnvelope');
      }
      const expected = buildApplicationBindingReceipt({
        applicationBinding,
        executionReceipt,
        claimEnvelope,
        packetEvidence,
        finalReleaseEvidence
      });
      if (!sameJson(receipt, expected)) blockers.push('bindingReceipt.exactContent');
    } catch {
      blockers.push('bindingReceipt.exactContent');
    }
  }
  if (receipt.payload?.appliedState?.fullPlanPackCompleted !== true ||
      receipt.payload?.appliedState?.statusSyncPerformed !== false ||
      Object.values(receipt.payload?.appliedState?.readiness || {}).some(value => value !== false) ||
      ['nativeReads', 'nativeWrites', 'providerCalls', 'realMemoryReads', 'remoteActions', 'readinessClaims']
        .some(field => receipt.payload?.sideEffects?.[field] !== 0)) blockers.push('bindingReceipt.stateBoundary');
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    applicationCommitBound: blockers.length === 0,
    fullPlanPackCompleted: blockers.length === 0,
    readinessClaimed: false,
    statusSyncAuthorized: false
  };
}

function gitText(args, { cwd = process.cwd(), env = null, input = undefined } = {}) {
  return execFileSync('git', args, {
    cwd,
    env: env || sanitizedGitEnvironment(),
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024
  }).trim();
}

function assertGitCommitIdentity(repoRoot = process.cwd(), runGit = gitText) {
  for (const identityVariable of ['GIT_AUTHOR_IDENT', 'GIT_COMMITTER_IDENT']) {
    try {
      if (!runGit(['var', identityVariable], { cwd: repoRoot })) throw new Error('empty');
    } catch {
      throw new Error(`cm2118_git_commit_identity_required:${identityVariable}`);
    }
  }
  return true;
}

function resolveFixedGovernanceRoot(repoRoot = process.cwd()) {
  assertSafeGitEnvironment();
  const commonDir = path.resolve(repoRoot, gitText(['rev-parse', '--git-common-dir'], { cwd: repoRoot }));
  return path.join(commonDir, 'codex-memory-governance', 'phase8-one-shot-authorization-registries');
}

function createExactApplicationCommitWithGitPlumbing({ repoRoot, packetEvidence, governanceRoot }) {
  assertSafeGitEnvironment();
  const targets = packetEvidence.packet.payload.applicationBoundary.targets;
  const indexPath = path.join(governanceRoot, `.cm2118-application-index-${claimId()}`);
  if (fs.existsSync(indexPath)) throw new Error('cm2118_application_index_already_exists');
  const env = { ...sanitizedGitEnvironment(), GIT_INDEX_FILE: indexPath };
  gitText(['read-tree', CONTENT_DECISION_FREEZE.commit], { cwd: repoRoot, env });
  for (const target of targets) {
    let bytes;
    if (target.operation === 'add') {
      bytes = buildExpectedAfterBytes(target.sourcePath, null, CONTENT_DECISION_FREEZE.reference);
    } else {
      const before = execFileSync('git', ['cat-file', 'blob', target.before.blobOid], {
        cwd: repoRoot,
        env: sanitizedGitEnvironment(),
        encoding: null,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      bytes = buildExpectedAfterBytes(target.sourcePath, before, CONTENT_DECISION_FREEZE.reference);
    }
    if (bytes.length !== target.after.bytes || sha256(bytes) !== target.after.sha256 || gitBlobOid(bytes) !== target.after.blobOid) {
      throw new Error(`cm2118_target_after_projection_mismatch:${target.sourcePath}`);
    }
    const oid = gitText(['hash-object', '-w', '--stdin'], { cwd: repoRoot, input: bytes });
    if (oid !== target.after.blobOid) throw new Error(`cm2118_target_blob_oid_mismatch:${target.sourcePath}`);
    gitText(['update-index', '--add', '--cacheinfo', `${target.after.gitMode},${oid},${target.sourcePath}`], { cwd: repoRoot, env });
  }
  const tree = gitText(['write-tree'], { cwd: repoRoot, env });
  const commit = gitText([
    'commit-tree', tree, '-p', CONTENT_DECISION_FREEZE.commit, '-m',
    'docs: apply CM-2118 exact full-plan completion state'
  ], { cwd: repoRoot });
  return { commit, tree, parentCommit: CONTENT_DECISION_FREEZE.commit, parentTree: CONTENT_DECISION_FREEZE.tree, indexPath };
}

async function writeExternalReceipt(governanceRoot, filename, receipt) {
  const receiptPath = path.join(governanceRoot, filename);
  const bytes = Buffer.from(serializeArtifact(receipt));
  await fsPromises.writeFile(receiptPath, bytes, { flag: 'wx' });
  const observed = await fsPromises.readFile(receiptPath);
  if (!observed.equals(bytes)) throw new Error(`cm2118_receipt_readback_mismatch:${filename}`);
  return { path: receiptPath, bytes: bytes.length, sha256: sha256(bytes) };
}

function realResolverOptions() {
  const { resolverOptions } = require('../../scripts/generate-cm2116-exact-full-plan-application-gate');
  const gitResolvers = require('../../scripts/cm2115-r2-git');
  if (typeof gitResolvers.resolveDurableClaim === 'function') {
    return { ...resolverOptions(), resolveDurableClaim: gitResolvers.resolveDurableClaim };
  }
  const {
    GOVERNANCE_ROOT_IDENTITY: cm2115RootIdentity,
    GOVERNANCE_ROOT_IDENTITY_SHA256: cm2115RootIdentitySha256,
    canonicalize: cm2115Canonicalize,
    claimFileName: cm2115ClaimFileName,
    sha256: cm2115Sha256
  } = require('./Cm2115R2Phase2CompletionAuditApplication');
  const resolveDurableClaim = () => {
    if (!Number.isInteger(fs.constants.O_NOFOLLOW)) throw new Error('cm2118_no_follow_unavailable');
    const readRegular = filePath => {
      const descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
      try {
        if (!fs.fstatSync(descriptor).isFile()) throw new Error('cm2118_governance_file_invalid');
        return fs.readFileSync(descriptor);
      } finally {
        fs.closeSync(descriptor);
      }
    };
    const governanceRoot = gitResolvers.resolveGovernanceRegistryRoot();
    const rootStat = fs.lstatSync(governanceRoot);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('cm2118_governance_root_invalid');
    const identityBytes = readRegular(path.join(governanceRoot, '.phase8-registry-root-identity.json'));
    if (cm2115Sha256(identityBytes) !== cm2115RootIdentitySha256 ||
        identityBytes.toString('utf8') !== JSON.stringify(cm2115Canonicalize(cm2115RootIdentity))) {
      throw new Error('cm2118_governance_root_identity_mismatch');
    }
    return JSON.parse(readRegular(path.join(governanceRoot, cm2115ClaimFileName())).toString('utf8'));
  };
  return { ...resolverOptions(), resolveDurableClaim };
}

function assertFixedExecutionRuntime(packetEvidence) {
  const repositoryRoot = path.resolve(gitText(['rev-parse', '--show-toplevel']));
  if (repositoryRoot !== path.resolve(process.cwd())) throw new Error('cm2118_application_repository_root_required');
  if (gitText(['status', '--porcelain']) !== '') throw new Error('cm2118_clean_worktree_required');
  if (gitText(['branch', '--show-current']) !== '') throw new Error('cm2118_detached_checkout_required');
  const head = gitText(['rev-parse', 'HEAD^{commit}']);
  const tree = gitText(['rev-parse', 'HEAD^{tree}']);
  if (head !== packetEvidence.packet.payload.implementation.commit ||
      tree !== packetEvidence.packet.payload.implementation.tree) {
    throw new Error('cm2118_frozen_implementation_runtime_required');
  }
  return repositoryRoot;
}

async function readExternalReceipt(registry, filename) {
  const rootHandle = await openVerifiedGovernanceRoot(registry);
  let receiptHandle = null;
  try {
    receiptHandle = await registry.fs.open(
      governanceDescriptorPath(rootHandle, filename),
      fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW
    );
    const stat = await receiptHandle.stat();
    if (!stat.isFile()) throw new Error(`cm2118_receipt_invalid:${filename}`);
    const bytes = await receiptHandle.readFile();
    let receipt;
    try { receipt = JSON.parse(bytes.toString('utf8')); } catch { throw new Error(`cm2118_receipt_corrupt:${filename}`); }
    return { receipt, bytes, sha256: sha256(bytes) };
  } finally {
    if (receiptHandle) await receiptHandle.close().catch(() => {});
    await rootHandle.close().catch(() => {});
  }
}

async function evaluateDurableApplicationBinding({
  authorizationContentDecisionCommit,
  packetCommit,
  finalReleaseCommit
}) {
  assertSafeGitEnvironment();
  const blockers = [];
  if (authorizationContentDecisionCommit !== CONTENT_DECISION_FREEZE.commit) {
    return { accepted: false, blockers: ['durableBinding.exactContentDecisionCommitRequired'] };
  }
  const options = realResolverOptions();
  const packetEvidence = intakeExecutionPacket({ packetCommit, ...options });
  const governanceRoot = resolveFixedGovernanceRoot(process.cwd());
  const registry = new Cm2118FullPlanApplicationClaimRegistry({ governanceRoot });
  let claimEnvelope;
  try {
    claimEnvelope = await registry.read(null);
  } catch {
    return { accepted: false, blockers: ['durableBinding.claimUnreadable'] };
  }
  const historicalExecutionTime = new Date(claimEnvelope.claimedAt);
  const finalReleaseEvidence = intakeFinalReleaseDecision({
    finalReleaseCommit,
    packetEvidence,
    now: historicalExecutionTime,
    ...options
  });
  if (!packetEvidence.accepted || !finalReleaseEvidence.accepted) {
    return { accepted: false, blockers: ['durableBinding.upstreamRevalidation'] };
  }
  const bindingHash = buildClaimBindingHash({ packetEvidence, finalReleaseEvidence });
  let execution;
  let binding;
  try {
    claimEnvelope = await registry.read(bindingHash);
    if (claimEnvelope.state !== 'CONSUMED_SUCCESS' ||
        claimEnvelope.finalReleaseDecisionReference !== finalReleaseEvidence.decision.payload.decisionReference ||
        claimEnvelope.finalReleaseApprovedAt !== finalReleaseEvidence.decision.payload.approvedAt ||
        claimEnvelope.finalReleaseExpiresAt !== finalReleaseEvidence.decision.payload.expiresAt) {
      blockers.push('durableBinding.claimNotConsumedSuccess');
    }
    execution = await readExternalReceipt(registry, EXECUTION_RECEIPT_FILENAME);
    binding = await readExternalReceipt(registry, BINDING_RECEIPT_FILENAME);
    if (execution.sha256 !== claimEnvelope.executionReceiptSha256 ||
        binding.sha256 !== claimEnvelope.bindingReceiptSha256) blockers.push('durableBinding.receiptHash');
    const executionEvaluation = evaluateExecutionReceipt(execution.receipt, { packetEvidence, finalReleaseEvidence });
    if (!executionEvaluation.accepted) blockers.push(...executionEvaluation.blockers.map(item => `durableBinding.${item}`));
    const applicationBinding = verifyApplicationCommitBinding({
      applicationCommit: claimEnvelope.applicationCommit,
      finalReleaseEvidence,
      packetEvidence,
      ...options
    });
    if (!applicationBinding.accepted) blockers.push(...applicationBinding.blockers.map(item => `durableBinding.${item}`));
    const preBindingClaim = {
      ...claimEnvelope,
      state: 'EXECUTION_RECEIPT_WRITTEN',
      bindingReceiptCreated: false,
      bindingReceiptSha256: null,
      reconciliationRequired: true
    };
    const bindingEvaluation = evaluateApplicationBindingReceipt(binding.receipt, {
      packetCommit,
      finalReleaseCommit,
      executionReceipt: execution.receipt,
      claimEnvelope: preBindingClaim,
      now: historicalExecutionTime,
      ...options
    });
    if (!bindingEvaluation.accepted) blockers.push(...bindingEvaluation.blockers.map(item => `durableBinding.${item}`));
    if (claimEnvelope.bindingHash !== bindingHash ||
        execution.receipt.payload?.registry?.bindingHash !== bindingHash ||
        binding.receipt.payload?.registry?.bindingHash !== bindingHash) blockers.push('durableBinding.exactBindingHash');
  } catch {
    blockers.push('durableBinding.evidenceUnreadable');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    applicationCommit: blockers.length === 0 ? claimEnvelope.applicationCommit : null,
    applicationTree: blockers.length === 0 ? claimEnvelope.applicationTree : null,
    fullPlanPackCompleted: blockers.length === 0,
    readinessClaimed: false,
    statusSyncAuthorized: false
  };
}

async function executeFullPlanApplicationFromCommits({
  authorizationContentDecisionCommit,
  packetCommit,
  finalReleaseCommit
}) {
  if (authorizationContentDecisionCommit !== CONTENT_DECISION_FREEZE.commit ||
      !/^[a-f0-9]{40}$/.test(packetCommit || '') || !/^[a-f0-9]{40}$/.test(finalReleaseCommit || '')) {
    throw new Error('cm2118_exact_three_commit_inputs_required');
  }
  assertSafeGitEnvironment();
  const options = realResolverOptions();
  let packetEvidence = intakeExecutionPacket({ packetCommit, ...options });
  if (!packetEvidence.accepted) throw new Error(`cm2118_execution_packet_rejected:${packetEvidence.blockers.join(',')}`);
  const repositoryRoot = assertFixedExecutionRuntime(packetEvidence);
  const initialNow = new Date();
  let finalReleaseEvidence = intakeFinalReleaseDecision({ finalReleaseCommit, packetEvidence, now: initialNow, ...options });
  if (!finalReleaseEvidence.accepted) {
    throw new Error(`cm2118_final_release_rejected:${finalReleaseEvidence.blockers.join(',')}`);
  }

  // Re-intake all three upstream Git objects immediately before the first durable claim.
  packetEvidence = intakeExecutionPacket({ packetCommit, ...options });
  finalReleaseEvidence = intakeFinalReleaseDecision({ finalReleaseCommit, packetEvidence, now: new Date(), ...options });
  const contentEvidence = intakeContentDecision(options);
  if (!contentEvidence.accepted || !packetEvidence.accepted || !finalReleaseEvidence.accepted) {
    throw new Error('cm2118_preclaim_upstream_revalidation_failed');
  }
  const blockers = [];
  verifyTargetsAtCommit(CONTENT_DECISION_FREEZE.commit, packetEvidence.packet.payload.applicationBoundary.targets,
    options, blockers, 'execution.contentDecisionParentTarget');
  verifyTargetsAtCommit(finalReleaseCommit, packetEvidence.packet.payload.applicationBoundary.targets,
    options, blockers, 'execution.finalReleaseTarget');
  if (blockers.length) throw new Error(`cm2118_preclaim_target_revalidation_failed:${blockers.join(',')}`);

  const governanceRoot = resolveFixedGovernanceRoot(repositoryRoot);
  const registry = new Cm2118FullPlanApplicationClaimRegistry({ governanceRoot });
  let bindingHash = buildClaimBindingHash({ packetEvidence, finalReleaseEvidence });
  const existing = await registry.inspectExisting(bindingHash);
  if (existing.claimEnvelopePresent) {
    return {
      accepted: false,
      state: existing.state,
      authorizationConsumed: true,
      authorizationReplayAllowed: false,
      reconciliationRequired: existing.reconciliationRequired,
      applicationCommitCreated: existing.applicationCommitCreated,
      executionReceiptCreated: existing.executionReceiptCreated,
      bindingReceiptCreated: existing.bindingReceiptCreated,
      fullPlanPackCompleted: false,
      readinessClaimed: false,
      statusSyncAuthorized: false
    };
  }
  for (const filename of [EXECUTION_RECEIPT_FILENAME, BINDING_RECEIPT_FILENAME, `.cm2118-application-index-${claimId()}`]) {
    if (fs.existsSync(path.join(governanceRoot, filename))) throw new Error(`cm2118_preclaim_artifact_already_exists:${filename}`);
  }

  let currentState = 'UNCLAIMED';
  let applicationCommitKnown = false;
  let applicationIdentity = null;
  let executionReceiptWriteAttempted = false;
  let executionReceiptKnown = false;
  let executionReceiptIdentity = null;
  let bindingReceiptWriteAttempted = false;
  let bindingReceiptKnown = false;
  let bindingReceiptIdentity = null;
  try {
    const claimTime = new Date();
    packetEvidence = intakeExecutionPacket({ packetCommit, ...options });
    finalReleaseEvidence = intakeFinalReleaseDecision({ finalReleaseCommit, packetEvidence, now: claimTime, ...options });
    const finalContentEvidence = intakeContentDecision(options);
    if (!packetEvidence.accepted || !finalReleaseEvidence.accepted || !finalContentEvidence.accepted) {
      throw new Error('cm2118_immediate_preclaim_upstream_revalidation_failed');
    }
    const immediateBindingHash = buildClaimBindingHash({ packetEvidence, finalReleaseEvidence });
    if (immediateBindingHash !== bindingHash) throw new Error('cm2118_immediate_preclaim_binding_drift');
    assertGitCommitIdentity(repositoryRoot);
    bindingHash = immediateBindingHash;
    let claimEnvelope = await registry.claim(bindingHash, finalReleaseEvidence);
    const claimedAt = claimEnvelope.claimedAt;
    currentState = 'APPLICATION_COMMIT_INVOCATION_CONSUMED';
    const application = createExactApplicationCommitWithGitPlumbing({ repositoryRoot, repoRoot: repositoryRoot, packetEvidence, governanceRoot });
    applicationIdentity = { commit: application.commit, tree: application.tree };
    applicationCommitKnown = true;
    claimEnvelope = await registry.transition(
      bindingHash,
      currentState,
      'APPLICATION_COMMIT_CREATED',
      {
        applicationCommitCreated: true,
        applicationCommit: application.commit,
        applicationTree: application.tree
      }
    );
    currentState = claimEnvelope.state;
    const applicationBinding = verifyApplicationCommitBinding({
      applicationCommit: application.commit,
      finalReleaseEvidence,
      packetEvidence,
      ...options
    });
    if (!applicationBinding.accepted) throw new Error(`cm2118_application_commit_rejected:${applicationBinding.blockers.join(',')}`);
    const executionReceipt = buildExecutionReceipt({
      packetEvidence,
      finalReleaseEvidence,
      bindingHash,
      applicationCommit: application.commit,
      applicationTree: application.tree,
      claimedAt
    });
    const executionEvaluation = evaluateExecutionReceipt(executionReceipt, { packetEvidence, finalReleaseEvidence });
    if (!executionEvaluation.accepted) throw new Error(`cm2118_execution_receipt_rejected:${executionEvaluation.blockers.join(',')}`);
    executionReceiptIdentity = { sha256: sha256(serializeArtifact(executionReceipt)) };
    executionReceiptWriteAttempted = true;
    await registry.verifyRoot();
    executionReceiptIdentity = await writeExternalReceipt(governanceRoot, EXECUTION_RECEIPT_FILENAME, executionReceipt);
    executionReceiptKnown = true;
    claimEnvelope = await registry.transition(bindingHash, currentState, 'EXECUTION_RECEIPT_WRITTEN', {
      executionReceiptCreated: true,
      executionReceiptSha256: executionReceiptIdentity.sha256
    });
    currentState = claimEnvelope.state;
    const bindingReceipt = buildApplicationBindingReceipt({
      applicationBinding,
      executionReceipt,
      claimEnvelope,
      packetEvidence,
      finalReleaseEvidence
    });
    const bindingEvaluation = evaluateApplicationBindingReceipt(bindingReceipt, {
      packetCommit,
      finalReleaseCommit,
      executionReceipt,
      claimEnvelope,
      now: new Date(claimedAt),
      ...options
    });
    if (!bindingEvaluation.accepted) throw new Error(`cm2118_binding_receipt_rejected:${bindingEvaluation.blockers.join(',')}`);
    bindingReceiptIdentity = { sha256: sha256(serializeArtifact(bindingReceipt)) };
    bindingReceiptWriteAttempted = true;
    await registry.verifyRoot();
    bindingReceiptIdentity = await writeExternalReceipt(governanceRoot, BINDING_RECEIPT_FILENAME, bindingReceipt);
    bindingReceiptKnown = true;
    claimEnvelope = await registry.transition(bindingHash, currentState, 'BINDING_RECEIPT_WRITTEN', {
      bindingReceiptCreated: true,
      bindingReceiptSha256: bindingReceiptIdentity.sha256
    });
    currentState = claimEnvelope.state;
    claimEnvelope = await registry.transition(bindingHash, currentState, 'CONSUMED_SUCCESS');
    const durable = await evaluateDurableApplicationBinding({
      authorizationContentDecisionCommit,
      packetCommit,
      finalReleaseCommit
    });
    if (!durable.accepted) throw new Error(`cm2118_durable_binding_rejected:${durable.blockers.join(',')}`);
    return {
      accepted: true,
      state: claimEnvelope.state,
      application: {
        commit: claimEnvelope.applicationCommit,
        tree: claimEnvelope.applicationTree,
        parentCommit: CONTENT_DECISION_FREEZE.commit,
        parentTree: CONTENT_DECISION_FREEZE.tree
      },
      authorizationConsumed: true,
      authorizationReplayAllowed: false,
      reconciliationRequired: false,
      fullPlanPackCompleted: true,
      readinessClaimed: false,
      statusSyncAuthorized: false
    };
  } catch (error) {
    if (currentState !== 'UNCLAIMED' && currentState !== 'CONSUMED_SUCCESS') {
      await registry.transition(bindingHash, currentState, 'CONSUMED_AMBIGUOUS', {
        applicationCommitCreated: applicationCommitKnown ? true : null,
        applicationCommit: applicationIdentity?.commit || null,
        applicationTree: applicationIdentity?.tree || null,
        executionReceiptCreated: executionReceiptKnown ? true : (executionReceiptWriteAttempted ? null : false),
        executionReceiptSha256: executionReceiptIdentity?.sha256 || null,
        bindingReceiptCreated: bindingReceiptKnown ? true : (bindingReceiptWriteAttempted ? null : false),
        bindingReceiptSha256: bindingReceiptIdentity?.sha256 || null
      }).catch(() => {});
    }
    throw error;
  }
}

module.exports = {
  ACTION,
  APPLICATION_DIFF_ENTRIES,
  APPLICATION_DIFF_PATHS,
  APPLICATION_STATE_PATH,
  BINDING_RECEIPT_FILENAME,
  CONTENT_DECISION_FREEZE,
  EXECUTION_RECEIPT_FILENAME,
  FINAL_RELEASE_DIFF_PATHS,
  FINAL_RELEASE_MARKDOWN_PATH,
  FINAL_RELEASE_PATH,
  FINAL_RELEASE_TASK_ID,
  GOVERNANCE_ROOT_IDENTITY,
  GOVERNANCE_ROOT_IDENTITY_SHA256,
  IMPLEMENTATION_ARTIFACT_PATHS,
  IMPLEMENTATION_DIFF_PATHS,
  IMPLEMENTATION_PARENT_FREEZE,
  NONCE,
  PACKET_DIFF_PATHS,
  PACKET_MARKDOWN_PATH,
  PACKET_PATH,
  RECEIPT_ID,
  REGISTRY_REFERENCE,
  STATUS_SYNC_PATHS,
  TASK_ID,
  Cm2118FullPlanApplicationClaimRegistry,
  assertGitCommitIdentity,
  assertSafeGitEnvironment,
  buildExecutionPacket,
  buildFinalReleaseDecision,
  claimFileName,
  claimId,
  deepFreeze,
  evaluateDurableApplicationBinding,
  evaluateExecutionPacket,
  evaluateFinalReleaseDecision,
  expectedFinalReleaseEntries,
  expectedImplementationEntries,
  executeFullPlanApplicationFromCommits,
  identityWithoutContent,
  intakeContentDecision,
  intakeExecutionPacket,
  intakeFinalReleaseDecision,
  isMachineBoundContentDecision,
  isMachineBoundExecutionPacket,
  isMachineBoundFinalReleaseDecision,
  realResolverOptions,
  sanitizedGitEnvironment,
  unsafeGitEnvironmentKeys,
  wrapPayload
};
