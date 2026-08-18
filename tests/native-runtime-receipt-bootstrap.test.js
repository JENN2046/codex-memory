'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const {
  containerConfigDigest,
  validateEdgeReceipt,
  validateProviderReceipt
} = require('../src/runtime/native-image/runtime-authority');
const {
  EPHEMERAL_RECEIPT_PLACEHOLDER_SCHEMA,
  prepareEphemeralReceiptMountSources
} = require('../deploy/native-runtime/host-launcher');

const EDGE_RECEIPT = '/run/codex-memory/edge-receipt.json';
const PROVIDER_RECEIPT = '/run/codex-memory/provider-receipt.json';
const I = value => String(value).repeat(64).slice(0, 64);

function error(code) { return Object.assign(new Error(code), { code }); }

function memoryFilesystem(mutations = {}) {
  let nextDescriptor = 10;
  let nextInode = 10;
  const descriptors = new Map();
  const openCalls = [];
  const fsyncCalls = [];
  const nodes = new Map([
    ['/', { gid: 0, inode: 1, mode: 0o755, type: 'directory', uid: 0 }],
    ['/run', { gid: 0, inode: 2, mode: 0o755, type: 'directory', uid: 0 }],
    ['/run/codex-memory', {
      gid: 0, inode: 3, mode: 0o700, type: 'directory', uid: 0
    }]
  ]);
  for (const [file, value] of Object.entries(mutations.files || {})) {
    nodes.set(file, {
      bytes: Buffer.from(value.bytes || 'existing-receipt'),
      gid: value.gid ?? 0,
      inode: nextInode++,
      mode: value.mode ?? 0o644,
      target: value.target,
      type: value.type || 'file',
      uid: value.uid ?? 0
    });
  }
  if (mutations.root) Object.assign(nodes.get('/run/codex-memory'), mutations.root);

  function stat(node) {
    return {
      dev: 1,
      gid: node.gid,
      ino: node.inode,
      mode: node.mode,
      size: node.bytes?.length || 0,
      uid: node.uid,
      isDirectory: () => node.type === 'directory',
      isFile: () => node.type === 'file',
      isSymbolicLink: () => node.type === 'symlink'
    };
  }
  function nodeFor(target) {
    const node = nodes.get(target);
    if (!node) throw error('ENOENT');
    return node;
  }
  const api = {
    closeSync(descriptor) { descriptors.delete(descriptor); },
    fchmodSync(descriptor, mode) { descriptors.get(descriptor).mode = mode; },
    fchownSync(descriptor, uid, gid) {
      Object.assign(descriptors.get(descriptor), { uid, gid });
    },
    fstatSync(descriptor) { return stat(descriptors.get(descriptor)); },
    fsyncSync(descriptor) { fsyncCalls.push(descriptor); },
    lstatSync(target) { return stat(nodeFor(target)); },
    openSync(target, flags, mode) {
      openCalls.push({ flags, mode, target });
      let node = nodes.get(target);
      if ((flags & fs.constants.O_CREAT) !== 0) {
        if (node && (flags & fs.constants.O_EXCL) !== 0) throw error('EEXIST');
        node = { bytes: Buffer.alloc(0), gid: 0, inode: nextInode++, mode,
          type: 'file', uid: 0 };
        nodes.set(target, node);
      } else if (!node) {
        throw error('ENOENT');
      }
      if (node.type === 'symlink' && (flags & (fs.constants.O_NOFOLLOW || 0)) !== 0) {
        throw error('ELOOP');
      }
      const descriptor = nextDescriptor++;
      descriptors.set(descriptor, node);
      return descriptor;
    },
    realpathSync(target) {
      const node = nodeFor(target);
      return node.type === 'symlink' ? node.target : target;
    },
    writeFileSync(descriptor, bytes) {
      descriptors.get(descriptor).bytes = Buffer.from(bytes);
    },
    _bytes(target) { return Buffer.from(nodeFor(target).bytes); },
    _node(target) { return nodeFor(target); },
    _openCalls: openCalls,
    _fsyncCalls: fsyncCalls
  };
  return api;
}

