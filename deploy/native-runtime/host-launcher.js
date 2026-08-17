#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { execFileSync, spawn, spawnSync } = require('node:child_process');
const {
  EDGE_RECEIPT_SCHEMA,
  PROVIDER_RECEIPT_SCHEMA,
  authorityRecordDigest,
  canonicalJson,
  containerConfigDigest,
  digest,
  hostTrustBundleDigest,
  readBoundedJson,
  readBoundedBuffer,
  sha256Buffer,
  validateAuthorityRecord,
  validateContainerInspection
} = require('../../src/runtime/native-image/runtime-authority');
const {
  EDGE_POLICY_DIGEST, PROVIDER_POLICY, PROVIDER_POLICY_DIGEST, RUNTIME_POLICY_DIGEST,
  validateEdgeCandidate, validateProviderCandidate, validateProviderContainerChanges,
  validateProviderExecutableBytes, validateProviderImageCandidate, validateRuntimeCandidate
} = require('../../src/runtime/native-image/container-policy');
const { nativeClosureDigest, validateNativeClosure, verifyNativeClosureBytes } = require(
  '../../src/runtime/native-image/native-closure'
);
const { parseTarBuffer, regularFiles } = require(
  '../../src/runtime/native-image/tar-archive'
);

const LAUNCHER_VERSION = 'codex-memory-native-host-launcher/v1';
const DOCKER = '/usr/bin/docker';
const DEFAULT_RECEIPT_PATH = '/run/codex-memory/edge-receipt.json';
const DEFAULT_PROVIDER_RECEIPT_PATH = '/run/codex-memory/provider-receipt.json';
const DEFAULT_LOCK_PATH = '/run/codex-memory/host-lifecycle.lock';
const DEFAULT_AUTHORITY_PATH = '/etc/codex-memory/native-runtime-authority.json';
const DEFAULT_BOOT_ID_PATH = '/proc/sys/kernel/random/boot_id';
const CONTAINER_ID = /^[a-f0-9]{64}$/u;
const STABLE_MOUNT_ROOTS = Object.freeze([
  '/etc/codex-memory',
  '/home/jenn/.local/share/codex-memory',
  '/run/codex-memory',
  '/srv/codex-memory',
  '/var/lib/codex-memory'
]);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function parseJson(text, code) {
  try { return JSON.parse(text); } catch { fail(code); }
}

