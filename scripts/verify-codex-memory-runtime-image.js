#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
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
  return parseTarBuffer(readBoundedArchive(archive));
}

const MAXIMUM_OCI_ARCHIVE_BYTES = 256 * 1024 * 1024;
const MAXIMUM_OCI_TRAILING_ZERO_BYTES = 1024 * 1024;

function preflightTarDescriptor(descriptor, size, fsModule = fs) {
  const readAt = (position, length) => {
    const buffer = Buffer.alloc(length);
    const count = fsModule.readSync(descriptor, buffer, 0, length, position);
    if (count !== length) fail('runtime_oci_archive_changed');
    return buffer;
  };
  const memberSize = header => {
    const field = header.subarray(124, 136).toString('ascii').replace(/\0.*$/su, '').trim();
    if (!/^[0-7]+$/u.test(field || '0')) fail('runtime_oci_archive_header_invalid');
    const value = Number.parseInt(field || '0', 8);
    if (!Number.isSafeInteger(value) || value < 0) fail('runtime_oci_archive_header_invalid');
    return value;
  };
  let position = 0;
  let entries = 0;
  while (position + 1024 <= size) {
    const header = readAt(position, 512);
    if (header.every(byte => byte === 0)) {
      if (!readAt(position + 512, 512).every(byte => byte === 0)) {
        fail('runtime_oci_archive_unterminated');
      }
      const trailing = size - position - 1024;
      if (trailing > MAXIMUM_OCI_TRAILING_ZERO_BYTES) {
        fail('runtime_oci_archive_padding_limit');
      }
      for (let offset = position + 1024; offset < size; offset += 64 * 1024) {
        const chunk = readAt(offset, Math.min(64 * 1024, size - offset));
        if (!chunk.every(byte => byte === 0)) fail('runtime_oci_archive_trailing_data');
      }
      return true;
    }
    const contentBytes = memberSize(header);
    const padding = (512 - (contentBytes % 512)) % 512;
    const paddingStart = position + 512 + contentBytes;
    if (padding > 0 && !readAt(paddingStart, padding).every(byte => byte === 0)) {
      fail('runtime_oci_archive_padding_invalid');
    }
    position += 512 + contentBytes + padding;
    entries += 1;
    if (position > size || entries > 4096) fail('runtime_oci_archive_structure_invalid');
  }
  fail('runtime_oci_archive_unterminated');
}

function readBoundedArchive(archive, fsModule = fs) {
  const descriptor = fsModule.openSync(
    archive, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0)
  );
  try {
    const before = fsModule.fstatSync(descriptor);
    if (!before.isFile() || before.size < 1024 ||
        before.size > MAXIMUM_OCI_ARCHIVE_BYTES) fail('runtime_oci_archive_size_invalid');
    if (!Number.isSafeInteger(before.blocks) || before.blocks * 512 < before.size) {
      fail('runtime_oci_archive_sparse_forbidden');
    }
    preflightTarDescriptor(descriptor, before.size, fsModule);
    const buffer = fsModule.readFileSync(descriptor);
    const after = fsModule.fstatSync(descriptor);
    if (before.dev !== after.dev || before.ino !== after.ino ||
        before.size !== after.size || before.mtimeMs !== after.mtimeMs ||
        buffer.length !== before.size) fail('runtime_oci_archive_changed');
    return buffer;
  } finally { fsModule.closeSync(descriptor); }
}

function readJson(file, code) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { fail(code); }
}

function blobPath(value) {
  if (!/^sha256:[a-f0-9]{64}$/u.test(value || '')) fail('runtime_oci_digest_invalid');
  return `blobs/sha256/${value.slice('sha256:'.length)}`;
}

function verifyBlob(files, value, expectedSize = null) {
  const entry = files.get(blobPath(value));
  if (!entry) fail('runtime_oci_blob_missing');
  const content = entry.content;
  if (expectedSize !== null && (!Number.isSafeInteger(expectedSize) ||
      expectedSize < 0 || content.length !== expectedSize)) {
    fail('runtime_oci_descriptor_size_mismatch');
  }
  if (sha256Buffer(content) !== value) fail('runtime_oci_blob_digest_mismatch');
  return content;
}

function requireMediaType(descriptor, expected) {
  if (descriptor?.mediaType !== expected) fail('runtime_oci_media_type_invalid');
}

function inspectOciArchive(archive, { fsModule = fs } = {}) {
  const buffer = readBoundedArchive(archive, fsModule);
  const entries = parseTarBuffer(buffer, {
    maximumArchiveBytes: MAXIMUM_OCI_ARCHIVE_BYTES,
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
    requireMediaType(descriptor, 'application/vnd.oci.image.manifest.v1+json');
    const manifestContent = verifyBlob(files, descriptor.digest, descriptor.size);
    const manifest = JSON.parse(manifestContent.toString('utf8'));
    if (manifest?.schemaVersion !== 2 || !manifest?.config?.digest ||
        !Array.isArray(manifest?.layers) || manifest.layers.length < 1) {
      fail('runtime_oci_manifest_invalid');
    }
    requireMediaType(manifest.config, 'application/vnd.oci.image.config.v1+json');
    const configContent = verifyBlob(files, manifest.config.digest, manifest.config.size);
    const config = JSON.parse(configContent.toString('utf8'));
    const diffIds = config?.rootfs?.diff_ids;
    if (!Array.isArray(diffIds) || diffIds.length !== manifest.layers.length) {
      fail('runtime_oci_rootfs_invalid');
    }
    let expandedTotal = 0;
    const computedDiffIds = manifest.layers.map(layer => {
      requireMediaType(layer, 'application/vnd.oci.image.layer.v1.tar+gzip');
      const compressed = verifyBlob(files, layer.digest, layer.size);
      let uncompressed;
      try {
        uncompressed = zlib.gunzipSync(compressed, { maxOutputLength: 512 * 1024 * 1024 });
      } catch { fail('runtime_oci_layer_invalid'); }
      expandedTotal += uncompressed.length;
      if (expandedTotal > 1024 * 1024 * 1024) fail('runtime_oci_layer_expansion_limit');
      parseTarBuffer(uncompressed, {
        allowedTypeFlags: ['0', '1', '2', '5'],
        maximumArchiveBytes: 512 * 1024 * 1024,
        maximumEntries: 100_000,
        maximumFileBytes: 512 * 1024 * 1024,
        maximumTotalBytes: 512 * 1024 * 1024,
        requireCanonicalUstar: false
      });
      return sha256Buffer(uncompressed);
    });
    if (JSON.stringify(computedDiffIds) !== JSON.stringify(diffIds)) {
      fail('runtime_oci_diff_id_mismatch');
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
  MAXIMUM_OCI_ARCHIVE_BYTES,
  inspectOciArchive,
  readBoundedArchive,
  preflightTarDescriptor,
  safeArchiveMembers,
  verifyBlob,
  verifyOciArchive
};
