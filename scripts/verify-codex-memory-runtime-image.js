#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  canonicalJson,
  digest,
  validateBuildManifest
} = require('../src/runtime/native-image/runtime-authority');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function sha256Buffer(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function safeArchiveMembers(archive) {
  const output = execFileSync('tar', ['-tf', archive], { encoding: 'utf8' });
  for (const member of output.split('\n').filter(Boolean)) {
    const normalized = path.posix.normalize(member);
    if (member.startsWith('/') || normalized === '..' ||
        normalized.startsWith('../')) fail('runtime_oci_archive_path_unsafe');
  }
}

function readJson(file, code) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { fail(code); }
}

function blobPath(root, value) {
  if (!/^sha256:[a-f0-9]{64}$/u.test(value || '')) fail('runtime_oci_digest_invalid');
  return path.join(root, 'blobs', 'sha256', value.slice('sha256:'.length));
}

function verifyBlob(root, value) {
  const file = blobPath(root, value);
  const content = fs.readFileSync(file);
  if (sha256Buffer(content) !== value) fail('runtime_oci_blob_digest_mismatch');
  return content;
}

function inspectOciArchive(archive, { fsModule = fs } = {}) {
  if (!fsModule.statSync(archive).isFile()) fail('runtime_oci_archive_invalid');
  safeArchiveMembers(archive);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-oci-'));
  try {
    execFileSync('tar', ['-xf', archive, '-C', temporary], {
      stdio: ['ignore', 'ignore', 'pipe']
    });
    const layout = readJson(path.join(temporary, 'oci-layout'), 'runtime_oci_layout_invalid');
    const index = readJson(path.join(temporary, 'index.json'), 'runtime_oci_index_invalid');
    if (layout?.imageLayoutVersion !== '1.0.0' ||
        !Array.isArray(index?.manifests) || index.manifests.length !== 1) {
      fail('runtime_oci_index_invalid');
    }
    const descriptor = index.manifests[0];
    const manifestContent = verifyBlob(temporary, descriptor.digest);
    const manifest = JSON.parse(manifestContent.toString('utf8'));
    if (manifest?.schemaVersion !== 2 || !manifest?.config?.digest ||
        !Array.isArray(manifest?.layers) || manifest.layers.length < 1) {
      fail('runtime_oci_manifest_invalid');
    }
    const configContent = verifyBlob(temporary, manifest.config.digest);
    const config = JSON.parse(configContent.toString('utf8'));
    for (const layer of manifest.layers) verifyBlob(temporary, layer.digest);
    const diffIds = config?.rootfs?.diff_ids;
    if (!Array.isArray(diffIds) || diffIds.length !== manifest.layers.length) {
      fail('runtime_oci_rootfs_invalid');
    }
    const labels = config?.config?.Labels || {};
    const buildManifestDigest =
      labels['io.codex-memory.runtime.build-manifest-digest'];
    if (!/^sha256:[a-f0-9]{64}$/u.test(buildManifestDigest || '')) {
      fail('runtime_oci_build_manifest_label_invalid');
    }
    return Object.freeze({
      archiveSha256: sha256Buffer(fs.readFileSync(archive)),
      buildManifestDigest,
      configDigest: manifest.config.digest,
      imageConfigId: manifest.config.digest,
      manifestDigest: descriptor.digest,
      rootfsChainDigest: digest(diffIds),
      rootfsDiffIds: Object.freeze([...diffIds])
    });
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

function verifyOciArchive(archive, buildManifestFile) {
  const image = inspectOciArchive(archive);
  const manifest = validateBuildManifest(readJson(
    buildManifestFile, 'runtime_build_manifest_file_invalid'
  ));
  const expected = digest(manifest);
  if (image.buildManifestDigest !== expected) {
    fail('runtime_oci_build_manifest_mismatch');
  }
  return Object.freeze({ ...image, accepted: true });
}

function parseArguments(argv) {
  const values = {};
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.+)$/u.exec(arg);
    if (!match) fail('runtime_image_verify_argument_invalid');
    values[match[1]] = path.resolve(match[2]);
  }
  if (!values.archive || !values['build-manifest']) {
    fail('runtime_image_verify_argument_invalid');
  }
  return values;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  process.stdout.write(canonicalJson(verifyOciArchive(
    args.archive, args['build-manifest']
  )));
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error?.code || error?.message || 'runtime_image_verify_failed'}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  inspectOciArchive,
  safeArchiveMembers,
  verifyBlob,
  verifyOciArchive
};
