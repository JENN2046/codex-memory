'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  PROFILE_SCHEMA_VERSION,
  acquireLifecycleProfile,
  acquireOwnerLock,
  inspectStoppedStateForOwnerProfileTransition,
  validateProfile
} = require('../scripts/codex-memory-stack');
const {
  coordinateStoppedOwnerProfileTransition,
  projectAcquisitionFailure,
  projectReleaseFailure
} = require('../scripts/codex-memory-stopped-profile-transition');
const observer = require('../scripts/codex-memory-process-observer');
const {
  COMMAND_SHAPES,
  DECISIONS,
  EVIDENCE_STATUS,
  OWNER_STATES,
  classifyManagedCommandShape,
  classifyManagedProcessEvidence,
  scanManagedProcesses
} = observer;

const GIT = suffix => suffix.repeat(40);
const SHA = suffix => `sha256:${suffix.repeat(64)}`;
const CONTAINER = suffix => suffix.repeat(64);
const CURRENT_HEAD = GIT('a');
const CURRENT_MANIFEST = SHA('b');
const CANDIDATE_HEAD = GIT('c');
const CANDIDATE_MANIFEST = SHA('d');
const RUNTIME_REPOSITORY = '/synthetic/runtime-repository';
const PRIVATE_ROOT = '/synthetic/owner-root';

function codedError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function profile(overrides = {}) {
  return validateProfile({
    schemaVersion: PROFILE_SCHEMA_VERSION,
    adoptedRepositoryHead: CURRENT_HEAD,
    controllerSourceManifestDigest: CURRENT_MANIFEST,
    controllerSourceManifestVersion: 1,
    governanceEnvironmentConfigDigest: SHA('e'),
    relayEnvironmentConfigDigest: SHA('f'),
    runtimeBaseline: GIT('1'),
    runtimeRepository: RUNTIME_REPOSITORY,
    retainedBindingSource: GIT('2'),
    privateRoot: PRIVATE_ROOT,
    providerContainer: 'new-api-wsl',
    providerContainerId: CONTAINER('3'),
    providerImageId: SHA('4'),
    providerRevision: GIT('5'),
    governanceEnvironment: 'governance/runtime.env',
    relayEnvironment: 'relay/runtime.env',
    retainedBinding: 'r5m-exact-head/private-binding.json',
    edgeContainer: 'codex-memory-full-stack-001-edge',
    edgeContainerId: CONTAINER('6'),
    vcpProviderConfigDigest: SHA('7'),
    vcpRuntimeBaseline: GIT('8'),
    vcpRuntimeRepository: '/synthetic/vcp-repository',
    vcpRuntimeScopeDigest: SHA('9'),
    ...overrides
  });
}

function candidateBinding() {
  return {
    repositoryHead: CANDIDATE_HEAD,
    controllerSourceManifestDigest: CANDIDATE_MANIFEST,
    controllerSourceManifestVersion: 1
  };
}

function candidateSource(binding, overrides = {}) {
  return {
    head: binding.repositoryHead,
    clean: true,
    baselineExists: true,
    currentMain: true,
    repositoryMatch: true,
    controllerOnlyChanges: false,
    controllerSourceMatch: false,
    identityMode: 'manifest_v1',
    manifestRecognized: true,
    manifestVersion: binding.controllerSourceManifestVersion,
    manifestDigest: binding.controllerSourceManifestDigest,
    manifestComplete: true,
    manifestScopeClean: true,
    adoptedHeadReadable: true,
    adoptedHeadAncestor: true,
    ...overrides
  };
}

