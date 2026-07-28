'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  MANIFEST_RELATIVE_PATH,
  REQUIRED_PATHS,
  computeManifestDigest,
  discoverManifestFiles,
  inspectControllerSourceManifest,
  loadManifest,
  readStableRegularFile,
  validateManifest
} = require('../scripts/codex-memory-controller-source-manifest');

const REPO_ROOT = path.resolve(__dirname, '..');

function write(root, relative, body, mode = 0o644) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, { mode });
}

function syntheticManifest() {
  return {
    schemaVersion: 1,
    paths: [...REQUIRED_PATHS]
  };
}

function createSyntheticRepository(t) {
  const root = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'codex-memory-controller-manifest-'
  ));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'package-lock.json', '{"lockfileVersion":3}\n');
  write(root, 'package.json', '{"type":"commonjs"}\n');
  write(
    root,
    MANIFEST_RELATIVE_PATH,
    `${JSON.stringify(syntheticManifest(), null, 2)}\n`
  );
  write(
    root,
    'scripts/codex-memory-controller-source-manifest.js',
    "'use strict';\n"
  );
  write(
    root,
    'scripts/codex-memory-stack.js',
    "'use strict';\n"
  );
  write(root, 'apps/local-recall-relay/index.js', "'use strict';\n");
  write(root, 'packages/chatgpt-r4-contracts/index.js', "'use strict';\n");
  write(root, 'src/index.js', "'use strict';\n");
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], {
    cwd: root
  });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: root });
  execFileSync('git', ['add', '--', ...REQUIRED_PATHS], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: root });
  return root;
}

test('checked-in controller manifest covers the fixed broad runtime source roots', () => {
  const manifest = loadManifest({ repoRoot: REPO_ROOT });
  const discovered = discoverManifestFiles(manifest, {
    repoRoot: REPO_ROOT
  });
  assert.deepEqual(manifest.paths, REQUIRED_PATHS);
  assert.ok(discovered.includes('scripts/codex-memory-stack.js'));
  assert.ok(discovered.includes('src/http-index.js'));
  assert.ok(discovered.includes(
    'apps/local-recall-relay/outbound-main.js'
  ));
  assert.ok(discovered.includes('package-lock.json'));
  assert.equal(
    discovered.some(file => file === 'CURRENT_STATE.md'),
    false
  );
  assert.ok(discovered.length > 500);
});

test('manifest shape rejects unknown keys, unordered paths, traversal, and path drift', () => {
  const manifest = syntheticManifest();
  assert.deepEqual(validateManifest(manifest).paths, REQUIRED_PATHS);
  for (const changed of [
    { ...manifest, extra: true },
    { ...manifest, paths: [...manifest.paths].reverse() },
    { ...manifest, paths: [...manifest.paths, '../outside.js'].sort() },
    { ...manifest, paths: manifest.paths.slice(1) },
    { ...manifest, schemaVersion: 2 }
  ]) {
    assert.throws(
      () => validateManifest(changed),
      { code: 'controller_source_manifest_invalid' }
    );
  }
});

test('new files under a runtime root are bound without parser or manifest edits', t => {
  const root = createSyntheticRepository(t);
  const manifest = loadManifest({ repoRoot: root });
  const original = inspectControllerSourceManifest({ repoRoot: root });
  assert.equal(original.recognized, true);

  write(
    root,
    'src/dynamic-loader.js',
    "'use strict';\n" +
      "const r = require;\n" +
      "r('./hidden-runtime');\n"
  );
  write(root, 'src/hidden-runtime.js', "'use strict';\n");
  assert.deepEqual(
    discoverManifestFiles(manifest, { repoRoot: root }).slice(-3),
    [
      'src/dynamic-loader.js',
      'src/hidden-runtime.js',
      'src/index.js'
    ]
  );
  assert.throws(
    () => computeManifestDigest(manifest, { repoRoot: root }),
    { code: 'controller_source_manifest_git_entry_mismatch' }
  );
  assert.equal(
    inspectControllerSourceManifest({ repoRoot: root }).recognized,
    false
  );

  execFileSync('git', ['add', '--', 'src'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'add dynamic runtime fixture'], {
    cwd: root
  });
  const expanded = inspectControllerSourceManifest({ repoRoot: root });
  assert.equal(expanded.recognized, true);
  assert.equal(expanded.fileCount, original.fileCount + 2);
  assert.notEqual(expanded.manifestDigest, original.manifestDigest);
});

test('new controller script dependencies cannot escape the broad script root', t => {
  const root = createSyntheticRepository(t);
  write(root, 'scripts/hidden-runtime.js', "'use strict';\nmodule.exports = 1;\n");
  fs.appendFileSync(
    path.join(root, 'scripts/codex-memory-stack.js'),
    "require('./hidden-runtime');\n"
  );
  execFileSync('git', ['add', '--', 'scripts'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'add controller dependency'], {
    cwd: root
  });
  const first = inspectControllerSourceManifest({ repoRoot: root });
  assert.equal(first.recognized, true);
  assert.equal(
    discoverManifestFiles(loadManifest({ repoRoot: root }), {
      repoRoot: root
    }).includes('scripts/hidden-runtime.js'),
    true
  );

  fs.appendFileSync(
    path.join(root, 'scripts/hidden-runtime.js'),
    'module.exports = 2;\n'
  );
  execFileSync('git', ['add', '--', 'scripts/hidden-runtime.js'], {
    cwd: root
  });
  execFileSync('git', ['commit', '-qm', 'change controller dependency'], {
    cwd: root
  });
  const second = inspectControllerSourceManifest({ repoRoot: root });
  assert.equal(second.recognized, true);
  assert.notEqual(second.manifestDigest, first.manifestDigest);
});

