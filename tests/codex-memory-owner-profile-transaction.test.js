'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  PROFILE_SCHEMA_VERSION,
  V5_PROFILE_KEYS,
  validateProfile
} = require('../scripts/codex-memory-stack');
const {
  canonicalProfileFingerprint,
  commitOwnerProfileTransaction
} = require('../scripts/codex-memory-owner-profile-transaction');

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

function fixture(t, current = profile()) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'codex-memory-owner-profile-')
  );
  const target = path.join(directory, 'full-stack-control.json');
  fs.writeFileSync(target, `${JSON.stringify(current, null, 2)}\n`, {
    mode: 0o600
  });
  fs.chmodSync(target, 0o600);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return { directory, target };
}

function writeProfile(target, value, formatting = 2) {
  fs.writeFileSync(target, `${JSON.stringify(value, null, formatting)}\n`, {
    mode: 0o600
  });
  fs.chmodSync(target, 0o600);
}

function recordingFs(calls) {
  const descriptors = new Map();
  const adapter = Object.create(fs);
  adapter.openSync = (file, ...args) => {
    const descriptor = fs.openSync(file, ...args);
    descriptors.set(descriptor, file);
    calls.push(['open', file, args[0], args[1]]);
    return descriptor;
  };
  adapter.writeFileSync = (file, ...args) => {
    calls.push(['write', file]);
    return fs.writeFileSync(file, ...args);
  };
  adapter.fsyncSync = descriptor => {
    calls.push(['fsync', descriptors.get(descriptor)]);
    return fs.fsyncSync(descriptor);
  };
  adapter.closeSync = descriptor => {
    calls.push(['close', descriptors.get(descriptor)]);
    return fs.closeSync(descriptor);
  };
  adapter.chmodSync = (file, ...args) => {
    calls.push(['chmod', file]);
    return fs.chmodSync(file, ...args);
  };
  adapter.renameSync = (from, to) => {
    calls.push(['rename', from, to]);
    return fs.renameSync(from, to);
  };
  return adapter;
}

function reverseKeys(value) {
  return Object.fromEntries(
    Object.keys(value).reverse().map(key => [key, value[key]])
  );
}

test('canonical fingerprint ignores JSON whitespace and object insertion order', t => {
  const { target } = fixture(t);
  const current = profile();
  const expected = canonicalProfileFingerprint(current);
  writeProfile(target, reverseKeys(current), 0);
  assert.equal(canonicalProfileFingerprint(JSON.parse(fs.readFileSync(target))), expected);
});

test('canonical fingerprint binds every validated profile field', () => {
  const current = profile();
  const changed = profile({ runtimeRepository: '/synthetic/other-repository' });
  assert.notEqual(
    canonicalProfileFingerprint(current),
    canonicalProfileFingerprint(changed)
  );
  assert.deepEqual(Object.keys(validateProfile(current)).sort(), [
    'adoptedRepositoryHead',
    'controllerSourceManifestDigest',
    'controllerSourceManifestVersion',
    'edgeContainer',
    'edgeContainerId',
    'governanceEnvironment',
    'governanceEnvironmentConfigDigest',
    'privateRoot',
    'providerContainer',
    'providerContainerId',
    'providerImageId',
    'providerRevision',
    'relayEnvironment',
    'relayEnvironmentConfigDigest',
    'retainedBinding',
    'retainedBindingSource',
    'runtimeBaseline',
    'runtimeRepository',
    'schemaVersion',
    'vcpProviderConfigDigest',
    'vcpRuntimeBaseline',
    'vcpRuntimeRepository',
    'vcpRuntimeScopeDigest'
  ].sort());
});

test('expected old profile commits and reads back exact next fingerprint', t => {
  const { target } = fixture(t);
  const oldProfile = profile();
  const nextProfile = profile({ adoptedRepositoryHead: GIT('9') });
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(oldProfile),
    nextProfile
  });
  assert.equal(result.classification, 'COMMITTED');
  assert.equal(result.mutated, true);
  assert.equal(result.durabilityConfirmed, true);
  assert.equal(result.readBackFingerprint, canonicalProfileFingerprint(nextProfile));
  assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), nextProfile);
});

test('current exact new returns idempotent success without rewrite', t => {
  const nextProfile = profile({ adoptedRepositoryHead: GIT('9') });
  const { target } = fixture(t, nextProfile);
  const before = fs.statSync(target);
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile
  });
  const after = fs.statSync(target);
  assert.equal(result.classification, 'ALREADY_COMMITTED');
  assert.equal(result.mutated, false);
  assert.equal(result.committedProfileMatchesNext, true);
  assert.equal(after.mtimeNs, before.mtimeNs);
});

test('valid stale current is rejected without mutation', t => {
  const current = profile({ adoptedRepositoryHead: GIT('9') });
  const { target } = fixture(t, current);
  const before = fs.readFileSync(target);
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile: profile({ adoptedRepositoryHead: GIT('b') })
  });
  assert.equal(result.classification, 'STALE_CURRENT');
  assert.equal(result.mutated, false);
  assert.deepEqual(fs.readFileSync(target), before);
});