function runTransition({
  current = profile(),
  transaction = {
    classification: 'COMMITTED',
    errorCode: null,
    oldFingerprint: 'current-fingerprint',
    nextFingerprint: 'next-fingerprint',
    readBackFingerprint: 'next-fingerprint',
    mutated: true,
    durabilityConfirmed: true,
    committedProfileMatchesNext: true
  },
  releaseError = null,
  acquireLifecycleProfile: acquireOverride,
  inspectSourceCompatibility: sourceOverride,
  inspectStoppedState: stoppedOverride,
  commitOwnerProfileTransaction: commitOverride
} = {}) {
  const binding = candidateBinding();
  const events = [];
  let releaseCalls = 0;
  let p1Calls = 0;
  let committedNextProfile = null;
  const lifecycle = {
    profile: current,
    release() {
      releaseCalls += 1;
      events.push('release');
      if (releaseError) throw releaseError;
      return true;
    }
  };
  const acquireLifecycleProfile = acquireOverride || (() => {
    events.push('acquire');
    return lifecycle;
  });
  const inspectSourceCompatibility = sourceOverride || (() => {
    events.push('candidate');
    return candidateSource(binding);
  });
  const inspectStoppedState = stoppedOverride || (() => {
    events.push('stopped');
    return { inspectionComplete: true };
  });
  const commitOwnerProfileTransaction = commitOverride || (input => {
    events.push('p1');
    p1Calls += 1;
    committedNextProfile = input.nextProfile;
    return transaction;
  });
  const result = coordinateStoppedOwnerProfileTransition({
    candidateBinding: binding,
    profilePath: '/synthetic/full-stack-control.json',
    manifestSchemaVersion: 1,
    acquireLifecycleProfile,
    inspectSourceCompatibility,
    inspectStoppedState,
    validateProfile(value) {
      events.push(value.adoptedRepositoryHead === current.adoptedRepositoryHead &&
        value.controllerSourceManifestDigest ===
          current.controllerSourceManifestDigest
        ? 'validate-current'
        : 'validate-next');
      return validateProfile(value);
    },
    canonicalProfileFingerprint(value) {
      const currentValue = value.adoptedRepositoryHead ===
          current.adoptedRepositoryHead &&
        value.controllerSourceManifestDigest ===
          current.controllerSourceManifestDigest;
      events.push(currentValue
        ? 'fingerprint-current'
        : 'fingerprint-next');
      return currentValue
        ? 'current-fingerprint'
        : 'next-fingerprint';
    },
    commitOwnerProfileTransaction
  });
  return {
    result,
    events,
    releaseCalls,
    p1Calls,
    committedNextProfile,
    binding
  };
}

function safeEdge(current) {
  return {
    id: current.edgeContainerId,
    revision: current.runtimeBaseline,
    running: false,
    configurationSecure: true,
    secure: true
  };
}

function emptyPidState() {
  return { present: false, valid: true, pid: null };
}

function exactHttpCommand(current, environment) {
  return [
    fs.realpathSync(process.execPath),
    path.join(current.runtimeRepository, 'scripts', 'codex-memory-stack.js'),
    '_run-http',
    `--stack-environment=${path.resolve(
      current.privateRoot,
      current.governanceEnvironment
    )}`
  ];
}

function stoppedInspectionOptions(current, {
  pids = [],
  pidStates = {},
  livePids = new Set(pids),
  command = exactHttpCommand(current, { XDG_RUNTIME_DIR: '/synthetic/run' }),
  executable = fs.realpathSync(process.execPath),
  cwd = current.runtimeRepository,
  owner = OWNER_STATES.SAME_OWNER,
  startIdentity = '101'
} = {}) {
  const environment = { XDG_RUNTIME_DIR: '/synthetic/run' };
  return {
    environment,
    inspectEdge: () => safeEdge(current),
    readPidFileState: name => pidStates[name] || emptyPidState(),
    listPids: () => pids,
    readLiveness: pid => livePids.has(pid),
    readOwner: () => owner,
    readExecutable: () => executable,
    readCwd: () => cwd,
    readCommandLine: () => command,
    readStartIdentity: () => startIdentity,
    controllerPid: process.pid
  };
}

const OBSERVER_RUNTIME = '/synthetic/runtime-repository';
const OBSERVER_NODE = '/synthetic/node';

function observerEvidence(overrides = {}) {
  return {
    pid: 4321,
    running: true,
    disappeared: false,
    owner: { status: OWNER_STATES.SAME_OWNER },
    canonicalNode: { status: EVIDENCE_STATUS.RESOLVED, path: OBSERVER_NODE },
    executable: { status: EVIDENCE_STATUS.READABLE, path: OBSERVER_NODE },
    cwd: { status: EVIDENCE_STATUS.READABLE, path: OBSERVER_RUNTIME },
    command: {
      status: EVIDENCE_STATUS.READABLE,
      argv: ['node', 'managed.js', '_run-http']
    },
    startIdentity: { status: EVIDENCE_STATUS.VALID, value: '77' },
    ...overrides
  };
}

function observerDecision(overrides = {}) {
  return classifyManagedProcessEvidence(observerEvidence(overrides), {
    runtimeRepository: OBSERVER_RUNTIME,
    commandShape: overrides.commandShape || COMMAND_SHAPES.MANAGED_SHAPE,
    exactComponent: overrides.exactComponent || null,
    controllerSelf: overrides.controllerSelf === true
  });
}

