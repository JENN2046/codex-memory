'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  acquireLifecycleProfile,
  inspectOrphanManagedProcesses,
  PROFILE_SCHEMA_VERSION,
  validateProfile
} = require('../scripts/codex-memory-stack');
const {
  canonicalProfileFingerprint,
  commitOwnerProfileTransaction
} = require('../scripts/codex-memory-owner-profile-transaction');
const {
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

function v5Profile() {
  const current = profile();
  const {
    adoptedRepositoryHead: _adopted,
    controllerSourceManifestDigest: _manifestDigest,
    controllerSourceManifestVersion: _manifestVersion,
    ...legacyFields
  } = current;
  return {
    ...legacyFields,
    schemaVersion: 5,
    controllerSourceCommit: GIT('8')
  };
}

function candidateBinding(overrides = {}) {
  return {
    repositoryHead: GIT('b'),
    controllerSourceManifestDigest: SHA('9'),
    controllerSourceManifestVersion: 1,
    ...overrides
  };
}

function sourceFor(profileValue, binding, overrides = {}) {
  const profileMatches =
    profileValue.adoptedRepositoryHead === binding.repositoryHead &&
    profileValue.controllerSourceManifestDigest ===
      binding.controllerSourceManifestDigest &&
    profileValue.controllerSourceManifestVersion ===
      binding.controllerSourceManifestVersion;
  return {
    head: binding.repositoryHead,
    clean: true,
    baselineExists: true,
    currentMain: true,
    repositoryMatch: true,
    controllerOnlyChanges: false,
    controllerSourceMatch: profileMatches,
    identityMode: 'manifest_v1',
    manifestRecognized: true,
    manifestVersion: binding.controllerSourceManifestVersion,
    manifestDigest: binding.controllerSourceManifestDigest,
    manifestComplete: true,
    manifestScopeClean: true,
    adoptedHeadReadable: true,
    adoptedHeadAncestor: true,
    upgradeEligible: false,
    compatible: profileMatches,
    ...overrides
  };
}

function defaultTransaction(overrides = {}) {
  return {
    classification: 'COMMITTED',
    errorCode: null,
    nextFingerprint: null,
    readBackFingerprint: null,
    mutated: true,
    durabilityConfirmed: true,
    committedProfileMatchesNext: true,
    ...overrides
  };
}

function acquisitionCleanupReleaseError(releaseErrorCode) {
  const error = new Error('synthetic acquisition cleanup release failure');
  error.code = 'stack_lifecycle_profile_cleanup_release_failed';
  error.lifecycleLockAcquired = true;
  error.lifecycleLockReleaseAttempted = true;
  error.lifecycleLockReleased = false;
  error.lifecycleLockReleaseErrorCode = releaseErrorCode;
  error.acquisitionErrorCode = 'stack_profile_invalid';
  return error;
}

function harness({
  current = profile(),
  binding = candidateBinding(),
  stopResults = [
    { verified: true },
    { verified: true }
  ],
  sourceResults,
  transaction = defaultTransaction(),
  validate = validateProfile,
  profilePath = '/synthetic/full-stack-control.json',
  release,
  acquireError
} = {}) {
  const calls = [];
  const sourceCalls = [];
  const stoppedCalls = [];
  const p1Calls = [];
  const releaseHandler = release || (() => {
    calls.push('release');
  });
  let sourceIndex = 0;
  let stoppedIndex = 0;

  const next = profile({
    ...current,
    adoptedRepositoryHead: binding.repositoryHead,
    controllerSourceManifestDigest: binding.controllerSourceManifestDigest,
    controllerSourceManifestVersion: binding.controllerSourceManifestVersion
  });
  const sources = sourceResults || [
    sourceFor(current, binding),
    sourceFor(next, binding)
  ];

  const dependencies = {
    candidateBinding: binding,
    environment: { CODEX_MEMORY_TEST_ENVIRONMENT: 'synthetic' },
    profileSchemaVersion: PROFILE_SCHEMA_VERSION,
    acquireLifecycleProfile: () => {
      calls.push('lock');
      if (acquireError) {
        const error = acquireError instanceof Error
          ? acquireError
          : new Error(
            typeof acquireError === 'string'
              ? acquireError
              : acquireError.code
          );
        if (typeof acquireError === 'string') {
          error.code = acquireError;
        } else if (!(acquireError instanceof Error)) {
          Object.assign(error, acquireError);
        }
        throw error;
      }
      calls.push('profile-read');
      return {
        profile: current,
        release: releaseHandler
      };
    },
    inspectSourceCompatibility: profileValue => {
      const response = typeof sources[sourceIndex] === 'function'
        ? sources[sourceIndex](profileValue, sourceIndex)
        : sources[sourceIndex];
      sourceCalls.push({ profile: profileValue, response });
      calls.push(`source-${sourceIndex + 1}`);
      sourceIndex += 1;
      return response;
    },
    inspectStoppedState: profileValue => {
      const response = typeof stopResults[stoppedIndex] === 'function'
        ? stopResults[stoppedIndex](profileValue, stoppedIndex)
        : stopResults[Math.min(stoppedIndex, stopResults.length - 1)];
      stoppedCalls.push({ profile: profileValue, response });
      calls.push(`stopped-${stoppedIndex + 1}`);
      stoppedIndex += 1;
      return response;
    },
    validateProfile: value => validate(value),
    canonicalProfileFingerprint,
    commitOwnerProfileTransaction: options => {
      p1Calls.push(options);
      calls.push('p1');
      return typeof transaction === 'function'
        ? transaction(options)
        : transaction;
    },
    profilePath
  };
  return {
    dependencies,
    calls,
    sourceCalls,
    stoppedCalls,
    p1Calls,
    current,
    binding
  };
}

test('holds the canonical lock through both gates and one P1 commit', () => {
  const h = harness();
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'COMMITTED');
  assert.equal(result.initialStoppedVerified, true);
  assert.equal(result.finalStoppedVerified, true);
  assert.equal(result.p1Called, true);
  assert.equal(result.profileMutated, true);
  assert.equal(result.runtimeMutated, false);
  assert.equal(result.underlyingClassification, 'COMMITTED');
  assert.equal(result.lifecycleLockReleased, true);
  assert.equal(result.lifecycleLockAcquired, true);
  assert.equal(result.lifecycleLockReleaseAttempted, true);
  assert.equal(h.p1Calls.length, 1);
  assert.ok(h.calls.indexOf('lock') < h.calls.indexOf('profile-read'));
  assert.ok(h.calls.indexOf('profile-read') < h.calls.indexOf('stopped-1'));
  assert.ok(h.calls.indexOf('stopped-1') < h.calls.indexOf('source-1'));
  assert.ok(h.calls.indexOf('source-1') < h.calls.indexOf('source-2'));
  assert.ok(h.calls.indexOf('source-2') < h.calls.indexOf('stopped-2'));
  assert.ok(h.calls.indexOf('stopped-2') < h.calls.indexOf('p1'));
  assert.ok(h.calls.indexOf('p1') < h.calls.indexOf('release'));

  const committed = h.p1Calls[0];
  assert.equal(
    committed.expectedCurrentFingerprint,
    canonicalProfileFingerprint(h.current)
  );
  const changed = Object.keys(h.current).filter(key =>
    h.current[key] !== committed.nextProfile[key]
  );
  assert.deepEqual(changed.sort(), [
    'adoptedRepositoryHead',
    'controllerSourceManifestDigest'
  ]);
});

