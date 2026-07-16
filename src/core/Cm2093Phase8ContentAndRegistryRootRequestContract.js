'use strict';

const { createRecordMarkdown } = require('./GovernedMcpVcpNativeVcpToolBoxMcpShim');
const { sha256, sha256Canonical } = require('./Phase8OneShotNativeWriteExecutionGate');

function evaluateCm2093Phase8ContentAndRegistryRootRequest({ request, contextBytes, allowlistBytes, rootIdentityBytes, payloadBytes } = {}) {
  const blockers = [];
  if (!request || ![contextBytes, allowlistBytes, rootIdentityBytes, payloadBytes].every(Buffer.isBuffer)) {
    return { accepted: false, blockers: ['missing_input'] };
  }
  const exact = {
    schemaVersion: 1,
    taskId: 'CM-2093',
    priorDecisionReference: 'CM-2092-ER-20260711-FAIL-CLOSED-FINAL-RELEASE-AND-REGISTRY-ROOT-INCOMPLETE',
    phase8NativeWriteAuthorizationGranted: false,
    authorizationContentApprovalRequested: true,
    registryRootBootstrapAuthorizationRequested: true,
    nativeWriteMayExecuteFromThisRequest: false,
    finalExecutionReleaseReviewRequired: true,
    runtimeSourceCommit: '10b1ea49257c0aa2c26e50a2291142093589d938',
    runtimeSourceTree: 'f4273910483c096ff03d3c33f01c59187a2f6e2b',
    payloadBlobOid: 'cde8e314a118e52e4beb9181401ee0bc7cc1dc68',
    contextCanonicalSha256: 'f1cf912c1609dbf70ac07794c7b691e85f92e4c6daceda168e444d175dc49283',
    allowlistCanonicalSha256: 'b69cc85dc7b9387425342ffbec7c299317dcf1eaa6948d4042503399a6b33e20',
    registryRootIdentityCanonicalSha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0',
    registryRootInitialized: false,
    registryRootReinitializationAllowed: false,
    registryRootReplacementAllowed: false,
    maxNativeWrites: 1,
    maxVerifyOperations: 1,
    maxRollbackOrCompensationOperations: 0
  };
  for (const [field, expected] of Object.entries(exact)) if (request[field] !== expected) blockers.push(`request.${field}`);
  let context;
  let allowlist;
  let rootIdentity;
  let payload;
  try { context = JSON.parse(contextBytes); } catch { blockers.push('context.invalidJson'); }
  try { allowlist = JSON.parse(allowlistBytes); } catch { blockers.push('allowlist.invalidJson'); }
  try { rootIdentity = JSON.parse(rootIdentityBytes); } catch { blockers.push('rootIdentity.invalidJson'); }
  try { payload = JSON.parse(payloadBytes); } catch { blockers.push('payload.invalidJson'); }
  if (contextBytes.length !== request.contextBytes || sha256(contextBytes) !== request.contextFileSha256 || (context && sha256Canonical(context) !== request.contextCanonicalSha256)) blockers.push('context.binding');
  if (allowlistBytes.length !== request.allowlistBytes || sha256(allowlistBytes) !== request.allowlistFileSha256 || (allowlist && sha256Canonical(allowlist) !== request.allowlistCanonicalSha256)) blockers.push('allowlist.binding');
  if (rootIdentityBytes.length !== request.registryRootIdentityBytes || sha256(rootIdentityBytes) !== request.registryRootIdentityFileSha256 || (rootIdentity && sha256Canonical(rootIdentity) !== request.registryRootIdentityCanonicalSha256)) blockers.push('rootIdentity.binding');
  if (payloadBytes.length !== request.payloadBytes || sha256(payloadBytes) !== request.payloadFileSha256 || (payload && sha256Canonical(payload) !== request.payloadCanonicalSha256)) blockers.push('payload.binding');
  if (payload) {
    const durable = Buffer.from(createRecordMarkdown(payload));
    if (durable.length !== request.durableRecordBytes || sha256(durable) !== request.durableRecordSha256) blockers.push('durable.binding');
  }
  const counters = request.executionCounters || {};
  for (const field of ['authorizationClaims', 'nativeWrites', 'verifyOperations', 'rollbackOrCompensationOperations', 'realMemoryReads']) {
    if (counters[field] !== 0) blockers.push(`executionCounters.${field}`);
  }
  return {
    accepted: blockers.length === 0,
    blockers,
    authorizationContentMayBeReviewed: blockers.length === 0,
    registryRootBootstrapMayBeReviewed: blockers.length === 0,
    phase8NativeWriteAuthorizationGranted: false,
    nativeWriteMayExecute: false,
    nonceMayBeClaimed: false,
    finalExecutionReleaseReviewRequired: true
  };
}

module.exports = { evaluateCm2093Phase8ContentAndRegistryRootRequest };