function fixture({ running = false, runtimeMountSources = {} } = {}) {
  const runtime = {
    Config: {}, HostConfig: {}, Id: I('a'), Mounts: [], State: { Running: running }
  };
  const authority = {
    containerConfigDigest: containerConfigDigest(runtime),
    expectedRuntimeContainerId: runtime.Id,
    runtimeMountSources: {
      edgeReceipt: EDGE_RECEIPT,
      providerReceipt: PROVIDER_RECEIPT,
      ...runtimeMountSources
    }
  };
  const execFile = () => JSON.stringify([runtime]);
  return { authority, execFile, runtime };
}

function expectCode(fn, code) {
  assert.throws(fn, value => value?.code === code);
}

test('cold boot absence creates exact durable placeholders for a stopped Runtime', () => {
  const fsModule = memoryFilesystem();
  const { authority, execFile } = fixture();
  const result = prepareEphemeralReceiptMountSources(authority, { execFile, fsModule });
  assert.deepEqual(result.created, ['edge', 'provider']);
  assert.deepEqual(result.preserved, []);
  for (const file of [EDGE_RECEIPT, PROVIDER_RECEIPT]) {
    const node = fsModule._node(file);
    assert.equal(node.uid, 0);
    assert.equal(node.gid, 0);
    assert.equal(node.mode, 0o644);
    const placeholder = JSON.parse(fsModule._bytes(file));
    assert.deepEqual(placeholder, {
      placeholder: true,
      schemaVersion: EPHEMERAL_RECEIPT_PLACEHOLDER_SCHEMA
    });
    assert.throws(() => validateEdgeReceipt(placeholder, {}, { now: 1 }));
    assert.throws(() => validateProviderReceipt(placeholder, {}, { now: 1 }));
  }
  const createCalls = fsModule._openCalls.filter(call =>
    [EDGE_RECEIPT, PROVIDER_RECEIPT].includes(call.target) &&
    (call.flags & fs.constants.O_CREAT) !== 0);
  assert.equal(createCalls.length, 2);
  for (const call of createCalls) {
    assert.notEqual(call.flags & fs.constants.O_CREAT, 0);
    assert.notEqual(call.flags & fs.constants.O_EXCL, 0);
    assert.notEqual(call.flags & fs.constants.O_NOFOLLOW, 0);
  }
  assert.equal(fsModule._fsyncCalls.length, 3);
});

test('existing receipt sources are preserved byte-for-byte and inode-for-inode', () => {
  const fsModule = memoryFilesystem({ files: {
    [EDGE_RECEIPT]: { bytes: 'old-edge' },
    [PROVIDER_RECEIPT]: { bytes: 'old-provider' }
  } });
  const before = [EDGE_RECEIPT, PROVIDER_RECEIPT].map(file => ({
    bytes: fsModule._bytes(file).toString('hex'), inode: fsModule._node(file).inode
  }));
  const { authority, execFile } = fixture();
  const result = prepareEphemeralReceiptMountSources(authority, { execFile, fsModule });
  assert.deepEqual(result.created, []);
  assert.deepEqual(result.preserved, ['edge', 'provider']);
  assert.deepEqual([EDGE_RECEIPT, PROVIDER_RECEIPT].map(file => ({
    bytes: fsModule._bytes(file).toString('hex'), inode: fsModule._node(file).inode
  })), before);
  assert.equal(fsModule._openCalls.length, 2);
  assert.equal(fsModule._openCalls.every(call =>
    (call.flags & (fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_TRUNC)) === 0 &&
    (call.flags & fs.constants.O_NOFOLLOW) !== 0), true);
});

test('receipt symlinks and symlinked receipt root fail closed', () => {
  const { authority, execFile } = fixture();
  expectCode(() => prepareEphemeralReceiptMountSources(authority, {
    execFile,
    fsModule: memoryFilesystem({ files: {
      [EDGE_RECEIPT]: { target: '/attacker/edge.json', type: 'symlink' }
    } })
  }), 'host_launcher_receipt_bootstrap_source_invalid');
  expectCode(() => prepareEphemeralReceiptMountSources(authority, {
    execFile,
    fsModule: memoryFilesystem({ root: {
      target: '/attacker/root', type: 'symlink'
    } })
  }), 'host_launcher_receipt_bootstrap_root_invalid');
});

