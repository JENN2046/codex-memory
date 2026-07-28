'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  CONTROLLER_CHANGE_PATHS,
  PROFILE_KEYS,
  acquireOwnerLock,
  adoptionSourceCompatible,
  assertPrivateRootBoundary,
  assertRelativeReference,
  buildHttpChildEnvironment,
  buildShimChildEnvironment,
  childBaseEnvironment,
  commandMatchesComponent,
  computeRuntimeAccepted,
  computeStackAccepted,
  deriveRuntimeRepositoryFromHttpIdentity,
  discoverPrivateRoot,
  exactKeys,
  extractEnvFileArgument,
  finalizeManagedSpawn,
  inspectEdgeContainer,
  inspectProviderContainer,
  inspectSourceCompatibility,
  isPidRunning,
  loadManagedEnvironmentFile,
  lowDisclosureGovernanceProjection,
  lowDisclosureRelayProjection,
  parsePid,
  prepareStaleOwnerSocket,
  privateReferencePath,
  profileEdgeIdentityMatches,
  profileProviderIdentityMatches,
  projectHttpHealthPayload,
  safeCode,
  validateExpectedMappingEnvironment,
  validateRetainedBindingPayload,
  validateProfile
} = require('../scripts/codex-memory-stack');

const BASELINE = '3a0ca59fe2c0f3721d46513d7d6593cbe55b1118';
const RETAINED_BINDING_SOURCE = 'f1dea016a7a167898d77be6575403e7a7d28c8d5';
const EDGE_CONTAINER_ID = 'ab'.repeat(32);
const PROVIDER_CONTAINER_ID = 'cd'.repeat(32);
const PROVIDER_IMAGE_ID = `sha256:${'ef'.repeat(32)}`;
const PROVIDER_REVISION = '1234567890abcdef1234567890abcdef12345678';

function profile(overrides = {}) {
  return {
    schemaVersion: 4,
    runtimeBaseline: BASELINE,
    runtimeRepository: '/repo',
    retainedBindingSource: RETAINED_BINDING_SOURCE,
    privateRoot: '/synthetic/owner-only',
    providerContainer: 'new-api-wsl',
    providerContainerId: PROVIDER_CONTAINER_ID,
    providerImageId: PROVIDER_IMAGE_ID,
    providerRevision: PROVIDER_REVISION,
    governanceEnvironment: 'governance/runtime.env',
    relayEnvironment: 'relay/runtime.env',
    retainedBinding: 'r5m-exact-head/private-binding.json',
    edgeContainer: 'codex-memory-full-stack-001-edge',
    edgeContainerId: EDGE_CONTAINER_ID,
    ...overrides
  };
}

function retainedBinding(overrides = {}) {
  return {
    sourceCommit: RETAINED_BINDING_SOURCE,
    governanceBindingFinalized: true,
    defaultClosed: true,
    primaryMemoryWriteEnabled: false,
    publicWriteSurfaceEnabled: false,
    formalIsolatedShimTargetRequired: true,
    temporaryEndpointOverrideAllowed: false,
    ...overrides
  };
}

function acceptedStack(overrides = {}) {
  return {
    profile: profile(),
    source: { compatible: true },
    processes: {
      shim: { managed: true },
      http: { managed: true },
      governance: { managed: true },
      relay: { managed: true }
    },
    provider: {
      reachable: true,
      running: true,
      recognized: true,
      hostLoopbackOnly: true,
      id: PROVIDER_CONTAINER_ID,
      imageId: PROVIDER_IMAGE_ID,
      revision: PROVIDER_REVISION
    },
    shimPort: true,
    httpHealth: {
      reachable: true,
      ok: true,
      authRequired: true,
      policyAccepted: true
    },
    governance: { reachable: true },
    relay: { reachable: true },
    edge: {
      id: EDGE_CONTAINER_ID,
      revision: BASELINE,
      running: true,
      healthy: true,
      secure: true
    },
    retainedBindingMatch: true,
    ...overrides
  };
}

test('profile contract is exact and stores references rather than secret values', () => {
  assert.deepEqual(Object.keys(validateProfile(profile())).sort(), [...PROFILE_KEYS].sort());
  assert.throws(
    () => validateProfile({ ...profile(), token: 'must-not-be-stored' }),
    { code: 'stack_profile_invalid' }
  );
  assert.throws(
    () => validateProfile(profile({ governanceEnvironment: '../secret.env' })),
    { code: 'stack_profile_reference_invalid' }
  );
  assert.throws(
    () => validateProfile(profile({ runtimeBaseline: 'main' })),
    { code: 'stack_profile_invalid' }
  );
  assert.throws(
    () => validateProfile(profile({ runtimeRepository: 'relative/repo' })),
    { code: 'stack_profile_invalid' }
  );
  assert.throws(
    () => validateProfile(profile({ providerContainer: 'unrelated-provider' })),
    { code: 'stack_profile_invalid' }
  );
});

