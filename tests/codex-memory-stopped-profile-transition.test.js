'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  acquireLifecycleProfile,
  acquireOwnerLock,
  PROFILE_SCHEMA_VERSION,
  validateProfile
} = require('../scripts/codex-memory-stack');
const {
  canonicalProfileFingerprint,
  commitOwnerProfileTransaction
} = require('../scripts/codex-memory-owner-profile-transaction');
const {
  CLEANUP_ERROR_CODE,
  coordinateStoppedOwnerProfileTransition
} = require('../scripts/codex-memory-stopped-profile-transition');

const SHA = suffix => `sha256:${suffix.repeat(64)}`;
const GIT = suffix => suffix.repeat(40);
const ID = suffix => suffix.repeat(64);

function profile(overrides = {}) {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    adoptedRepositoryHead: GIT('a'),
    controllerSourceManifestDigest: SHA('b'),
    controllerSourceManifestVersion: 1,
    governanceEnvironmentConfigDigest: SHA('c'),
    relayEnvironmentConfigDigest: SHA('d'),
    runtimeBaseline: GIT('e'),
    runtimeRepository: '/synthetic/runtime-repository',
    retainedBindingSource: GIT('f'),
    privateRoot: '/synthetic/owner-root',
    providerContainer: 'new-api-wsl',
    providerContainerId: ID('1'),
    providerImageId: SHA('2'),
    providerRevision: GIT('3'),
    governanceEnvironment: 'governance/runtime.env',
    relayEnvironment: 'relay/runtime.env',
    retainedBinding: 'r5m-exact-head/private-binding.json',
    edgeContainer: 'codex-memory-full-stack-001-edge',
    edgeContainerId: ID('4'),
    vcpProviderConfigDigest: SHA('5'),
    vcpRuntimeBaseline: GIT('6'),
    vcpRuntimeRepository: '/synthetic/vcp-repository',
    vcpRuntimeScopeDigest: SHA('7'),
    ...overrides
  };
}

function binding(current = profile()) {
  return {
    repositoryHead: current.adoptedRepositoryHead,
    controllerSourceManifestDigest:
      current.controllerSourceManifestDigest,
    controllerSourceManifestVersion:
      current.controllerSourceManifestVersion
  };
}

function sourceFor(candidate) {
  return {
    head: candidate.adoptedRepositoryHead,
    manifestDigest: candidate.controllerSourceManifestDigest,
    manifestVersion: candidate.controllerSourceManifestVersion,
    clean: true,
    currentMain: true,
    repositoryMatch: true,
    baselineExists: true,
    manifestRecognized: true,
    manifestComplete: true,
    manifestScopeClean: true,
    adoptedHeadReadable: true,
    adoptedHeadAncestor: true
  };
}

function makeDependencies(current = profile(), overrides = {}) {
  const events = [];
  const nextSources = [];
  const commitResults = [];
  let releaseCount = 0;
  const lifecycle = {
    get profile() {
      events.push('profile-read');
      return current;
    },
    release() {
      releaseCount += 1;
      events.push('release');
      if (overrides.releaseError) throw overrides.releaseError;
      return true;
    }
  };
  const dependencies = {
    candidateBinding: overrides.candidateBinding || binding(current),
    profilePath: overrides.profilePath || '/synthetic/profile.json',
    acquireLifecycleProfile() {
      events.push('lock');
      if (overrides.acquireError) throw overrides.acquireError;
      return lifecycle;
    },
    inspectSourceCompatibility(candidate) {
      events.push(`source:${nextSources.length + 1}`);
      if (overrides.sourceError) throw overrides.sourceError;
      const source = overrides.sourceFactory
        ? overrides.sourceFactory(candidate, nextSources.length)
        : sourceFor(candidate);
      nextSources.push(source);
      return source;
    },
    inspectStoppedState(candidate) {
      events.push('stopped');
      if (overrides.stoppedFactory) {
        return overrides.stoppedFactory(candidate, events);
      }
      return { verified: true };
    },
    validateProfile(value) {
      events.push('validate');
      return validateProfile(value);
    },
    canonicalProfileFingerprint,
    commitOwnerProfileTransaction(input) {
      events.push('p1');
      commitResults.push(input);
      if (overrides.commitError) throw overrides.commitError;
      return overrides.commitResult || {
        classification: 'COMMITTED',
        errorCode: null,
        oldFingerprint: input.expectedCurrentFingerprint,
        nextFingerprint: canonicalProfileFingerprint(input.nextProfile),
        readBackFingerprint: canonicalProfileFingerprint(input.nextProfile),
        mutated: true,
        durabilityConfirmed: true,
        committedProfileMatchesNext: true
      };
    }
  };
  return {
    dependencies,
    events,
    commitResults,
    get releaseCount() {
      return releaseCount;
    }
  };
}

