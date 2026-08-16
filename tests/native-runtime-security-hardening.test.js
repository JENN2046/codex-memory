'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const test = require('node:test');
const {
  AUTHORITY_DEPENDENCY_GRAPH, AUTHORITY_SCHEMA, BUILD_MANIFEST_SCHEMA, EDGE_RECEIPT_SCHEMA,
  PROVIDER_RECEIPT_SCHEMA, STATE_MOUNT_SCHEMA, authorityRecordDigest,
  canonicalJson, containerConfigDigest, countAuthorityGraphCycles, digest, sha256Buffer,
  validateAuthorityRecord, validateProviderReceipt
} = require('../src/runtime/native-image/runtime-authority');
const {
  EDGE_POLICY_DIGEST, PROVIDER_POLICY_DIGEST, RUNTIME_POLICY_DIGEST,
  validateEdgeCandidate, validateProviderCandidate, validateRuntimeCandidate
} = require('../src/runtime/native-image/container-policy');
const {
  EXPECTED_VEXUS_PATH, EXPECTED_VEXUS_SHA256, NATIVE_CLOSURE_SCHEMA,
  nativeClosureDigest, validateNativeClosure, verifyNativeClosureBytes
} = require('../src/runtime/native-image/native-closure');
const { verifyBuildContextBuffer } = require('../src/runtime/native-image/build-context');
const { parseTarBuffer } = require('../src/runtime/native-image/tar-archive');
const { buildRuntimeImage } = require('../scripts/build-codex-memory-runtime-image');
const { runUnderLifecycleLock } = require('../deploy/native-runtime/host-launcher');

