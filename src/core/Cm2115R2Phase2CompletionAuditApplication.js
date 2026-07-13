'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const {
  CM2080,
  EXACT_PHASE2_FIELDS,
  PHASE2_MANIFEST,
  WINDOWS_WSL_RECEIPT,
  evaluateCm2080Decision
} = require('./Cm2115R1Phase2CompletionAuditApplication');
const {
  evaluatePhase2MachineExecutionEvidenceManifestContract
} = require('./Phase2MachineExecutionEvidenceManifestContract');

const TASK_ID = 'CM-2115-R2';
const AUTHORITY_REFERENCE = 'JENN-CM2115-R2-20260712';
const AUTHORITY_PATH = 'docs/near-model-memory-plan-pack/phase2_completion_audit_application_authority_intake_cm2115_r2.json';
const DECISION_REFERENCE = 'CM-2115-R2-DIRECT-PHASE2-EXACT-PATCH-APPLICATION-2215BB33';
const DECISION_PATH = 'docs/near-model-memory-plan-pack/phase2_completion_audit_application_decision_cm2115_r2.json';
const EXECUTION_RECEIPT_PATH = 'docs/near-model-memory-plan-pack/phase2_completion_audit_application_execution_receipt_cm2115_r2.json';
const EXECUTION_RECEIPT_MARKDOWN_PATH = EXECUTION_RECEIPT_PATH.replace(/\.json$/, '.md');
const BINDING_RECEIPT_PATH = 'docs/near-model-memory-plan-pack/phase2_completion_audit_application_binding_receipt_cm2115_r2.json';
const BINDING_RECEIPT_V2_PATH = 'docs/near-model-memory-plan-pack/phase2_completion_audit_application_binding_receipt_cm2115_r2_v2.json';
const APPLICATION_STATE_PATH = 'docs/near-model-memory-plan-pack/phase2_completion_audit_application_state_cm2115_r2.json';
const REGISTRY_REFERENCE = 'cm2115-r2-phase2-completion-audit-application-registry-001';
const NONCE = 'cm2115-r2-phase2-completion-audit-application-001';
const RECEIPT_ID = 'cm2115-r2-phase2-completion-audit-application-receipt-001';

const GOVERNANCE_ROOT_IDENTITY = Object.freeze({
  registryRootInstanceId: 'cm2093-phase8-governance-root-instance-001',
  registryRootReference: 'codex-memory-phase8-governance-root',
  registryRootReinitializationAllowed: false,
  registryRootReplacementAllowed: false
});
const GOVERNANCE_ROOT_IDENTITY_SHA256 = '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0';

const EXISTING_PATCH_PATHS = Object.freeze([
  'docs/near-model-memory-plan-pack/completion_audit_report.md',
  'docs/near-model-memory-plan-pack/evidence_trace_matrix_report.md',
  'docs/near-model-memory-plan-pack/06_ACCEPTANCE_MATRIX.md',
  'docs/near-model-memory-plan-pack/07_CAPABILITY_MATRIX.md'
]);
const PATCH_PATHS = Object.freeze([...EXISTING_PATCH_PATHS, APPLICATION_STATE_PATH]);

const PATCH_APPEND_BY_PATH = Object.freeze({
  'docs/near-model-memory-plan-pack/completion_audit_report.md': [
    '## CM-2115-R2 Exact Phase 2 Application Binding',
    '',
    'CM-2115-R2 supersedes the R1 application claim. Its execution receipt is',
    'created only after a durable one-shot claim and exact readback of the',
    'allowlisted Completion Audit patch. A separate Git binding receipt must',
    'then bind the application commit/tree, direct parent, exact diff, and every',
    'pre/post blob before this application may serve as current evidence.',
    '',
    `Machine state: \`${APPLICATION_STATE_PATH}\`.`,
    '',
    '`independentReviewPassed=false`, `fullPlanPackCompleted=false`, and',
    '`readinessClaimed=false` remain authoritative.',
    ''
  ].join('\n'),
  'docs/near-model-memory-plan-pack/evidence_trace_matrix_report.md': [
    '## CM-2115-R2 Exact Patch Binding Trace',
    '',
    'The nine Phase 2 exact fields may use CM-2115-R2 only through the final',
    'application binding receipt. The execution receipt alone is insufficient.',
    'The binding receipt must re-read CM-2080, the Phase 2 manifest, and the',
    'Windows/WSL receipt from their exact Git objects and verify the application',
    'commit direct-parent relation plus the allowlisted pre/post blob set.',
    '',
    'R1 remains historical and is not current application authority.',
    ''
  ].join('\n'),
  'docs/near-model-memory-plan-pack/06_ACCEPTANCE_MATRIX.md': [
    '## CM-2115-R2 Exact Application Boundary',
    '',
    '| Evidence | Acceptance boundary | Independent review | Current status |',
    '|---|---|---|---|',
    '| CM-2115-R2 Phase 2 binding receipt | Durable one-shot claim + exact application commit/tree/diff/pre-post blobs + receipt-time upstream Git revalidation | Required | Pending until binding receipt is frozen |',
    '',
    'R1 receipt shape alone is not accepted as current patch evidence.',
    ''
  ].join('\n'),
  'docs/near-model-memory-plan-pack/07_CAPABILITY_MATRIX.md': [
    '## CM-2115-R2 Evidence Application Boundary',
    '',
    '- Phase 2 application evidence requires the R2 binding receipt, not the R1 receipt alone.',
    '- The application changes repository evidence only; it performs no runtime, native memory, provider, real-memory, or remote action.',
    '- Full-plan completion and every readiness state remain false.',
    ''
  ].join('\n')
});

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
  return crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
}

