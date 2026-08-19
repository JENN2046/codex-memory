'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  VCP_PROVIDER_HOST_ENVIRONMENT_PATH,
  VCP_PROVIDER_RUNTIME_ENVIRONMENT_PATH,
  parseVcpProviderEnvironment,
  vcpProviderConfigDigest
} = require('../src/runtime/native-image/runtime-authority');
const {
  assertRootControlledRuntimeReadableProviderEnvironment,
  readVcpProviderEnvironmentSnapshot,
  vcpProviderConfigDigest: stackVcpProviderConfigDigest
} = require('../scripts/codex-memory-stack');
const {
  validateProviderEnvironmentMountSource
} = require('../deploy/native-runtime/host-launcher');
const {
  validateProviderEnvironmentAuthorityBinding
} = require('../scripts/create-codex-memory-runtime-authority');

const VALID_ENVIRONMENT =
  'API_Key=synthetic-provider-key\n' +
  'WhitelistEmbeddingModel=synthetic-embedding-model\n' +
  'VECTORDB_DIMENSION=1024\n';

function expectCode(fn, code) {
  assert.throws(fn, error => error?.code === code || error?.message === code);
}

function syntheticStat({
  directory = false,
  gid = 0,
  ino = 10,
  mode = directory ? 0o755 : 0o440,
  size = 1,
  symlink = false,
  uid = 0
} = {}) {
  return {
    ctimeMs: 2,
    ctimeNs: 2_000_000n,
    dev: 1,
    gid,
    ino,
    isDirectory: () => directory,
    isFile: () => !directory && !symlink,
    isSymbolicLink: () => symlink,
    mode,
    mtimeMs: 1,
    mtimeNs: 1_000_000n,
    size,
    uid
  };
}

function providerEnvironmentFilesystem({
  content = VALID_ENVIRONMENT,
  gid = 1000,
  mode = 0o440,
  mutateAfterRead = false,
  runtime = false,
  symlink = false,
  uid = 0
} = {}) {
  const bytes = Buffer.from(content);
  const source = runtime
    ? VCP_PROVIDER_RUNTIME_ENVIRONMENT_PATH
    : VCP_PROVIDER_HOST_ENVIRONMENT_PATH;
  const directories = new Set(runtime
    ? ['/', '/run', '/run/secrets']
    : ['/', '/etc', '/etc/codex-memory']);
  const fileStat = syntheticStat({ gid, ino: 20, mode, size: bytes.length, symlink, uid });
  let fstatCalls = 0;
  let openedFlags = null;
  return {
    closeSync() {},
    fstatSync() {
      fstatCalls += 1;
      if (mutateAfterRead && fstatCalls > 1) {
        return syntheticStat({ gid, ino: 21, mode, size: bytes.length, uid });
      }
      return fileStat;
    },
    get openedFlags() { return openedFlags; },
    lstatSync(target) {
      if (directories.has(target)) return syntheticStat({ directory: true, ino: target.length });
      if (target === source) return fileStat;
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    },
    openSync(target, flags) {
      if (target !== source) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      openedFlags = flags;
      return 42;
    },
    readFileSync(descriptor, encoding) {
      if (descriptor !== 42) throw Object.assign(new Error('EBADF'), { code: 'EBADF' });
      return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
    },
    realpathSync(target) {
      if (target !== source) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return symlink ? `${source}.target` : source;
    },
    statSync(target) {
      if (target !== source) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return fileStat;
    }
  };
}

test('AV-1 canonical Host, creation and Runtime contracts share semantic admission', () => {
  const parsed = parseVcpProviderEnvironment(VALID_ENVIRONMENT);
  const expectedDigest = vcpProviderConfigDigest(parsed);
  const hostFs = providerEnvironmentFilesystem();
  const host = validateProviderEnvironmentMountSource(
    VCP_PROVIDER_HOST_ENVIRONMENT_PATH,
    { fsModule: hostFs }
  );
  assert.equal(host.configDigest, expectedDigest);
  assert.equal(host.runtimeCanRead, true);
  assert.equal(host.runtimeCanWrite, false);
  assert.equal(host.replaceableByRuntime, false);
  assert.notEqual(hostFs.openedFlags & (fs.constants.O_NOFOLLOW || 0), 0);
  assert.deepEqual(validateProviderEnvironmentAuthorityBinding(
    VCP_PROVIDER_HOST_ENVIRONMENT_PATH,
    { vcpProviderConfigDigest: expectedDigest },
    { fsModule: providerEnvironmentFilesystem() }
  ), {
    configDigest: expectedDigest,
    path: VCP_PROVIDER_HOST_ENVIRONMENT_PATH,
    runtimeCanRead: true,
    runtimeCanWrite: false
  });

  const runtime = assertRootControlledRuntimeReadableProviderEnvironment(
    VCP_PROVIDER_RUNTIME_ENVIRONMENT_PATH,
    { fsModule: providerEnvironmentFilesystem({ runtime: true }) }
  );
  assert.equal(runtime.runtimeCanRead, true);
  assert.equal(runtime.runtimeCanWrite, false);
  assert.equal(runtime.replaceableByRuntime, false);
  assert.equal(vcpProviderConfigDigest(runtime.providerEnvironment), expectedDigest);
});

