'use strict';

const crypto = require('node:crypto');
const { parseTarBuffer, regularFiles } = require('./tar-archive');

const DOCKER_CONTAINERD_MANIFEST_IDENTITY =
  'docker-containerd-manifest-identity/v1';
const SHA256 = /^sha256:[a-f0-9]{64}$/u;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function sha256(bytes) {
  return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
}

function parseJson(bytes, code) {
  try { return JSON.parse(bytes.toString('utf8')); } catch { fail(code); }
}

function digestPath(value) {
  if (!SHA256.test(value || '')) fail('provider_image_archive_digest_invalid');
  return `blobs/sha256/${value.slice(7)}`;
}

function validateProviderImageArchive(archiveBytes, expected) {
  const entries = parseTarBuffer(archiveBytes, {
    maximumArchiveBytes: 512 * 1024 * 1024,
    maximumEntries: 20_000,
    maximumFileBytes: 384 * 1024 * 1024,
    maximumTotalBytes: 512 * 1024 * 1024,
    requireCanonicalUstar: false
  });
  const files = regularFiles(entries);
  const layout = parseJson(files.get('oci-layout')?.content || Buffer.alloc(0),
    'provider_image_archive_layout_invalid');
  if (layout?.imageLayoutVersion !== '1.0.0' || Object.keys(layout).length !== 1) {
    fail('provider_image_archive_layout_invalid');
  }
  const index = parseJson(files.get('index.json')?.content || Buffer.alloc(0),
    'provider_image_archive_index_invalid');
  if (index?.schemaVersion !== 2 || !Array.isArray(index.manifests) ||
      index.manifests.length !== 1) fail('provider_image_archive_index_invalid');
  const descriptor = index.manifests[0];
  if (descriptor?.digest !== expected.ociManifestDigest ||
      descriptor?.mediaType !== 'application/vnd.oci.image.manifest.v1+json' ||
      !Number.isSafeInteger(descriptor?.size) || descriptor.size < 1) {
    fail('provider_image_archive_manifest_invalid');
  }
  const manifestBytes = files.get(digestPath(descriptor.digest))?.content;
  if (!manifestBytes || manifestBytes.length !== descriptor.size ||
      sha256(manifestBytes) !== descriptor.digest) {
    fail('provider_image_archive_manifest_invalid');
  }
  const manifest = parseJson(manifestBytes, 'provider_image_archive_manifest_invalid');
  if (manifest?.schemaVersion !== 2 ||
      manifest?.mediaType !== 'application/vnd.oci.image.manifest.v1+json' ||
      manifest?.config?.mediaType !== 'application/vnd.oci.image.config.v1+json' ||
      manifest?.config?.digest !== expected.imageConfigDigest ||
      !Number.isSafeInteger(manifest?.config?.size) || manifest.config.size < 1 ||
      !Array.isArray(manifest.layers) || manifest.layers.length < 1) {
    fail('provider_image_archive_config_invalid');
  }
  const configBytes = files.get(digestPath(manifest.config.digest))?.content;
  if (!configBytes || configBytes.length !== manifest.config.size ||
      sha256(configBytes) !== manifest.config.digest) {
    fail('provider_image_archive_config_invalid');
  }
  const config = parseJson(configBytes, 'provider_image_archive_config_invalid');
  if (config?.architecture !== expected.architecture || config?.os !== expected.os) {
    fail('provider_image_archive_platform_invalid');
  }
  const allowedFiles = new Set(['index.json', 'manifest.json', 'oci-layout',
    digestPath(descriptor.digest), digestPath(manifest.config.digest)]);
  for (const layer of manifest.layers) {
    if (!SHA256.test(layer?.digest || '') || !Number.isSafeInteger(layer?.size) ||
        layer.size < 0 ||
        !['application/vnd.oci.image.layer.v1.tar',
          'application/vnd.oci.image.layer.v1.tar+gzip'].includes(layer.mediaType)) {
      fail('provider_image_archive_layer_invalid');
    }
    const layerBytes = files.get(digestPath(layer.digest))?.content;
    if (!layerBytes || layerBytes.length !== layer.size ||
        sha256(layerBytes) !== layer.digest) {
      fail('provider_image_archive_layer_invalid');
    }
    allowedFiles.add(digestPath(layer.digest));
  }
  if ([...files.keys()].some(name => !allowedFiles.has(name))) {
    fail('provider_image_archive_unexpected_file');
  }
  const dockerManifest = parseJson(files.get('manifest.json')?.content || Buffer.alloc(0),
    'provider_image_archive_docker_manifest_invalid');
  if (!Array.isArray(dockerManifest) || dockerManifest.length !== 1 ||
      dockerManifest[0]?.Config !== digestPath(manifest.config.digest) ||
      !Array.isArray(dockerManifest[0]?.Layers) ||
      JSON.stringify(dockerManifest[0].Layers) !==
        JSON.stringify(manifest.layers.map(layer => digestPath(layer.digest)))) {
    fail('provider_image_archive_docker_manifest_invalid');
  }
  return Object.freeze({
    imageConfigDigest: manifest.config.digest,
    ociManifestDigest: descriptor.digest
  });
}

function validateProviderDaemonImageObservation(image, expected) {
  if (expected?.imageStoreIdentityModel !== DOCKER_CONTAINERD_MANIFEST_IDENTITY) {
    fail('provider_image_store_identity_model_unsupported');
  }
  const repositoryDigest = `${expected.imageRepository}@${expected.ociManifestDigest}`;
  if (image?.Id !== expected.daemonImageIdentity ||
      image?.Descriptor?.digest !== expected.ociManifestDigest ||
      image.Id !== image.Descriptor.digest ||
      !Array.isArray(image?.RepoDigests) || !image.RepoDigests.includes(repositoryDigest) ||
      image?.Architecture !== expected.architecture || image?.Os !== expected.os) {
    fail('provider_image_daemon_identity_mismatch');
  }
  const labels = image?.Config?.Labels || {};
  if (labels['org.opencontainers.image.revision'] !== expected.imageRevision ||
      labels['org.opencontainers.image.source'] !== expected.imageSource ||
      labels['org.opencontainers.image.version'] !== expected.imageVersion) {
    fail('provider_image_metadata_mismatch');
  }
  return Object.freeze({
    daemonImageIdentity: image.Id,
    imageStoreIdentityModel: expected.imageStoreIdentityModel,
    ociManifestDigest: image.Descriptor.digest
  });
}

function validateProviderImageAdmission(image, archiveBytes, expected) {
  const daemon = validateProviderDaemonImageObservation(image, expected);
  const archive = validateProviderImageArchive(archiveBytes, expected);
  return Object.freeze({
    daemonImageIdentity: daemon.daemonImageIdentity,
    imageConfigDigest: archive.imageConfigDigest,
    imageStoreIdentityModel: daemon.imageStoreIdentityModel,
    ociManifestDigest: archive.ociManifestDigest
  });
}

module.exports = {
  DOCKER_CONTAINERD_MANIFEST_IDENTITY,
  validateProviderDaemonImageObservation,
  validateProviderImageAdmission,
  validateProviderImageArchive
};