test('relative profile references reject traversal, absolutes, and normalization aliases', () => {
  assert.equal(assertRelativeReference('relay/runtime.env'), 'relay/runtime.env');
  for (const candidate of [
    '',
    '/private/runtime.env',
    '../runtime.env',
    'relay/../../runtime.env',
    `relay${String.fromCharCode(0)}runtime.env`
  ]) {
    assert.throws(
      () => assertRelativeReference(candidate),
      { code: 'stack_profile_reference_invalid' }
    );
  }
});

test('runtime file references must use absolute file targets', () => {
  assert.throws(
    () => privateReferencePath('file:relative/private.json', '/owner'),
    { code: 'stack_private_reference_invalid' }
  );
  assert.throws(
    () => privateReferencePath('env:PRIVATE_VALUE', '/owner'),
    { code: 'stack_private_reference_invalid' }
  );
});

test('private-root discovery fails closed when references leave the owner data boundary', () => {
  assert.throws(
    () => discoverPrivateRoot(['/outside/governance.env'], {
      environment: {
        XDG_DATA_HOME: '/synthetic/data'
      },
      fsModule: {
        lstatSync() {
          return {
            isSymbolicLink: () => false
          };
        },
        realpathSync(value) {
          return value;
        },
        statSync() {
          return {
            isFile: () => true,
            uid: process.getuid(),
            mode: 0o100600,
            size: 32
          };
        }
      }
    }),
    { code: 'stack_private_root_discovery_outside_boundary' }
  );
});

test('profile private root must remain below the canonical owner data boundary', () => {
  const fsModule = {
    realpathSync(value) {
      return value;
    }
  };
  assert.equal(
    assertPrivateRootBoundary('/synthetic/data/codex-memory/r4-owner', {
      environment: { XDG_DATA_HOME: '/synthetic/data' },
      fsModule
    }),
    '/synthetic/data/codex-memory/r4-owner'
  );
  assert.throws(
    () => assertPrivateRootBoundary('/synthetic/state-private', {
      environment: { XDG_DATA_HOME: '/synthetic/data' },
      fsModule
    }),
    { code: 'stack_private_root_outside_boundary' }
  );
});

test('PID liveness treats a successful kill zero probe as alive', () => {
  let observed = null;
  assert.equal(isPidRunning(4321, (pid, signal) => {
    observed = { pid, signal };
    return undefined;
  }), true);
  assert.deepEqual(observed, { pid: 4321, signal: 0 });
  assert.equal(isPidRunning(4321, () => {
    const error = new Error('missing');
    error.code = 'ESRCH';
    throw error;
  }), false);
  assert.equal(isPidRunning(1, () => {
    throw new Error('must not run');
  }), false);
});

test('PID and env-file parsing fail closed', () => {
  assert.equal(parsePid('1234\n'), 1234);
  assert.equal(parsePid('0'), null);
  assert.equal(parsePid('12x'), null);
  assert.equal(
    extractEnvFileArgument(['node', '--env-file=/owner/governance.env', 'runner.js']),
    '/owner/governance.env'
  );
  assert.equal(
    extractEnvFileArgument(['node', '--env-file', '/owner/relay.env', 'runner.js']),
    '/owner/relay.env'
  );
  assert.equal(
    extractEnvFileArgument([
      'node',
      '/repo/scripts/codex-memory-stack.js',
      '_run-relay',
      '--stack-environment=/owner/relay.env'
    ]),
    '/owner/relay.env'
  );
  assert.throws(
    () => extractEnvFileArgument(['node', '--env-file=relative.env', 'runner.js']),
    { code: 'stack_process_env_file_invalid' }
  );
  assert.throws(
    () => extractEnvFileArgument(['node', 'runner.js']),
    { code: 'stack_process_env_file_missing' }
  );
});

test('lifecycle lock excludes a live owner and releases by exact inode', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-stack-lock-'));
  fs.chmodSync(root, 0o700);
  const file = path.join(root, 'lifecycle.lock');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const first = acquireOwnerLock(file, {
    kill(pid, signal) {
      assert.equal(pid, process.pid);
      assert.equal(signal, 0);
    }
  });
  assert.throws(
    () => acquireOwnerLock(file, {
      kill(pid, signal) {
        assert.equal(pid, process.pid);
        assert.equal(signal, 0);
      }
    }),
    { code: 'stack_lifecycle_busy' }
  );
  assert.equal(first.release(), true);
  assert.equal(first.release(), false);
  assert.equal(fs.existsSync(file), false);
});

