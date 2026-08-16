#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  canonicalJson,
  digest,
  validateBuildManifest
} = require('../src/runtime/native-image/runtime-authority');
const { parseTarBuffer, regularFiles } = require(
  '../src/runtime/native-image/tar-archive'
);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function sha256Buffer(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function safeArchiveMembers(archive) {
  return parseTarBuffer(fs.readFileSync(archive));
}

function readJson(file, code) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { fail(code); }
}

function blobPath(value) {
  if (!/^sha256:[a-f0-9]{64}$/u.test(value || '')) fail('runtime_oci_digest_invalid');
  return `blobs/sha256/${value.slice('sha256:'.length)}`;
}

function verifyBlob(files, value) {
  const entry = files.get(blobPath(value));
  if (!entry) fail('runtime_oci_blob_missing');
  const content = entry.content;
  if (sha256Buffer(content) !== value) fail('runtime_oci_blob_digest_mismatch');
  return content;
}

function inspectOciArchive(archive, { fsModule = fs } = {}) {
  if (!fsModule.statSync(archive).isFile()) fail('runtime_oci_archive_invalid');
  const buffer = fsModule.readFileSync(archive);
  const entries = parseTarBuffer(buffer, {
    maximumEntries: 4096,
    maximumFileBytes: 1024 * 1024 * 1024,
    maximumTotalBytes: 4 * 1024 * 1024 * 1024
  });
  const files = regularFiles(entries);
  const allowedDirectories = new Set(['blobs', 'blobs/sha256']);
  for (const entry of entries) {
    if (entry.type === 'directory' && !allowedDirectories.has(entry.name)) {
      fail('runtime_oci_archive_layout_invalid');
    }
    if (entry.type === 'file' && !['oci-layout', 'index.json'].includes(entry.name) &&
        !/^blobs\/sha256\/[a-f0-9]{64}$/u.test(entry.name)) {
      fail('runtime_oci_archive_layout_invalid');
    }
  }
  try {
    const layout = JSON.parse(files.get('oci-layout')?.content.toString('utf8') || '');
    const index = JSON.parse(files.get('index.json')?.content.toString('utf8') || '');
    if (layout?.imageLayoutVersion !== '1.0.0' ||
        !Array.isArray(index?.manifests) || index.manifests.length !== 1) {
      fail('runtime_oci_index_invalid');
    }
    const descriptor = index.manifests[0];
    const manifestContent = verifyBlob(files, descriptor.digest);
    const manifest = JSON.parse(manifestContent.toString('utf8'));
    if (manifest?.schemaVersion !== 2 || !manifest?.config?.digest ||
        !Array.isArray(manifest?.layers) || manifest.layers.length < 1) {
      fail('runtime_oci_manifest_invalid');
    }
    const configContent = verifyBlob(files, manifest.config.digest);
    const config = JSON.parse(configContent.toString('utf8'));
    for (const layer of manifest.layers) verifyBlob(files, layer.digest);
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
      archiveSha256: sha256Buffer(buffer),
      buildManifestDigest,
      configDigest: manifest.config.digest,
      imageConfigId: manifest.config.digest,
      manifestDigest: descriptor.digest,
      rootfsChainDigest: digest(diffIds),
      rootfsDiffIds: Object.freeze([...diffIds])
    });
  } catch (error) {
    if (error?.code) throw error;
    fail('runtime_oci_archive_json_invalid');
  }
}

function verifyOciArchive(archive, buildManifestInput) {
  const image = inspectOciArchive(archive);
  const manifest = validateBuildManifest(typeof buildManifestInput === 'string'
    ? readJson(buildManifestInput, 'runtime_build_manifest_file_invalid')
    : buildManifestInput);
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
