'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  AUTHORITY_RECORD_PATH,
  EDGE_RECEIPT_PATH,
  PROVIDER_RECEIPT_PATH,
  digest,
  projectContainerConfig
} = require('./runtime-authority');
const {
  DOCKER_CONTAINERD_MANIFEST_IDENTITY,
  environmentMap,
  validateProviderImageAdmission
} = require('./provider-image-authority');

const RUNTIME_POLICY_VERSION = 'codex-memory-runtime-container-policy/v2';
const EDGE_POLICY_VERSION = 'codex-memory-edge-container-policy/v3';
const PROVIDER_POLICY_VERSION = 'codex-memory-provider-container-policy/v4';
const PROFILE_PATH = '/run/codex-memory/profile.json';
const PROVIDER_ENV_PATH = '/run/secrets/codex-memory-vcp-provider.env';
const RUNTIME_DATA_PATH = '/run/codex-memory-runtime-data';
const PROVIDER_EXECUTABLE_MAX_BYTES = 160 * 1024 * 1024;
const PROVIDER_EXECUTABLE_ARCHIVE_MAX_BYTES = PROVIDER_EXECUTABLE_MAX_BYTES + 2 * 1024 * 1024;
const EDGE_RUNTIME_UID = 1000;
const EDGE_RUNTIME_GID = 1000;
const EDGE_SECRET_ROOT = '/run/secrets/codex-memory-r4';
const EDGE_SECRET_DIRECTORY_MODE = 0o750;
const EDGE_SECRET_FILE_MODE = 0o440;
const EDGE_SECRET_MAXIMUM_BYTES = 16_384;
const EDGE_SECRET_REFERENCE_ENVIRONMENT = Object.freeze([
  'CODEX_MEMORY_R4_EDGE_SIGNING_PRIVATE_KEY',
  'CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY',
  'CODEX_MEMORY_R4_RELAY_AUTH_TOKEN',
  'CODEX_MEMORY_R4_RELAY_SIGNING_PUBLIC_KEY'
]);

