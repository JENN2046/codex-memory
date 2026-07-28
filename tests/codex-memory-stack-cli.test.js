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
  assertRelativeReference,
  commandMatchesComponent,
  discoverPrivateRoot,
  exactKeys,
  extractEnvFileArgument,
  inspectEdgeContainer,
  inspectSourceCompatibility,
  isPidRunning,
  lowDisclosureGovernanceProjection,
  lowDisclosureRelayProjection,
  parsePid,
  prepareStaleOwnerSocket,
  safeCode,
  validateProfile
} = require('../scripts/codex-memory-stack');

const BASELINE = '3a0ca59fe2c0f3721d46513d7d6593cbe55b1118';

function profile(overrides = {}) {
  return {
    schemaVersion: 1,
    runtimeBaseline: BASELINE,
    privateRoot: '/synthetic/owner-only',
    governanceEnvironment: 'governance/runtime.env',
    relayEnvironment: 'relay/runtime.env',
    retainedBinding: 'r5m-exact-head/private-binding.json',
    edgeContainer: 'codex-memory-full-stack-001-edge',
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
  assert.throws(
    () => extractEnvFileArgument(['node', '--env-file=relative.env', 'runner.js']),
    { code: 'stack_process_env_file_invalid' }
  );
  assert.throws(
    () => extractEnvFileArgument(['node', 'runner.js']),
    { code: 'stack_process_env_file_missing' }
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

test('managed command matching accepts current and persistent runners only', () => {
  assert.equal(commandMatchesComponent('governance', [
    'node',
    '/runtime/governance-runner.js'
  ]), true);
  assert.equal(commandMatchesComponent('governance', [
    'node',
    '/repo/scripts/codex-memory-stack.js',
    '_run-governance'
  ]), true);
  assert.equal(commandMatchesComponent('governance', [
    'node',
    '/other/unrelated.js'
  ]), false);
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
  const result = inspectSourceCompatibility(profile(), { exec: fakeExec });
  assert.equal(result.compatible, true);
  assert.equal(result.controllerOnlyChanges, true);
  assert.ok(calls.length >= 5);

  const unsafe = inspectSourceCompatibility(profile(), {
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

test('Edge inspection validates non-root, read-only, non-restarting, logless loopback posture', () => {
  const values = new Map([
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
