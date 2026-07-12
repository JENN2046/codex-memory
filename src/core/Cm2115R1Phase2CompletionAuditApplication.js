'use strict';

const crypto = require('node:crypto');
const {
  evaluatePhase2MachineExecutionEvidenceManifestContract
} = require('./Phase2MachineExecutionEvidenceManifestContract');

const TASK_ID = 'CM-2115-R1';
const DECISION_REFERENCE = 'CM-2115-R1-SELF-PHASE2-COMPLETION-AUDIT-APPLICATION-2215BB33';
const DECISION_PATH = 'docs/near-model-memory-plan-pack/phase2_completion_audit_application_decision_cm2115_r1.json';
const RECEIPT_PATH = 'docs/near-model-memory-plan-pack/phase2_completion_audit_application_receipt_cm2115_r1.json';

const CM2080 = Object.freeze({
  decisionReference: 'CM-2080-ER-20260711-PASS-F440C1BD-2215BB33',
  sourceCommit: '88d11e94dc238145ba9317589cebda52f73910e1',
  sourceTree: 'a9e5cc8fe05af8518da1e29288d0e7fa71dfab2c',
  sourcePath: 'docs/near-model-memory-plan-pack/external_review_final_decision_cm2080.json',
  blobOid: 'cee6321853e531b465458bc0286a613245054b5b',
  bytes: 3563,
  sha256: 'f022a5e88b22b824b35d9cccd0627ad00b2923b1dbae8e4463b41c3c27f5dc4e',
  canonicalPayloadSha256: '2215bb33de9eb58cb3fb4c9d04ba57c77bd6794aeae9e1d73966477a6f8622f2'
});

const PHASE2_MANIFEST = Object.freeze({
  sourceCommit: 'c0b8c24eb89efdd76305dc725b5416f7ce46a3a1',
  sourceTree: 'bf5bbdaf47a7f05988d8e8d1b8ab4479e1a65ae4',
  sourcePath: 'docs/near-model-memory-plan-pack/phase2_machine_execution_evidence_manifest.json',
  blobOid: '4ccc78ad3cdd2489d10ab0d6a680bbca9ce4e592',
  bytes: 6937,
  sha256: '9697fec7e60ac3a51f9339e1dd4694075f818940007cbc653c89f5ca01ce0e03'
});

const WINDOWS_WSL_RECEIPT = Object.freeze({
  sourceCommit: 'c0b8c24eb89efdd76305dc725b5416f7ce46a3a1',
  sourceTree: 'bf5bbdaf47a7f05988d8e8d1b8ab4479e1a65ae4',
  sourcePath: 'docs/near-model-memory-plan-pack/windows_wsl_machine_smoke_receipt.json',
  blobOid: '83bca87e0c06a08046eb88d1fac55418c0ad37fd',
  bytes: 795,
  sha256: '60b38d4025d567aa8ac7b839b00aa3539884d67450647157cbe22b9c2363718d'
});

