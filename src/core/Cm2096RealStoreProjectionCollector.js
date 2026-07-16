'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const {
  EXPECTED_IDENTITY,
  verifyCm2096TargetStoreIdentity
} = require('./Cm2096TargetStoreIdentity');
const {
  expectedCm2096LifecycleBinding
} = require('./Cm2096MarkerAwareLifecycleProjection');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function digestFromRef(reference) {
  return String(reference || '').replace(/^vcp-kb-/, '');
}

async function exactDigestFiles(directory, digest) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const markdown = entries.filter(entry => entry.isFile() && entry.name.endsWith('.md'));
  return {
    entryCount: entries.length,
    markdownCount: markdown.length,
    unexpectedEntryCount: entries.length - markdown.length,
    matches: markdown.filter(entry => entry.name.endsWith(`-${digest}.md`)).map(entry => entry.name)
  };
}

async function readExactProjection(directory, filename, expectedBytes, expectedSha256, memoryIdRef) {
  const bytes = await fs.readFile(path.join(directory, filename));
  const accepted = bytes.length === expectedBytes && sha256(bytes) === expectedSha256;
  return {
    accepted,
    memoryIdRef,
    durableBytes: bytes.length,
    durableSha256: sha256(bytes),
    rawContentIncluded: false,
    rawPathDisclosed: false
  };
}

async function collectCm2096RealStoreProjection({ knowledgeBaseRootPath, stage } = {}) {
  const identity = await verifyCm2096TargetStoreIdentity(knowledgeBaseRootPath);
  if (identity.accepted !== true) return { accepted: false, reasonCode: identity.reasonCode, identity, rawPathDisclosed: false };
  if (!['pre_rollback', 'post_rollback'].includes(stage)) return { accepted: false, reasonCode: 'invalid_collection_stage', identity, rawPathDisclosed: false };
  const expected = expectedCm2096LifecycleBinding();
  const directory = path.join(path.resolve(knowledgeBaseRootPath), EXPECTED_IDENTITY.writeSubdir);
  let targetFiles;
  let markerFiles;
  try {
    targetFiles = await exactDigestFiles(directory, digestFromRef(expected.targetMemoryIdRef));
    markerFiles = await exactDigestFiles(directory, digestFromRef(expected.markerMemoryIdRef));
  } catch {
    return { accepted: false, reasonCode: 'target_store_projection_unavailable', identity, rawPathDisclosed: false };
  }
  const expectedCount = stage === 'pre_rollback'
    ? EXPECTED_IDENTITY.expectedPreRollbackMarkdownCount
    : EXPECTED_IDENTITY.expectedPostRollbackMarkdownCount;
  const markerCountExpected = stage === 'pre_rollback' ? 0 : 1;
  if (targetFiles.entryCount !== expectedCount ||
      markerFiles.entryCount !== expectedCount ||
      targetFiles.unexpectedEntryCount !== 0 ||
      markerFiles.unexpectedEntryCount !== 0 ||
      targetFiles.markdownCount !== expectedCount ||
      markerFiles.markdownCount !== expectedCount ||
      targetFiles.matches.length !== 1 ||
      markerFiles.matches.length !== markerCountExpected) {
    return { accepted: false, reasonCode: 'target_store_file_set_mismatch', identity, markdownCount: targetFiles.markdownCount, rawPathDisclosed: false };
  }
  const target = await readExactProjection(directory, targetFiles.matches[0], expected.targetRecordBytes, expected.targetRecordSha256, expected.targetMemoryIdRef);
  if (!target.accepted) return { accepted: false, reasonCode: 'target_record_binding_mismatch', identity, target, rawPathDisclosed: false };
  if (stage === 'pre_rollback') {
    return {
      accepted: true,
      stage,
      identity,
      targetRecordProjection: target,
      markerAbsent: true,
      candidateMemoryIdRefs: [expected.targetMemoryIdRef],
      otherRealMemoryRead: false,
      otherRealMemoryModified: false,
      rawMemoryReturned: false,
      rawPathDisclosed: false
    };
  }
  const markerBase = await readExactProjection(directory, markerFiles.matches[0], expected.durableMarkerBytes, expected.durableMarkerSha256, expected.markerMemoryIdRef);
  if (!markerBase.accepted) return { accepted: false, reasonCode: 'tombstone_marker_binding_mismatch', identity, marker: markerBase, rawPathDisclosed: false };
  const marker = {
    ...markerBase,
    toolName: 'tombstone_memory',
    targetMemoryIdRef: expected.targetMemoryIdRef,
    markerMemoryIdRef: expected.markerMemoryIdRef,
    receiptBindingMatched: false,
    mutationMarkerOnly: true
  };
  const sourceCandidateRefs = [expected.targetMemoryIdRef, expected.markerMemoryIdRef];
  return {
    accepted: true,
    stage,
    identity,
    targetRecordProjection: target,
    tombstoneMarkerProjection: marker,
    sourceCandidateMemoryIdRefs: sourceCandidateRefs,
    sourceCandidateRefCount: sourceCandidateRefs.length,
    receiptCorrelationRequired: true,
    otherRealMemoryRead: false,
    otherRealMemoryModified: false,
    rawMemoryReturned: false,
    rawPathDisclosed: false
  };
}

module.exports = { collectCm2096RealStoreProjection };