function scanObserverOne({
  runtimeRepository = OBSERVER_RUNTIME,
  executable = OBSERVER_NODE,
  cwd = OBSERVER_RUNTIME,
  owner = OWNER_STATES.SAME_OWNER,
  command = ['node', 'managed.js', '_run-http'],
  commandShape = COMMAND_SHAPES.MANAGED_SHAPE,
  exactComponent = 'http',
  canonicalNode = OBSERVER_NODE,
  liveness = [true, true, true],
  commandReadable = true,
  controllerPid = 999,
  startIdentity = '88',
  canonicalResolver = null
} = {}) {
  const calls = [];
  let livenessIndex = 0;
  const result = scanManagedProcesses({
    enumerateProcessIds() {
      calls.push('enumerate');
      return [123];
    },
    resolveCanonicalNode(value) {
      calls.push(`canonical:${value}`);
      if (canonicalNode === null) throw new Error('node unavailable');
      return canonicalResolver ? canonicalResolver(value) : canonicalNode;
    },
    execPath: OBSERVER_NODE,
    runtimeRepository,
    controllerPid,
    readLiveness() {
      calls.push('liveness');
      return liveness[livenessIndex++] ?? liveness.at(-1);
    },
    readOwner() {
      calls.push('owner');
      return owner;
    },
    readExecutable() {
      calls.push('executable');
      return executable;
    },
    readCwd() {
      calls.push('cwd');
      return cwd;
    },
    readCommandLine() {
      calls.push('cmdline');
      return commandReadable ? command : null;
    },
    classifyCommandShape() {
      calls.push('shape');
      return commandShape;
    },
    exactComponentMatcher() {
      calls.push('exact');
      return exactComponent;
    },
    readStartIdentity() {
      calls.push('start');
      return startIdentity;
    }
  });
  return { calls, result };
}

function assertSanitizedScanResult(result, canonicalStatus) {
  assert.deepEqual(result.canonicalNode, { status: canonicalStatus });
  for (const forbidden of [
    'evidence',
    'command',
    'argv',
    'executable',
    'cwd',
    'startIdentity'
  ]) {
    assert.equal(Object.hasOwn(result, forbidden), false, forbidden);
  }
  for (const match of result.componentMatches) {
    assert.deepEqual(Object.keys(match).sort(), ['component', 'pid']);
  }
}

test('observer exports only the sanitized process-observation contract', () => {
  assert.deepEqual(Object.keys(observer).sort(), [
    'COMMAND_SHAPES',
    'DECISIONS',
    'EVIDENCE_STATUS',
    'OWNER_STATES',
    'classifyManagedCommandShape',
    'classifyManagedProcessEvidence',
    'scanManagedProcesses'
  ].sort());
  assert.equal(Object.hasOwn(observer, 'collectProcessEvidence'), false);
  assert.equal(Object.hasOwn(observer, 'createCanonicalNodeSnapshot'), false);
});

test('tri-state command shape and evidence classifiers never conflate unknown with nonmatch', () => {
  const matchComponents = argv =>
    argv[1] === 'managed.js' ? ['http'] : [];
  const hasHint = argv => argv.includes('_run-http');
  assert.equal(classifyManagedCommandShape(['node', 'managed.js'], {
    matchComponents,
    hasManagedShapeHint: hasHint
  }), COMMAND_SHAPES.MANAGED_SHAPE);
  assert.equal(classifyManagedCommandShape(['node', 'other.js'], {
    matchComponents,
    hasManagedShapeHint: hasHint
  }), COMMAND_SHAPES.DEFINITIVELY_UNRELATED);
  assert.equal(classifyManagedCommandShape(['node', '_run-http'], {
    matchComponents,
    hasManagedShapeHint: hasHint
  }), COMMAND_SHAPES.AMBIGUOUS);
  assert.equal(observerDecision({ exactComponent: null }).decision,
    DECISIONS.IGNORE);
  assert.equal(observerDecision({
    canonicalNode: { status: EVIDENCE_STATUS.UNAVAILABLE, path: null },
    exactComponent: null
  }).decision, DECISIONS.FAIL_CLOSED);
  assert.equal(observerDecision({
    executable: { status: EVIDENCE_STATUS.UNREADABLE, path: null }
  }).decision, DECISIONS.FAIL_CLOSED);
  assert.equal(observerDecision({
    executable: { status: EVIDENCE_STATUS.UNREADABLE, path: null },
    commandShape: COMMAND_SHAPES.DEFINITIVELY_UNRELATED
  }).decision, DECISIONS.IGNORE);
});

