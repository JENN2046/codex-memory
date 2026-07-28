'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  createLowDisclosureRelayObserver,
  projectLowDisclosureRelayObservation
} = require('../../apps/local-recall-relay/low-disclosure-observer');
const {
  createObserverSnapshotUdsServer,
  prepareObserverSnapshotSocketPath,
  validateOwnerOnlySnapshotSocketPath,
  validateSnapshotRequest
} = require('../../apps/local-recall-relay/observer-snapshot-uds');
const {
  createCanonicalOutboundRelayService,
  createOutboundRelayService
} = require('../../apps/local-recall-relay/outbound-main');

test('Relay observation projection is exact-key and rejects disclosure drift', () => {
  const observer = createLowDisclosureRelayObserver();
  observer.observe({
    component: 'outbound_relay',
    event: 'request_failed',
    request_id: 'must-never-be-retained',
    failure_stage: 'complete',
    error_code: 'relay_edge_timeout'
  });
  const projected = projectLowDisclosureRelayObservation(observer.snapshot());
  assert.equal(projected.completion_state, 'edge_completion_unconfirmed');
  assert.equal(projected.last_error_code, 'relay_edge_timeout');
  assert.equal(JSON.stringify(projected).includes('must-never-be-retained'), false);

  assert.throws(() => projectLowDisclosureRelayObservation({
    ...projected,
    unexpected_raw_detail: 'forbidden'
  }), { code: 'relay_observer_snapshot_invalid' });
  assert.throws(() => projectLowDisclosureRelayObservation({
    ...projected,
    secret_values_retained: true
  }), { code: 'relay_observer_snapshot_disclosure_invalid' });
  assert.throws(() => projectLowDisclosureRelayObservation({
    ...projected,
    last_error_code: 'unsafe error detail'
  }), { code: 'relay_observer_snapshot_invalid' });
  assert.throws(() => projectLowDisclosureRelayObservation({
    ...projected,
    requests_failed: Number.MAX_SAFE_INTEGER + 1
  }), { code: 'relay_observer_snapshot_invalid' });
});

test('owner-only Relay observer UDS exposes only the governed read-only snapshot', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-relay-observer-'));
  fs.chmodSync(root, 0o700);
  const socketPath = path.join(root, 'observer.sock');
  const observer = createLowDisclosureRelayObserver();
  let unsafeProjection = false;
  const server = createObserverSnapshotUdsServer({
    socketPath,
    readObservation() {
      const snapshot = observer.snapshot();
      return unsafeProjection
        ? { ...snapshot, response_bodies_retained: true }
        : snapshot;
    }
  });
  t.after(async () => {
    await server.stop().catch(() => {});
    fs.rmSync(root, { recursive: true, force: true });
  });

  observer.observe({
    component: 'outbound_relay',
    event: 'claim_received',
    request_id: 'req_private_identifier_never_exposed',
    attempt: 1
  });
  const started = await server.start();
  assert.deepEqual(started, {
    started: true,
    owner_only_socket: true,
    read_only: true
  });
  const socketStat = fs.lstatSync(socketPath);
  assert.equal(socketStat.isSocket(), true);
  assert.equal(socketStat.mode & 0o777, 0o600);

  const valid = await exchange(socketPath, {
    schema_version: 1,
    operation: 'snapshot'
  });
  assert.equal(valid.error, null);
  const response = JSON.parse(valid.data);
  assert.equal(response.schema_version, 1);
  assert.equal(response.operation, 'snapshot');
  assert.equal(response.observation.completion_state, 'claimed');
  assert.equal(response.observation.claims_received, 1);
  assert.equal(
    JSON.stringify(response).includes('req_private_identifier_never_exposed'),
    false
  );
  assert.deepEqual(
    Object.keys(response).sort(),
    ['observation', 'operation', 'schema_version']
  );

  const extraField = await exchange(socketPath, {
    schema_version: 1,
    operation: 'snapshot',
    request_id: 'not-accepted'
  });
  assert.equal(extraField.data, '');

  unsafeProjection = true;
  const unsafe = await exchange(socketPath, {
    schema_version: 1,
    operation: 'snapshot'
  });
  assert.equal(unsafe.data, '');

  const snapshot = server.snapshot();
  assert.equal(snapshot.accepted_frames, 1);
  assert.equal(snapshot.rejected_frames, 2);
  assert.equal(snapshot.owner_only_socket, true);
  assert.equal(snapshot.read_only, true);
  assert.equal(snapshot.durable_state_written, false);
  assert.equal(snapshot.request_bodies_logged, 0);
  assert.equal(snapshot.response_bodies_logged, 0);

  await server.stop();
  assert.equal(fs.existsSync(socketPath), false);
});

