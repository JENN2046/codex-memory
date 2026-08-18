'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  containerConfigDigest
} = require('../src/runtime/native-image/runtime-authority');
const {
  EDGE_POLICY,
  EDGE_RUNTIME_GID,
  EDGE_RUNTIME_UID,
  EDGE_SECRET_DIRECTORY_MODE,
  EDGE_SECRET_FILE_MODE,
  validateEdgeCandidate,
  validateEdgeSecretMountAuthority
} = require('../src/runtime/native-image/container-policy');

const SOURCE = '/etc/codex-memory/edge-secret';
const SECRET_NAMES = Object.freeze([
  'edge-private.pem', 'edge-public.pem', 'relay-token', 'relay-public.pem'
]);

function stat({ directory = false, gid = 0, mode = 0o755, size = 0, symlink = false,
  uid = 0 } = {}) {
  return { gid, mode, size, uid,
    isDirectory: () => directory,
    isFile: () => !directory && !symlink,
    isSymbolicLink: () => symlink };
}

function secretFs(mutation = {}) {
  const contents = Object.fromEntries(SECRET_NAMES.map(name =>
    [path.join(SOURCE, name), Buffer.from(`synthetic-${name}`)]));
  const entries = mutation.entries || SECRET_NAMES;
  return {
    lstatSync(target) {
      if (target === '/') return mutation.filesystemRoot || stat({ directory: true });
      if (target === '/etc' || target === '/etc/codex-memory') {
        return mutation.parent || stat({ directory: true });
      }
      if (target === SOURCE) return mutation.root || stat({ directory: true,
        gid: EDGE_RUNTIME_GID, mode: EDGE_SECRET_DIRECTORY_MODE });
      if (contents[target]) return stat({ gid: EDGE_RUNTIME_GID,
        mode: EDGE_SECRET_FILE_MODE, size: contents[target].length,
        ...(mutation.file || {}) });
      throw Object.assign(new Error('not found'), { code: 'ENOENT' });
    },
    readFileSync(target) {
      const bytes = contents[target];
      if (!bytes) throw Object.assign(new Error('not found'), { code: 'ENOENT' });
      return mutation.bytes || bytes;
    },
    readdirSync: () => [...entries],
    realpathSync(target) {
      if (mutation.realpath?.[target]) return mutation.realpath[target];
      return target;
    }
  };
}

function edgeInspect() {
  const env = {
    ...EDGE_POLICY.imageEnvironment,
    CODEX_MEMORY_R4_AUTH0_ISSUER: 'https://tenant.invalid/',
    CODEX_MEMORY_R4_AUTH0_JWKS_URI: 'https://tenant.invalid/.well-known/jwks.json',
    CODEX_MEMORY_R4_BINDING_DIGEST: `sha256:${'1'.repeat(64)}`,
    CODEX_MEMORY_R4_BINDING_REFERENCE: 'binding:r4:accepted',
    CODEX_MEMORY_R4_EDGE_ARTIFACT_SHA256: `sha256:${'2'.repeat(64)}`,
    CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID: 'edge-key-v1',
    CODEX_MEMORY_R4_EDGE_SIGNING_PRIVATE_KEY:
      'file:/run/secrets/codex-memory-r4/edge-private.pem',
    CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY:
      'file:/run/secrets/codex-memory-r4/edge-public.pem',
    CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE: 'host:private-development',
    CODEX_MEMORY_R4_LOCKFILE_SHA256: `sha256:${'3'.repeat(64)}`,
    CODEX_MEMORY_R4_OAUTH_CLIENT_ID: 'oauth-client-v1',
    CODEX_MEMORY_R4_OPERATOR_REFERENCE: 'operator:jenn-owner',
    CODEX_MEMORY_R4_OPERATOR_SUBJECT_FINGERPRINT: 'sha256:operator-fingerprint',
    CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE: 'binding:r4:previous',
    CODEX_MEMORY_R4_PUBLIC_ORIGIN: 'https://memory.invalid',
    CODEX_MEMORY_R4_RELAY_AUTH_TOKEN:
      'file:/run/secrets/codex-memory-r4/relay-token',
    CODEX_MEMORY_R4_RELAY_SIGNING_KEY_ID: 'relay-key-v1',
    CODEX_MEMORY_R4_RELAY_SIGNING_PUBLIC_KEY:
      'file:/run/secrets/codex-memory-r4/relay-public.pem',
    CODEX_MEMORY_R4_SOURCE_COMMIT: '1234567890abcdef1234567890abcdef12345678'
  };
  return {
    Config: { Cmd: [], Entrypoint: [...EDGE_POLICY.entrypoint],
      Env: Object.entries(env).map(([name, value]) => `${name}=${value}`),
      Healthcheck: structuredClone(EDGE_POLICY.healthcheck), Labels: {},
      User: `${EDGE_RUNTIME_UID}:${EDGE_RUNTIME_GID}`,
      WorkingDir: EDGE_POLICY.workingDirectory },
    HostConfig: { CapAdd: [], CapDrop: ['ALL'], CgroupnsMode: '', Devices: [],
      DeviceRequests: [], IpcMode: 'private', LogConfig: { Type: 'none' },
      NetworkMode: 'bridge', PidMode: '', PortBindings: {
        '8080/tcp': [{ HostIp: '127.0.0.1', HostPort: '18080' }]
      }, Privileged: false, ReadonlyRootfs: true, RestartPolicy: { Name: 'no' },
      SecurityOpt: ['no-new-privileges:true'], Tmpfs: {}, UsernsMode: '', UTSMode: '' },
    Id: 'a'.repeat(64), Image: `sha256:${'4'.repeat(64)}`,
    Mounts: [{ Destination: '/run/secrets/codex-memory-r4', Propagation: 'rprivate',
      RW: false, Source: SOURCE, Type: 'bind' }], State: { Running: false }
  };
}