test('tri-state scanner minimizes reads and only reads start identity after exact match', () => {
  const foreign = scanObserverOne({ owner: OWNER_STATES.FOREIGN_OWNER });
  assert.equal(foreign.result.decision, DECISIONS.IGNORE);
  assert.equal(foreign.calls.includes('cmdline'), false);

  const self = scanObserverOne({ controllerPid: 123 });
  assert.equal(self.result.decision, DECISIONS.IGNORE);
  assert.equal(self.calls.includes('cmdline'), false);

  const otherCwd = scanObserverOne({ cwd: '/other/repository' });
  assert.equal(otherCwd.result.decision, DECISIONS.IGNORE);
  assert.equal(otherCwd.calls.includes('cmdline'), false);

  const nonNode = scanObserverOne({ executable: '/usr/bin/python3' });
  assert.equal(nonNode.result.decision, DECISIONS.IGNORE);
  assert.equal(nonNode.calls.includes('cmdline'), false);

  const exact = scanObserverOne();
  assert.equal(exact.result.decision, DECISIONS.EXACT);
  assertSanitizedScanResult(exact.result, EVIDENCE_STATUS.RESOLVED);
  assert.equal(Object.hasOwn(exact.result.canonicalNode, 'path'), false);
  assert.equal(Object.hasOwn(exact.result, 'argv'), false);
  assert.deepEqual(exact.calls, [
    'canonical:/synthetic/node',
    'enumerate',
    'liveness',
    'owner',
    'executable',
    'cwd',
    'liveness',
    'cmdline',
    'liveness',
    'shape',
    'exact',
    'start'
  ]);
  const nonmatch = scanObserverOne({ exactComponent: null });
  assert.equal(nonmatch.result.decision, DECISIONS.IGNORE);
  assertSanitizedScanResult(nonmatch.result, EVIDENCE_STATUS.RESOLVED);
  assert.equal(nonmatch.calls.includes('start'), false);
});

test('canonical Node unavailable and incomplete identity remain fail-closed when plausible', () => {
  const nodeUnavailable = scanObserverOne({
    canonicalNode: null,
    commandShape: COMMAND_SHAPES.MANAGED_SHAPE
  });
  assert.equal(nodeUnavailable.result.decision, DECISIONS.FAIL_CLOSED);
  assertSanitizedScanResult(nodeUnavailable.result, EVIDENCE_STATUS.UNAVAILABLE);
  assert.equal(nodeUnavailable.calls.includes('start'), false);

  const cwdUnavailable = scanObserverOne({
    cwd: null,
    commandShape: COMMAND_SHAPES.MANAGED_SHAPE
  });
  assert.equal(cwdUnavailable.result.decision, DECISIONS.FAIL_CLOSED);
  assertSanitizedScanResult(cwdUnavailable.result, EVIDENCE_STATUS.RESOLVED);
  assert.equal(cwdUnavailable.calls.includes('start'), false);

  const argvUnavailable = scanObserverOne({ commandReadable: false });
  assert.equal(argvUnavailable.result.decision, DECISIONS.FAIL_CLOSED);
  assertSanitizedScanResult(argvUnavailable.result, EVIDENCE_STATUS.RESOLVED);
  assert.equal(argvUnavailable.calls.includes('start'), false);

  const invalidStart = scanObserverOne({ startIdentity: 'not-a-start-tick' });
  assert.equal(invalidStart.result.decision, DECISIONS.FAIL_CLOSED);
  assertSanitizedScanResult(invalidStart.result, EVIDENCE_STATUS.RESOLVED);
  assert.equal(invalidStart.calls.at(-1), 'start');
});

