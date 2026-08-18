'use strict';

const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { canonicalJson, digest } = require('./runtime-authority');
const {
  DOCKER_CONTAINERD_MANIFEST_IDENTITY,
  environmentMap
} = require('./provider-image-authority');
const { parseTarBuffer, regularFiles } = require('./tar-archive');

const EDGE_BUILD_MANIFEST_SCHEMA = 'codex-memory-edge-build-manifest/v1';
const EDGE_IMAGE_AUTHORITY_SCHEMA = 'codex-memory-edge-image-authority/v1';
const EDGE_IMAGE_REPOSITORY = 'codex-memory-chatgpt-edge';
const EDGE_BUILD_MANIFEST_PATH = 'edge-build-manifest.json';
const EDGE_BUILD_SOURCE_PATH = 'app/.build-source-commit';
const EDGE_IMAGE_LOCKFILE_PATH = 'app/package-lock.json';
const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const OPAQUE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,255}$/u;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function sha256(bytes) {
  return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
}

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function assertDigest(value, code) {
  if (!SHA256.test(value || '')) fail(code);
}

function assertCommit(value, code) {
  if (!SHA1.test(value || '')) fail(code);
}

function blobPath(value) {
  assertDigest(value, 'edge_image_digest_invalid');
  return `blobs/sha256/${value.slice(7)}`;
}

function parseJson(bytes, code) {
  try { return JSON.parse(bytes.toString('utf8')); } catch { fail(code); }
}

function validateEdgeBuildManifest(value) {
  const keys = [
    'baseImageIndexDigest', 'baseImagePlatformDigest', 'buildToolVersions',
    'dockerignoreSha256', 'edgeBuildContextFileManifestDigest', 'fileManifest',
    'lockfileSha256', 'nodeVersion', 'schemaVersion', 'sourceCommit',
    'sourceDateEpoch', 'sourceTree'
  ];
  if (!exactKeys(value, keys) || value.schemaVersion !== EDGE_BUILD_MANIFEST_SCHEMA ||
      value.nodeVersion !== '22.23.1' || !Number.isSafeInteger(value.sourceDateEpoch) ||
      value.sourceDateEpoch < 1 || !Array.isArray(value.fileManifest) ||
      value.fileManifest.length < 1 ||
      !Object.values(value.buildToolVersions).every(version =>
        typeof version === 'string' && version.length >= 1 && version.length <= 256) ||
      !exactKeys(value.buildToolVersions, ['buildx', 'docker'])) {
    fail('edge_build_manifest_invalid');
  }
  assertCommit(value.sourceCommit, 'edge_build_manifest_source_invalid');
  for (const item of [value.baseImageIndexDigest, value.baseImagePlatformDigest,
    value.dockerignoreSha256, value.edgeBuildContextFileManifestDigest,
    value.lockfileSha256, value.sourceTree]) {
    assertDigest(item, 'edge_build_manifest_digest_invalid');
  }
  let previous = '';
  for (const entry of value.fileManifest) {
    if (!exactKeys(entry, ['mode', 'path', 'sha256', 'size']) ||
        typeof entry.path !== 'string' || entry.path.length < 1 ||
        entry.path.startsWith('/') || entry.path.includes('..') ||
        /(?:^|\/)(?:\.env(?:\.|$)|\.git(?:\/|$)|node_modules(?:\/|$)|logs?(?:\/|$)|tmp(?:\/|$)|cache(?:\/|$)|credentials?(?:\.|\/|$)|id_rsa(?:\.|$))/iu
          .test(entry.path) ||
        entry.path <= previous || !['100644', '100755'].includes(entry.mode) ||
        !Number.isSafeInteger(entry.size) || entry.size < 0) {
      fail('edge_build_manifest_file_invalid');
    }
    assertDigest(entry.sha256, 'edge_build_manifest_file_invalid');
    previous = entry.path;
  }
  if (digest(value.fileManifest) !== value.edgeBuildContextFileManifestDigest) {
    fail('edge_build_manifest_inventory_digest_mismatch');
  }
  const lock = value.fileManifest.find(entry => entry.path === 'package-lock.json');
  if (!lock || lock.sha256 !== value.lockfileSha256) {
    fail('edge_build_manifest_lockfile_mismatch');
  }
  return Object.freeze({ ...value });
}

