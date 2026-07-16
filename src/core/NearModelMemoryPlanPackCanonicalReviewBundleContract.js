'use strict';

const crypto = require('node:crypto');

const CONTRACT_NAME = 'NearModelMemoryPlanPackCanonicalReviewBundleContract';
const CONTRACT_MODE = 'canonical_low_disclosure_external_review_bundle_v2';
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const EXPECTED_DECISION_FIELDS = Object.freeze([
  'externalReviewPassed',
  'externalReviewEvidenceBundleAppliedToCompletionAudit',
  'tagApprovalPacketPassed',
  'phase8NativeWriteAuthorizationGranted'
]);
const EXPECTED_EVIDENCE_REFS = Object.freeze([
  'docs/near-model-memory-plan-pack/phase2_machine_execution_evidence_manifest.json',
  'docs/near-model-memory-plan-pack/windows_wsl_machine_smoke_receipt.json',
  'docs/near-model-memory-plan-pack/phase9_machine_observation_artifact.json',
  'docs/near-model-memory-plan-pack/external_review_conflict_resolution_report.md'
]);
const FORBIDDEN_KEYS = Object.freeze([
  'query', 'queryText', 'requestBody', 'responseBody', 'rawOutput', 'rawMemory',
  'memoryContent', 'rawAudit', 'token', 'apiKey', 'secret', 'credential',
  'endpoint', 'locator', 'providerPayload', 'reviewTranscript', 'reviewerIdentity',
  'absolutePath', 'environmentValue'
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stableCanonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableCanonicalJson).join(',')}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableCanonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function collectForbidden(value, prefix = '') {
  if (Array.isArray(value)) return value.flatMap((item, index) => collectForbidden(item, `${prefix}[${index}]`));
  if (!isObject(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return FORBIDDEN_KEYS.includes(key) ? [path] : collectForbidden(child, path);
  });
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    canonicalReviewBundlePassed: false,
    completionEligible: false,
    externalReviewPassed: false,
    reviewBundleApplied: false,
    tagApprovalPacketPassed: false,
    phase8WriteAuthorized: false,
    memoryWritten: false,
    remoteActionPerformed: false,
    readinessClaimed: false,
    ...extras
  };
}

