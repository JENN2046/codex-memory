'use strict';

const crypto = require('node:crypto');

const SOURCE_PATH = 'KnowledgeBaseManager.js';
const CAPABILITY = Object.freeze({
  method: 'search',
  signature: 'diary_array_vector_limit_threshold_tags',
  selectedDiaryArrayFirstArgument: true,
  globalSearchAccepted: false
});
const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function verifyVcpSelectedDiarySourceIdentity(manifest = {}, resolver) {
  const blockers = [];
  if (manifest.schemaVersion !== 1) blockers.push('schemaVersion');
  if (!SHA40.test(String(manifest.commit || ''))) blockers.push('commit.sha40');
  if (!SHA40.test(String(manifest.tree || ''))) blockers.push('tree.sha40');
  if (manifest.sourcePath !== SOURCE_PATH) blockers.push('sourcePath');
  if (!SHA40.test(String(manifest.blobOid || ''))) blockers.push('blobOid.sha40');
  if (!Number.isSafeInteger(manifest.bytes) || manifest.bytes < 1) blockers.push('bytes');
  if (!SHA256.test(String(manifest.sha256 || ''))) blockers.push('sha256');
  if (JSON.stringify(canonicalize(manifest.capability)) !== JSON.stringify(canonicalize(CAPABILITY))) {
    blockers.push('capability');
  }
  if (manifest.identityDigest !== digest({
    schemaVersion: manifest.schemaVersion,
    commit: manifest.commit,
    tree: manifest.tree,
    sourcePath: manifest.sourcePath,
    blobOid: manifest.blobOid,
    bytes: manifest.bytes,
    sha256: manifest.sha256,
    capability: manifest.capability
  })) blockers.push('identityDigest');

  if (blockers.length === 0) {
    const commit = resolver.resolveCommit(manifest.commit);
    const source = resolver.resolveGitFile(manifest.commit, SOURCE_PATH);
    if (commit.commit !== manifest.commit || commit.tree !== manifest.tree) blockers.push('commit.identity');
    if (source.blobOid !== manifest.blobOid || source.bytes !== manifest.bytes ||
      source.sha256 !== manifest.sha256) blockers.push('source.identity');
  }

  return Object.freeze({
    accepted: blockers.length === 0,
    blockers: Object.freeze([...new Set(blockers)]),
    identityDigest: blockers.length === 0 ? manifest.identityDigest : null,
    selectedDiaryCapabilityBound: blockers.length === 0,
    sourceIdentityOnly: true,
    runtimeConformanceProven: false,
    readinessClaimed: false
  });
}

function buildVcpSelectedDiarySourceIdentity({ commit, tree, source }) {
  const identity = {
    schemaVersion: 1,
    commit,
    tree,
    sourcePath: SOURCE_PATH,
    blobOid: source.blobOid,
    bytes: source.bytes,
    sha256: source.sha256,
    capability: CAPABILITY
  };
  return Object.freeze({ ...identity, identityDigest: digest(identity) });
}

module.exports = {
  CAPABILITY,
  SOURCE_PATH,
  buildVcpSelectedDiarySourceIdentity,
  digest,
  verifyVcpSelectedDiarySourceIdentity
};