test('committed governance files outside runtime roots do not change the digest', t => {
  const root = createSyntheticRepository(t);
  const manifest = loadManifest({ repoRoot: root });
  const original = computeManifestDigest(manifest, { repoRoot: root });
  write(root, 'CURRENT_STATE.md', '# Governance-only fixture\n');
  execFileSync('git', ['add', '--', 'CURRENT_STATE.md'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'governance-only fixture'], {
    cwd: root
  });
  assert.equal(
    computeManifestDigest(manifest, { repoRoot: root }),
    original
  );
});

test('skip-worktree cannot hide a tracked runtime file missing from disk', t => {
  const root = createSyntheticRepository(t);
  write(root, 'src/omitted-runtime.js', "'use strict';\n");
  execFileSync('git', ['add', '--', 'src/omitted-runtime.js'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'add omission fixture'], {
    cwd: root
  });
  execFileSync(
    'git',
    ['update-index', '--skip-worktree', 'src/omitted-runtime.js'],
    { cwd: root }
  );
  fs.rmSync(path.join(root, 'src/omitted-runtime.js'));
  assert.equal(
    String(execFileSync(
      'git',
      ['status', '--porcelain=v1', '--', 'src/omitted-runtime.js'],
      { cwd: root }
    )),
    ''
  );
  assert.throws(
    () => computeManifestDigest(loadManifest({ repoRoot: root }), {
      repoRoot: root
    }),
    { code: 'controller_source_manifest_git_entry_mismatch' }
  );
  assert.equal(
    inspectControllerSourceManifest({ repoRoot: root }).recognized,
    false
  );
});

test('assume-unchanged cannot hide runtime bytes that differ from HEAD', t => {
  const root = createSyntheticRepository(t);
  execFileSync(
    'git',
    ['update-index', '--assume-unchanged', 'src/index.js'],
    { cwd: root }
  );
  fs.writeFileSync(
    path.join(root, 'src/index.js'),
    "'use strict';\n// hidden drift\n"
  );
  assert.equal(
    String(execFileSync(
      'git',
      ['status', '--porcelain=v1', '--', 'src/index.js'],
      { cwd: root }
    )),
    ''
  );
  assert.throws(
    () => computeManifestDigest(loadManifest({ repoRoot: root }), {
      repoRoot: root
    }),
    { code: 'controller_source_manifest_worktree_blob_mismatch' }
  );
  assert.equal(
    inspectControllerSourceManifest({ repoRoot: root }).recognized,
    false
  );
});

test('manifest digest binds tracked bytes and Git mode and fails closed on drift', t => {
  const root = createSyntheticRepository(t);
  const manifest = loadManifest({ repoRoot: root });
  const digest = computeManifestDigest(manifest, { repoRoot: root });
  assert.match(digest, /^sha256:[a-f0-9]{64}$/u);
  assert.deepEqual(inspectControllerSourceManifest({ repoRoot: root }), {
    recognized: true,
    manifestVersion: 1,
    manifestDigest: digest,
    manifestComplete: true,
    manifestScopeClean: true,
    fileCount: discoverManifestFiles(manifest, { repoRoot: root }).length
  });

  fs.appendFileSync(
    path.join(root, 'scripts/codex-memory-stack.js'),
    '// drift\n'
  );
  const drifted = inspectControllerSourceManifest({ repoRoot: root });
  assert.equal(drifted.recognized, false);
  assert.equal(drifted.manifestScopeClean, false);
  assert.notEqual(drifted.manifestDigest, digest);
});

test('manifest digest fails closed when executable mode differs from Git', t => {
  const root = createSyntheticRepository(t);
  const stack = path.join(root, 'scripts/codex-memory-stack.js');
  fs.chmodSync(stack, 0o755);
  assert.throws(
    () => computeManifestDigest(loadManifest({ repoRoot: root }), {
      repoRoot: root
    }),
    { code: 'controller_source_manifest_worktree_mode_mismatch' }
  );
  const inspection = inspectControllerSourceManifest({ repoRoot: root });
  assert.equal(inspection.recognized, false);
  assert.equal(inspection.manifestComplete, false);
});

test('descriptor read rejects a same-path inode replacement during inspection', t => {
  const root = createSyntheticRepository(t);
  const file = path.join(root, 'src/index.js');
  let replaced = false;
  const fsModule = {
    closeSync: fs.closeSync,
    constants: fs.constants,
    fstatSync: fs.fstatSync,
    lstatSync: fs.lstatSync,
    openSync: fs.openSync,
    readFileSync(descriptor) {
      const bytes = fs.readFileSync(descriptor);
      if (!replaced) {
        replaced = true;
        fs.renameSync(file, `${file}.replaced`);
        fs.writeFileSync(file, bytes);
      }
      return bytes;
    }
  };
  assert.throws(
    () => readStableRegularFile(file, { fsModule }),
    { code: 'controller_source_manifest_file_identity_changed' }
  );
});

test('manifest closure rejects a symlinked runtime file', t => {
  const root = createSyntheticRepository(t);
  const target = path.join(root, 'scripts/codex-memory-stack.js');
  fs.unlinkSync(target);
  fs.symlinkSync('/dev/null', target);
  assert.throws(
    () => discoverManifestFiles(loadManifest({ repoRoot: root }), {
      repoRoot: root
    }),
    { code: 'controller_source_manifest_file_type_invalid' }
  );
});
