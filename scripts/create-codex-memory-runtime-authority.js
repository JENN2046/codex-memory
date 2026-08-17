#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  AUTHORITY_SCHEMA,
  STATE_MOUNT_SCHEMA,
  canonicalJson,
  containerConfigDigest,
  digest,
  hostTrustBundleDigest,
  sha256Buffer,
  validateAuthorityRecord,
  validateBuildManifest
} = require('../src/runtime/native-image/runtime-authority');
const {
  EDGE_POLICY_DIGEST,
  PROVIDER_POLICY_DIGEST,
  RUNTIME_POLICY_DIGEST,
  validateEdgeCandidate,
  validateProviderCandidate,
  validateProviderContainerChanges,
  validateProviderExecutableBytes,
  validateProviderImageCandidate,
  validateRuntimeCandidate
} = require('../src/runtime/native-image/container-policy');
const {
  nativeClosureDigest,
  validateNativeClosure,
  verifyNativeClosureBytes
} = require('../src/runtime/native-image/native-closure');
const { parseTarBuffer, regularFiles } = require('../src/runtime/native-image/tar-archive');
const {
  verifyOciArchive
} = require('./verify-codex-memory-runtime-image');

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function inspect(kind, id) {
  const parsed = JSON.parse(execFileSync('/usr/bin/docker', [kind, 'inspect', id], {
    encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  }));
  if (!Array.isArray(parsed) || parsed.length !== 1) fail('runtime_authority_inspect_invalid');
  return parsed[0];
}
function containerFile(id, source) {
  const buffer = execFileSync('/usr/bin/docker', ['container', 'cp', `${id}:${source}`, '-'], {
    encoding: null, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']
  });
  const files = regularFiles(parseTarBuffer(buffer, {
    maximumEntries: 8, maximumFileBytes: 32 * 1024 * 1024,
    maximumTotalBytes: 32 * 1024 * 1024
  }));
  if (files.size !== 1) fail('runtime_authority_container_file_invalid');
  return [...files.values()][0].content;
}
function containerChanges(id) {
  const output = execFileSync('/usr/bin/docker', ['container', 'diff', id], {
    encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']
  });
  if (typeof output !== 'string') fail('runtime_authority_container_diff_invalid');
  return output.trim() === '' ? [] : output.trimEnd().split('\n').map(line => {
    const match = /^([ACD]) (\/.+)$/u.exec(line);
    if (!match) fail('runtime_authority_container_diff_invalid');
    return Object.freeze({ kind: match[1], path: match[2] });
  });
}
function parse(argv) {
  const values = {};
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.+)$/u.exec(arg);
    if (!match) fail('runtime_authority_argument_invalid');
    values[match[1]] = match[2];
  }
  return values;
}

function validateExternallyAcceptedImageEvidence(accepted, archiveEvidence, manifest) {
  const actual = {
    archiveSha256: archiveEvidence.archiveSha256,
    buildManifestDigest: digest(manifest),
    configDigest: archiveEvidence.configDigest,
    contextDigest: manifest.buildContextFileManifestDigest,
    manifestDigest: archiveEvidence.manifestDigest,
    rootfsChainDigest: archiveEvidence.rootfsChainDigest
  };
  if (Object.keys(actual).some(key => accepted?.[key] !== actual[key])) {
    fail('runtime_authority_external_image_identity_mismatch');
  }
  return Object.freeze({ ...actual });
}

