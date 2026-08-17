'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const {
  PROVIDER_POLICY,
  PROVIDER_POLICY_DIGEST,
  PROVIDER_POLICY_VERSION,
  validateProviderCandidate,
  validateProviderContainerChanges,
  validateProviderExecutableBytes,
  validateProviderImageCandidate
} = require('../src/runtime/native-image/container-policy');
const { digest } = require('../src/runtime/native-image/runtime-authority');
const { probeProviderHealth } = require('../deploy/native-runtime/host-launcher');
const { historicalProviderInspect } = require('./fixtures/native-provider-inspect-v2');

function expectPolicyReject(mutate) {
  const value = historicalProviderInspect();
  mutate(value);
  assert.throws(() => validateProviderCandidate(value), error =>
    error?.code === 'provider_container_canonical_policy_mismatch');
}

function executableElf() {
  const value = Buffer.alloc(64);
  value.writeUInt32BE(0x7f454c46, 0);
  value[4] = 2;
  value[5] = 1;
  value.writeUInt16LE(62, 18);
  return value;
}

function requestFixture({
  body = ['{}'], connectionError = false, headers = {}, statusCode = 200,
  timeout = false
} = {}) {
  return (options, onResponse) => {
    assert.deepEqual({
      hostname: options.hostname, method: options.method,
      path: options.path, port: options.port
    }, { hostname: '127.0.0.1', method: 'GET', path: '/api/status', port: 3000 });
    const request = new EventEmitter();
    let timeoutHandler;
    request.setTimeout = (milliseconds, handler) => {
      assert.equal(milliseconds, 2_000);
      timeoutHandler = handler;
      return request;
    };
    request.destroy = () => {};
    request.end = () => queueMicrotask(() => {
      if (connectionError) { request.emit('error', new Error('synthetic connection')); return; }
      if (timeout) { timeoutHandler(); return; }
      const response = new EventEmitter();
      response.headers = headers;
      response.statusCode = statusCode;
      response.resume = () => {};
      onResponse(response);
      for (const chunk of body) response.emit('data', Buffer.from(chunk));
      response.emit('end');
    });
    return request;
  };
}

test('Provider policy v3 separates OCI, config and daemon identities', () => {
  assert.equal(PROVIDER_POLICY_VERSION, 'codex-memory-provider-container-policy/v3');
  assert.equal(PROVIDER_POLICY.dockerHealthcheck, 'absent');
  assert.equal(PROVIDER_POLICY.imageConfigDigest,
    'sha256:8ca23f4e6c9ff728e7ad277fbe2538f7a5a43ea40a26c23b04c0d6b48208c018');
  assert.equal(PROVIDER_POLICY.ociManifestDigest,
    'sha256:69aef0d276a5e00fb6f6d9f11b199fd9ec42d89a0857924547ee4249ad2094a3');
  assert.equal(PROVIDER_POLICY.daemonImageIdentity, PROVIDER_POLICY.ociManifestDigest);
  assert.equal(PROVIDER_POLICY.imageStoreIdentityModel,
    'docker-containerd-manifest-identity/v1');
  assert.equal(PROVIDER_POLICY_DIGEST, digest(PROVIDER_POLICY));
  assert.notEqual(PROVIDER_POLICY_DIGEST,
    'sha256:cf4ce5edf3de9f47725d7603ec4fd4acb5b4f9e6e232077c837636aee4d24e46');
});

test('exact historical Provider inspect is admitted without Docker HEALTHCHECK', () => {
  const value = historicalProviderInspect();
  assert.equal(value.Config.Healthcheck, null);
  assert.equal(value.State.Health, undefined);
  assert.equal(validateProviderCandidate(value).workingDirectory, '/data');
});

test('WorkingDir=/data with immutable absolute image executable is admitted', () => {
  const projected = validateProviderCandidate(historicalProviderInspect());
  assert.deepEqual(projected.entrypoint, ['/new-api']);
  assert.equal(projected.workingDirectory, '/data');
});

test('SQLITE_PATH=/data/new-api.db is admitted as the exact state locator', () => {
  const projected = validateProviderCandidate(historicalProviderInspect());
  assert.ok(projected.environment.includes('SQLITE_PATH=/data/new-api.db'));
});

test('executable under /data is rejected', () => {
  expectPolicyReject(value => { value.Config.Entrypoint = ['/data/new-api']; });
});

test('relative executable resolved under WorkingDir=/data is rejected', () => {
  expectPolicyReject(value => { value.Config.Entrypoint = ['./new-api']; });
});

test('shell execution of /data script is rejected', () => {
  expectPolicyReject(value => {
    value.Config.Entrypoint = ['/bin/sh'];
    value.Config.Cmd = ['/data/provider.sh'];
  });
});