function run(overrides = {}) {
  const fixture = makeDependencies(overrides.current || profile(), overrides);
  const result = coordinateStoppedOwnerProfileTransition({
    ...fixture.dependencies,
    ...overrides
  });
  return { ...fixture, result };
}

test('holds the canonical lock from profile read through P1 and releases once', () => {
  const { result, events, releaseCount, commitResults } = run();
  assert.equal(result.classification, 'COMMITTED');
  assert.equal(result.p1Called, true);
  assert.equal(result.lifecycleLockAcquired, true);
  assert.equal(result.lifecycleLockReleased, true);
  assert.equal(releaseCount, 1);
  assert.equal(commitResults.length, 1);
  assert.ok(events.indexOf('lock') < events.indexOf('profile-read'));
  assert.ok(events.indexOf('p1') < events.indexOf('release'));
  assert.equal(events.filter(event => event === 'stopped').length, 2);
  assert.equal(result.runtimeMutated, false);
});

test('constructs a complete v6 profile and changes only the three identity fields', () => {
  const current = profile();
  const next = profile({
    adoptedRepositoryHead: GIT('9'),
    controllerSourceManifestDigest: SHA('8')
  });
  const { result, commitResults } = run({
    current,
    candidateBinding: binding(next),
    sourceFactory: () => sourceFor(next),
    commitResult: {
      classification: 'COMMITTED',
      errorCode: null,
      oldFingerprint: canonicalProfileFingerprint(current),
      nextFingerprint: canonicalProfileFingerprint(next),
      readBackFingerprint: canonicalProfileFingerprint(next),
      mutated: true,
      durabilityConfirmed: true,
      committedProfileMatchesNext: true
    }
  });
  const committed = commitResults[0].nextProfile;
  assert.equal(result.classification, 'COMMITTED');
  assert.equal(committed.schemaVersion, 6);
  for (const key of Object.keys(current)) {
    if (key === 'adoptedRepositoryHead' ||
        key === 'controllerSourceManifestDigest' ||
        key === 'controllerSourceManifestVersion') continue;
    assert.deepEqual(committed[key], current[key], key);
  }
  assert.equal(committed.adoptedRepositoryHead, next.adoptedRepositoryHead);
  assert.equal(
    committed.controllerSourceManifestDigest,
    next.controllerSourceManifestDigest
  );
});

test('initial stopped rejection prevents P1 and still releases the lock', () => {
  const { result, events, commitResults } = run({
    stoppedFactory: () => false
  });
  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason,
    'stopped_profile_transition_runtime_not_stopped');
  assert.equal(result.p1Called, false);
  assert.equal(result.lifecycleLockReleased, true);
  assert.equal(commitResults.length, 0);
  assert.equal(events.includes('p1'), false);
});

test('final stopped rejection prevents P1 after candidate pass two', () => {
  let stoppedCalls = 0;
  const { result, commitResults } = run({
    stoppedFactory: () => {
      stoppedCalls += 1;
      return stoppedCalls === 1;
    }
  });
  assert.equal(stoppedCalls, 2);
  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason,
    'stopped_profile_transition_runtime_not_stopped');
  assert.equal(result.p1Called, false);
  assert.equal(commitResults.length, 0);
});

test('candidate drift between passes is rejected before P1', () => {
  const current = profile();
  let sourceCalls = 0;
  const { result, commitResults } = run({
    sourceFactory: candidate => {
      sourceCalls += 1;
      if (sourceCalls === 1) return sourceFor(candidate);
      return sourceFor({
        ...candidate,
        adoptedRepositoryHead: GIT('c')
      });
    }
  });
  assert.equal(sourceCalls, 2);
  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason,
    'stopped_profile_transition_candidate_changed_after_validation');
  assert.equal(result.p1Called, false);
  assert.equal(commitResults.length, 0);
});

