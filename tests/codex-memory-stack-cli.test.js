'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  CONTROLLER_CHANGE_PATHS,
  EXACT_HEAD_PROFILE_SCHEMA_VERSION,
  PROFILE_KEYS,
  PROFILE_SCHEMA_VERSION,
  V5_PROFILE_KEYS,
  VCP_RUNTIME_BASELINE_BY_CODEX_BASELINE,
  VCP_RUNTIME_SOURCE_PATHS,
  acquireLifecycleProfile,
  acquireOwnerLock,
  adoptionSourceCompatible,
  assertAdoptionRepositoryMatch,
  assertPrivateRootBoundary,
  assertRelativeReference,
  buildControllerChildEnvironment,
  buildHttpChildEnvironment,
  buildShimChildEnvironment,
  childBaseEnvironment,
  commandMatchesComponent,
  computeRuntimeAccepted,
  computeStackAccepted,
  connectOwnedLoopbackTcpListener,
  connectedUnixPeerOwnedByPid,
  controllerCommandMatchesComponent,
  deriveRuntimeRepositoryFromHttpIdentity,
  discoverPrivateRoot,
  exactKeys,
  extractEnvFileArgument,
  finalizeManagedSpawn,
  inspectEdgeContainer,
  inspectProviderContainer,
  inspectSourceCompatibility,
  inspectVcpRuntimeIdentity,
  isPidRunning,
  legacyVcpRuntimeBootstrapMatches,
  getJsonHealth,
  governanceCredentialFreshnessMatches,
  governancePrivateFileIdentities,
  loadManagedEnvironmentFile,
  managedStopWaitOptions,
  managedEnvironmentConfigDigest,
  lowDisclosureGovernanceProjection,
  lowDisclosureRelayProjection,
  ownerFileIdentity,
  parsePid,
  prepareStaleOwnerSocket,
  privateReferencePath,
  processEnvironmentExactlyMatches,
  processOwnsLoopbackTcpListener,
  processOwnsUnixListener,
  profileEdgeIdentityMatches,
  profileEdgeLifecycleIdentityMatches,
  profileManagedEnvironmentConfigMatches,
  profileProviderIdentityMatches,
  profileVcpProviderConfigMatches,
  profileWithControllerManifestBinding,
  profileVcpRuntimeIdentityMatches,
  providerCredentialFreshnessMatches,
  projectHttpHealthPayload,
  relayCredentialFreshnessMatches,
  relaySecretFileIdentities,
  readLinuxProcessStartTicks,
  readVcpProviderEnvironmentSnapshot,
  safeCode,
  validateExpectedMappingEnvironment,
  validateRetainedBindingPayload,
  validateProfile,
  vcpProviderConfigDigest,
  vcpRuntimeRepository,
  writeGovernancePrivateIdentityReceipt,
  writeProviderConfigIdentityReceipt,
  writeRelaySecretIdentityReceipt,
  waitForProcessGroupExit
} = require('../scripts/codex-memory-stack');

const BASELINE = '3a0ca59fe2c0f3721d46513d7d6593cbe55b1118';
const CONTROLLER_SOURCE_COMMIT =
  '89abcdef0123456789abcdef0123456789abcdef';
const V5_CONTROLLER_SOURCE_COMMIT =
  '48ecfe1c74e1cf5b6be9a56ffa82998eeb26567e';
const CONTROLLER_SOURCE_MANIFEST_DIGEST = `sha256:${'34'.repeat(32)}`;
const RETAINED_BINDING_SOURCE = 'f1dea016a7a167898d77be6575403e7a7d28c8d5';
const EDGE_CONTAINER_ID = 'ab'.repeat(32);
const PROVIDER_CONTAINER_ID = 'cd'.repeat(32);
const PROVIDER_IMAGE_ID = `sha256:${'ef'.repeat(32)}`;
const PROVIDER_REVISION = '1234567890abcdef1234567890abcdef12345678';
const VCP_SCOPE_DIGEST = `sha256:${'12'.repeat(32)}`;
const VCP_PROVIDER_ENVIRONMENT = Object.freeze({
  apiKey: 'synthetic-provider-key',
  model: 'synthetic-embedding-model',
  dimension: '1024'
});
const VCP_PROVIDER_CONFIG_DIGEST = vcpProviderConfigDigest(
  VCP_PROVIDER_ENVIRONMENT
);
const GOVERNANCE_ENVIRONMENT_CONFIG_DIGEST =
  managedEnvironmentConfigDigest({
    CODEX_MEMORY_R4_COUNTER_MODE: 'r4_session_scoped_live_read_v1'
  });
const RELAY_ENVIRONMENT_CONFIG_DIGEST =
  managedEnvironmentConfigDigest({
    CODEX_MEMORY_R4_PUBLIC_ORIGIN: 'https://memory.example'
  });

function manifestInspection(overrides = {}) {
  return {
    recognized: true,
    manifestVersion: 1,
    manifestDigest: CONTROLLER_SOURCE_MANIFEST_DIGEST,
    manifestComplete: true,
    manifestScopeClean: true,
    fileCount: 738,
    ...overrides
  };
}

function profile(overrides = {}) {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    adoptedRepositoryHead: CONTROLLER_SOURCE_COMMIT,
    controllerSourceManifestDigest: CONTROLLER_SOURCE_MANIFEST_DIGEST,
    controllerSourceManifestVersion: 1,
    governanceEnvironmentConfigDigest:
      GOVERNANCE_ENVIRONMENT_CONFIG_DIGEST,
    relayEnvironmentConfigDigest:
      RELAY_ENVIRONMENT_CONFIG_DIGEST,
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
    vcpProviderConfigDigest: VCP_PROVIDER_CONFIG_DIGEST,
    vcpRuntimeBaseline: VCP_RUNTIME_BASELINE_BY_CODEX_BASELINE[BASELINE],
    vcpRuntimeRepository: '/vcp',
    vcpRuntimeScopeDigest: VCP_SCOPE_DIGEST,
    ...overrides
  };
}

function v5Profile(overrides = {}) {
  const {
    adoptedRepositoryHead: _adoptedRepositoryHead,
    controllerSourceManifestDigest: _controllerSourceManifestDigest,
    controllerSourceManifestVersion: _controllerSourceManifestVersion,
    ...v5
  } = profile();
  return {
    ...v5,
    schemaVersion: EXACT_HEAD_PROFILE_SCHEMA_VERSION,
    controllerSourceCommit: V5_CONTROLLER_SOURCE_COMMIT,
    ...overrides
  };
}

