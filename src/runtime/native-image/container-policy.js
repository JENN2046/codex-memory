'use strict';

const path = require('node:path');
const {
  AUTHORITY_RECORD_PATH,
  EDGE_RECEIPT_PATH,
  PROVIDER_RECEIPT_PATH,
  digest,
  projectContainerConfig
} = require('./runtime-authority');

const RUNTIME_POLICY_VERSION = 'codex-memory-runtime-container-policy/v2';
const EDGE_POLICY_VERSION = 'codex-memory-edge-container-policy/v1';
const PROVIDER_POLICY_VERSION = 'codex-memory-provider-container-policy/v2';
const PROFILE_PATH = '/run/codex-memory/profile.json';
const PROVIDER_ENV_PATH = '/run/secrets/codex-memory-vcp-provider.env';
const RUNTIME_DATA_PATH = '/run/codex-memory-runtime-data';

const RUNTIME_POLICY = Object.freeze({
  capabilitiesAdd: [], capabilitiesDrop: ['ALL'], ipcMode: 'private',
  networkMode: 'host', noNewPrivileges: true, privileged: false,
  readOnlyRootfs: true, restartPolicy: 'no', runtimeUser: '1000:1000',
  schemaVersion: RUNTIME_POLICY_VERSION
});
const EDGE_POLICY = Object.freeze({
  capabilitiesAdd: [], capabilitiesDrop: ['ALL'], networkMode: 'bridge',
  noNewPrivileges: true, privileged: false, readOnlyRootfs: true,
  restartPolicy: 'no', schemaVersion: EDGE_POLICY_VERSION
});
const PROVIDER_POLICY = Object.freeze({
  composeConfigHash: '9dc742607c45aeff4044f5a46d0c6ea0012a5a4bbe3c1ba089993239dde8e56d',
  composeProject: 'new-api-wsl',
  composeService: 'new-api',
  containerName: '/new-api-wsl',
  environment: Object.freeze({
    PORT: '3000',
    SQLITE_PATH: '/data/new-api.db',
    TZ: 'Asia/Shanghai'
  }),
  dockerHealthcheck: 'absent',
  executable: '/new-api',
  health: Object.freeze({
    hostname: '127.0.0.1',
    maximumBodyBytes: 16_384,
    maximumHeaderBytes: 8_192,
    method: 'GET',
    path: '/api/status',
    port: 3000,
    redirects: false,
    requiredStatus: 200,
    timeoutMs: 2_000
  }),
  imageRevision: '6ce7305cd36f16506fb6a2c3c524a5a318539ba7',
  imageSource: 'https://github.com/QuantumNous/new-api',
  imageVersion: 'v1.0.0-rc.20',
  networkDriver: 'bridge',
  networkMode: 'new-api-wsl_default',
  privileged: false,
  restartPolicy: 'unless-stopped',
  schemaVersion: PROVIDER_POLICY_VERSION,
  stateMount: Object.freeze({
    destination: '/data',
    name: 'new-api-wsl-data-v1',
    readWrite: true,
    type: 'volume'
  }),
  workingDirectory: '/data'
});

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function same(value, expected) { return JSON.stringify(value) === JSON.stringify(expected); }
function envObject(entries) {
  const output = {};
  for (const entry of entries) {
    const index = entry.indexOf('=');
    if (index < 1 || Object.hasOwn(output, entry.slice(0, index))) fail('container_policy_environment_invalid');
    output[entry.slice(0, index)] = entry.slice(index + 1);
  }
  return output;
}
function socketPathExposed(source) {
  const normalized = path.posix.normalize(source);
  return ['/','/var','/var/run','/run','/var/run/docker.sock','/run/docker.sock']
    .includes(normalized) || '/var/run/docker.sock'.startsWith(`${normalized}/`) ||
    '/run/docker.sock'.startsWith(`${normalized}/`);
}
function hostKernelAlias(source) {
  const normalized = path.posix.normalize(source);
  return ['/proc', '/sys', '/dev'].some(root =>
    normalized === root || normalized.startsWith(`${root}/`));
}
function requireNoDangerousHostSurface(projected, code) {
  if (projected.privileged || projected.capabilitiesAdd.length !== 0 ||
      projected.devices.length !== 0 || projected.deviceRequests.length !== 0 ||
      projected.pidMode || projected.utsMode || projected.usernsMode ||
      !['', 'private'].includes(projected.cgroupnsMode) ||
      !['', 'private'].includes(projected.ipcMode) ||
      projected.mounts.some(mount => socketPathExposed(mount.source) ||
        socketPathExposed(mount.destination) || mount.propagation === 'shared' ||
        mount.propagation === 'rshared' ||
        (mount.type === 'bind' && hostKernelAlias(mount.source)))) fail(code);
}

