'use strict';

const CONTRACT_NAME = 'Cm2080ExternalReviewFinalDecisionContract';
const DECISION_REFERENCE = 'CM-2080-ER-20260711-PASS-F440C1BD-2215BB33';
const CANONICAL_PAYLOAD_SHA256 =
  '2215bb33de9eb58cb3fb4c9d04ba57c77bd6794aeae9e1d73966477a6f8622f2';
const DEFAULT_MCP_TOOLS = Object.freeze([
  'audit_memory',
  'memory_overview',
  'prepare_memory_context',
  'propose_memory_delta',
  'search_memory'
]);

const EXPECTED_BINDING = Object.freeze({
  finalApplicationCommit: 'f440c1bd76f6d6ee043e313b486f77731c55d964',
  renderedJsonCommit: '2d69365fafb026efec48024ec22e3cc4e2f095d4',
  directAttachmentCommit: '92364835112deb1957a7a03c3e9e846370a06853',
  runtimeSourceCommit: '1822d7e8492424cd4b8849d544df087cf9c8edad',
  runtimeSourceTree: 'bac696fac692509572ecd1ab889a5b3aedc4b9a6',
  evidenceCommit: 'c0b8c24eb89efdd76305dc725b5416f7ce46a3a1',
  evidenceTree: 'bf5bbdaf47a7f05988d8e8d1b8ab4479e1a65ae4',
  canonicalPayloadSha256: CANONICAL_PAYLOAD_SHA256
});

const EXPECTED_EVIDENCE = Object.freeze({
  phase2MachineExecutionManifest: [6937, '4ccc78ad3cdd2489d10ab0d6a680bbca9ce4e592', '9697fec7e60ac3a51f9339e1dd4694075f818940007cbc653c89f5ca01ce0e03'],
  windowsWslMachineSmoke: [795, '83bca87e0c06a08046eb88d1fac55418c0ad37fd', '60b38d4025d567aa8ac7b839b00aa3539884d67450647157cbe22b9c2363718d'],
  phase9MachineObservation: [3793, 'd1dd18c797a76a208977dac4827bbc6b1007114e', '138ad75ed7d41d88c689544cac217ddfa6ef751f2fe586c997fa37163f18968d'],
  conflictResolutionReport: [1382, '4bef2d345276e7e027f73c9f4d80cafbab751613', '0e6c6f285c0f8f6caec80c46588ce78ae51829d5bdaa2498882b0fae42a96014'],
  canonicalMarkdown: [2767, '0206c750af2b5bac0a64d2e9e1d5a3da6ccf06d4', 'e6d7baf4bf3329a2b78645877a1fdedd841513c9a117f1e8a64c62df4019e8fe'],
  canonicalBundleJson: [2856, 'f6edf04b9a5b4fcc37799248343fba60c6b4801b', '45fb4ecdd88ba2984072d2340333f7af0d05bb8fbd3ad72e0e8646a79dbc3a47']
});

const FALSE_BOUNDARY_FIELDS = Object.freeze([
  'completionAuditApplicationAuthorized',
  'tagApprovalAccepted',
  'phase8NativeWriteAuthorized',
  'tagAuthorized',
  'pushAuthorized',
  'releaseAuthorized',
  'deployAuthorized',
  'cutoverAuthorized',
  'productionReadinessClaimed',
  'releaseReadinessClaimed',
  'rcReadyClaimed',
  'completeV8Claimed',
  'fullPlanPackCompletedClaimed'
]);

function equalObject(actual, expected) {
  return actual && Object.keys(expected).every(key => actual[key] === expected[key]);
}

function evaluateCm2080ExternalReviewFinalDecision(input) {
  const blockers = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { accepted: false, contractName: CONTRACT_NAME, blockers: ['invalid_input'] };
  }
  if (input.schemaVersion !== 1) blockers.push('schemaVersion');
  if (input.decisionReference !== DECISION_REFERENCE) blockers.push('decisionReference');
  if (!equalObject(input.reviewBinding, EXPECTED_BINDING)) blockers.push('reviewBinding');

  const decisions = input.decisions || {};
  if (decisions.externalReviewPassed !== true) blockers.push('decisions.externalReviewPassed');
  for (const field of [
    'externalReviewEvidenceBundleAppliedToCompletionAudit',
    'tagApprovalPacketPassed',
    'phase8NativeWriteAuthorizationGranted'
  ]) {
    if (decisions[field] !== false) blockers.push(`decisions.${field}`);
  }

  for (const [name, [bytes, blobOid, sha256]] of Object.entries(EXPECTED_EVIDENCE)) {
    const actual = input.evidenceObjects && input.evidenceObjects[name];
    if (!actual || actual.bytes !== bytes || actual.blobOid !== blobOid || actual.sha256 !== sha256) {
      blockers.push(`evidenceObjects.${name}`);
    }
  }

  const facts = input.acceptedFacts || {};
  if (JSON.stringify(facts.defaultMcpTools) !== JSON.stringify(DEFAULT_MCP_TOOLS)) {
    blockers.push('acceptedFacts.defaultMcpTools');
  }
  for (const field of [
    'commitMemoryDeltaPublic',
    'productionProviderProof',
    'isolatedDerivedIndexWritesAreNativeProof'
  ]) {
    if (facts[field] !== false) blockers.push(`acceptedFacts.${field}`);
  }
  if (facts.vcpToolBoxRemainsMemoryIntelligenceOwner !== true) {
    blockers.push('acceptedFacts.vcpToolBoxRemainsMemoryIntelligenceOwner');
  }
  for (const [field, expected] of Object.entries({
    focusedReplayPassed: true,
    focusedReplayTests: 31,
    phase2NativeReadAttempts: 3,
    phase2NativeReadSuccesses: 3,
    phase2PrimaryMemoryWrites: 0,
    phase2NativeMemoryWrites: 0,
    phase2LocalFallbackUses: 0,
    phase2RawPrivateReturns: 0,
    fixtureEmbeddingProviderUsed: true
  })) {
    if (facts[field] !== expected) blockers.push(`acceptedFacts.${field}`);
  }

  const boundaries = input.preservedBoundaries || {};
  for (const field of FALSE_BOUNDARY_FIELDS) {
    if (boundaries[field] !== false) blockers.push(`preservedBoundaries.${field}`);
  }

  return {
    accepted: blockers.length === 0,
    contractName: CONTRACT_NAME,
    decisionReference: DECISION_REFERENCE,
    blockers,
    externalReviewPassed: blockers.length === 0,
    externalReviewEvidenceBundleAppliedToCompletionAudit: false,
    tagApprovalPacketPassed: false,
    phase8NativeWriteAuthorizationGranted: false,
    completionAuditApplicationAuthorized: false,
    nextGate: blockers.length === 0
      ? 'request_separate_completion_audit_application_decision'
      : 'repair_cm2080_decision_binding'
  };
}

module.exports = {
  CANONICAL_PAYLOAD_SHA256,
  CONTRACT_NAME,
  DECISION_REFERENCE,
  DEFAULT_MCP_TOOLS,
  EXPECTED_BINDING,
  EXPECTED_EVIDENCE,
  FALSE_BOUNDARY_FIELDS,
  evaluateCm2080ExternalReviewFinalDecision
};