function rejection(fn) {
  assert.throws(fn, error => typeof error?.code === 'string');
}

test('root-controlled group-readable Edge secret authority is admitted', () => {
  const inspect = edgeInspect();
  assert.doesNotThrow(() => validateEdgeCandidate(inspect));
  const result = validateEdgeSecretMountAuthority(inspect, { fsModule: secretFs() });
  assert.deepEqual({ directoryUid: result.directoryUid, directoryGid: result.directoryGid,
    directoryMode: result.directoryMode, fileUid: result.fileUid,
    fileGid: result.fileGid, fileMode: result.fileMode }, {
    directoryUid: 0, directoryGid: 1000, directoryMode: 0o750,
    fileUid: 0, fileGid: 1000, fileMode: 0o440
  });
});

test('supplementary groups are policy-rejected and container-config bound', () => {
  const accepted = edgeInspect();
  const elevated = structuredClone(accepted);
  elevated.HostConfig.GroupAdd = ['0'];
  assert.notEqual(containerConfigDigest(elevated), containerConfigDigest(accepted));
  rejection(() => validateEdgeCandidate(elevated));
});

test('Edge secret ownership adversarial matrix rejects every unsafe candidate', () => {
  const hostCases = [
    { name: 'root-root-0600', fs: secretFs({ file: { gid: 0, mode: 0o600 } }) },
    { name: 'user-owned', fs: secretFs({ file: { uid: 1000 } }) },
    { name: 'world-readable', fs: secretFs({ file: { mode: 0o444 } }) },
    { name: 'group-writable', fs: secretFs({ file: { mode: 0o460 } }) },
    { name: 'wrong-gid', fs: secretFs({ file: { gid: 2000 } }) },
    { name: 'symlink-root', fs: secretFs({ root: stat({ gid: 1000, mode: 0o750,
      symlink: true }) }) },
    { name: 'symlink-file', fs: secretFs({ file: { symlink: true } }) },
    { name: 'extra-file', fs: secretFs({ entries: [...SECRET_NAMES, 'unexpected'] }) }
  ];
  for (const candidate of hostCases) {
    rejection(() => validateEdgeSecretMountAuthority(edgeInspect(), {
      fsModule: candidate.fs
    }), candidate.name);
  }

  const containerCases = [
    value => { value.Config.User = '1001:1000'; },
    value => { value.HostConfig.GroupAdd = ['0']; },
    value => { value.HostConfig.UsernsMode = 'private'; },
    value => { value.Mounts[0].RW = true; },
    value => { value.Mounts[0].Source = '/var/lib/codex-memory/edge-secret'; },
    value => { value.Config.Env.push('NODE_OPTIONS=--require=/tmp/evil.js'); },
    value => { value.Config.Entrypoint = ['node', '/tmp/evil.js']; },
    value => { value.Config.Cmd = ['/tmp/evil.js']; },
    value => { const index = value.Config.Env.findIndex(entry =>
      entry.startsWith('CODEX_MEMORY_R4_RELAY_AUTH_TOKEN='));
    value.Config.Env[index] = 'CODEX_MEMORY_R4_RELAY_AUTH_TOKEN=file:/run/secrets/codex-memory-r4/../escape'; },
    value => { const index = value.Config.Env.findIndex(entry =>
      entry.startsWith('CODEX_MEMORY_R4_RELAY_AUTH_TOKEN='));
    value.Config.Env[index] = 'CODEX_MEMORY_R4_RELAY_AUTH_TOKEN=file:/run/secrets/codex-memory-r4/edge-public.pem'; }
  ];
  for (const mutate of containerCases) {
    const inspect = edgeInspect();
    mutate(inspect);
    rejection(() => {
      validateEdgeCandidate(inspect);
      validateEdgeSecretMountAuthority(inspect, { fsModule: secretFs() });
    });
  }
  assert.equal(hostCases.length + containerCases.length, 18);
});