test('lifecycle lock recovers only a well-formed dead-owner lock', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-stack-lock-'));
  fs.chmodSync(root, 0o700);
  const file = path.join(root, 'lifecycle.lock');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.writeFileSync(file, '999999999\n', { mode: 0o600 });
  const recovered = acquireOwnerLock(file, {
    kill() {
      const error = new Error('missing');
      error.code = 'ESRCH';
      throw error;
    }
  });
  assert.equal(recovered.release(), true);

  fs.writeFileSync(file, 'not-a-pid\n', { mode: 0o600 });
  assert.throws(
    () => acquireOwnerLock(file, {
      kill() {
        throw new Error('must not probe malformed owner identity');
      }
    }),
    { code: 'stack_lifecycle_lock_invalid' }
  );
  assert.equal(fs.readFileSync(file, 'utf8'), 'not-a-pid\n');
});

test('managed spawn persists PID before unref and terminates its process group on failure', () => {
  let written = null;
  let unreferenced = false;
  const child = {
    pid: 4321,
    exitCode: null,
    signalCode: null,
    unref() {
      unreferenced = true;
    }
  };
  assert.equal(finalizeManagedSpawn(child, '/owner/component.pid', {
    writePid(file, pid) {
      written = { file, pid };
    }
  }), true);
  assert.deepEqual(written, {
    file: '/owner/component.pid',
    pid: 4321
  });
  assert.equal(unreferenced, true);

  unreferenced = false;
  let signal = null;
  assert.throws(
    () => finalizeManagedSpawn(child, '/owner/component.pid', {
      writePid() {
        throw new Error('synthetic write failure');
      },
      kill(pid, sentSignal) {
        signal = { pid, sentSignal };
      }
    }),
    { code: 'stack_pid_file_write_failed' }
  );
  assert.deepEqual(signal, { pid: -4321, sentSignal: 'SIGTERM' });
  assert.equal(unreferenced, false);

  assert.throws(
    () => finalizeManagedSpawn({
      ...child,
      kill() {
        return false;
      }
    }, '/owner/component.pid', {
      writePid() {
        throw new Error('synthetic write failure');
      },
      kill() {
        const error = new Error('not permitted');
        error.code = 'EPERM';
        throw error;
      }
    }),
    { code: 'stack_pid_file_cleanup_failed' }
  );
});

test('governance stale-socket cleanup rejects active sockets and never unlinks them', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-stack-socket-'));
  fs.chmodSync(root, 0o700);
  const socketPath = path.join(root, 'governance.sock');
  const server = net.createServer(socket => socket.destroy());
  t.after(async () => {
    await new Promise(resolve => server.close(() => resolve()));
    fs.rmSync(root, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, resolve);
  });
  fs.chmodSync(socketPath, 0o600);
  await assert.rejects(
    prepareStaleOwnerSocket(socketPath, root),
    { code: 'stack_governance_socket_active' }
  );
  assert.equal(fs.lstatSync(socketPath).isSocket(), true);
});

test('governance stale-socket cleanup unlinks only a stable owner socket identity', async () => {
  const socketPath = '/owner/run/governance.sock';
  const socketStat = {
    isSocket: () => true,
    isSymbolicLink: () => false,
    uid: process.getuid(),
    mode: 0o140600,
    dev: 7,
    ino: 11
  };
  let unlinked = null;
  const cleaned = await prepareStaleOwnerSocket(socketPath, '/owner', {
    fsModule: {
      realpathSync(value) {
        return value;
      },
      statSync() {
        return {
          isDirectory: () => true,
          uid: process.getuid(),
          mode: 0o40700
        };
      },
      lstatSync() {
        return socketStat;
      },
      unlinkSync(value) {
        unlinked = value;
      }
    },
    probeSocket: async () => 'stale'
  });
  assert.equal(cleaned, true);
  assert.equal(unlinked, socketPath);
});

