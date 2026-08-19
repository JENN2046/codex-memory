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
  profileAuthorityComponents,
  sha256Buffer,
  validateAuthorityRecord,
  validateBuildManifest,
  validateImageProfile
} = require('../src/runtime/native-image/runtime-authority');
const {
  EDGE_POLICY_DIGEST, PROVIDER_EXECUTABLE_ARCHIVE_MAX_BYTES,
  PROVIDER_EXECUTABLE_MAX_BYTES, PROVIDER_POLICY,
  PROVIDER_POLICY_DIGEST,
  RUNTIME_POLICY_DIGEST,
  validateEdgeCandidate,
  validateEdgeSecretMountAuthority,
  validateProviderCandidate,
  validateProviderContainerChanges,
  validateProviderExecutableBytes,
  validateProviderImageCandidate,
  validateRuntimeCandidate
} = require('../src/runtime/native-image/container-policy');
const {
  validateEdgeContainerSupplyChain,
  validateEdgeDaemonImageObservation,
  validateEdgeOciArchive,
  validateEdgeSupplyChainReferences
} = require('../src/runtime/native-image/edge-image-authority');
const {
  nativeClosureDigest,
  validateNativeClosure,
  verifyNativeClosureBytes
} = require('../src/runtime/native-image/native-closure');
const { parseTarBuffer, regularFiles } = require('../src/runtime/native-image/tar-archive');
const {
  verifyOciArchive
} = require('./verify-codex-memory-runtime-image');
const { verifyEdgeOciArchive } = require('./verify-codex-memory-edge-image');
const {
  validateProviderEnvironmentMountSource
} = require('../deploy/native-runtime/host-launcher');

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function validateProviderEnvironmentAuthorityBinding(source, profile, {
  fsModule = fs,
  validator = validateProviderEnvironmentMountSource
} = {}) {
  let evidence;
  try { evidence = validator(source, { fsModule }); } catch {
    fail('runtime_authority_provider_environment_invalid');
  }
  if (!/^sha256:[a-f0-9]{64}$/u.test(evidence?.configDigest || '') ||
      evidence.configDigest !== profile?.vcpProviderConfigDigest) {
    fail('runtime_authority_provider_environment_digest_mismatch');
  }
  return Object.freeze({
    configDigest: evidence.configDigest,
    path: source,
    runtimeCanRead: evidence.runtimeCanRead === true,
    runtimeCanWrite: evidence.runtimeCanWrite === true
  });
}
function validateAuthorityProfileBytes(profileBytes) {
  if (!Buffer.isBuffer(profileBytes) || profileBytes.length < 2 ||
      profileBytes.length > 262_144) fail('runtime_authority_profile_invalid');
  let parsed;
  try { parsed = JSON.parse(profileBytes.toString('utf8')); } catch {
    fail('runtime_authority_profile_invalid');
  }
  try { return validateImageProfile(parsed); } catch {
    fail('runtime_authority_profile_invalid');
  }
}
function inspect(kind, id) {
  const parsed = JSON.parse(execFileSync('/usr/bin/docker', [kind, 'inspect', id], {
    encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  }));
  if (!Array.isArray(parsed) || parsed.length !== 1) fail('runtime_authority_inspect_invalid');
  return parsed[0];
}
function containerFile(id, source) {
  const providerExecutable = source === PROVIDER_POLICY.executable;
  const maximumFileBytes = providerExecutable
    ? PROVIDER_EXECUTABLE_MAX_BYTES : 32 * 1024 * 1024;
  const maximumArchiveBytes = providerExecutable
    ? PROVIDER_EXECUTABLE_ARCHIVE_MAX_BYTES : 8 * 1024 * 1024;
  const buffer = execFileSync('/usr/bin/docker', ['container', 'cp', `${id}:${source}`, '-'], {
    encoding: null, maxBuffer: maximumArchiveBytes, stdio: ['ignore', 'pipe', 'pipe']
  });
  const files = regularFiles(parseTarBuffer(buffer, {
    maximumEntries: 8, maximumFileBytes,
    maximumTotalBytes: maximumFileBytes
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
function imageArchive(id) {
  return execFileSync('/usr/bin/docker', ['image', 'save', id], {
    encoding: null, maxBuffer: 512 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
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

function validateExternallyAcceptedEdgeEvidence(accepted, evidence) {
  const actual = {
    artifactSha256: evidence.artifactSha256,
    buildContextDigest: evidence.buildContextDigest,
    buildManifestDigest: evidence.buildManifestDigest,
    imageConfigDigest: evidence.imageConfigDigest,
    lockfileSha256: evidence.lockfileSha256,
    ociManifestDigest: evidence.ociManifestDigest,
    sourceCommit: evidence.sourceCommit
  };
  if (Object.keys(actual).some(key => accepted?.[key] !== actual[key])) {
    fail('runtime_authority_external_edge_image_identity_mismatch');
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
  const edgeArchiveEvidence = verifyEdgeOciArchive(
    path.resolve(args['edge-oci-archive'] || ''),
    path.resolve(args['edge-build-manifest'] || '')
  );
  validateExternallyAcceptedEdgeEvidence({
    artifactSha256: args['expected-edge-artifact-sha256'],
    buildContextDigest: args['expected-edge-build-context-digest'],
    buildManifestDigest: args['expected-edge-build-manifest-digest'],
    imageConfigDigest: args['expected-edge-image-config-digest'],
    lockfileSha256: args['expected-edge-lockfile-sha256'],
    ociManifestDigest: args['expected-edge-oci-manifest-digest'],
    sourceCommit: args['expected-edge-source-commit']
  }, edgeArchiveEvidence);
  const profileFile = path.resolve(args.profile || '');
  const profileBytes = fs.readFileSync(profileFile);
  const profile = validateAuthorityProfileBytes(profileBytes);
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
  validateProviderEnvironmentAuthorityBinding(
    runtimeMountSources.providerEnvironment,
    profile
  );
  validateRuntimeCandidate(runtime, {
    ...runtimeMountSources,
    primaryStateDestination: stateMountContract.containerPath
  });
  validateEdgeCandidate(edge);
  validateEdgeSecretMountAuthority(edge);
  const edgeImage = inspect('image', edge.Image);
  const edgeLocalArchiveEvidence = validateEdgeOciArchive(imageArchive(edge.Image));
  for (const field of ['imageConfigDigest',
    'imageStoreIdentityModel', 'lockfileSha256', 'ociManifestDigest', 'sourceCommit']) {
    if (edgeLocalArchiveEvidence[field] !== edgeArchiveEvidence[field]) {
      fail('runtime_authority_edge_local_image_identity_mismatch');
    }
  }
  const edgeDaemonEvidence = validateEdgeDaemonImageObservation(edgeImage, edgeArchiveEvidence);
  const edgeSupplyChainReferences = validateEdgeSupplyChainReferences({
    edgeBindingDigest: args['expected-edge-binding-digest'],
    edgeBindingReference: args['expected-edge-binding-reference'],
    edgeHostProjectReference: args['expected-edge-host-project-reference'],
    edgeOperatorReference: args['expected-edge-operator-reference'],
    edgePreviousBindingReference: args['expected-edge-previous-binding-reference']
  });
  validateEdgeContainerSupplyChain(edge, {
    edgeArtifactSha256: edgeArchiveEvidence.artifactSha256,
    edgeDaemonImageIdentity: edgeDaemonEvidence.daemonImageIdentity,
    edgeLockfileSha256: edgeArchiveEvidence.lockfileSha256,
    edgeSourceCommit: edgeArchiveEvidence.sourceCommit,
    ...edgeSupplyChainReferences
  });
  const providerImageEvidence = validateProviderImageCandidate(
    providerImage, imageArchive(provider.Image)
  );
  const providerVolume = inspect('volume', PROVIDER_POLICY.stateMount.name);
  validateProviderCandidate(provider, providerImageEvidence, {
    volumeObservation: providerVolume
  });
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
    edgeArtifactSha256: edgeArchiveEvidence.artifactSha256,
    ...edgeSupplyChainReferences,
    edgeBuildContextDigest: edgeArchiveEvidence.buildContextDigest,
    edgeBuildManifestDigest: edgeArchiveEvidence.buildManifestDigest,
    edgeDaemonImageIdentity: edgeDaemonEvidence.daemonImageIdentity,
    edgeImageConfigDigest: edgeArchiveEvidence.imageConfigDigest,
    edgeImageStoreIdentityModel: edgeDaemonEvidence.imageStoreIdentityModel,
    edgeLifecycleAuthority: 'host_launcher',
    edgeLockfileSha256: edgeArchiveEvidence.lockfileSha256,
    edgeOciManifestDigest: edgeArchiveEvidence.ociManifestDigest,
    edgePolicyDigest: EDGE_POLICY_DIGEST,
    edgeRevision,
    edgeSourceCommit: edgeArchiveEvidence.sourceCommit,
    expectedRuntimeContainerId: runtime.Id,
    hostLauncherDigest: hostTrustBundleDigest({
      authorityModuleFile: path.resolve(args['runtime-authority-module']),
      edgeImageAuthorityModuleFile: path.resolve(args['edge-image-authority-module']),
      launcherFile: path.resolve(args['host-launcher']),
      nativeClosureModuleFile: path.resolve(args['native-closure-module']),
      policyModuleFile: path.resolve(args['container-policy-module']),
      providerImageAuthorityModuleFile:
        path.resolve(args['provider-image-authority-module']),
      tarArchiveModuleFile: path.resolve(args['tar-archive-module'])
    }),
    hostLauncherVersion: 'codex-memory-native-host-launcher/v1',
    nativeClosureDigest: nativeClosureDigest(nativeClosure),
    profilePath: profileFile,
    profileSchemaVersion: 7,
    profileSha256: sha256Buffer(profileBytes),
    providerContainerConfigDigest: containerConfigDigest(provider),
    providerContainerId: provider.Id,
    providerDaemonImageIdentity: providerImageEvidence.daemonImageIdentity,
    providerImageConfigDigest: providerImageEvidence.imageConfigDigest,
    providerImageStoreIdentityModel: providerImageEvidence.imageStoreIdentityModel,
    providerOciManifestDigest: providerImageEvidence.ociManifestDigest,
    providerPolicyDigest: PROVIDER_POLICY_DIGEST,
    providerRevision,
    rootfsChainDigest: digest(image.RootFS.Layers),
    runtimeMountSources,
    runtimePolicyDigest: RUNTIME_POLICY_DIGEST,
    stateMountContract,
    stateMountContractDigest: digest(stateMountContract),
    vcpCommit: manifest.vcpCommit
  });
  try {
    validateImageProfile(profile, profileAuthorityComponents(candidate));
  } catch {
    fail('runtime_authority_profile_authority_mismatch');
  }
  process.stdout.write(canonicalJson(candidate));
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error?.code || error?.message || 'runtime_authority_create_failed'}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  main,
  validateAuthorityProfileBytes,
  validateProviderEnvironmentAuthorityBinding,
  validateExternallyAcceptedEdgeEvidence,
  validateExternallyAcceptedImageEvidence
};
