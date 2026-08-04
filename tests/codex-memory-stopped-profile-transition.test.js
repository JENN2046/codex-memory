'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
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
  release
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
  assert.equal(result.lifecycleLockReleased, false);
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
