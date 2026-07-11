'use strict';

const crypto = require('node:crypto');

const ROUTE_DECISION = Object.freeze({
  reference: 'CM-2101-ER-20260711-HISTORICAL-BINDING-NOT-FOUND-ROUTE-B-SELECTED-E5CFF2D2',
  sourceCommit: '2dfd2e812c21df0afd5318bf9cd26c0eab639c2b',
  sourceTree: '29b7e7b4d3846094afe2b9764574ae8e1af1d958',
  path: 'docs/near-model-memory-plan-pack/phase8_identity_bound_rollback_route_decision_cm2101.json',
  blobOid: '3b268ae338f135440e21798b881c12d24f417cd0',
  bytes: 4276,
  sha256: 'b70b6d97297a17f29ff939d99bb3adc2061436fc20f4cf9168e18f862cb12628',
  payloadSha256: 'c775576b5f30bd83ef42c2ca710f4a2a38815450b0fb27fa7010bcf88cda87ec'
});

const IDENTITY_FILENAME = '.codex-memory-cm2102-store-identity.json';
const IDENTITY_TEMPLATE_PATH = 'docs/near-model-memory-plan-pack/phase8_identity_bound_synthetic_store_identity_cm2102.json';
const IDENTITY_FILE_BYTES = 634;
const IDENTITY_FILE_SHA256 = '623fc13829e66d2b4be4d367c55180b688c0285085aeecff270b07792176b1c6';
const IDENTITY_CANONICAL_BYTES = 633;
const IDENTITY_CANONICAL_SHA256 = '017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57';

const STORE_IDENTITY = Object.freeze({
  expectedPostRecordMarkdownCount: 1,
  expectedPostTombstoneMarkdownCount: 2,
  expectedPreWriteMarkdownCount: 0,
  identityPresentBeforeFirstNativeWrite: true,
  lifecycleReference: 'phase8-identity-bound-rollback-lifecycle-001',
  physicalDeleteAllowed: false,
  rawPathDisclosureAllowed: false,
  reinitializationAllowed: false,
  replacementAllowed: false,
  schemaVersion: 1,
  storeInstanceId: 'phase8-identity-bound-synthetic-rollback-store-instance-001',
  storeReference: 'phase8-identity-bound-synthetic-rollback-store-001',
  storeRole: 'phase8_identity_bound_synthetic_rollback_store',
  syntheticOnly: true,
  writeSubdir: 'codex-memory-governed'
});

const STORE_ROOT_DERIVATION = Object.freeze({
  schemaVersion: 1,
  authority: 'git_common_dir_governance_state',
  governanceRootIdentityReference: 'codex-memory-phase8-governance-root',
  governanceRootIdentitySha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0',
  governanceRootIdentityVerificationRequired: true,
  governanceRootReinitializationAllowed: false,
  governanceRootReplacementAllowed: false,
  governanceParentSubdir: 'codex-memory-governance',
  storeDirectoryName: 'phase8-identity-bound-synthetic-rollback-store-001',
  callerPathAllowed: false,
  environmentPathOverrideAllowed: false,
  rawPathDisclosureAllowed: false,
  parentDirectoryMustAlreadyExist: true,
  storeDirectoryMustBeAbsentBeforeBootstrap: true,
  storeDirectoryCreateMode: 'exclusive_mkdir',
  identityCreateMode: 'exclusive_create_only'
});

const STORE_ROOT_BINDING = Object.freeze({
  authority: 'git_common_dir_governance_state',
  governanceRootIdentityReference: 'codex-memory-phase8-governance-root',
  governanceRootIdentitySha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0',
  lifecycleReference: 'phase8-identity-bound-rollback-lifecycle-001',
  schemaVersion: 1,
  storeDirectoryName: 'phase8-identity-bound-synthetic-rollback-store-001',
  storeIdentitySha256: IDENTITY_CANONICAL_SHA256,
  storeInstanceId: 'phase8-identity-bound-synthetic-rollback-store-instance-001',
  storeReference: 'phase8-identity-bound-synthetic-rollback-store-001'
});

const STORE_ROOT_BINDING_CANONICAL_BYTES = 616;
const STORE_ROOT_BINDING_CANONICAL_SHA256 = '0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94';