function evaluateNearModelMemoryPlanPackCanonicalReviewBundleContract(bundle, evidenceBodies = {}) {
  if (!isObject(bundle) || !isObject(bundle.payload) || !isObject(evidenceBodies)) return failure('invalid_input');
  const forbiddenFields = collectForbidden(bundle);
  if (forbiddenFields.length) return failure('forbidden_raw_secret_or_review_fields', { forbiddenFields });

  const { payload } = bundle;
  const blockers = [];
  if (bundle.schemaVersion !== 2 || bundle.taskId !== 'CM-2078') blockers.push('bundle.identity');
  if (bundle.mode !== 'canonical-external-review-bundle-v2') blockers.push('bundle.mode');
  if (!HASH_PATTERN.test(String(bundle.canonicalPayloadSha256 || '')) || bundle.canonicalPayloadSha256 !== sha256(stableCanonicalJson(payload))) {
    blockers.push('bundle.canonicalPayloadSha256');
  }
  if (!COMMIT_PATTERN.test(String(payload.sourceCommit || ''))) blockers.push('payload.sourceCommit');
  if (!COMMIT_PATTERN.test(String(payload.loadedRuntimeHead || ''))) blockers.push('payload.loadedRuntimeHead');
  if (typeof payload.generatedAt !== 'string' || payload.generatedAt.length === 0) blockers.push('payload.generatedAt');
  if (typeof payload.worktreeClean !== 'boolean') blockers.push('payload.worktreeClean');
  const expectedRuntimeMatch = payload.sourceCommit === payload.loadedRuntimeHead;
  if (payload.runtimeHeadMatchesSourceCommit !== expectedRuntimeMatch) blockers.push('payload.runtimeHeadMatchesSourceCommit');
  if (payload.canonicalRenderedBundleRef !== 'docs/near-model-memory-plan-pack/external_review_handoff_bundle_canonical.md') blockers.push('payload.canonicalRenderedBundleRef');
  if (payload.canonicalRenderedBundleAvailable !== true) blockers.push('payload.canonicalRenderedBundleAvailable');

  const entries = payload.evidenceEntries;
  if (!Array.isArray(entries) || entries.length !== EXPECTED_EVIDENCE_REFS.length) {
    blockers.push('payload.evidenceEntries');
  } else {
    EXPECTED_EVIDENCE_REFS.forEach((sourceRef, index) => {
      const entry = entries[index] || {};
      if (entry.sourceRef !== sourceRef) blockers.push(`payload.evidenceEntries[${index}].sourceRef`);
      if (!HASH_PATTERN.test(String(entry.sha256 || ''))) blockers.push(`payload.evidenceEntries[${index}].sha256`);
      if (typeof evidenceBodies[sourceRef] !== 'string' || sha256(evidenceBodies[sourceRef]) !== entry.sha256) blockers.push(`payload.evidenceEntries[${index}].sha256_mismatch`);
      if (entry.lowDisclosureOnly !== true) blockers.push(`payload.evidenceEntries[${index}].lowDisclosureOnly`);
    });
  }

  const decisions = payload.effectiveDecisions || {};
  for (const field of EXPECTED_DECISION_FIELDS) {
    if (decisions[field] !== false) blockers.push(`payload.effectiveDecisions.${field}`);
  }
  if (payload.reviewDisposition !== 'changes_required_fail_closed') blockers.push('payload.reviewDisposition');
  if (!Array.isArray(payload.reviewReferences) || payload.reviewReferences.length !== 2) blockers.push('payload.reviewReferences');

  const derivation = payload.completionDerivation || {};
  const expectedEligible = payload.worktreeClean === true &&
    payload.runtimeHeadMatchesSourceCommit === true &&
    Object.values(decisions).every(value => value === true);
  if (derivation.eligible !== expectedEligible) blockers.push('payload.completionDerivation.eligible');
  if (derivation.fullPlanPackCompleted !== expectedEligible) blockers.push('payload.completionDerivation.fullPlanPackCompleted');
  if (payload.rawPrivateMemoryAccessed !== false || payload.defaultMcpExpanded !== false || payload.readinessClaimed !== false) {
    blockers.push('payload.safetyBoundary');
  }
  if (blockers.length) return failure('canonical_bundle_blocked', { blockers });

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode: expectedEligible ? 'canonical_bundle_completion_eligible' : 'canonical_bundle_replay_or_decisions_required',
    blockers: expectedEligible ? [] : ['dirty_or_runtime_mismatch_or_independent_decisions_false'],
    canonicalReviewBundlePassed: true,
    completionEligible: expectedEligible,
    evidenceHashesVerified: EXPECTED_EVIDENCE_REFS.length,
    canonicalPayloadHashVerified: true,
    canonicalRenderedBundleAvailable: true,
    externalReviewPassed: decisions.externalReviewPassed,
    reviewBundleApplied: decisions.externalReviewEvidenceBundleAppliedToCompletionAudit,
    tagApprovalPacketPassed: decisions.tagApprovalPacketPassed,
    phase8WriteAuthorized: decisions.phase8NativeWriteAuthorizationGranted,
    memoryWritten: false,
    remoteActionPerformed: false,
    readinessClaimed: false
  };
}

function renderCanonicalReviewBundleMarkdown(bundle) {
  return [
    '# Canonical External Review Handoff Bundle v2',
    '',
    `Canonical payload SHA-256: \`${bundle.canonicalPayloadSha256}\``,
    '',
    'The JSON below is the stable, recursively key-sorted canonical serialization',
    'whose UTF-8 bytes produce the SHA-256 above. It is low-disclosure and readable',
    'through the Markdown review surface.',
    '',
    '```json',
    stableCanonicalJson(bundle.payload),
    '```',
    '',
    'Effective result: `changes_required_fail_closed`. All four independent',
    'decision fields remain `false`; this rendered bundle grants no write, tag,',
    'release, deploy, cutover, push, default MCP expansion, or readiness claim.',
    ''
  ].join('\n');
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  EXPECTED_DECISION_FIELDS,
  EXPECTED_EVIDENCE_REFS,
  stableCanonicalJson,
  sha256,
  evaluateNearModelMemoryPlanPackCanonicalReviewBundleContract,
  renderCanonicalReviewBundleMarkdown
};
