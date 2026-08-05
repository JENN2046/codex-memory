'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const observer = require('../scripts/codex-memory-process-observer');
const stack = require('../scripts/codex-memory-stack');
const transition = require('../scripts/codex-memory-stopped-profile-transition');

const SHA = suffix => `sha256:${suffix.repeat(64)}`;
const GIT = suffix => suffix.repeat(40);
const ID = suffix => suffix.repeat(64);

function codedError(code) {
  return Object.assign(new Error(code), { code });
}

function profile(overrides = {}) {
  return {
    schemaVersion: stack.PROFILE_SCHEMA_VERSION,
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

const candidateBinding = Object.freeze({
  repositoryHead: GIT('9'),
  controllerSourceManifestDigest: SHA('8'),
  controllerSourceManifestVersion: 1
});

const RUNTIME = '/synthetic/runtime';
const NODE = '/synthetic/node';

function scanOne({
  pid = 123,
  knownPidsByComponent = {},
  liveness = [true, true, true],
  owner = observer.OWNER_STATES.SAME_OWNER,
  executable = NODE,
  cwd = RUNTIME,
  command = ['node', '/synthetic/runtime/scripts/codex-memory-stack.js', '_run-http'],
  shape = observer.COMMAND_SHAPES.MANAGED_SHAPE,
  component = 'http',
  startIdentity = '77',
  canonicalNode = NODE,
  enumeration = [pid],
  readerOverrides = {}
} = {}) {
  const calls = [];
  let index = 0;
  const result = observer.scanManagedProcesses({
    runtimeRepository: RUNTIME,
    controllerPid: 999,
    knownPidsByComponent,
    processIOAdapter: {
      execPath: NODE,
      resolveCanonicalNode(value) {
        calls.push(`canonical:${value}`);
        if (canonicalNode === null) throw new Error('unavailable');
        return canonicalNode;
      },
      enumerateProcessIds() {
        calls.push('enumerate');
        if (enumeration instanceof Error) throw enumeration;
        return enumeration;
      },
      readLiveness() {
        calls.push('liveness');
        const value = liveness[index++];
        if (value instanceof Error) throw value;
        return index <= liveness.length ? value : liveness.at(-1);
      },
      readOwner() { calls.push('owner'); return owner; },
      readExecutable() { calls.push('executable'); return executable; },
      readCwd() { calls.push('cwd'); return cwd; },
      readCommandLine() { calls.push('cmdline'); return command; },
      readStartIdentity() { calls.push('start'); return startIdentity; },
      ...readerOverrides
    },
    classifyCommandShape() { calls.push('shape'); return shape; },
    exactComponentMatcher() { calls.push('exact'); return component; }
  });
  return { calls, result };
}

test('observer exposes only tri-state enums, pure classifiers, and sanitized scan', () => {
  assert.deepEqual(Object.keys(observer).sort(), [
    'COMMAND_SHAPES',
    'DECISIONS',
    'EVIDENCE_STATUS',
    'LIVENESS_STATES',
    'OWNER_STATES',
    'classifyManagedCommandShape',
    'classifyManagedProcessEvidence',
    'scanManagedProcesses'
  ].sort());
  for (const name of [
    'collectProcessEvidence',
    'enumerateProcessIds',
    'readProcessLiveness',
    'readProcessOwner',
    'readProcessExecutable',
    'readProcessCwd',
    'readProcessCommandLine',
    'readProcessStartIdentity',
    'createCanonicalNodeSnapshot'
  ]) {
    assert.equal(Object.hasOwn(observer, name), false, name);
  }
  const incomplete = {
    liveness: observer.LIVENESS_STATES.RUNNING,
    disappeared: false,
    owner: { status: observer.OWNER_STATES.SAME_OWNER },
    canonicalNode: { status: observer.EVIDENCE_STATUS.UNAVAILABLE, path: null },
    executable: { status: observer.EVIDENCE_STATUS.UNREADABLE, path: null },
    cwd: { status: observer.EVIDENCE_STATUS.READABLE, path: RUNTIME },
    command: { status: observer.EVIDENCE_STATUS.READABLE, argv: ['node', 'managed'] },
    startIdentity: { status: observer.EVIDENCE_STATUS.NOT_READ, value: null }
  };
  assert.equal(observer.classifyManagedProcessEvidence(incomplete, {
    runtimeRepository: RUNTIME,
    commandShape: observer.COMMAND_SHAPES.MANAGED_SHAPE
  }).decision, observer.DECISIONS.FAIL_CLOSED);
});

test('liveness normalization preserves unknown and native error semantics', () => {
  const injected = [
    [true, 'KNOWN_PID_RUNNING'],
    [false, 'NO_MANAGED_MATCH'],
    [null, 'KNOWN_PID_LIVENESS_UNKNOWN'],
    [undefined, 'KNOWN_PID_LIVENESS_UNKNOWN'],
    [observer.LIVENESS_STATES.RUNNING, 'KNOWN_PID_RUNNING'],
    [observer.LIVENESS_STATES.NOT_RUNNING, 'NO_MANAGED_MATCH'],
    [observer.LIVENESS_STATES.UNKNOWN, 'KNOWN_PID_LIVENESS_UNKNOWN'],
    [new Error('reader failed'), 'KNOWN_PID_LIVENESS_UNKNOWN']
  ];
  for (const [value, reason] of injected) {
    assert.equal(scanOne({
      enumeration: [],
      knownPidsByComponent: { http: 321 },
      liveness: [value]
    }).result.reason, reason);
  }
  for (const [errorCode, reason] of [
    [null, 'KNOWN_PID_RUNNING'],
    ['EPERM', 'KNOWN_PID_RUNNING'],
    ['ESRCH', 'NO_MANAGED_MATCH'],
    ['EIO', 'KNOWN_PID_LIVENESS_UNKNOWN']
  ]) {
    const result = observer.scanManagedProcesses({
      runtimeRepository: RUNTIME,
      controllerPid: 999,
      knownPidsByComponent: { http: 321 },
      processIOAdapter: {
        execPath: NODE,
        resolveCanonicalNode: () => NODE,
        enumerateProcessIds: () => [],
        kill() {
          if (!errorCode) return;
          throw Object.assign(new Error(errorCode), { code: errorCode });
        }
      },
      classifyCommandShape: () =>
        observer.COMMAND_SHAPES.DEFINITIVELY_UNRELATED,
      exactComponentMatcher: () => null
    });
    assert.equal(result.reason, reason);
  }
});

test('liveness time matrix and known PID union fail closed without false running', () => {
  for (const [liveness, decision] of [
    [[true, false], observer.DECISIONS.IGNORE],
    [[true, null], observer.DECISIONS.FAIL_CLOSED],
    [[true, true, false], observer.DECISIONS.IGNORE],
    [[true, true, undefined], observer.DECISIONS.FAIL_CLOSED]
  ]) {
    assert.equal(scanOne({ liveness }).result.decision, decision);
  }
  const known = scanOne({
    enumeration: [],
    knownPidsByComponent: { http: 321 },
    liveness: [true]
  });
  assert.equal(known.result.reason, 'KNOWN_PID_RUNNING');
  assert.equal(known.calls.filter(call => call === 'liveness').length, 1);
});

test('scanner minimizes reads and returns no raw process evidence', () => {
  assert.equal(scanOne({
    owner: observer.OWNER_STATES.FOREIGN_OWNER
  }).calls.includes('cmdline'), false);
  assert.equal(scanOne({ pid: 999 }).calls.includes('cmdline'), false);
  assert.equal(scanOne({ cwd: '/other/repository' }).calls.includes('cmdline'),
    false);
  assert.equal(scanOne({
    executable: '/usr/bin/python3'
  }).calls.includes('cmdline'), false);
  const exact = scanOne();
  assert.equal(exact.result.decision, observer.DECISIONS.EXACT);
  assert.deepEqual(exact.calls, [
    'canonical:/synthetic/node', 'enumerate', 'liveness', 'owner',
    'executable', 'cwd', 'liveness', 'cmdline', 'liveness', 'shape',
    'exact', 'start'
  ]);
  assert.deepEqual(Object.keys(exact.result).sort(), [
    'canonicalNodeStatus', 'componentMatches', 'decision', 'reason'
  ]);
  assert.deepEqual(Object.keys(exact.result.componentMatches[0]).sort(), [
    'component', 'pid'
  ]);
  assert.doesNotMatch(JSON.stringify(exact.result),
    /argv|executable|cwd|startIdentity|evidence/u);
});

test('canonical Node is resolved once and unavailable identity cannot match', () => {
  let calls = 0;
  const exact = scanOne({
    readerOverrides: {
      resolveCanonicalNode() {
        calls += 1;
        return calls === 1 ? NODE : '/changed/node';
      }
    }
  });
  assert.equal(calls, 1);
  assert.equal(exact.result.decision, observer.DECISIONS.EXACT);
  const unavailable = scanOne({ canonicalNode: null });
  assert.equal(unavailable.result.decision, observer.DECISIONS.FAIL_CLOSED);
  assert.equal(unavailable.result.canonicalNodeStatus,
    observer.EVIDENCE_STATUS.UNAVAILABLE);
  assert.equal(unavailable.calls.includes('start'), false);
});

function sourceFor(value = candidateBinding) {
  return {
    head: value.repositoryHead,
    manifestDigest: value.controllerSourceManifestDigest,
    manifestVersion: value.controllerSourceManifestVersion,
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

function p1Result(classification, overrides = {}) {
  return {
    classification,
    errorCode: null,
    mutated: classification === 'COMMITTED' ? true : false,
    durabilityConfirmed: classification === 'COMMITTED',
    committedProfileMatchesNext: classification.startsWith('COMMITTED'),
    oldFingerprint: 'old-fingerprint',
    nextFingerprint: 'next-fingerprint',
    readBackFingerprint: 'read-back-fingerprint',
    ...overrides
  };
}

function coordinate(overrides = {}) {
  const calls = [];
  let releases = 0;
  const current = profile();
  const result = transition.coordinateStoppedOwnerProfileTransition({
    candidateBinding,
    profilePath: '/synthetic/profile.json',
    acquireLifecycleProfile: () => {
      calls.push('acquire');
      return {
        profile: current,
        release() {
          calls.push('release');
          releases += 1;
          if (overrides.releaseError) throw overrides.releaseError;
        }
      };
    },
    inspectStoppedState: value => {
      calls.push(`stopped:${value.adoptedRepositoryHead}`);
      if (overrides.stopped) return overrides.stopped(value, calls);
      return { inspectionComplete: true };
    },
    inspectSourceCompatibility: value => {
      calls.push(`source:${value.adoptedRepositoryHead}`);
      if (overrides.source) return overrides.source(value, calls);
      return sourceFor();
    },
    validateProfile: value => stack.validateProfile(value),
    canonicalProfileFingerprint: value =>
      `${value.adoptedRepositoryHead}:${value.controllerSourceManifestDigest}`,
    commitOwnerProfileTransaction: args => {
      calls.push('p1');
      if (overrides.p1Error) throw overrides.p1Error;
      return overrides.p1 || p1Result('COMMITTED');
    },
    ...overrides.dependencies
  });
  return { calls, releases, result };
}

test('coordinator orders two stopped gates and candidate passes before one P1 call', () => {
  const { calls, releases, result } = coordinate();
  assert.equal(result.classification, 'COMMITTED');
  assert.equal(result.p1Called, true);
  assert.equal(result.initialStoppedVerified, true);
  assert.equal(result.finalStoppedVerified, true);
  assert.equal(releases, 1);
  assert.deepEqual(calls.map(value => value.split(':')[0]), [
    'acquire', 'stopped', 'source', 'source', 'stopped', 'p1', 'release'
  ]);
});

test('all P1 classifications and mutation facts survive successful release', () => {
  for (const classification of transition.P1_CLASSIFICATIONS) {
    const expected = p1Result(classification, {
      mutated: classification === 'COMMIT_RESULT_UNKNOWN' ? null : false,
      durabilityConfirmed: classification.includes('UNCERTAIN') ? false : true,
      committedProfileMatchesNext:
        classification === 'COMMIT_RESULT_UNKNOWN' ? null : false
    });
    const { result } = coordinate({ p1: expected });
    assert.equal(result.classification, classification);
    assert.equal(result.profileTransactionClassification, classification);
    assert.equal(result.profileMutated, expected.mutated);
    assert.equal(result.durabilityConfirmed, expected.durabilityConfirmed);
    assert.equal(
      result.committedProfileMatchesNext,
      expected.committedProfileMatchesNext
    );
    assert.equal(result.readBackProfileFingerprint, 'read-back-fingerprint');
  }
});

test('final release is authoritative while preserving P1 and precondition facts', () => {
  const releaseError = codedError('stack_lifecycle_lock_identity_changed');
  const p1 = coordinate({
    p1: p1Result('COMMIT_RESULT_UNKNOWN', {
      errorCode: 'owner_profile_commit_result_unknown',
      mutated: null,
      durabilityConfirmed: false,
      committedProfileMatchesNext: null
    }),
    releaseError
  });
  assert.equal(p1.result.classification, 'LOCK_RELEASE_FAILED');
  assert.equal(p1.result.underlyingClassification, 'COMMIT_RESULT_UNKNOWN');
  assert.equal(p1.result.lifecycleLockErrorCode, releaseError.code);
  assert.equal(p1.result.profileMutated, null);
  assert.equal(p1.result.profileTransactionErrorCode,
    'owner_profile_commit_result_unknown');
  assert.equal(p1.releases, 1);

  const precondition = coordinate({
    stopped() {
      throw codedError('stack_process_identity_unavailable');
    },
    releaseError
  });
  assert.equal(precondition.result.classification, 'LOCK_RELEASE_FAILED');
  assert.equal(precondition.result.underlyingClassification,
    'PRECONDITION_REJECTED');
  assert.equal(precondition.result.preconditionErrorCode,
    'stack_process_identity_unavailable');
  assert.equal(precondition.result.lifecycleLockErrorCode, releaseError.code);
  assert.equal(precondition.calls.includes('p1'), false);
  assert.equal(precondition.releases, 1);
});

test('final stopped race rejects before P1 and still releases once', () => {
  let stoppedCalls = 0;
  const { calls, releases, result } = coordinate({
    stopped() {
      stoppedCalls += 1;
      if (stoppedCalls === 2) {
        throw codedError('stack_managed_orphan_process');
      }
      return { inspectionComplete: true };
    }
  });
  assert.equal(result.classification, 'PRECONDITION_REJECTED');
  assert.equal(result.stableReason,
    'stopped_profile_transition_runtime_not_stopped');
  assert.equal(result.p1Called, false);
  assert.equal(calls.includes('p1'), false);
  assert.equal(releases, 1);
});

test('initial stopped rejection and candidate drift never call P1', () => {
  const initial = coordinate({
    stopped() {
      throw codedError('stack_process_running');
    }
  });
  assert.equal(initial.result.p1Called, false);
  assert.equal(initial.result.initialStoppedVerified, false);
  assert.equal(initial.calls.includes('source'), false);
  assert.equal(initial.releases, 1);

  let sourceCalls = 0;
  const drift = coordinate({
    source() {
      sourceCalls += 1;
      return sourceCalls === 1
        ? sourceFor()
        : sourceFor({
          ...candidateBinding,
          repositoryHead: GIT('7')
        });
    }
  });
  assert.equal(drift.result.p1Called, false);
  assert.equal(drift.result.stableReason,
    'stopped_profile_transition_candidate_binding_mismatch');
  assert.equal(drift.calls.includes('p1'), false);
  assert.equal(drift.releases, 1);
});

test('real acquireLifecycleProfile preserves cleanup success and failure provenance', () => {
  let releases = 0;
  const cleanupSuccess = transition.coordinateStoppedOwnerProfileTransition({
    candidateBinding,
    profilePath: '/synthetic/profile.json',
    acquireLifecycleProfile: () => stack.acquireLifecycleProfile({
      ensureRuntime() {},
      acquireLock: () => ({ release() { releases += 1; } }),
      read: () => { throw codedError('stack_profile_invalid'); }
    }),
    inspectStoppedState() { throw new Error('unreachable'); },
    inspectSourceCompatibility() { throw new Error('unreachable'); },
    validateProfile: stack.validateProfile,
    canonicalProfileFingerprint: () => 'unused',
    commitOwnerProfileTransaction() { throw new Error('unreachable'); }
  });
  assert.equal(cleanupSuccess.classification, 'PRECONDITION_REJECTED');
  assert.equal(cleanupSuccess.stableReason,
    'stopped_profile_transition_current_profile_invalid');
  assert.equal(cleanupSuccess.lifecycleLockAcquired, true);
  assert.equal(cleanupSuccess.lifecycleLockReleaseAttempted, true);
  assert.equal(cleanupSuccess.lifecycleLockReleased, true);
  assert.equal(cleanupSuccess.preconditionErrorCode, 'stack_profile_invalid');
  assert.equal(cleanupSuccess.lifecycleLockErrorCode, null);
  assert.equal(releases, 1);

  const cleanupFailure = transition.coordinateStoppedOwnerProfileTransition({
    candidateBinding,
    profilePath: '/synthetic/profile.json',
    acquireLifecycleProfile: () => stack.acquireLifecycleProfile({
      ensureRuntime() {},
      acquireLock: () => ({
        release() {
          throw codedError('stack_lifecycle_lock_identity_changed');
        }
      }),
      read: () => { throw codedError('stack_profile_invalid'); }
    }),
    inspectStoppedState() { throw new Error('unreachable'); },
    inspectSourceCompatibility() { throw new Error('unreachable'); },
    validateProfile: stack.validateProfile,
    canonicalProfileFingerprint: () => 'unused',
    commitOwnerProfileTransaction() { throw new Error('unreachable'); }
  });
  assert.equal(cleanupFailure.classification, 'LOCK_RELEASE_FAILED');
  assert.equal(cleanupFailure.preconditionErrorCode, 'stack_profile_invalid');
  assert.equal(cleanupFailure.lifecycleLockErrorCode,
    'stack_lifecycle_lock_identity_changed');
  assert.equal(cleanupFailure.lifecycleLockReleased, false);
});

test('owner-lock initialization cleanup success and failure expose residual truth', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-r4-lock-'));
  fs.chmodSync(directory, 0o700);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const successfulFile = path.join(directory, 'cleanup-success.lock');
  const writeFailureFs = Object.create(fs);
  writeFailureFs.writeFileSync = () => {
    throw codedError('stack_synthetic_write_failed');
  };
  assert.throws(() => stack.acquireOwnerLock(successfulFile, {
    fsModule: writeFailureFs,
    readStartTicks: () => '123'
  }), error => {
    assert.equal(error.code, 'stack_synthetic_write_failed');
    assert.equal(error.cleanupPhase, 'owner_lock_initialization');
    assert.equal(error.lifecycleLockAcquired, true);
    assert.equal(error.lifecycleLockReleaseAttempted, true);
    assert.equal(error.lifecycleLockReleased, true);
    assert.equal(error.residualLockPossible, false);
    return true;
  });
  assert.equal(fs.existsSync(successfulFile), false);

  const failedFile = path.join(directory, 'cleanup-failure.lock');
  const unlinkFailureFs = Object.create(fs);
  unlinkFailureFs.writeFileSync = writeFailureFs.writeFileSync;
  unlinkFailureFs.unlinkSync = () => {
    throw codedError('stack_synthetic_unlink_failed');
  };
  assert.throws(() => stack.acquireOwnerLock(failedFile, {
    fsModule: unlinkFailureFs,
    readStartTicks: () => '123'
  }), error => {
    assert.equal(error.code, 'stack_lifecycle_acquisition_cleanup_failed');
    assert.equal(error.cleanupPhase, 'owner_lock_initialization');
    assert.equal(error.lifecycleLockReleased, false);
    assert.equal(error.residualLockPossible, true);
    assert.equal(error.primaryErrorCode, 'stack_synthetic_write_failed');
    assert.equal(error.cleanupErrorCode, 'stack_lifecycle_lock_unlink_failed');
    return true;
  });
  assert.equal(fs.existsSync(failedFile), true);
});

test('owner-lock fsync, close, and identity cleanup faults remain observable', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-r4-faults-'));
  fs.chmodSync(directory, 0o700);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const fsyncFile = path.join(directory, 'fsync.lock');
  const fsyncFailureFs = Object.create(fs);
  fsyncFailureFs.fsyncSync = () => {
    throw codedError('stack_synthetic_fsync_failed');
  };
  assert.throws(() => stack.acquireOwnerLock(fsyncFile, {
    fsModule: fsyncFailureFs,
    readStartTicks: () => '123'
  }), error => {
    assert.equal(error.code, 'stack_synthetic_fsync_failed');
    assert.equal(error.lifecycleLockReleased, true);
    assert.equal(error.residualLockPossible, false);
    return true;
  });
  assert.equal(fs.existsSync(fsyncFile), false);

  const closeFile = path.join(directory, 'close.lock');
  const closeFailureFs = Object.create(fs);
  closeFailureFs.closeSync = () => {
    throw codedError('stack_synthetic_close_failed');
  };
  assert.throws(() => stack.acquireOwnerLock(closeFile, {
    fsModule: closeFailureFs,
    readStartTicks: () => '123'
  }), error => {
    assert.equal(error.code, 'stack_lifecycle_acquisition_cleanup_failed');
    assert.equal(error.cleanupErrorCode, 'stack_lifecycle_lock_close_failed');
    assert.equal(error.lifecycleLockReleased, false);
    assert.equal(error.residualLockPossible, true);
    return true;
  });

  const identityFile = path.join(directory, 'identity.lock');
  const identityFailureFs = Object.create(fs);
  identityFailureFs.chmodSync = target => {
    if (target === identityFile) {
      throw codedError('stack_synthetic_mode_failed');
    }
    return fs.chmodSync(target, 0o700);
  };
  identityFailureFs.lstatSync = target => {
    const stat = fs.lstatSync(target);
    if (target !== identityFile) return stat;
    return Object.assign(Object.create(stat), {
      ino: stat.ino + 1,
      isFile: () => true,
      isSymbolicLink: () => false
    });
  };
  assert.throws(() => stack.acquireOwnerLock(identityFile, {
    fsModule: identityFailureFs,
    readStartTicks: () => '123'
  }), error => {
    assert.equal(error.code, 'stack_lifecycle_acquisition_cleanup_failed');
    assert.equal(error.primaryErrorCode, 'stack_synthetic_mode_failed');
    assert.equal(error.cleanupErrorCode,
      'stack_lifecycle_lock_identity_changed');
    assert.equal(error.residualLockPossible, true);
    return true;
  });
});

test('stack aggregation passes PID hints to sanitized scanner and never exposes raw evidence', () => {
  const seen = [];
  const pidState = {
    shim: { valid: true, pid: null, present: false },
    http: { valid: true, pid: 321, present: true },
    governance: { valid: true, pid: null, present: false },
    relay: { valid: true, pid: null, present: false }
  };
  const result = stack.inspectStoppedStateForOwnerProfileTransition(profile(), {
    readPidFileState: name => pidState[name],
    scanProcesses(input) {
      seen.push(input.knownPidsByComponent);
      return Object.freeze({
        decision: observer.DECISIONS.IGNORE,
        reason: 'NO_MANAGED_MATCH',
        componentMatches: Object.freeze([]),
        canonicalNodeStatus: observer.EVIDENCE_STATUS.RESOLVED,
        argv: 'RAW_ARGV_MUST_NOT_ESCAPE'
      });
    },
    inspectEdge: () => ({
      running: false,
      configurationSecure: true,
      id: ID('4'),
      revision: GIT('e')
    })
  });
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0], {
    shim: null,
    http: 321,
    governance: null,
    relay: null
  });
  assert.equal(result.inspectionComplete, true);
  assert.equal(JSON.stringify(result).includes('RAW_ARGV_MUST_NOT_ESCAPE'), false);
  assert.equal(Object.hasOwn(result, 'componentMatches'), false);
});