test('schema v4/v5 profiles fail closed without calling P1', () => {
  const current = profile();
  const {
    adoptedRepositoryHead: _adopted,
    controllerSourceManifestDigest: _digest,
    controllerSourceManifestVersion: _version,
    ...legacyFields
  } = current;
  const legacy = {
    ...legacyFields,
    schemaVersion: 5,
    controllerSourceCommit: GIT('9')
  };
  const { result, commitResults } = run({
    current: legacy,
    candidateBinding: binding(profile())
  });
  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason,
    'stopped_profile_transition_schema_unsupported');
  assert.equal(result.p1Called, false);
  assert.equal(commitResults.length, 0);
});

test('all P1 classifications and mutation facts are preserved', () => {
  const classifications = [
    'COMMITTED',
    'COMMITTED_WITH_UNCERTAIN_DURABILITY',
    'ALREADY_COMMITTED',
    'ALREADY_COMMITTED_WITH_UNCERTAIN_DURABILITY',
    'STALE_CURRENT',
    'INVALID_CURRENT',
    'INPUT_REJECTED',
    'NOT_COMMITTED',
    'COMMIT_RESULT_UNKNOWN'
  ];
  for (const classification of classifications) {
    const { result, commitResults } = run({
      commitResult: {
        classification,
        errorCode: `owner_profile_${classification.toLowerCase()}`,
        oldFingerprint: 'sha256:old',
        nextFingerprint: 'sha256:next',
        readBackFingerprint: 'sha256:readback',
        mutated: classification === 'COMMIT_RESULT_UNKNOWN'
          ? null
          : ['COMMITTED', 'COMMITTED_WITH_UNCERTAIN_DURABILITY']
            .includes(classification),
        durabilityConfirmed: classification === 'COMMITTED',
        committedProfileMatchesNext: [
          'COMMITTED',
          'COMMITTED_WITH_UNCERTAIN_DURABILITY',
          'ALREADY_COMMITTED',
          'ALREADY_COMMITTED_WITH_UNCERTAIN_DURABILITY'
        ].includes(classification)
      }
    });
    assert.equal(result.classification, classification);
    assert.equal(result.underlyingClassification, classification);
    assert.equal(result.profileTransactionClassification, classification);
    assert.equal(result.profileTransactionErrorCode,
      `owner_profile_${classification.toLowerCase()}`);
    assert.equal(result.p1Called, true);
    assert.equal(commitResults.length, 1);
  }
});

test('release failure wraps P1 unknown without changing mutation truth', () => {
  const releaseError = new Error('synthetic release failure');
  releaseError.code = 'stack_lifecycle_lock_identity_changed';
  const { result, commitResults } = run({
    releaseError,
    commitResult: {
      classification: 'COMMIT_RESULT_UNKNOWN',
      errorCode: 'owner_profile_post_commit_state_conflict',
      oldFingerprint: 'sha256:old',
      nextFingerprint: 'sha256:next',
      readBackFingerprint: 'sha256:third',
      mutated: null,
      durabilityConfirmed: false,
      committedProfileMatchesNext: false
    }
  });
  assert.equal(result.classification, 'LOCK_RELEASE_FAILED');
  assert.equal(result.underlyingClassification, 'COMMIT_RESULT_UNKNOWN');
  assert.equal(result.profileTransactionClassification,
    'COMMIT_RESULT_UNKNOWN');
  assert.equal(result.profileTransactionErrorCode,
    'owner_profile_post_commit_state_conflict');
  assert.equal(result.profileMutated, null);
  assert.equal(result.readBackProfileFingerprint, 'sha256:third');
  assert.equal(result.lifecycleLockErrorCode,
    'stack_lifecycle_lock_identity_changed');
  assert.equal(result.lifecycleLockReleased, false);
  assert.equal(commitResults.length, 1);
});

test('final release error remains authoritative after a precondition failure', () => {
  const preconditionError = new Error('synthetic stopped-state failure');
  preconditionError.code = 'stack_lifecycle_busy';
  const releaseError = new Error('synthetic final release failure');
  releaseError.code = 'stack_lifecycle_lock_identity_changed';
  const { result, releaseCount, commitResults } = run({
    releaseError,
    stoppedFactory: () => {
      throw preconditionError;
    }
  });
  assert.equal(result.classification, 'LOCK_RELEASE_FAILED');
  assert.equal(result.underlyingClassification, 'PRECONDITION_REJECTED');
  assert.equal(result.preconditionErrorCode, 'stack_lifecycle_busy');
  assert.equal(result.lifecycleLockErrorCode,
    'stack_lifecycle_lock_identity_changed');
  assert.equal(result.lifecycleLockAcquired, true);
  assert.equal(result.lifecycleLockReleaseAttempted, true);
  assert.equal(result.lifecycleLockReleased, false);
  assert.equal(result.p1Called, false);
  assert.equal(releaseCount, 1);
  assert.equal(commitResults.length, 0);
});

