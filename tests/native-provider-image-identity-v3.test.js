'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const {
  DOCKER_CONTAINERD_MANIFEST_IDENTITY,
  validateProviderDaemonImageObservation,
  validateProviderImageAdmission
} = require('../src/runtime/native-image/provider-image-authority');

const sha = value => `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;

function tar(entries) {
  const blocks = [];
  for (const entry of entries) {
    const content = Buffer.from(entry.content || '');
    const header = Buffer.alloc(512);
    header.write(entry.name, 0, 100, 'utf8');
    header.write(`${(entry.mode || 0o644).toString(8).padStart(7, '0')}\0`, 100, 8, 'ascii');
    header.write('0000000\0', 108, 8, 'ascii');
    header.write('0000000\0', 116, 8, 'ascii');
    header.write(`${content.length.toString(8).padStart(11, '0')}\0`, 124, 12, 'ascii');
    header.write('00000000000\0', 136, 12, 'ascii');
    header.fill(32, 148, 156);
    header[156] = (entry.type || '0').charCodeAt(0);
    header.write('ustar\0', 257, 6, 'ascii');
    header.write('00', 263, 2, 'ascii');
    let checksum = 0;
    for (const byte of header) checksum += byte;
    header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii');
    blocks.push(header, content,
      Buffer.alloc((512 - (content.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}

function fixture(mutate = () => {}) {
  const inheritedEnvironment = [
    'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
  ];
  const labels = {
    'org.opencontainers.image.revision': 'a'.repeat(40),
    'org.opencontainers.image.source': 'https://example.invalid/provider',
    'org.opencontainers.image.version': 'v1'
  };
  const config = Buffer.from(JSON.stringify({
    architecture: 'amd64', config: { Env: inheritedEnvironment, Labels: labels }, os: 'linux'
  }));
  const layer = Buffer.from('synthetic-layer');
  const configDigest = sha(config);
  const layerDigest = sha(layer);
  const manifest = Buffer.from(JSON.stringify({
    config: { digest: configDigest,
      mediaType: 'application/vnd.oci.image.config.v1+json', size: config.length },
    layers: [{ digest: layerDigest,
      mediaType: 'application/vnd.oci.image.layer.v1.tar', size: layer.length }],
    mediaType: 'application/vnd.oci.image.manifest.v1+json',
    schemaVersion: 2
  }));
  const manifestDigest = sha(manifest);
  const expected = {
    architecture: 'amd64', daemonImageIdentity: manifestDigest,
    imageConfigDigest: configDigest,
    imageRepository: 'example/provider', imageRevision: labels['org.opencontainers.image.revision'],
    imageSource: labels['org.opencontainers.image.source'],
    imageStoreIdentityModel: DOCKER_CONTAINERD_MANIFEST_IDENTITY,
    imageVersion: labels['org.opencontainers.image.version'],
    ociManifestDigest: manifestDigest, os: 'linux',
    schemaVersion: 'codex-memory-provider-container-policy/v4'
  };
  const image = {
    Architecture: 'amd64', Config: { Env: inheritedEnvironment, Labels: labels },
    Descriptor: { digest: manifestDigest }, Id: manifestDigest, Os: 'linux',
    RepoDigests: [`example/provider@${manifestDigest}`]
  };
  const index = Buffer.from(JSON.stringify({
    manifests: [{ digest: manifestDigest,
      mediaType: 'application/vnd.oci.image.manifest.v1+json', size: manifest.length }],
    schemaVersion: 2
  }));
  const dockerManifest = Buffer.from(JSON.stringify([{
    Config: `blobs/sha256/${configDigest.slice(7)}`,
    Layers: [`blobs/sha256/${layerDigest.slice(7)}`], RepoTags: null
  }]));
  const entries = [
    { name: 'blobs', type: '5' }, { name: 'blobs/sha256', type: '5' },
    { name: `blobs/sha256/${manifestDigest.slice(7)}`, content: manifest },
    { name: `blobs/sha256/${configDigest.slice(7)}`, content: config },
    { name: `blobs/sha256/${layerDigest.slice(7)}`, content: layer },
    { name: 'index.json', content: index },
    { name: 'manifest.json', content: dockerManifest },
    { name: 'oci-layout', content: '{"imageLayoutVersion":"1.0.0"}\n' }
  ];
  const value = { entries, expected, image };
  mutate(value);
  return { ...value, archive: tar(value.entries) };
}

function reject(mutate) {
  const value = fixture(mutate);
  assert.throws(() => validateProviderImageAdmission(
    value.image, value.archive, value.expected
  ));
}

test('exact Docker containerd manifest identity mapping is admitted', () => {
  const value = fixture();
  assert.deepEqual(validateProviderImageAdmission(
    value.image, value.archive, value.expected
  ), {
    daemonImageIdentity: value.expected.daemonImageIdentity,
    imageConfigDigest: value.expected.imageConfigDigest,
    imageInheritedEnvironment: {
      PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
    },
    imageStoreIdentityModel: DOCKER_CONTAINERD_MANIFEST_IDENTITY,
    ociManifestDigest: value.expected.ociManifestDigest
  });
});

test('exact Native Docker 29/containerd Provider observation is admitted', () => {
  const manifest = 'sha256:69aef0d276a5e00fb6f6d9f11b199fd9ec42d89a0857924547ee4249ad2094a3';
  const expected = {
    architecture: 'amd64', daemonImageIdentity: manifest,
    imageRepository: 'calciumion/new-api',
    imageRevision: '6ce7305cd36f16506fb6a2c3c524a5a318539ba7',
    imageSource: 'https://github.com/QuantumNous/new-api',
    imageStoreIdentityModel: DOCKER_CONTAINERD_MANIFEST_IDENTITY,
    imageVersion: 'v1.0.0-rc.20', ociManifestDigest: manifest, os: 'linux',
    schemaVersion: 'codex-memory-provider-container-policy/v4'
  };
  assert.deepEqual(validateProviderDaemonImageObservation({
    Architecture: 'amd64', Config: { Env: [
      'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
    ], Labels: {
      'org.opencontainers.image.revision': expected.imageRevision,
      'org.opencontainers.image.source': expected.imageSource,
      'org.opencontainers.image.version': expected.imageVersion
    } }, Descriptor: { digest: manifest }, Id: manifest, Os: 'linux',
    RepoDigests: [`calciumion/new-api@${manifest}`]
  }, expected), {
    daemonImageIdentity: manifest,
    imageStoreIdentityModel: DOCKER_CONTAINERD_MANIFEST_IDENTITY,
    ociManifestDigest: manifest
  });
});

const identityAttacks = [
  ['config digest substitution', value => { value.expected.imageConfigDigest = `sha256:${'0'.repeat(64)}`; }],
  ['manifest digest substitution', value => { value.expected.ociManifestDigest = `sha256:${'0'.repeat(64)}`; }],
  ['daemon identity substitution', value => { value.image.Id = `sha256:${'0'.repeat(64)}`; }],
  ['descriptor digest substitution', value => { value.image.Descriptor.digest = `sha256:${'0'.repeat(64)}`; }],
  ['repository digest substitution', value => { value.image.RepoDigests = [`example/provider@sha256:${'0'.repeat(64)}`]; }],
  ['mutable tag without digest authority', value => { value.image.RepoDigests = []; value.image.RepoTags = ['example/provider:latest']; }],
  ['unknown image-store identity model', value => { value.expected.imageStoreIdentityModel = 'unknown/v1'; }],
  ['Provider policy v3 downgrade', value => { value.expected.schemaVersion = 'codex-memory-provider-container-policy/v3'; }],
  ['ambiguous classic config-ID observation', value => { value.image.Id = value.expected.imageConfigDigest; }],
  ['wrong architecture', value => { value.image.Architecture = 'arm64'; }],
  ['wrong revision', value => { value.image.Config.Labels['org.opencontainers.image.revision'] = 'b'.repeat(40); }]
];

for (const [name, mutate] of identityAttacks) test(`rejects ${name}`, () => {
  reject(mutate);
});

test('identity layer adversarial matrix contains eleven independent cases', () => {
  const wrong = `sha256:${'0'.repeat(64)}`;
  assert.equal(wrong.length, 71);
  assert.equal(identityAttacks.length, 11);
});

test('config bytes and availability are mandatory', () => {
  reject(value => {
    const name = `blobs/sha256/${value.expected.imageConfigDigest.slice(7)}`;
    value.entries.find(entry => entry.name === name).content = 'substituted';
  });
  reject(value => {
    const name = `blobs/sha256/${value.expected.imageConfigDigest.slice(7)}`;
    value.entries = value.entries.filter(entry => entry.name !== name);
  });
});

test('daemon image environment must equal the exact hashed OCI config environment', () => {
  reject(value => { value.image.Config.Env[0] = 'PATH=/mutable/bin'; });
  reject(value => { value.image.Config.Env.push('NODE_PATH=/data/plugins'); });
  reject(value => { value.image.Config.Env = []; });
});

test('OCI config environment rejects duplicates and malformed entries', () => {
  for (const env of [
    ['PATH=/usr/bin', 'PATH=/other'], ['MALFORMED'], ['1INVALID=value'],
    ['PATH=/usr/bin\nNODE_PATH=/data']
  ]) reject(value => {
    const configName = `blobs/sha256/${value.expected.imageConfigDigest.slice(7)}`;
    const entry = value.entries.find(candidate => candidate.name === configName);
    const parsed = JSON.parse(Buffer.from(entry.content).toString('utf8'));
    parsed.config.Env = env;
    entry.content = JSON.stringify(parsed);
  });
});

test('archive ambiguity and undeclared content are rejected', () => {
  reject(value => value.entries.push({ name: 'unexpected', content: 'x' }));
  reject(value => value.entries.push({ name: 'index.json', content: '{}' }));
  reject(value => value.entries.push({ name: '../escape', content: 'x' }));
});

test('layer bytes, size, media type, and OCI layout are mandatory', () => {
  reject(value => {
    const layer = value.entries.find(entry => entry.name.includes('/sha256/') &&
      Buffer.from(entry.content || '').equals(Buffer.from('synthetic-layer')));
    layer.content = 'substituted-layer';
  });
  reject(value => {
    const layout = value.entries.find(entry => entry.name === 'oci-layout');
    layout.content = '{"imageLayoutVersion":"1.1.0"}\n';
  });
  reject(value => {
    const manifestEntry = value.entries.find(entry =>
      entry.name === `blobs/sha256/${value.expected.ociManifestDigest.slice(7)}`);
    const manifest = JSON.parse(Buffer.from(manifestEntry.content).toString('utf8'));
    manifest.layers[0].mediaType = 'application/octet-stream';
    manifestEntry.content = JSON.stringify(manifest);
  });
});
