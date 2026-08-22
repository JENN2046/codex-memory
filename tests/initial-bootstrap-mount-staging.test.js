'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  buildDockerCreateArguments
} = require('../src/runtime/native-image/container-plan');
const {
  PLACEHOLDER_SCHEMA,
  RECEIPT_PLACEHOLDER_SCHEMA,
  stage,
  materialize,
  parse
} = require('../host-bootstrap/prepare-initial-runtime-mounts');
const {
  AUTHORITY_RECORD_PATH,
  EDGE_RECEIPT_PATH,
  PROVIDER_RECEIPT_PATH,
  validateAuthorityRecord,
  validateImageProfile
} = require('../src/runtime/native-image/runtime-authority');

const GENERATION = 'b93a9a5bf0151eb07003f2f2ddc752a9df500030';

function fixtureRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'initial-bootstrap-staging-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function options(root) {
  const uid = typeof process.getuid === 'function' ? process.getuid() : 0;
  const gid = typeof process.getgid === 'function' ? process.getgid() : 0;
  const receipts = path.join(root, 'run');
  fs.mkdirSync(receipts, { recursive: true, mode: 0o700 });
  fs.chmodSync(receipts, 0o700);
  const authorityParent = path.join(root, 'authority');
  fs.mkdirSync(authorityParent, { recursive: true, mode: 0o700 });
  fs.chmodSync(authorityParent, 0o700);
  return {
    generation: GENERATION,
    canonicalBase: path.join(root, 'authority'),
    root: path.join(root, 'authority', GENERATION),
    uid,
    gid,
    requireRoot: false,
    edgeReceiptPath: path.join(receipts, 'edge-receipt.json'),
    providerReceiptPath: path.join(receipts, 'provider-receipt.json')
  };
}

function expectCode(fn, code) {
  assert.throws(fn, error => error?.code === code);
}

test('stage creates secure generation placeholders and canonical receipt placeholders', t => {
  const root = fixtureRoot(t);
  const opts = options(root);
  const result = stage(opts);
  assert.equal(result.generation, GENERATION);
  assert.equal(result.authoritySource.status, 'created');
  assert.equal(result.profileSource.status, 'created');
  assert.equal(result.edgeReceiptSource.status, 'created_placeholder_not_fresh');
  assert.equal(result.providerReceiptSource.status, 'created_placeholder_not_fresh');
  assert.equal(result.freshEdgeReceipt, false);
  assert.equal(result.freshProviderReceipt, false);
  assert.equal(result.runtimeCreated, false);
  assert.equal(result.runtimeStarted, false);
  assert.equal(result.secretValuesReturned, false);

  const authority = JSON.parse(fs.readFileSync(result.authoritySource.path, 'utf8'));
  const profile = JSON.parse(fs.readFileSync(result.profileSource.path, 'utf8'));
  const edgeReceipt = JSON.parse(fs.readFileSync(result.edgeReceiptSource.path, 'utf8'));
  const providerReceipt = JSON.parse(fs.readFileSync(result.providerReceiptSource.path, 'utf8'));
  assert.deepEqual(authority, {
    generation: GENERATION, placeholder: true, role: 'authority',
    schemaVersion: PLACEHOLDER_SCHEMA
  });
  assert.deepEqual(profile, {
    generation: GENERATION, placeholder: true, role: 'profile',
    schemaVersion: PLACEHOLDER_SCHEMA
  });
  assert.equal(edgeReceipt.schemaVersion, RECEIPT_PLACEHOLDER_SCHEMA);
  assert.equal(providerReceipt.schemaVersion, RECEIPT_PLACEHOLDER_SCHEMA);

  for (const file of [result.authoritySource.path, result.profileSource.path,
    result.edgeReceiptSource.path, result.providerReceiptSource.path]) {
    const stat = fs.lstatSync(file);
    assert.equal(stat.isSymbolicLink(), false);
    assert.equal(stat.uid, opts.uid);
    assert.equal(stat.gid, opts.gid);
    assert.equal(stat.mode & 0o777, 0o644);
  }
  assert.equal(fs.lstatSync(opts.root).mode & 0o777, 0o700);
});