test('malformed current profile fails closed', t => {
  const { target } = fixture(t);
  fs.writeFileSync(target, '{not-json\n');
  fs.chmodSync(target, 0o600);
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile: profile({ adoptedRepositoryHead: GIT('9') })
  });
  assert.equal(result.classification, 'INVALID_CURRENT');
  assert.equal(result.validationFailed, true);
  assert.equal(result.mutated, false);
});

test('wrong owner-only mode fails closed', t => {
  const { target } = fixture(t);
  fs.chmodSync(target, 0o640);
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile: profile({ adoptedRepositoryHead: GIT('9') })
  });
  assert.equal(result.classification, 'INVALID_CURRENT');
  assert.equal(result.mutated, false);
});

test('temp file is exclusive, owner-only, and in the target directory', t => {
  const { directory, target } = fixture(t);
  const calls = [];
  const adapter = recordingFs(calls);
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile: profile({ adoptedRepositoryHead: GIT('9') }),
    fsModule: adapter
  });
  assert.equal(result.classification, 'COMMITTED');
  const tempOpen = calls.find(call => call[0] === 'open' && call[1] !== directory);
  assert.ok(tempOpen);
  assert.equal(path.dirname(tempOpen[1]), directory);
  assert.equal(tempOpen[2] & fs.constants.O_EXCL, fs.constants.O_EXCL);
  assert.equal(tempOpen[3], 0o600);
  assert.equal(fs.statSync(tempOpen[1], { throwIfNoEntry: false }), undefined);
  assert.match(tempOpen[1], /\.tmp$/u);
  assert.equal(fs.statSync(target).mode & 0o077, 0);
});

test('file fsync happens before rename and parent directory fsync happens after rename', t => {
  const { directory, target } = fixture(t);
  const calls = [];
  const adapter = recordingFs(calls);
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile: profile({ adoptedRepositoryHead: GIT('9') }),
    fsModule: adapter
  });
  assert.equal(result.classification, 'COMMITTED');
  const sequence = calls
    .filter(call => ['fsync', 'rename'].includes(call[0]))
    .map(call => call[0] === 'rename'
      ? 'rename'
      : call[1] === directory ? 'directory_fsync' : 'file_fsync');
  assert.deepEqual(sequence, ['file_fsync', 'rename', 'directory_fsync']);
});

test('parent-directory fsync failure never returns ordinary committed', t => {
  const { target } = fixture(t);
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile: profile({ adoptedRepositoryHead: GIT('9') }),
    faultInjector: point => point === 'parent_directory_fsync'
  });
  assert.equal(result.classification, 'COMMITTED_WITH_UNCERTAIN_DURABILITY');
  assert.equal(result.durabilityConfirmed, false);
  assert.equal(result.committedProfileMatchesNext, true);
});

test('rename-before failures preserve the expected old target', t => {
  const { target } = fixture(t);
  const before = fs.readFileSync(target);
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile: profile({ adoptedRepositoryHead: GIT('9') }),
    faultInjector: point => point === 'before_rename'
  });
  assert.equal(result.classification, 'NOT_COMMITTED');
  assert.equal(result.mutated, false);
  assert.deepEqual(fs.readFileSync(target), before);
});

test('after-rename exact new state converges through exact retry', t => {
  const { target } = fixture(t);
  const nextProfile = profile({ adoptedRepositoryHead: GIT('9') });
  const options = {
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile,
    faultInjector: point => point === 'after_rename'
  };
  const first = commitOwnerProfileTransaction(options);
  const second = commitOwnerProfileTransaction({
    ...options,
    faultInjector: undefined
  });
  assert.equal(first.classification, 'COMMITTED_WITH_UNCERTAIN_DURABILITY');
  assert.equal(first.committedProfileMatchesNext, true);
  assert.equal(second.classification, 'ALREADY_COMMITTED');
  assert.equal(second.mutated, false);
});

test('read-back valid neither-old-nor-new fails closed as stale conflict', t => {
  const { target } = fixture(t);
  const unexpected = profile({ adoptedRepositoryHead: GIT('c') });
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile: profile({ adoptedRepositoryHead: GIT('9') }),
    faultInjector: point => {
      if (point === 'after_rename') writeProfile(target, unexpected, 0);
    }
  });
  assert.equal(result.classification, 'STALE_CURRENT');
  assert.equal(result.mutated, false);
  assert.equal(result.readBackFingerprint, canonicalProfileFingerprint(unexpected));
});

test('read-back invalid after rename returns commit result unknown', t => {
  const { target } = fixture(t);
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile: profile({ adoptedRepositoryHead: GIT('9') }),
    faultInjector: point => {
      if (point === 'after_rename') fs.writeFileSync(target, '{broken');
    }
  });
  assert.equal(result.classification, 'COMMIT_RESULT_UNKNOWN');
  assert.equal(result.mutated, null);
  assert.equal(result.durabilityConfirmed, false);
});