test('initial stopped failure rejects before candidate inspection or P1', () => {
  const h = harness({
    stopResults: [{
      verified: false,
      reason: 'stopped_profile_transition_runtime_not_stopped'
    }]
  });
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason, 'stopped_profile_transition_runtime_not_stopped');
  assert.equal(result.initialStoppedVerified, false);
  assert.equal(h.sourceCalls.length, 0);
  assert.equal(h.p1Calls.length, 0);
  assert.equal(result.lifecycleLockReleased, true);
});

test('final stopped failure rejects immediately before P1', () => {
  const h = harness({
    stopResults: [
      { verified: true },
      {
        verified: false,
        reason: 'stopped_profile_transition_edge_not_stopped'
      }
    ]
  });
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason, 'stopped_profile_transition_edge_not_stopped');
  assert.equal(result.initialStoppedVerified, true);
  assert.equal(result.finalStoppedVerified, false);
  assert.equal(h.sourceCalls.length, 2);
  assert.equal(h.p1Calls.length, 0);
  assert.equal(h.calls.at(-1), 'release');
});

test('orphan runtime discovered by the final stopped gate blocks P1', () => {
  const h = harness({
    stopResults: [
      { verified: true },
      {
        verified: false,
        reason: 'stopped_profile_transition_runtime_not_stopped'
      }
    ]
  });
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(
    result.stableReason,
    'stopped_profile_transition_runtime_not_stopped'
  );
  assert.equal(result.initialStoppedVerified, true);
  assert.equal(result.finalStoppedVerified, false);
  assert.equal(result.p1Called, false);
  assert.equal(h.stoppedCalls.length, 2);
  assert.equal(h.p1Calls.length, 0);
});