function verifyEdgeBuildContextBuffer(buffer) {
  const entries = parseTarBuffer(buffer, {
    maximumArchiveBytes: 256 * 1024 * 1024,
    maximumEntries: 2_000,
    maximumFileBytes: 128 * 1024 * 1024,
    maximumTotalBytes: 256 * 1024 * 1024
  });
  const files = regularFiles(entries);
  const manifestEntry = files.get(EDGE_BUILD_MANIFEST_PATH);
  if (!manifestEntry) fail('edge_build_context_manifest_missing');
  const manifest = validateEdgeBuildManifest(parseJson(
    manifestEntry.content, 'edge_build_context_manifest_invalid'
  ));
  if (!manifestEntry.content.equals(Buffer.from(canonicalJson(manifest)))) {
    fail('edge_build_context_manifest_not_canonical');
  }
  const expected = new Map(manifest.fileManifest.map(entry => [entry.path, entry]));
  const observed = [];
  for (const [name, entry] of files) {
    if (name === EDGE_BUILD_MANIFEST_PATH) continue;
    const declared = expected.get(name);
    const mode = (entry.mode & 0o111) === 0 ? '100644' : '100755';
    if (!declared || declared.mode !== mode || declared.size !== entry.size ||
        declared.sha256 !== sha256(entry.content)) {
      fail(`edge_build_context_file_mismatch:${name}`);
    }
    observed.push(declared);
  }
  if (observed.length !== expected.size ||
      digest(observed.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) !==
        manifest.edgeBuildContextFileManifestDigest) {
    fail('edge_build_context_inventory_mismatch');
  }
  const allowedDirectories = new Set();
  for (const name of [...expected.keys(), EDGE_BUILD_MANIFEST_PATH]) {
    const parts = name.split('/');
    for (let index = 1; index < parts.length; index += 1) {
      allowedDirectories.add(parts.slice(0, index).join('/'));
    }
  }
  for (const entry of entries) {
    if (entry.type === 'directory' && !allowedDirectories.has(entry.name)) {
      fail(`edge_build_context_directory_mismatch:${entry.name}`);
    }
  }
  return Object.freeze({
    artifactSha256: sha256(buffer),
    edgeBuildContextFileManifestDigest: manifest.edgeBuildContextFileManifestDigest,
    manifest
  });
}

function verifyBlob(files, descriptor, mediaType, code) {
  if (descriptor?.mediaType !== mediaType || !Number.isSafeInteger(descriptor?.size) ||
      descriptor.size < 1 || !SHA256.test(descriptor?.digest || '')) fail(code);
  const content = files.get(blobPath(descriptor.digest))?.content;
  if (!content || content.length !== descriptor.size || sha256(content) !== descriptor.digest) {
    fail(code);
  }
  return content;
}