test('managed command matching binds exact executable, script, mode, and environment', () => {
  const executable = fs.realpathSync(process.execPath);
  const environment = { XDG_RUNTIME_DIR: '/runtime' };
  const options = {
    executable,
    cwd: '/repo',
    profile: profile(),
    environment
  };
  const governanceEnvironment =
    '/synthetic/owner-only/governance/runtime.env';
  const legacy = [
    'node',
    `--env-file=${governanceEnvironment}`,
    '/runtime/codex-memory-full-stack-001/governance-runner.js'
  ];
  assert.equal(
    commandMatchesComponent('governance', legacy, options),
    true
  );
  assert.equal(commandMatchesComponent('governance', [
    process.execPath,
    '/repo/scripts/codex-memory-stack.js',
    '_run-governance',
    `--stack-environment=${governanceEnvironment}`
  ], options), true);
  assert.equal(commandMatchesComponent('governance', [
    'node',
    `--env-file=${governanceEnvironment}`,
    '/other/governance-runner.js'
  ], options), false);
  assert.equal(commandMatchesComponent('governance', [
    process.execPath,
    '/repo/scripts/codex-memory-stack.js',
    '_run-governance',
    '--stack-environment=/other/runtime.env'
  ], options), false);
  assert.equal(commandMatchesComponent('governance', legacy, {
    ...options,
    executable: '/other/node'
  }), false);
  assert.equal(commandMatchesComponent('governance', [
    'node',
    '/other/unrelated.js',
    'text-with-_run-governance-inside'
  ], options), false);
  assert.equal(commandMatchesComponent('http', [
    'node',
    'src/http-index.js'
  ], options), true);
  assert.equal(commandMatchesComponent('shim', [
    'node',
    '/repo/src/cli/vcp-toolbox-native-mcp-shim.js',
    '--host',
    '127.0.0.1',
    '--port',
    '7615',
    '--vcp-root',
    '/runtime/VCPToolBox',
    '--kb-store',
    '/runtime/codex-memory-full-stack-001/store'
  ], options), true);
  assert.equal(commandMatchesComponent('shim', [
    'node',
    '/repo/src/cli/vcp-toolbox-native-mcp-shim.js',
    '--host',
    '127.0.0.1',
    '--port',
    '7616',
    '--vcp-root',
    '/runtime/VCPToolBox',
    '--kb-store',
    '/runtime/codex-memory-full-stack-001/store'
  ], options), false);
  const relayEnvironment = '/synthetic/owner-only/relay/runtime.env';
  assert.equal(commandMatchesComponent('relay', [
    'node',
    `--env-file=${relayEnvironment}`,
    '/runtime/codex-memory-full-stack-001/relay-runner.js'
  ], options), true);
  assert.equal(commandMatchesComponent('relay', [
    process.execPath,
    '/repo/scripts/codex-memory-stack.js',
    '_run-relay',
    `--stack-environment=${relayEnvironment}`
  ], options), true);
});

test('runtime repository adoption accepts legacy and safe managed HTTP commands', () => {
  const executable = fs.realpathSync(process.execPath);
  const fsModule = {
    realpathSync(value) {
      if (value === process.execPath || value === executable) return executable;
      return value;
    },
    statSync(value) {
      if (value === '/repo') {
        return {
          isDirectory: () => true,
          uid: process.getuid(),
          mode: 0o40755
        };
      }
      return {
        isFile: () => true,
        uid: process.getuid(),
        mode: 0o100755
      };
    }
  };
  const identity = command => ({
    executable,
    cwd: '/repo',
    command
  });
  assert.equal(
    deriveRuntimeRepositoryFromHttpIdentity(identity([
      process.execPath,
      '/repo/src/http-index.js'
    ]), { fsModule }),
    '/repo'
  );
  assert.equal(
    deriveRuntimeRepositoryFromHttpIdentity(identity([
      process.execPath,
      '--env-file=/owner/governance.env',
      '/repo/scripts/codex-memory-stack.js',
      '_run-http'
    ]), { fsModule }),
    '/repo'
  );
  assert.equal(
    deriveRuntimeRepositoryFromHttpIdentity(identity([
      process.execPath,
      '/repo/scripts/codex-memory-stack.js',
      '_run-http',
      '--stack-environment=/owner/governance.env'
    ]), { fsModule }),
    '/repo'
  );
  assert.throws(
    () => deriveRuntimeRepositoryFromHttpIdentity(identity([
      process.execPath,
      '/repo/scripts/codex-memory-stack.js',
      '_run-http',
      '--stack-environment=relative.env'
    ]), { fsModule }),
    { code: 'stack_process_env_file_invalid' }
  );
});