test('canonical Node is snapshotted once and disappearance is ignored', () => {
  let resolverCalls = 0;
  const snapshot = scanObserverOne({
    canonicalResolver() {
      resolverCalls += 1;
      return resolverCalls === 1 ? OBSERVER_NODE : '/synthetic/changed-node';
    }
  });
  assertSanitizedScanResult(snapshot.result, EVIDENCE_STATUS.RESOLVED);
  assert.equal(resolverCalls, 1);
  assert.equal(Object.hasOwn(snapshot.result.canonicalNode, 'path'), false);

  const disappeared = scanObserverOne({
    owner: OWNER_STATES.UNKNOWN,
    liveness: [true, false]
  });
  assert.equal(disappeared.result.decision, DECISIONS.IGNORE);
  assert.equal(disappeared.calls.includes('cmdline'), false);

  const unavailableEnumeration = scanManagedProcesses({
    runtimeRepository: OBSERVER_RUNTIME,
    enumerateProcessIds() {
      throw new Error('enumeration unavailable');
    },
    resolveCanonicalNode: () => OBSERVER_NODE,
    execPath: OBSERVER_NODE
  });
  assert.equal(unavailableEnumeration.decision, DECISIONS.FAIL_CLOSED);
  assertSanitizedScanResult(unavailableEnumeration, EVIDENCE_STATUS.RESOLVED);
  assert.equal(Object.hasOwn(unavailableEnumeration.canonicalNode, 'path'), false);
});

test('all scan paths exclude raw process evidence and recognizable markers', () => {
  const markerScan = scanObserverOne({
    runtimeRepository: '/synthetic/RAW_CWD_SECRET_MARKER',
    executable: '/synthetic/RAW_EXECUTABLE_SECRET_MARKER',
    canonicalNode: '/synthetic/RAW_EXECUTABLE_SECRET_MARKER',
    cwd: '/synthetic/RAW_CWD_SECRET_MARKER',
    command: ['RAW_ARGV_SECRET_MARKER'],
    startIdentity: 'RAW_START_SECRET_MARKER'
  });
  const serialized = JSON.stringify(markerScan.result);
  for (const marker of [
    'RAW_ARGV_SECRET_MARKER',
    'RAW_EXECUTABLE_SECRET_MARKER',
    'RAW_CWD_SECRET_MARKER',
    'RAW_START_SECRET_MARKER'
  ]) {
    assert.equal(serialized.includes(marker), false, marker);
  }
  assert.equal(markerScan.result.decision, DECISIONS.FAIL_CLOSED);

  const unavailableEnumeration = scanManagedProcesses({
    runtimeRepository: OBSERVER_RUNTIME,
    enumerateProcessIds() {
      throw new Error('enumeration unavailable');
    },
    resolveCanonicalNode: () => '/synthetic/RAW_EXECUTABLE_SECRET_MARKER',
    execPath: '/synthetic/RAW_EXECUTABLE_SECRET_MARKER'
  });
  const unavailableSerialized = JSON.stringify(unavailableEnumeration);
  assert.equal(unavailableSerialized.includes('RAW_EXECUTABLE_SECRET_MARKER'), false);
  assert.equal(Object.hasOwn(unavailableEnumeration, 'evidence'), false);
  assert.equal(Object.hasOwn(unavailableEnumeration, 'argv'), false);
});

test('coordinator locks before profile read and releases after one P1 readback', () => {
  const run = runTransition();
  assert.equal(run.result.classification, 'COMMITTED');
  assert.equal(run.result.p1Called, true);
  assert.equal(run.p1Calls, 1);
  assert.equal(run.releaseCalls, 1);
  assert.ok(run.events.indexOf('acquire') < run.events.indexOf('validate-current'));
  assert.ok(run.events.indexOf('p1') < run.events.indexOf('release'));
  assert.equal(run.result.initialStoppedVerified, true);
  assert.equal(run.result.finalStoppedVerified, true);
  assert.equal(run.result.lifecycleLockReleased, true);
  const changedKeys = Object.keys(run.committedNextProfile).filter(key =>
    run.committedNextProfile[key] !== profile()[key]
  );
  assert.deepEqual(changedKeys, [
    'adoptedRepositoryHead',
    'controllerSourceManifestDigest'
  ]);
  assert.equal(run.committedNextProfile.controllerSourceManifestVersion, 1);
});