test('structured acquisition cleanup failure is distinct from raw stale-lock failure', () => {
  const cleanupError = new Error(CLEANUP_ERROR_CODE);
  cleanupError.code = CLEANUP_ERROR_CODE;
  cleanupError.lifecycleLockAcquired = true;
  cleanupError.lifecycleLockReleaseAttempted = true;
  cleanupError.lifecycleLockReleased = false;
  cleanupError.residualLockPossible = true;
  cleanupError.primaryErrorCode = 'stack_profile_invalid';
  cleanupError.cleanupErrorCode = 'stack_lifecycle_lock_identity_changed';
  const failed = run({ acquireError: cleanupError });
  assert.equal(failed.result.classification, 'LOCK_RELEASE_FAILED');
  assert.equal(failed.result.lifecycleLockAcquired, true);
  assert.equal(failed.result.lifecycleLockReleaseAttempted, true);
  assert.equal(failed.result.lifecycleLockReleased, false);
  assert.equal(failed.result.lifecycleLockErrorCode,
    'stack_lifecycle_lock_identity_changed');
  assert.equal(failed.result.preconditionErrorCode,
    'stack_profile_invalid');
  assert.equal(failed.result.p1Called, false);

  const stale = new Error('stale identity');
  stale.code = 'stack_lifecycle_lock_identity_changed';
  const ordinary = run({ acquireError: stale });
  assert.equal(ordinary.result.classification, 'PRECONDITION_REJECTED');
  assert.equal(ordinary.result.lifecycleLockAcquired, false);
  assert.equal(ordinary.result.lifecycleLockReleaseAttempted, false);
  assert.equal(ordinary.result.lifecycleLockReleased, true);
  assert.equal(ordinary.result.lifecycleLockErrorCode,
    'stack_lifecycle_lock_identity_changed');
  assert.equal(ordinary.result.preconditionErrorCode, null);
});

test('owner-lock initialization cleanup success keeps primary error out of lock domain', () => {
  const error = new Error('synthetic fsync failure');
  Object.assign(error, {
    code: 'stack_synthetic_fsync_failed',
    cleanupPhase: 'owner_lock_initialization',
    lifecycleLockAcquired: true,
    lifecycleLockReleaseAttempted: true,
    lifecycleLockReleased: true,
    residualLockPossible: false,
    primaryErrorCode: 'stack_synthetic_fsync_failed',
    cleanupErrorCode: null
  });
  const result = run({ acquireError: error }).result;
  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason,
    'stopped_profile_transition_lock_failed');
  assert.equal(result.lifecycleLockAcquired, true);
  assert.equal(result.lifecycleLockReleaseAttempted, true);
  assert.equal(result.lifecycleLockReleased, true);
  assert.equal(result.lifecycleLockErrorCode, null);
  assert.equal(result.preconditionErrorCode, 'stack_synthetic_fsync_failed');
  assert.equal(result.p1Called, false);
});

test('profile acquisition cleanup success retains a released lock projection', () => {
  const error = new Error('profile invalid');
  error.code = 'stack_profile_invalid';
  const fixture = makeDependencies(profile(), {});
  fixture.dependencies.acquireLifecycleProfile = () => {
    fixture.events.push('lock');
    const lifecycle = {
      profile: profile(),
      release() {
        fixture.events.push('release');
        return true;
      }
    };
    throw Object.assign(error, {
      lifecycleLockAcquired: true,
      lifecycleLockReleaseAttempted: true,
      lifecycleLockReleased: true,
      residualLockPossible: false,
      cleanupPhase: 'lifecycle_profile_acquisition',
      primaryErrorCode: 'stack_profile_invalid',
      cleanupErrorCode: null
    });
  };
  const result = coordinateStoppedOwnerProfileTransition(
    fixture.dependencies
  );
  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.lifecycleLockAcquired, true);
  assert.equal(result.lifecycleLockReleaseAttempted, true);
  assert.equal(result.lifecycleLockReleased, true);
  assert.equal(result.stableReason,
    'stopped_profile_transition_current_profile_invalid');
  assert.equal(result.lifecycleLockErrorCode, null);
  assert.equal(result.preconditionErrorCode, 'stack_profile_invalid');
  assert.equal(result.p1Called, false);
});