test('Node execution of /data script is rejected', () => {
  expectPolicyReject(value => {
    value.Config.Entrypoint = ['/usr/local/bin/node'];
    value.Config.Cmd = ['/data/provider.js'];
  });
});

test('Python execution of /data script is rejected', () => {
  expectPolicyReject(value => {
    value.Config.Entrypoint = ['/usr/bin/python3'];
    value.Config.Cmd = ['/data/provider.py'];
  });
});

test('extra code bind under /data is rejected', () => {
  expectPolicyReject(value => { value.Mounts[0] = {
    ...value.Mounts[0], Name: '', Source: '/mutable/provider-code', Type: 'bind'
  }; });
});

test('wrong SQLite state path is rejected', () => {
  expectPolicyReject(value => {
    value.Config.Env = value.Config.Env.map(entry =>
      entry.startsWith('SQLITE_PATH=') ? 'SQLITE_PATH=/data/other.db' : entry);
  });
});

test('wrong state volume is rejected', () => {
  expectPolicyReject(value => { value.Mounts[0].Name = 'replacement-volume'; });
});

test('extra mount is rejected', () => {
  expectPolicyReject(value => value.Mounts.push({
    Destination: '/opt/extra', Name: 'extra', Propagation: 'rprivate',
    RW: false, Source: 'extra', Type: 'volume'
  }));
});

test('0.0.0.0:3000 exposure is rejected', () => {
  expectPolicyReject(value => {
    value.HostConfig.PortBindings['3000/tcp'][0].HostIp = '0.0.0.0';
  });
});

test('wrong historical configuration is rejected', () => {
  expectPolicyReject(value => { value.HostConfig.RestartPolicy.Name = 'always'; });
});

test('unexpected Docker HEALTHCHECK configuration is rejected as config drift', () => {
  expectPolicyReject(value => { value.Config.Healthcheck = {
    Test: ['CMD', '/new-api', '--health']
  }; });
});

test('unexpected environment capable of module loading is rejected', () => {
  expectPolicyReject(value => value.Config.Env.push('NODE_PATH=/data/plugins'));
});

test('image admission fails closed without host-local config archive proof', () => {
  assert.throws(() => validateProviderImageCandidate({
    Architecture: 'amd64', Config: { Labels: {
      'org.opencontainers.image.revision': PROVIDER_POLICY.imageRevision,
      'org.opencontainers.image.source': PROVIDER_POLICY.imageSource,
      'org.opencontainers.image.version': PROVIDER_POLICY.imageVersion
    } }, Descriptor: { digest: PROVIDER_POLICY.ociManifestDigest },
    Id: PROVIDER_POLICY.daemonImageIdentity, Os: 'linux',
    RepoDigests: [
      `${PROVIDER_POLICY.imageRepository}@${PROVIDER_POLICY.ociManifestDigest}`
    ]
  }));
});

test('image-local x86-64 ELF executable evidence is admitted', () => {
  assert.equal(validateProviderExecutableBytes(executableElf()), true);
});

test('symlink/script extraction or wrong architecture cannot satisfy executable evidence', () => {
  assert.throws(() => validateProviderExecutableBytes(Buffer.from('#!/bin/sh\n/data/run\n')));
  const wrongArchitecture = executableElf();
  wrongArchitecture.writeUInt16LE(183, 18);
  assert.throws(() => validateProviderExecutableBytes(wrongArchitecture));
});

test('container writable-layer changes are allowed only under the accepted state root', () => {
  assert.equal(validateProviderContainerChanges([
    { kind: 'C', path: '/data/new-api.db' }
  ]), true);
  assert.throws(() => validateProviderContainerChanges([
    { kind: 'C', path: '/new-api' }
  ]));
  assert.throws(() => validateProviderContainerChanges([
    { kind: 'C', path: '/' }
  ]));
  assert.throws(() => validateProviderContainerChanges([
    { kind: 'C', path: '/usr/lib/libprovider.so' }
  ]));
});

test('canonical external Provider health accepts bounded HTTP 200', async () => {
  const result = await probeProviderHealth({ request: requestFixture() });
  assert.deepEqual(result, {
    accepted: true, bodyBytes: 2, contractDigest: digest(PROVIDER_POLICY.health),
    providerHealth: 'healthy', statusCode: 200
  });
});

for (const [name, options] of [
  ['connection failure', { connectionError: true }],
  ['timeout', { timeout: true }],
  ['HTTP redirect', { headers: { location: '/elsewhere' }, statusCode: 302 }],
  ['HTTP 4xx', { statusCode: 404 }],
  ['HTTP 5xx', { statusCode: 503 }],
  ['oversized response body', { body: ['x'.repeat(16_385)] }]
]) test(`canonical external Provider health rejects ${name}`, async () => {
  await assert.rejects(probeProviderHealth({ request: requestFixture(options) }), error =>
    error?.code === 'host_launcher_provider_health_failed');
});