function serializeArtifact(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

function sameJson(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function exactEvidencePatch() {
  return Object.fromEntries(EXACT_PHASE2_FIELDS.map(field => [field, true]));
}

function buildAuthorityIntake() {
  const payload = {
    authorityReference: AUTHORITY_REFERENCE,
    authoritySourceCategory: 'current_user_direct_instruction',
    rawAuthorityMaterialStored: false,
    allowedAction: 'apply_cm2080_phase2_machine_evidence_to_completion_audit_exact_patch',
    authorizationUseCount: 1,
    authorizationReplayAllowed: false,
    requiredControls: {
      durableOneShotClaim: true,
      exactBeforeAfterPatchBinding: true,
      applicationCommitBindingReceipt: true,
      receiptTimeUpstreamGitRevalidation: true,
      fixedOutputPathsOnly: true
    },
    allowedEffects: {
      durableClaimCreates: 1,
      completionAuditPatchApplications: 1,
      bindingReceiptPreparations: 1
    },
    forbiddenEffects: {
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    },
    requiredState: {
      independentReviewPassed: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    }
  };
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    intakeType: 'direct_user_authority_intake_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function evaluateAuthorityIntake(value = {}) {
  const expected = buildAuthorityIntake();
  const blockers = [];
  if (!sameJson(value, expected)) blockers.push('authority.exactContent');
  if (value.canonicalPayloadSha256 !== sha256Canonical(value.payload || {})) blockers.push('authority.payloadSha256');
  return { accepted: blockers.length === 0, blockers };
}

function buildApplicationState() {
  const payload = {
    stateType: 'phase2_completion_audit_application_state',
    supersedesApplicationTask: 'CM-2115-R1',
    acceptedExternalReviewDecisionReference: CM2080.decisionReference,
    appliedEvidence: exactEvidencePatch(),
    applicationBindingReceiptRequired: true,
    applicationBindingReceiptFrozen: false,
    phase2ReceiptBundleAppliedToCompletionAudit: false,
    independentReviewPassed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    sideEffects: {
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    }
  };
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    stateType: 'phase2_completion_audit_application_state_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function appendExactBlock(before, block, pathLabel) {
  if (!Buffer.isBuffer(before)) throw new TypeError(`cm2115_r2_before_bytes_required:${pathLabel}`);
  const text = before.toString('utf8');
  const marker = block.split('\n')[0];
  if (text.includes(marker)) throw new Error(`cm2115_r2_patch_marker_already_present:${pathLabel}`);
  return Buffer.from(`${text.endsWith('\n') ? text : `${text}\n`}\n${block}`, 'utf8');
}

function buildExpectedAfterBytes(sourcePath, beforeBytes = null) {
  if (sourcePath === APPLICATION_STATE_PATH) return Buffer.from(serializeArtifact(buildApplicationState()));
  const block = PATCH_APPEND_BY_PATH[sourcePath];
  if (!block) throw new Error(`cm2115_r2_unknown_patch_path:${sourcePath}`);
  return appendExactBlock(beforeBytes, block, sourcePath);
}

function fileProjection(bytes, gitMode = '100644') {
  return {
    gitMode,
    blobOid: gitBlobOid(bytes),
    bytes: bytes.length,
    sha256: sha256(bytes)
  };
}

function expectedAfterForTarget(target, beforeBytes = null) {
  const bytes = buildExpectedAfterBytes(target.sourcePath, beforeBytes);
  const gitMode = target.operation === 'add' ? '100644' : target.before.gitMode;
  return { bytes, projection: fileProjection(bytes, gitMode) };
}

function buildPatchTargets(resolveBaselineFile) {
  if (typeof resolveBaselineFile !== 'function') throw new TypeError('cm2115_r2_baseline_resolver_required');
  return PATCH_PATHS.map(sourcePath => {
    if (sourcePath === APPLICATION_STATE_PATH) {
      const afterBytes = buildExpectedAfterBytes(sourcePath);
      return {
        sourcePath,
        operation: 'add',
        before: null,
        after: fileProjection(afterBytes)
      };
    }
    const actual = resolveBaselineFile(sourcePath);
    if (!actual || actual.gitObjectType !== 'blob' || !Buffer.isBuffer(actual.content)) {
      throw new Error(`cm2115_r2_baseline_file_invalid:${sourcePath}`);
    }
    const before = {
      gitMode: actual.gitMode,
      blobOid: actual.blobOid,
      bytes: actual.bytes,
      sha256: actual.sha256
    };
    const afterBytes = buildExpectedAfterBytes(sourcePath, actual.content);
    return {
      sourcePath,
      operation: 'modify',
      before,
      after: fileProjection(afterBytes, actual.gitMode)
    };
  });
}

function buildDecision({ authorityGitIdentity, baselineCommit, baselineTree, targets }) {
  const patchPlan = {
    baselineCommit,
    baselineTree,
    targets,
    allowedPaths: [...PATCH_PATHS],
    executionReceiptPaths: [EXECUTION_RECEIPT_PATH, EXECUTION_RECEIPT_MARKDOWN_PATH],
    applicationCommitBindingRequired: true
  };
  patchPlan.patchPayloadSha256 = sha256Canonical(patchPlan);
  const payload = {
    decisionReference: DECISION_REFERENCE,
    decisionType: 'phase2_exact_patch_application_decision',
    authority: {
      reference: AUTHORITY_REFERENCE,
      ...authorityGitIdentity,
      authorizationUseCount: 1,
      authorizationReplayAllowed: false
    },
    acceptedExternalReview: { ...CM2080 },
    acceptedMachineEvidence: {
      phase2Manifest: { ...PHASE2_MANIFEST },
      windowsWslReceipt: { ...WINDOWS_WSL_RECEIPT }
    },
    registry: {
      governanceRootIdentitySha256: GOVERNANCE_ROOT_IDENTITY_SHA256,
      registryReference: REGISTRY_REFERENCE,
      nonce: NONCE,
      receiptId: RECEIPT_ID,
      claimCreateCount: 1,
      replayAllowed: false
    },
    patchPlan,
    allowedStateAfterApplication: {
      phase2GovernedNativeReadEvidenceApplicationPassed: true,
      phase2ReceiptBundleAppliedToCompletionAudit: true,
      independentReviewPassed: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    sideEffectLimits: {
      completionAuditPatchApplications: 1,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    }
  };
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    decisionType: 'phase2_exact_patch_application_decision_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function validIdentity(value, expectedPath = null) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    /^[a-f0-9]{40}$/.test(value.sourceCommit || '') &&
    /^[a-f0-9]{40}$/.test(value.sourceTree || '') &&
    /^[a-f0-9]{40}$/.test(value.blobOid || '') &&
    Number.isInteger(value.bytes) && value.bytes > 0 &&
    /^[a-f0-9]{64}$/.test(value.sha256 || '') &&
    typeof value.sourcePath === 'string' &&
    (expectedPath === null || value.sourcePath === expectedPath);
}

function verifyResolvedIdentity(actual, expected, blockers, label, { allowEmpty = false } = {}) {
  if (!actual || actual.gitObjectType !== 'blob' || actual.sourceCommit !== expected.sourceCommit ||
      actual.sourceTree !== expected.sourceTree || actual.sourcePath !== expected.sourcePath ||
      actual.blobOid !== expected.blobOid || actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256 ||
      (!allowEmpty && (!Buffer.isBuffer(actual.content) || actual.content.length === 0)) ||
      (Buffer.isBuffer(actual.content) && (gitBlobOid(actual.content) !== actual.blobOid || sha256(actual.content) !== actual.sha256))) {
    blockers.push(label);
  }
}

function evaluateDecision(decision = {}, { resolveGitFile } = {}) {
  const blockers = [];
  const payload = decision.payload || {};
  if (decision.schemaVersion !== 1 || decision.taskId !== TASK_ID ||
      decision.decisionType !== 'phase2_exact_patch_application_decision_v1' ||
      payload.decisionReference !== DECISION_REFERENCE) blockers.push('decision.identity');
  if (decision.canonicalPayloadSha256 !== sha256Canonical(payload)) blockers.push('decision.payloadSha256');
  if (payload.authority?.reference !== AUTHORITY_REFERENCE || payload.authority?.authorizationUseCount !== 1 ||
      payload.authority?.authorizationReplayAllowed !== false || !validIdentity(payload.authority, AUTHORITY_PATH)) {
    blockers.push('decision.authority');
  }
  if (!sameJson(payload.acceptedExternalReview, CM2080) ||
      !sameJson(payload.acceptedMachineEvidence?.phase2Manifest, PHASE2_MANIFEST) ||
      !sameJson(payload.acceptedMachineEvidence?.windowsWslReceipt, WINDOWS_WSL_RECEIPT)) blockers.push('decision.upstreamBindings');
  if (payload.registry?.governanceRootIdentitySha256 !== GOVERNANCE_ROOT_IDENTITY_SHA256 ||
      payload.registry?.registryReference !== REGISTRY_REFERENCE || payload.registry?.nonce !== NONCE ||
      payload.registry?.receiptId !== RECEIPT_ID || payload.registry?.claimCreateCount !== 1 ||
      payload.registry?.replayAllowed !== false) blockers.push('decision.registry');
  const plan = payload.patchPlan || {};
  if (!/^[a-f0-9]{40}$/.test(plan.baselineCommit || '') || !/^[a-f0-9]{40}$/.test(plan.baselineTree || '') ||
      !sameJson(plan.allowedPaths, PATCH_PATHS) || !Array.isArray(plan.targets) || plan.targets.length !== PATCH_PATHS.length ||
      !sameJson(plan.targets.map(item => item.sourcePath), PATCH_PATHS) ||
      plan.applicationCommitBindingRequired !== true ||
      plan.patchPayloadSha256 !== sha256Canonical({
        baselineCommit: plan.baselineCommit,
        baselineTree: plan.baselineTree,
        targets: plan.targets,
        allowedPaths: plan.allowedPaths,
        executionReceiptPaths: plan.executionReceiptPaths,
        applicationCommitBindingRequired: plan.applicationCommitBindingRequired
      })) blockers.push('decision.patchPlan');
  for (const target of plan.targets || []) {
    const validAfter = target?.after && /^[a-f0-9]{40}$/.test(target.after.blobOid || '') &&
      Number.isInteger(target.after.bytes) && target.after.bytes > 0 && /^[a-f0-9]{64}$/.test(target.after.sha256 || '') &&
      ['100644', '100755'].includes(target.after.gitMode);
    const validBefore = target.operation === 'add'
      ? target.before === null && target.sourcePath === APPLICATION_STATE_PATH
      : target.operation === 'modify' && target.before && /^[a-f0-9]{40}$/.test(target.before.blobOid || '') &&
        Number.isInteger(target.before.bytes) && target.before.bytes > 0 && /^[a-f0-9]{64}$/.test(target.before.sha256 || '') &&
        ['100644', '100755'].includes(target.before.gitMode);
    if (!validAfter || !validBefore) blockers.push(`decision.target.${target?.sourcePath || 'unknown'}`);
  }
  if (!sameJson(payload.allowedStateAfterApplication, {
    phase2GovernedNativeReadEvidenceApplicationPassed: true,
    phase2ReceiptBundleAppliedToCompletionAudit: true,
    independentReviewPassed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  })) blockers.push('decision.allowedState');
  if (!sameJson(payload.sideEffectLimits, {
    completionAuditPatchApplications: 1,
    nativeReads: 0,
    nativeWrites: 0,
    providerCalls: 0,
    realMemoryReads: 0,
    remoteActions: 0,
    readinessClaims: 0
  })) blockers.push('decision.sideEffectLimits');
  if (typeof resolveGitFile === 'function' && validIdentity(payload.authority, AUTHORITY_PATH)) {
    try {
      const actual = resolveGitFile(payload.authority.sourceCommit, AUTHORITY_PATH);
      verifyResolvedIdentity(actual, payload.authority, blockers, 'decision.authorityGitObject');
      if (Buffer.isBuffer(actual?.content) && !evaluateAuthorityIntake(JSON.parse(actual.content.toString('utf8'))).accepted) {
        blockers.push('decision.authorityContract');
      }
    } catch {
      blockers.push('decision.authorityGitObject');
    }
  } else if (typeof resolveGitFile !== 'function') {
    blockers.push('decision.gitResolverRequired');
  }
  return { accepted: blockers.length === 0, blockers: [...new Set(blockers)] };
}

function revalidateUpstream(resolveGitFile) {
  const blockers = [];
  if (typeof resolveGitFile !== 'function') return { accepted: false, blockers: ['upstream.gitResolverRequired'] };
  let review;
  let manifest;
  let smoke;
  try {
    review = resolveGitFile(CM2080.sourceCommit, CM2080.sourcePath);
    manifest = resolveGitFile(PHASE2_MANIFEST.sourceCommit, PHASE2_MANIFEST.sourcePath);
    smoke = resolveGitFile(WINDOWS_WSL_RECEIPT.sourceCommit, WINDOWS_WSL_RECEIPT.sourcePath);
    verifyResolvedIdentity(review, CM2080, blockers, 'upstream.cm2080GitObject');
    verifyResolvedIdentity(manifest, PHASE2_MANIFEST, blockers, 'upstream.phase2ManifestGitObject');
    verifyResolvedIdentity(smoke, WINDOWS_WSL_RECEIPT, blockers, 'upstream.windowsWslGitObject');
    if (!blockers.length) {
      const reviewJson = JSON.parse(review.content.toString('utf8'));
      if (!evaluateCm2080Decision(reviewJson).accepted) blockers.push('upstream.cm2080Contract');
      const manifestJson = JSON.parse(manifest.content.toString('utf8'));
      const smokeJson = JSON.parse(smoke.content.toString('utf8'));
      const machine = evaluatePhase2MachineExecutionEvidenceManifestContract(manifestJson, smokeJson);
      if (!machine.accepted || machine.completionEligible !== true) blockers.push('upstream.machineContract');
    }
  } catch {
    blockers.push('upstream.unreadable');
  }
  return { accepted: blockers.length === 0, blockers: [...new Set(blockers)], review, manifest, smoke };
}

function claimId() {
  return sha256Canonical({
    registryReference: REGISTRY_REFERENCE,
    nonceHash: sha256(NONCE),
    receiptIdHash: sha256(RECEIPT_ID)
  });
}

function claimFileName() {
  return `.cm2115-r2-phase2-application-claim-${claimId()}.json`;
}

class Cm2115R2ApplicationClaimRegistry {
  constructor({ governanceRoot, filesystem = fsPromises }) {
    if (typeof governanceRoot !== 'string' || governanceRoot.trim() === '') throw new Error('cm2115_r2_governance_root_required');
    this.governanceRoot = governanceRoot;
    this.fs = filesystem;
    this.claimPath = path.join(governanceRoot, claimFileName());
  }

  async verifyRoot() {
    const stat = await this.fs.lstat(this.governanceRoot);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('cm2115_r2_governance_root_invalid');
    const identityPath = path.join(this.governanceRoot, '.phase8-registry-root-identity.json');
    const identityStat = await this.fs.lstat(identityPath);
    if (!identityStat.isFile() || identityStat.isSymbolicLink()) throw new Error('cm2115_r2_governance_root_identity_invalid');
    const bytes = await this.fs.readFile(identityPath);
    if (sha256(bytes) !== GOVERNANCE_ROOT_IDENTITY_SHA256 || bytes.toString('utf8') !== JSON.stringify(canonicalize(GOVERNANCE_ROOT_IDENTITY))) {
      throw new Error('cm2115_r2_governance_root_identity_mismatch');
    }
  }

  baseEnvelope(bindingHash, decisionReference) {
    return {
      schemaVersion: 1,
      registryReference: REGISTRY_REFERENCE,
      claimId: claimId(),
      nonceHash: sha256(NONCE),
      receiptIdHash: sha256(RECEIPT_ID),
      bindingHash,
      decisionReference,
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      patchInvocationCount: 0,
      state: 'CLAIMED'
    };
  }

  async claim(bindingHash, decisionReference) {
    await this.verifyRoot();
    const envelope = this.baseEnvelope(bindingHash, decisionReference);
    try {
      await this.fs.writeFile(this.claimPath, JSON.stringify(canonicalize(envelope)), { flag: 'wx' });
    } catch (error) {
      if (error.code === 'EEXIST') throw new Error('cm2115_r2_authorization_already_claimed');
      throw error;
    }
    return envelope;
  }

  async read(bindingHash = null) {
    await this.verifyRoot();
    const stat = await this.fs.lstat(this.claimPath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('cm2115_r2_claim_invalid');
    const raw = await this.fs.readFile(this.claimPath, 'utf8');
    let value;
    try { value = JSON.parse(raw); } catch { throw new Error('cm2115_r2_claim_corrupt'); }
    const expectedKeys = [
      'schemaVersion', 'registryReference', 'claimId', 'nonceHash', 'receiptIdHash',
      'bindingHash', 'decisionReference', 'authorizationUseCount',
      'authorizationReplayAllowed', 'patchInvocationCount', 'state'
    ].sort();
    if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(expectedKeys) ||
        value.schemaVersion !== 1 || value.claimId !== claimId() || value.registryReference !== REGISTRY_REFERENCE ||
        value.nonceHash !== sha256(NONCE) || value.receiptIdHash !== sha256(RECEIPT_ID) ||
        value.authorizationUseCount !== 1 || value.authorizationReplayAllowed !== false ||
        value.decisionReference !== DECISION_REFERENCE || !['CLAIMED', 'PATCH_INVOCATION_CONSUMED', 'CONSUMED_SUCCESS', 'CONSUMED_AMBIGUOUS'].includes(value.state) ||
        ![0, 1].includes(value.patchInvocationCount) ||
        (value.state === 'CLAIMED' && value.patchInvocationCount !== 0) ||
        (value.state !== 'CLAIMED' && value.patchInvocationCount !== 1) ||
        (bindingHash !== null && value.bindingHash !== bindingHash)) throw new Error('cm2115_r2_claim_binding_mismatch');
    return value;
  }

  async transition(bindingHash, expectedState, nextState, patchInvocationCount) {
    const allowed = {
      CLAIMED: ['PATCH_INVOCATION_CONSUMED'],
      PATCH_INVOCATION_CONSUMED: ['CONSUMED_SUCCESS', 'CONSUMED_AMBIGUOUS']
    };
    if (!allowed[expectedState]?.includes(nextState)) throw new Error('cm2115_r2_claim_transition_invalid');
    const current = await this.read(bindingHash);
    if (current.state !== expectedState) throw new Error('cm2115_r2_claim_state_mismatch');
    const next = { ...current, state: nextState, patchInvocationCount };
    const tempPath = `${this.claimPath}.${nextState}.tmp`;
    await this.fs.writeFile(tempPath, JSON.stringify(canonicalize(next)), { flag: 'wx' });
    await this.fs.rename(tempPath, this.claimPath);
    return next;
  }
}

function buildClaimBindingHash(decisionIdentity, decision) {
  return sha256Canonical({
    decisionReference: DECISION_REFERENCE,
    decisionCommit: decisionIdentity.sourceCommit,
    decisionBlobOid: decisionIdentity.blobOid,
    patchPayloadSha256: decision.payload.patchPlan.patchPayloadSha256,
    baselineCommit: decision.payload.patchPlan.baselineCommit,
    nonce: NONCE,
    receiptId: RECEIPT_ID
  });
}

function identityWithoutContent(value) {
  const { content, ...identity } = value;
  return identity;
}

function buildExecutionReceiptPayload({ decisionIdentity, decision, authorityIdentity, upstream, bindingHash, observedTargets }) {
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    receiptType: 'phase2_exact_patch_application_execution_receipt_v1',
    decision: { reference: DECISION_REFERENCE, ...identityWithoutContent(decisionIdentity) },
    authority: { reference: AUTHORITY_REFERENCE, ...identityWithoutContent(authorityIdentity) },
    upstream: {
      cm2080: identityWithoutContent(upstream.review),
      phase2Manifest: identityWithoutContent(upstream.manifest),
      windowsWslReceipt: identityWithoutContent(upstream.smoke)
    },
    registry: {
      registryReference: REGISTRY_REFERENCE,
      claimId: claimId(),
      bindingHash,
      finalStateRequired: 'CONSUMED_SUCCESS',
      authorizationUseCount: 1,
      authorizationConsumed: true,
      authorizationReplayAllowed: false,
      patchInvocationCount: 1
    },
    application: {
      baselineCommit: decision.payload.patchPlan.baselineCommit,
      baselineTree: decision.payload.patchPlan.baselineTree,
      patchPayloadSha256: decision.payload.patchPlan.patchPayloadSha256,
      targets: observedTargets,
      exactEvidencePatchApplied: exactEvidencePatch(),
      applicationCommitBindingRequired: true,
      applicationCommitBoundByThisReceipt: false
    },
    currentState: {
      phase2ReceiptBundleAppliedToCompletionAudit: false,
      independentReviewPassed: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    sideEffects: {
      completionAuditPatchApplications: 1,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    }
  };
}

function wrapPayload(payload, receiptType) {
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    receiptType,
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function renderExecutionReceiptMarkdown(receipt) {
  const receiptBytes = Buffer.from(serializeArtifact(receipt));
  return Buffer.from([
    '# CM-2115-R2 Phase 2 Exact Patch Execution Receipt',
    '',
    `Canonical payload SHA-256: \`${receipt.canonicalPayloadSha256}\``,
    '',
    'This execution receipt requires a separate Git application binding receipt.',
    'It does not by itself set phase2ReceiptBundleAppliedToCompletionAudit.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    receiptBytes.toString('utf8').trimEnd(),
    '```',
    ''
  ].join('\n'));
}

function evaluateExecutionReceipt(receipt = {}, { resolveGitFile } = {}) {
  const blockers = [];
  if (receipt.schemaVersion !== 1 || receipt.taskId !== TASK_ID ||
      receipt.receiptType !== 'phase2_exact_patch_application_execution_receipt_v1' ||
      receipt.canonicalPayloadSha256 !== sha256Canonical(receipt.payload || {})) blockers.push('executionReceipt.identityOrHash');
  const payload = receipt.payload || {};
  const decisionIdentity = payload.decision;
  let decision = null;
  let decisionActual = null;
  if (!validIdentity(decisionIdentity, DECISION_PATH) || typeof resolveGitFile !== 'function') {
    blockers.push('executionReceipt.decisionResolver');
  } else {
    try {
      decisionActual = resolveGitFile(decisionIdentity.sourceCommit, DECISION_PATH);
      verifyResolvedIdentity(decisionActual, decisionIdentity, blockers, 'executionReceipt.decisionGitObject');
      decision = JSON.parse(decisionActual.content.toString('utf8'));
      const decisionResult = evaluateDecision(decision, { resolveGitFile });
      if (!decisionResult.accepted) blockers.push(...decisionResult.blockers.map(item => `executionReceipt.${item}`));
    } catch {
      blockers.push('executionReceipt.decisionGitObject');
    }
  }
  const upstream = revalidateUpstream(resolveGitFile);
  if (!upstream.accepted) blockers.push(...upstream.blockers.map(item => `executionReceipt.${item}`));
  if (decision) {
    const expectedBinding = buildClaimBindingHash(decisionIdentity, decision);
    if (payload.registry?.registryReference !== REGISTRY_REFERENCE || payload.registry?.claimId !== claimId() ||
        payload.registry?.bindingHash !== expectedBinding || payload.registry?.finalStateRequired !== 'CONSUMED_SUCCESS' ||
        payload.registry?.authorizationUseCount !== 1 || payload.registry?.authorizationConsumed !== true ||
        payload.registry?.authorizationReplayAllowed !== false || payload.registry?.patchInvocationCount !== 1) {
      blockers.push('executionReceipt.registry');
    }
    if (!sameJson(payload.application?.targets, decision.payload.patchPlan.targets) ||
        payload.application?.patchPayloadSha256 !== decision.payload.patchPlan.patchPayloadSha256 ||
        payload.application?.applicationCommitBindingRequired !== true ||
        payload.application?.applicationCommitBoundByThisReceipt !== false ||
        !sameJson(payload.application?.exactEvidencePatchApplied, exactEvidencePatch())) blockers.push('executionReceipt.patch');
    try {
      const authorityActual = resolveGitFile(decision.payload.authority.sourceCommit, AUTHORITY_PATH);
      const expectedPayload = buildExecutionReceiptPayload({
        decisionIdentity: decisionActual,
        decision,
        authorityIdentity: authorityActual,
        upstream,
        bindingHash: expectedBinding,
        observedTargets: decision.payload.patchPlan.targets
      });
      if (!sameJson(payload, expectedPayload)) blockers.push('executionReceipt.exactContent');
    } catch {
      blockers.push('executionReceipt.exactContent');
    }
  }
  if (payload.currentState?.phase2ReceiptBundleAppliedToCompletionAudit !== false ||
      payload.currentState?.independentReviewPassed !== false || payload.currentState?.fullPlanPackCompleted !== false ||
      payload.currentState?.readinessClaimed !== false) blockers.push('executionReceipt.currentState');
  for (const field of ['nativeReads', 'nativeWrites', 'providerCalls', 'realMemoryReads', 'remoteActions', 'readinessClaims']) {
    if (payload.sideEffects?.[field] !== 0) blockers.push(`executionReceipt.sideEffects.${field}`);
  }
  if (payload.sideEffects?.completionAuditPatchApplications !== 1) blockers.push('executionReceipt.patchCount');
  return { accepted: blockers.length === 0, blockers: [...new Set(blockers)] };
}

async function exactWriteTarget(repoRoot, target, beforeBytes) {
  const absolutePath = path.join(repoRoot, target.sourcePath);
  const { bytes: afterBytes, projection } = expectedAfterForTarget(target, beforeBytes);
  if (!sameJson(projection, target.after)) throw new Error(`cm2115_r2_after_projection_mismatch:${target.sourcePath}`);
  if (target.operation === 'add') {
    await fsPromises.writeFile(absolutePath, afterBytes, { flag: 'wx' });
  } else {
    const tempPath = `${absolutePath}.cm2115-r2.tmp`;
    await fsPromises.writeFile(tempPath, afterBytes, { flag: 'wx' });
    await fsPromises.rename(tempPath, absolutePath);
  }
  const observed = await fsPromises.readFile(absolutePath);
  if (!observed.equals(afterBytes)) throw new Error(`cm2115_r2_after_readback_mismatch:${target.sourcePath}`);
  return { sourcePath: target.sourcePath, operation: target.operation, before: target.before, after: fileProjection(observed, target.after.gitMode) };
}

async function executeExactPatch({ repoRoot, decision, decisionIdentity, authorityIdentity, resolveGitFile, registry }) {
  const decisionResult = evaluateDecision(decision, { resolveGitFile });
  const upstream = revalidateUpstream(resolveGitFile);
  if (!decisionResult.accepted || !upstream.accepted) {
    return { accepted: false, blockers: [...decisionResult.blockers, ...upstream.blockers], state: 'UNCLAIMED' };
  }
  const beforeBytesByPath = new Map();
  const blockers = [];
  for (const target of decision.payload.patchPlan.targets) {
    const absolutePath = path.join(repoRoot, target.sourcePath);
    let beforeBytes = null;
    if (target.operation === 'add') {
      if (fs.existsSync(absolutePath)) blockers.push(`patchTarget.expectedAbsent.${target.sourcePath}`);
    } else {
      beforeBytes = await fsPromises.readFile(absolutePath).catch(() => null);
      if (!beforeBytes || !sameJson(fileProjection(beforeBytes, target.before.gitMode), target.before)) {
        blockers.push(`patchTarget.beforeDrift.${target.sourcePath}`);
      } else {
        beforeBytesByPath.set(target.sourcePath, beforeBytes);
      }
    }
    try {
      const expectedAfter = expectedAfterForTarget(target, beforeBytes);
      if (!sameJson(expectedAfter.projection, target.after)) {
        blockers.push(`patchTarget.afterDrift.${target.sourcePath}`);
      }
    } catch {
      blockers.push(`patchTarget.afterDrift.${target.sourcePath}`);
    }
  }
  if (blockers.length) return { accepted: false, blockers, state: 'UNCLAIMED' };
  const bindingHash = buildClaimBindingHash(decisionIdentity, decision);
  await registry.claim(bindingHash, DECISION_REFERENCE);
  await registry.transition(bindingHash, 'CLAIMED', 'PATCH_INVOCATION_CONSUMED', 1);
  try {
    const observedTargets = [];
    for (const target of decision.payload.patchPlan.targets) {
      observedTargets.push(await exactWriteTarget(repoRoot, target, beforeBytesByPath.get(target.sourcePath) || null));
    }
    const executionPayload = buildExecutionReceiptPayload({
      decisionIdentity,
      decision,
      authorityIdentity,
      upstream,
      bindingHash,
      observedTargets
    });
    const receipt = wrapPayload(executionPayload, 'phase2_exact_patch_application_execution_receipt_v1');
    const evaluation = evaluateExecutionReceipt(receipt, { resolveGitFile });
    if (!evaluation.accepted) throw new Error(`cm2115_r2_execution_receipt_rejected:${evaluation.blockers.join(',')}`);
    const receiptBytes = Buffer.from(serializeArtifact(receipt));
    const markdownBytes = renderExecutionReceiptMarkdown(receipt);
    await fsPromises.writeFile(path.join(repoRoot, EXECUTION_RECEIPT_PATH), receiptBytes, { flag: 'wx' });
    await fsPromises.writeFile(path.join(repoRoot, EXECUTION_RECEIPT_MARKDOWN_PATH), markdownBytes, { flag: 'wx' });
    await registry.transition(bindingHash, 'PATCH_INVOCATION_CONSUMED', 'CONSUMED_SUCCESS', 1);
    return { accepted: true, blockers: [], state: 'CONSUMED_SUCCESS', receipt, bindingHash, observedTargets };
  } catch (error) {
    await registry.transition(bindingHash, 'PATCH_INVOCATION_CONSUMED', 'CONSUMED_AMBIGUOUS', 1).catch(() => {});
    throw error;
  }
}

function buildBindingReceiptPayload({ applicationCommit, applicationTree, applicationParentCommit, applicationParentTree, decisionIdentity, executionReceiptIdentity, decision, diffPathsSha256 }) {
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    receiptType: 'phase2_exact_patch_application_git_binding_receipt_v1',
    application: {
      commit: applicationCommit,
      tree: applicationTree,
      parentCommit: applicationParentCommit,
      parentTree: applicationParentTree,
      patchPayloadSha256: decision.payload.patchPlan.patchPayloadSha256,
      diffPathsSha256,
      targets: decision.payload.patchPlan.targets
    },
    decision: { reference: DECISION_REFERENCE, ...identityWithoutContent(decisionIdentity) },
    executionReceipt: identityWithoutContent(executionReceiptIdentity),
    registry: {
      registryReference: REGISTRY_REFERENCE,
      claimId: claimId(),
      bindingHash: buildClaimBindingHash(decisionIdentity, decision),
      finalState: 'CONSUMED_SUCCESS',
      authorizationUseCount: 1,
      authorizationConsumed: true,
      authorizationReplayAllowed: false,
      patchInvocationCount: 1
    },
    appliedEvidence: exactEvidencePatch(),
    currentState: {
      phase2ReceiptBundleAppliedToCompletionAudit: true,
      independentReviewPassed: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    sideEffects: {
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    }
  };
}

function buildBindingReceiptV2Payload({
  applicationCommit,
  applicationTree,
  applicationParentCommit,
  applicationParentTree,
  decisionIdentity,
  executionReceiptIdentity,
  executionReceiptMarkdownIdentity,
  decision,
  diffPathsSha256
}) {
  const payload = buildBindingReceiptPayload({
    applicationCommit,
    applicationTree,
    applicationParentCommit,
    applicationParentTree,
    decisionIdentity,
    executionReceiptIdentity,
    decision,
    diffPathsSha256
  });
  return {
    ...payload,
    receiptType: 'phase2_exact_patch_application_git_binding_receipt_v2',
    executionReceiptMarkdown: identityWithoutContent(executionReceiptMarkdownIdentity)
  };
}

function expectedApplicationDiffPaths() {
  return [...PATCH_PATHS, EXECUTION_RECEIPT_PATH, EXECUTION_RECEIPT_MARKDOWN_PATH].sort();
}

function evaluateBindingReceipt(receipt = {}, {
  resolveGitFile,
  resolveCommitTree,
  resolveParentCommit,
  resolveDiffPaths,
  resolveGitPathState
} = {}) {
  const blockers = [];
  const receiptType = receipt.receiptType;
  const v2 = receiptType === 'phase2_exact_patch_application_git_binding_receipt_v2';
  if (receipt.schemaVersion !== 1 || receipt.taskId !== TASK_ID ||
      !['phase2_exact_patch_application_git_binding_receipt_v1', 'phase2_exact_patch_application_git_binding_receipt_v2'].includes(receiptType) ||
      receipt.canonicalPayloadSha256 !== sha256Canonical(receipt.payload || {})) blockers.push('bindingReceipt.identityOrHash');
  const payload = receipt.payload || {};
  const app = payload.application || {};
  const requiredResolvers = [resolveGitFile, resolveCommitTree, resolveParentCommit, resolveDiffPaths];
  if (v2) requiredResolvers.push(resolveGitPathState);
  if (!requiredResolvers.every(item => typeof item === 'function')) {
    blockers.push('bindingReceipt.gitResolversRequired');
    return { accepted: false, blockers };
  }
  let decision;
  let executionReceipt;
  let decisionActual;
  let executionActual;
  let executionMarkdownActual;
  let observedDiffPaths = null;
  try {
    if (resolveCommitTree(app.commit) !== app.tree || resolveParentCommit(app.commit) !== app.parentCommit ||
        resolveCommitTree(app.parentCommit) !== app.parentTree) blockers.push('bindingReceipt.applicationLineage');
    observedDiffPaths = resolveDiffPaths(app.parentCommit, app.commit).sort();
    if (!sameJson(observedDiffPaths, expectedApplicationDiffPaths()) || app.diffPathsSha256 !== sha256Canonical(observedDiffPaths)) {
      blockers.push('bindingReceipt.diffPaths');
    }
    decisionActual = resolveGitFile(payload.decision.sourceCommit, DECISION_PATH);
    verifyResolvedIdentity(decisionActual, payload.decision, blockers, 'bindingReceipt.decisionGitObject');
    decision = JSON.parse(decisionActual.content.toString('utf8'));
    const decisionEvaluation = evaluateDecision(decision, { resolveGitFile });
    if (!decisionEvaluation.accepted) blockers.push(...decisionEvaluation.blockers.map(item => `bindingReceipt.${item}`));
    if (app.parentCommit !== payload.decision.sourceCommit || app.parentTree !== payload.decision.sourceTree ||
        app.patchPayloadSha256 !== decision.payload.patchPlan.patchPayloadSha256 ||
        !sameJson(app.targets, decision.payload.patchPlan.targets)) blockers.push('bindingReceipt.applicationDecisionBinding');
    executionActual = resolveGitFile(app.commit, EXECUTION_RECEIPT_PATH);
    verifyResolvedIdentity(executionActual, payload.executionReceipt, blockers, 'bindingReceipt.executionReceiptGitObject');
    executionReceipt = JSON.parse(executionActual.content.toString('utf8'));
    const executionEvaluation = evaluateExecutionReceipt(executionReceipt, { resolveGitFile });
    if (!executionEvaluation.accepted) blockers.push(...executionEvaluation.blockers.map(item => `bindingReceipt.${item}`));
    if (v2) {
      executionMarkdownActual = resolveGitFile(app.commit, EXECUTION_RECEIPT_MARKDOWN_PATH);
      verifyResolvedIdentity(
        executionMarkdownActual,
        payload.executionReceiptMarkdown,
        blockers,
        'bindingReceipt.executionReceiptMarkdownGitObject'
      );
      if (!executionMarkdownActual.content.equals(renderExecutionReceiptMarkdown(executionReceipt))) {
        blockers.push('bindingReceipt.executionReceiptMarkdownContent');
      }
    }
    for (const target of decision.payload.patchPlan.targets) {
      const after = resolveGitFile(app.commit, target.sourcePath);
      if (after.blobOid !== target.after.blobOid || after.bytes !== target.after.bytes || after.sha256 !== target.after.sha256 ||
          after.gitMode !== target.after.gitMode) blockers.push(`bindingReceipt.afterTarget.${target.sourcePath}`);
      let beforeBytes = null;
      if (target.operation === 'modify') {
        const before = resolveGitFile(app.parentCommit, target.sourcePath);
        if (before.blobOid !== target.before.blobOid || before.bytes !== target.before.bytes || before.sha256 !== target.before.sha256 ||
            before.gitMode !== target.before.gitMode) blockers.push(`bindingReceipt.beforeTarget.${target.sourcePath}`);
        if (!Buffer.isBuffer(before.content) || !sameJson(fileProjection(before.content, before.gitMode), target.before)) {
          blockers.push(`bindingReceipt.beforeTargetContent.${target.sourcePath}`);
        } else {
          beforeBytes = before.content;
        }
      } else {
        if (v2) {
          const pathState = resolveGitPathState(app.parentCommit, target.sourcePath);
          if (!pathState || pathState.exists !== false) {
            blockers.push(`bindingReceipt.addTargetAlreadyExisted.${target.sourcePath}`);
          }
        } else {
          try { resolveGitFile(app.parentCommit, target.sourcePath); blockers.push(`bindingReceipt.addTargetAlreadyExisted.${target.sourcePath}`); } catch {}
        }
      }
      try {
        const expectedAfter = expectedAfterForTarget(target, beforeBytes);
        if (!sameJson(expectedAfter.projection, target.after) || !Buffer.isBuffer(after.content) ||
            !after.content.equals(expectedAfter.bytes) ||
            !sameJson(fileProjection(after.content, after.gitMode), target.after)) {
          blockers.push(`bindingReceipt.nonCanonicalAfterTarget.${target.sourcePath}`);
        }
      } catch {
        blockers.push(`bindingReceipt.nonCanonicalAfterTarget.${target.sourcePath}`);
      }
    }
    const buildExpected = v2 ? buildBindingReceiptV2Payload : buildBindingReceiptPayload;
    const expectedPayload = buildExpected({
      applicationCommit: app.commit,
      applicationTree: app.tree,
      applicationParentCommit: app.parentCommit,
      applicationParentTree: app.parentTree,
      decisionIdentity: decisionActual,
      executionReceiptIdentity: executionActual,
      executionReceiptMarkdownIdentity: executionMarkdownActual,
      decision,
      diffPathsSha256: sha256Canonical(observedDiffPaths)
    });
    if (!sameJson(payload, expectedPayload)) blockers.push('bindingReceipt.exactContent');
  } catch {
    blockers.push('bindingReceipt.gitObjectUnreadable');
  }
  if (!sameJson(payload.appliedEvidence, exactEvidencePatch()) ||
      payload.currentState?.phase2ReceiptBundleAppliedToCompletionAudit !== true ||
      payload.currentState?.independentReviewPassed !== false || payload.currentState?.fullPlanPackCompleted !== false ||
      payload.currentState?.readinessClaimed !== false) blockers.push('bindingReceipt.currentState');
  for (const field of ['nativeReads', 'nativeWrites', 'providerCalls', 'realMemoryReads', 'remoteActions', 'readinessClaims']) {
    if (payload.sideEffects?.[field] !== 0) blockers.push(`bindingReceipt.sideEffects.${field}`);
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
  APPLICATION_STATE_PATH,
  AUTHORITY_PATH,
  AUTHORITY_REFERENCE,
  BINDING_RECEIPT_PATH,
  BINDING_RECEIPT_V2_PATH,
  Cm2115R2ApplicationClaimRegistry,
  DECISION_PATH,
  DECISION_REFERENCE,
  EXECUTION_RECEIPT_PATH,
  EXECUTION_RECEIPT_MARKDOWN_PATH,
  EXISTING_PATCH_PATHS,
  GOVERNANCE_ROOT_IDENTITY,
  GOVERNANCE_ROOT_IDENTITY_SHA256,
  NONCE,
  PATCH_APPEND_BY_PATH,
  PATCH_PATHS,
  RECEIPT_ID,
  REGISTRY_REFERENCE,
  TASK_ID,
  appendExactBlock,
  buildApplicationState,
  buildAuthorityIntake,
  buildBindingReceiptPayload,
  buildBindingReceiptV2Payload,
  buildClaimBindingHash,
  buildDecision,
  buildExpectedAfterBytes,
  buildExecutionReceiptPayload,
  buildPatchTargets,
  canonicalize,
  claimFileName,
  evaluateAuthorityIntake,
  evaluateBindingReceipt,
  evaluateDecision,
  evaluateExecutionReceipt,
  expectedAfterForTarget,
  exactEvidencePatch,
  executeExactPatch,
  expectedApplicationDiffPaths,
  fileProjection,
  gitBlobOid,
  identityWithoutContent,
  revalidateUpstream,
  renderExecutionReceiptMarkdown,
  serializeArtifact,
  sha256,
  sha256Canonical,
  validIdentity,
  verifyResolvedIdentity,
  wrapPayload
};