const S = value => `sha256:${String(value).repeat(64).slice(0, 64)}`;
const C = value => String(value).repeat(40).slice(0, 40);
const I = value => String(value).repeat(64).slice(0, 64);
const sha = value => `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
function expectCode(fn, code) {
  assert.throws(fn, error => error?.code === code || error?.message === code);
}

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

function buildManifest(fileManifest) {
  return {
    baseImageIndexDigest: S('1'), baseImagePlatformDigest: S('2'),
    buildContextFileManifestDigest: digest(fileManifest),
    buildToolVersions: { buildx: 'test', docker: 'test' },
    codexMemoryCommit: C('a'), codexMemoryTree: S('3'), fileManifest,
    lockfileDigests: { codexMemory: S('4'), vcp: S('5') },
    nodeVersion: '22.23.1', runtimeBuildManifestVersion: BUILD_MANIFEST_SCHEMA,
    sourceDateEpoch: 1, vcpCommit: C('b'), vcpTree: S('6'),
    vexusSha256: EXPECTED_VEXUS_SHA256
  };
}
function context(entries) {
  const fileManifest = entries.map(entry => ({
    mode: entry.mode === 0o755 ? '100755' : '100644', path: entry.name,
    sha256: sha(Buffer.from(entry.content)), size: Buffer.byteLength(entry.content)
  })).sort((a, b) => a.path.localeCompare(b.path));
  const manifest = buildManifest(fileManifest);
  return { buffer: tar([
    { name: 'codex-memory', type: '5' },
    { name: 'runtime', type: '5' },
    { name: 'vcptoolbox', type: '5' },
    ...entries,
    { name: 'runtime/runtime-build-manifest.json', content: canonicalJson(manifest) }
  ]), manifest };
}

test('manifested context bytes are the exact in-memory BuildKit input', () => {
  const fixture = context([
    { name: 'codex-memory/Dockerfile', content: 'FROM scratch\n' },
    { name: 'vcptoolbox/vexus.node', content: 'accepted' }
  ]);
  const evidence = verifyBuildContextBuffer(fixture.buffer);
  assert.equal(evidence.builderConsumedContextDigest, evidence.manifestedContextDigest);
});
test('post-manifest changed, added, deleted, symlink and Vexus-substitute inputs reject', () => {
  const accepted = [
    { name: 'codex-memory/Dockerfile', content: 'FROM scratch\n' },
    { name: 'vcptoolbox/vexus.node', content: 'accepted' }
  ];
  const manifest = context(accepted).manifest;
  const withManifest = entries => tar([
    { name: 'codex-memory', type: '5' }, { name: 'runtime', type: '5' },
    { name: 'vcptoolbox', type: '5' }, ...entries,
    { name: 'runtime/runtime-build-manifest.json', content: canonicalJson(manifest) }
  ]);
  for (const entries of [
    [{ ...accepted[0], content: 'changed' }, accepted[1]],
    [...accepted, { name: 'codex-memory/undeclared', content: 'x' }],
    [accepted[0]], [accepted[0], { ...accepted[1], content: 'substitute' }]
  ]) expectCode(() => verifyBuildContextBuffer(withManifest(entries)),
    'runtime_context_inventory_mismatch');
  expectCode(() => verifyBuildContextBuffer(withManifest([
    accepted[0], { name: accepted[1].name, type: '2', link: '/etc/passwd' }
  ])), 'runtime_tar_special_entry_forbidden');
});

test('a self-consistent replacement context cannot satisfy the operator-bound artifact digest', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-context-binding-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const accepted = context([{ name: 'codex-memory/deploy/native-runtime/Dockerfile',
    content: 'FROM scratch\n' }, { name: 'vcptoolbox/package.json', content: '{}\n' }]);
  const replacement = context([{ name: 'codex-memory/deploy/native-runtime/Dockerfile',
    content: 'FROM busybox\n' }, { name: 'vcptoolbox/package.json', content: '{}\n' }]);
  fs.writeFileSync(path.join(root, 'runtime-context.tar'), replacement.buffer);
  expectCode(() => buildRuntimeImage({ contextDirectory: root,
    expectedContextArtifactSha256: sha256Buffer(accepted.buffer),
    outputArchive: path.join(root, 'image.oci.tar')
  }), 'runtime_context_artifact_authority_mismatch');
});

test('tar validator rejects traversal, links, duplicates, special nodes and limits', () => {
  for (const value of [
    tar([{ name: '../escape', content: 'x' }]),
    tar([{ name: 'link', type: '2', link: '/etc/passwd' }]),
    tar([{ name: 'hard', type: '1', link: 'target' }]),
    tar([{ name: 'fifo', type: '6' }]),
    tar([{ name: 'device', type: '3' }]),
    tar([{ name: 'contiguous', type: '7' }]),
    tar([{ name: 'sparse', type: 'S' }]),
    tar([{ name: 'pax', type: 'x' }]),
    tar([{ name: 'same', content: 'a' }, { name: 'same', content: 'b' }])
  ]) assert.throws(() => parseTarBuffer(value));
  expectCode(() => parseTarBuffer(tar([{ name: 'large', content: '1234' }]), {
    maximumFileBytes: 3
  }), 'runtime_tar_entry_too_large');
  expectCode(() => parseTarBuffer(tar([
    { name: 'a', content: '12' }, { name: 'b', content: '34' }
  ]), { maximumTotalBytes: 3 }), 'runtime_tar_expansion_limit');
});

const SOURCES = Object.freeze({
  authority: '/etc/codex-memory/authority.json', edgeReceipt: '/run/codex-memory/edge.json',
  primaryState: '/srv/codex-memory/r5c', profile: '/etc/codex-memory/profile.json',
  providerEnvironment: '/etc/codex-memory/provider.env',
  providerReceipt: '/run/codex-memory/provider.json',
  runtimeDirectory: '/var/lib/codex-memory/runtime'
});
function runtimeInspect() {
  const env = [
    'CODEX_MEMORY_CONTAINER_AUTHORITY_PATH=/run/codex-memory/authority.json',
    'CODEX_MEMORY_CONTAINER_SUPERVISOR=1',
    'CODEX_MEMORY_EDGE_RECEIPT_PATH=/run/codex-memory/edge-receipt.json',
    'CODEX_MEMORY_PROVIDER_RECEIPT_PATH=/run/codex-memory/provider-receipt.json',
    'CODEX_MEMORY_RUNTIME_BUILD_MANIFEST_PATH=/opt/codex-memory-runtime/runtime-build-manifest.json',
    'CODEX_MEMORY_STACK_PROFILE_PATH=/run/codex-memory/profile.json',
    'CODEX_MEMORY_STACK_RUNTIME_DIR=/run/codex-memory-runtime-data',
    'NODE_ENV=production', 'VCP_ROOT=/opt/vcptoolbox', 'VCPTOOLBOX_ROOT=/opt/vcptoolbox'
  ];
  const destinations = [
    [SOURCES.authority, '/run/codex-memory/authority.json', false],
    [SOURCES.edgeReceipt, '/run/codex-memory/edge-receipt.json', false],
    [SOURCES.profile, '/run/codex-memory/profile.json', false],
    [SOURCES.providerReceipt, '/run/codex-memory/provider-receipt.json', false],
    [SOURCES.providerEnvironment, '/run/secrets/codex-memory-vcp-provider.env', false],
    [SOURCES.runtimeDirectory, '/run/codex-memory-runtime-data', true],
    [SOURCES.primaryState, '/srv/codex-memory/r5c', false]
  ];
  return {
    Config: { Cmd: [], Entrypoint: ['/usr/local/bin/node',
      '/opt/codex-memory/scripts/codex-memory-stack.js', '_container-supervisor'], Env: env,
    User: '1000:1000', WorkingDir: '/opt/codex-memory' },
    HostConfig: { CapAdd: [], CapDrop: ['ALL'], CgroupnsMode: '', Devices: [],
      DeviceRequests: [], IpcMode: 'private', LogConfig: { Type: 'none' },
      NetworkMode: 'host', PidMode: '', PortBindings: {}, Privileged: false,
      ReadonlyRootfs: true, RestartPolicy: { Name: 'no' },
      SecurityOpt: ['no-new-privileges:true'], Tmpfs: {
        '/run/codex-memory-runtime': 'rw,noexec,nosuid,nodev,mode=0700,uid=1000,gid=1000',
        '/tmp': 'rw,noexec,nosuid,nodev,mode=0700,uid=1000,gid=1000'
      }, UsernsMode: '', UTSMode: '' },
    Id: I('1'), Image: S('1'), Mounts: destinations.map(([source, destination, rw]) =>
      ({ Destination: destination, Propagation: 'rprivate', RW: rw, Source: source, Type: 'bind' })),
    State: { Running: false }
  };
}
function edgeInspect() {
  return { Config: { Cmd: [], Entrypoint: [], Env: [], Labels: {
    'org.opencontainers.image.revision': C('1')
  }, User: '1000:1000', WorkingDir: '/opt/edge' },
    HostConfig: { CapAdd: [], CapDrop: ['ALL'], CgroupnsMode: '', Devices: [],
      DeviceRequests: [], IpcMode: 'private', LogConfig: { Type: 'none' },
      NetworkMode: 'bridge', PidMode: '', PortBindings: {
        '8080/tcp': [{ HostIp: '127.0.0.1', HostPort: '18080' }]
      }, Privileged: false, ReadonlyRootfs: true, RestartPolicy: { Name: 'no' },
      SecurityOpt: ['no-new-privileges:true'], Tmpfs: {}, UsernsMode: '', UTSMode: '' },
    Id: I('2'), Image: S('2'), Mounts: [{ Destination: '/run/secrets/codex-memory-r4',
      Propagation: 'rprivate', RW: false, Source: '/etc/codex-memory/edge', Type: 'bind' }],
    State: { Health: { Status: 'healthy' }, Running: true } };
}
function providerInspect() {
  return { Config: { Cmd: [], Entrypoint: [], Env: [], Labels: {
    'org.opencontainers.image.revision': C('3') }, User: '1000:1000' },
  HostConfig: { CapAdd: [], CapDrop: [], CgroupnsMode: '', Devices: [], DeviceRequests: [],
    IpcMode: 'private', LogConfig: { Type: 'json-file' }, NetworkMode: 'bridge',
    PidMode: '', PortBindings: { '3000/tcp': [{ HostIp: '127.0.0.1', HostPort: '3000' }] },
    Privileged: false, ReadonlyRootfs: false, RestartPolicy: { Name: 'always' },
    SecurityOpt: [], Tmpfs: {}, UsernsMode: '', UTSMode: '' },
  Id: I('3'), Image: S('3'), Mounts: [],
  State: { Health: { Status: 'healthy' }, Running: true } };
}

test('independent canonical policies admit exact Runtime, Edge and Provider', () => {
  validateRuntimeCandidate(runtimeInspect(), { ...SOURCES,
    primaryStateDestination: '/srv/codex-memory/r5c' });
  validateEdgeCandidate(edgeInspect());
  validateProviderCandidate(providerInspect());
});
test('root authority dependency graph is acyclic and receipts cannot mint authority', () => {
  assert.equal(countAuthorityGraphCycles(AUTHORITY_DEPENDENCY_GRAPH), 0);
  assert.equal(AUTHORITY_DEPENDENCY_GRAPH.edgeReceipt, undefined);
  assert.equal(AUTHORITY_DEPENDENCY_GRAPH.providerReceipt, undefined);
});
test('unsafe candidate cannot self-authorize by recomputing its own digest', () => {
  const mutations = [
    value => { value.HostConfig.Privileged = true; },
    value => { value.HostConfig.ReadonlyRootfs = false; },
    value => { value.HostConfig.CapAdd = ['SYS_ADMIN']; },
    value => { value.HostConfig.CapDrop = []; },
    value => { value.HostConfig.RestartPolicy.Name = 'always'; },
    value => { value.Config.User = '0:0'; },
    value => { value.HostConfig.NetworkMode = 'bridge'; },
    value => value.Mounts.push({ Destination: '/host-run', RW: false,
      Source: '/var/run', Type: 'bind' })
  ];
  for (const mutate of mutations) {
    const value = runtimeInspect(); mutate(value);
    expectCode(() => validateRuntimeCandidate(value, { ...SOURCES,
      primaryStateDestination: '/srv/codex-memory/r5c' }),
    'runtime_container_canonical_policy_mismatch');
  }
  for (const mutate of [
    value => { value.HostConfig.LogConfig.Type = 'json-file'; },
    value => { value.HostConfig.Privileged = true; },
    value => { value.HostConfig.ReadonlyRootfs = false; },
    value => { value.HostConfig.CapAdd = ['SYS_ADMIN']; },
    value => { value.HostConfig.CapDrop = []; },
    value => { value.HostConfig.RestartPolicy.Name = 'always'; },
    value => { value.Config.User = '0:0'; },
    value => { value.HostConfig.NetworkMode = 'host'; },
    value => { value.Mounts[0].RW = true; }
  ]) {
    const edge = edgeInspect(); mutate(edge);
    expectCode(() => validateEdgeCandidate(edge), 'edge_container_canonical_policy_mismatch');
  }
});

function closure() {
  return { schemaVersion: NATIVE_CLOSURE_SCHEMA, artifacts: [{ buildId: C('a'),
    elfClass: 'ELF64', interpreter: null, machine: 'Advanced Micro Devices X86-64',
    maximumGlibc: '2.35', needed: ['libc.so.6'],
    path: EXPECTED_VEXUS_PATH, resolvedLibraries: [{ name: 'libc.so.6',
      path: '/lib/x86_64-linux-gnu/libc.so.6', sha256: S('4') }], rpath: null,
    runpath: null, sha256: EXPECTED_VEXUS_SHA256, type: 'DYN (Shared object file)' }] };
}
test('native closure is mandatory and rejects substitution, RPATH, missing lib and wrong arch', () => {
  validateNativeClosure(closure());
  for (const mutate of [
    value => { value.artifacts[0].sha256 = S('0'); },
    value => { value.artifacts[0].runpath = '/host/lib'; },
    value => { value.artifacts[0].resolvedLibraries = []; },
    value => { value.artifacts[0].machine = 'AArch64'; },
    value => value.artifacts.push({ ...value.artifacts[0], path: '/opt/extra.node' })
  ]) {
    const value = structuredClone(closure()); mutate(value);
    assert.throws(() => validateNativeClosure(value));
  }
});

test('native admission re-hashes every governed ELF byte from the stopped container', () => {
  const value = closure();
  const artifactBytes = Buffer.from('accepted-vexus');
  const libraryBytes = Buffer.from('accepted-libc');
  value.artifacts[0].sha256 = sha256Buffer(artifactBytes);
  value.artifacts[0].resolvedLibraries[0].sha256 = sha256Buffer(libraryBytes);
  // This test exercises the generic closure-byte verifier with a test artifact;
  // the production schema separately pins Vexus to EXPECTED_VEXUS_SHA256.
  value.artifacts[0].sha256 = EXPECTED_VEXUS_SHA256;
  const reads = new Map([
    [EXPECTED_VEXUS_PATH, artifactBytes],
    ['/lib/x86_64-linux-gnu/libc.so.6', libraryBytes]
  ]);
  expectCode(() => verifyNativeClosureBytes(value, source => reads.get(source)),
    'runtime_native_closure_file_mismatch');
  value.artifacts[0].sha256 = sha256Buffer(artifactBytes);
  expectCode(() => verifyNativeClosureBytes(value, source => reads.get(source)),
    'runtime_native_closure_invalid');
});

function authority() {
  const runtime = runtimeInspect(); const edge = edgeInspect(); const provider = providerInspect();
  const state = { containerPath: '/srv/codex-memory/r5c', readOnly: true,
    schemaVersion: STATE_MOUNT_SCHEMA, stateRootClass: 'external_primary_r5c' };
  return validateAuthorityRecord({
    acceptedImageConfigId: runtime.Image, acceptedOciArchiveSha256: S('5'),
    acceptedOciManifestDigest: S('6'), authoritySchemaVersion: AUTHORITY_SCHEMA,
    buildManifestDigest: S('7'), codexMemoryCommit: C('1'),
    containerConfigDigest: containerConfigDigest(runtime),
    edgeConfigDigest: containerConfigDigest(edge), edgeContainerId: edge.Id,
    edgeImageIdentity: edge.Image, edgeLifecycleAuthority: 'host_launcher',
    edgeRevision: C('1'),
    edgePolicyDigest: EDGE_POLICY_DIGEST, expectedRuntimeContainerId: runtime.Id,
    hostLauncherDigest: S('8'), hostLauncherVersion: 'codex-memory-native-host-launcher/v1',
    nativeClosureDigest: nativeClosureDigest(closure()), profilePath: SOURCES.profile,
    profileSchemaVersion: 7, profileSha256: S('9'),
    providerConfigDigest: containerConfigDigest(provider), providerContainerId: provider.Id,
    providerImageIdentity: provider.Image, providerPolicyDigest: PROVIDER_POLICY_DIGEST,
    providerRevision: C('3'), rootfsChainDigest: S('a'), runtimeMountSources: SOURCES,
    runtimePolicyDigest: RUNTIME_POLICY_DIGEST, stateMountContract: state,
    stateMountContractDigest: digest(state), vcpCommit: C('2')
  });
}
test('Provider receipt is boot, freshness, profile identity and root authority bound', () => {
  const a = authority();
  const receipt = { launchEpoch: 'boot-identity-0001',
    launcherAuthorityDigest: authorityRecordDigest(a), observedAt: 100,
    providerConfigDigest: a.providerConfigDigest, providerContainerId: a.providerContainerId,
    providerHealth: 'healthy', providerImageIdentity: a.providerImageIdentity,
    providerRevision: a.providerRevision, schemaVersion: PROVIDER_RECEIPT_SCHEMA };
  validateProviderReceipt(receipt, a, { now: 100, bootId: receipt.launchEpoch });
  for (const mutate of [value => { value.observedAt = 0; },
    value => { value.providerContainerId = I('0'); },
    value => { value.providerImageIdentity = S('0'); },
    value => { value.providerHealth = 'unhealthy'; },
    value => { value.launchEpoch = 'different-boot-000'; }]) {
    const changed = { ...receipt }; mutate(changed);
    assert.throws(() => validateProviderReceipt(changed, a, {
      now: 100_000, bootId: receipt.launchEpoch
    }));
  }
});

test('host lifecycle lock wrapper fails closed on contention and propagates success', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'host-lock-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const lockPath = path.join(root, 'lifecycle.lock');
  assert.equal(runUnderLifecycleLock(['start', '--authority=/etc/codex-memory/a.json'], {
    spawnFile: () => ({ status: 0 }), lockPath
  }), 0);
  expectCode(() => runUnderLifecycleLock(['stop', '--authority=/etc/codex-memory/a.json'], {
    spawnFile: () => ({ status: 75 }), lockPath
  }), 'host_launcher_lifecycle_lock_busy');
  expectCode(() => runUnderLifecycleLock(['activate', '--authority=/etc/codex-memory/a.json'], {
    spawnFile: () => ({ status: 1 }), lockPath
  }), 'host_launcher_locked_command_failed');
});

test('real flock serializes commands, survives stale path, and releases on holder crash', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'host-real-flock-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const lockPath = path.join(root, 'lifecycle.lock');
  const ready = path.join(root, 'ready');
  const holder = spawn('/usr/bin/flock', [
    '--exclusive', '--no-fork', lockPath, '/bin/sh', '-c',
    `printf ready > '${ready}'; exec sleep 30`
  ], { stdio: 'ignore' });
  t.after(() => { try { holder.kill('SIGKILL'); } catch {} });
  for (let attempt = 0; attempt < 100 && !fs.existsSync(ready); attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(fs.existsSync(ready), true);
  assert.notEqual(spawnSync('/usr/bin/flock', [
    '--exclusive', '--nonblock', lockPath, '/bin/true'
  ]).status, 0);
  holder.kill('SIGKILL');
  await new Promise(resolve => holder.once('close', resolve));
  assert.equal(fs.existsSync(lockPath), true);
  assert.equal(spawnSync('/usr/bin/flock', [
    '--exclusive', '--nonblock', lockPath, '/bin/true'
  ]).status, 0);
});

test('atomic OCI publication never exposes failed temporary output under final name', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-image-atomic-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const fixture = context([{ name: 'codex-memory/deploy/native-runtime/Dockerfile',
    content: 'FROM scratch\n' }, { name: 'vcptoolbox/package.json', content: '{}\n' }]);
  fs.mkdirSync(path.join(root, 'context'));
  fs.writeFileSync(path.join(root, 'context', 'runtime-context.tar'), fixture.buffer);
  const output = path.join(root, 'accepted.oci.tar');
  expectCode(() => buildRuntimeImage({ contextDirectory: path.join(root, 'context'),
    expectedContextArtifactSha256: sha256Buffer(fixture.buffer), outputArchive: output,
    spawnFile: (_command, args) => {
      const destination = args.find(value => value.startsWith('type=oci,dest='))
        .match(/dest=([^,]+)/u)[1];
      fs.writeFileSync(destination, 'partial');
      return { status: 1 };
    }, verifyArchive: () => { throw new Error('must_not_run'); } }),
  'runtime_image_build_failed');
  assert.equal(fs.existsSync(output), false);
  assert.deepEqual(fs.readdirSync(root).filter(name => name.includes('.tmp')), []);
  fs.writeFileSync(output, 'existing');
  expectCode(() => buildRuntimeImage({ contextDirectory: path.join(root, 'context'),
    expectedContextArtifactSha256: sha256Buffer(fixture.buffer), outputArchive: output }),
  'runtime_image_output_exists');
});

test('atomic OCI publication exposes only independently verified complete bytes', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-image-publish-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const fixture = context([{ name: 'codex-memory/deploy/native-runtime/Dockerfile',
    content: 'FROM scratch\n' }, { name: 'vcptoolbox/package.json', content: '{}\n' }]);
  const contextDirectory = path.join(root, 'context');
  fs.mkdirSync(contextDirectory);
  fs.writeFileSync(path.join(contextDirectory, 'runtime-context.tar'), fixture.buffer);
  const output = path.join(root, 'accepted.oci.tar');
  const complete = Buffer.from('complete-opaque-oci');
  const expected = sha256Buffer(complete);
  const evidence = buildRuntimeImage({ contextDirectory,
    expectedContextArtifactSha256: sha256Buffer(fixture.buffer), outputArchive: output,
    spawnFile: (_command, args) => {
      const destination = args.find(value => value.startsWith('type=oci,dest='))
        .match(/dest=([^,]+)/u)[1];
      fs.writeFileSync(destination, complete);
      return { status: 0 };
    },
    verifyArchive: archive => {
      assert.deepEqual(fs.readFileSync(archive), complete);
      return { archiveSha256: expected, accepted: true };
    }
  });
  assert.equal(evidence.archiveSha256, expected);
  assert.deepEqual(fs.readFileSync(output), complete);
  assert.deepEqual(fs.readdirSync(root).filter(name => name.includes('.tmp')), []);
});
