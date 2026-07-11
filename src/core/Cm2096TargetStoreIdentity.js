'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const IDENTITY_FILENAME = '.codex-memory-cm2096-store-identity.json';
const EXPECTED_IDENTITY_SHA256 = 'e28d9b2ffae919aeb2f49a5882badac92a0df20d6886400137cdbf3527000a13';
const EXPECTED_IDENTITY = Object.freeze({
  expectedPostRollbackMarkdownCount: 2,
  expectedPreRollbackMarkdownCount: 1,
  rawPathDisclosureAllowed: false,
  reinitializationAllowed: false,
  replacementAllowed: false,
  schemaVersion: 1,
  storeInstanceId: 'cm2094-phase8-synthetic-native-store-001',
  storeReference: 'cm2094-phase8-synthetic-native-write-store',
  storeRole: 'cm2094_synthetic_native_write_store',
  syntheticOnly: true,
  targetMemoryIdRef: 'vcp-kb-4f863f52455147c6',
  targetRecordBytes: 269,
  targetRecordSha256: '4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828',
  writeSubdir: 'codex-memory-governed'
});

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

function expectedIdentityBytes() {
  return Buffer.from(JSON.stringify(canonicalize(EXPECTED_IDENTITY)), 'utf8');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function verifyCm2096TargetStoreIdentity(knowledgeBaseRootPath) {
  if (typeof knowledgeBaseRootPath !== 'string' || knowledgeBaseRootPath.trim() === '') {
    return { accepted: false, reasonCode: 'target_store_root_authority_missing', identityInitialized: false };
  }
  const identityPath = path.join(path.resolve(knowledgeBaseRootPath), IDENTITY_FILENAME);
  let actual;
  try {
    actual = await fs.readFile(identityPath);
  } catch (error) {
    return {
      accepted: false,
      reasonCode: error.code === 'ENOENT' ? 'target_store_identity_missing' : 'target_store_identity_unreadable',
      identityInitialized: false,
      rawPathDisclosed: false
    };
  }
  const expected = expectedIdentityBytes();
  const accepted = actual.equals(expected) && actual.length === 576 && sha256(actual) === EXPECTED_IDENTITY_SHA256;
  return {
    accepted,
    reasonCode: accepted ? null : 'target_store_identity_mismatch',
    identityInitialized: true,
    identityBytes: actual.length,
    identitySha256: sha256(actual),
    storeReference: accepted ? EXPECTED_IDENTITY.storeReference : null,
    storeRole: accepted ? EXPECTED_IDENTITY.storeRole : null,
    syntheticOnly: accepted,
    replacementAllowed: false,
    reinitializationAllowed: false,
    rawPathDisclosed: false
  };
}

module.exports = {
  IDENTITY_FILENAME,
  EXPECTED_IDENTITY,
  EXPECTED_IDENTITY_SHA256,
  expectedIdentityBytes,
  verifyCm2096TargetStoreIdentity
};