test('Relay observer UDS releases handled connections whose clients keep writing open', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-relay-observer-half-open-'));
  fs.chmodSync(root, 0o700);
  const socketPath = path.join(root, 'observer.sock');
  const server = createObserverSnapshotUdsServer({
    socketPath,
    readObservation: () => createLowDisclosureRelayObserver().snapshot()
  });
  t.after(async () => {
    await server.stop().catch(() => {});
    fs.rmSync(root, { recursive: true, force: true });
  });
  await server.start();

  for (let index = 0; index < 5; index += 1) {
    const held = await exchangeHoldingWriteOpen(socketPath, {
      schema_version: 1,
      operation: 'snapshot'
    });
    try {
      assert.equal(JSON.parse(held.data).operation, 'snapshot');
      await waitForCondition(() => server.snapshot().active_connections === 0);
    } finally {
      held.socket.destroy();
    }
  }
  const snapshot = server.snapshot();
  assert.equal(snapshot.connections, 5);
  assert.equal(snapshot.accepted_frames, 5);
  assert.equal(snapshot.rejected_frames, 0);
  assert.equal(snapshot.active_connections, 0);
});

test('Relay observer UDS rejects permissive or non-canonical parent authority', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-relay-observer-parent-'));
  const target = path.join(root, 'target');
  const link = path.join(root, 'link');
  fs.mkdirSync(target, { mode: 0o700 });
  fs.symlinkSync(target, link);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.chmodSync(target, 0o755);
  assert.throws(() => validateOwnerOnlySnapshotSocketPath(
    path.join(target, 'observer.sock')
  ), { code: 'relay_observer_snapshot_parent_security_invalid' });

  fs.chmodSync(target, 0o700);
  assert.throws(() => validateOwnerOnlySnapshotSocketPath(
    path.join(link, 'observer.sock')
  ), { code: 'relay_observer_snapshot_parent_security_invalid' });

  assert.throws(() => validateSnapshotRequest({
    schema_version: 1,
    operation: 'status'
  }), { code: 'relay_observer_snapshot_request_invalid' });
});

test('Relay observer UDS revalidates parent authority after bind', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-relay-observer-drift-'));
  fs.chmodSync(root, 0o700);
  const socketPath = path.join(root, 'observer.sock');
  let parentStatCalls = 0;
  const server = createObserverSnapshotUdsServer({
    socketPath,
    readObservation: () => createLowDisclosureRelayObserver().snapshot(),
    statSync(candidate) {
      const stat = fs.statSync(candidate);
      if (candidate === root) {
        parentStatCalls += 1;
        if (parentStatCalls === 4) {
          return Object.assign(Object.create(stat), {
            mode: stat.mode | 0o077
          });
        }
      }
      return stat;
    }
  });
  t.after(async () => {
    await server.stop().catch(() => {});
    fs.rmSync(root, { recursive: true, force: true });
  });

  await assert.rejects(server.start(), {
    code: 'relay_observer_snapshot_socket_security_invalid'
  });
  assert.equal(fs.existsSync(socketPath), false);
});