const EXACT_PHASE2_FIELDS = Object.freeze([
  'nativeTargetBindingPassed',
  'nativeReadProofPassed',
  'fallbackDistinctionPassed',
  'lowDisclosureProofPassed',
  'auditReceiptPassed',
  'scopeVisibilityIsolationPassed',
  'wslLinuxProofPassed',
  'windowsWslSmokePassed',
  'phase2ReceiptBundleAppliedToCompletionAudit'
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256Canonical(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function gitBlobOid(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const header = Buffer.from(`blob ${bytes.length}\0`);
  return crypto.createHash('sha1').update(header).update(bytes).digest('hex');
}

function exactEvidencePatch() {
  return Object.fromEntries(EXACT_PHASE2_FIELDS.map(field => [field, true]));
}

function buildDecision() {
  const payload = {
    decisionReference: DECISION_REFERENCE,
    decisionType: 'phase2_machine_evidence_completion_audit_application_decision',
    authority: {
      authorityClass: 'jenn_direct_exact_repository_evidence_application',
      authorityReference: 'JENN-CM2115-R1-20260712',
      applicationAuthorized: true,
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      rawApprovalMaterialStored: false
    },
    acceptedExternalReview: { ...CM2080 },
    acceptedMachineEvidence: {
      phase2Manifest: { ...PHASE2_MANIFEST },
      windowsWslReceipt: { ...WINDOWS_WSL_RECEIPT },
      machineExecutionContractMustPass: true,
      oldCm2074ApplicationMayActAsCurrentAuthority: false
    },
    requiredEvidencePatch: exactEvidencePatch(),
    allowedStateAfterApplication: {
      phase2GovernedNativeReadEvidenceApplicationPassed: true,
      phase2ReceiptBundleAppliedToCompletionAudit: true,
      independentReviewPassed: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    applicationSideEffectLimits: {
      completionAuditPatchApplications: 1,
      nativeReads: 0,
      nativeWrites: 0,
      durableMutations: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    },
    nonClaims: {
      productionReady: false,
      releaseReady: false,
      deployReady: false,
      cutoverReady: false,
      rcReady: false,
      completeV8: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    }
  };
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    decisionType: 'phase2_completion_audit_application_decision_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function serializeArtifact(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

function equalJson(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function isGitIdentity(value, expectedPath = null) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    /^[a-f0-9]{40}$/.test(value.sourceCommit || '') &&
    /^[a-f0-9]{40}$/.test(value.sourceTree || '') &&
    /^[a-f0-9]{40}$/.test(value.blobOid || '') &&
    Number.isInteger(value.bytes) && value.bytes > 0 &&
    /^[a-f0-9]{64}$/.test(value.sha256 || '') &&
    typeof value.sourcePath === 'string' &&
    (expectedPath === null || value.sourcePath === expectedPath);
}

function evaluateDecision(decision = {}) {
  const blockers = [];
  const expected = buildDecision();
  if (!equalJson(decision, expected)) blockers.push('decision.exactContent');
  if (decision.canonicalPayloadSha256 !== sha256Canonical(decision.payload || {})) {
    blockers.push('decision.canonicalPayloadSha256');
  }
  return { accepted: blockers.length === 0, blockers };
}

function evaluateCm2080Decision(decision = {}) {
  const blockers = [];
  if (decision.schemaVersion !== 1 || decision.decisionReference !== CM2080.decisionReference) {
    blockers.push('cm2080.identity');
  }
  if (decision.decisions?.externalReviewPassed !== true ||
      decision.decisions?.externalReviewEvidenceBundleAppliedToCompletionAudit !== false ||
      decision.decisions?.tagApprovalPacketPassed !== false ||
      decision.decisions?.phase8NativeWriteAuthorizationGranted !== false) {
    blockers.push('cm2080.decisions');
  }
  if (decision.reviewBinding?.canonicalPayloadSha256 !== CM2080.canonicalPayloadSha256) {
    blockers.push('cm2080.canonicalPayloadSha256');
  }
  const manifest = decision.evidenceObjects?.phase2MachineExecutionManifest;
  if (manifest?.bytes !== PHASE2_MANIFEST.bytes || manifest?.blobOid !== PHASE2_MANIFEST.blobOid ||
      manifest?.sha256 !== PHASE2_MANIFEST.sha256) blockers.push('cm2080.phase2Manifest');
  const smoke = decision.evidenceObjects?.windowsWslMachineSmoke;
  if (smoke?.bytes !== WINDOWS_WSL_RECEIPT.bytes || smoke?.blobOid !== WINDOWS_WSL_RECEIPT.blobOid ||
      smoke?.sha256 !== WINDOWS_WSL_RECEIPT.sha256) blockers.push('cm2080.windowsWslReceipt');
  const facts = decision.acceptedFacts || {};
  if (facts.focusedReplayPassed !== true || facts.phase2NativeReadAttempts !== 3 ||
      facts.phase2NativeReadSuccesses !== 3 || facts.phase2PrimaryMemoryWrites !== 0 ||
      facts.phase2NativeMemoryWrites !== 0 || facts.phase2LocalFallbackUses !== 0 ||
      facts.phase2RawPrivateReturns !== 0 || facts.isolatedDerivedIndexWritesAreNativeProof !== false ||
      facts.vcpToolBoxRemainsMemoryIntelligenceOwner !== true) blockers.push('cm2080.acceptedFacts');
  if (decision.preservedBoundaries?.fullPlanPackCompletedClaimed !== false ||
      decision.preservedBoundaries?.productionReadinessClaimed !== false ||
      decision.preservedBoundaries?.releaseReadinessClaimed !== false ||
      decision.preservedBoundaries?.rcReadyClaimed !== false) blockers.push('cm2080.boundaries');
  return { accepted: blockers.length === 0, blockers };
}

function verifyFixedIdentity(actual, expected, label, blockers) {
  if (!isGitIdentity(actual, expected.sourcePath) ||
      actual.sourceCommit !== expected.sourceCommit || actual.sourceTree !== expected.sourceTree ||
      actual.blobOid !== expected.blobOid || actual.bytes !== expected.bytes ||
      actual.sha256 !== expected.sha256) {
    blockers.push(label);
  }
}

function buildReceiptPayload(decisionGitIdentity) {
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    receiptType: 'phase2_completion_audit_application_receipt_v1',
    decision: {
      reference: DECISION_REFERENCE,
      ...decisionGitIdentity
    },
    acceptedExternalReview: { ...CM2080 },
    acceptedMachineEvidence: {
      phase2Manifest: { ...PHASE2_MANIFEST },
      windowsWslReceipt: { ...WINDOWS_WSL_RECEIPT },
      machineExecutionContractAccepted: true,
      oldCm2074ApplicationUsedAsCurrentAuthority: false
    },
    applicationResult: {
      applicationGateAccepted: true,
      exactEvidencePatchApplied: exactEvidencePatch(),
      phase2GovernedNativeReadEvidenceApplicationPassed: true,
      completionAuditPatchApplications: 1
    },
    currentState: {
      phase2ReceiptBundleAppliedToCompletionAudit: true,
      independentReviewPassed: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    authorization: {
      useCount: 1,
      consumed: true,
      replayAllowed: false
    },
    sideEffects: {
      nativeReads: 0,
      nativeWrites: 0,
      durableMutations: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    },
    nonClaims: {
      additionalNativeActionAuthorized: false,
      productionReady: false,
      releaseReady: false,
      deployReady: false,
      cutoverReady: false,
      rcReady: false,
      completeV8: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    }
  };
}

function failure(blockers) {
  return {
    accepted: false,
    blockers: [...new Set(blockers)],
    receiptPayload: null,
    receiptPayloadSha256: null,
    independentReviewPassed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

function executeApplication(input = {}) {
  const blockers = [];
  const decisionEvaluation = evaluateDecision(input.decision);
  if (!decisionEvaluation.accepted) blockers.push(...decisionEvaluation.blockers);
  const expectedDecisionBytes = Buffer.from(serializeArtifact(buildDecision()));
  if (!isGitIdentity(input.decisionGitIdentity, DECISION_PATH) ||
      input.decisionGitIdentity?.bytes !== expectedDecisionBytes.length ||
      input.decisionGitIdentity?.sha256 !== sha256(expectedDecisionBytes) ||
      input.decisionGitIdentity?.blobOid !== gitBlobOid(expectedDecisionBytes) ||
      !Buffer.isBuffer(input.decisionRawBytes) || !input.decisionRawBytes.equals(expectedDecisionBytes)) {
    blockers.push('decision.gitIdentityOrBytes');
  }
  verifyFixedIdentity(input.externalReviewGitIdentity, CM2080, 'cm2080.gitIdentity', blockers);
  verifyFixedIdentity(input.phase2ManifestGitIdentity, PHASE2_MANIFEST, 'phase2Manifest.gitIdentity', blockers);
  verifyFixedIdentity(input.windowsWslReceiptGitIdentity, WINDOWS_WSL_RECEIPT, 'windowsWslReceipt.gitIdentity', blockers);
  const review = evaluateCm2080Decision(input.externalReviewDecision);
  if (!review.accepted) blockers.push(...review.blockers);
  const machine = evaluatePhase2MachineExecutionEvidenceManifestContract(
    input.phase2Manifest,
    input.windowsWslReceipt
  );
  if (!machine.accepted || machine.completionEligible !== true) {
    blockers.push(...machine.blockers.map(item => `machine.${item}`));
    if (machine.blockers.length === 0) blockers.push('machine.notCompletionEligible');
  }
  const baseline = input.baseline || {};
  if (baseline.cleanWorktree !== true || baseline.applicationReceiptAbsent !== true ||
      baseline.completionAuditWorktreeMatchesHead !== true ||
      baseline.traceMatrixWorktreeMatchesHead !== true ||
      baseline.independentReviewPassed !== false || baseline.fullPlanPackCompleted !== false ||
      baseline.readinessClaimed !== false || baseline.oldCm2074UsedAsCurrentAuthority !== false) {
    blockers.push('baseline.boundary');
  }
  if (blockers.length > 0) return failure(blockers);
  const receiptPayload = buildReceiptPayload(input.decisionGitIdentity);
  return {
    accepted: true,
    blockers: [],
    receiptPayload,
    receiptPayloadSha256: sha256Canonical(receiptPayload),
    appliedEvidence: exactEvidencePatch(),
    independentReviewPassed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

function evaluateApplicationReceipt(receipt = {}, { resolveGitFile } = {}) {
  const blockers = [];
  const payload = receipt.receiptPayload || {};
  if (receipt.receiptPayloadSha256 !== sha256Canonical(payload)) blockers.push('receipt.payloadSha256');
  const decisionIdentity = payload.decision && {
    sourceCommit: payload.decision.sourceCommit,
    sourceTree: payload.decision.sourceTree,
    sourcePath: payload.decision.sourcePath,
    blobOid: payload.decision.blobOid,
    bytes: payload.decision.bytes,
    sha256: payload.decision.sha256
  };
  if (!isGitIdentity(decisionIdentity, DECISION_PATH) ||
      payload.decision?.reference !== DECISION_REFERENCE ||
      !equalJson(payload, buildReceiptPayload(decisionIdentity))) blockers.push('receipt.exactContent');
  if (typeof resolveGitFile === 'function' && isGitIdentity(decisionIdentity, DECISION_PATH)) {
    try {
      const actual = resolveGitFile(decisionIdentity.sourceCommit, DECISION_PATH);
      if (actual.blobOid !== decisionIdentity.blobOid || actual.bytes !== decisionIdentity.bytes ||
          actual.sha256 !== decisionIdentity.sha256 || actual.sourceTree !== decisionIdentity.sourceTree ||
          !Buffer.from(actual.content).equals(Buffer.from(serializeArtifact(buildDecision())))) {
        blockers.push('receipt.decisionGitObject');
      }
    } catch {
      blockers.push('receipt.decisionGitObject');
    }
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    phase2ReceiptBundleAppliedToCompletionAudit: blockers.length === 0,
    independentReviewPassed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

module.exports = {
  CM2080,
  DECISION_PATH,
  DECISION_REFERENCE,
  EXACT_PHASE2_FIELDS,
  PHASE2_MANIFEST,
  RECEIPT_PATH,
  TASK_ID,
  WINDOWS_WSL_RECEIPT,
  buildDecision,
  buildReceiptPayload,
  canonicalize,
  evaluateApplicationReceipt,
  evaluateCm2080Decision,
  evaluateDecision,
  exactEvidencePatch,
  executeApplication,
  gitBlobOid,
  serializeArtifact,
  sha256,
  sha256Canonical
};
