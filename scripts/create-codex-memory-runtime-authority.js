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
  profileV7GenerationRolloverCandidate,
  profileV7InitialBootstrapCandidate,
  profileAuthorityComponents,
  readBoundedBuffer,
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
    // Accepted flags include digits (e.g. `--expected-oci-archive-sha256`), so
    // the option name class must allow them; without this the CLI argv path is
    // uninvocable, which is why no end-to-end coverage previously existed.
    const match = /^--([a-z0-9-]+)=(.+)$/u.exec(arg);
    if (!match) fail('runtime_authority_argument_invalid');
    values[match[1]] = match[2];
  }
  return values;
}

// The initial-bootstrap seed is a root-supplied authority input, so it is read
// through the same hardened primitive used for installed authority records:
// an O_NOFOLLOW descriptor, a bounded size, a regular-file check, a
// group/other-writable rejection, an optional root-ownership requirement, and a
// before/after identity check that rejects TOCTOU replacement mid-read.
function readInitialProfileSeed(file, {
  fsModule = fs,
  requireRootFiles = true,
  maximumBytes = 262_144
} = {}) {
  let bytes;
  try {
    bytes = readBoundedBuffer(file, {
      fsModule,
      maximumBytes,
      requireRootOwner: requireRootFiles,
      requireRootOwnedParent: requireRootFiles
    });
  } catch { fail('runtime_initial_profile_seed_unavailable'); }
  try { return JSON.parse(bytes.toString('utf8')); } catch {
    fail('runtime_initial_profile_seed_invalid');
  }
}

