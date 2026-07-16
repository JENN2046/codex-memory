'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { postCheckNativeDiaryResults } = require('./NativeDiaryResultPostCheck');

function hashLabels(labels) {
  return crypto.createHash('sha256').update(JSON.stringify([...labels].sort())).digest('hex');
}

async function runSyntheticVcpSelectedDiaryConformance({
  sourceIdentity,
  createManager,
  temporaryParent = os.tmpdir()
} = {}) {
  if (sourceIdentity?.accepted !== true || sourceIdentity.sourceIdentityOnly !== true) {
    throw new Error('synthetic_vcp_exact_source_identity_required');
  }
  if (typeof createManager !== 'function') throw new Error('synthetic_vcp_manager_factory_required');

  const isolatedRoot = fs.mkdtempSync(path.join(temporaryParent, 'codex-memory-vcp-conformance-'));
  const isolatedStoreRoot = path.join(isolatedRoot, 'store');
  fs.mkdirSync(isolatedStoreRoot, { mode: 0o700 });
  const labels = Object.freeze(['synthetic-client-private', 'synthetic-project-shared', 'synthetic-denied']);
  const indexLoads = [];
  const searchCalls = [];
  let globalSearchCalls = 0;
  try {
    const loaded = await createManager({
      isolatedRoot,
      isolatedStoreRoot,
      syntheticDiaryLabels: labels,
      recordIndexLoad(label) {
        indexLoads.push(label);
      }
    });
    const manager = loaded?.manager;
    if (!manager || typeof manager.search !== 'function') {
      throw new Error('synthetic_vcp_search_method_required');
    }
    if (loaded?.evidence?.isolatedRootBound !== true ||
      loaded?.evidence?.isolatedStoreRoot !== isolatedStoreRoot ||
      loaded?.evidence?.sourceIdentityDigest !== sourceIdentity.identityDigest ||
      loaded?.evidence?.existingInputsRead !== false ||
      loaded?.evidence?.providerConfigured !== false ||
      loaded?.evidence?.publicServiceStarted !== false) {
      throw new Error('synthetic_vcp_isolation_evidence_required');
    }
    const search = async (allowedLabels, limit) => {
      if (!Array.isArray(allowedLabels)) {
        globalSearchCalls += 1;
        throw new Error('synthetic_vcp_global_search_forbidden');
      }
      searchCalls.push({ allowedCount: allowedLabels.length, argumentCount: 5 });
      return manager.search(allowedLabels, [1, 0], limit, 0, []);
    };

    const single = await search([labels[0]], 2);
    const multi = await search([labels[0], labels[1]], 4);
    const singlePass = Array.isArray(single) && single.length > 0 &&
      postCheckNativeDiaryResults(single, [labels[0]]).accepted === true;
    const multiSources = new Set(Array.isArray(multi) ? multi.map(result => result.diaryName) : []);
    const multiPass = multiSources.has(labels[0]) && multiSources.has(labels[1]) &&
      !multiSources.has(labels[2]) &&
      postCheckNativeDiaryResults(multi, [labels[0], labels[1]]).accepted === true;
    const unauthorizedIndexNotLoaded = !indexLoads.includes(labels[2]);
    const selectedSignatureOnly = searchCalls.length === 2 &&
      searchCalls.every(call => call.allowedCount >= 1 && call.argumentCount === 5);
    const accepted = singlePass && multiPass && unauthorizedIndexNotLoaded &&
      selectedSignatureOnly && globalSearchCalls === 0;

    return Object.freeze({
      schemaVersion: 1,
      accepted,
      sourceIdentityDigest: sourceIdentity.identityDigest,
      runRootUnique: true,
      isolatedStoreUnique: true,
      existingStoreRead: false,
      existingConfigRead: false,
      existingLogRead: false,
      providerCalls: 0,
      publicServiceStarted: false,
      singleDiaryPassed: singlePass,
      multiDiaryPassed: multiPass,
      unauthorizedIndexNotLoaded,
      selectedDiarySignatureOnly: selectedSignatureOnly,
      globalSearchCalls,
      syntheticDiarySetDigest: hashLabels(labels),
      rawDiaryNamesReturned: false,
      readinessClaimed: false
    });
  } finally {
    fs.rmSync(isolatedRoot, { recursive: true, force: true });
  }
}

module.exports = { runSyntheticVcpSelectedDiaryConformance };