test('orphan process discovery uses exact same-owner component identity', () => {
  const currentUid = process.getuid();
  const processIdentities = Object.fromEntries(
    ['shim', 'http', 'governance', 'relay'].map(name => [
      name,
      { pid: null }
    ])
  );
  const exactIdentity = name => ({
    command: [
      process.execPath,
      '/synthetic/runtime-repository/scripts/codex-memory-stack.js',
      {
        shim: '_run-shim',
        http: '_run-http',
        governance: '_run-governance',
        relay: '_run-relay'
      }[name],
      `--stack-environment=/synthetic/owner-root/${
        name === 'relay' ? 'relay' : 'governance'
      }/runtime.env`
    ],
    executable: process.execPath,
    cwd: '/synthetic/runtime-repository'
  });
  const fsModule = {
    statSync(file) {
      assert.match(file, /^\/proc\/[0-9]+$/u);
      return { uid: currentUid };
    },
    realpathSync(file) {
      assert.equal(file, process.execPath);
      return process.execPath;
    }
  };
  const inspect = (processEntries, readIdentity, overrides = {}) =>
    inspectOrphanManagedProcesses(profile(), {
      fsModule,
      processIdentities,
      processEntries,
      controllerPid: 999_999,
      isRunning: () => true,
      readIdentity,
      readStartTicks: () => '42',
      ownerUid: currentUid,
      ...overrides
    });

  const orphan = inspect(['4321'], () => exactIdentity('http'));
  assert.equal(orphan.http.orphanDetected, true);
  assert.equal(orphan.http.matchingPidCount, 1);

  const unrelated = inspect(['4321'], () => ({
    command: [process.execPath, '/synthetic/unrelated-node.js'],
    executable: process.execPath,
    cwd: '/synthetic/runtime-repository'
  }));
  assert.equal(unrelated.http.orphanDetected, false);
  assert.equal(unrelated.http.matchingPidCount, 0);

  const otherComponent = inspect(['4321'], () => exactIdentity('relay'));
  assert.equal(otherComponent.relay.orphanDetected, true);
  assert.equal(otherComponent.http.orphanDetected, false);

  const controllerExcluded = inspect(
    [process.pid],
    () => exactIdentity('http'),
    { controllerPid: process.pid }
  );
  assert.equal(controllerExcluded.http.matchingPidCount, 0);

  const multiple = inspect(
    ['4321', '4322'],
    () => exactIdentity('http')
  );
  assert.equal(multiple.http.matchingPidCount, 2);
  assert.equal(multiple.http.orphanDetected, true);
});

test('orphan process discovery fails closed when inspection is unavailable', () => {
  const currentUid = process.getuid();
  const processIdentities = Object.fromEntries(
    ['shim', 'http', 'governance', 'relay'].map(name => [
      name,
      { pid: null }
    ])
  );
  const identity = {
    command: [
      process.execPath,
      '/synthetic/runtime-repository/scripts/codex-memory-stack.js',
      '_run-http',
      '--stack-environment=/synthetic/owner-root/governance/runtime.env'
    ],
    executable: process.execPath,
    cwd: '/synthetic/runtime-repository'
  };
  const fsModule = {
    statSync() {
      return { uid: currentUid };
    },
    realpathSync(file) {
      assert.equal(file, process.execPath);
      return process.execPath;
    }
  };
  const base = {
    fsModule,
    processIdentities,
    controllerPid: 999_999,
    isRunning: () => true,
    readIdentity: () => identity,
    ownerUid: currentUid
  };

  const clean = inspectOrphanManagedProcesses(profile(), {
    ...base,
    processEntries: [],
    readStartTicks: () => '42'
  });
  assert.equal(clean.http.orphanDetected, false);
  assert.equal(clean.http.matchingPidCount, 0);

  const foreign = inspectOrphanManagedProcesses(profile(), {
    ...base,
    processEntries: ['4321'],
    fsModule: {
      ...fsModule,
      statSync() {
        return { uid: currentUid + 1 };
      }
    },
    readStartTicks: () => '42'
  });
  assert.equal(foreign.http.matchingPidCount, 0);

  assert.throws(
    () => inspectOrphanManagedProcesses(profile(), {
      ...base,
      processEntries: ['4321'],
      readIdentity: () => null,
      readStartTicks: () => '42'
    }),
    { code: 'stack_process_identity_unavailable' }
  );
  assert.throws(
    () => inspectOrphanManagedProcesses(profile(), {
      ...base,
      processEntries: ['4321'],
      readStartTicks: () => {
        throw new Error('start identity unavailable');
      }
    }),
    { code: 'stack_process_start_identity_unavailable' }
  );
  assert.throws(
    () => inspectOrphanManagedProcesses(profile(), {
      ...base,
      enumerateProcesses() {
        throw new Error('enumeration unavailable');
      }
    }),
    { code: 'stack_process_enumeration_unavailable' }
  );
});