function main(argv = process.argv.slice(2)) {
  const args = parse(argv);
  const runtime = inspect('container', args['runtime-container-id']);
  const edge = inspect('container', args['edge-container-id']);
  const provider = inspect('container', args['provider-container-id']);
  const providerImage = inspect('image', provider.Image);
  const image = inspect('image', args['image-config-id']);
  const manifest = validateBuildManifest(JSON.parse(fs.readFileSync(
    path.resolve(args['build-manifest']), 'utf8'
  )));
  const archiveEvidence = verifyOciArchive(
    path.resolve(args['oci-archive']),
    path.resolve(args['build-manifest'])
  );
  const externallyAccepted = {
    archiveSha256: args['expected-oci-archive-sha256'],
    buildManifestDigest: args['expected-build-manifest-digest'],
    configDigest: args['expected-image-config-id'],
    contextDigest: args['expected-build-context-digest'],
    manifestDigest: args['expected-oci-manifest-digest'],
    rootfsChainDigest: args['expected-rootfs-chain-digest']
  };
  validateExternallyAcceptedImageEvidence(externallyAccepted, archiveEvidence, manifest);
  const profileFile = path.resolve(args.profile || '');
  const profileBytes = fs.readFileSync(profileFile);
  let profile;
  try { profile = JSON.parse(profileBytes.toString('utf8')); } catch {
    fail('runtime_authority_profile_invalid');
  }
  if (profile?.schemaVersion !== 7) fail('runtime_authority_profile_invalid');
  const nativeClosure = validateNativeClosure(JSON.parse(containerFile(
    runtime.Id, '/opt/codex-memory-runtime/native-closure.json'
  ).toString('utf8')));
  verifyNativeClosureBytes(nativeClosure, source => containerFile(runtime.Id, source));
  if (![archiveEvidence.manifestDigest, archiveEvidence.configDigest]
    .includes(image.Id) ||
      archiveEvidence.rootfsChainDigest !== digest(image.RootFS.Layers)) {
    fail('runtime_authority_imported_image_mismatch');
  }
  const stateMountContract = {
    containerPath: args['state-destination'],
    readOnly: true,
    schemaVersion: STATE_MOUNT_SCHEMA,
    stateRootClass: 'external_primary_r5c'
  };
  const runtimeMountSources = {
    authority: path.resolve(args['authority-path'] || ''),
    edgeReceipt: path.resolve(args['edge-receipt'] || ''),
    primaryState: path.resolve(args.state || ''),
    profile: profileFile,
    providerEnvironment: path.resolve(args['provider-environment'] || ''),
    providerReceipt: path.resolve(args['provider-receipt'] || ''),
    runtimeDirectory: path.resolve(args['runtime-directory'] || '')
  };
  validateRuntimeCandidate(runtime, {
    ...runtimeMountSources,
    primaryStateDestination: stateMountContract.containerPath
  });
  validateEdgeCandidate(edge);
  validateProviderCandidate(provider);
  validateProviderImageCandidate(providerImage);
  validateProviderExecutableBytes(containerFile(provider.Id, '/new-api'));
  validateProviderContainerChanges(containerChanges(provider.Id));
  const providerRevision = provider?.Config?.Labels?.['org.opencontainers.image.revision'];
  const edgeRevision = edge?.Config?.Labels?.['org.opencontainers.image.revision'];
  const candidate = validateAuthorityRecord({
    acceptedImageConfigId: image.Id,
    acceptedOciArchiveSha256: archiveEvidence.archiveSha256,
    acceptedOciManifestDigest: archiveEvidence.manifestDigest,
    authoritySchemaVersion: AUTHORITY_SCHEMA,
    buildManifestDigest: digest(manifest),
    codexMemoryCommit: manifest.codexMemoryCommit,
    containerConfigDigest: containerConfigDigest(runtime),
    edgeConfigDigest: containerConfigDigest(edge),
    edgeContainerId: edge.Id,
    edgeImageIdentity: edge.Image,
    edgeLifecycleAuthority: 'host_launcher',
    edgePolicyDigest: EDGE_POLICY_DIGEST,
    edgeRevision,
    expectedRuntimeContainerId: runtime.Id,
    hostLauncherDigest: hostTrustBundleDigest({
      authorityModuleFile: path.resolve(args['runtime-authority-module']),
      launcherFile: path.resolve(args['host-launcher']),
      nativeClosureModuleFile: path.resolve(args['native-closure-module']),
      policyModuleFile: path.resolve(args['container-policy-module']),
      tarArchiveModuleFile: path.resolve(args['tar-archive-module'])
    }),
    hostLauncherVersion: 'codex-memory-native-host-launcher/v1',
    nativeClosureDigest: nativeClosureDigest(nativeClosure),
    profilePath: profileFile,
    profileSchemaVersion: 7,
    profileSha256: sha256Buffer(profileBytes),
    providerConfigDigest: containerConfigDigest(provider),
    providerContainerId: provider.Id,
    providerImageIdentity: provider.Image,
    providerPolicyDigest: PROVIDER_POLICY_DIGEST,
    providerRevision,
    rootfsChainDigest: digest(image.RootFS.Layers),
    runtimeMountSources,
    runtimePolicyDigest: RUNTIME_POLICY_DIGEST,
    stateMountContract,
    stateMountContractDigest: digest(stateMountContract),
    vcpCommit: manifest.vcpCommit
  });
  process.stdout.write(canonicalJson(candidate));
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error?.code || error?.message || 'runtime_authority_create_failed'}\n`);
    process.exitCode = 1;
  }
}

module.exports = { main, validateExternallyAcceptedImageEvidence };