// The generation-rollover source (current active authority + current accepted
// schema-v7 profile) is a root-supplied authority input. It is read through the
// same hardened primitive used for installed authority records: O_NOFOLLOW,
// bounded size, regular-file, group/other-writable rejection, root-ownership
// requirement, and a before/after identity check against TOCTOU replacement.
function readGenerationRolloverSource(authorityFile, profileFile, {
  fsModule = fs,
  requireRootFiles = true,
  maximumBytes = 262_144
} = {}) {
  let authorityBytes;
  let profileBytes;
  try {
    authorityBytes = readBoundedBuffer(authorityFile, {
      fsModule, maximumBytes,
      requireRootOwner: requireRootFiles,
      requireRootOwnedParent: requireRootFiles
    });
    profileBytes = readBoundedBuffer(profileFile, {
      fsModule, maximumBytes,
      requireRootOwner: requireRootFiles,
      requireRootOwnedParent: requireRootFiles
    });
  } catch { fail('runtime_authority_generation_source_unavailable'); }
  let authority;
  let profile;
  try {
    authority = validateAuthorityRecord(JSON.parse(authorityBytes.toString('utf8')));
    profile = validateAuthorityProfileBytes(profileBytes);
  } catch { fail('runtime_authority_generation_source_invalid'); }
  return Object.freeze({ authority, profile, profileBytes, authorityBytes });
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

function main(argv = process.argv.slice(2), deps = {}) {
  // The docker/OCI/native-closure boundary is injectable so the bootstrap and
  // steady-state paths can be exercised end-to-end against fixtures without a
  // live host. Defaults preserve the exact production behavior.
  const inspectContainerOrImage = deps.inspect || inspect;
  const readContainerFile = deps.containerFile || containerFile;
  const readContainerChanges = deps.containerChanges || containerChanges;
  const readImageArchive = deps.imageArchive || imageArchive;
  const verifyRuntimeOciArchive = deps.verifyOciArchive || verifyOciArchive;
  const verifyEdgeArchive = deps.verifyEdgeOciArchive || verifyEdgeOciArchive;
  const verifyNativeClosureContents = deps.verifyNativeClosureBytes ||
    verifyNativeClosureBytes;
  const readBuildManifest = deps.readBuildManifest || (file =>
    JSON.parse(fs.readFileSync(file, 'utf8')));
  const writeOutput = deps.writeOutput ||
    (output => process.stdout.write(output));
  const seedReaderOptions = deps.seedReaderOptions || {};
  const fsModule = deps.fsModule || fs;
  const providerEnvironmentValidator = deps.providerEnvironmentValidator;
  // The OCI archive/image-admission validators require real multi-hundred-MB
  // tarballs; the host launcher already injects the equivalent evidence, so the
  // same boundary is injectable here for fixture-driven end-to-end coverage.
  const validateEdgeLocalArchive = deps.validateEdgeLocalArchive || validateEdgeOciArchive;
  const validateProviderImage = deps.validateProviderImage || validateProviderImageCandidate;
  const args = parse(argv);
  const runtime = inspectContainerOrImage('container', args['runtime-container-id']);
  const edge = inspectContainerOrImage('container', args['edge-container-id']);
  const provider = inspectContainerOrImage('container', args['provider-container-id']);
  const providerImage = inspectContainerOrImage('image', provider.Image);
  const image = inspectContainerOrImage('image', args['image-config-id']);
  const manifest = validateBuildManifest(readBuildManifest(
    path.resolve(args['build-manifest'])
  ));
  const archiveEvidence = verifyRuntimeOciArchive(
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
  const edgeArchiveEvidence = verifyEdgeArchive(
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
  const initialBootstrap = Boolean(args['initial-profile-seed']);
  const generationRollover = Boolean(args['generation-profile-source']);
  if (!args.profile) fail('runtime_authority_profile_path_required');
  if (initialBootstrap && generationRollover) {
    fail('runtime_authority_mode_conflict');
  }
  let profileBytes = (initialBootstrap || generationRollover)
    ? null : fs.readFileSync(profileFile);
  let profile = (initialBootstrap || generationRollover)
    ? null : validateAuthorityProfileBytes(profileBytes);
  const initialProfileSeed = initialBootstrap
    ? readInitialProfileSeed(
      path.resolve(args['initial-profile-seed']), seedReaderOptions
    )
    : null;
  // Generation rollover: the current accepted schema-v7 profile plus the
  // current ACTIVE authority are the rollover source. They are admitted here
  // (read root-hardened) and consumed after the profile-independent NEW
  // authority components are built, so the source admission never participates
  // in deriving those components.
  const generationRolloverSource = generationRollover
    ? readGenerationRolloverSource(
      path.resolve(args['current-authority'] || ''),
      path.resolve(args['generation-profile-source']),
      { fsModule, ...seedReaderOptions }
    )
    : null;
  if (generationRollover &&
      (!args['current-authority'] ||
       !args['expected-current-profile-fingerprint'])) {
    fail('runtime_authority_generation_rollover_input_missing');
  }
  const nativeClosure = validateNativeClosure(JSON.parse(readContainerFile(
    runtime.Id, '/opt/codex-memory-runtime/native-closure.json'
  ).toString('utf8')));
  verifyNativeClosureContents(nativeClosure, source => readContainerFile(runtime.Id, source));
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
  const providerEnvironmentBindingOptions = {
    fsModule,
    ...(providerEnvironmentValidator ? { validator: providerEnvironmentValidator } : {})
  };
  if (profile) validateProviderEnvironmentAuthorityBinding(
    runtimeMountSources.providerEnvironment, profile,
    providerEnvironmentBindingOptions
  );
  validateRuntimeCandidate(runtime, {
    ...runtimeMountSources,
    primaryStateDestination: stateMountContract.containerPath
  });
  validateEdgeCandidate(edge);
  validateEdgeSecretMountAuthority(edge, { fsModule });
  const edgeImage = inspectContainerOrImage('image', edge.Image);
  const edgeLocalArchiveEvidence = validateEdgeLocalArchive(readImageArchive(edge.Image));
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
  const providerImageEvidence = validateProviderImage(
    providerImage, readImageArchive(provider.Image)
  );
  const providerVolume = inspectContainerOrImage('volume', PROVIDER_POLICY.stateMount.name);
  validateProviderCandidate(provider, providerImageEvidence, {
    volumeObservation: providerVolume
  });
  validateProviderExecutableBytes(readContainerFile(provider.Id, '/new-api'));
  validateProviderContainerChanges(readContainerChanges(provider.Id));
  const providerRevision = provider?.Config?.Labels?.['org.opencontainers.image.revision'];
  const edgeRevision = edge?.Config?.Labels?.['org.opencontainers.image.revision'];
  let candidate = validateAuthorityRecord({
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
    // Normal mode binds the supplied profile bytes directly. Initial bootstrap
    // and generation rollover have no new profile yet, so they use a
    // provisional digest that is recomputed from the derived profile bytes
    // below before anything is published. The provisional value never enters
    // the derived profile (profileAuthorityComponents() is independent of
    // profileSha256), which prevents a profile/authority self-hash cycle.
    profileSha256: (initialBootstrap || generationRollover)
      ? sha256Buffer(Buffer.from(
        initialBootstrap ? 'initial-profile-bootstrap' : 'generation-rollover'))
      : sha256Buffer(profileBytes),
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
  if (initialBootstrap) {
    const initial = profileV7InitialBootstrapCandidate(
      initialProfileSeed, profileAuthorityComponents(candidate)
    ).nextProfile;
    profile = initial;
    profileBytes = Buffer.from(canonicalJson(profile));
    candidate = validateAuthorityRecord({
      ...candidate,
      profileSha256: sha256Buffer(profileBytes)
    });
    validateProviderEnvironmentAuthorityBinding(
      runtimeMountSources.providerEnvironment, profile,
      providerEnvironmentBindingOptions
    );
  }
  if (generationRollover) {
    // The observed NEW Runtime must be stopped: it is a candidate for a future
    // activation, and a running candidate must never be admitted into a new
    // generation authority by this creator.
    if (runtime?.State?.Running === true) {
      fail('runtime_authority_generation_runtime_active');
    }
    // Current-profile acceptance is not delegated to the pure producer: the
    // exact profile bytes must be bound by the ACTIVE authority (profileSha256)
    // and the profile must validate against the ACTIVE authority components.
    // Only then is it admitted as the rollover continuity source.
    const source = generationRolloverSource;
    if (sha256Buffer(source.profileBytes) !== source.authority.profileSha256) {
      fail('runtime_authority_generation_source_not_active');
    }
    try {
      validateImageProfile(
        source.profile,
        profileAuthorityComponents(source.authority)
      );
    } catch {
      fail('runtime_authority_generation_source_not_active');
    }
    const rollover = profileV7GenerationRolloverCandidate(
      source.profile,
      profileAuthorityComponents(candidate),
      { expectedCurrentFingerprint: args['expected-current-profile-fingerprint'] }
    );
    profile = rollover.nextProfile;
    profileBytes = Buffer.from(rollover.nextProfileBytes);
    candidate = validateAuthorityRecord({
      ...candidate,
      profileSha256: sha256Buffer(profileBytes)
    });
    validateProviderEnvironmentAuthorityBinding(
      runtimeMountSources.providerEnvironment, profile,
      providerEnvironmentBindingOptions
    );
  }
  try {
    validateImageProfile(profile, profileAuthorityComponents(candidate));
  } catch {
    fail('runtime_authority_profile_authority_mismatch');
  }
  const output = canonicalJson(initialBootstrap
    ? { authority: candidate, profile, profileSha256: sha256Buffer(profileBytes) }
    : generationRollover
      ? { authority: candidate, profile, profileSha256: sha256Buffer(profileBytes),
        classification: 'generation_rollover' }
      : candidate);
  writeOutput(output);
  return output;
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error?.code || error?.message || 'runtime_authority_create_failed'}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  main,
  readInitialProfileSeed,
  validateAuthorityProfileBytes,
  validateProviderEnvironmentAuthorityBinding,
  validateExternallyAcceptedEdgeEvidence,
  validateExternallyAcceptedImageEvidence
};