test('runtime, Edge, and identity stopped failures remain distinct and do not stop anything', () => {
  for (const reason of [
    'stopped_profile_transition_runtime_not_stopped',
    'stopped_profile_transition_edge_not_stopped'
  ]) {
    const h = harness({
      stopResults: [{ verified: false, reason }]
    });
    const result = coordinateStoppedOwnerProfileTransition(h.dependencies);
    assert.equal(result.stableReason, reason);
    assert.equal(result.p1Called, false);
    assert.equal(h.calls.includes('p1'), false);
    assert.equal(h.calls.includes('stop'), false);
  }
});

test('invalid first candidate source is rejected before next-profile construction', () => {
  const h = harness({
    sourceResults: [sourceFor(profile(), candidateBinding(), {
      currentMain: false
    })]
  });
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason, 'stopped_profile_transition_candidate_invalid');
  assert.equal(h.sourceCalls.length, 1);
  assert.equal(h.p1Calls.length, 0);
  assert.equal(result.profileMutated, false);
});

test('candidate binding mismatch is distinct from a dirty or wrong-branch source', () => {
  const h = harness({
    sourceResults: [sourceFor(profile(), candidateBinding(), {
      head: GIT('c')
    })]
  });
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(
    result.stableReason,
    'stopped_profile_transition_candidate_binding_mismatch'
  );
  assert.equal(h.p1Calls.length, 0);
});

test('pass-two head, manifest, and scope drift is fail-closed candidate drift', () => {
  const drifts = [
    { head: GIT('c') },
    { manifestDigest: SHA('a') },
    { clean: false }
  ];
  for (const drift of drifts) {
    const h = harness({
      sourceResults: [
        sourceFor(profile(), candidateBinding()),
        sourceFor(
          profile({
            adoptedRepositoryHead: candidateBinding().repositoryHead,
            controllerSourceManifestDigest:
              candidateBinding().controllerSourceManifestDigest
          }),
          candidateBinding(),
          drift
        )
      ]
    });
    const result = coordinateStoppedOwnerProfileTransition(h.dependencies);
    assert.equal(
      result.stableReason,
      'stopped_profile_transition_candidate_changed_after_validation'
    );
    assert.equal(h.p1Calls.length, 0);
    assert.equal(result.profileMutated, false);
  }
});

test('same candidate identity still runs both final gates and preserves exact-new P1 result', () => {
  const current = profile({
    adoptedRepositoryHead: GIT('b'),
    controllerSourceManifestDigest: SHA('9'),
    controllerSourceManifestVersion: 1
  });
  const binding = candidateBinding();
  const h = harness({
    current,
    binding,
    transaction: defaultTransaction({
      classification: 'ALREADY_COMMITTED',
      mutated: false,
      durabilityConfirmed: true,
      committedProfileMatchesNext: true
    })
  });
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'ALREADY_COMMITTED');
  assert.equal(result.profileMutated, false);
  assert.equal(result.p1Called, true);
  assert.equal(h.sourceCalls.length, 2);
  assert.equal(h.stoppedCalls.length, 2);
  assert.equal(h.p1Calls.length, 1);
});

test('schema-v5 current profile fails closed without stopped or P1 calls', () => {
  const h = harness({ current: v5Profile() });
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason, 'stopped_profile_transition_schema_unsupported');
  assert.equal(result.p1Called, false);
  assert.equal(h.stoppedCalls.length, 0);
  assert.equal(h.sourceCalls.length, 0);
  assert.equal(h.p1Calls.length, 0);
  assert.equal(result.lifecycleLockReleased, true);
});

test('schema-v4 current profile also fails closed before any runtime gate', () => {
  const {
    controllerSourceCommit: _controllerSourceCommit,
    governanceEnvironmentConfigDigest: _governanceDigest,
    relayEnvironmentConfigDigest: _relayDigest,
    vcpProviderConfigDigest: _providerDigest,
    vcpRuntimeBaseline: _vcpBaseline,
    vcpRuntimeRepository: _vcpRepository,
    vcpRuntimeScopeDigest: _vcpScope,
    ...legacyFields
  } = v5Profile();
  const current = { ...legacyFields, schemaVersion: 4 };
  const h = harness({ current });
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason, 'stopped_profile_transition_schema_unsupported');
  assert.equal(h.stoppedCalls.length, 0);
  assert.equal(h.sourceCalls.length, 0);
  assert.equal(h.p1Calls.length, 0);
});