test('orphan temp files are not read as authority or cleaned by P1', t => {
  const { directory, target } = fixture(t);
  const orphan = path.join(directory, '.full-stack-control.json.orphan.tmp');
  writeProfile(orphan, profile({ adoptedRepositoryHead: GIT('c') }), 0);
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile: profile({ adoptedRepositoryHead: GIT('9') })
  });
  assert.equal(result.classification, 'COMMITTED');
  assert.equal(fs.existsSync(orphan), true);
});

test('schema v4/v5 transaction candidates are rejected without changing reads', t => {
  const { target } = fixture(t);
  const before = fs.readFileSync(target);
  assert.throws(
    () => commitOwnerProfileTransaction({
      profilePath: target,
      expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
      nextProfile: v5Profile()
    }),
    { code: 'owner_profile_transaction_schema_unsupported' }
  );
  assert.deepEqual(fs.readFileSync(target), before);
  assert.equal(Object.keys(v5Profile()).sort().join(','), [...V5_PROFILE_KEYS].sort().join(','));
});

test('schema v4/v5 current profiles fail closed for transaction only', t => {
  const current = v5Profile();
  const { target } = fixture(t, current);
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(current),
    nextProfile: profile({ adoptedRepositoryHead: GIT('9') })
  });
  assert.equal(result.classification, 'INVALID_CURRENT');
  assert.equal(result.errorCode, 'owner_profile_transaction_schema_unsupported');
  assert.equal(result.mutated, false);
});

test('fault points are internal and lifecycle callers remain unwired', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'scripts', 'codex-memory-stack.js'),
    'utf8'
  );
  const primitive = fs.readFileSync(
    path.join(__dirname, '..', 'scripts', 'codex-memory-owner-profile-transaction.js'),
    'utf8'
  );
  assert.equal(source.includes('codex-memory-owner-profile-transaction'), false);
  assert.equal(primitive.includes('transitionRecordStore'), false);
  assert.equal(primitive.includes('Observer'), false);
  assert.equal(primitive.includes('journal'), false);
  assert.equal(primitive.includes('faultInjector'), true);
});

test('fault injection before temp write leaves target unchanged', t => {
  const { target } = fixture(t);
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile: profile({ adoptedRepositoryHead: GIT('9') }),
    faultInjector: point => point === 'before_temp_write'
  });
  assert.equal(result.classification, 'NOT_COMMITTED');
  assert.equal(result.mutated, false);
});

test('fault injection after temp fsync leaves target unchanged', t => {
  const { target } = fixture(t);
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile: profile({ adoptedRepositoryHead: GIT('9') }),
    faultInjector: point => point === 'after_temp_fsync'
  });
  assert.equal(result.classification, 'NOT_COMMITTED');
  assert.equal(result.mutated, false);
});

test('read-back fault after rename returns unknown without rewriting', t => {
  const { target } = fixture(t);
  const nextProfile = profile({ adoptedRepositoryHead: GIT('9') });
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile,
    faultInjector: point => point === 'readback'
  });
  assert.equal(result.classification, 'COMMIT_RESULT_UNKNOWN');
  assert.equal(result.mutated, null);
  assert.equal(JSON.parse(fs.readFileSync(target, 'utf8')).adoptedRepositoryHead, nextProfile.adoptedRepositoryHead);
});

test('invalid next profile is rejected before any target mutation', t => {
  const { target } = fixture(t);
  const before = fs.readFileSync(target);
  assert.throws(
    () => commitOwnerProfileTransaction({
      profilePath: target,
      expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
      nextProfile: { ...profile(), unexpected: true }
    }),
    { code: 'owner_profile_next_invalid' }
  );
  assert.deepEqual(fs.readFileSync(target), before);
});

test('missing target is invalid and does not create a profile', t => {
  const { directory } = fixture(t);
  const target = path.join(directory, 'missing.json');
  const result = commitOwnerProfileTransaction({
    profilePath: target,
    expectedCurrentFingerprint: canonicalProfileFingerprint(profile()),
    nextProfile: profile({ adoptedRepositoryHead: GIT('9') })
  });
  assert.equal(result.classification, 'INVALID_CURRENT');
  assert.equal(fs.existsSync(target), false);
});

test('sha256 fingerprint output never includes profile payload or path', () => {
  const fingerprint = canonicalProfileFingerprint(profile());
  assert.match(fingerprint, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(fingerprint.includes('/synthetic'), false);
  assert.equal(fingerprint.includes('runtimeRepository'), false);
  assert.equal(fingerprint.length, 'sha256:'.length + 64);
});

test('fingerprint implementation uses SHA-256 semantics', () => {
  const current = profile();
  const canonical = JSON.stringify(
    Object.fromEntries(Object.keys(current).sort().map(key => [key, current[key]]))
  );
  const expected = `sha256:${crypto.createHash('sha256').update(canonical).digest('hex')}`;
  assert.equal(canonicalProfileFingerprint(current), expected);
});