test('stage is idempotent for exact placeholders and rejects foreign contents', t => {
  const root = fixtureRoot(t);
  const opts = options(root);
  const first = stage(opts);
  const second = stage(opts);
  assert.equal(second.authoritySource.status, 'preserved');
  assert.equal(second.profileSource.status, 'preserved');
  assert.equal(second.edgeReceiptSource.status, 'preserved_not_fresh');
  assert.equal(second.providerReceiptSource.status, 'preserved_not_fresh');

  fs.writeFileSync(first.authoritySource.path, '{"placeholder":true}\n');
  fs.chmodSync(first.authoritySource.path, 0o644);
  expectCode(() => stage(opts), 'bootstrap_staging_source_conflict');
});

test('stage rejects symlinked and insecure pre-existing sources', t => {
  const root = fixtureRoot(t);
  const opts = options(root);
  stage(opts);
  const target = path.join(root, 'target.json');
  fs.writeFileSync(target, '{"placeholder":true}\n', { mode: 0o644 });
  fs.unlinkSync(path.join(opts.root, 'profile-v7.json'));
  fs.symlinkSync(target, path.join(opts.root, 'profile-v7.json'));
  expectCode(() => stage(opts), 'bootstrap_staging_source_unsafe');
});

test('stage confines root to canonical base and rejects wrong-generation roots', t => {
  const root = fixtureRoot(t);
  const opts = options(root);
  expectCode(() => stage({ ...opts, root: path.join(root, 'other', GENERATION) }),
    'initial_bootstrap_generation_root_mismatch');
  const wrong = path.join(root, 'authority', 'other-generation');
  fs.mkdirSync(wrong, { recursive: true, mode: 0o700 });
  fs.chmodSync(wrong, 0o700);
  expectCode(() => stage({ ...opts, root: wrong }),
    'initial_bootstrap_generation_root_mismatch');
});

test('stage rejects a pre-existing symlink canonical base and does not chmod repair it', t => {
  const root = fixtureRoot(t);
  const real = path.join(root, 'real-authority');
  fs.mkdirSync(real, { mode: 0o755 });
  fs.chmodSync(real, 0o755);
  const base = path.join(root, 'authority');
  fs.symlinkSync(real, base);
  const before = fs.lstatSync(base);
  expectCode(() => stage({ ...options(root), canonicalBase: base,
    root: path.join(base, GENERATION) }), 'bootstrap_staging_root_unsafe');
  const after = fs.lstatSync(base);
  assert.equal(after.isSymbolicLink(), true);
  assert.equal(after.ino, before.ino);
});

test('stage rejects an existing unsafe canonical base without changing its mode', t => {
  const root = fixtureRoot(t);
  const opts = options(root);
  const base = path.join(root, 'unsafe-authority');
  fs.mkdirSync(base, { mode: 0o777 });
  fs.chmodSync(base, 0o777);
  expectCode(() => stage({ ...opts, canonicalBase: base,
    root: path.join(base, GENERATION) }), 'bootstrap_staging_root_unsafe');
  assert.equal(fs.lstatSync(base).mode & 0o777, 0o777);
  assert.equal(fs.existsSync(path.join(base, GENERATION)), false);
});

test('staging placeholders fail production authority/profile validation', t => {
  const root = fixtureRoot(t);
  const opts = options(root);
  const result = stage(opts);
  const authority = JSON.parse(fs.readFileSync(result.authoritySource.path));
  const profile = JSON.parse(fs.readFileSync(result.profileSource.path));
  expectCode(() => validateAuthorityRecord(authority), 'runtime_authority_record_invalid');
  expectCode(() => validateImageProfile(profile), 'runtime_image_profile_invalid');
  assert.equal(JSON.parse(fs.readFileSync(result.edgeReceiptSource.path)).placeholder, true);
  assert.equal(JSON.parse(fs.readFileSync(result.providerReceiptSource.path)).placeholder, true);
});