test('unsupported manifest version is rejected before lock acquisition', () => {
  const h = harness({
    binding: candidateBinding({ controllerSourceManifestVersion: 2 })
  });
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason, 'stopped_profile_transition_candidate_invalid');
  assert.equal(h.calls.length, 0);
  assert.equal(h.p1Calls.length, 0);
});

test('next-profile validation failure is distinct and does not call P1', () => {
  const h = harness({
    validate: value => {
      if (value.adoptedRepositoryHead === candidateBinding().repositoryHead) {
        throw new Error('synthetic next profile validation failure');
      }
      return validateProfile(value);
    }
  });
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason, 'stopped_profile_transition_next_profile_invalid');
  assert.equal(h.sourceCalls.length, 1);
  assert.equal(h.p1Calls.length, 0);
});

test('all P1 result classifications are preserved without retry or alternate authority', () => {
  const results = [
    ['COMMITTED', true],
    ['COMMITTED_WITH_UNCERTAIN_DURABILITY', true],
    ['ALREADY_COMMITTED', false],
    ['ALREADY_COMMITTED_WITH_UNCERTAIN_DURABILITY', false],
    ['STALE_CURRENT', false],
    ['INVALID_CURRENT', false],
    ['INPUT_REJECTED', false],
    ['NOT_COMMITTED', false],
    ['COMMIT_RESULT_UNKNOWN', null]
  ];
  for (const [classification, mutated] of results) {
    const h = harness({
      transaction: defaultTransaction({
        classification,
        mutated,
        durabilityConfirmed: classification === 'COMMITTED' ||
          classification === 'ALREADY_COMMITTED',
        committedProfileMatchesNext: classification === 'COMMITTED' ||
          classification === 'ALREADY_COMMITTED'
      })
    });
    const result = coordinateStoppedOwnerProfileTransition(h.dependencies);
    assert.equal(result.classification, classification);
    assert.equal(result.profileTransactionClassification, classification);
    assert.equal(result.profileMutated, mutated);
    assert.equal(result.p1Called, true);
    assert.equal(h.p1Calls.length, 1);
    assert.equal(h.calls.filter(call => call === 'p1').length, 1);
    assert.equal(result.runtimeMutated, false);
  }
});

test('P1 exception is fail-closed and releases the canonical lock', () => {
  const h = harness({
    transaction: () => {
      throw new Error('synthetic P1 failure');
    }
  });
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(
    result.stableReason,
    'stopped_profile_transition_profile_transaction_failed'
  );
  assert.equal(result.p1Called, true);
  assert.equal(result.profileMutated, false);
  assert.equal(result.lifecycleLockReleased, true);
  assert.equal(h.calls.at(-1), 'release');
});

test('lock release failure wraps P1 results without changing operation truth', () => {
  const cases = [
    {
      classification: 'COMMITTED',
      errorCode: null,
      mutated: true,
      durabilityConfirmed: true,
      committedProfileMatchesNext: true
    },
    {
      classification: 'COMMITTED_WITH_UNCERTAIN_DURABILITY',
      errorCode: 'owner_profile_parent_directory_fsync_failed',
      mutated: true,
      durabilityConfirmed: false,
      committedProfileMatchesNext: true
    },
    {
      classification: 'ALREADY_COMMITTED',
      errorCode: 'owner_profile_already_committed',
      mutated: false,
      durabilityConfirmed: true,
      committedProfileMatchesNext: true
    },
    {
      classification: 'COMMIT_RESULT_UNKNOWN',
      errorCode: 'owner_profile_post_commit_state_conflict',
      mutated: null,
      durabilityConfirmed: false,
      committedProfileMatchesNext: false
    }
  ];
  const nextFingerprint = SHA('n');
  const readBackFingerprint = SHA('r');

  for (const expected of cases) {
    let releaseCount = 0;
    const h = harness({
      transaction: defaultTransaction({
        ...expected,
        nextFingerprint,
        readBackFingerprint
      }),
      release: () => {
        releaseCount += 1;
        throw new Error('synthetic lifecycle lock release failure');
      }
    });
    const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

    assert.equal(result.classification, 'LOCK_RELEASE_FAILED');
    assert.equal(result.stableReason,
      'stopped_profile_transition_lock_release_failed');
    assert.equal(result.underlyingClassification, expected.classification);
    assert.equal(
      result.profileTransactionClassification,
      expected.classification
    );
    assert.equal(result.profileTransactionErrorCode, expected.errorCode);
    assert.equal(
      result.currentProfileFingerprint,
      canonicalProfileFingerprint(h.current)
    );
    assert.equal(result.nextProfileFingerprint, nextFingerprint);
    assert.equal(result.readBackProfileFingerprint, readBackFingerprint);
    assert.equal(result.profileMutated, expected.mutated);
    assert.equal(result.durabilityConfirmed, expected.durabilityConfirmed);
    assert.equal(
      result.committedProfileMatchesNext,
      expected.committedProfileMatchesNext
    );
    assert.equal(result.lifecycleLockReleased, false);
    assert.equal(result.p1Called, true);
    assert.equal(h.p1Calls.length, 1);
    assert.equal(releaseCount, 1);
    assert.equal(h.calls.includes('rollback'), false);
    assert.equal(result.runtimeMutated, false);
  }
});

