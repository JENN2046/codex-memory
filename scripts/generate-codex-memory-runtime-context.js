#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  BUILD_MANIFEST_SCHEMA,
  canonicalJson,
  digest,
  validateBuildManifest
} = require('../src/runtime/native-image/runtime-authority');
const {
  inspectVcpRuntimeContractEvidence
} = require('./codex-memory-stack');

const CODEX_PATHS = Object.freeze([
  'apps/local-recall-relay',
  'deploy/native-runtime',
  'package-lock.json',
  'package.json',
  'packages/chatgpt-r4-contracts',
  'scripts',
  'src'
]);
const VCP_PATHS = Object.freeze([
  'package-lock.json',
  'package.json',
  'rag_params.json'
]);
const BASE_INDEX_DIGEST =
  'sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3';
const BASE_PLATFORM_DIGEST =
  'sha256:8607a9064d4a571140998ae9e52a3b3fcf9cff361d04642d5971e6cd76d39e27';
const VEXUS_SHA256 =
  'sha256:8d969b407d3458d835656286570cebba9cc0981b3e505a25701e7b48f15a5c54';

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function git(repo, args, encoding = 'utf8') {
  return execFileSync('git', ['-C', repo, ...args], {
    encoding,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function sha256Buffer(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function sha256File(file) {
  return sha256Buffer(fs.readFileSync(file));
}

function assertCleanExactRepository(repo, commit, label) {
  const root = git(repo, ['rev-parse', '--show-toplevel']).trim();
  const head = git(repo, ['rev-parse', 'HEAD']).trim();
  const status = git(repo, ['status', '--porcelain=v1', '--untracked-files=all']);
  const type = git(repo, ['cat-file', '-t', commit]).trim();
  if (path.resolve(root) !== path.resolve(repo) || head !== commit ||
      status !== '' || type !== 'commit') fail(`${label}_repository_not_clean_exact`);
  return root;
}

function assertNoSymlinks(repo, commit, selectedPaths, label) {
  const output = git(repo, [
    'ls-tree', '-r', '-z', '--full-tree', commit, '--', ...selectedPaths
  ], null);
  for (const record of output.toString('utf8').split('\0')) {
    if (!record) continue;
    const match = /^(\d{6}) [a-z]+ [a-f0-9]+\t(.+)$/u.exec(record);
    if (!match || match[1] === '120000' || match[2].includes('..')) {
      fail(`${label}_archive_path_unsafe`);
    }
  }
}

function materializeGitArchive(repo, commit, selectedPaths, destination, label) {
  assertNoSymlinks(repo, commit, selectedPaths, label);
  const archive = path.join(
    path.dirname(destination),
    `.${label}-${crypto.randomBytes(8).toString('hex')}.tar`
  );
  try {
    execFileSync('git', [
      '-C', repo, 'archive', '--format=tar', `--output=${archive}`,
      commit, '--', ...selectedPaths
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    fs.mkdirSync(destination, { mode: 0o700 });
    execFileSync('tar', [
      '--extract', '--file', archive, '--directory', destination,
      '--no-same-owner', '--no-same-permissions'
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
  } finally {
    try { fs.unlinkSync(archive); } catch {}
  }
}

function visitFiles(root, relative = '') {
  const directory = path.join(root, relative);
  const output = [];
  for (const name of fs.readdirSync(directory).sort()) {
    const childRelative = relative ? `${relative}/${name}` : name;
    const child = path.join(root, childRelative);
    const stat = fs.lstatSync(child);
    if (stat.isSymbolicLink()) fail('runtime_context_symlink_forbidden');
    if (stat.isDirectory()) {
      output.push(...visitFiles(root, childRelative));
      continue;
    }
    if (!stat.isFile()) fail('runtime_context_special_file_forbidden');
    output.push(Object.freeze({
      mode: (stat.mode & 0o111) === 0 ? '100644' : '100755',
      path: childRelative,
      sha256: sha256File(child),
      size: stat.size
    }));
  }
  return output;
}

function sourceDateEpoch(repo, commit) {
  const value = Number(git(repo, ['show', '-s', '--format=%ct', commit]).trim());
  if (!Number.isSafeInteger(value) || value < 1) fail('source_date_epoch_invalid');
  return value;
}

function treeDigest(repo, commit) {
  const tree = git(repo, ['rev-parse', `${commit}^{tree}`]).trim();
  if (!/^[a-f0-9]{40}$/u.test(tree)) fail('git_tree_invalid');
  return sha256Buffer(Buffer.from(tree, 'utf8'));
}

function vcpContractPaths(repository) {
  const evidence = inspectVcpRuntimeContractEvidence(repository);
  if (evidence?.complete !== true ||
      !Array.isArray(evidence?.projection?.securityFiles) ||
      evidence.projection.securityFiles.length < 2) {
    fail(evidence?.stableErrorCode || 'vcp_contract_evidence_unavailable');
  }
  return Object.freeze([...new Set([
    ...VCP_PATHS,
    ...evidence.projection.securityFiles.map(file => file.relativePath)
  ])].sort());
}

function pruneRuntimePackageLock(sourceLock, rootDependencies) {
  if (sourceLock?.lockfileVersion !== 3 ||
      !sourceLock.packages || typeof sourceLock.packages !== 'object' ||
      !rootDependencies || typeof rootDependencies !== 'object' ||
      Array.isArray(rootDependencies) || Object.keys(rootDependencies).length < 1) {
    fail('vcp_runtime_lock_invalid');
  }
  const resolveDependencyKey = (requesterKey, dependency) => {
    let ancestor = requesterKey;
    while (true) {
      const candidate = ancestor
        ? `${ancestor}/node_modules/${dependency}`
        : `node_modules/${dependency}`;
      if (sourceLock.packages[candidate]) return candidate;
      if (!ancestor) return null;
      const match = /^(.*?)(?:\/)?node_modules\/(?:@[^/]+\/)?[^/]+$/u
        .exec(ancestor);
      ancestor = match ? match[1] : '';
    }
  };
  const selected = new Set(['']);
  const queue = Object.keys(rootDependencies).map(
    dependency => `node_modules/${dependency}`
  );
  while (queue.length > 0) {
    const key = queue.shift();
    if (selected.has(key)) continue;
    const entry = sourceLock.packages[key];
    if (!entry || typeof entry.version !== 'string' ||
        typeof entry.integrity !== 'string') fail('vcp_runtime_lock_dependency_missing');
    selected.add(key);
    for (const dependency of Object.keys(entry.dependencies || {})) {
      const dependencyKey = resolveDependencyKey(key, dependency);
      if (!dependencyKey) fail('vcp_runtime_lock_dependency_missing');
      queue.push(dependencyKey);
    }
    for (const dependency of Object.keys({
      ...(entry.optionalDependencies || {}),
      ...(entry.peerDependencies || {})
    })) {
      const dependencyKey = resolveDependencyKey(key, dependency);
      if (dependencyKey) queue.push(dependencyKey);
      else if (entry.peerDependencies?.[dependency] &&
          entry.peerDependenciesMeta?.[dependency]?.optional !== true) {
        fail('vcp_runtime_lock_dependency_missing');
      }
    }
  }
  const packageManifest = Object.freeze({
    name: 'codex-memory-vcp-runtime-dependencies',
    version: '1.0.0',
    private: true,
    dependencies: rootDependencies
  });
  const lock = Object.freeze({
    name: packageManifest.name,
    version: packageManifest.version,
    lockfileVersion: 3,
    requires: true,
    packages: Object.fromEntries([...selected].sort().map(key => {
      if (key === '') return [key, {
        name: packageManifest.name,
        version: packageManifest.version,
        dependencies: rootDependencies
      }];
      return [key, sourceLock.packages[key]];
    }))
  });
  return Object.freeze({ lock, packageManifest, selected });
}

function materializeVcpRuntimeDependencies(repository, destination) {
  const evidence = inspectVcpRuntimeContractEvidence(repository);
  if (evidence?.complete !== true ||
      !Array.isArray(evidence?.projection?.relevantExternalDependencies)) {
    fail(evidence?.stableErrorCode || 'vcp_contract_evidence_unavailable');
  }
  const sourceLock = JSON.parse(fs.readFileSync(
    path.join(repository, 'package-lock.json'), 'utf8'
  ));
  const rootDependencies = Object.fromEntries(
    evidence.projection.relevantExternalDependencies.map(entry => [
      entry.packageName, entry.version
    ])
  );
  const { lock, packageManifest, selected } = pruneRuntimePackageLock(
    sourceLock, rootDependencies
  );
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(destination, 'package.json'),
    `${JSON.stringify(packageManifest, null, 2)}\n`, { mode: 0o600 });
  fs.writeFileSync(path.join(destination, 'package-lock.json'),
    `${JSON.stringify(lock, null, 2)}\n`, { mode: 0o600 });
  return Object.freeze({
    dependencyCount: selected.size - 1,
    externalDependencyCount: Object.keys(rootDependencies).length
  });
}

function generateBuildContext({
  codexMemoryRepository,
  codexMemoryCommit,
  vcpRepository,
  vcpCommit,
  outputDirectory,
  dockerVersion,
  buildxVersion
}) {
  assertCleanExactRepository(
    codexMemoryRepository, codexMemoryCommit, 'codex_memory'
  );
  assertCleanExactRepository(vcpRepository, vcpCommit, 'vcp');
  if (fs.existsSync(outputDirectory)) fail('runtime_context_output_exists');
  const parent = path.dirname(outputDirectory);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const staging = fs.mkdtempSync(path.join(parent, '.runtime-context-'), {
    encoding: 'utf8'
  });
  fs.chmodSync(staging, 0o700);
  try {
    materializeGitArchive(
      codexMemoryRepository, codexMemoryCommit, CODEX_PATHS,
      path.join(staging, 'codex-memory'), 'codex-memory'
    );
    materializeVcpRuntimeDependencies(
      vcpRepository,
      path.join(staging, 'runtime', 'vcp-dependencies')
    );
    materializeGitArchive(
      vcpRepository, vcpCommit, vcpContractPaths(vcpRepository),
      path.join(staging, 'vcptoolbox'), 'vcptoolbox'
    );
    const vexus = path.join(
      staging, 'vcptoolbox', 'rust-vexus-lite',
      'vexus-lite.linux-x64-gnu.node'
    );
    if (sha256File(vexus) !== VEXUS_SHA256) fail('vexus_sha256_mismatch');
    const fileManifest = visitFiles(staging);
    const manifest = validateBuildManifest({
      baseImageIndexDigest: BASE_INDEX_DIGEST,
      baseImagePlatformDigest: BASE_PLATFORM_DIGEST,
      buildContextFileManifestDigest: digest(fileManifest),
      buildToolVersions: {
        buildx: String(buildxVersion || ''),
        docker: String(dockerVersion || '')
      },
      codexMemoryCommit,
      codexMemoryTree: treeDigest(codexMemoryRepository, codexMemoryCommit),
      fileManifest,
      lockfileDigests: {
        codexMemory: sha256File(path.join(staging, 'codex-memory', 'package-lock.json')),
        vcp: sha256File(path.join(staging, 'vcptoolbox', 'package-lock.json'))
      },
      nodeVersion: '22.23.1',
      runtimeBuildManifestVersion: BUILD_MANIFEST_SCHEMA,
      sourceDateEpoch: sourceDateEpoch(codexMemoryRepository, codexMemoryCommit),
      vcpCommit,
      vcpTree: treeDigest(vcpRepository, vcpCommit),
      vexusSha256: VEXUS_SHA256
    });
    fs.mkdirSync(path.join(staging, 'runtime'), {
      recursive: true,
      mode: 0o700
    });
    fs.writeFileSync(
      path.join(staging, 'runtime', 'runtime-build-manifest.json'),
      canonicalJson(manifest),
      { encoding: 'utf8', mode: 0o600 }
    );
    fs.renameSync(staging, outputDirectory);
    return Object.freeze({
      buildContextFileManifestDigest: manifest.buildContextFileManifestDigest,
      manifest,
      outputDirectory
    });
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw error;
  }
}

function parseArguments(argv) {
  const values = {};
  for (const argument of argv) {
    const match = /^--([a-z-]+)=(.+)$/u.exec(argument);
    if (!match) fail('runtime_context_argument_invalid');
    values[match[1]] = match[2];
  }
  return values;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  const dockerVersion = execFileSync('docker', ['version', '--format', '{{.Client.Version}}'], {
    encoding: 'utf8'
  }).trim();
  const buildxVersion = execFileSync('docker', ['buildx', 'version'], {
    encoding: 'utf8'
  }).trim();
  const result = generateBuildContext({
    codexMemoryRepository: path.resolve(args['codex-repository'] || ''),
    codexMemoryCommit: args['codex-commit'],
    vcpRepository: path.resolve(args['vcp-repository'] || ''),
    vcpCommit: args['vcp-commit'],
    outputDirectory: path.resolve(args.output || ''),
    dockerVersion,
    buildxVersion
  });
  process.stdout.write(`${canonicalJson({
    accepted: true,
    buildContextFileManifestDigest:
      result.buildContextFileManifestDigest,
    outputDirectory: result.outputDirectory,
    secretValuesReturned: false
  })}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error?.code || error?.message || 'runtime_context_failed'}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  BASE_INDEX_DIGEST,
  BASE_PLATFORM_DIGEST,
  CODEX_PATHS,
  VCP_PATHS,
  VEXUS_SHA256,
  assertCleanExactRepository,
  generateBuildContext,
  materializeGitArchive,
  materializeVcpRuntimeDependencies,
  pruneRuntimePackageLock,
  vcpContractPaths,
  visitFiles
};
