'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { execFileSync } = require('node:child_process');

const { realGitResolver } = require('../scripts/verify-frozen-evidence-manifest');
const {
  buildVcpSelectedDiarySourceIdentity,
  verifyVcpSelectedDiarySourceIdentity
} = require('../src/core/VcpSelectedDiarySourceIdentity');

function git(root, args, options = {}) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  }).trim();
}

function repository(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-frozen-git-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, ['init', '--quiet']);
  git(root, ['config', 'user.email', 'synthetic@example.invalid']);
  git(root, ['config', 'user.name', 'Synthetic Evidence']);
  fs.writeFileSync(path.join(root, 'evidence.txt'), 'synthetic evidence\n');
  git(root, ['add', 'evidence.txt']);
  git(root, ['commit', '--quiet', '-m', 'synthetic evidence']);
  return {
    root,
    commit: git(root, ['rev-parse', 'HEAD']),
    blob: git(root, ['rev-parse', 'HEAD:evidence.txt'])
  };
}

test('frozen Git resolver rejects replace refs before resolving evidence', t => {
  const fixture = repository(t);
  const directory = path.join(fixture.root, '.git', 'refs', 'replace');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, fixture.commit), `${fixture.commit}\n`);
  assert.throws(() => realGitResolver(fixture.root), /replace_refs_forbidden/);
});

test('frozen Git resolver rejects grafts and alternates', async t => {
  await t.test('grafts', t => {
    const fixture = repository(t);
    const info = path.join(fixture.root, '.git', 'info');
    fs.mkdirSync(info, { recursive: true });
    fs.writeFileSync(path.join(info, 'grafts'), `${fixture.commit}\n`);
    assert.throws(() => realGitResolver(fixture.root), /grafts_forbidden/);
  });
  await t.test('alternates', t => {
    const fixture = repository(t);
    const info = path.join(fixture.root, '.git', 'objects', 'info');
    fs.mkdirSync(info, { recursive: true });
    fs.writeFileSync(path.join(info, 'alternates'), '/tmp/untrusted-objects\n');
    assert.throws(() => realGitResolver(fixture.root), /alternates_forbidden/);
  });
});

test('frozen Git resolver enforces SHA-40 and Git object types', t => {
  const fixture = repository(t);
  const resolver = realGitResolver(fixture.root);
  assert.throws(() => resolver.resolveCommit('HEAD'), /commit_must_be_sha40/);
  assert.throws(() => resolver.resolveCommit(fixture.blob), /commit_object_type_mismatch/);
  assert.equal(resolver.resolveCommit(fixture.commit).commit, fixture.commit);
});

test('frozen Git resolver rejects a separate untrusted common directory', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-frozen-common-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const worktree = path.join(root, 'worktree');
  const common = path.join(root, 'external-git-dir');
  fs.mkdirSync(worktree);
  execFileSync('git', ['init', '--quiet', '--separate-git-dir', common, worktree]);
  assert.throws(() => realGitResolver(worktree), /untrusted_git_common_dir/);
});

test('VCP source identity is derived from and reverified against exact Git objects', t => {
  const fixture = repository(t);
  fs.writeFileSync(path.join(fixture.root, 'KnowledgeBaseManager.js'), [
    "'use strict';",
    'module.exports = { search(diaries, vector, limit, threshold, tags) {',
    '  return { diaries, vector, limit, threshold, tags };',
    '} };',
    ''
  ].join('\n'));
  git(fixture.root, ['add', 'KnowledgeBaseManager.js']);
  git(fixture.root, ['commit', '--quiet', '-m', 'synthetic selected diary capability']);
  const commit = git(fixture.root, ['rev-parse', 'HEAD']);
  const resolver = realGitResolver(fixture.root);
  const resolvedCommit = resolver.resolveCommit(commit);
  const source = resolver.resolveGitFile(commit, 'KnowledgeBaseManager.js');
  const manifest = buildVcpSelectedDiarySourceIdentity({
    commit,
    tree: resolvedCommit.tree,
    source
  });
  const result = verifyVcpSelectedDiarySourceIdentity(manifest, resolver);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.selectedDiaryCapabilityBound, true);
});