test('all P1 classifications are preserved without a second call', () => {
  const cases = [
    ['COMMITTED', true, true, true],
    ['COMMITTED_WITH_UNCERTAIN_DURABILITY', true, false, true],
    ['ALREADY_COMMITTED', false, true, true],
    ['ALREADY_COMMITTED_WITH_UNCERTAIN_DURABILITY', false, false, true],
    ['STALE_CURRENT', false, false, false],
    ['INVALID_CURRENT', false, false, false],
    ['INPUT_REJECTED', false, false, false],
    ['NOT_COMMITTED', false, false, false],
    ['COMMIT_RESULT_UNKNOWN', null, false, false]
  ];
  for (const [classification, mutated, durable, matches] of cases) {
    const run = runTransition({
      transaction: {
        classification,
        errorCode: `p1_${classification.toLowerCase()}`,
        oldFingerprint: 'current-fingerprint',
        nextFingerprint: 'next-fingerprint',
        readBackFingerprint: 'readback-fingerprint',
        mutated,
        durabilityConfirmed: durable,
        committedProfileMatchesNext: matches
      }
    });
    assert.equal(run.result.classification, classification);
    assert.equal(run.result.underlyingClassification, classification);
    assert.equal(run.result.profileTransactionClassification, classification);
    assert.equal(run.result.profileTransactionErrorCode,
      `p1_${classification.toLowerCase()}`);
    assert.equal(run.result.profileMutated, mutated);
    assert.equal(run.result.durabilityConfirmed, durable);
    assert.equal(run.result.committedProfileMatchesNext, matches);
    assert.equal(run.result.readBackProfileFingerprint,
      'readback-fingerprint');
    assert.equal(run.p1Calls, 1);
    assert.equal(run.releaseCalls, 1);
  }
});

test('final release failure is final lock-field authority and preserves P1 truth', () => {
  const run = runTransition({
    transaction: {
      classification: 'COMMITTED_WITH_UNCERTAIN_DURABILITY',
      errorCode: 'p1_durability_unconfirmed',
      oldFingerprint: 'current-fingerprint',
      nextFingerprint: 'next-fingerprint',
      readBackFingerprint: 'readback-fingerprint',
      mutated: true,
      durabilityConfirmed: false,
      committedProfileMatchesNext: true
    },
    releaseError: codedError('stack_lifecycle_lock_identity_changed')
  });
  assert.equal(run.result.classification, 'LOCK_RELEASE_FAILED');
  assert.equal(run.result.underlyingClassification,
    'COMMITTED_WITH_UNCERTAIN_DURABILITY');
  assert.equal(run.result.profileTransactionClassification,
    'COMMITTED_WITH_UNCERTAIN_DURABILITY');
  assert.equal(run.result.profileTransactionErrorCode,
    'p1_durability_unconfirmed');
  assert.equal(run.result.profileMutated, true);
  assert.equal(run.result.durabilityConfirmed, false);
  assert.equal(run.result.committedProfileMatchesNext, true);
  assert.equal(run.result.readBackProfileFingerprint,
    'readback-fingerprint');
  assert.equal(run.result.lifecycleLockErrorCode,
    'stack_lifecycle_lock_identity_changed');
  assert.equal(run.result.lifecycleLockReleased, false);
  assert.equal(run.p1Calls, 1);
  assert.equal(run.releaseCalls, 1);
});

test('unknown P1 mutation remains null when final release fails', () => {
  const run = runTransition({
    transaction: {
      classification: 'COMMIT_RESULT_UNKNOWN',
      errorCode: 'owner_profile_commit_result_unknown',
      oldFingerprint: 'current-fingerprint',
      nextFingerprint: 'next-fingerprint',
      readBackFingerprint: null,
      mutated: null,
      durabilityConfirmed: false,
      committedProfileMatchesNext: false
    },
    releaseError: codedError('stack_lifecycle_lock_release_failed')
  });
  assert.equal(run.result.classification, 'LOCK_RELEASE_FAILED');
  assert.equal(run.result.underlyingClassification,
    'COMMIT_RESULT_UNKNOWN');
  assert.equal(run.result.profileMutated, null);
  assert.equal(run.result.lifecycleLockReleased, false);
  assert.equal(run.p1Calls, 1);
});

test('precondition rejection followed by release failure does not call P1', () => {
  const run = runTransition({
    inspectSourceCompatibility() {
      throw codedError('stopped_profile_transition_candidate_invalid');
    },
    releaseError: codedError('stack_lifecycle_lock_release_failed')
  });
  assert.equal(run.result.classification, 'LOCK_RELEASE_FAILED');
  assert.equal(run.result.underlyingClassification,
    'PRECONDITION_REJECTED');
  assert.equal(run.result.profileTransactionClassification, null);
  assert.equal(run.result.profileMutated, false);
  assert.equal(run.result.lifecycleLockReleased, false);
  assert.equal(run.p1Calls, 0);
  assert.equal(run.releaseCalls, 1);
});

