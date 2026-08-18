'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const zlib = require('node:zlib');
const {
  AUTHORITY_SCHEMA, EDGE_RECEIPT_SCHEMA, PROFILE_AUTHORITY_COMPONENT_SCHEMA,
  canonicalJson, digest
} = require(
  '../src/runtime/native-image/runtime-authority'
);
const {
  EDGE_BUILD_MANIFEST_SCHEMA,
  EDGE_IMAGE_AUTHORITY_SCHEMA,
  validateEdgeContainerSupplyChain,
  validateEdgeDaemonImageObservation,
  validateEdgeOciArchive,
  verifyEdgeBuildContextBuffer
} = require('../src/runtime/native-image/edge-image-authority');

const S = value => `sha256:${String(value).repeat(64).slice(0, 64)}`;
const C = value => String(value).repeat(40).slice(0, 40);

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function tar(entries) {
  const blocks = [];
  for (const entry of entries) {
    const content = Buffer.from(entry.content || '');
    const header = Buffer.alloc(512);
    header.write(entry.name, 0, 100, 'utf8');
    header.write(`${(entry.mode || 0o644).toString(8).padStart(7, '0')}\0`, 100, 8);
    header.write('0000000\0', 108, 8);
    header.write('0000000\0', 116, 8);
    header.write(`${content.length.toString(8).padStart(11, '0')}\0`, 124, 12);
    header.write('00000000000\0', 136, 12);
    header.fill(32, 148, 156);
    header[156] = (entry.type || '0').charCodeAt(0);
    if (entry.link) header.write(entry.link, 157, 100, 'utf8');
    header.write('ustar\0', 257, 6, 'ascii');
    header.write('00', 263, 2, 'ascii');
    let checksum = 0;
    for (const byte of header) checksum += byte;
    header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii');
    blocks.push(header);
    if ((entry.type || '0') === '0') {
      blocks.push(content, Buffer.alloc((512 - (content.length % 512)) % 512));
    }
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}

function edgeFixture() {
  const sourceCommit = C('a');
  const lockfile = Buffer.from('{"lockfileVersion":3}\n');
  const sourceFiles = [
    { mode: '100644', path: '.dockerignore', content: Buffer.from('**\n!package.json\n') },
    { mode: '100644', path: 'apps/chatgpt-edge/Dockerfile', content: Buffer.from('FROM scratch\n') },
    { mode: '100644', path: 'package-lock.json', content: lockfile },
    { mode: '100644', path: 'package.json', content: Buffer.from('{}\n') }
  ];
  const fileManifest = sourceFiles.map(file => ({
    mode: file.mode, path: file.path, sha256: sha256(file.content), size: file.content.length
  })).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const buildManifest = {
    baseImageIndexDigest: S('1'),
    baseImagePlatformDigest: S('2'),
    buildToolVersions: { buildx: 'test-buildx', docker: 'test-docker' },
    dockerignoreSha256: fileManifest.find(file => file.path === '.dockerignore').sha256,
    edgeBuildContextFileManifestDigest: digest(fileManifest),
    fileManifest,
    lockfileSha256: sha256(lockfile),
    nodeVersion: '22.23.1',
    schemaVersion: EDGE_BUILD_MANIFEST_SCHEMA,
    sourceCommit,
    sourceDateEpoch: 1_700_000_000,
    sourceTree: S('3')
  };
  const context = tar([
    { name: 'apps', type: '5' }, { name: 'apps/chatgpt-edge', type: '5' },
    ...sourceFiles.map(file => ({ name: file.path, content: file.content,
      mode: file.mode === '100755' ? 0o755 : 0o644 })),
    { name: 'edge-build-manifest.json', content: canonicalJson(buildManifest) }
  ]);
  const layerTar = tar([
    { name: 'app', type: '5' },
    { name: 'app/.build-source-commit', content: `${sourceCommit}\n` },
    { name: 'app/.edge-build-manifest.json', content: canonicalJson(buildManifest) },
    { name: 'app/package-lock.json', content: lockfile }
  ]);
  const layer = zlib.gzipSync(layerTar, { level: 9, mtime: 0 });
  const buildManifestDigest = digest(buildManifest);
  const config = Buffer.from(JSON.stringify({
    architecture: 'amd64', config: { Labels: {
      'io.codex-memory.edge.build-context-digest':
        buildManifest.edgeBuildContextFileManifestDigest,
      'io.codex-memory.edge.build-manifest-digest': buildManifestDigest,
      'io.codex-memory.edge.lockfile-sha256': buildManifest.lockfileSha256,
      'org.opencontainers.image.revision': sourceCommit
    } }, os: 'linux', rootfs: { diff_ids: [sha256(layerTar)], type: 'layers' }
  }));
  const manifest = Buffer.from(JSON.stringify({
    config: { digest: sha256(config), mediaType: 'application/vnd.oci.image.config.v1+json',
      size: config.length },
    layers: [{ digest: sha256(layer), mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
      size: layer.length }],
    mediaType: 'application/vnd.oci.image.manifest.v1+json', schemaVersion: 2
  }));
  const manifestDigest = sha256(manifest);
  const archive = tar([
    { name: 'blobs', type: '5' }, { name: 'blobs/sha256', type: '5' },
    { name: `blobs/sha256/${manifestDigest.slice(7)}`, content: manifest },
    { name: `blobs/sha256/${sha256(config).slice(7)}`, content: config },
    { name: `blobs/sha256/${sha256(layer).slice(7)}`, content: layer },
    { name: 'index.json', content: JSON.stringify({ manifests: [{ digest: manifestDigest,
      mediaType: 'application/vnd.oci.image.manifest.v1+json', size: manifest.length }],
    schemaVersion: 2 }) },
    { name: 'oci-layout', content: '{"imageLayoutVersion":"1.0.0"}' }
  ]);
  return { archive, buildManifest, config, context, lockfile, manifest, manifestDigest,
    sourceCommit };
}

function expectCode(fn, code) {
  assert.throws(fn, error => error?.code === code);
}

test('exact manifested Edge context and OCI artifact establish portable authority', () => {
  const fixture = edgeFixture();
  const context = verifyEdgeBuildContextBuffer(fixture.context);
  assert.equal(context.edgeBuildContextFileManifestDigest,
    fixture.buildManifest.edgeBuildContextFileManifestDigest);
  const image = validateEdgeOciArchive(fixture.archive, fixture.buildManifest);
  assert.equal(image.artifactSha256, sha256(fixture.archive));
  assert.equal(image.ociManifestDigest, fixture.manifestDigest);
  assert.equal(image.imageConfigDigest, sha256(fixture.config));
  assert.equal(image.sourceCommit, fixture.sourceCommit);
});

test('daemon and future container identities descend from accepted Edge artifact', () => {
  const fixture = edgeFixture();
  const accepted = validateEdgeOciArchive(fixture.archive, fixture.buildManifest);
  const image = {
    Architecture: 'amd64', Config: { Labels: {
      'io.codex-memory.edge.build-context-digest': accepted.buildContextDigest,
      'io.codex-memory.edge.build-manifest-digest': accepted.buildManifestDigest,
      'io.codex-memory.edge.lockfile-sha256': accepted.lockfileSha256,
      'org.opencontainers.image.revision': accepted.sourceCommit
    } }, Descriptor: { digest: accepted.ociManifestDigest },
    Id: accepted.ociManifestDigest, Os: 'linux',
    RepoDigests: [`codex-memory-chatgpt-edge@${accepted.ociManifestDigest}`]
  };
  const daemon = validateEdgeDaemonImageObservation(image, accepted);
  const authority = {
    edgeArtifactSha256: accepted.artifactSha256,
    edgeBindingDigest: S('4'), edgeBindingReference: 'binding:r4:accepted',
    edgeDaemonImageIdentity: daemon.daemonImageIdentity,
    edgeHostProjectReference: 'host:private-development',
    edgeLockfileSha256: accepted.lockfileSha256,
    edgeOperatorReference: 'operator:jenn-owner',
    edgePreviousBindingReference: 'binding:r4:previous',
    edgeSourceCommit: accepted.sourceCommit
  };
  const edge = { Image: daemon.daemonImageIdentity, Config: { Env: [
    `CODEX_MEMORY_R4_BINDING_DIGEST=${authority.edgeBindingDigest}`,
    `CODEX_MEMORY_R4_BINDING_REFERENCE=${authority.edgeBindingReference}`,
    `CODEX_MEMORY_R4_EDGE_ARTIFACT_SHA256=${authority.edgeArtifactSha256}`,
    `CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE=${authority.edgeHostProjectReference}`,
    `CODEX_MEMORY_R4_LOCKFILE_SHA256=${authority.edgeLockfileSha256}`,
    `CODEX_MEMORY_R4_OPERATOR_REFERENCE=${authority.edgeOperatorReference}`,
    `CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE=${authority.edgePreviousBindingReference}`,
    `CODEX_MEMORY_R4_SOURCE_COMMIT=${authority.edgeSourceCommit}`
  ], Labels: { 'org.opencontainers.image.revision': authority.edgeSourceCommit } } };
  assert.equal(validateEdgeContainerSupplyChain(edge, authority), true);
  for (const mutate of [
    value => { value.Image = S('0'); },
    value => { value.Config.Env[0] = `CODEX_MEMORY_R4_BINDING_DIGEST=${S('0')}`; },
    value => { value.Config.Env[2] = `CODEX_MEMORY_R4_EDGE_ARTIFACT_SHA256=${S('0')}`; },
    value => { value.Config.Env[4] = `CODEX_MEMORY_R4_LOCKFILE_SHA256=${S('0')}`; },
    value => { value.Config.Env[7] = `CODEX_MEMORY_R4_SOURCE_COMMIT=${C('0')}`; }
  ]) {
    const changed = structuredClone(edge); mutate(changed);
    expectCode(() => validateEdgeContainerSupplyChain(changed, authority),
      'edge_container_supply_chain_mismatch');
  }
});

test('Edge OCI substitution and image-store ambiguity fail closed', () => {
  const fixture = edgeFixture();
  const accepted = validateEdgeOciArchive(fixture.archive, fixture.buildManifest);
  for (const mutate of [
    value => { value.sourceCommit = C('0'); },
    value => { value.lockfileSha256 = S('0'); },
    value => { value.imageConfigDigest = value.ociManifestDigest; },
    value => { value.ociManifestDigest = value.imageConfigDigest; },
    value => { value.imageStoreIdentityModel = 'unknown'; }
  ]) {
    const changed = { ...accepted }; mutate(changed);
    expectCode(() => validateEdgeDaemonImageObservation({}, changed),
      changed.imageStoreIdentityModel === 'unknown'
        ? 'edge_image_store_identity_model_unsupported' : 'edge_image_daemon_identity_mismatch');
  }
  const changedManifest = { ...fixture.buildManifest, sourceCommit: C('0') };
  expectCode(() => validateEdgeOciArchive(fixture.archive, changedManifest),
    'edge_image_metadata_mismatch');
  const archiveWithExtra = Buffer.concat([fixture.archive.subarray(0, -1024), tar([
    { name: 'secret.env', content: 'forbidden' }
  ])]);
  expectCode(() => validateEdgeOciArchive(archiveWithExtra, fixture.buildManifest),
    'edge_image_archive_layout_invalid');
});

test('legacy ambiguous Edge authority and receipt semantics are not current schemas', () => {
  assert.equal(EDGE_IMAGE_AUTHORITY_SCHEMA, 'codex-memory-edge-image-authority/v1');
  assert.equal(AUTHORITY_SCHEMA, 'codex-memory-native-runtime-authority/v3');
  assert.equal(PROFILE_AUTHORITY_COMPONENT_SCHEMA,
    'codex-memory-profile-runtime-authority-components/v3');
  assert.equal(EDGE_RECEIPT_SCHEMA, 'codex-memory-edge-runtime-receipt/v2');
});