test('committed uncertain durability is projected without losing P1 facts', () => {
  const nextFingerprint = SHA('n');
  const readBackFingerprint = SHA('r');
  const errorCode = 'owner_profile_parent_directory_fsync_failed';
  const h = harness({
    transaction: defaultTransaction({
      classification: 'COMMITTED_WITH_UNCERTAIN_DURABILITY',
      errorCode,
      nextFingerprint,
      readBackFingerprint,
      mutated: true,
      durabilityConfirmed: false,
      committedProfileMatchesNext: true
    })
  });

  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification,
    'COMMITTED_WITH_UNCERTAIN_DURABILITY');
  assert.equal(result.underlyingClassification,
    'COMMITTED_WITH_UNCERTAIN_DURABILITY');
  assert.equal(result.profileTransactionClassification,
    'COMMITTED_WITH_UNCERTAIN_DURABILITY');
  assert.equal(result.profileTransactionErrorCode, errorCode);
  assert.equal(result.profileMutated, true);
  assert.equal(result.durabilityConfirmed, false);
  assert.equal(result.committedProfileMatchesNext, true);
  assert.equal(result.nextProfileFingerprint, nextFingerprint);
  assert.equal(result.readBackProfileFingerprint, readBackFingerprint);
  assert.equal(result.p1Called, true);
  assert.equal(h.p1Calls.length, 1);
  assert.equal(result.lifecycleLockReleased, true);
});

test('lock release failure wraps precondition rejection without inventing a P1 result', () => {
  let releaseCount = 0;
  const h = harness({
    stopResults: [{
      verified: false,
      reason: 'stopped_profile_transition_runtime_not_stopped'
    }],
    release: () => {
      releaseCount += 1;
      throw new Error('synthetic lifecycle lock release failure');
    }
  });
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'LOCK_RELEASE_FAILED');
  assert.equal(result.stableReason,
    'stopped_profile_transition_lock_release_failed');
  assert.equal(result.underlyingClassification, 'PRECONDITION_REJECTED');
  assert.equal(result.profileTransactionClassification, null);
  assert.equal(result.profileTransactionErrorCode, null);
  assert.equal(result.profileMutated, false);
  assert.equal(result.p1Called, false);
  assert.equal(h.p1Calls.length, 0);
  assert.equal(releaseCount, 1);
  assert.equal(h.calls.includes('rollback'), false);
  assert.equal(result.runtimeMutated, false);
  assert.equal(result.lifecycleLockAcquired, true);
  assert.equal(result.lifecycleLockReleaseAttempted, true);
  assert.equal(result.lifecycleLockReleased, false);
});

test('acquisition cleanup release failure is distinct and keeps lock unreleased', () => {
  const h = harness({
    acquireError: acquisitionCleanupReleaseError(
      'stack_lifecycle_lock_release_failed'
    )
  });

  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'LOCK_RELEASE_FAILED');
  assert.equal(result.underlyingClassification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason,
    'stopped_profile_transition_lock_release_failed');
  assert.equal(result.lifecycleLockErrorCode,
    'stack_lifecycle_lock_release_failed');
  assert.equal(result.lifecycleLockAcquired, true);
  assert.equal(result.lifecycleLockReleaseAttempted, true);
  assert.equal(result.profileTransactionClassification, null);
  assert.equal(result.profileMutated, false);
  assert.equal(result.runtimeMutated, false);
  assert.equal(result.p1Called, false);
  assert.equal(result.lifecycleLockReleased, false);
  assert.deepEqual(h.calls, ['lock']);
  assert.equal(h.p1Calls.length, 0);
  assert.equal(h.calls.includes('release'), false);
});