const GATE_SEQUENCE = Object.freeze([
  'identity_bootstrap',
  'bootstrap_receipt_review',
  'empty_store_readonly_preflight',
  'new_synthetic_record_write',
  'write_receipt_review',
  'independent_tombstone_authorization',
  'rollback_receipt_review',
  'completion_audit_application'
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
  return sha256(Buffer.from(JSON.stringify(canonicalize(value)), 'utf8'));
}

function expectedIdentityBytes() {
  return Buffer.from(JSON.stringify(canonicalize(STORE_IDENTITY)), 'utf8');
}

function exactObject(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = Object.keys(expected).sort();
  return JSON.stringify(actualKeys) === JSON.stringify(expectedKeys) &&
    expectedKeys.every(key => JSON.stringify(value[key]) === JSON.stringify(expected[key]));
}

function evaluateCm2102LifecycleFoundation({ packet, identityTemplateBytes } = {}) {
  const blockers = [];
  if (!packet || !Buffer.isBuffer(identityTemplateBytes)) return {
    accepted: false,
    blockers: ['missing_input'],
    executionAuthorized: false
  };
  const { foundationPayloadSha256, ...payload } = packet;
  if (sha256Canonical(payload) !== foundationPayloadSha256) blockers.push('packet.foundationPayloadSha256');
  const exactScalars = {
    schemaVersion: 1,
    taskId: 'CM-2102',
    foundationType: 'phase8_identity_bound_synthetic_rollback_lifecycle_foundation_non_executing',
    routeDecisionReference: ROUTE_DECISION.reference,
    routeDecisionSourceCommit: ROUTE_DECISION.sourceCommit,
    routeDecisionSourceTree: ROUTE_DECISION.sourceTree,
    routeDecisionPath: ROUTE_DECISION.path,
    routeDecisionBlobOid: ROUTE_DECISION.blobOid,
    routeDecisionBytes: ROUTE_DECISION.bytes,
    routeDecisionSha256: ROUTE_DECISION.sha256,
    routeDecisionPayloadSha256: ROUTE_DECISION.payloadSha256,
    foundationContractPath: 'src/core/Cm2102IdentityBoundRollbackLifecycleFoundation.js',
    emptyStorePreflightContractPath: 'src/core/Cm2102IdentityBoundEmptyStorePreflightContract.js',
    bootstrapRequestPath: 'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_request_cm2102.json',
    lifecycleReference: STORE_IDENTITY.lifecycleReference,
    storeReference: STORE_IDENTITY.storeReference,
    storeInstanceId: STORE_IDENTITY.storeInstanceId,
    storeRole: STORE_IDENTITY.storeRole,
    storeIdentityTemplatePath: IDENTITY_TEMPLATE_PATH,
    storeIdentityTemplateFileBytes: IDENTITY_FILE_BYTES,
    storeIdentityTemplateFileSha256: IDENTITY_FILE_SHA256,
    storeIdentityCanonicalBytes: IDENTITY_CANONICAL_BYTES,
    storeIdentityCanonicalSha256: IDENTITY_CANONICAL_SHA256,
    storeIdentityRuntimeFilename: IDENTITY_FILENAME,
    storeRootBindingCanonicalBytes: STORE_ROOT_BINDING_CANONICAL_BYTES,
    storeRootBindingCanonicalSha256: STORE_ROOT_BINDING_CANONICAL_SHA256,
    routeBSelected: true,
    syntheticOnly: true,
    identityPresentBeforeFirstNativeWriteRequired: true,
    identityReplacementAllowed: false,
    identityReinitializationAllowed: false,
    physicalDeleteAllowed: false,
    bootstrapRequestPrepared: true,
    emptyStorePreflightContractImplemented: true,
    futureWritePacketDesignMayBegin: true,
    storeIdentityCreated: false,
    bootstrapAuthorized: false,
    bootstrapExecuted: false,
    emptyStorePreflightAuthorized: false,
    emptyStorePreflightExecuted: false,
    recordMemoryAuthorized: false,
    recordMemoryExecuted: false,
    tombstoneMemoryAuthorized: false,
    tombstoneMemoryExecuted: false,
    verifyAuthorized: false,
    verifyExecuted: false,
    nonceClaimed: false,
    nativeReads: 0,
    nativeWrites: 0,
    rollbackOrCompensationOperations: 0,
    rollbackDrillPassed: false,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
  for (const [field, expected] of Object.entries(exactScalars)) {
    if (packet[field] !== expected) blockers.push(`packet.${field}`);
  }
  const expectedPacketKeys = [
    ...Object.keys(exactScalars),
    'foundationPayloadSha256',
    'implementationCommit',
    'implementationTree',
    'storeIdentityTemplateBlobOid',
    'storeRootDerivation',
    'storeRootBinding',
    'gateSequence',
    'cm2094ReuseBoundary'
  ].sort();
  if (JSON.stringify(Object.keys(packet).sort()) !== JSON.stringify(expectedPacketKeys)) blockers.push('packet.keys');
  if (!/^[a-f0-9]{40}$/.test(packet.implementationCommit || '')) blockers.push('packet.implementationCommit');
  if (!/^[a-f0-9]{40}$/.test(packet.implementationTree || '')) blockers.push('packet.implementationTree');
  if (!/^[a-f0-9]{40}$/.test(packet.storeIdentityTemplateBlobOid || '')) blockers.push('packet.storeIdentityTemplateBlobOid');
  if (!exactObject(packet.storeRootDerivation, STORE_ROOT_DERIVATION)) blockers.push('packet.storeRootDerivation');
  if (!exactObject(packet.storeRootBinding, STORE_ROOT_BINDING) ||
      Buffer.byteLength(JSON.stringify(canonicalize(STORE_ROOT_BINDING)), 'utf8') !== STORE_ROOT_BINDING_CANONICAL_BYTES ||
      sha256Canonical(STORE_ROOT_BINDING) !== STORE_ROOT_BINDING_CANONICAL_SHA256) blockers.push('packet.storeRootBinding');
  if (JSON.stringify(packet.gateSequence) !== JSON.stringify(GATE_SEQUENCE)) blockers.push('packet.gateSequence');
  if (packet.cm2094ReuseBoundary?.authorizationDecision !== false ||
      packet.cm2094ReuseBoundary?.nonce !== false ||
      packet.cm2094ReuseBoundary?.receiptId !== false ||
      packet.cm2094ReuseBoundary?.registryClaim !== false ||
      packet.cm2094ReuseBoundary?.recordTarget !== false ||
      packet.cm2094ReuseBoundary?.executionPacket !== false ||
      Object.keys(packet.cm2094ReuseBoundary || {}).length !== 6) blockers.push('packet.cm2094ReuseBoundary');
  const expectedBytes = expectedIdentityBytes();
  if (identityTemplateBytes.length !== IDENTITY_FILE_BYTES || sha256(identityTemplateBytes) !== IDENTITY_FILE_SHA256) blockers.push('identityTemplate.file');
  let parsedIdentity = null;
  try { parsedIdentity = JSON.parse(identityTemplateBytes.toString('utf8')); } catch { blockers.push('identityTemplate.json'); }
  if (!exactObject(parsedIdentity, STORE_IDENTITY) ||
      expectedBytes.length !== IDENTITY_CANONICAL_BYTES ||
      sha256(expectedBytes) !== IDENTITY_CANONICAL_SHA256) blockers.push('identityTemplate.canonical');
  return {
    accepted: blockers.length === 0,
    blockers,
    foundationPrepared: blockers.length === 0,
    executionAuthorized: false,
    storeIdentityCreated: false,
    preflightExecuted: false,
    nativeActions: 0,
    rollbackDrillPassed: false,
    phase8Completed: false
  };
}

module.exports = {
  GATE_SEQUENCE,
  IDENTITY_CANONICAL_BYTES,
  IDENTITY_CANONICAL_SHA256,
  IDENTITY_FILE_BYTES,
  IDENTITY_FILE_SHA256,
  IDENTITY_FILENAME,
  IDENTITY_TEMPLATE_PATH,
  ROUTE_DECISION,
  STORE_IDENTITY,
  STORE_ROOT_BINDING,
  STORE_ROOT_BINDING_CANONICAL_BYTES,
  STORE_ROOT_BINDING_CANONICAL_SHA256,
  STORE_ROOT_DERIVATION,
  canonicalize,
  evaluateCm2102LifecycleFoundation,
  expectedIdentityBytes,
  sha256,
  sha256Canonical
};