test('Relay observer UDS recovers probed-stale owner sockets across final and pre-chmod modes', {
  skip: process.platform !== 'linux' || typeof process.getuid !== 'function'
}, async () => {
  for (const staleMode of [0o600, 0o755]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-relay-observer-stale-'));
    fs.chmodSync(root, 0o700);
    const socketPath = path.join(root, 'observer.sock');
    let server = null;
    try {
      await leaveCrashLeftSocket(socketPath, { socketMode: staleMode });
      const staleStat = fs.lstatSync(socketPath);
      assert.equal(staleStat.isSocket(), true);
      assert.equal(staleStat.uid, process.getuid());
      assert.equal(staleStat.mode & 0o777, staleMode);

      const observer = createLowDisclosureRelayObserver();
      server = createObserverSnapshotUdsServer({
        socketPath,
        readObservation: observer.snapshot
      });
      await server.start();
      const reboundStat = fs.lstatSync(socketPath);
      assert.equal(reboundStat.isSocket(), true);
      assert.equal(reboundStat.uid, process.getuid());
      assert.equal(reboundStat.mode & 0o777, 0o600);
      const response = await exchange(socketPath, {
        schema_version: 1,
        operation: 'snapshot'
      });
      assert.equal(JSON.parse(response.data).observation.completion_state, 'idle');
    } finally {
      await server?.stop().catch(() => {});
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test('Relay observer UDS revalidates owner-only parent authority before stale unlink', {
  skip: process.platform !== 'linux' || typeof process.getuid !== 'function'
}, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-relay-observer-parent-race-'));
  fs.chmodSync(root, 0o700);
  const socketPath = path.join(root, 'observer.sock');
  await leaveCrashLeftSocket(socketPath, { socketMode: 0o755 });
  const server = createObserverSnapshotUdsServer({
    socketPath,
    readObservation: () => createLowDisclosureRelayObserver().snapshot(),
    async probeSocket() {
      fs.chmodSync(root, 0o755);
      return 'stale';
    }
  });
  t.after(async () => {
    fs.chmodSync(root, 0o700);
    await server.stop().catch(() => {});
    fs.rmSync(root, { recursive: true, force: true });
  });

  await assert.rejects(server.start(), {
    code: 'relay_observer_snapshot_parent_security_invalid'
  });
  assert.equal(fs.lstatSync(socketPath).isSocket(), true);
});

test('Relay observer UDS serializes concurrent stale-socket recovery', {
  skip: process.platform !== 'linux' || typeof process.getuid !== 'function'
}, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-relay-observer-race-'));
  fs.chmodSync(root, 0o700);
  const socketPath = path.join(root, 'observer.sock');
  await leaveCrashLeftSocket(socketPath);
  const candidates = [0, 1].map(() => createObserverSnapshotUdsServer({
    socketPath,
    readObservation: () => createLowDisclosureRelayObserver().snapshot()
  }));
  t.after(async () => {
    await Promise.all(candidates.map(server => server.stop().catch(() => {})));
    fs.rmSync(root, { recursive: true, force: true });
  });

  const results = await Promise.allSettled(candidates.map(server => server.start()));
  const fulfilled = results.filter(result => result.status === 'fulfilled');
  const rejected = results.filter(result => result.status === 'rejected');
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.match(
    rejected[0].reason?.code || '',
    /^relay_observer_snapshot_(?:startup_lock_busy|socket_active)$/
  );
  const liveStat = fs.lstatSync(socketPath);
  assert.equal(liveStat.isSocket(), true);
  assert.equal(liveStat.uid, process.getuid());
  assert.equal(liveStat.mode & 0o777, 0o600);
  const response = await exchange(socketPath, {
    schema_version: 1,
    operation: 'snapshot'
  });
  assert.equal(JSON.parse(response.data).observation.completion_state, 'idle');
});

test('Relay observer UDS refuses to unlink an active owner socket', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-relay-observer-active-'));
  fs.chmodSync(root, 0o700);
  const socketPath = path.join(root, 'observer.sock');
  const activeServer = net.createServer(socket => socket.destroy());
  const candidateServer = createObserverSnapshotUdsServer({
    socketPath,
    readObservation: () => createLowDisclosureRelayObserver().snapshot()
  });
  t.after(async () => {
    await candidateServer.stop().catch(() => {});
    await new Promise(resolve => activeServer.close(() => resolve()));
    fs.rmSync(root, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    activeServer.once('error', reject);
    activeServer.listen(socketPath, resolve);
  });
  fs.chmodSync(socketPath, 0o600);

  await assert.rejects(candidateServer.start(), {
    code: 'relay_observer_snapshot_socket_active'
  });
  assert.equal(fs.lstatSync(socketPath).isSocket(), true);
});

test('stale socket cleanup rejects unsafe candidates and identity drift', async () => {
  const authority = {
    socketPath: '/synthetic/owner-only/observer.sock',
    ownerUid: 1000
  };
  const socketStat = (overrides = {}) => ({
    dev: 1,
    ino: 2,
    uid: 1000,
    mode: 0o140600,
    isSocket: () => true,
    ...overrides
  });

  for (const unsafe of [
    socketStat({ isSocket: () => false }),
    socketStat({ uid: 1001 })
  ]) {
    await assert.rejects(prepareObserverSnapshotSocketPath(authority, {
      lstatSync: () => unsafe,
      probeSocket: () => assert.fail('unsafe candidate must not be probed'),
      revalidateParentAuthority: () => true,
      unlinkSync: () => assert.fail('unsafe candidate must not be unlinked')
    }), { code: 'relay_observer_snapshot_stale_socket_candidate_invalid' });
  }

  let parentRevalidations = 0;
  let permissiveStaleUnlinked = false;
  assert.equal(await prepareObserverSnapshotSocketPath(authority, {
    lstatSync: () => socketStat({ mode: 0o140755 }),
    probeSocket: async () => 'stale',
    revalidateParentAuthority() {
      parentRevalidations += 1;
    },
    unlinkSync(candidate) {
      assert.equal(candidate, authority.socketPath);
      permissiveStaleUnlinked = true;
    }
  }), true);
  assert.equal(parentRevalidations, 2);
  assert.equal(permissiveStaleUnlinked, true);

  let calls = 0;
  await assert.rejects(prepareObserverSnapshotSocketPath(authority, {
    lstatSync() {
      calls += 1;
      return calls === 1 ? socketStat() : socketStat({ ino: 3 });
    },
    probeSocket: async () => 'stale',
    revalidateParentAuthority: () => true,
    unlinkSync: () => assert.fail('identity drift must not be unlinked')
  }), { code: 'relay_observer_snapshot_socket_identity_changed' });

  await assert.rejects(prepareObserverSnapshotSocketPath(authority, {
    lstatSync: () => socketStat(),
    probeSocket: async () => 'uncertain',
    revalidateParentAuthority: () => true,
    unlinkSync: () => assert.fail('uncertain liveness must not be unlinked')
  }), { code: 'relay_observer_snapshot_socket_probe_uncertain' });
});

test('canonical Relay service wires observer events and brackets snapshot UDS lifetime', async () => {
  const environment = {
    CODEX_MEMORY_R5_RELAY_OBSERVER_UDS_PATH: '/synthetic/owner-only/observer.sock'
  };
  let eventSink;
  let readObservation;
  let snapshotStarts = 0;
  let snapshotStops = 0;
  let service;
  const snapshotServer = {
    async start() {
      snapshotStarts += 1;
    },
    async stop() {
      snapshotStops += 1;
    },
    snapshot() {
      return {
        started: snapshotStarts > snapshotStops,
        read_only: true,
        durable_state_written: false
      };
    }
  };

  service = createCanonicalOutboundRelayService({
    environment,
    createSnapshotServer(options) {
      assert.equal(
        options.socketPath,
        environment.CODEX_MEMORY_R5_RELAY_OBSERVER_UDS_PATH
      );
      readObservation = options.readObservation;
      return snapshotServer;
    },
    loadRuntime(receivedEnvironment, options) {
      assert.equal(receivedEnvironment, environment);
      eventSink = options.eventSink;
      return {
        async processNext() {
          eventSink({
            component: 'outbound_relay',
            event: 'claim_received',
            request_id: 'not-retained',
            attempt: 1
          });
          service.stop();
          return { status: 'completed' };
        }
      };
    }
  });

  await service.run();
  assert.equal(snapshotStarts, 1);
  assert.equal(snapshotStops, 1);
  assert.equal(readObservation().claims_received, 1);
  assert.equal(JSON.stringify(readObservation()).includes('not-retained'), false);
  assert.deepEqual(service.snapshot(), {
    running: false,
    stopping: true,
    observer_snapshot_exposed: true,
    observer_snapshot: {
      started: false,
      read_only: true,
      durable_state_written: false
    }
  });
});

test('Relay service clears running state when snapshot shutdown fails', async () => {
  let processAttempts = 0;
  let snapshotStarts = 0;
  let snapshotStops = 0;
  let service;
  const snapshotServer = {
    async start() {
      snapshotStarts += 1;
    },
    async stop() {
      snapshotStops += 1;
      throw Object.assign(new Error('synthetic snapshot stop failure'), {
        code: 'relay_observer_snapshot_stop_failed'
      });
    },
    snapshot() {
      return { started: snapshotStarts > snapshotStops };
    }
  };
  service = createOutboundRelayService({
    runtime: {
      async processNext() {
        processAttempts += 1;
        service.stop();
        return { status: 'completed' };
      }
    },
    snapshotServer,
    idlePollMs: 10,
    unavailableBackoffMs: 10
  });

  await assert.rejects(service.run(), {
    code: 'relay_observer_snapshot_stop_failed'
  });
  assert.equal(service.snapshot().running, false);
  await assert.rejects(service.run(), {
    code: 'relay_observer_snapshot_stop_failed'
  });
  assert.equal(service.snapshot().running, false);
  assert.equal(processAttempts, 1);
  assert.equal(snapshotStarts, 2);
  assert.equal(snapshotStops, 2);
});

test('Relay service preserves its primary failure when snapshot shutdown also fails', async () => {
  const service = createOutboundRelayService({
    runtime: {
      async processNext() {
        throw Object.assign(new Error('synthetic Relay failure'), {
          code: 'relay_processing_failed'
        });
      }
    },
    snapshotServer: {
      async start() {},
      async stop() {
        throw Object.assign(new Error('synthetic snapshot stop failure'), {
          code: 'relay_observer_snapshot_stop_failed'
        });
      },
      snapshot() {
        return { started: true };
      }
    },
    idlePollMs: 10,
    unavailableBackoffMs: 10
  });

  await assert.rejects(service.run(), { code: 'relay_processing_failed' });
  assert.equal(service.snapshot().running, false);
});

test('canonical Relay fails closed before runtime loading when snapshot config is absent', () => {
  let runtimeLoaded = false;
  assert.throws(() => createCanonicalOutboundRelayService({
    environment: {},
    createSnapshotServer() {
      assert.fail('snapshot server must not be created without its path');
    },
    loadRuntime() {
      runtimeLoaded = true;
      return { processNext() {} };
    }
  }), { code: 'relay_observer_snapshot_environment_missing' });
  assert.equal(runtimeLoaded, false);
});

test('canonical Relay validates owner-only snapshot authority before loading secret-bound runtime', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-relay-observer-order-'));
  fs.chmodSync(root, 0o755);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  let runtimeLoaded = false;

  assert.throws(() => createCanonicalOutboundRelayService({
    environment: {
      CODEX_MEMORY_R5_RELAY_OBSERVER_UDS_PATH: path.join(root, 'observer.sock')
    },
    loadRuntime() {
      runtimeLoaded = true;
      return { processNext() {} };
    }
  }), { code: 'relay_observer_snapshot_parent_security_invalid' });
  assert.equal(runtimeLoaded, false);
});

test('canonical outbound-main entrypoint cannot bypass observer wiring factory', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../../apps/local-recall-relay/outbound-main.js'),
    'utf8'
  );
  const mainBody = source.match(/async function main\(\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(mainBody, /createCanonicalOutboundRelayService\(\)/u);
  assert.doesNotMatch(mainBody, /loadOutboundRelayRuntimeFromEnvironment/u);
});

async function leaveCrashLeftSocket(socketPath, { socketMode = 0o600 } = {}) {
  const child = childProcess.spawn(process.execPath, [
    '-e',
    [
      "const net = require('node:net');",
      'const socketPath = process.argv[1];',
      'const server = net.createServer(socket => socket.destroy());',
      'server.listen(socketPath, () => {',
      "  if (process.send) process.send('ready');",
      '});'
    ].join('\n'),
    socketPath
  ], {
    stdio: ['ignore', 'ignore', 'ignore', 'ipc']
  });
  await new Promise((resolve, reject) => {
    let ready = false;
    child.once('message', message => {
      if (message !== 'ready') return reject(new Error('stale fixture readiness invalid'));
      ready = true;
      resolve();
    });
    child.once('error', reject);
    child.once('exit', () => {
      if (!ready) reject(new Error('stale fixture exited before readiness'));
    });
  });
  fs.chmodSync(socketPath, socketMode);
  if (child.exitCode !== null || child.signalCode !== null) {
    throw new Error('stale fixture exited before crash simulation');
  }
  const childExit = once(child, 'exit');
  if (!child.kill('SIGKILL')) {
    throw new Error('stale fixture crash simulation failed');
  }
  await childExit;
}

function exchange(socketPath, payload) {
  return new Promise(resolve => {
    const socket = net.createConnection(socketPath);
    const chunks = [];
    let error = null;
    let settled = false;
    const timer = setTimeout(() => {
      socket.destroy();
      finish();
    }, 2000);

    function finish() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        data: Buffer.concat(chunks).toString('utf8'),
        error
      });
    }

    socket.once('connect', () => {
      socket.end(`${JSON.stringify(payload)}\n`);
    });
    socket.on('data', chunk => chunks.push(chunk));
    socket.on('error', observed => {
      error = observed.code || 'socket_error';
    });
    socket.once('close', finish);
  });
}

function exchangeHoldingWriteOpen(socketPath, payload) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      path: socketPath,
      allowHalfOpen: true
    });
    const chunks = [];
    let settled = false;
    const timer = setTimeout(() => {
      socket.destroy();
      finish(new Error('half-open snapshot exchange timed out'));
    }, 2000);

    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve({
        socket,
        data: Buffer.concat(chunks).toString('utf8')
      });
    }

    socket.once('connect', () => {
      socket.write(`${JSON.stringify(payload)}\n`);
    });
    socket.on('data', chunk => chunks.push(chunk));
    socket.once('end', () => finish());
    socket.once('error', finish);
  });
}

async function waitForCondition(predicate, timeoutMs = 500) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error('condition wait timed out');
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