test('raw stale-lock identity race is ordinary acquisition failure', () => {
  let acquisitionCalls = 0;
  const run = runTransition({
    acquireLifecycleProfile() {
      acquisitionCalls += 1;
      throw codedError('stack_lifecycle_lock_identity_changed');
    }
  });
  assert.equal(run.result.classification, 'PRECONDITION_REJECTED');
  assert.equal(run.result.stableReason,
    'stopped_profile_transition_lock_failed');
  assert.equal(run.result.lifecycleLockAcquired, false);
  assert.equal(run.result.lifecycleLockReleaseAttempted, false);
  assert.equal(run.result.lifecycleLockReleased, true);
  assert.equal(run.result.lifecycleLockErrorCode,
    'stack_lifecycle_lock_identity_changed');
  assert.equal(run.result.p1Called, false);
  assert.equal(acquisitionCalls, 1);
  assert.equal(run.releaseCalls, 0);
});

test('real acquireLifecycleProfile preserves successful profile-cleanup provenance', () => {
  let releaseCalls = 0;
  const primary = codedError('stack_profile_invalid');
  const acquire = () => acquireLifecycleProfile({
    environment: { XDG_RUNTIME_DIR: '/synthetic/run' },
    ensureRuntime() {},
    acquireLock() {
      return {
        release() {
          releaseCalls += 1;
          return true;
        }
      };
    },
    read() {
      throw primary;
    }
  });
  let thrown;
  try {
    acquire();
  } catch (error) {
    thrown = error;
  }
  assert.equal(thrown, primary);
  assert.equal(releaseCalls, 1);
  assert.equal(thrown.cleanupPhase, 'lifecycle_profile_acquisition');
  assert.equal(thrown.lifecycleLockAcquired, true);
  assert.equal(thrown.lifecycleLockReleaseAttempted, true);
  assert.equal(thrown.lifecycleLockReleased, true);
  assert.equal(thrown.residualLockPossible, false);

  const run = runTransition({ acquireLifecycleProfile: acquire });
  assert.equal(run.result.classification, 'PRECONDITION_REJECTED');
  assert.equal(run.result.stableReason,
    'stopped_profile_transition_current_profile_invalid');
  assert.equal(run.result.preconditionErrorCode, 'stack_profile_invalid');
  assert.equal(run.result.lifecycleLockErrorCode, null);
  assert.equal(run.result.lifecycleLockReleased, true);
  assert.equal(run.p1Calls, 0);
});

test('real acquireLifecycleProfile exposes cleanup-release failure provenance', () => {
  let releaseCalls = 0;
  const acquire = () => acquireLifecycleProfile({
    environment: { XDG_RUNTIME_DIR: '/synthetic/run' },
    ensureRuntime() {},
    acquireLock() {
      return {
        release() {
          releaseCalls += 1;
          throw codedError('stack_lifecycle_lock_identity_changed');
        }
      };
    },
    read() {
      throw codedError('stack_profile_invalid');
    }
  });
  let thrown;
  try {
    acquire();
  } catch (error) {
    thrown = error;
  }
  assert.equal(thrown.code, 'stack_lifecycle_acquisition_cleanup_failed');
  assert.equal(thrown.cleanupPhase, 'lifecycle_profile_acquisition');
  assert.equal(thrown.lifecycleLockAcquired, true);
  assert.equal(thrown.lifecycleLockReleaseAttempted, true);
  assert.equal(thrown.lifecycleLockReleased, false);
  assert.equal(thrown.residualLockPossible, true);
  assert.equal(thrown.primaryErrorCode, 'stack_profile_invalid');
  assert.equal(thrown.cleanupErrorCode,
    'stack_lifecycle_lock_identity_changed');
  assert.equal(releaseCalls, 1);

  const run = runTransition({ acquireLifecycleProfile: acquire });
  assert.equal(run.result.classification, 'LOCK_RELEASE_FAILED');
  assert.equal(run.result.underlyingClassification,
    'PRECONDITION_REJECTED');
  assert.equal(run.result.preconditionErrorCode, 'stack_profile_invalid');
  assert.equal(run.result.lifecycleLockErrorCode,
    'stack_lifecycle_lock_identity_changed');
  assert.equal(run.result.lifecycleLockReleased, false);
  assert.equal(run.p1Calls, 0);
});