test('wrong ownership, writable mode and oversized receipts fail closed', () => {
  const { authority, execFile } = fixture();
  for (const value of [
    { uid: 1000 },
    { mode: 0o666 },
    { mode: 0o664 },
    { bytes: Buffer.alloc(64 * 1024 + 1) }
  ]) {
    expectCode(() => prepareEphemeralReceiptMountSources(authority, {
      execFile,
      fsModule: memoryFilesystem({ files: { [EDGE_RECEIPT]: value } })
    }), 'host_launcher_receipt_bootstrap_source_invalid');
  }
});

test('missing receipt while Runtime is active is never repaired', () => {
  const fsModule = memoryFilesystem({ files: {
    [EDGE_RECEIPT]: { bytes: 'old-edge' }
  } });
  const { authority, execFile } = fixture({ running: true });
  expectCode(() => prepareEphemeralReceiptMountSources(authority, { execFile, fsModule }),
    'host_launcher_receipt_bootstrap_runtime_active');
  assert.equal(fsModule._node(EDGE_RECEIPT).bytes.toString(), 'old-edge');
  assert.equal(fsModule._openCalls.some(call =>
    (call.flags & fs.constants.O_CREAT) !== 0), false);
});

test('noncanonical authority and caller receipt paths are rejected', () => {
  const fsModule = memoryFilesystem();
  for (const runtimeMountSources of [
    { edgeReceipt: '/tmp/edge.json' },
    { edgeReceipt: '/run/other/edge.json' },
    { providerReceipt: '/run/codex-memory/../provider.json' }
  ]) {
    const { authority, execFile } = fixture({ runtimeMountSources });
    expectCode(() => prepareEphemeralReceiptMountSources(authority, { execFile, fsModule }),
      'host_launcher_receipt_bootstrap_path_invalid');
  }
  const { authority, execFile } = fixture();
  expectCode(() => prepareEphemeralReceiptMountSources(authority, {
    execFile, fsModule, receiptPath: '/tmp/edge.json'
  }), 'host_launcher_receipt_bootstrap_path_invalid');
});

test('Runtime identity substitution cannot authorize receipt creation', () => {
  const fsModule = memoryFilesystem();
  const { authority, runtime } = fixture();
  const execFile = () => JSON.stringify([{ ...runtime, Id: I('b') }]);
  expectCode(() => prepareEphemeralReceiptMountSources(authority, { execFile, fsModule }),
    'host_launcher_receipt_bootstrap_runtime_identity_mismatch');
  assert.equal(fsModule._openCalls.length, 0);
});

test('production ordering keeps bootstrap under lock and fresh receipts before Runtime start', () => {
  const source = fs.readFileSync(require.resolve('../deploy/native-runtime/host-launcher'));
  const main = source.slice(source.indexOf('async function main('));
  const lock = main.indexOf("if (command !== 'verify') requireLifecycleLock();");
  const startDispatch = main.indexOf("if (command === 'start') result = await start(authority);");
  assert.notEqual(lock, -1);
  assert.equal(lock < startDispatch, true);

  const startSource = source.slice(
    source.indexOf('async function start('), source.indexOf('async function run(')
  );
  const ordered = [
    'inspectRuntimeAuthority(authority, options);',
    'prepareEphemeralReceiptMountSources(authority, options);',
    'const evidence = verifyHostAuthority(authority, options);',
    'atomicRootReceipt(receiptPaths.edge, receipt, options);',
    'atomicRootReceipt(receiptPaths.provider, providerReceipt, options);',
    'const beforeStart = verifyHostAuthority(authority, options);',
    "dockerAction(['start', authority.expectedRuntimeContainerId], options);"
  ].map(fragment => startSource.indexOf(fragment));
  assert.equal(ordered.every(index => index !== -1), true);
  assert.deepEqual([...ordered].sort((left, right) => left - right), ordered);
});