test('managed environment files reject Node and non-governed startup keys', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-stack-env-'));
  fs.chmodSync(root, 0o700);
  const file = path.join(root, 'runtime.env');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.writeFileSync(
    file,
    'CODEX_MEMORY_R4_COUNTER_MODE=r4_session_scoped_live_read_v1\n',
    { mode: 0o600 }
  );
  assert.deepEqual(loadManagedEnvironmentFile(file), {
    CODEX_MEMORY_R4_COUNTER_MODE: 'r4_session_scoped_live_read_v1'
  });

  fs.writeFileSync(
    file,
    'CODEX_MEMORY_R4_COUNTER_MODE=r4_session_scoped_live_read_v1\n' +
      'NODE_OPTIONS=--require=/untrusted.js\n',
    { mode: 0o600 }
  );
  assert.throws(
    () => loadManagedEnvironmentFile(file),
    { code: 'stack_managed_environment_key_forbidden' }
  );

  fs.writeFileSync(file, 'CODEX_MEMORY_EXPOSE_WRITE_TOOLS=true\n', {
    mode: 0o600
  });
  assert.throws(
    () => loadManagedEnvironmentFile(file),
    { code: 'stack_managed_environment_key_forbidden' }
  );
});

test('managed child environments neutralize caller write, root, provider, and public-surface overrides', () => {
  const digest = `sha256:${'ab'.repeat(32)}`;
  const hostile = {
    PATH: '/usr/bin',
    ENABLE_REAL_ROOT_WRITE: '1',
    KB_ROOT: '/real/private/root',
    KNOWLEDGEBASE_ROOT_PATH: '/real/private/root',
    API_Key: 'synthetic-provider-key',
    API_URL: 'https://untrusted.invalid',
    BASH_ENV: '/untrusted/bash-env',
    'BASH_FUNC_node%%': '() { /untrusted/node; }',
    ENV: '/untrusted/shell-env',
    SHELLOPTS: 'xtrace',
    PS4: 'token=${CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN}',
    NODE_OPTIONS: '--require=/untrusted.js',
    NODE_DEBUG: 'http',
    NODE_DEBUG_NATIVE: 'http',
    NODE_V8_COVERAGE: '/untrusted/coverage',
    LD_PRELOAD: '/untrusted.so',
    CODEX_MEMORY_MCP_PUBLIC_TOOL_SURFACE: 'full',
    CODEX_MEMORY_EXPOSE_WRITE_TOOLS: 'true',
    CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'true',
    CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE: 'jenn-vcp-diary-scope-v1',
    CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST: digest
  };
  const base = childBaseEnvironment(hostile);
  assert.equal(base.PATH, '/usr/bin:/bin');
  for (const name of [
    'ENABLE_REAL_ROOT_WRITE',
    'KB_ROOT',
    'KNOWLEDGEBASE_ROOT_PATH',
    'API_Key',
    'API_URL',
    'BASH_ENV',
    'BASH_FUNC_node%%',
    'ENV',
    'SHELLOPTS',
    'PS4',
    'NODE_OPTIONS',
    'NODE_DEBUG',
    'NODE_DEBUG_NATIVE',
    'NODE_V8_COVERAGE',
    'LD_PRELOAD',
    'CODEX_MEMORY_EXPOSE_WRITE_TOOLS'
  ]) {
    assert.equal(Object.hasOwn(base, name), false);
  }

  const shim = buildShimChildEnvironment(hostile, {
    token: 'synthetic-token',
    runtimeRoot: '/runtime/isolated',
    vcpRoot: '/workspace/runtime/VCPToolBox',
    mappingPath: '/owner/mapping.json',
    providerEnvironment: {
      apiKey: 'synthetic-governed-provider-key',
      model: 'synthetic-embedding-model',
      dimension: '1024'
    }
  });
  assert.equal(shim.ENABLE_REAL_ROOT_WRITE, '0');
  assert.equal(shim.KB_ROOT, '');
  assert.equal(shim.KNOWLEDGEBASE_ROOT_PATH, '');
  assert.equal(shim.KNOWLEDGEBASE_STORE_PATH, '/runtime/isolated/store');
  assert.equal(shim.WSL_NEWAPI_HOST, '127.0.0.1');
  assert.equal(shim.CODEX_MEMORY_DIARY_SCOPE_MAPPING_PATH, '/owner/mapping.json');
  assert.equal(shim.API_Key, 'synthetic-governed-provider-key');
  assert.equal(shim.API_URL, 'http://127.0.0.1:3000');
  assert.equal(shim.WhitelistEmbeddingModel, 'synthetic-embedding-model');
  assert.equal(shim.VECTORDB_DIMENSION, '1024');

  const http = buildHttpChildEnvironment(hostile, {
    token: 'synthetic-token',
    runtimeRoot: '/runtime/isolated'
  });
  assert.equal(http.CODEX_MEMORY_SECURITY_PROFILE, 'hardened');
  assert.equal(http.CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER, 'false');
  assert.equal(http.CODEX_MEMORY_ENABLE_SOFT_READ_POLICY, 'true');
  assert.equal(http.CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY, 'true');
  assert.equal(http.CODEX_MEMORY_ENABLE_WRITE_PREFLIGHT, 'true');
  assert.equal(http.CODEX_MEMORY_EXPOSE_WRITE_TOOLS, 'false');
  assert.equal(http.CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE, 'off');
  assert.equal(http.CODEX_MEMORY_MCP_PUBLIC_TOOL_SURFACE, 'read_only');
  assert.equal(
    http.CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_REFERENCE,
    'jenn-vcp-diary-scope-v1'
  );
  assert.equal(http.CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_DIGEST, digest);
  assert.equal(Object.hasOwn(http, 'API_Key'), false);
});

