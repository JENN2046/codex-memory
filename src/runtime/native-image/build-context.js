'use strict';

const crypto = require('node:crypto');
const {
  canonicalJson,
  digest,
  validateBuildManifest
} = require('./runtime-authority');
const { parseTarBuffer, regularFiles } = require('./tar-archive');

const MANIFEST_PATH = 'runtime/runtime-build-manifest.json';

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function verifyBuildContextBuffer(buffer) {
  const entries = parseTarBuffer(buffer);
  const files = regularFiles(entries);
  const manifestEntry = files.get(MANIFEST_PATH);
  if (!manifestEntry) fail('runtime_context_manifest_missing');
  let manifest;
  try { manifest = validateBuildManifest(JSON.parse(manifestEntry.content.toString('utf8'))); } catch {
    fail('runtime_context_manifest_invalid');
  }
  if (!manifestEntry.content.equals(Buffer.from(canonicalJson(manifest)))) {
    fail('runtime_context_manifest_not_canonical');
  }
  const expected = new Map(manifest.fileManifest.map(entry => [entry.path, entry]));
  const actual = [];
  for (const [name, entry] of files) {
    if (name === MANIFEST_PATH) continue;
    const declared = expected.get(name);
    if (!declared || declared.size !== entry.size ||
        declared.mode !== ((entry.mode & 0o111) === 0 ? '100644' : '100755') ||
        declared.sha256 !== sha256(entry.content)) {
      fail('runtime_context_inventory_mismatch');
    }
    actual.push(declared);
  }
  if (actual.length !== expected.size ||
      digest(actual.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) !==
        manifest.buildContextFileManifestDigest) {
    fail('runtime_context_inventory_mismatch');
  }
  const allowedDirectories = new Set(['runtime']);
  for (const name of [...expected.keys(), MANIFEST_PATH]) {
    const parts = name.split('/');
    for (let index = 1; index < parts.length; index += 1) {
      allowedDirectories.add(parts.slice(0, index).join('/'));
    }
  }
  for (const entry of entries) {
    if (entry.type === 'directory' && !allowedDirectories.has(entry.name)) {
      fail('runtime_context_inventory_mismatch');
    }
  }
  return Object.freeze({
    artifactSha256: sha256(buffer),
    builderConsumedContextDigest: digest(actual),
    manifest,
    manifestedContextDigest: manifest.buildContextFileManifestDigest
  });
}

module.exports = { MANIFEST_PATH, verifyBuildContextBuffer };