test('stale-lock identity change without cleanup provenance is ordinary acquisition failure', () => {
  const h = harness({
    acquireError: 'stack_lifecycle_lock_identity_changed'
  });

  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.underlyingClassification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason,
    'stopped_profile_transition_lock_failed');
  assert.equal(
    result.lifecycleLockErrorCode,
    'stack_lifecycle_lock_identity_changed'
  );
  assert.equal(result.lifecycleLockAcquired, false);
  assert.equal(result.lifecycleLockReleaseAttempted, false);
  assert.equal(result.profileTransactionClassification, null);
  assert.equal(result.profileMutated, false);
  assert.equal(result.runtimeMutated, false);
  assert.equal(result.p1Called, false);
  assert.equal(result.lifecycleLockReleased, true);
  assert.deepEqual(h.calls, ['lock']);
  assert.equal(h.p1Calls.length, 0);
  assert.equal(h.calls.includes('release'), false);
});

test('structured cleanup identity change is an unreleased-lock failure', () => {
  const h = harness({
    acquireError: acquisitionCleanupReleaseError(
      'stack_lifecycle_lock_identity_changed'
    )
  });

  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'LOCK_RELEASE_FAILED');
  assert.equal(result.underlyingClassification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason,
    'stopped_profile_transition_lock_release_failed');
  assert.equal(result.lifecycleLockErrorCode,
    'stack_lifecycle_lock_identity_changed');
  assert.equal(result.lifecycleLockAcquired, true);
  assert.equal(result.lifecycleLockReleaseAttempted, true);
  assert.equal(result.lifecycleLockReleased, false);
  assert.equal(result.profileTransactionClassification, null);
  assert.equal(result.profileMutated, false);
  assert.equal(result.p1Called, false);
  assert.deepEqual(h.calls, ['lock']);
  assert.equal(h.p1Calls.length, 0);
});

test('post-acquisition identity change wraps the underlying P1 result', () => {
  const h = harness({
    release: () => {
      const error = new Error('synthetic lock identity change');
      error.code = 'stack_lifecycle_lock_identity_changed';
      throw error;
    }
  });

  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'LOCK_RELEASE_FAILED');
  assert.equal(result.underlyingClassification, 'COMMITTED');
  assert.equal(result.profileTransactionClassification, 'COMMITTED');
  assert.equal(result.profileMutated, true);
  assert.equal(result.durabilityConfirmed, true);
  assert.equal(result.lifecycleLockErrorCode,
    'stack_lifecycle_lock_identity_changed');
  assert.equal(result.lifecycleLockAcquired, true);
  assert.equal(result.lifecycleLockReleaseAttempted, true);
  assert.equal(result.lifecycleLockReleased, false);
  assert.equal(h.p1Calls.length, 1);
});

test('ordinary acquisition failures are not projected as release failures', () => {
  for (const acquireError of [
    'stack_lifecycle_busy',
    'stack_lifecycle_lock_invalid',
    'stack_lifecycle_lock_path_invalid'
  ]) {
    const h = harness({ acquireError });
    const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

    assert.equal(result.classification, 'PRECONDITION_REJECTED');
    assert.equal(result.underlyingClassification, 'PRECONDITION_REJECTED');
    assert.equal(result.stableReason,
      'stopped_profile_transition_lock_failed');
    assert.equal(result.profileMutated, false);
    assert.equal(result.p1Called, false);
    assert.equal(result.lifecycleLockReleased, true);
    assert.deepEqual(h.calls, ['lock']);
    assert.equal(h.p1Calls.length, 0);
    assert.equal(h.calls.includes('release'), false);
  }
});

test('lock acquisition identity race has no cleanup provenance', () => {
  const original = new Error('synthetic stale-lock identity race');
  original.code = 'stack_lifecycle_lock_identity_changed';
  let thrown;

  try {
    acquireLifecycleProfile({
      environment: { XDG_RUNTIME_DIR: '/synthetic/runtime' },
      ensureRuntime() {},
      acquireLock() {
        throw original;
      },
      read() {
        throw new Error('read must not run');
      }
    });
  } catch (error) {
    thrown = error;
  }

  assert.equal(thrown, original);
  assert.equal(thrown.code, 'stack_lifecycle_lock_identity_changed');
  assert.equal(thrown.lifecycleLockAcquired, undefined);
  assert.equal(thrown.lifecycleLockReleaseAttempted, undefined);
  assert.equal(thrown.lifecycleLockReleased, undefined);
});