test('HTTP child requires the exact governed mapping binding shape', () => {
  const valid = {
    CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE: 'jenn-vcp-diary-scope-v1',
    CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST: `sha256:${'ab'.repeat(32)}`
  };
  assert.equal(validateExpectedMappingEnvironment(valid), true);
  assert.throws(
    () => validateExpectedMappingEnvironment({
      ...valid,
      CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST: `sha256:${'a'.repeat(64)}`
    }),
    { code: 'stack_expected_mapping_binding_invalid' }
  );
  assert.throws(
    () => validateExpectedMappingEnvironment({
      ...valid,
      CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE: 'other-mapping'
    }),
    { code: 'stack_expected_mapping_binding_invalid' }
  );
});

test('retained governance binding is pinned independently from the runtime baseline', () => {
  assert.notEqual(RETAINED_BINDING_SOURCE, BASELINE);
  assert.equal(
    validateRetainedBindingPayload(
      retainedBinding(),
      RETAINED_BINDING_SOURCE
    ),
    true
  );
  assert.throws(
    () => validateRetainedBindingPayload(retainedBinding(), BASELINE),
    { code: 'stack_retained_binding_invalid' }
  );
  assert.throws(
    () => validateRetainedBindingPayload(
      retainedBinding({ publicWriteSurfaceEnabled: true }),
      RETAINED_BINDING_SOURCE
    ),
    { code: 'stack_retained_binding_invalid' }
  );
});

test('source compatibility allows only controller delivery paths over the accepted runtime baseline', () => {
  const calls = [];
  const fakeExec = (_command, args) => {
    calls.push(args);
    if (args[0] === 'rev-parse' && args[1] === 'HEAD^{commit}') return `${BASELINE}\n`;
    if (args[0] === 'rev-parse' && args[1] === 'origin/main^{commit}') return `${BASELINE}\n`;
    if (args[0] === 'status') return '';
    if (args[0] === 'cat-file') return '';
    if (args[0] === 'diff') {
      return `${[...CONTROLLER_CHANGE_PATHS].join('\n')}\n`;
    }
    throw new Error('unexpected git call');
  };
  const result = inspectSourceCompatibility(profile(), {
    exec: fakeExec,
    repoRoot: '/repo'
  });
  assert.equal(result.compatible, true);
  assert.equal(result.controllerOnlyChanges, true);
  assert.equal(adoptionSourceCompatible(result), true);
  assert.equal(adoptionSourceCompatible({
    ...result,
    clean: false
  }), false);
  assert.ok(calls.length >= 5);

  const unsafe = inspectSourceCompatibility(profile(), {
    repoRoot: '/repo',
    exec(_command, args) {
      if (args[0] === 'rev-parse') return `${BASELINE}\n`;
      if (args[0] === 'status' || args[0] === 'cat-file') return '';
      if (args[0] === 'diff') return 'src/core/MemoryOverviewService.js\n';
      throw new Error('unexpected git call');
    }
  });
  assert.equal(unsafe.compatible, false);
  assert.equal(unsafe.controllerOnlyChanges, false);
});