test('stack aggregation rejects known, unknown, orphan, and enumeration failures', () => {
  const baseOptions = {
    readPidFileState: () => ({ valid: true, pid: null, present: false }),
    inspectEdge: () => ({
      running: false,
      configurationSecure: true,
      id: ID('4'),
      revision: GIT('e')
    })
  };
  const cases = [
    ['KNOWN_PID_RUNNING', observer.DECISIONS.FAIL_CLOSED,
      'stack_process_running', []],
    ['KNOWN_PID_LIVENESS_UNKNOWN', observer.DECISIONS.FAIL_CLOSED,
      'stack_process_identity_unavailable', []],
    ['PROCESS_ENUMERATION_UNAVAILABLE', observer.DECISIONS.FAIL_CLOSED,
      'stack_process_enumeration_unavailable', []],
    ['MANAGED_PROCESS_MATCH', observer.DECISIONS.EXACT,
      'stack_managed_orphan_process', [{ pid: 777, component: 'http' }]]
  ];
  for (const [reason, decision, code, componentMatches] of cases) {
    assert.throws(() => stack.inspectStoppedStateForOwnerProfileTransition(
      profile(), {
        ...baseOptions,
        scanProcesses: () => ({
          decision,
          reason,
          componentMatches,
          canonicalNodeStatus: observer.EVIDENCE_STATUS.RESOLVED
        })
      }
    ), error => error.code === code, reason);
  }
});

test('P2 process readers remain private and dormant from public dispatch', () => {
  for (const name of [
    'enumerateProcessIds',
    'readProcessOwnerStatus',
    'readProcessExecutable',
    'readProcessCwd',
    'readProcessCommandLine'
  ]) {
    assert.equal(Object.hasOwn(stack, name), false, name);
  }
  const source = fs.readFileSync(
    require.resolve('../scripts/codex-memory-stack'),
    'utf8'
  );
  const mainBody = source.slice(source.indexOf('async function main('),
    source.indexOf('module.exports ='));
  assert.equal(mainBody.includes('coordinateStoppedOwnerProfileTransition('),
    false);
});
