'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const freeze = require('../scripts/freeze-cm2128-branch-cas-receipts');
const review = require('../scripts/review-cm2129-branch-cas-receipts');

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function withTempDirectory(callback) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2128-receipts-'));
  try {
    return callback(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('CM-2128 and CM-2129 accept no arguments and expose only fixed relative output paths', () => {
  assert.equal(freeze.parseArgs([]), undefined);
  assert.equal(review.parseArgs([]), undefined);
  for (const argv of [
    ['--output', 'alternate.json'],
    ['--claim', 'alternate.json'],
    ['positional']
  ]) {
    assert.throws(() => freeze.parseArgs(argv), /cm2128_freeze_no_arguments_allowed/);
    assert.throws(() => review.parseArgs(argv), /cm2129_review_no_arguments_allowed/);
  }

  const outputs = [
    ...Object.values(freeze.OUTPUTS),
    review.REVIEW_PATH,
    review.REVIEW_MARKDOWN_PATH
  ];
  assert.equal(new Set(outputs).size, 6);
  for (const output of outputs) {
    assert.equal(path.isAbsolute(output), false);
    assert.equal(output.includes('..'), false);
    assert.ok(output.startsWith('docs/near-model-memory-plan-pack/'));
  }
  assert.deepEqual(review.FREEZE_DIFF_PATHS, Object.values(freeze.OUTPUTS).sort());
  assert.deepEqual(freeze.IMPLEMENTATION_DIFF_PATHS, [
    'scripts/freeze-cm2128-branch-cas-receipts.js',
    'scripts/review-cm2129-branch-cas-receipts.js',
    'tests/cm2128-cm2129-branch-cas-receipts.test.js'
  ]);
  assert.deepEqual(
    review.FREEZE_DIFF_ENTRIES,
    review.FREEZE_DIFF_PATHS.map(output => ({ status: 'A', path: output }))
  );
});

test('CM-2128 low-disclosure scanner accepts bounded metadata and rejects nested paths or secret-shaped strings', () => {
  assert.equal(freeze.assertLowDisclosure({
    commit: 'a'.repeat(40),
    sha256: 'b'.repeat(64),
    nested: [{ targetRef: 'refs/heads/codex/example' }]
  }), true);

  for (const unsafe of [
    { nested: [{ path: path.join('/home', 'jenn', 'private') }] },
    { nested: [{ path: '/workspace/codex-memory/private' }] },
    { nested: [{ path: '/root/private' }] },
    { nested: [{ path: '/opt/private' }] },
    { nested: { path: 'C:\\Users\\Example\\private' } },
    { nested: { path: '../private/receipt.json' } },
    { nested: { path: '..\\private\\receipt.json' } },
    { nested: { path: '.git/worktrees/private/index' } },
    { nested: { path: '.git\\config' } },
    { nested: { path: '\\\\server\\share\\secret' } },
    { nested: { path: 'data/private-memory.jsonl' } },
    { nested: { path: 'data\\private-memory.jsonl' } },
    { nested: { path: 'logs/private-audit.jsonl' } },
    { nested: { credential: `sk-${'x'.repeat(20)}` } },
    { nested: { authorization: `Bearer ${'x'.repeat(20)}` } },
    { nested: { privateKey: `BEGIN ${'PRIVATE'} KEY` } },
    { nested: { ['/home/jenn/private/receipt.json']: 'safe-value' } },
    { nested: { [`Bearer ${'x'.repeat(20)}`]: 'safe-value' } },
    { nested: { [`sk-${'x'.repeat(20)}`]: 'safe-value' } }
  ]) {
    assert.throws(
      () => freeze.assertLowDisclosure(unsafe),
      /cm2128_low_disclosure_string_boundary_failed/
    );
  }
});

test('CM-2128 clean-detached check forces untracked-file reporting despite Git config', () => {
  withTempDirectory(directory => {
    const git = args => execFileSync('git', args, {
      cwd: directory,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
    execFileSync('git', ['init', '--quiet'], { cwd: directory, stdio: 'ignore' });
    git(['config', 'user.email', 'cm2128@example.invalid']);
    git(['config', 'user.name', 'CM-2128 Test']);
    fs.writeFileSync(path.join(directory, 'tracked.txt'), 'tracked\n');
    git(['add', 'tracked.txt']);
    git(['commit', '--quiet', '-m', 'fixture']);
    git(['checkout', '--quiet', '--detach']);
    git(['config', 'status.showUntrackedFiles', 'no']);
    fs.writeFileSync(path.join(directory, 'untracked-sentinel.txt'), 'untracked\n');

    assert.equal(git(['status', '--porcelain']), '');
    assert.throws(
      () => freeze.assertCleanDetachedWorktree(git),
      /cm2128_clean_detached_worktree_required/
    );

    fs.rmSync(path.join(directory, 'untracked-sentinel.txt'));
    assert.doesNotThrow(() => freeze.assertCleanDetachedWorktree(git));
  });
});

test('CM-2128 exact JSON reader binds file shape, raw bytes, and SHA-256 and fails closed on drift', () => {
  withTempDirectory(directory => {
    const file = path.join(directory, 'receipt.json');
    const bytes = Buffer.from('{"accepted":true,"count":1}\n', 'utf8');
    fs.writeFileSync(file, bytes);
    const expected = { bytes: bytes.length, sha256: sha256(bytes) };

    const exact = freeze.readExactJson(file, expected, 'fixture');
    assert.ok(exact.bytes.equals(bytes));
    assert.deepEqual(exact.value, { accepted: true, count: 1 });

    assert.throws(
      () => freeze.readExactJson(file, { ...expected, bytes: expected.bytes + 1 }, 'fixture'),
      /cm2128_fixture_identity_mismatch/
    );
    assert.throws(
      () => freeze.readExactJson(file, { ...expected, sha256: '0'.repeat(64) }, 'fixture'),
      /cm2128_fixture_identity_mismatch/
    );

    const changed = Buffer.from('{"accepted":true,"count":2}\n', 'utf8');
    fs.writeFileSync(file, changed);
    assert.throws(
      () => freeze.readExactJson(file, expected, 'fixture'),
      /cm2128_fixture_identity_mismatch/
    );
  });
});

test('CM-2128 exact JSON reader rejects symlinks and low-disclosure drift', () => {
  withTempDirectory(directory => {
    const target = path.join(directory, 'target.json');
    const link = path.join(directory, 'link.json');
    const bytes = Buffer.from('{"accepted":true}\n', 'utf8');
    fs.writeFileSync(target, bytes);
    fs.symlinkSync(target, link);
    const expected = { bytes: bytes.length, sha256: sha256(bytes) };
    assert.throws(
      () => freeze.readExactJson(link, expected, 'fixture'),
      /cm2128_fixture_source_invalid/
    );

    const unsafe = Buffer.from(JSON.stringify({ path: path.join('/home', 'jenn', 'private') }), 'utf8');
    fs.writeFileSync(target, unsafe);
    assert.throws(
      () => freeze.readExactJson(target, { bytes: unsafe.length, sha256: sha256(unsafe) }, 'fixture'),
      /cm2128_low_disclosure_string_boundary_failed/
    );
  });
});

test('CM-2128 verified reader rejects descriptor identity swaps before reading bytes', () => {
  let readCalls = 0;
  let closeCalls = 0;
  const pathStat = {
    dev: 1,
    ino: 2,
    isFile: () => true,
    isSymbolicLink: () => false
  };
  const fileSystem = {
    lstatSync: () => pathStat,
    openSync: () => 17,
    fstatSync: () => ({ ...pathStat, ino: 3, isFile: () => true }),
    readFileSync: () => { readCalls += 1; return Buffer.from('{}'); },
    closeSync: () => { closeCalls += 1; }
  };

  assert.throws(
    () => freeze.readVerifiedFileSync('/fixed/receipt.json', 'fixture', fileSystem),
    /cm2128_fixture_source_invalid/
  );
  assert.equal(readCalls, 0);
  assert.equal(closeCalls, 1);
});

test('CM-2129 live governance reader rejects symlinks before reading receipt bytes', () => {
  withTempDirectory(directory => {
    const target = path.join(directory, 'target.json');
    const link = path.join(directory, 'live-receipt.json');
    fs.writeFileSync(target, '{"accepted":true}\n');
    fs.symlinkSync(target, link);

    assert.throws(
      () => review.readLiveGovernanceFile(link, 'execution_receipt'),
      /cm2129_live_governance_file_invalid:execution_receipt/
    );
  });
});

test('CM-2128 receipt identity deterministically binds bytes, blob OID, raw hash, and canonical payload hash', () => {
  const bytes = Buffer.from('{"artifactType":"fixture_receipt_v1","canonicalPayloadSha256":"' +
    `${'a'.repeat(64)}"}\n`, 'utf8');
  const identity = freeze.receiptIdentity(
    freeze.OUTPUTS.execution,
    'source-receipt.json',
    {
      bytes,
      value: JSON.parse(bytes.toString('utf8'))
    }
  );
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');

  assert.deepEqual(identity, {
    sourceFilename: 'source-receipt.json',
    outputPath: freeze.OUTPUTS.execution,
    gitMode: '100644',
    blobOid: crypto.createHash('sha1').update(header).update(bytes).digest('hex'),
    bytes: bytes.length,
    sha256: sha256(bytes),
    artifactType: 'fixture_receipt_v1',
    canonicalPayloadSha256: 'a'.repeat(64)
  });
});

test('CM-2128 and CM-2129 Markdown renderers preserve an exact JSON mirror and non-authority boundary', () => {
  const manifest = {
    canonicalPayloadSha256: 'a'.repeat(64),
    payload: { freezeReference: 'CM-2128-TEST' }
  };
  const manifestJson = `${JSON.stringify(manifest)}\n`;
  const manifestMarkdown = freeze.renderMarkdown(manifest, manifestJson);
  assert.match(manifestMarkdown, /CM-2128 Branch CAS Receipt Freeze Manifest/);
  assert.match(manifestMarkdown, /does\s+not replay the authorization/);
  assert.ok(manifestMarkdown.includes(manifestJson.trimEnd()));

  const receiptReview = {
    canonicalPayloadSha256: 'b'.repeat(64),
    payload: { reviewReference: 'CM-2129-TEST' }
  };
  const reviewJson = `${JSON.stringify(receiptReview)}\n`;
  const reviewMarkdown = review.renderMarkdown(receiptReview, reviewJson);
  assert.match(reviewMarkdown, /Result: PASS/);
  assert.match(reviewMarkdown, /grants no replay, ref, remote, native-memory/);
  assert.ok(reviewMarkdown.includes(reviewJson.trimEnd()));
});

test('receipt freeze and review scripts statically exclude executor, ref-update, remote, and alternate-output entry points', () => {
  const freezeSource = source('scripts/freeze-cm2128-branch-cas-receipts.js');
  const reviewSource = source('scripts/review-cm2129-branch-cas-receipts.js');
  for (const scriptSource of [freezeSource, reviewSource]) {
    assert.doesNotMatch(scriptSource, /require\(['"]node:child_process['"]\)/);
    assert.doesNotMatch(scriptSource, /require\(['"]\.\.\/src\/cli\//);
    assert.doesNotMatch(scriptSource, /executeBranchCasFromCommits/);
    assert.doesNotMatch(scriptSource, /(?:^|\s)(?:git\s+)?update-ref(?:\s|$)/m);
    assert.doesNotMatch(scriptSource, /(?:^|\s)(?:git\s+)?push(?:\s|$)/m);
    assert.doesNotMatch(scriptSource, /--output|--claim|--receipt/);
  }
  assert.match(freezeSource, /--untracked-files=all/);
  assert.match(reviewSource, /assertCleanDetachedWorktree\(\)/);

  const freezeWrites = [...freezeSource.matchAll(/fs\.writeFileSync\(([^,]+),/g)]
    .map(match => match[1].trim());
  const reviewWrites = [...reviewSource.matchAll(/fs\.writeFileSync\(([^,]+),/g)]
    .map(match => match[1].trim());
  assert.deepEqual(freezeWrites, [
    'OUTPUTS.claim',
    'OUTPUTS.execution',
    'OUTPUTS.manifest',
    'OUTPUTS.markdown'
  ]);
  assert.deepEqual(reviewWrites, ['REVIEW_PATH', 'REVIEW_MARKDOWN_PATH']);
  assert.equal((freezeSource.match(/flag:\s*'wx'/g) || []).length, 4);
  assert.equal((reviewSource.match(/flag:\s*'wx'/g) || []).length, 2);
});

test('frozen raw identities and commit bindings are exact constants and fail closed under local comparison drift', () => {
  assert.match(freeze.CONTENT_COMMIT, /^[a-f0-9]{40}$/);
  assert.match(freeze.PACKET_COMMIT, /^[a-f0-9]{40}$/);
  assert.match(freeze.FINAL_RELEASE_COMMIT, /^[a-f0-9]{40}$/);
  assert.match(freeze.FINAL_RELEASE_TREE, /^[a-f0-9]{40}$/);
  assert.match(freeze.EXPECTED.claim.sha256, /^[a-f0-9]{64}$/);
  assert.match(freeze.EXPECTED.execution.sha256, /^[a-f0-9]{64}$/);
  assert.match(freeze.EXPECTED.execution.canonicalPayloadSha256, /^[a-f0-9]{64}$/);
  assert.equal(freeze.EXPECTED.claim.bytes, 1645);
  assert.equal(freeze.EXPECTED.execution.bytes, 25430);

  const expectedClaim = { ...freeze.EXPECTED.claim };
  const driftedClaim = { ...expectedClaim, sha256: '0'.repeat(64) };
  assert.notDeepEqual(driftedClaim, expectedClaim);
  const expectedExecution = { ...freeze.EXPECTED.execution };
  const driftedExecution = { ...expectedExecution, bytes: expectedExecution.bytes + 1 };
  assert.notDeepEqual(driftedExecution, expectedExecution);
});