test('provider inspection pins the accepted container, image, revision, and loopback port', () => {
  const values = new Map([
    ['{{ .Id }}', PROVIDER_CONTAINER_ID],
    ['{{ .Image }}', PROVIDER_IMAGE_ID],
    ['{{ .Config.Image }}', 'calciumion/new-api:latest'],
    [
      '{{ index .Config.Labels "org.opencontainers.image.revision" }}',
      PROVIDER_REVISION
    ],
    [
      '{{ index .Config.Labels "org.opencontainers.image.source" }}',
      'https://github.com/QuantumNous/new-api'
    ],
    [
      '{{ index .Config.Labels "com.docker.compose.project" }}',
      'new-api-wsl'
    ],
    [
      '{{ index .Config.Labels "com.docker.compose.service" }}',
      'new-api'
    ],
    [
      '{{ json (index .NetworkSettings.Ports "3000/tcp") }}',
      JSON.stringify([{ HostIp: '127.0.0.1', HostPort: '3000' }])
    ],
    ['{{ .State.Running }}', 'true']
  ]);
  const inspect = () => inspectProviderContainer('new-api-wsl', {
    exec(_command, args) {
      const format = args[2];
      if (!values.has(format)) throw new Error(`unexpected format: ${format}`);
      return `${values.get(format)}\n`;
    }
  });
  const provider = inspect();
  assert.equal(provider.recognized, true);
  assert.equal(provider.running, true);
  assert.equal(profileProviderIdentityMatches(profile(), provider), true);

  values.set(
    '{{ json (index .NetworkSettings.Ports "3000/tcp") }}',
    JSON.stringify([{ HostIp: '0.0.0.0', HostPort: '3000' }])
  );
  assert.equal(inspect().recognized, false);
  values.set(
    '{{ json (index .NetworkSettings.Ports "3000/tcp") }}',
    JSON.stringify([{ HostIp: '127.0.0.1', HostPort: '3000' }])
  );
  values.set('{{ .Image }}', `sha256:${'01'.repeat(32)}`);
  assert.equal(
    profileProviderIdentityMatches(profile(), inspect()),
    false
  );
});

test('Edge inspection validates non-root, read-only, non-restarting, logless loopback posture', () => {
  const values = new Map([
    ['{{ .Id }}', EDGE_CONTAINER_ID],
    ['{{ index .Config.Labels "org.opencontainers.image.revision" }}', BASELINE],
    ['{{ .Config.User }}', 'node'],
    ['{{ .HostConfig.ReadonlyRootfs }}', 'true'],
    ['{{ .HostConfig.RestartPolicy.Name }}', 'no'],
    ['{{ .HostConfig.LogConfig.Type }}', 'none'],
    [
      '{{ range .Mounts }}{{ if eq .Destination "/run/secrets/codex-memory-r4" }}{{ not .RW }}{{ end }}{{ end }}',
      'true'
    ],
    [
      '{{ json (index .NetworkSettings.Ports "8080/tcp") }}',
      JSON.stringify([{ HostIp: '127.0.0.1', HostPort: '49152' }])
    ],
    ['{{ .State.Running }}', 'true'],
    ['{{ if .State.Health }}{{ .State.Health.Status }}{{ else }}none{{ end }}', 'healthy']
  ]);
  const edge = inspectEdgeContainer('codex-memory-full-stack-001-edge', {
    exec(_command, args) {
      const format = args[2];
      if (!values.has(format)) throw new Error(`unexpected format: ${format}`);
      return `${values.get(format)}\n`;
    }
  });
  assert.equal(edge.secure, true);
  assert.equal(edge.running, true);
  assert.equal(edge.healthy, true);

  values.set(
    '{{ json (index .NetworkSettings.Ports "8080/tcp") }}',
    JSON.stringify([{ HostIp: '0.0.0.0', HostPort: '49152' }])
  );
  assert.equal(
    inspectEdgeContainer('codex-memory-full-stack-001-edge', {
      exec(_command, args) {
        return `${values.get(args[2])}\n`;
      }
    }).secure,
    false
  );
});

test('Edge lifecycle identity requires the exact adopted container ID and revision', () => {
  const edge = {
    id: EDGE_CONTAINER_ID,
    revision: BASELINE,
    secure: true
  };
  assert.equal(profileEdgeIdentityMatches(profile(), edge), true);
  assert.equal(
    profileEdgeIdentityMatches(profile(), {
      ...edge,
      id: 'cd'.repeat(32)
    }),
    false
  );
  assert.equal(
    profileEdgeIdentityMatches(profile(), {
      ...edge,
      revision: RETAINED_BINDING_SOURCE
    }),
    false
  );
  assert.equal(
    profileEdgeIdentityMatches(profile(), {
      ...edge,
      secure: false
    }),
    false
  );
});

test('stack acceptance requires HTTP authentication and every pinned identity', () => {
  const accepted = acceptedStack();
  assert.equal(computeRuntimeAccepted(accepted), true);
  assert.equal(computeStackAccepted(accepted), true);
  assert.equal(
    computeStackAccepted({
      ...accepted,
      source: { compatible: false }
    }),
    false
  );
  assert.equal(
    computeStackAccepted({
      ...accepted,
      provider: {
        ...accepted.provider,
        id: '01'.repeat(32)
      }
    }),
    false
  );
  assert.equal(
    computeStackAccepted({
      ...accepted,
      httpHealth: {
        ...accepted.httpHealth,
        authRequired: false
      }
    }),
    false
  );
  assert.equal(
    computeStackAccepted({
      ...accepted,
      httpHealth: {
        ...accepted.httpHealth,
        policyAccepted: false
      }
    }),
    false
  );
  assert.equal(
    computeStackAccepted({
      ...accepted,
      retainedBindingMatch: false
    }),
    false
  );
  assert.equal(
    computeStackAccepted({
      ...accepted,
      edge: {
        ...accepted.edge,
        id: 'cd'.repeat(32)
      }
    }),
    false
  );
});