function imageFiles(manifest, files) {
  const wanted = new Map();
  const diffIds = [];
  for (const layer of manifest.layers) {
    const compressed = verifyBlob(files, layer,
      'application/vnd.oci.image.layer.v1.tar+gzip', 'edge_image_layer_invalid');
    let expanded;
    try { expanded = zlib.gunzipSync(compressed, { maxOutputLength: 512 * 1024 * 1024 }); } catch {
      fail('edge_image_layer_invalid');
    }
    diffIds.push(sha256(expanded));
    const entries = parseTarBuffer(expanded, {
      allowRootEntry: true,
      allowedTypeFlags: ['0', '1', '2', '5'],
      maximumArchiveBytes: 512 * 1024 * 1024,
      maximumEntries: 100_000,
      maximumFileBytes: 256 * 1024 * 1024,
      maximumTotalBytes: 512 * 1024 * 1024,
      requireCanonicalUstar: false
    });
    for (const entry of entries) {
      const name = entry.name.replace(/^\.\//u, '');
      const base = name.split('/').at(-1);
      if (base?.startsWith('.wh.')) {
        const directory = name.slice(0, -base.length).replace(/\/$/u, '');
        if (base === '.wh..wh..opq') {
          for (const target of wanted.keys()) {
            if (target.startsWith(`${directory}/`)) wanted.delete(target);
          }
        } else {
          const target = `${name.slice(0, -base.length)}${base.slice(4)}`
            .replace(/\/$/u, '');
          for (const governed of wanted.keys()) {
            if (governed === target || governed.startsWith(`${target}/`)) wanted.delete(governed);
          }
        }
      }
      if (name === 'app' && !['directory'].includes(entry.type)) {
        fail('edge_image_embedded_authority_invalid');
      }
      if ([EDGE_BUILD_SOURCE_PATH, EDGE_IMAGE_LOCKFILE_PATH].includes(name)) {
        if (entry.type !== 'file') fail('edge_image_embedded_authority_invalid');
        wanted.set(name, entry.content);
      }
    }
  }
  return Object.freeze({ diffIds: Object.freeze(diffIds), wanted });
}

function validateEdgeOciArchive(archiveBytes, buildManifestInput) {
  if (!Buffer.isBuffer(archiveBytes)) fail('edge_image_archive_invalid');
  const entries = parseTarBuffer(archiveBytes, {
    maximumArchiveBytes: 512 * 1024 * 1024,
    maximumEntries: 8_192,
    maximumFileBytes: 384 * 1024 * 1024,
    maximumTotalBytes: 512 * 1024 * 1024
  });
  const files = regularFiles(entries);
  for (const entry of entries) {
    if (entry.type === 'directory' && !['blobs', 'blobs/sha256'].includes(entry.name)) {
      fail('edge_image_archive_layout_invalid');
    }
    if (entry.type === 'file' && !['index.json', 'manifest.json', 'oci-layout']
      .includes(entry.name) &&
        !/^blobs\/sha256\/[a-f0-9]{64}$/u.test(entry.name)) {
      fail('edge_image_archive_layout_invalid');
    }
  }
  const layout = parseJson(files.get('oci-layout')?.content || Buffer.alloc(0),
    'edge_image_archive_layout_invalid');
  const index = parseJson(files.get('index.json')?.content || Buffer.alloc(0),
    'edge_image_archive_index_invalid');
  if (layout?.imageLayoutVersion !== '1.0.0' || Object.keys(layout).length !== 1 ||
      index?.schemaVersion !== 2 || !Array.isArray(index.manifests) ||
      index.manifests.length !== 1) fail('edge_image_archive_index_invalid');
  const manifestDescriptor = index.manifests[0];
  const manifestBytes = verifyBlob(files, manifestDescriptor,
    'application/vnd.oci.image.manifest.v1+json', 'edge_image_manifest_invalid');
  const manifest = parseJson(manifestBytes, 'edge_image_manifest_invalid');
  if (manifest?.schemaVersion !== 2 || !Array.isArray(manifest.layers) ||
      manifest.layers.length < 1) fail('edge_image_manifest_invalid');
  const configBytes = verifyBlob(files, manifest.config,
    'application/vnd.oci.image.config.v1+json', 'edge_image_config_invalid');
  const config = parseJson(configBytes, 'edge_image_config_invalid');
  if (config?.architecture !== 'amd64' || config?.os !== 'linux') {
    fail('edge_image_platform_invalid');
  }
  const layerEvidence = imageFiles(manifest, files);
  const embedded = layerEvidence.wanted;
  if (config?.rootfs?.type !== 'layers' ||
      JSON.stringify(config?.rootfs?.diff_ids) !== JSON.stringify(layerEvidence.diffIds)) {
    fail('edge_image_rootfs_identity_mismatch');
  }
  const buildManifest = buildManifestInput === undefined
    ? null : validateEdgeBuildManifest(buildManifestInput);
  const labels = config?.config?.Labels || {};
  const sourceBytes = embedded.get(EDGE_BUILD_SOURCE_PATH);
  const lockfileBytes = embedded.get(EDGE_IMAGE_LOCKFILE_PATH);
  const sourceCommit = sourceBytes?.toString('utf8').replace(/\n$/u, '');
  const lockfileSha256 = lockfileBytes && sha256(lockfileBytes);
  if (!SHA1.test(sourceCommit || '') || !lockfileSha256 ||
      labels['org.opencontainers.image.revision'] !== sourceCommit ||
      (buildManifest && (sourceCommit !== buildManifest.sourceCommit ||
        lockfileSha256 !== buildManifest.lockfileSha256))) {
    fail('edge_image_metadata_mismatch');
  }
  const allowedFiles = new Set(['index.json', 'oci-layout', blobPath(manifestDescriptor.digest),
    blobPath(manifest.config.digest), ...manifest.layers.map(layer => blobPath(layer.digest))]);
  if (files.has('manifest.json')) {
    const dockerManifest = parseJson(files.get('manifest.json').content,
      'edge_image_docker_manifest_invalid');
    if (!Array.isArray(dockerManifest) || dockerManifest.length !== 1 ||
        dockerManifest[0]?.Config !== blobPath(manifest.config.digest) ||
        JSON.stringify(dockerManifest[0]?.Layers) !==
          JSON.stringify(manifest.layers.map(layer => blobPath(layer.digest)))) {
      fail('edge_image_docker_manifest_invalid');
    }
    allowedFiles.add('manifest.json');
  } else if (buildManifest === null) {
    fail('edge_image_docker_manifest_invalid');
  }
  if ([...files.keys()].some(name => !allowedFiles.has(name))) {
    fail('edge_image_archive_unexpected_file');
  }
  return Object.freeze({
    artifactSha256: sha256(archiveBytes),
    buildContextDigest: buildManifest?.edgeBuildContextFileManifestDigest,
    buildManifestDigest: buildManifest && digest(buildManifest),
    imageConfigDigest: manifest.config.digest,
    imageStoreIdentityModel: DOCKER_CONTAINERD_MANIFEST_IDENTITY,
    lockfileSha256,
    ociManifestDigest: manifestDescriptor.digest,
    schemaVersion: EDGE_IMAGE_AUTHORITY_SCHEMA,
    sourceCommit
  });
}

function validateEdgeDaemonImageObservation(image, accepted) {
  if (accepted?.schemaVersion !== EDGE_IMAGE_AUTHORITY_SCHEMA ||
      accepted.imageStoreIdentityModel !== DOCKER_CONTAINERD_MANIFEST_IDENTITY) {
    fail('edge_image_store_identity_model_unsupported');
  }
  for (const item of [accepted.artifactSha256, accepted.buildContextDigest,
    accepted.buildManifestDigest, accepted.imageConfigDigest,
    accepted.ociManifestDigest, accepted.lockfileSha256]) {
    assertDigest(item, 'edge_image_authority_invalid');
  }
  assertCommit(accepted.sourceCommit, 'edge_image_authority_invalid');
  const repositoryDigest = `${EDGE_IMAGE_REPOSITORY}@${accepted.ociManifestDigest}`;
  const labels = image?.Config?.Labels || {};
  if (image?.Id !== accepted.ociManifestDigest ||
      image?.Descriptor?.digest !== accepted.ociManifestDigest ||
      image.Id !== image.Descriptor.digest ||
      !Array.isArray(image?.RepoDigests) || !image.RepoDigests.includes(repositoryDigest) ||
      image?.Architecture !== 'amd64' || image?.Os !== 'linux' ||
      labels['org.opencontainers.image.revision'] !== accepted.sourceCommit) {
    fail('edge_image_daemon_identity_mismatch');
  }
  return Object.freeze({
    daemonImageIdentity: image.Id,
    imageConfigDigest: accepted.imageConfigDigest,
    imageStoreIdentityModel: accepted.imageStoreIdentityModel,
    ociManifestDigest: image.Descriptor.digest
  });
}

function validateEdgeContainerSupplyChain(edge, authority) {
  const environment = environmentMap(edge?.Config?.Env || [],
    'edge_container_supply_chain_environment_invalid');
  if (edge?.Image !== authority?.edgeDaemonImageIdentity ||
      environment.CODEX_MEMORY_R4_EDGE_ARTIFACT_SHA256 !== authority.edgeArtifactSha256 ||
      environment.CODEX_MEMORY_R4_BINDING_DIGEST !== authority.edgeBindingDigest ||
      environment.CODEX_MEMORY_R4_BINDING_REFERENCE !== authority.edgeBindingReference ||
      environment.CODEX_MEMORY_R4_OPERATOR_REFERENCE !== authority.edgeOperatorReference ||
      environment.CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE !== authority.edgeHostProjectReference ||
      environment.CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE !==
        authority.edgePreviousBindingReference ||
      environment.CODEX_MEMORY_R4_LOCKFILE_SHA256 !== authority.edgeLockfileSha256 ||
      environment.CODEX_MEMORY_R4_SOURCE_COMMIT !== authority.edgeSourceCommit ||
      edge?.Config?.Labels?.['org.opencontainers.image.revision'] !==
        authority.edgeSourceCommit) {
    fail('edge_container_supply_chain_mismatch');
  }
  return true;
}

function validateEdgeSupplyChainReferences(value) {
  if (!SHA256.test(value?.edgeBindingDigest || '') ||
      !OPAQUE_REFERENCE.test(value?.edgeBindingReference || '') ||
      !OPAQUE_REFERENCE.test(value?.edgeOperatorReference || '') ||
      !OPAQUE_REFERENCE.test(value?.edgeHostProjectReference || '') ||
      !OPAQUE_REFERENCE.test(value?.edgePreviousBindingReference || '') ||
      [value.edgeBindingReference, value.edgeOperatorReference,
        value.edgeHostProjectReference, value.edgePreviousBindingReference]
        .some(reference => /placeholder|example|todo/iu.test(reference))) {
    fail('edge_supply_chain_reference_invalid');
  }
  return Object.freeze({
    edgeBindingDigest: value.edgeBindingDigest,
    edgeBindingReference: value.edgeBindingReference,
    edgeHostProjectReference: value.edgeHostProjectReference,
    edgeOperatorReference: value.edgeOperatorReference,
    edgePreviousBindingReference: value.edgePreviousBindingReference
  });
}

module.exports = {
  DOCKER_CONTAINERD_MANIFEST_IDENTITY,
  EDGE_BUILD_MANIFEST_PATH,
  EDGE_BUILD_MANIFEST_SCHEMA,
  EDGE_IMAGE_AUTHORITY_SCHEMA,
  EDGE_IMAGE_REPOSITORY,
  validateEdgeBuildManifest,
  validateEdgeBuildContextBuffer: verifyEdgeBuildContextBuffer,
  validateEdgeContainerSupplyChain,
  validateEdgeDaemonImageObservation,
  validateEdgeOciArchive,
  validateEdgeSupplyChainReferences,
  verifyEdgeBuildContextBuffer
};
