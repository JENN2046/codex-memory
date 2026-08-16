#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  EDGE_RECEIPT_SCHEMA,
  authorityRecordDigest,
  canonicalJson,
  containerConfigDigest,
  hostTrustBundleDigest,
  readBoundedJson,
  validateAuthorityRecord,
  validateContainerInspection
} = require('../../src/runtime/native-image/runtime-authority');

const LAUNCHER_VERSION = 'codex-memory-native-host-launcher/v1';
const DOCKER = '/usr/bin/docker';
const DEFAULT_RECEIPT_PATH = '/run/codex-memory/edge-receipt.json';
const DEFAULT_BOOT_ID_PATH = '/proc/sys/kernel/random/boot_id';
const CONTAINER_ID = /^[a-f0-9]{64}$/u;

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
      edge?.HostConfig?.Privileged === true ||
      edge?.HostConfig?.ReadonlyRootfs !== true ||
      edge?.HostConfig?.RestartPolicy?.Name !== 'no') {
    fail('host_launcher_edge_identity_mismatch');
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
    0o600
  );
  try {
    fsModule.writeFileSync(descriptor, canonicalJson(value), 'utf8');
    fsModule.fsyncSync(descriptor);
    fsModule.fchownSync(descriptor, uid, gid);
    fsModule.fchmodSync(descriptor, 0o600);
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
    launchEpoch: bootId,
    launcherAuthorityDigest: authorityRecordDigest(authority),
    observedAt: now,
    schemaVersion: EDGE_RECEIPT_SCHEMA
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
    launcherFile: __filename
  });
  if (installedBundleDigest !== authority.hostLauncherDigest) {
    fail('host_launcher_trust_bundle_mismatch');
  }
  const image = dockerImageInspect(authority.acceptedImageConfigId, options);
  validateImageForHost(image, authority);
  const runtime = dockerInspect(authority.expectedRuntimeContainerId, options);
  validateContainerInspection(runtime, authority, {
    allowedEnvironmentNames: options.allowedEnvironmentNames || [
      'CODEX_MEMORY_CONTAINER_AUTHORITY_PATH',
      'CODEX_MEMORY_CONTAINER_SUPERVISOR',
      'CODEX_MEMORY_EDGE_RECEIPT_PATH',
      'CODEX_MEMORY_RUNTIME_BUILD_MANIFEST_PATH',
      'CODEX_MEMORY_STACK_PROFILE_PATH',
      'CODEX_MEMORY_STACK_RUNTIME_DIR',
      'NODE_ENV',
      'PATH',
      'VCP_ROOT',
      'VCPTOOLBOX_ROOT'
    ],
    expectedStateSource: options.expectedStateSource
  });
  const edge = dockerInspect(authority.edgeContainerId, options);
  validateEdgeContainer(edge, authority);
  return Object.freeze({ edge, image, runtime });
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
  const receipt = buildEdgeReceipt(edge, authority, bootId, options.now?.() || Date.now());
  atomicRootReceipt(options.receiptPath || DEFAULT_RECEIPT_PATH, receipt, options);
  // Re-inspect immediately before activation. A changed/recreated container is
  // never substituted merely because it has the same human-readable name.
  verifyHostAuthority(authority, options);
  dockerAction(['start', authority.expectedRuntimeContainerId], options);
  return Object.freeze({
    accepted: true,
    action: 'started',
    edgeContainerId: authority.edgeContainerId,
    runtimeContainerId: authority.expectedRuntimeContainerId,
    secretValuesReturned: false
  });
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

function parseArguments(argv) {
  const command = argv[0];
  if (!['start', 'stop', 'verify'].includes(command)) fail('host_launcher_command_invalid');
  if (argv.length !== 2 || !argv[1].startsWith('--authority=')) {
    fail('host_launcher_argument_invalid');
  }
  const authorityFile = path.resolve(argv[1].slice('--authority='.length));
  if (!authorityFile.startsWith('/etc/codex-memory/')) {
    fail('host_launcher_authority_path_invalid');
  }
  return { authorityFile, command };
}

async function main(argv = process.argv.slice(2)) {
  if (typeof process.getuid !== 'function' || process.getuid() !== 0) {
    fail('host_launcher_root_required');
  }
  const { authorityFile, command } = parseArguments(argv);
  const authority = validateAuthorityRecord(readBoundedJson(authorityFile, {
    requireRootOwner: true
  }));
  let result;
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
  atomicRootReceipt,
  buildEdgeReceipt,
  dockerInspect,
  dockerImageInspect,
  parseArguments,
  start,
  stop,
  validateEdgeContainer,
  validateImageForHost,
  verifyHostAuthority,
  waitForHealthyEdge
};