test('owner-lock initialization cleanup success is observable', t => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'codex-memory-lock-init-')
  );
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.chmodSync(directory, 0o700);
  const lock = path.join(directory, 'lifecycle.lock');
  let thrown;
  try {
    acquireOwnerLock(lock, {
      readStartTicks() {
        throw codedError('stack_synthetic_fsync_failed');
      }
    });
  } catch (error) {
    thrown = error;
  }
  assert.equal(thrown.code, 'stack_synthetic_fsync_failed');
  assert.equal(thrown.cleanupPhase, 'owner_lock_initialization');
  assert.equal(thrown.lifecycleLockAcquired, true);
  assert.equal(thrown.lifecycleLockReleaseAttempted, true);
  assert.equal(thrown.lifecycleLockReleased, true);
  assert.equal(thrown.residualLockPossible, false);
  assert.equal(thrown.primaryErrorCode, 'stack_synthetic_fsync_failed');
  assert.equal(thrown.cleanupErrorCode, null);
  assert.equal(fs.existsSync(lock), false);
});

test('owner-lock initialization cleanup failure is structured and residual-safe', t => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'codex-memory-lock-init-fail-')
  );
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.chmodSync(directory, 0o700);
  const lock = path.join(directory, 'lifecycle.lock');
  const fsModule = Object.create(fs);
  fsModule.unlinkSync = file => {
    if (file === lock) throw codedError('stack_synthetic_unlink_failed');
    return fs.unlinkSync(file);
  };
  let thrown;
  try {
    acquireOwnerLock(lock, {
      fsModule,
      readStartTicks() {
        throw codedError('stack_synthetic_fsync_failed');
      }
    });
  } catch (error) {
    thrown = error;
  }
  assert.equal(thrown.code, 'stack_lifecycle_acquisition_cleanup_failed');
  assert.equal(thrown.cleanupPhase, 'owner_lock_initialization');
  assert.equal(thrown.lifecycleLockAcquired, true);
  assert.equal(thrown.lifecycleLockReleaseAttempted, true);
  assert.equal(thrown.lifecycleLockReleased, false);
  assert.equal(thrown.residualLockPossible, true);
  assert.equal(thrown.primaryErrorCode, 'stack_synthetic_fsync_failed');
  assert.equal(thrown.cleanupErrorCode,
    'stack_lifecycle_lock_unlink_failed');
  assert.equal(fs.existsSync(lock), true);
});

test('stopped inspector rejects an exact orphan without a PID file', () => {
  const current = profile();
  const options = stoppedInspectionOptions(current, { pids: [4321] });
  assert.throws(
    () => inspectStoppedStateForOwnerProfileTransition(current, options),
    error => error.code === 'stack_managed_orphan_process'
  );
});

test('stopped inspector permits no exact process with absent PID files', () => {
  const current = profile();
  const options = stoppedInspectionOptions(current);
  const result = inspectStoppedStateForOwnerProfileTransition(current, options);
  assert.equal(result.inspectionComplete, true);
  assert.equal(result.processDecision, 'IGNORE_DEFINITIVELY_UNRELATED');
  assert.equal(result.orphanInspection.http.orphanDetected, false);
});

test('final stopped gate rejects an orphan appearing after initial inspection', () => {
  const current = profile();
  let inspections = 0;
  const run = runTransition({
    inspectStoppedState() {
      inspections += 1;
      if (inspections === 1) {
        return inspectStoppedStateForOwnerProfileTransition(
          current,
          stoppedInspectionOptions(current)
        );
      }
      return inspectStoppedStateForOwnerProfileTransition(
        current,
        stoppedInspectionOptions(current, { pids: [4321] })
      );
    }
  });
  assert.equal(run.result.classification, 'PRECONDITION_REJECTED');
  assert.equal(run.result.stableReason,
    'stopped_profile_transition_runtime_not_stopped');
  assert.equal(run.result.finalStoppedVerified, false);
  assert.equal(run.result.p1Called, false);
  assert.equal(run.p1Calls, 0);
  assert.equal(inspections, 2);
});

test('final release projection wins over stale context lock code', () => {
  const previous = {
    classification: 'PRECONDITION_REJECTED',
    underlyingClassification: 'PRECONDITION_REJECTED',
    lifecycleLockAcquired: true,
    lifecycleLockReleaseAttempted: true,
    lifecycleLockReleased: false,
    lifecycleLockErrorCode: 'stack_lifecycle_busy',
    preconditionErrorCode: 'stack_profile_invalid'
  };
  const result = projectReleaseFailure(
    previous,
    codedError('stack_lifecycle_lock_identity_changed'),
    {}
  );
  assert.equal(result.lifecycleLockErrorCode,
    'stack_lifecycle_lock_identity_changed');
  assert.equal(result.preconditionErrorCode, 'stack_profile_invalid');
  assert.equal(result.classification, 'LOCK_RELEASE_FAILED');
});