const RUNTIME_POLICY = Object.freeze({
  capabilitiesAdd: [], capabilitiesDrop: ['ALL'], ipcMode: 'private',
  networkMode: 'host', noNewPrivileges: true, privileged: false,
  readOnlyRootfs: true, restartPolicy: 'no', runtimeUser: '1000:1000',
  schemaVersion: RUNTIME_POLICY_VERSION
});
const EDGE_POLICY = Object.freeze({
  capabilitiesAdd: [], capabilitiesDrop: ['ALL'], networkMode: 'bridge',
  noNewPrivileges: true, privileged: false, readOnlyRootfs: true,
  command: Object.freeze([]),
  entrypoint: Object.freeze(['node', 'apps/chatgpt-edge/external-main.js']),
  healthcheck: Object.freeze({
    Test: Object.freeze(['CMD-SHELL',
      'node -e "const h=require(\'node:http\');const u=new URL(process.env.CODEX_MEMORY_R4_PUBLIC_ORIGIN);const r=h.request({host:\'127.0.0.1\',port:process.env.CODEX_MEMORY_R4_EDGE_PORT,path:\'/healthz\',headers:{host:u.host,\'x-forwarded-proto\':\'https\'}},x=>process.exit(x.statusCode===200?0:1));r.on(\'error\',()=>process.exit(1));r.end()"']),
    Interval: 30_000_000_000,
    Timeout: 5_000_000_000,
    StartPeriod: 5_000_000_000,
    Retries: 3
  }),
  imageEnvironment: Object.freeze({
    CODEX_MEMORY_R4_CONTAINER_LOOPBACK_PUBLISH_REQUIRED: 'true',
    CODEX_MEMORY_R4_EDGE_BIND_HOST: '0.0.0.0',
    CODEX_MEMORY_R4_EDGE_PORT: '8080',
    NODE_ENV: 'production',
    NODE_VERSION: '22.23.1',
    PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    YARN_VERSION: '1.22.22'
  }),
  runtimeUser: `${EDGE_RUNTIME_UID}:${EDGE_RUNTIME_GID}`,
  supplementaryGroups: Object.freeze([]),
  secretMount: Object.freeze({
    destination: EDGE_SECRET_ROOT,
    directoryGid: EDGE_RUNTIME_GID,
    directoryMode: EDGE_SECRET_DIRECTORY_MODE,
    directoryUid: 0,
    fileGid: EDGE_RUNTIME_GID,
    fileMode: EDGE_SECRET_FILE_MODE,
    fileUid: 0,
    maximumFileBytes: EDGE_SECRET_MAXIMUM_BYTES,
    sourceRoot: '/etc/codex-memory'
  }),
  restartPolicy: 'no', schemaVersion: EDGE_POLICY_VERSION,
  workingDirectory: '/app'
});
const PROVIDER_POLICY = Object.freeze({
  composeConfigHash: '9dc742607c45aeff4044f5a46d0c6ea0012a5a4bbe3c1ba089993239dde8e56d',
  composeProject: 'new-api-wsl',
  composeService: 'new-api',
  containerName: '/new-api-wsl',
  composeEnvironment: Object.freeze({
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
  architecture: 'amd64',
  daemonImageIdentity:
    'sha256:69aef0d276a5e00fb6f6d9f11b199fd9ec42d89a0857924547ee4249ad2094a3',
  imageConfigDigest:
    'sha256:8ca23f4e6c9ff728e7ad277fbe2538f7a5a43ea40a26c23b04c0d6b48208c018',
  imageStoreIdentityModel: DOCKER_CONTAINERD_MANIFEST_IDENTITY,
  ociManifestDigest:
    'sha256:69aef0d276a5e00fb6f6d9f11b199fd9ec42d89a0857924547ee4249ad2094a3',
  imageRepository: 'calciumion/new-api',
  imageRevision: '6ce7305cd36f16506fb6a2c3c524a5a318539ba7',
  imageSource: 'https://github.com/QuantumNous/new-api',
  imageVersion: 'v1.0.0-rc.20',
  networkDriver: 'bridge',
  networkMode: 'new-api-wsl_default',
  os: 'linux',
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
  return environmentMap(entries, 'container_policy_environment_invalid');
}
function mergedProviderEnvironment(imageInheritedEnvironment) {
  if (!imageInheritedEnvironment || Array.isArray(imageInheritedEnvironment) ||
      Object.getPrototypeOf(imageInheritedEnvironment) !== Object.prototype) {
    fail('provider_image_environment_invalid');
  }
  const inheritedEntries = Object.entries(imageInheritedEnvironment).map(([name, value]) => {
    if (typeof value !== 'string') fail('provider_image_environment_invalid');
    return `${name}=${value}`;
  });
  const inherited = environmentMap(inheritedEntries, 'provider_image_environment_invalid');
  return Object.freeze(Object.fromEntries(Object.entries({
    ...inherited, ...PROVIDER_POLICY.composeEnvironment
  }).sort(([left], [right]) => left.localeCompare(right))));
}
function validateProviderVolumeCandidate(mount, volume) {
  const expected = PROVIDER_POLICY.stateMount;
  const options = volume?.Options;
  const optionsAccepted = options === null || options === undefined ||
    (!Array.isArray(options) && typeof options === 'object' &&
      Object.getPrototypeOf(options) === Object.prototype && Object.keys(options).length === 0);
  if (!mount || mount.destination !== expected.destination || mount.type !== expected.type ||
      mount.name !== expected.name || mount.rw !== expected.readWrite ||
      mount.propagation !== '' || volume?.Name !== expected.name ||
      volume?.Driver !== 'local' || volume?.Scope !== 'local' || !optionsAccepted) {
    fail('provider_volume_canonical_policy_mismatch');
  }
  return Object.freeze({
    rawPropagation: mount.propagation,
    semanticPropagation: 'rprivate'
  });
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
    XDG_RUNTIME_DIR: RUNTIME_DATA_PATH,
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
const EDGE_OVERRIDE_ENVIRONMENT_NAMES = Object.freeze([
  'CODEX_MEMORY_R4_AUTH0_ISSUER',
  'CODEX_MEMORY_R4_AUTH0_JWKS_URI',
  'CODEX_MEMORY_R4_BINDING_DIGEST',
  'CODEX_MEMORY_R4_BINDING_REFERENCE',
  'CODEX_MEMORY_R4_EDGE_ARTIFACT_SHA256',
  'CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID',
  'CODEX_MEMORY_R4_EDGE_SIGNING_PRIVATE_KEY',
  'CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY',
  'CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE',
  'CODEX_MEMORY_R4_LOCKFILE_SHA256',
  'CODEX_MEMORY_R4_OAUTH_CLIENT_ID',
  'CODEX_MEMORY_R4_OPERATOR_REFERENCE',
  'CODEX_MEMORY_R4_OPERATOR_SUBJECT_FINGERPRINT',
  'CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE',
  'CODEX_MEMORY_R4_PUBLIC_ORIGIN',
  'CODEX_MEMORY_R4_RELAY_AUTH_TOKEN',
  'CODEX_MEMORY_R4_RELAY_SIGNING_KEY_ID',
  'CODEX_MEMORY_R4_RELAY_SIGNING_PUBLIC_KEY',
  'CODEX_MEMORY_R4_SOURCE_COMMIT'
]);
function validateEdgeEnvironment(environment) {
  const expectedNames = [...Object.keys(EDGE_POLICY.imageEnvironment),
    ...EDGE_OVERRIDE_ENVIRONMENT_NAMES].sort();
  if (!same(Object.keys(environment).sort(), expectedNames)) {
    fail('edge_container_canonical_policy_mismatch');
  }
  for (const [name, expected] of Object.entries(EDGE_POLICY.imageEnvironment)) {
    if (environment[name] !== expected) fail('edge_container_canonical_policy_mismatch');
  }
  const secretReferences = [
    'CODEX_MEMORY_R4_EDGE_SIGNING_PRIVATE_KEY',
    'CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY',
    'CODEX_MEMORY_R4_RELAY_AUTH_TOKEN',
    'CODEX_MEMORY_R4_RELAY_SIGNING_PUBLIC_KEY'
  ].map(name => environment[name]);
  if (secretReferences.some(value =>
    !/^file:\/run\/secrets\/codex-memory-r4\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u
      .test(value || '')) || new Set(secretReferences).size !== secretReferences.length) {
    fail('edge_container_canonical_policy_mismatch');
  }
  for (const name of ['CODEX_MEMORY_R4_PUBLIC_ORIGIN', 'CODEX_MEMORY_R4_AUTH0_ISSUER',
    'CODEX_MEMORY_R4_AUTH0_JWKS_URI']) {
    let url;
    try { url = new URL(environment[name]); } catch { fail('edge_container_canonical_policy_mismatch'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
      fail('edge_container_canonical_policy_mismatch');
    }
  }
  for (const name of ['CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID',
    'CODEX_MEMORY_R4_RELAY_SIGNING_KEY_ID', 'CODEX_MEMORY_R4_OAUTH_CLIENT_ID',
    'CODEX_MEMORY_R4_OPERATOR_SUBJECT_FINGERPRINT']) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,255}$/u.test(environment[name] || '') ||
        /placeholder|example|todo/iu.test(environment[name])) {
      fail('edge_container_canonical_policy_mismatch');
    }
  }
  return true;
}
function validateEdgeCandidate(inspect) {
  const value = projectContainerConfig(inspect);
  requireNoDangerousHostSurface(value, 'edge_container_canonical_policy_mismatch');
  const secret = value.mounts.filter(mount =>
    mount.destination === EDGE_SECRET_ROOT);
  if (value.user !== EDGE_POLICY.runtimeUser || !value.readOnlyRootfs ||
      value.restartPolicy !== 'no' ||
      value.networkMode !== 'bridge' || !same(value.capabilitiesDrop, ['ALL']) ||
      !value.securityOpt.includes('no-new-privileges:true') ||
      value.logConfig?.Type !== 'none' || secret.length !== 1 || secret[0].rw ||
      secret[0].type !== 'bind' ||
      !secret[0].source.startsWith('/etc/codex-memory/') ||
      value.mounts.length !== 1 ||
      !loopbackBinding(value.portBindings, '8080/tcp') ||
      value.workingDirectory !== EDGE_POLICY.workingDirectory ||
      !same(value.entrypoint, EDGE_POLICY.entrypoint) ||
      !same(value.command, EDGE_POLICY.command) ||
      !same(value.healthcheck, EDGE_POLICY.healthcheck) ||
      value.supplementaryGroups !== undefined) {
    fail('edge_container_canonical_policy_mismatch');
  }
  validateEdgeEnvironment(envObject(value.environment));
  return Object.freeze(value);
}

function validateEdgeSecretMountAuthority(inspect, { fsModule = fs } = {}) {
  const value = projectContainerConfig(inspect);
  const mount = value.mounts.find(candidate => candidate.destination === EDGE_SECRET_ROOT);
  if (!mount || mount.type !== 'bind' || mount.rw ||
      typeof mount.source !== 'string' || path.resolve(mount.source) !== mount.source ||
      !mount.source.startsWith(`${EDGE_POLICY.secretMount.sourceRoot}/`)) {
    fail('edge_secret_mount_authority_invalid');
  }
  const sourceComponents = mount.source.split('/').filter(Boolean);
  let current = '/';
  let filesystemRoot;
  try { filesystemRoot = fsModule.lstatSync('/'); } catch {
    fail('edge_secret_mount_authority_unavailable');
  }
  if (!filesystemRoot.isDirectory() || filesystemRoot.isSymbolicLink() ||
      filesystemRoot.uid !== 0 || (filesystemRoot.mode & 0o022) !== 0) {
    fail('edge_secret_mount_authority_invalid');
  }
  for (const component of sourceComponents) {
    current = path.join(current, component);
    let stat;
    try { stat = fsModule.lstatSync(current); } catch {
      fail('edge_secret_mount_authority_unavailable');
    }
    const secretDirectory = current === mount.source;
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== 0 ||
        (secretDirectory
          ? stat.gid !== EDGE_RUNTIME_GID ||
            (stat.mode & 0o777) !== EDGE_SECRET_DIRECTORY_MODE
          : (stat.mode & 0o022) !== 0)) {
      fail('edge_secret_mount_authority_invalid');
    }
  }
  let realSource;
  let directoryEntries;
  try {
    realSource = fsModule.realpathSync(mount.source);
    directoryEntries = fsModule.readdirSync(mount.source);
  } catch { fail('edge_secret_mount_authority_unavailable'); }
  if (realSource !== mount.source || !Array.isArray(directoryEntries) ||
      directoryEntries.some(name => typeof name !== 'string')) {
    fail('edge_secret_mount_authority_invalid');
  }
  const environment = envObject(value.environment);
  const referencedNames = EDGE_SECRET_REFERENCE_ENVIRONMENT.map(name => {
    const reference = environment[name];
    if (typeof reference !== 'string' || !reference.startsWith('file:')) {
      fail('edge_secret_mount_reference_invalid');
    }
    const target = reference.slice(5);
    if (!path.posix.isAbsolute(target) || path.posix.normalize(target) !== target ||
        path.posix.dirname(target) !== EDGE_SECRET_ROOT) {
      fail('edge_secret_mount_reference_invalid');
    }
    const basename = path.posix.basename(target);
    if (!basename || basename === '.' || basename === '..') {
      fail('edge_secret_mount_reference_invalid');
    }
    return basename;
  });
  if (new Set(referencedNames).size !== EDGE_SECRET_REFERENCE_ENVIRONMENT.length ||
      JSON.stringify([...directoryEntries].sort()) !==
        JSON.stringify([...referencedNames].sort())) {
    fail('edge_secret_mount_reference_invalid');
  }
  for (const name of referencedNames) {
    const hostPath = path.join(mount.source, name);
    let stat;
    let real;
    let bytes;
    try {
      stat = fsModule.lstatSync(hostPath);
      real = fsModule.realpathSync(hostPath);
      bytes = fsModule.readFileSync(hostPath);
    } catch { fail('edge_secret_mount_authority_unavailable'); }
    if (!Buffer.isBuffer(bytes) || real !== hostPath || !stat.isFile() ||
        stat.isSymbolicLink() || stat.uid !== 0 || stat.gid !== EDGE_RUNTIME_GID ||
        (stat.mode & 0o777) !== EDGE_SECRET_FILE_MODE || stat.size !== bytes.length ||
        stat.size < 1 || stat.size > EDGE_SECRET_MAXIMUM_BYTES || bytes.includes(0)) {
      fail('edge_secret_mount_authority_invalid');
    }
  }
  return Object.freeze({
    directoryGid: EDGE_RUNTIME_GID,
    directoryMode: EDGE_SECRET_DIRECTORY_MODE,
    directoryUid: 0,
    fileGid: EDGE_RUNTIME_GID,
    fileMode: EDGE_SECRET_FILE_MODE,
    fileUid: 0,
    referencedFiles: Object.freeze([...referencedNames].sort()),
    source: mount.source
  });
}
function validateProviderCandidate(inspect, imageEvidence, { volumeObservation } = {}) {
  const value = projectContainerConfig(inspect);
  requireNoDangerousHostSurface(value, 'provider_container_canonical_policy_mismatch');
  const expectedMount = PROVIDER_POLICY.stateMount;
  const stateMountOnly = value.mounts.length === 1 && value.mounts.every(mount =>
    mount.destination === expectedMount.destination &&
    mount.type === expectedMount.type && mount.name === expectedMount.name &&
    mount.rw === expectedMount.readWrite);
  const propagation = stateMountOnly
    ? validateProviderVolumeCandidate(value.mounts[0], volumeObservation)
    : null;
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
  if (!imageEvidence ||
      imageEvidence.daemonImageIdentity !== PROVIDER_POLICY.daemonImageIdentity ||
      imageEvidence.imageConfigDigest !== PROVIDER_POLICY.imageConfigDigest ||
      imageEvidence.imageStoreIdentityModel !== PROVIDER_POLICY.imageStoreIdentityModel ||
      imageEvidence.ociManifestDigest !== PROVIDER_POLICY.ociManifestDigest) {
    fail('provider_image_canonical_policy_mismatch');
  }
  const expectedEnvironment = mergedProviderEnvironment(
    imageEvidence.imageInheritedEnvironment
  );
  const labels = value.labels || {};
  if (inspect?.Image !== PROVIDER_POLICY.daemonImageIdentity ||
      value.networkMode !== PROVIDER_POLICY.networkMode ||
      !loopbackBinding(value.portBindings, '3000/tcp', '3000') ||
      inspect?.Name !== PROVIDER_POLICY.containerName ||
      value.privileged || value.restartPolicy !== PROVIDER_POLICY.restartPolicy ||
      (PROVIDER_POLICY.dockerHealthcheck === 'absent' && value.healthcheck !== null) ||
      value.workingDirectory !== PROVIDER_POLICY.workingDirectory ||
      !same(value.entrypoint, [PROVIDER_POLICY.executable]) ||
      !same(value.command, []) || !executableAbsolute || executableInState ||
      indirectInterpreter || !stateMountOnly ||
      !same(environment, expectedEnvironment) ||
      labels['com.docker.compose.project'] !== PROVIDER_POLICY.composeProject ||
      labels['com.docker.compose.service'] !== PROVIDER_POLICY.composeService ||
      labels['com.docker.compose.config-hash'] !== PROVIDER_POLICY.composeConfigHash ||
      labels['org.opencontainers.image.revision'] !== PROVIDER_POLICY.imageRevision ||
      labels['org.opencontainers.image.source'] !== PROVIDER_POLICY.imageSource ||
      labels['org.opencontainers.image.version'] !== PROVIDER_POLICY.imageVersion) {
    fail('provider_container_canonical_policy_mismatch');
  }
  return Object.freeze({ ...value,
    imageInheritedEnvironment: imageEvidence.imageInheritedEnvironment,
    mountPropagationSemantics: propagation.semanticPropagation
  });
}

function validateProviderImageCandidate(image, archiveBytes) {
  try {
    return validateProviderImageAdmission(image, archiveBytes, PROVIDER_POLICY);
  } catch (error) {
    if (error?.code) fail(error.code);
    fail('provider_image_canonical_policy_mismatch');
  }
}

function validateProviderExecutableBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 64 ||
      bytes[0] !== 0x7f || bytes.subarray(1, 4).toString('ascii') !== 'ELF' ||
      bytes[4] !== 2 || bytes[5] !== 1 || bytes.readUInt16LE(18) !== 62) {
    fail('provider_executable_image_authority_mismatch');
  }
  return true;
}