function validateRuntimeCandidate(inspect, expected) {
  const value = projectContainerConfig(inspect);
  requireNoDangerousHostSurface(value, 'runtime_container_canonical_policy_mismatch');
  if (!['1000', '1000:1000'].includes(value.user) || !value.readOnlyRootfs ||
      value.networkMode !== 'host' || value.restartPolicy !== 'no' ||
      !same(value.capabilitiesDrop, ['ALL']) ||
      !value.securityOpt.includes('no-new-privileges:true') ||
      value.logConfig?.Type !== 'none' ||
      value.workingDirectory !== '/opt/codex-memory' ||
      !same(value.entrypoint, ['/usr/local/bin/node',
        '/opt/codex-memory/scripts/codex-memory-stack.js', '_container-supervisor']) ||
      !same(value.command, [])) fail('runtime_container_canonical_policy_mismatch');
  const environment = envObject(value.environment);
  const exactEnvironment = {
    CODEX_MEMORY_CONTAINER_AUTHORITY_PATH: AUTHORITY_RECORD_PATH,
    CODEX_MEMORY_CONTAINER_SUPERVISOR: '1',
    CODEX_MEMORY_EDGE_RECEIPT_PATH: EDGE_RECEIPT_PATH,
    CODEX_MEMORY_PROVIDER_RECEIPT_PATH: PROVIDER_RECEIPT_PATH,
    CODEX_MEMORY_RUNTIME_BUILD_MANIFEST_PATH:
      '/opt/codex-memory-runtime/runtime-build-manifest.json',
    CODEX_MEMORY_STACK_PROFILE_PATH: PROFILE_PATH,
    CODEX_MEMORY_STACK_RUNTIME_DIR: RUNTIME_DATA_PATH,
    VCP_ROOT: '/opt/vcptoolbox',
    VCPTOOLBOX_ROOT: '/opt/vcptoolbox'
  };
  for (const [name, expectedValue] of Object.entries(exactEnvironment)) {
    if (environment[name] !== expectedValue) fail('runtime_container_canonical_policy_mismatch');
  }
  const allowedEnvironment = new Set([
    ...Object.keys(exactEnvironment), 'NODE_DISABLE_COMPILE_CACHE', 'NODE_ENV',
    'NODE_VERSION', 'PATH', 'PUPPETEER_SKIP_DOWNLOAD', 'SOURCE_DATE_EPOCH',
    'TZ', 'YARN_VERSION'
  ]);
  if (Object.keys(environment).some(name => !allowedEnvironment.has(name))) {
    fail('runtime_container_canonical_policy_mismatch');
  }
  const expectedMounts = [
    [expected.authority, AUTHORITY_RECORD_PATH, false, ''],
    [expected.edgeReceipt, EDGE_RECEIPT_PATH, false, ''],
    [expected.providerReceipt, PROVIDER_RECEIPT_PATH, false, ''],
    [expected.profile, PROFILE_PATH, false, ''],
    [expected.providerEnvironment, PROVIDER_ENV_PATH, false, ''],
    [expected.primaryState, expected.primaryStateDestination, false, ''],
    [expected.runtimeDirectory, RUNTIME_DATA_PATH, true, '']
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const actual = value.mounts.map(mount =>
    [mount.source, mount.destination, mount.rw, mount.name]);
  if (!same(actual, expectedMounts) || value.mounts.some(mount => mount.type !== 'bind')) {
    fail('runtime_container_canonical_policy_mismatch');
  }
  const expectedTmpfs = {
    '/run/codex-memory-runtime': 'rw,noexec,nosuid,nodev,mode=0700,uid=1000,gid=1000',
    '/tmp': 'rw,noexec,nosuid,nodev,mode=0700,uid=1000,gid=1000'
  };
  if (!same(value.tmpfs, expectedTmpfs)) fail('runtime_container_canonical_policy_mismatch');
  return Object.freeze(value);
}

function loopbackBinding(portBindings, port, hostPort = null) {
  const keys = Object.keys(portBindings || {});
  return keys.length === 1 && keys[0] === port &&
    Array.isArray(portBindings[port]) && portBindings[port].length === 1 &&
    portBindings[port][0]?.HostIp === '127.0.0.1' &&
    (hostPort === null || portBindings[port][0]?.HostPort === hostPort);
}
function validateEdgeCandidate(inspect) {
  const value = projectContainerConfig(inspect);
  requireNoDangerousHostSurface(value, 'edge_container_canonical_policy_mismatch');
  const nonRoot = value.user === 'node' || /^[1-9][0-9]*(?::[1-9][0-9]*)?$/u.test(value.user);
  const secret = value.mounts.filter(mount =>
    mount.destination === '/run/secrets/codex-memory-r4');
  if (!nonRoot || !value.readOnlyRootfs || value.restartPolicy !== 'no' ||
      value.networkMode !== 'bridge' || !same(value.capabilitiesDrop, ['ALL']) ||
      !value.securityOpt.includes('no-new-privileges:true') ||
      value.logConfig?.Type !== 'none' || secret.length !== 1 || secret[0].rw ||
      secret[0].type !== 'bind' ||
      !secret[0].source.startsWith('/etc/codex-memory/') ||
      value.mounts.length !== 1 ||
      !loopbackBinding(value.portBindings, '8080/tcp')) {
    fail('edge_container_canonical_policy_mismatch');
  }
  return Object.freeze(value);
}
function validateProviderCandidate(inspect) {
  const value = projectContainerConfig(inspect);
  requireNoDangerousHostSurface(value, 'provider_container_canonical_policy_mismatch');
  const expectedMount = PROVIDER_POLICY.stateMount;
  const stateMountOnly = value.mounts.length === 1 && value.mounts.every(mount =>
    mount.destination === expectedMount.destination &&
    mount.type === expectedMount.type && mount.name === expectedMount.name &&
    mount.rw === expectedMount.readWrite && mount.propagation === 'rprivate');
  const executable = value.entrypoint.length > 0 ? value.entrypoint[0] : value.command[0];
  const executableAbsolute = typeof executable === 'string' && executable.startsWith('/') &&
    path.posix.normalize(executable) === executable;
  const executableInState = executableAbsolute &&
    (executable === expectedMount.destination ||
      executable.startsWith(`${expectedMount.destination}/`));
  const interpreter = path.posix.basename(executable || '');
  const indirectInterpreter = [
    'sh', 'bash', 'dash', 'env', 'node', 'nodejs', 'python', 'python3'
  ].includes(interpreter);
  const environment = envObject(value.environment);
  const labels = value.labels || {};
  if (value.networkMode !== PROVIDER_POLICY.networkMode ||
      !loopbackBinding(value.portBindings, '3000/tcp', '3000') ||
      inspect?.Name !== PROVIDER_POLICY.containerName ||
      value.privileged || value.restartPolicy !== PROVIDER_POLICY.restartPolicy ||
      (PROVIDER_POLICY.dockerHealthcheck === 'absent' && value.healthcheck !== null) ||
      value.workingDirectory !== PROVIDER_POLICY.workingDirectory ||
      !same(value.entrypoint, [PROVIDER_POLICY.executable]) ||
      !same(value.command, []) || !executableAbsolute || executableInState ||
      indirectInterpreter || !stateMountOnly ||
      !same(environment, PROVIDER_POLICY.environment) ||
      labels['com.docker.compose.project'] !== PROVIDER_POLICY.composeProject ||
      labels['com.docker.compose.service'] !== PROVIDER_POLICY.composeService ||
      labels['com.docker.compose.config-hash'] !== PROVIDER_POLICY.composeConfigHash ||
      labels['org.opencontainers.image.revision'] !== PROVIDER_POLICY.imageRevision ||
      labels['org.opencontainers.image.source'] !== PROVIDER_POLICY.imageSource ||
      labels['org.opencontainers.image.version'] !== PROVIDER_POLICY.imageVersion) {
    fail('provider_container_canonical_policy_mismatch');
  }
  return Object.freeze(value);
}

const RUNTIME_POLICY_DIGEST = digest(RUNTIME_POLICY);
const EDGE_POLICY_DIGEST = digest(EDGE_POLICY);
const PROVIDER_POLICY_DIGEST = digest(PROVIDER_POLICY);

module.exports = {
  EDGE_POLICY, EDGE_POLICY_DIGEST, EDGE_POLICY_VERSION,
  PROVIDER_POLICY, PROVIDER_POLICY_DIGEST, PROVIDER_POLICY_VERSION,
  RUNTIME_POLICY, RUNTIME_POLICY_DIGEST, RUNTIME_POLICY_VERSION,
  validateEdgeCandidate, validateProviderCandidate, validateRuntimeCandidate
};