function legacyProfile(overrides = {}) {
  const {
    controllerSourceCommit: _controllerSourceCommit,
    governanceEnvironmentConfigDigest: _governanceEnvironmentConfigDigest,
    relayEnvironmentConfigDigest: _relayEnvironmentConfigDigest,
    vcpProviderConfigDigest: _vcpProviderConfigDigest,
    vcpRuntimeBaseline: _vcpRuntimeBaseline,
    vcpRuntimeRepository: _vcpRuntimeRepository,
    vcpRuntimeScopeDigest: _vcpRuntimeScopeDigest,
    ...legacy
  } = v5Profile();
  return {
    ...legacy,
    schemaVersion: 4,
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
      shim: { managed: true, controllerManaged: true },
      http: { managed: true, controllerManaged: true },
      governance: { managed: true, controllerManaged: true },
      relay: { managed: true, controllerManaged: true }
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
    managedEnvironmentConfigMatch: true,
    vcpProviderConfigMatch: true,
    vcpProviderCredentialFresh: true,
    vcpRuntime: {
      recognized: true,
      revision: VCP_RUNTIME_BASELINE_BY_CODEX_BASELINE[BASELINE],
      repository: '/vcp',
      currentMain: true,
      repositoryMatch: true,
      scopeClean: true,
      scopeComplete: true,
      scopeDigest: VCP_SCOPE_DIGEST
    },
    shimListenerOwned: true,
    httpListenerOwned: true,
    governanceListenerOwned: true,
    governanceDataListenerOwned: true,
    relayListenerOwned: true,
    httpHealth: {
      reachable: true,
      ok: true,
      authRequired: true,
      policyAccepted: true
    },
    governance: { reachable: true },
    governanceCredentialFresh: true,
    relay: { reachable: true },
    relayCredentialFresh: true,
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
  assert.deepEqual(
    Object.keys(validateProfile(v5Profile())).sort(),
    [...V5_PROFILE_KEYS].sort()
  );
  assert.equal(validateProfile(v5Profile()).schemaVersion, 5);
  assert.equal(validateProfile(legacyProfile()).schemaVersion, 4);
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
  assert.throws(
    () => validateProfile(profile({
      controllerSourceManifestVersion: 2
    })),
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

test('controller process environment must exactly bind the isolated runtime', () => {
  const expected = {
    PATH: '/usr/bin:/bin',
    CODEX_MEMORY_STACK_CHILD: '1',
    CODEX_MEMORY_STACK_RUNTIME_DIR: '/owner/isolated-runtime'
  };
  const environmentBuffer = Buffer.from([
    'CODEX_MEMORY_STACK_RUNTIME_DIR=/owner/isolated-runtime',
    'PATH=/usr/bin:/bin',
    'CODEX_MEMORY_STACK_CHILD=1',
    ''
  ].join('\0'));
  const fsModule = {
    readFileSync(file) {
      assert.equal(file, '/proc/4321/environ');
      return environmentBuffer;
    }
  };
  assert.equal(
    processEnvironmentExactlyMatches(4321, expected, { fsModule }),
    true
  );
  assert.equal(
    processEnvironmentExactlyMatches(4321, {
      ...expected,
      CODEX_MEMORY_STACK_RUNTIME_DIR: '/owner/real-private-store'
    }, { fsModule }),
    false
  );
  assert.equal(
    processEnvironmentExactlyMatches(4321, expected, {
      fsModule: {
        readFileSync() {
          return Buffer.from([
            'CODEX_MEMORY_STACK_RUNTIME_DIR=/owner/isolated-runtime',
            'PATH=/usr/bin:/bin',
            'CODEX_MEMORY_STACK_CHILD=1',
            'LD_AUDIT=/untrusted/audit.so',
            ''
          ].join('\0'));
        }
      }
    }),
    false
  );
  assert.equal(
    processEnvironmentExactlyMatches(4321, expected, {
      fsModule: {
        readFileSync() {
          return environmentBuffer.subarray(0, environmentBuffer.length - 1);
        }
      }
    }),
    false
  );
});

test('HTTP listener ownership binds loopback port to the recorded process socket', () => {
  const tcp = [
    '  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode',
    '   0: 0100007F:1DB5 00000000:0000 0A 00000000:00000000 00:00000000 00000000  1000        0 4242'
  ].join('\n');
  const fsModule = {
    readFileSync(file) {
      assert.equal(file, '/proc/net/tcp');
      return tcp;
    },
    readdirSync(directory) {
      assert.equal(directory, '/proc/4321/fd');
      return ['0', '7'];
    },
    readlinkSync(file) {
      return file.endsWith('/7') ? 'socket:[4242]' : '/dev/null';
    }
  };
  assert.equal(
    processOwnsLoopbackTcpListener(4321, 7605, { fsModule }),
    true
  );
  assert.equal(
    processOwnsLoopbackTcpListener(4321, 7606, { fsModule }),
    false
  );
  assert.equal(
    processOwnsLoopbackTcpListener(4321, 7605, {
      fsModule: {
        ...fsModule,
        readlinkSync() {
          return 'socket:[9999]';
        }
      }
    }),
    false
  );
  assert.equal(
    processOwnsLoopbackTcpListener(0, 7605, { fsModule }),
    false
  );
});

test('UDS listener ownership binds the exact path inode to the recorded process', () => {
  const socketPath = '/owner/governance.sock';
  const table = [
    'Num       RefCount Protocol Flags    Type St Inode Path',
    `0000000000000000: 00000002 00000000 00010000 0001 01 4242 ${socketPath}`
  ].join('\n');
  const fsModule = {
    lstatSync(file) {
      if (file !== socketPath) throw new Error('missing');
      return {
        isSocket: () => true,
        isSymbolicLink: () => false,
        uid: process.getuid(),
        mode: 0o140600
      };
    },
    readFileSync(file) {
      assert.equal(file, '/proc/net/unix');
      return table;
    },
    readdirSync(directory) {
      assert.equal(directory, '/proc/4321/fd');
      return ['0', '7'];
    },
    readlinkSync(file) {
      return file.endsWith('/7') ? 'socket:[4242]' : '/dev/null';
    }
  };
  assert.equal(
    processOwnsUnixListener(4321, socketPath, { fsModule }),
    true
  );
  assert.equal(
    processOwnsUnixListener(4321, '/owner/other.sock', { fsModule }),
    false
  );
  assert.equal(
    processOwnsUnixListener(4321, socketPath, {
      fsModule: {
        ...fsModule,
        readlinkSync() {
          return 'socket:[9999]';
        }
      }
    }),
    false
  );
  assert.equal(
    processOwnsUnixListener(4321, socketPath, {
      fsModule: {
        ...fsModule,
        readFileSync(file) {
          assert.equal(file, '/proc/net/unix');
          return `${table}\n` +
            `0000000000000001: 00000002 00000000 00010000 0001 01 9999 ${socketPath}`;
        }
      }
    }),
    false
  );
});

test('connected UDS peer identity binds the established socket to the recorded process', () => {
  const socket = { _handle: { fd: 42 } };
  const exec = (file, arguments_, options) => {
    assert.equal(file, '/usr/bin/python3');
    assert.deepEqual(arguments_.slice(0, 3), ['-I', '-S', '-c']);
    assert.match(arguments_[3], /SO_PEERCRED/u);
    assert.deepEqual(options.env, {
      LC_ALL: 'C',
      PATH: '/usr/bin:/bin'
    });
    assert.deepEqual(options.stdio, ['ignore', 'pipe', 'ignore', 42]);
    return `4321:${process.getuid()}:${process.getgid()}\n`;
  };
  assert.equal(
    connectedUnixPeerOwnedByPid(socket, 4321, { exec }),
    true
  );
  assert.equal(
    connectedUnixPeerOwnedByPid(socket, 4321, {
      exec() {
        return `9999:${process.getuid()}:${process.getgid()}\n`;
      }
    }),
    false
  );
  assert.equal(
    connectedUnixPeerOwnedByPid(socket, 4321, {
      exec() {
        return 'malformed\n';
      }
    }),
    false
  );
});

test('connected UDS peer helper reads kernel credentials without sending payload', async t => {
  const root = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'codex-memory-stack-peercred-'
  ));
  const socketPath = path.join(root, 'peer.sock');
  let acceptedSocket = null;
  let receivedBytes = 0;
  let acceptResolve;
  const accepted = new Promise(resolve => {
    acceptResolve = resolve;
  });
  const server = net.createServer(socket => {
    acceptedSocket = socket;
    socket.on('data', chunk => {
      receivedBytes += chunk.length;
    });
    acceptResolve();
  });
  await new Promise((resolve, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(socketPath, resolve);
  });
  const client = net.createConnection({ path: socketPath });
  await Promise.all([
    accepted,
    new Promise((resolve, rejectConnect) => {
      client.once('connect', resolve);
      client.once('error', rejectConnect);
    })
  ]);
  t.after(async () => {
    client.destroy();
    acceptedSocket?.destroy();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  });

  assert.equal(
    connectedUnixPeerOwnedByPid(client, process.pid),
    true
  );
  assert.equal(
    connectedUnixPeerOwnedByPid(client, 2_147_483_647),
    false
  );
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(receivedBytes, 0);
});

test('HTTP health sends bearer only on a preconnected recorded-PID listener', async t => {
  let observedAuthorization = null;
  const server = http.createServer((request, response) => {
    observedAuthorization = request.headers.authorization || null;
    response.writeHead(200, {
      'Content-Type': 'application/json',
      Connection: 'close'
    });
    response.end(JSON.stringify({ ok: true }));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const address = server.address();
  await assert.rejects(
    connectOwnedLoopbackTcpListener(2_147_483_647, address.port),
    { code: 'stack_http_listener_identity_mismatch' }
  );
  assert.equal(observedAuthorization, null);
  const connectedSocket = await connectOwnedLoopbackTcpListener(
    process.pid,
    address.port
  );
  const health = await getJsonHealth({
    port: address.port,
    bearerToken: 'synthetic-test-token',
    connectedSocket
  });
  assert.equal(health.reachable, true);
  assert.equal(health.statusCode, 200);
  assert.equal(observedAuthorization, 'Bearer synthetic-test-token');
  await assert.rejects(
    connectOwnedLoopbackTcpListener(process.pid, address.port + 1),
    { code: 'stack_http_listener_identity_mismatch' }
  );
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

  fs.writeFileSync(file, `${JSON.stringify({
    schemaVersion: 1,
    pid: 999999999,
    startTicks: '42'
  })}\n`, { mode: 0o600 });
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

test('lifecycle lock recovers a live PID only when its start identity changed', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-stack-lock-'));
  fs.chmodSync(root, 0o700);
  const file = path.join(root, 'lifecycle.lock');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.writeFileSync(file, `${JSON.stringify({
    schemaVersion: 1,
    pid: process.pid,
    startTicks: '41'
  })}\n`, { mode: 0o600 });
  const recovered = acquireOwnerLock(file, {
    kill(pid, signal) {
      assert.equal(pid, process.pid);
      assert.equal(signal, 0);
    },
    readStartTicks(pid) {
      assert.equal(pid, process.pid);
      return '42';
    }
  });
  assert.equal(recovered.release(), true);

  fs.writeFileSync(file, `${JSON.stringify({
    schemaVersion: 1,
    pid: process.pid,
    startTicks: '42'
  })}\n`, { mode: 0o600 });
  assert.throws(
    () => acquireOwnerLock(file, {
      kill() {},
      readStartTicks() {
        return '42';
      }
    }),
    { code: 'stack_lifecycle_busy' }
  );
});

test('lifecycle profile snapshot is read only after the lock is acquired', () => {
  const events = [];
  const environment = { XDG_RUNTIME_DIR: '/synthetic/runtime' };
  const lifecycle = acquireLifecycleProfile({
    environment,
    ensureRuntime(observedEnvironment) {
      assert.equal(observedEnvironment, environment);
      events.push('ensure');
    },
    acquireLock(file) {
      assert.equal(
        file,
        '/synthetic/runtime/codex-memory-full-stack-001/pids/lifecycle.lock'
      );
      events.push('lock');
      return {
        release() {
          events.push('release');
          return true;
        }
      };
    },
    read(options) {
      assert.equal(options.environment, environment);
      events.push('read');
      return profile();
    }
  });
  assert.deepEqual(events, ['ensure', 'lock', 'read']);
  assert.equal(
    lifecycle.profile.controllerSourceManifestDigest,
    CONTROLLER_SOURCE_MANIFEST_DIGEST
  );
  assert.equal(lifecycle.release(), true);
  assert.deepEqual(events, ['ensure', 'lock', 'read', 'release']);

  const failedEvents = [];
  assert.throws(
    () => acquireLifecycleProfile({
      environment,
      ensureRuntime() {
        failedEvents.push('ensure');
      },
      acquireLock() {
        failedEvents.push('lock');
        return {
          release() {
            failedEvents.push('release');
            return true;
          }
        };
      },
      read() {
        failedEvents.push('read');
        throw new Error('synthetic profile failure');
      }
    }),
    /synthetic profile failure/u
  );
  assert.deepEqual(failedEvents, ['ensure', 'lock', 'read', 'release']);
});

test('managed spawn persists PID before unref and confirms failed spawns exit', async () => {
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
  assert.equal(await finalizeManagedSpawn(child, '/owner/component.pid', {
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
  let waitedFor = null;
  await assert.rejects(
    finalizeManagedSpawn(child, '/owner/component.pid', {
      writePid() {
        throw new Error('synthetic write failure');
      },
      kill(pid, sentSignal) {
        signal = { pid, sentSignal };
      },
      async waitForExit(pid, options) {
        waitedFor = { pid, kill: options.kill };
        return true;
      }
    }),
    { code: 'stack_pid_file_write_failed' }
  );
  assert.deepEqual(signal, { pid: -4321, sentSignal: 'SIGTERM' });
  assert.equal(waitedFor.pid, 4321);
  assert.equal(typeof waitedFor.kill, 'function');
  assert.equal(unreferenced, false);

  await assert.rejects(
    finalizeManagedSpawn(child, '/owner/component.pid', {
      writePid() {
        throw new Error('synthetic write failure');
      },
      kill() {},
      async waitForExit() {
        return false;
      }
    }),
    { code: 'stack_pid_file_cleanup_failed' }
  );

  let probes = 0;
  let waits = 0;
  assert.equal(await waitForProcessGroupExit(4321, {
    kill(pid, signal) {
      assert.equal(pid, -4321);
      assert.equal(signal, 0);
      probes += 1;
      if (probes >= 3) {
        const error = new Error('gone');
        error.code = 'ESRCH';
        throw error;
      }
    },
    async wait(delay) {
      assert.equal(delay, 0);
      waits += 1;
    },
    attempts: 3,
    intervalMs: 0
  }), true);
  assert.equal(probes, 3);
  assert.equal(waits, 2);
});

test('managed stop wait budgets cover active HTTP, shim, and Relay settlement', () => {
  const shim = managedStopWaitOptions('shim');
  assert.deepEqual(shim, {
    attempts: 226,
    intervalMs: 200,
    failureCode: 'stack_process_stop_timeout'
  });
  assert.equal((shim.attempts - 1) * shim.intervalMs, 45_000);
  const http = managedStopWaitOptions('http');
  assert.equal((http.attempts - 1) * http.intervalMs, 45_000);
  const relay = managedStopWaitOptions('relay');
  assert.equal((relay.attempts - 1) * relay.intervalMs, 120_000);
  const governance = managedStopWaitOptions('governance');
  assert.equal(
    (governance.attempts - 1) * governance.intervalMs,
    10_000
  );
  assert.equal(http.failureCode, 'stack_process_stop_timeout');
  assert.equal(relay.failureCode, 'stack_process_stop_timeout');
  assert.equal(governance.failureCode, 'stack_process_stop_timeout');
  assert.throws(
    () => managedStopWaitOptions('unknown'),
    { code: 'stack_component_invalid' }
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
  assert.equal(controllerCommandMatchesComponent('http', [
    'node',
    'src/http-index.js'
  ], options), false);
  assert.equal(controllerCommandMatchesComponent('http', [
    process.execPath,
    '/repo/scripts/codex-memory-stack.js',
    '_run-http',
    `--stack-environment=${governanceEnvironment}`
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

test('runtime repository adoption derivation rejects every legacy HTTP entrypoint', () => {
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
  assert.throws(
    () => deriveRuntimeRepositoryFromHttpIdentity(identity([
      process.execPath,
      '/repo/src/http-index.js'
    ]), { fsModule }),
    { code: 'stack_adoption_http_identity_invalid' }
  );
  assert.throws(
    () => deriveRuntimeRepositoryFromHttpIdentity(identity([
      process.execPath,
      '--env-file=/owner/governance.env',
      '/repo/scripts/codex-memory-stack.js',
      '_run-http'
    ]), { fsModule }),
    { code: 'stack_adoption_http_identity_invalid' }
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

test('managed environment identity pins non-secret configuration without key material', t => {
  const base = {
    CODEX_MEMORY_R4_CONTEXT_SIGNING_KEY_ID: 'owner-key-v1',
    CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE:
      'file:/synthetic/native-token-a',
    CODEX_MEMORY_R4_PUBLIC_ORIGIN: 'https://memory.example',
    CODEX_MEMORY_R4_RELAY_AUTH_TOKEN: 'file:/synthetic/relay-token-a',
    CODEX_MEMORY_R4_SYNTHETIC_SECRET: 'synthetic-secret-a'
  };
  const digest = managedEnvironmentConfigDigest(base);
  assert.match(digest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(
    digest,
    managedEnvironmentConfigDigest({
      ...base,
      CODEX_MEMORY_R4_SYNTHETIC_SECRET: 'synthetic-secret-b'
    })
  );
  assert.notEqual(
    digest,
    managedEnvironmentConfigDigest({
      ...base,
      CODEX_MEMORY_R4_PUBLIC_ORIGIN: 'https://changed.example'
    })
  );
  assert.notEqual(
    digest,
    managedEnvironmentConfigDigest({
      ...base,
      CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE:
        'file:/synthetic/native-token-b'
    })
  );
  assert.notEqual(
    digest,
    managedEnvironmentConfigDigest({
      ...base,
      CODEX_MEMORY_R4_RELAY_AUTH_TOKEN:
        'file:/synthetic/relay-token-b'
    })
  );
  assert.throws(
    () => managedEnvironmentConfigDigest({
      ...base,
      CODEX_MEMORY_R4_RELAY_AUTH_TOKEN: 'synthetic-secret-value'
    }),
    { code: 'stack_managed_environment_invalid' }
  );

  const root = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'codex-memory-stack-config-identity-'
  ));
  fs.chmodSync(root, 0o700);
  const governanceFile = path.join(root, 'governance.env');
  const relayFile = path.join(root, 'relay.env');
  fs.writeFileSync(
    governanceFile,
    'CODEX_MEMORY_R4_COUNTER_MODE=r4_session_scoped_live_read_v1\n',
    { mode: 0o600 }
  );
  fs.writeFileSync(
    relayFile,
    'CODEX_MEMORY_R4_PUBLIC_ORIGIN=https://memory.example\n',
    { mode: 0o600 }
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  assert.equal(
    profileManagedEnvironmentConfigMatches(
      profile(),
      governanceFile,
      relayFile
    ),
    true
  );
  fs.writeFileSync(
    relayFile,
    'CODEX_MEMORY_R4_PUBLIC_ORIGIN=https://changed.example\n',
    { mode: 0o600 }
  );
  assert.equal(
    profileManagedEnvironmentConfigMatches(
      profile(),
      governanceFile,
      relayFile
    ),
    false
  );
});

test('controller child environment binds v6 manifest and historical v5 identities', t => {
  const root = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'codex-memory-stack-vcp-env-'
  ));
  const privateRoot = path.join(root, 'owner');
  const environmentFile = path.join(privateRoot, 'runtime.env');
  const retainedBindingFile = path.join(privateRoot, 'binding.json');
  fs.chmodSync(root, 0o700);
  fs.mkdirSync(privateRoot, { mode: 0o700 });
  fs.writeFileSync(
    environmentFile,
    'CODEX_MEMORY_R4_COUNTER_MODE=r4_session_scoped_live_read_v1\n',
    { mode: 0o600 }
  );
  fs.writeFileSync(retainedBindingFile, '{}\n', { mode: 0o600 });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const environment = {
    XDG_RUNTIME_DIR: path.join(root, 'runtime')
  };
  const boundProfile = profile({
    privateRoot,
    governanceEnvironment: 'runtime.env',
    relayEnvironment: 'runtime.env',
    retainedBinding: 'binding.json'
  });
  const child = buildControllerChildEnvironment(environmentFile, {
    profile: boundProfile,
    environment
  });
  assert.equal(
    child.CODEX_MEMORY_STACK_CONTROLLER_SOURCE_MANIFEST_DIGEST,
    boundProfile.controllerSourceManifestDigest
  );
  assert.equal(
    child.CODEX_MEMORY_STACK_CONTROLLER_SOURCE_MANIFEST_VERSION,
    '1'
  );
  assert.equal(
    Object.hasOwn(child, 'CODEX_MEMORY_STACK_CONTROLLER_SOURCE_COMMIT'),
    false
  );
  assert.equal(child.CODEX_MEMORY_STACK_PROFILE_SCHEMA_VERSION, '6');
  assert.equal(
    child.CODEX_MEMORY_STACK_VCP_PROVIDER_CONFIG_DIGEST,
    boundProfile.vcpProviderConfigDigest
  );
  assert.equal(
    child.CODEX_MEMORY_STACK_VCP_RUNTIME_BASELINE,
    boundProfile.vcpRuntimeBaseline
  );
  assert.equal(
    child.CODEX_MEMORY_STACK_VCP_RUNTIME_REPOSITORY,
    boundProfile.vcpRuntimeRepository
  );
  assert.equal(
    child.CODEX_MEMORY_STACK_VCP_RUNTIME_SCOPE_DIGEST,
    boundProfile.vcpRuntimeScopeDigest
  );
  const relayChild = buildControllerChildEnvironment(environmentFile, {
    profile: boundProfile,
    environment,
    expectedGovernancePid: process.pid
  });
  assert.equal(
    relayChild.CODEX_MEMORY_STACK_EXPECTED_GOVERNANCE_PID,
    String(process.pid)
  );
  assert.throws(
    () => buildControllerChildEnvironment(environmentFile, {
      profile: boundProfile,
      environment,
      expectedGovernancePid: 'not-a-pid'
    }),
    { code: 'stack_governance_listener_identity_missing' }
  );

  const exactHead = buildControllerChildEnvironment(environmentFile, {
    profile: v5Profile({
      privateRoot,
      governanceEnvironment: 'runtime.env',
      relayEnvironment: 'runtime.env',
      retainedBinding: 'binding.json'
    }),
    environment
  });
  assert.equal(
    exactHead.CODEX_MEMORY_STACK_CONTROLLER_SOURCE_COMMIT,
    V5_CONTROLLER_SOURCE_COMMIT
  );
  assert.equal(
    exactHead.CODEX_MEMORY_STACK_PROFILE_SCHEMA_VERSION,
    '5'
  );
  assert.equal(
    Object.hasOwn(
      exactHead,
      'CODEX_MEMORY_STACK_CONTROLLER_SOURCE_MANIFEST_DIGEST'
    ),
    false
  );

  const legacy = buildControllerChildEnvironment(environmentFile, {
    profile: legacyProfile({
      privateRoot,
      governanceEnvironment: 'runtime.env',
      relayEnvironment: 'runtime.env',
      retainedBinding: 'binding.json'
    }),
    environment
  });
  assert.equal(
    Object.hasOwn(legacy, 'CODEX_MEMORY_STACK_CONTROLLER_SOURCE_COMMIT'),
    false
  );
  assert.equal(
    Object.hasOwn(legacy, 'CODEX_MEMORY_STACK_PROFILE_SCHEMA_VERSION'),
    false
  );
  assert.equal(
    Object.hasOwn(legacy, 'CODEX_MEMORY_STACK_VCP_RUNTIME_BASELINE'),
    false
  );
  assert.equal(
    Object.hasOwn(legacy, 'CODEX_MEMORY_STACK_VCP_PROVIDER_CONFIG_DIGEST'),
    false
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
    GCONV_PATH: '/untrusted/gconv',
    GLIBC_TUNABLES: 'glibc.malloc.check=3',
    LD_AUDIT: '/untrusted/audit.so',
    LD_PROFILE: '/untrusted/profile.so',
    LD_PRELOAD: '/untrusted.so',
    PYTHONPATH: '/untrusted/python',
    UNRELATED_SECRET: 'must-not-be-inherited',
    CODEX_MEMORY_MCP_PUBLIC_TOOL_SURFACE: 'full',
    CODEX_MEMORY_EXPOSE_WRITE_TOOLS: 'true',
    CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'true',
    CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE: 'jenn-vcp-diary-scope-v1',
    CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST: digest
  };
  const base = childBaseEnvironment(hostile);
  assert.deepEqual(base, { PATH: '/usr/bin:/bin' });
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
    'GCONV_PATH',
    'GLIBC_TUNABLES',
    'LD_AUDIT',
    'LD_PROFILE',
    'LD_PRELOAD',
    'PYTHONPATH',
    'UNRELATED_SECRET',
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

test('native shim exposes an in-process listener entry for the managed PID', () => {
  const shimCli = require('../src/cli/vcp-toolbox-native-mcp-shim');
  assert.equal(typeof shimCli.main, 'function');
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

test('source compatibility accepts a governance-only descendant when the v6 manifest is unchanged', () => {
  const governanceHead = '01'.repeat(20);
  const calls = [];
  const fakeExec = (_command, args) => {
    calls.push(args);
    if (args[0] === 'rev-parse' && args[1] === 'HEAD^{commit}') {
      return `${governanceHead}\n`;
    }
    if (args[0] === 'rev-parse' && args[1] === 'origin/main^{commit}') {
      return `${governanceHead}\n`;
    }
    if (args[0] === 'status' ||
        args[0] === 'cat-file' ||
        args[0] === 'merge-base') return '';
    if (args[0] === 'diff') {
      return 'CURRENT_STATE.md\n.agent_board/CURRENT_FACTS.json\n';
    }
    throw new Error('unexpected git call');
  };
  const result = inspectSourceCompatibility(profile(), {
    exec: fakeExec,
    inspectControllerManifest: () => manifestInspection(),
    repoRoot: '/repo'
  });
  assert.equal(result.compatible, true);
  assert.equal(result.controllerOnlyChanges, false);
  assert.equal(result.controllerSourceMatch, true);
  assert.equal(result.identityMode, 'manifest_v1');
  assert.equal(result.adoptedHeadAncestor, true);
  assert.equal(adoptionSourceCompatible(result), true);
  assert.equal(adoptionSourceCompatible({
    ...result,
    clean: false
  }), false);
  assert.equal(adoptionSourceCompatible({
    ...result,
    currentMain: false
  }), false);
  assert.equal(adoptionSourceCompatible({
    ...result,
    repositoryMatch: false
  }), false);
  assert.equal(adoptionSourceCompatible({
    ...result,
    compatible: false
  }), false);
  assert.ok(calls.length >= 5);
});

test('source compatibility retains exact-head v5 semantics and exposes only the reviewed upgrade path', () => {
  const fakeManifest = () => manifestInspection();
  const exactExec = (_command, args) => {
    if (args[0] === 'rev-parse') {
      return `${V5_CONTROLLER_SOURCE_COMMIT}\n`;
    }
    if (args[0] === 'status' ||
        args[0] === 'cat-file' ||
        args[0] === 'merge-base') return '';
    if (args[0] === 'diff') {
      return `${[...CONTROLLER_CHANGE_PATHS].join('\n')}\n`;
    }
    throw new Error('unexpected git call');
  };
  const exact = inspectSourceCompatibility(v5Profile(), {
    exec: exactExec,
    inspectControllerManifest: fakeManifest,
    repoRoot: '/repo'
  });
  assert.equal(exact.compatible, true);
  assert.equal(exact.controllerSourceMatch, true);
  assert.equal(exact.upgradeEligible, true);
  assert.equal(exact.identityMode, 'exact_commit_v5');

  const futureControllerCommit = '02'.repeat(20);
  const future = inspectSourceCompatibility(v5Profile(), {
    repoRoot: '/repo',
    inspectControllerManifest: fakeManifest,
    exec(_command, args) {
      if (args[0] === 'rev-parse') {
        return `${futureControllerCommit}\n`;
      }
      if (args[0] === 'status' ||
          args[0] === 'cat-file' ||
          args[0] === 'merge-base') return '';
      if (args[0] === 'diff') return 'CURRENT_STATE.md\n';
      throw new Error('unexpected git call');
    }
  });
  assert.equal(future.controllerSourceMatch, false);
  assert.equal(future.compatible, false);
  assert.equal(future.upgradeEligible, true);

  const unreviewed = inspectSourceCompatibility(v5Profile({
    controllerSourceCommit: '03'.repeat(20)
  }), {
    repoRoot: '/repo',
    inspectControllerManifest: fakeManifest,
    exec(_command, args) {
      if (args[0] === 'rev-parse') return `${futureControllerCommit}\n`;
      if (args[0] === 'status' ||
          args[0] === 'cat-file' ||
          args[0] === 'merge-base') return '';
      if (args[0] === 'diff') return '';
      throw new Error('unexpected git call');
    }
  });
  assert.equal(unreviewed.upgradeEligible, false);
});

test('external VCP dynamic module targets remain inside the bound VCP source scope', () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'src',
      'core',
      'GovernedMcpVcpNativeVcpToolBoxMcpShim.js'
    ),
    'utf8'
  );
  const dynamicRequires = [
    ...source.matchAll(
      /\brequire\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)/gu
    )
  ].map(match => match[1]).sort();
  assert.deepEqual(dynamicRequires, [
    'embeddingUtilsPath',
    'knowledgeBaseManagerPath'
  ]);
  const bindings = {
    embeddingUtilsPath: 'EmbeddingUtils.js',
    knowledgeBaseManagerPath: 'KnowledgeBaseManager.js'
  };
  for (const [variable, target] of Object.entries(bindings)) {
    assert.equal(
      source.includes(
        `const ${variable} = path.join(vcpToolBoxRoot, '${target}');`
      ),
      true,
      variable
    );
    assert.equal(VCP_RUNTIME_SOURCE_PATHS.includes(target), true, target);
  }
});

test('transition lifecycle keeps profile persistence inside adoption only', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'scripts', 'codex-memory-stack.js'),
    'utf8'
  );
  const start = source.slice(
    source.indexOf('async function startStack('),
    source.indexOf('async function stopStack(')
  );
  const stop = source.slice(
    source.indexOf('async function stopStack('),
    source.indexOf('async function adoptRunningStack(')
  );
  const adopt = source.slice(
    source.indexOf('async function adoptRunningStack('),
    source.indexOf('function readPrivateText(')
  );
  assert.equal(start.includes('writeProfile('), false);
  assert.equal(stop.includes('writeProfile('), false);
  assert.equal(
    [...adopt.matchAll(/\bwriteProfile\s*\(/gu)].length,
    1
  );
  assert.equal(
    start.includes('profileWithControllerManifestBinding('),
    true
  );
  for (const contract of [
    'accepted: false',
    'transitionRuntimeAccepted: true',
    'profileUpgradeRequired: true'
  ]) {
    assert.equal(start.includes(contract), true, contract);
  }
});

test('legacy source compatibility remains historical and manifest failures reject v6', () => {
  const legacyExec = (_command, args) => {
    if (args[0] === 'rev-parse') return `${CONTROLLER_SOURCE_COMMIT}\n`;
    if (args[0] === 'status' || args[0] === 'cat-file') return '';
    if (args[0] === 'diff') {
      return `${[...CONTROLLER_CHANGE_PATHS].join('\n')}\n`;
    }
    throw new Error('unexpected git call');
  };
  assert.equal(
    inspectSourceCompatibility(legacyProfile(), {
      exec: legacyExec,
      inspectControllerManifest: () => manifestInspection(),
      repoRoot: '/repo'
    }).compatible,
    true
  );

  const unsafe = inspectSourceCompatibility(profile(), {
    repoRoot: '/repo',
    inspectControllerManifest: () => manifestInspection({
      manifestDigest: `sha256:${'ff'.repeat(32)}`
    }),
    exec(_command, args) {
      if (args[0] === 'rev-parse') return `${CONTROLLER_SOURCE_COMMIT}\n`;
      if (args[0] === 'status' ||
          args[0] === 'cat-file' ||
          args[0] === 'merge-base') return '';
      if (args[0] === 'diff') return '';
      throw new Error('unexpected git call');
    }
  });
  assert.equal(unsafe.compatible, false);
  assert.equal(unsafe.controllerSourceMatch, false);
});

test('VCP runtime identity is pinned to the profile-selected commit and clean source scope', () => {
  const repoRoot = '/owner/VCPToolBox';
  const revision = VCP_RUNTIME_BASELINE_BY_CODEX_BASELINE[BASELINE];
  const fsModule = {
    realpathSync(value) {
      return value;
    },
    statSync() {
      return {
        isDirectory: () => true,
        uid: process.getuid(),
        mode: 0o40755
      };
    }
  };
  const inspect = scopedStatus => inspectVcpRuntimeIdentity(profile(), {
    repoRoot,
    expectedRepository: repoRoot,
    canonicalRepository: repoRoot,
    fsModule,
    exec(_command, args) {
      if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') {
        return `${repoRoot}\n`;
      }
      if (args[0] === 'rev-parse' && args[1] === 'HEAD^{commit}') {
        return `${revision}\n`;
      }
      if (args[0] === 'rev-parse' &&
          args[1] === 'refs/remotes/origin/main^{commit}') {
        return `${revision}\n`;
      }
      if (args[0] === 'status') {
        assert.deepEqual(
          args.slice(-VCP_RUNTIME_SOURCE_PATHS.length),
          [...VCP_RUNTIME_SOURCE_PATHS]
        );
        return scopedStatus;
      }
      if (args[0] === 'rev-parse' && args[1].startsWith('HEAD:')) {
        return `${'a'.repeat(40)}\n`;
      }
      throw new Error('unexpected git call');
    }
  });
  const accepted = inspect('');
  const boundProfile = profile({
    vcpRuntimeBaseline: revision,
    vcpRuntimeRepository: repoRoot,
    vcpRuntimeScopeDigest: accepted.scopeDigest
  });
  assert.equal(
    profileVcpRuntimeIdentityMatches(boundProfile, accepted),
    true
  );
  assert.equal(accepted.scopeComplete, true);
  assert.equal(
    profileVcpRuntimeIdentityMatches(
      boundProfile,
      inspect(' M KnowledgeBaseManager.js\n')
    ),
    false
  );
  assert.equal(
    profileVcpRuntimeIdentityMatches(
      {
        ...boundProfile,
        vcpRuntimeBaseline: '0'.repeat(40)
      },
      accepted
    ),
    false
  );
});

test('VCP provider binding pins model and dimension without pinning the API key', () => {
  assert.equal(
    profileVcpProviderConfigMatches(
      profile(),
      VCP_PROVIDER_ENVIRONMENT
    ),
    true
  );
  assert.equal(
    profileVcpProviderConfigMatches(
      profile(),
      {
        ...VCP_PROVIDER_ENVIRONMENT,
        apiKey: 'rotated-synthetic-provider-key'
      }
    ),
    true
  );
  assert.equal(
    profileVcpProviderConfigMatches(
      profile(),
      {
        ...VCP_PROVIDER_ENVIRONMENT,
        model: 'unadopted-model'
      }
    ),
    false
  );
  assert.equal(
    profileVcpProviderConfigMatches(
      profile(),
      {
        ...VCP_PROVIDER_ENVIRONMENT,
        dimension: '2048'
      }
    ),
    false
  );
});

test('provider key rotation invalidates the running shim without persisting key material', t => {
  const root = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'codex-memory-stack-provider-freshness-'
  ));
  const runtimeRoot = path.join(root, 'runtime');
  const pidDirectory = path.join(runtimeRoot, 'pids');
  const providerConfigFile = path.join(root, 'config.env');
  fs.chmodSync(root, 0o700);
  fs.mkdirSync(runtimeRoot, { mode: 0o700 });
  fs.mkdirSync(pidDirectory, { mode: 0o700 });
  fs.writeFileSync(
    providerConfigFile,
    'API_Key=synthetic-provider-key-a\n' +
      'WhitelistEmbeddingModel=synthetic-embedding-model\n' +
      'VECTORDB_DIMENSION=1024\n',
    { mode: 0o600 }
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const snapshot = readVcpProviderEnvironmentSnapshot(providerConfigFile);
  assert.equal(snapshot.providerEnvironment.apiKey, 'synthetic-provider-key-a');
  assert.deepEqual(
    snapshot.fileIdentity,
    ownerFileIdentity(providerConfigFile)
  );
  writeProviderConfigIdentityReceipt({
    controllerSourceManifestDigest: CONTROLLER_SOURCE_MANIFEST_DIGEST,
    controllerSourceManifestVersion: 1,
    providerConfigIdentity: snapshot.fileIdentity,
    schemaVersion: 2,
    shimPid: process.pid,
    shimProcessStartTicks: readLinuxProcessStartTicks(process.pid)
  }, runtimeRoot);
  const receiptText = fs.readFileSync(
    path.join(pidDirectory, 'vcp-provider-config.identity.json'),
    'utf8'
  );
  assert.equal(receiptText.includes('synthetic-provider-key-a'), false);
  assert.equal(receiptText.includes('API_Key'), false);
  assert.equal(
    providerCredentialFreshnessMatches({
      profile: profile(),
      providerConfigFile,
      runtimeRoot,
      shimPid: process.pid
    }),
    true
  );

  writeProviderConfigIdentityReceipt({
    controllerSourceCommit: V5_CONTROLLER_SOURCE_COMMIT,
    providerConfigIdentity: snapshot.fileIdentity,
    schemaVersion: 1,
    shimPid: process.pid,
    shimProcessStartTicks: readLinuxProcessStartTicks(process.pid)
  }, runtimeRoot);
  assert.equal(
    providerCredentialFreshnessMatches({
      profile: v5Profile(),
      providerConfigFile,
      runtimeRoot,
      shimPid: process.pid
    }),
    true
  );
  assert.equal(
    providerCredentialFreshnessMatches({
      profile: profile(),
      providerConfigFile,
      runtimeRoot,
      shimPid: process.pid
    }),
    false
  );
  writeProviderConfigIdentityReceipt({
    controllerSourceManifestDigest: CONTROLLER_SOURCE_MANIFEST_DIGEST,
    controllerSourceManifestVersion: 1,
    providerConfigIdentity: snapshot.fileIdentity,
    schemaVersion: 2,
    shimPid: process.pid,
    shimProcessStartTicks: readLinuxProcessStartTicks(process.pid)
  }, runtimeRoot);

  fs.writeFileSync(
    providerConfigFile,
    'API_Key=rotated-synthetic-provider-key-bb\n' +
      'WhitelistEmbeddingModel=synthetic-embedding-model\n' +
      'VECTORDB_DIMENSION=1024\n',
    { mode: 0o600 }
  );
  assert.equal(
    profileVcpProviderConfigMatches(
      profile(),
      readVcpProviderEnvironmentSnapshot(providerConfigFile)
        .providerEnvironment
    ),
    true
  );
  assert.equal(
    providerCredentialFreshnessMatches({
      profile: profile(),
      providerConfigFile,
      runtimeRoot,
      shimPid: process.pid
    }),
    false
  );
});

test('Governance private-file rotation invalidates the running process without private disclosure', t => {
  const root = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'codex-memory-stack-governance-freshness-'
  ));
  const privateRoot = path.join(root, 'private');
  const runtimeRoot = path.join(root, 'runtime');
  const pidDirectory = path.join(runtimeRoot, 'pids');
  fs.chmodSync(root, 0o700);
  fs.mkdirSync(privateRoot, { mode: 0o700 });
  fs.mkdirSync(runtimeRoot, { mode: 0o700 });
  fs.mkdirSync(pidDirectory, { mode: 0o700 });
  const files = {
    contextSigningPrivateKey: path.join(privateRoot, 'context-private.pem'),
    diaryScopeMapping: path.join(privateRoot, 'mapping.json'),
    edgeSigningPublicKey: path.join(privateRoot, 'edge-public.pem'),
    nativeHttpToken: path.join(privateRoot, 'native-token'),
    operatorSubjectFingerprint: path.join(
      privateRoot,
      'operator-fingerprint'
    ),
    projectRegistry: path.join(privateRoot, 'registry.json')
  };
  for (const [name, file] of Object.entries(files)) {
    fs.writeFileSync(file, `synthetic-${name}-material\n`, { mode: 0o600 });
  }
  const governanceEnvironmentFile = path.join(
    privateRoot,
    'governance.env'
  );
  fs.writeFileSync(
    governanceEnvironmentFile,
    [
      `CODEX_MEMORY_R4_CONTEXT_SIGNING_PRIVATE_KEY_REFERENCE=file:${files.contextSigningPrivateKey}`,
      `CODEX_MEMORY_R4_DIARY_SCOPE_MAPPING_REFERENCE=file:${files.diaryScopeMapping}`,
      `CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY=file:${files.edgeSigningPublicKey}`,
      `CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE=file:${files.nativeHttpToken}`,
      `CODEX_MEMORY_R4_OPERATOR_SUBJECT_FINGERPRINT_REFERENCE=file:${files.operatorSubjectFingerprint}`,
      `CODEX_MEMORY_R4_PROJECT_REGISTRY_REFERENCE=file:${files.projectRegistry}`
    ].join('\n') + '\n',
    { mode: 0o600 }
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const governanceEnvironment = loadManagedEnvironmentFile(
    governanceEnvironmentFile
  );
  const identities = governancePrivateFileIdentities(
    governanceEnvironment,
    privateRoot
  );
  writeGovernancePrivateIdentityReceipt({
    controllerSourceManifestDigest: CONTROLLER_SOURCE_MANIFEST_DIGEST,
    controllerSourceManifestVersion: 1,
    governancePid: process.pid,
    governanceProcessStartTicks: readLinuxProcessStartTicks(process.pid),
    privateFileIdentities: identities,
    schemaVersion: 2
  }, runtimeRoot);
  const receiptText = fs.readFileSync(
    path.join(pidDirectory, 'governance-private-files.identity.json'),
    'utf8'
  );
  assert.equal(receiptText.includes('synthetic-'), false);
  assert.equal(receiptText.includes(privateRoot), false);
  assert.equal(
    receiptText.includes(CONTROLLER_SOURCE_MANIFEST_DIGEST),
    true
  );
  const boundProfile = profile({ privateRoot });
  assert.equal(
    governanceCredentialFreshnessMatches({
      governanceEnvironmentFile,
      governancePid: process.pid,
      profile: boundProfile,
      runtimeRoot
    }),
    true
  );

  fs.writeFileSync(
    files.operatorSubjectFingerprint,
    'rotated-synthetic-operator-fingerprint-material-longer\n',
    { mode: 0o600 }
  );
  assert.equal(
    governanceCredentialFreshnessMatches({
      governanceEnvironmentFile,
      governancePid: process.pid,
      profile: boundProfile,
      runtimeRoot
    }),
    false
  );
});

test('Relay secret-file rotation invalidates the running process without secret disclosure', t => {
  const root = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'codex-memory-stack-relay-freshness-'
  ));
  const privateRoot = path.join(root, 'private');
  const runtimeRoot = path.join(root, 'runtime');
  const pidDirectory = path.join(runtimeRoot, 'pids');
  fs.chmodSync(root, 0o700);
  fs.mkdirSync(privateRoot, { mode: 0o700 });
  fs.mkdirSync(runtimeRoot, { mode: 0o700 });
  fs.mkdirSync(pidDirectory, { mode: 0o700 });
  const files = {
    edgeSigningPublicKey: path.join(privateRoot, 'edge-public.pem'),
    relayAuthToken: path.join(privateRoot, 'relay-token'),
    relaySigningPrivateKey: path.join(privateRoot, 'relay-private.pem'),
    relaySigningPublicKey: path.join(privateRoot, 'relay-public.pem')
  };
  for (const [name, file] of Object.entries(files)) {
    fs.writeFileSync(file, `synthetic-${name}-material\n`, { mode: 0o600 });
  }
  const relayEnvironmentFile = path.join(privateRoot, 'relay.env');
  fs.writeFileSync(
    relayEnvironmentFile,
    [
      `CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY=file:${files.edgeSigningPublicKey}`,
      `CODEX_MEMORY_R4_RELAY_AUTH_TOKEN=file:${files.relayAuthToken}`,
      `CODEX_MEMORY_R4_RELAY_SIGNING_PRIVATE_KEY=file:${files.relaySigningPrivateKey}`,
      `CODEX_MEMORY_R4_RELAY_SIGNING_PUBLIC_KEY=file:${files.relaySigningPublicKey}`
    ].join('\n') + '\n',
    { mode: 0o600 }
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const relayEnvironment = loadManagedEnvironmentFile(relayEnvironmentFile);
  const identities = relaySecretFileIdentities(
    relayEnvironment,
    privateRoot
  );
  writeRelaySecretIdentityReceipt({
    controllerSourceManifestDigest: CONTROLLER_SOURCE_MANIFEST_DIGEST,
    controllerSourceManifestVersion: 1,
    relayPid: process.pid,
    relayProcessStartTicks: readLinuxProcessStartTicks(process.pid),
    schemaVersion: 2,
    secretFileIdentities: identities
  }, runtimeRoot);
  const receiptText = fs.readFileSync(
    path.join(pidDirectory, 'relay-secret-files.identity.json'),
    'utf8'
  );
  assert.equal(receiptText.includes('synthetic-'), false);
  assert.equal(receiptText.includes(privateRoot), false);
  const boundProfile = profile({ privateRoot });
  assert.equal(
    relayCredentialFreshnessMatches({
      profile: boundProfile,
      relayEnvironmentFile,
      relayPid: process.pid,
      runtimeRoot
    }),
    true
  );

  fs.writeFileSync(
    files.relayAuthToken,
    'rotated-synthetic-relay-token-material-longer\n',
    { mode: 0o600 }
  );
  assert.equal(
    relayCredentialFreshnessMatches({
      profile: boundProfile,
      relayEnvironmentFile,
      relayPid: process.pid,
      runtimeRoot
    }),
    false
  );
});

test('legacy profiles bootstrap only reviewed identities into a v6 manifest binding', () => {
  const identity = {
    recognized: true,
    revision: VCP_RUNTIME_BASELINE_BY_CODEX_BASELINE[BASELINE],
    repository: vcpRuntimeRepository(),
    currentMain: true,
    repositoryMatch: true,
    scopeClean: true,
    scopeComplete: true,
    scopeDigest: VCP_SCOPE_DIGEST
  };
  const legacy = legacyProfile();
  assert.equal(legacyVcpRuntimeBootstrapMatches(legacy, identity), true);
  const source = {
    upgradeEligible: true,
    manifestVersion: 1,
    manifestDigest: CONTROLLER_SOURCE_MANIFEST_DIGEST,
    head: CONTROLLER_SOURCE_COMMIT
  };
  const upgraded = profileWithControllerManifestBinding(
    legacy,
    identity,
    VCP_PROVIDER_ENVIRONMENT,
    source,
    {
      governanceEnvironmentConfigDigest:
        GOVERNANCE_ENVIRONMENT_CONFIG_DIGEST,
      relayEnvironmentConfigDigest:
        RELAY_ENVIRONMENT_CONFIG_DIGEST
    }
  );
  assert.equal(upgraded.schemaVersion, 6);
  assert.equal(
    upgraded.adoptedRepositoryHead,
    CONTROLLER_SOURCE_COMMIT
  );
  assert.equal(
    upgraded.controllerSourceManifestDigest,
    CONTROLLER_SOURCE_MANIFEST_DIGEST
  );
  assert.equal(
    upgraded.vcpProviderConfigDigest,
    VCP_PROVIDER_CONFIG_DIGEST
  );
  assert.equal(
    upgraded.governanceEnvironmentConfigDigest,
    GOVERNANCE_ENVIRONMENT_CONFIG_DIGEST
  );
  assert.equal(
    upgraded.relayEnvironmentConfigDigest,
    RELAY_ENVIRONMENT_CONFIG_DIGEST
  );
  assert.equal(upgraded.vcpRuntimeBaseline, identity.revision);
  assert.equal(upgraded.vcpRuntimeRepository, identity.repository);
  assert.equal(upgraded.vcpRuntimeScopeDigest, identity.scopeDigest);
  assert.equal(profileVcpRuntimeIdentityMatches(upgraded, identity), true);
  assert.equal(
    legacyVcpRuntimeBootstrapMatches(upgraded, identity),
    false
  );

  const exactHead = v5Profile();
  const exactHeadIdentity = {
    ...identity,
    repository: exactHead.vcpRuntimeRepository
  };
  const upgradedFromV5 = profileWithControllerManifestBinding(
    exactHead,
    exactHeadIdentity,
    VCP_PROVIDER_ENVIRONMENT,
    source,
    {
      governanceEnvironmentConfigDigest:
        GOVERNANCE_ENVIRONMENT_CONFIG_DIGEST,
      relayEnvironmentConfigDigest:
        RELAY_ENVIRONMENT_CONFIG_DIGEST
    }
  );
  assert.equal(upgradedFromV5.schemaVersion, 6);
  assert.equal(
    Object.hasOwn(upgradedFromV5, 'controllerSourceCommit'),
    false
  );
  assert.throws(
    () => profileWithControllerManifestBinding(
      legacy,
      {
        ...identity,
        scopeDigest: null
      },
      VCP_PROVIDER_ENVIRONMENT,
      source,
      {
        governanceEnvironmentConfigDigest:
          GOVERNANCE_ENVIRONMENT_CONFIG_DIGEST,
        relayEnvironmentConfigDigest:
          RELAY_ENVIRONMENT_CONFIG_DIGEST
      }
    ),
    { code: 'stack_vcp_runtime_identity_mismatch' }
  );
});

test('adoption repository must be the repository bound to the running HTTP process', () => {
  assert.equal(assertAdoptionRepositoryMatch('/repo', '/repo'), true);
  assert.throws(
    () => assertAdoptionRepositoryMatch('/repo-b', '/repo-a'),
    { code: 'stack_adoption_repository_mismatch' }
  );
  assert.throws(
    () => assertAdoptionRepositoryMatch('', '/repo'),
    { code: 'stack_adoption_repository_mismatch' }
  );
  assert.throws(
    () => assertAdoptionRepositoryMatch('/repo', null),
    { code: 'stack_adoption_repository_mismatch' }
  );
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
      '{{ json .NetworkSettings.Ports }}',
      JSON.stringify({
        '3000/tcp': [{ HostIp: '127.0.0.1', HostPort: '3000' }]
      })
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
    '{{ json .NetworkSettings.Ports }}',
    JSON.stringify({
      '3000/tcp': [{ HostIp: '0.0.0.0', HostPort: '3000' }]
    })
  );
  assert.equal(inspect().recognized, false);
  values.set(
    '{{ json .NetworkSettings.Ports }}',
    JSON.stringify({
      '3000/tcp': [{ HostIp: '::1', HostPort: '3000' }]
    })
  );
  assert.equal(inspect().recognized, false);
  values.set(
    '{{ json .NetworkSettings.Ports }}',
    JSON.stringify({
      '3000/tcp': [{ HostIp: '127.0.0.1', HostPort: '3000' }],
      '9000/tcp': [{ HostIp: '0.0.0.0', HostPort: '49000' }]
    })
  );
  assert.equal(inspect().recognized, false);
  values.set(
    '{{ json .NetworkSettings.Ports }}',
    JSON.stringify({
      '3000/tcp': [{ HostIp: '127.0.0.1', HostPort: '3000' }]
    })
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
      '{{ json .HostConfig.PortBindings }}',
      JSON.stringify({
        '8080/tcp': [{ HostIp: '127.0.0.1', HostPort: '49152' }]
      })
    ],
    [
      '{{ json .NetworkSettings.Ports }}',
      JSON.stringify({
        '8080/tcp': [{ HostIp: '127.0.0.1', HostPort: '49152' }]
      })
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
  assert.equal(edge.configurationSecure, true);
  assert.equal(edge.configuredHostLoopbackOnly, true);

  values.set(
    '{{ json .NetworkSettings.Ports }}',
    JSON.stringify({
      '8080/tcp': [{ HostIp: '127.0.0.1', HostPort: '49152' }],
      '9090/tcp': [{ HostIp: '0.0.0.0', HostPort: '49153' }]
    })
  );
  assert.equal(
    inspectEdgeContainer('codex-memory-full-stack-001-edge', {
      exec(_command, args) {
        return `${values.get(args[2])}\n`;
      }
    }).secure,
    false
  );

  values.set('{{ .State.Running }}', 'false');
  values.set(
    '{{ json .NetworkSettings.Ports }}',
    JSON.stringify({})
  );
  values.set(
    '{{ json .HostConfig.PortBindings }}',
    JSON.stringify({
      '8080/tcp': [{ HostIp: '127.0.0.1', HostPort: '' }]
    })
  );
  const stoppedEdge = inspectEdgeContainer(
    'codex-memory-full-stack-001-edge',
    {
      exec(_command, args) {
        return `${values.get(args[2])}\n`;
      }
    }
  );
  assert.equal(stoppedEdge.running, false);
  assert.equal(stoppedEdge.hostLoopbackOnly, false);
  assert.equal(stoppedEdge.configuredHostLoopbackOnly, true);
  assert.equal(stoppedEdge.configurationSecure, true);
  assert.equal(stoppedEdge.secure, true);
  assert.equal(
    profileEdgeIdentityMatches(profile(), stoppedEdge),
    true
  );

  values.set(
    '{{ json .HostConfig.PortBindings }}',
    JSON.stringify({
      '8080/tcp': [{ HostIp: '0.0.0.0', HostPort: '49152' }]
    })
  );
  const unsafeStoppedEdge = inspectEdgeContainer(
    'codex-memory-full-stack-001-edge',
    {
      exec(_command, args) {
        return `${values.get(args[2])}\n`;
      }
    }
  );
  assert.equal(unsafeStoppedEdge.configurationSecure, false);
  assert.equal(unsafeStoppedEdge.secure, false);
  assert.equal(
    profileEdgeIdentityMatches(profile(), unsafeStoppedEdge),
    false
  );
});

test('Edge lifecycle identity requires the exact adopted container ID and revision', () => {
  const edge = {
    id: EDGE_CONTAINER_ID,
    revision: BASELINE,
    configurationSecure: true,
    secure: true
  };
  assert.equal(profileEdgeIdentityMatches(profile(), edge), true);
  assert.equal(
    profileEdgeLifecycleIdentityMatches(profile(), edge),
    true
  );
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
  assert.equal(
    profileEdgeLifecycleIdentityMatches(profile(), {
      ...edge,
      secure: false
    }),
    true
  );
  assert.equal(
    profileEdgeLifecycleIdentityMatches(profile(), {
      ...edge,
      id: 'cd'.repeat(32)
    }),
    false
  );
  assert.equal(
    profileEdgeLifecycleIdentityMatches(profile(), {
      ...edge,
      revision: RETAINED_BINDING_SOURCE
    }),
    false
  );
  assert.equal(
    profileEdgeLifecycleIdentityMatches(profile(), {
      ...edge,
      configurationSecure: false
    }),
    false
  );
});

test('stack acceptance requires HTTP authentication and every pinned identity', () => {
  const accepted = acceptedStack();
  assert.equal(computeRuntimeAccepted(accepted), true);
  assert.equal(computeStackAccepted(accepted), true);
  const historicalV5 = {
    ...accepted,
    profile: v5Profile()
  };
  assert.equal(computeRuntimeAccepted(historicalV5), true);
  assert.equal(computeStackAccepted(historicalV5), false);
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
  for (const name of ['shim', 'http', 'governance', 'relay']) {
    assert.equal(
      computeStackAccepted({
        ...accepted,
        processes: {
          ...accepted.processes,
          [name]: {
            ...accepted.processes[name],
            controllerManaged: false
          }
        }
      }),
      false,
      name
    );
  }
  assert.equal(
    computeStackAccepted({
      ...accepted,
      vcpProviderConfigMatch: false
    }),
    false
  );
  assert.equal(
    computeStackAccepted({
      ...accepted,
      managedEnvironmentConfigMatch: false
    }),
    false
  );
  assert.equal(
    computeStackAccepted({
      ...accepted,
      vcpProviderCredentialFresh: false
    }),
    false
  );
  assert.equal(
    computeStackAccepted({
      ...accepted,
      governanceCredentialFresh: false
    }),
    false
  );
  assert.equal(
    computeStackAccepted({
      ...accepted,
      relayCredentialFresh: false
    }),
    false
  );
  assert.equal(
    computeStackAccepted({
      ...accepted,
      vcpRuntime: {
        ...accepted.vcpRuntime,
        scopeClean: false
      }
    }),
    false
  );
  assert.equal(
    computeStackAccepted({
      ...accepted,
      shimListenerOwned: false
    }),
    false
  );
  assert.equal(
    computeStackAccepted({
      ...accepted,
      httpListenerOwned: false
    }),
    false
  );
  assert.equal(
    computeStackAccepted({
      ...accepted,
      governanceListenerOwned: false
    }),
    false
  );
  assert.equal(
    computeStackAccepted({
      ...accepted,
      governanceDataListenerOwned: false
    }),
    false
  );
  assert.equal(
    computeStackAccepted({
      ...accepted,
      relayListenerOwned: false
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
      activeMemoryAutoRebuildEnabled: false,
      candidateCacheEnabled: false,
      controlledMutationToolsExposed: false,
      securityProfile: 'hardened',
      softReadPolicyEnabled: true,
      lifecycleReadPolicyEnabled: true,
      writePreflightEnabled: true,
      externalProviderAllowed: false,
      governedNativeBridgeWarnings: [],
      mcpPublicToolSurface: 'read_only',
      nativeWriteDelegationMode: 'off',
      shadowAutoRebuildEnabled: false,
      shadowWritesEnabled: false,
      vectorIndexEnabled: false,
      writeToolsExposed: false
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
  for (const key of [
    'activeMemoryAutoRebuildEnabled',
    'candidateCacheEnabled',
    'shadowAutoRebuildEnabled',
    'shadowWritesEnabled',
    'vectorIndexEnabled'
  ]) {
    assert.equal(
      projectHttpHealthPayload({
        ...payload,
        policyGates: {
          ...payload.policyGates,
          [key]: true
        }
      }, 200).policyFailureCode,
      'stack_http_storage_mutation_policy_invalid',
      key
    );
  }
  for (const [key, value] of [
    ['mcpPublicToolSurface', 'full'],
    ['controlledMutationToolsExposed', true],
    ['writeToolsExposed', true],
    ['nativeWriteDelegationMode', 'primary']
  ]) {
    assert.equal(
      projectHttpHealthPayload({
        ...payload,
        policyGates: {
          ...payload.policyGates,
          [key]: value
        }
      }, 200).policyFailureCode,
      'stack_http_write_surface_policy_invalid',
      key
    );
  }
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