function validateProviderContainerChanges(changes) {
  if (!Array.isArray(changes)) fail('provider_container_changes_invalid');
  const stateRoot = PROVIDER_POLICY.stateMount.destination;
  for (const change of changes) {
    const target = path.posix.normalize(change?.path || '');
    if (!['A', 'C', 'D'].includes(change?.kind) || !target.startsWith('/') ||
        (target !== stateRoot && !target.startsWith(`${stateRoot}/`))) {
      fail('provider_executable_image_authority_mismatch');
    }
  }
  return true;
}

const RUNTIME_POLICY_DIGEST = digest(RUNTIME_POLICY);
const EDGE_POLICY_DIGEST = digest(EDGE_POLICY);
const PROVIDER_POLICY_DIGEST = digest(PROVIDER_POLICY);

module.exports = {
  EDGE_RUNTIME_GID, EDGE_RUNTIME_UID, EDGE_SECRET_DIRECTORY_MODE,
  EDGE_SECRET_FILE_MODE, EDGE_SECRET_MAXIMUM_BYTES, EDGE_SECRET_REFERENCE_ENVIRONMENT,
  EDGE_POLICY, EDGE_POLICY_DIGEST, EDGE_POLICY_VERSION,
  PROVIDER_POLICY, PROVIDER_POLICY_DIGEST, PROVIDER_POLICY_VERSION,
  PROVIDER_EXECUTABLE_ARCHIVE_MAX_BYTES, PROVIDER_EXECUTABLE_MAX_BYTES,
  RUNTIME_POLICY, RUNTIME_POLICY_DIGEST, RUNTIME_POLICY_VERSION,
  mergedProviderEnvironment,
  validateEdgeCandidate, validateEdgeSecretMountAuthority,
  validateProviderCandidate, validateProviderContainerChanges,
  validateProviderExecutableBytes, validateProviderImageCandidate,
  validateProviderVolumeCandidate, validateRuntimeCandidate
};