test('acquisition cleanup release errors carry explicit lock provenance', () => {
  for (const releaseErrorCode of [
    'stack_lifecycle_lock_identity_changed',
    'stack_lifecycle_lock_release_failed'
  ]) {
    const acquisitionError = new Error('synthetic profile acquisition error');
    acquisitionError.code = 'stack_profile_invalid';
    let releaseCount = 0;
    let thrown;

    try {
      acquireLifecycleProfile({
        environment: { XDG_RUNTIME_DIR: '/synthetic/runtime' },
        ensureRuntime() {},
        acquireLock() {
          return {
            release() {
              releaseCount += 1;
              const releaseError = new Error('synthetic release error');
              releaseError.code = releaseErrorCode;
              throw releaseError;
            }
          };
        },
        read() {
          throw acquisitionError;
        }
      });
    } catch (error) {
      thrown = error;
    }

    assert.equal(thrown.code,
      'stack_lifecycle_profile_cleanup_release_failed');
    assert.equal(thrown.lifecycleLockAcquired, true);
    assert.equal(thrown.lifecycleLockReleaseAttempted, true);
    assert.equal(thrown.lifecycleLockReleased, false);
    assert.equal(thrown.lifecycleLockReleaseErrorCode, releaseErrorCode);
    assert.equal(thrown.acquisitionErrorCode, 'stack_profile_invalid');
    assert.equal(releaseCount, 1);
  }
});

test('successful acquisition cleanup preserves the original error', () => {
  const original = new Error('synthetic profile acquisition error');
  original.code = 'stack_profile_invalid';
  let releaseCount = 0;
  let thrown;

  try {
    acquireLifecycleProfile({
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
        throw original;
      }
    });
  } catch (error) {
    thrown = error;
  }

  assert.equal(thrown, original);
  assert.equal(thrown.code, 'stack_profile_invalid');
  assert.equal(releaseCount, 1);
});

test('real P1 transaction commits a complete temporary schema-v6 profile fixture', t => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'codex-memory-stopped-profile-')
  );
  const target = path.join(directory, 'full-stack-control.json');
  const current = profile();
  fs.writeFileSync(target, `${JSON.stringify(current, null, 2)}\n`, {
    mode: 0o600
  });
  fs.chmodSync(target, 0o600);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const h = harness({
    profilePath: target,
    transaction: options => commitOwnerProfileTransaction(options)
  });
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);
  const committed = JSON.parse(fs.readFileSync(target, 'utf8'));

  assert.equal(result.classification, 'COMMITTED');
  assert.equal(result.profileTransactionClassification, 'COMMITTED');
  assert.equal(result.profileMutated, true);
  assert.equal(committed.adoptedRepositoryHead, h.binding.repositoryHead);
  assert.equal(
    committed.controllerSourceManifestDigest,
    h.binding.controllerSourceManifestDigest
  );
  assert.equal(
    committed.controllerSourceManifestVersion,
    h.binding.controllerSourceManifestVersion
  );
  assert.equal(committed.privateRoot, current.privateRoot);
  assert.equal(committed.runtimeRepository, current.runtimeRepository);
  assert.equal(h.p1Calls.length, 1);
});

test('adapter is dependency-driven and has no lock, runtime, journal, or public command authority', () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'scripts',
      'codex-memory-stopped-profile-transition.js'
    ),
    'utf8'
  );
  assert.equal(source.includes('acquireOwnerLock'), false);
  assert.equal(source.includes('docker'), false);
  assert.equal(source.includes('spawn'), false);
  assert.equal(source.includes('transitionRecordStore'), false);
  assert.equal(source.includes('Observer'), false);
  assert.equal(source.includes('journal'), false);
  assert.equal(source.includes('coordinateSourceManifestRebind'), false);
  assert.equal(source.includes('startStackWithProfile'), false);
  assert.equal(source.includes('rollbackStarted'), false);
  assert.equal(source.includes('spawnManaged'), false);
  assert.equal(source.includes('commitOwnerProfileTransaction'), true);
});

test('malformed candidate binding is rejected before acquiring a lock', () => {
  const h = harness({
    binding: {
      repositoryHead: GIT('b'),
      controllerSourceManifestDigest: SHA('9')
    }
  });
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(
    result.stableReason,
    'stopped_profile_transition_candidate_binding_mismatch'
  );
  assert.equal(h.calls.length, 0);
  assert.equal(result.lifecycleLockReleased, true);
});

test('uncertain durability remains uncertain and is not upgraded by the adapter', () => {
  const h = harness({
    transaction: defaultTransaction({
      classification: 'ALREADY_COMMITTED_WITH_UNCERTAIN_DURABILITY',
      mutated: false,
      durabilityConfirmed: false,
      committedProfileMatchesNext: true
    })
  });
  const result = coordinateStoppedOwnerProfileTransition(h.dependencies);

  assert.equal(
    result.classification,
    'ALREADY_COMMITTED_WITH_UNCERTAIN_DURABILITY'
  );
  assert.equal(result.durabilityConfirmed, false);
  assert.equal(result.profileMutated, false);
});