test('AV-2 through AV-8 reject wrong owner, mode, group, symlink and path', () => {
  const cases = [
    { uid: 1000, gid: 1000, mode: 0o600 },
    { uid: 0, gid: 0, mode: 0o400 },
    { uid: 0, gid: 1000, mode: 0o444 },
    { uid: 0, gid: 1000, mode: 0o460 },
    { uid: 0, gid: 1234, mode: 0o440 },
    { uid: 0, gid: 1000, mode: 0o440, symlink: true }
  ];
  for (const fixture of cases) {
    expectCode(() => validateProviderEnvironmentMountSource(
      VCP_PROVIDER_HOST_ENVIRONMENT_PATH,
      { fsModule: providerEnvironmentFilesystem(fixture) }
    ), 'host_launcher_provider_environment_security_invalid');
  }
  for (const source of [
    '/etc/codex-memory/other.env',
    '/var/lib/codex-memory/provider.env'
  ]) {
    expectCode(() => validateProviderEnvironmentMountSource(source, {
      fsModule: providerEnvironmentFilesystem()
    }), 'host_launcher_provider_environment_path_invalid');
  }
});

test('AV-9 semantic digest mismatch fails authority creation before output', () => {
  const evidence = validateProviderEnvironmentMountSource(
    VCP_PROVIDER_HOST_ENVIRONMENT_PATH,
    { fsModule: providerEnvironmentFilesystem() }
  );
  expectCode(() => validateProviderEnvironmentAuthorityBinding(
    VCP_PROVIDER_HOST_ENVIRONMENT_PATH,
    { vcpProviderConfigDigest: `sha256:${'0'.repeat(64)}` },
    { validator: () => evidence }
  ), 'runtime_authority_provider_environment_digest_mismatch');
});

test('AV-10 malformed provider environment rejects without secret disclosure', () => {
  const secret = 'synthetic-secret-never-output';
  const malformed =
    `API_Key=${secret}\n` +
    'WhitelistEmbeddingModel=bad model\n' +
    'VECTORDB_DIMENSION=0\n';
  let observed;
  try {
    validateProviderEnvironmentMountSource(VCP_PROVIDER_HOST_ENVIRONMENT_PATH, {
      fsModule: providerEnvironmentFilesystem({ content: malformed })
    });
  } catch (error) {
    observed = error;
  }
  assert.equal(observed?.code, 'host_launcher_provider_environment_semantic_invalid');
  assert.equal(String(observed).includes(secret), false);
  assert.equal(JSON.stringify(observed).includes(secret), false);
});

test('AV-11 shared digest is byte-for-byte compatible with the previous canonical formula', () => {
  const parsed = parseVcpProviderEnvironment(VALID_ENVIRONMENT);
  const previous = `sha256:${crypto.createHash('sha256').update(
    `model\0${parsed.model}\ndimension\0${parsed.dimension}\n`,
    'utf8'
  ).digest('hex')}`;
  assert.equal(vcpProviderConfigDigest(parsed), previous);
  assert.equal(stackVcpProviderConfigDigest(parsed), previous);
});

test('AV-12 Runtime mounted view rejects mutation during read', () => {
  expectCode(() => assertRootControlledRuntimeReadableProviderEnvironment(
    VCP_PROVIDER_RUNTIME_ENVIRONMENT_PATH,
    { fsModule: providerEnvironmentFilesystem({ mutateAfterRead: true, runtime: true }) }
  ), 'stack_runtime_provider_environment_identity_changed');
  expectCode(() => validateProviderEnvironmentMountSource(
    VCP_PROVIDER_HOST_ENVIRONMENT_PATH,
    { fsModule: providerEnvironmentFilesystem({ mutateAfterRead: true }) }
  ), 'host_launcher_provider_environment_identity_changed');
});

test('AV-13 legacy user-owned config remains owner-only', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-env-legacy-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.chmodSync(root, 0o700);
  const file = path.join(root, 'config.env');
  fs.writeFileSync(file, VALID_ENVIRONMENT, { mode: 0o600 });
  assert.equal(
    readVcpProviderEnvironmentSnapshot(file).providerEnvironment.model,
    'synthetic-embedding-model'
  );

  const rootOwnedFs = providerEnvironmentFilesystem({ gid: 1000, mode: 0o440, uid: 0 });
  const legacyPath = '/synthetic/config.env';
  const mapped = {
    ...rootOwnedFs,
    lstatSync: target => target === legacyPath
      ? syntheticStat({ gid: 1000, ino: 20, mode: 0o440, size: VALID_ENVIRONMENT.length, uid: 0 })
      : rootOwnedFs.lstatSync(target),
    realpathSync: target => target === legacyPath ? legacyPath : rootOwnedFs.realpathSync(target),
    statSync: target => target === legacyPath
      ? syntheticStat({ gid: 1000, ino: 20, mode: 0o440, size: VALID_ENVIRONMENT.length, uid: 0 })
      : rootOwnedFs.statSync(target)
  };
  expectCode(() => readVcpProviderEnvironmentSnapshot(legacyPath, { fsModule: mapped }),
    'stack_owner_file_security_invalid');
});