test('staged paths are accepted by the canonical stopped Runtime container plan', t => {
  const root = fixtureRoot(t);
  const opts = options(root);
  const result = stage(opts);
  const args = buildDockerCreateArguments({
    authoritySource: result.authoritySource.path,
    edgeReceiptSource: result.edgeReceiptSource.path,
    imageConfigId: 'sha256:' + 'b'.repeat(64),
    name: 'codex-memory-runtime-b93a9a5b',
    primaryStateSource: path.join(root, 'state'),
    primaryStateDestination: '/srv/codex-memory/r5c',
    profileSource: result.profileSource.path,
    providerReceiptSource: result.providerReceiptSource.path,
    providerEnvironmentSource: '/etc/codex-memory/vcp-provider.env',
    runtimeDirectorySource: path.join(root, 'runtime')
  });
  assert.equal(args.includes('container'), true);
  assert.equal(args.some(value => value.includes(`src=${result.authoritySource.path}`) &&
    value.includes(`dst=${AUTHORITY_RECORD_PATH}`)), true);
  assert.equal(args.some(value => value.includes(`src=${result.edgeReceiptSource.path}`) &&
    value.includes(`dst=${EDGE_RECEIPT_PATH}`)), true);
  assert.equal(args.some(value => value.includes(`src=${result.providerReceiptSource.path}`) &&
    value.includes(`dst=${PROVIDER_RECEIPT_PATH}`)), true);
  assert.equal(args.some(value => value.includes('/var/run/docker.sock')), false);
});

test('materialize rejects malformed, injected, and non-candidate inputs before writes', t => {
  const root = fixtureRoot(t);
  const opts = options(root);
  const staged = stage(opts);
  const candidate = path.join(root, 'candidate.json');
  fs.writeFileSync(candidate, JSON.stringify({ authority: {}, profile: {}, profileSha256: 'x' }), {
    mode: 0o600
  });
  expectCode(() => materialize({ ...opts, candidate }),
    'runtime_authority_record_invalid');
  assert.deepEqual(JSON.parse(fs.readFileSync(staged.authoritySource.path)), {
    generation: GENERATION, placeholder: true, role: 'authority',
    schemaVersion: PLACEHOLDER_SCHEMA
  });
});

test('materialize rejects mismatched partial final state and preserves staged files', t => {
  const root = fixtureRoot(t);
  const opts = options(root);
  const staged = stage(opts);
  fs.writeFileSync(staged.authoritySource.path, JSON.stringify({
    authoritySchemaVersion: 'codex-memory-runtime-authority/v1',
    codexMemoryCommit: GENERATION
  }), { mode: 0o644 });
  fs.chmodSync(staged.authoritySource.path, 0o644);
  const candidate = path.join(root, 'candidate.json');
  fs.writeFileSync(candidate, JSON.stringify({ authority: {}, profile: {}, profileSha256: 'x' }), {
    mode: 0o600
  });
  expectCode(() => materialize({ ...opts, candidate }), 'runtime_authority_record_invalid');
  assert.equal(fs.readFileSync(staged.profileSource.path, 'utf8').includes('placeholder'), true);
});

test('materialize leaves no temporary staging debris when a commit step fails', t => {
  const root = fixtureRoot(t);
  const opts = options(root);
  const staged = stage(opts);
  const candidate = path.join(root, 'candidate.json');
  fs.writeFileSync(candidate, JSON.stringify({
    authority: { authoritySchemaVersion: 'codex-memory-runtime-authority/v1' },
    profile: {},
    profileSha256: 'sha256:' + '0'.repeat(64)
  }), { mode: 0o600 });
  expectCode(() => materialize({ ...opts, candidate }), 'runtime_authority_record_invalid');
  const entries = fs.readdirSync(path.dirname(staged.authoritySource.path));
  assert.deepEqual(entries.filter(name => name.endsWith('.tmp')), []);
  assert.deepEqual(entries.sort(), ['profile-v7.json', 'runtime-authority.json']);
});

test('production stage requires root privilege', t => {
  const root = fixtureRoot(t);
  const opts = options(root);
  if (typeof process.getuid === 'function' && process.getuid() !== 0) {
    expectCode(() => stage({ ...opts, requireRoot: true }), 'initial_bootstrap_root_required');
  } else {
    assert.doesNotThrow(() => stage({ ...opts, requireRoot: false }));
  }
});

test('CLI parser accepts stage and materialize commands without changing production schemas', () => {
  assert.deepEqual(parse(['stage', '--generation=' + GENERATION, '--root=/etc/codex-memory/bootstrap']), {
    _: 'stage', generation: GENERATION, root: '/etc/codex-memory/bootstrap'
  });
  assert.deepEqual(parse(['materialize', '--generation=' + GENERATION, '--candidate=/run/candidate']), {
    _: 'materialize', generation: GENERATION, candidate: '/run/candidate'
  });
});