function dockerInspect(id, {
  execFile = execFileSync,
  docker = DOCKER
} = {}) {
  if (!CONTAINER_ID.test(id || '')) fail('host_launcher_container_id_invalid');
  const value = execFile(docker, ['container', 'inspect', id], {
    encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const parsed = parseJson(value, 'host_launcher_docker_inspect_invalid');
  if (!Array.isArray(parsed) || parsed.length !== 1) {
    fail('host_launcher_docker_inspect_invalid');
  }
  return parsed[0];
}

function dockerImageInspect(id, options = {}) {
  const { execFile = execFileSync, docker = DOCKER } = options;
  if (!/^sha256:[a-f0-9]{64}$/u.test(id || '')) {
    fail('host_launcher_image_id_invalid');
  }
  const value = execFile(docker, ['image', 'inspect', id], {
    encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const parsed = parseJson(value, 'host_launcher_image_inspect_invalid');
  if (!Array.isArray(parsed) || parsed.length !== 1) {
    fail('host_launcher_image_inspect_invalid');
  }
  return parsed[0];
}

function dockerProviderImageArchive(id, options = {}) {
  const { execFile = execFileSync, docker = DOCKER } = options;
  if (!/^sha256:[a-f0-9]{64}$/u.test(id || '')) {
    fail('host_launcher_image_id_invalid');
  }
  return execFile(docker, ['image', 'save', id], {
    encoding: null, maxBuffer: 512 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function dockerVolumeInspect(name, options = {}) {
  const { execFile = execFileSync, docker = DOCKER } = options;
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u.test(name || '')) {
    fail('host_launcher_volume_name_invalid');
  }
  const value = execFile(docker, ['volume', 'inspect', name], {
    encoding: 'utf8', maxBuffer: 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const parsed = parseJson(value, 'host_launcher_volume_inspect_invalid');
  if (!Array.isArray(parsed) || parsed.length !== 1) {
    fail('host_launcher_volume_inspect_invalid');
  }
  return parsed[0];
}

function dockerNetworkInspect(name, options = {}) {
  const { execFile = execFileSync, docker = DOCKER } = options;
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u.test(name || '')) {
    fail('host_launcher_network_name_invalid');
  }
  const value = execFile(docker, ['network', 'inspect', name], {
    encoding: 'utf8', maxBuffer: 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const parsed = parseJson(value, 'host_launcher_network_inspect_invalid');
  if (!Array.isArray(parsed) || parsed.length !== 1) {
    fail('host_launcher_network_inspect_invalid');
  }
  return parsed[0];
}

function dockerContainerFile(id, source, options = {}) {
  const { execFile = execFileSync, docker = DOCKER } = options;
  const buffer = execFile(docker, ['container', 'cp', `${id}:${source}`, '-'], {
    encoding: null, maxBuffer: 8 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const files = regularFiles(parseTarBuffer(buffer, {
    maximumEntries: 8, maximumFileBytes: 32 * 1024 * 1024,
    maximumTotalBytes: 32 * 1024 * 1024
  }));
  if (files.size !== 1) fail('host_launcher_container_file_invalid');
  return [...files.values()][0].content;
}

function dockerContainerChanges(id, options = {}) {
  const { execFile = execFileSync, docker = DOCKER } = options;
  if (!CONTAINER_ID.test(id || '')) fail('host_launcher_container_id_invalid');
  const output = execFile(docker, ['container', 'diff', id], {
    encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (typeof output !== 'string') fail('host_launcher_container_diff_invalid');
  return output.trim() === '' ? [] : output.trimEnd().split('\n').map(line => {
    const match = /^([ACD]) (\/.+)$/u.exec(line);
    if (!match) fail('host_launcher_container_diff_invalid');
    return Object.freeze({ kind: match[1], path: match[2] });
  });
}

function validateStableHostMountSource(source, {
  allowedRoots = STABLE_MOUNT_ROOTS,
  fsModule = fs,
  requireRootOwner = false
} = {}) {
  const resolved = path.resolve(source || '');
  if (source !== resolved) fail('host_launcher_mount_source_root_invalid');
  const allowed = allowedRoots.some(root =>
    resolved === root || resolved.startsWith(`${root}/`));
  if (!allowed) fail('host_launcher_mount_source_root_invalid');
  const root = path.parse(resolved).root;
  let current = root;
  for (const component of resolved.slice(root.length).split('/').filter(Boolean)) {
    current = path.join(current, component);
    let stat;
    try { stat = fsModule.lstatSync(current); } catch {
      fail('host_launcher_mount_source_unavailable');
    }
    if (stat.isSymbolicLink()) fail('host_launcher_mount_source_symlink_forbidden');
    if (requireRootOwner && (stat.uid !== 0 || (stat.mode & 0o022) !== 0)) {
      fail('host_launcher_mount_source_ownership_invalid');
    }
  }
  let real;
  try { real = fsModule.realpathSync(resolved); } catch {
    fail('host_launcher_mount_source_unavailable');
  }
  if (real !== resolved) fail('host_launcher_mount_source_identity_mismatch');
  return resolved;
}

function validateImageForHost(image, authority) {
  if (image?.Id !== authority.acceptedImageConfigId ||
      image?.Config?.Labels?.['io.codex-memory.runtime.build-manifest-digest'] !==
        authority.buildManifestDigest ||
      !Array.isArray(image?.RootFS?.Layers) ||
      require('../../src/runtime/native-image/runtime-authority')
        .digest(image.RootFS.Layers) !== authority.rootfsChainDigest) {
    fail('host_launcher_image_authority_mismatch');
  }
  return true;
}

function validateEdgeContainer(edge, authority) {
  if (edge?.Id !== authority.edgeContainerId ||
      edge?.Image !== authority.edgeImageIdentity ||
      containerConfigDigest(edge) !== authority.edgeConfigDigest ||
      edge?.Config?.Labels?.['org.opencontainers.image.revision'] !==
        authority.edgeRevision ||
      edge?.HostConfig?.Privileged === true ||
      edge?.HostConfig?.ReadonlyRootfs !== true ||
      edge?.HostConfig?.RestartPolicy?.Name !== 'no' ||
      authority.edgePolicyDigest !== EDGE_POLICY_DIGEST) {
    fail('host_launcher_edge_identity_mismatch');
  }
  validateEdgeCandidate(edge);
  return true;
}

function validateProviderContainer(provider, authority, options = {}) {
  if (provider?.Id !== authority.providerContainerId ||
      provider?.Image !== authority.providerDaemonImageIdentity ||
      containerConfigDigest(provider) !== authority.providerContainerConfigDigest ||
      provider?.Config?.Labels?.['org.opencontainers.image.revision'] !==
        authority.providerRevision ||
      authority.providerPolicyDigest !== PROVIDER_POLICY_DIGEST) {
    fail('host_launcher_provider_identity_mismatch');
  }
  const projected = validateProviderCandidate(provider);
  const imageInspector = options.providerImageInspect || dockerImageInspect;
  const image = imageInspector(provider.Image, options);
  const imageArchive = options.providerImageArchive || dockerProviderImageArchive;
  const imageAdmission = options.providerImageAdmission || validateProviderImageCandidate;
  const imageEvidence = imageAdmission(
    image, imageArchive(provider.Image, options)
  );
  if (imageEvidence.daemonImageIdentity !== authority.providerDaemonImageIdentity ||
      imageEvidence.imageConfigDigest !== authority.providerImageConfigDigest ||
      imageEvidence.imageStoreIdentityModel !== authority.providerImageStoreIdentityModel ||
      imageEvidence.ociManifestDigest !== authority.providerOciManifestDigest) {
    fail('host_launcher_provider_image_identity_mismatch');
  }
  const containerFile = options.containerFile || dockerContainerFile;
  validateProviderExecutableBytes(containerFile(
    provider.Id, PROVIDER_POLICY.executable, options
  ));
  const containerChanges = options.providerContainerChanges || dockerContainerChanges;
  validateProviderContainerChanges(containerChanges(provider.Id, options));
  const network = dockerNetworkInspect(projected.networkMode, options);
  if (network?.Name !== projected.networkMode ||
      network?.Driver !== PROVIDER_POLICY.networkDriver ||
      network?.Internal === true) {
    fail('host_launcher_provider_network_authority_mismatch');
  }
  for (const mount of projected.mounts) {
    const volume = dockerVolumeInspect(mount.name, options);
    if (volume?.Name !== mount.name || volume?.Driver !== 'local' ||
        (volume.Options && Object.keys(volume.Options).length !== 0)) {
      fail('host_launcher_provider_volume_authority_mismatch');
    }
  }
  return true;
}

function atomicRootReceipt(file, value, {
  fsModule = fs,
  uid = 0,
  gid = 0
} = {}) {
  const directory = path.dirname(file);
  fsModule.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const dirStat = fsModule.lstatSync(directory);
  if (!dirStat.isDirectory() || dirStat.isSymbolicLink() ||
      dirStat.uid !== uid || (dirStat.mode & 0o077) !== 0) {
    fail('host_launcher_receipt_directory_insecure');
  }
  const temporary = path.join(
    directory, `.${path.basename(file)}.${crypto.randomBytes(12).toString('hex')}.tmp`
  );
  const descriptor = fsModule.openSync(
    temporary,
    fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY |
      (fs.constants.O_NOFOLLOW || 0),
    0o644
  );
  try {
    fsModule.writeFileSync(descriptor, canonicalJson(value), 'utf8');
    fsModule.fsyncSync(descriptor);
    fsModule.fchownSync(descriptor, uid, gid);
    // The receipt is non-secret and must be readable by the non-root runtime
    // container through its read-only bind mount. Only root may replace it.
    fsModule.fchmodSync(descriptor, 0o644);
  } finally {
    fsModule.closeSync(descriptor);
  }
  fsModule.renameSync(temporary, file);
  const dirDescriptor = fsModule.openSync(directory, fs.constants.O_RDONLY);
  try { fsModule.fsyncSync(dirDescriptor); } finally { fsModule.closeSync(dirDescriptor); }
}

function buildEdgeReceipt(edge, authority, bootId, now = Date.now()) {
  validateEdgeContainer(edge, authority);
  if (edge?.State?.Running !== true || edge?.State?.Health?.Status !== 'healthy') {
    fail('host_launcher_edge_unhealthy');
  }
  return Object.freeze({
    edgeConfigDigest: authority.edgeConfigDigest,
    edgeContainerId: authority.edgeContainerId,
    edgeHealth: 'healthy',
    edgeImageIdentity: authority.edgeImageIdentity,
    edgeRevision: authority.edgeRevision,
    launchEpoch: bootId,
    launcherAuthorityDigest: authorityRecordDigest(authority),
    observedAt: now,
    schemaVersion: EDGE_RECEIPT_SCHEMA
  });
}

function probeProviderHealth({
  clearTimer = clearTimeout,
  request = http.request,
  setTimer = setTimeout
} = {}) {
  const contract = PROVIDER_POLICY.health;
  return new Promise((resolve, reject) => {
    let settled = false;
    let wallClockTimer = null;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      if (wallClockTimer !== null) clearTimer(wallClockTimer);
      if (error) reject(error); else resolve(result);
    };
    const rejectHealth = () => {
      const error = new Error('host_launcher_provider_health_failed');
      error.code = 'host_launcher_provider_health_failed';
      finish(error);
    };
    let req;
    try {
      req = request({
        agent: false,
        headers: { Accept: 'application/json' },
        hostname: contract.hostname,
        maxHeaderSize: contract.maximumHeaderBytes,
        method: contract.method,
        path: contract.path,
        port: contract.port
      }, response => {
        let bytes = 0;
        if (response.statusCode !== contract.requiredStatus ||
            response.headers?.location !== undefined) {
          response.resume?.();
          rejectHealth();
          return;
        }
        response.on('data', chunk => {
          bytes += Buffer.byteLength(chunk);
          if (bytes > contract.maximumBodyBytes) {
            req.destroy();
            rejectHealth();
          }
        });
        response.once('aborted', rejectHealth);
        response.once('error', rejectHealth);
        response.once('end', () => finish(null, Object.freeze({
          accepted: true,
          bodyBytes: bytes,
          contractDigest: digest(contract),
          providerHealth: 'healthy',
          statusCode: response.statusCode
        })));
      });
    } catch {
      rejectHealth();
      return;
    }
    req.once('error', rejectHealth);
    wallClockTimer = setTimer(() => {
      req.destroy();
      rejectHealth();
    }, contract.timeoutMs);
    req.setTimeout(contract.timeoutMs, () => {
      req.destroy();
      rejectHealth();
    });
    req.end();
  });
}

async function buildProviderReceipt(
  provider, authority, bootId, now = Date.now(), options = {}
) {
  validateProviderContainer(provider, authority, options);
  if (provider?.State?.Running !== true) fail('host_launcher_provider_not_running');
  const health = await (options.providerHealthProbe || probeProviderHealth)(options);
  if (health?.accepted !== true || health?.providerHealth !== 'healthy' ||
      health?.contractDigest !== digest(PROVIDER_POLICY.health) ||
      health?.statusCode !== PROVIDER_POLICY.health.requiredStatus) {
    fail('host_launcher_provider_health_failed');
  }
  return Object.freeze({
    launchEpoch: bootId,
    launcherAuthorityDigest: authorityRecordDigest(authority),
    observedAt: now,
    providerContainerConfigDigest: authority.providerContainerConfigDigest,
    providerContainerId: authority.providerContainerId,
    providerDaemonImageIdentity: authority.providerDaemonImageIdentity,
    providerHealth: 'healthy',
    providerImageConfigDigest: authority.providerImageConfigDigest,
    providerImageStoreIdentityModel: authority.providerImageStoreIdentityModel,
    providerOciManifestDigest: authority.providerOciManifestDigest,
    providerRevision: authority.providerRevision,
    schemaVersion: PROVIDER_RECEIPT_SCHEMA
  });
}

function dockerAction(args, { execFile = execFileSync, docker = DOCKER } = {}) {
  return execFile(docker, args, {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  });
}

function waitForHealthyEdge(authority, options = {}) {
  const attempts = options.attempts || 60;
  const wait = options.wait || (milliseconds =>
    new Promise(resolve => setTimeout(resolve, milliseconds)));
  return (async () => {
    for (let index = 0; index < attempts; index += 1) {
      const edge = dockerInspect(authority.edgeContainerId, options);
      if (edge?.State?.Running === true &&
          edge?.State?.Health?.Status === 'healthy') return edge;
      if (index + 1 < attempts) await wait(500);
    }
    fail('host_launcher_edge_health_timeout');
  })();
}

function verifyHostAuthority(authority, options = {}) {
  const installedBundleDigest = hostTrustBundleDigest({
    authorityModuleFile: require.resolve('../../src/runtime/native-image/runtime-authority'),
    launcherFile: __filename,
    nativeClosureModuleFile: require.resolve('../../src/runtime/native-image/native-closure'),
    policyModuleFile: require.resolve('../../src/runtime/native-image/container-policy'),
    providerImageAuthorityModuleFile:
      require.resolve('../../src/runtime/native-image/provider-image-authority'),
    tarArchiveModuleFile: require.resolve('../../src/runtime/native-image/tar-archive')
  });
  if (installedBundleDigest !== authority.hostLauncherDigest) {
    fail('host_launcher_trust_bundle_mismatch');
  }
  const image = dockerImageInspect(authority.acceptedImageConfigId, options);
  validateImageForHost(image, authority);
  const runtime = dockerInspect(authority.expectedRuntimeContainerId, options);
  if (authority.runtimePolicyDigest !== RUNTIME_POLICY_DIGEST) {
    fail('host_launcher_runtime_policy_mismatch');
  }
  validateRuntimeCandidate(runtime, {
    ...authority.runtimeMountSources,
    primaryStateDestination: authority.stateMountContract.containerPath
  });
  if (options.requireRootFiles !== false) {
    for (const [name, source] of Object.entries(authority.runtimeMountSources)) {
      validateStableHostMountSource(source, {
        fsModule: options.fsModule || fs,
        requireRootOwner: ['authority', 'edgeReceipt', 'profile',
          'providerEnvironment', 'providerReceipt'].includes(name)
      });
    }
  }
  validateContainerInspection(runtime, authority, {
    allowedEnvironmentNames: options.allowedEnvironmentNames || [
      'CODEX_MEMORY_CONTAINER_AUTHORITY_PATH',
      'CODEX_MEMORY_CONTAINER_SUPERVISOR',
      'CODEX_MEMORY_EDGE_RECEIPT_PATH',
      'CODEX_MEMORY_PROVIDER_RECEIPT_PATH',
      'CODEX_MEMORY_RUNTIME_BUILD_MANIFEST_PATH',
      'CODEX_MEMORY_STACK_PROFILE_PATH',
      'CODEX_MEMORY_STACK_RUNTIME_DIR',
      'NODE_DISABLE_COMPILE_CACHE',
      'NODE_ENV',
      'NODE_VERSION',
      'PATH',
      'PUPPETEER_SKIP_DOWNLOAD',
      'SOURCE_DATE_EPOCH',
      'TZ',
      'VCP_ROOT',
      'VCPTOOLBOX_ROOT',
      'YARN_VERSION'
    ],
    expectedStateSource: authority.runtimeMountSources.primaryState
  });
  const edge = dockerInspect(authority.edgeContainerId, options);
  validateEdgeContainer(edge, authority);
  if (options.requireRootFiles !== false) {
    for (const mount of edge.Mounts || []) {
      if (mount.Type === 'bind') validateStableHostMountSource(mount.Source, {
        fsModule: options.fsModule || fs, requireRootOwner: true
      });
    }
  }
  const provider = dockerInspect(authority.providerContainerId, options);
  validateProviderContainer(provider, authority, options);
  const profileBytes = readBoundedBuffer(authority.profilePath, {
    fsModule: options.fsModule || fs,
    requireRootOwner: options.requireRootFiles !== false,
    requireRootOwnedParent: options.requireRootFiles !== false
  });
  if (sha256Buffer(profileBytes) !== authority.profileSha256 ||
      JSON.parse(profileBytes.toString('utf8'))?.schemaVersion !== 7) {
    fail('host_launcher_profile_authority_mismatch');
  }
  const containerFile = options.containerFile || dockerContainerFile;
  const nativeClosure = validateNativeClosure(JSON.parse(containerFile(
    authority.expectedRuntimeContainerId,
    '/opt/codex-memory-runtime/native-closure.json', options
  ).toString('utf8')));
  if (nativeClosureDigest(nativeClosure) !== authority.nativeClosureDigest) {
    fail('host_launcher_native_closure_mismatch');
  }
  const closureBytesVerifier = options.verifyNativeClosureBytes || verifyNativeClosureBytes;
  closureBytesVerifier(nativeClosure, source => containerFile(
    authority.expectedRuntimeContainerId, source, options
  ));
  return Object.freeze({ edge, image, nativeClosure, profileBytes, provider, runtime });
}

async function start(authority, options = {}) {
  const evidence = verifyHostAuthority(authority, options);
  if (evidence.runtime?.State?.Running === true) {
    fail('host_launcher_runtime_already_running');
  }
  if (evidence.edge?.State?.Running !== true) {
    dockerAction(['start', authority.edgeContainerId], options);
  }
  const edge = await waitForHealthyEdge(authority, options);
  const bootId = options.bootId ||
    fs.readFileSync(options.bootIdPath || DEFAULT_BOOT_ID_PATH, 'utf8').trim();
  // Re-inspect immediately before receipt publication. A changed/recreated or
  // newly unhealthy container is never substituted merely because it has the
  // same human-readable name.
  const finalEvidence = verifyHostAuthority(authority, options);
  const receipt = buildEdgeReceipt(
    finalEvidence.edge, authority, bootId, options.now?.() || Date.now()
  );
  atomicRootReceipt(options.receiptPath || DEFAULT_RECEIPT_PATH, receipt, options);
  const providerReceipt = await buildProviderReceipt(
    finalEvidence.provider, authority, bootId, options.now?.() || Date.now(), options
  );
  atomicRootReceipt(
    options.providerReceiptPath || DEFAULT_PROVIDER_RECEIPT_PATH,
    providerReceipt, options
  );
  const beforeStart = verifyHostAuthority(authority, options);
  buildEdgeReceipt(beforeStart.edge, authority, bootId, options.now?.() || Date.now());
  await buildProviderReceipt(
    beforeStart.provider, authority, bootId, options.now?.() || Date.now(), options
  );
  dockerAction(['start', authority.expectedRuntimeContainerId], options);
  return Object.freeze({
    accepted: true,
    action: 'started',
    edgeContainerId: authority.edgeContainerId,
    runtimeContainerId: authority.expectedRuntimeContainerId,
    secretValuesReturned: false
  });
}

async function run(authority, options = {}) {
  let stopRequested = false;
  let stopNow = null;
  const requestStop = () => {
    stopRequested = true;
    stopNow?.();
  };
  process.once('SIGTERM', requestStop);
  process.once('SIGINT', requestStop);
  try {
    await start(authority, options);
    if (stopRequested) {
      return Object.freeze({
        ...stop(authority, options), action: 'supervised_stop'
      });
    }
    const spawnProcess = options.spawnProcess || spawn;
    const waiter = spawnProcess(options.docker || DOCKER, [
      'container', 'wait', authority.expectedRuntimeContainerId
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let stopping = false;
    const maximumOutput = 4_096;
    waiter.stdout?.on('data', value => {
      output = `${output}${value}`.slice(-maximumOutput);
    });
    return await new Promise((resolve, reject) => {
      stopNow = () => {
        if (stopping) return;
        stopping = true;
        try {
          const result = stop(authority, options);
          waiter.kill?.('SIGTERM');
          resolve(Object.freeze({ ...result, action: 'supervised_stop' }));
        } catch (error) {
          reject(error);
        }
      };
      if (stopRequested) return stopNow();
      waiter.once('error', error => {
        if (stopping) return;
        try { stop(authority, options); } catch {}
        reject(error);
      });
      waiter.once('close', () => {
        if (stopping) return;
        try { stop(authority, options); } catch {}
        const status = Number.parseInt(output.trim(), 10);
        const error = new Error('host_launcher_runtime_exited');
        error.code = 'host_launcher_runtime_exited';
        error.runtimeExitStatus = Number.isSafeInteger(status) ? status : null;
        reject(error);
      });
    });
  } finally {
    process.off('SIGTERM', requestStop);
    process.off('SIGINT', requestStop);
  }
}

function stop(authority, options = {}) {
  const evidence = verifyHostAuthority(authority, options);
  const stopped = [];
  if (evidence.runtime?.State?.Running === true) {
    dockerAction(['stop', '--time', '30', authority.expectedRuntimeContainerId], options);
    stopped.push('runtime');
  }
  const edge = dockerInspect(authority.edgeContainerId, options);
  validateEdgeContainer(edge, authority);
  if (edge?.State?.Running === true) {
    dockerAction(['stop', '--time', '10', authority.edgeContainerId], options);
    stopped.push('edge');
  }
  return Object.freeze({
    accepted: true,
    action: stopped.length === 0 ? 'already_stopped' : 'stopped',
    containersRemoved: false,
    providerStopped: false,
    stopped
  });
}

function activateAuthority(candidateFile, {
  targetFile = DEFAULT_AUTHORITY_PATH,
  requireRootFiles = true,
  ...options
} = {}) {
  if (path.resolve(candidateFile) === path.resolve(targetFile)) {
    fail('host_launcher_authority_activation_source_invalid');
  }
  const candidate = validateAuthorityRecord(readBoundedJson(candidateFile, {
    fsModule: options.fsModule || fs,
    requireRootOwner: requireRootFiles,
    requireRootOwnedParent: requireRootFiles
  }));
  const evidence = verifyHostAuthority(candidate, { ...options, requireRootFiles });
  if (evidence.runtime?.State?.Running === true) {
    fail('host_launcher_authority_activation_runtime_active');
  }
  if ((options.fsModule || fs).existsSync(targetFile)) {
    const current = validateAuthorityRecord(readBoundedJson(targetFile, {
      fsModule: options.fsModule || fs,
      requireRootOwner: requireRootFiles,
      requireRootOwnedParent: requireRootFiles
    }));
    if (dockerInspect(current.expectedRuntimeContainerId, options)?.State?.Running === true) {
      fail('host_launcher_authority_activation_current_runtime_active');
    }
  }
  atomicRootReceipt(targetFile, candidate, options);
  return Object.freeze({
    accepted: true,
    action: 'authority_activated',
    authorityDigest: authorityRecordDigest(candidate),
    runtimeContainerId: candidate.expectedRuntimeContainerId,
    secretValuesReturned: false
  });
}

function parseArguments(argv) {
  const command = argv[0];
  if (!['activate', 'rollback', 'run', 'start', 'stop', 'verify'].includes(command)) {
    fail('host_launcher_command_invalid');
  }
  if (argv.length !== 2 || !argv[1].startsWith('--authority=')) {
    fail('host_launcher_argument_invalid');
  }
  const authorityFile = path.resolve(argv[1].slice('--authority='.length));
  if (!authorityFile.startsWith('/etc/codex-memory/')) {
    fail('host_launcher_authority_path_invalid');
  }
  return { authorityFile, command };
}

function runUnderLifecycleLock(argv, {
  spawnFile = spawnSync, lockPath = DEFAULT_LOCK_PATH
} = {}) {
  const directory = path.dirname(lockPath);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const result = spawnFile('/bin/bash', [
    '-c',
    'exec 9>"$1"; /usr/bin/flock --exclusive --nonblock --conflict-exit-code 75 9 || exit $?; export CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD=9; exec /usr/bin/node "$@"',
    'codex-memory-lifecycle-lock', lockPath, __filename, ...argv
  ], { stdio: 'inherit', env: process.env });
  if (result.status === 75) fail('host_launcher_lifecycle_lock_busy');
  if (result.status !== 0) fail('host_launcher_locked_command_failed');
  return result.status;
}

function requireLifecycleLock({
  fdValue = process.env.CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD,
  lockPath = DEFAULT_LOCK_PATH,
  fsModule = fs,
  spawnFile = spawnSync
} = {}) {
  if (!/^\d+$/u.test(fdValue || '')) fail('host_launcher_lifecycle_lock_proof_missing');
  const descriptor = Number(fdValue);
  let held;
  let expected;
  try {
    held = fsModule.fstatSync(descriptor);
    expected = fsModule.statSync(lockPath);
  } catch { fail('host_launcher_lifecycle_lock_proof_invalid'); }
  if (!held.isFile() || held.dev !== expected.dev || held.ino !== expected.ino) {
    fail('host_launcher_lifecycle_lock_proof_invalid');
  }
  const stdio = Array.from({ length: Math.max(10, descriptor + 1) }, () => 'ignore');
  stdio[descriptor] = descriptor;
  const proof = spawnFile('/usr/bin/flock', [
    '--exclusive', '--nonblock', '--conflict-exit-code', '75',
    String(descriptor), '/bin/true'
  ], { stdio });
  if (proof.status !== 0) fail('host_launcher_lifecycle_lock_proof_invalid');
  return true;
}

async function main(argv = process.argv.slice(2)) {
  if (typeof process.getuid !== 'function' || process.getuid() !== 0) {
    fail('host_launcher_root_required');
  }
  const { authorityFile, command } = parseArguments(argv);
  if (command !== 'verify' &&
      !process.env.CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD) {
    runUnderLifecycleLock(argv); return;
  }
  if (command !== 'verify') requireLifecycleLock();
  const authority = validateAuthorityRecord(readBoundedJson(authorityFile, {
    requireRootOwner: true,
    requireRootOwnedParent: true
  }));
  let result;
  if (command === 'activate' || command === 'rollback') {
    result = activateAuthority(authorityFile);
  }
  if (command === 'run') result = await run(authority);
  if (command === 'start') result = await start(authority);
  if (command === 'stop') result = stop(authority);
  if (command === 'verify') {
    verifyHostAuthority(authority);
    result = { accepted: true, action: 'verified', secretValuesReturned: false };
  }
  process.stdout.write(canonicalJson(result));
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error?.code || error?.message || 'host_launcher_failed'}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  LAUNCHER_VERSION,
  requireLifecycleLock,
  atomicRootReceipt,
  activateAuthority,
  buildEdgeReceipt,
  buildProviderReceipt,
  dockerContainerChanges,
  dockerInspect,
  dockerImageInspect,
  dockerProviderImageArchive,
  dockerNetworkInspect,
  parseArguments,
  probeProviderHealth,
  run,
  start,
  stop,
  validateEdgeContainer,
  validateProviderContainer,
  validateImageForHost,
  validateStableHostMountSource,
  verifyHostAuthority,
  waitForHealthyEdge,
  runUnderLifecycleLock
};