test('real profile acquisition cleanup success keeps profile error out of lock domain', () => {
  const profileError = new Error('synthetic profile failure');
  profileError.code = 'stack_profile_invalid';
  let releaseCount = 0;
  const fixture = makeDependencies();
  fixture.dependencies.acquireLifecycleProfile = () => acquireLifecycleProfile({
    environment: { XDG_RUNTIME_DIR: '/synthetic/runtime' },
    ensureRuntime() {},
    acquireLock() {
      return {
        release() {
          releaseCount += 1;
          return true;
        }
      };
    },
    read() {
      throw profileError;
    }
  });

  const result = coordinateStoppedOwnerProfileTransition(
    fixture.dependencies
  );

  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason,
    'stopped_profile_transition_current_profile_invalid');
  assert.equal(result.lifecycleLockAcquired, true);
  assert.equal(result.lifecycleLockReleaseAttempted, true);
  assert.equal(result.lifecycleLockReleased, true);
  assert.equal(result.lifecycleLockErrorCode, null);
  assert.equal(result.preconditionErrorCode, 'stack_profile_invalid');
  assert.equal(result.p1Called, false);
  assert.equal(releaseCount, 1);
});

test('real P1 fixture commits through the dormant coordinator without runtime access', t => {
  const current = profile();
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'codex-memory-p2-profile-')
  );
  const target = path.join(directory, 'full-stack-control.json');
  fs.writeFileSync(target, `${JSON.stringify(current)}\n`, { mode: 0o600 });
  fs.chmodSync(target, 0o600);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const fixture = makeDependencies(current, { profilePath: target });
  fixture.dependencies.commitOwnerProfileTransaction =
    commitOwnerProfileTransaction;
  const result = coordinateStoppedOwnerProfileTransition({
    ...fixture.dependencies,
    canonicalProfileFingerprint,
    validateProfile
  });
  assert.equal(result.classification, 'ALREADY_COMMITTED');
  assert.equal(result.profileTransactionClassification, 'ALREADY_COMMITTED');
  assert.equal(result.profileMutated, false);
  assert.equal(result.runtimeMutated, false);
  assert.equal(result.lifecycleLockReleased, true);
});

test('real owner lock and profile acquisition feed the dormant coordinator', t => {
  const current = profile();
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'codex-memory-p2-real-acquisition-')
  );
  const profilePath = path.join(root, 'full-stack-control.json');
  const runtimeBase = path.join(root, 'runtime');
  fs.chmodSync(root, 0o700);
  fs.mkdirSync(runtimeBase, { mode: 0o700 });
  fs.chmodSync(runtimeBase, 0o700);
  fs.writeFileSync(profilePath, `${JSON.stringify(current)}\n`, {
    mode: 0o600
  });
  fs.chmodSync(profilePath, 0o600);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const environment = {
    XDG_RUNTIME_DIR: path.join(root, 'runtime'),
    CODEX_MEMORY_STACK_PROFILE: profilePath
  };
  const result = coordinateStoppedOwnerProfileTransition({
    candidateBinding: binding(current),
    profilePath,
    acquireLifecycleProfile: () => acquireLifecycleProfile({
      environment,
      acquireLock: file => acquireOwnerLock(file, {
        readStartTicks: () => '42'
      }),
      read: () => current
    }),
    inspectSourceCompatibility: candidate => sourceFor(candidate),
    inspectStoppedState: () => ({ verified: true }),
    validateProfile,
    canonicalProfileFingerprint,
    commitOwnerProfileTransaction
  });

  assert.equal(result.classification, 'ALREADY_COMMITTED');
  assert.equal(result.p1Called, true);
  assert.equal(result.lifecycleLockAcquired, true);
  assert.equal(result.lifecycleLockReleased, true);
  assert.equal(result.runtimeMutated, false);
  assert.equal(
    fs.existsSync(path.join(root, 'runtime', 'codex-memory-full-stack-001',
      'pids', 'lifecycle.lock')),
    false
  );
});