test('authenticated HTTP health projection requires the full hardened policy shape', () => {
  const payload = {
    ok: true,
    auth: {
      required: true,
      warning: null
    },
    access: {
      mode: 'health_full',
      selectedProjection: false,
      selectedProjectionVersion: 1,
      bearerTokenRequiredForMcpTools: true,
      tokenMaterialReturned: false,
      filesystemPathsReturned: false,
      rawStoreFieldsReturned: false,
      rawMemoryFieldsReturned: false,
      embeddingFingerprintReturned: false,
      runtimeDetailLevel: 'bounded'
    },
    policyGates: {
      securityProfile: 'hardened',
      softReadPolicyEnabled: true,
      lifecycleReadPolicyEnabled: true,
      writePreflightEnabled: true,
      externalProviderAllowed: false,
      governedNativeBridgeWarnings: []
    }
  };
  const accepted = projectHttpHealthPayload(payload, 200);
  assert.equal(accepted.reachable, true);
  assert.equal(accepted.authRequired, true);
  assert.equal(accepted.policyAccepted, true);
  assert.equal(accepted.policyFailureCode, null);
  assert.equal(
    projectHttpHealthPayload({
      ...payload,
      policyGates: {
        ...payload.policyGates,
        externalProviderAllowed: true
      }
    }, 200).policyFailureCode,
    'stack_http_external_provider_policy_invalid'
  );
  assert.equal(
    projectHttpHealthPayload({
      ...payload,
      policyGates: {
        ...payload.policyGates,
        securityProfile: 'local'
      }
    }, 200).policyFailureCode,
    'stack_http_security_profile_invalid'
  );
  assert.equal(
    projectHttpHealthPayload({
      ...payload,
      access: {
        ...payload.access,
        rawMemoryFieldsReturned: true
      }
    }, 200).policyFailureCode,
    'stack_http_access_policy_invalid'
  );
  assert.equal(
    projectHttpHealthPayload({
      ...payload,
      auth: {
        ...payload.auth,
        token: 'must-not-be-accepted'
      }
    }, 200).policyFailureCode,
    'stack_http_auth_shape_invalid'
  );
});

test('governance projection requires default-closed schema v3 with no memory writes', () => {
  const value = {
    schema_version: 3,
    operation: 'status',
    accepted: true,
    activation_status: 'inactive',
    default_closed: true,
    durable_state_written: false,
    observation: {
      schema_version: 3,
      sessions_started: 0,
      provider_calls: 0,
      native_invocations: 0,
      primary_memory_writes: 0,
      raw_memory_recorded: false,
      durable_observation_state_written: false
    }
  };
  const projection = lowDisclosureGovernanceProjection(value);
  assert.equal(projection.reachable, true);
  assert.equal(projection.rawMemoryRecorded, false);
  assert.equal(
    lowDisclosureGovernanceProjection({
      ...value,
      observation: { ...value.observation, primary_memory_writes: 1 }
    }).reachable,
    false
  );
});

test('relay projection rejects any raw-memory or secret retention', () => {
  const value = {
    schema_version: 1,
    operation: 'snapshot',
    observation: {
      schema_version: 1,
      component: 'outbound_relay',
      completion_state: 'idle',
      claims_received: 0,
      requests_failed: 0,
      request_identifiers_retained: false,
      response_bodies_retained: false,
      raw_memory_retained: false,
      secret_values_retained: false
    }
  };
  assert.equal(lowDisclosureRelayProjection(value).reachable, true);
  assert.equal(
    lowDisclosureRelayProjection({
      ...value,
      observation: { ...value.observation, secret_values_retained: true }
    }).reachable,
    false
  );
});

test('error projection never returns arbitrary runtime text', () => {
  assert.equal(safeCode({ code: 'stack_profile_invalid' }), 'stack_profile_invalid');
  assert.equal(safeCode(new Error('token=not-for-output')), 'codex_memory_stack_failed');
  assert.equal(exactKeys({ a: 1 }, ['a']), true);
  assert.equal(exactKeys({ a: 1, b: 2 }, ['a']), false);
});
