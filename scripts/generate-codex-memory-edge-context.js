#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { canonicalJson, digest } = require('../src/runtime/native-image/runtime-authority');
const {
  EDGE_BUILD_MANIFEST_PATH,
  EDGE_BUILD_MANIFEST_SCHEMA,
  validateEdgeBuildManifest,
  verifyEdgeBuildContextBuffer
} = require('../src/runtime/native-image/edge-image-authority');
const {
  BASE_INDEX_DIGEST,
  BASE_PLATFORM_DIGEST,
  assertCleanExactRepository,
  materializeGitArchive,
  visitFiles
} = require('./generate-codex-memory-runtime-context');

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function sha256(bytes) {
  return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
}
function git(repository, args) {
  return execFileSync('git', ['-C', repository, ...args], {
    encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function edgeAllowlist(repository, commit) {
  const bytes = execFileSync('git', ['-C', repository, 'show', `${commit}:.dockerignore`], {
    encoding: null, stdio: ['ignore', 'pipe', 'pipe']
  });
  const lines = bytes.toString('utf8').split(/\r?\n/u).filter(Boolean);
  if (lines[0] !== '**' || lines.some(line => line !== '**' && !line.startsWith('!'))) {
    fail('edge_context_dockerignore_policy_invalid');
  }
  const patterns = lines.filter(line => line.startsWith('!')).map(line => line.slice(1));
  if (patterns.some(value => value.includes('*'))) {
    fail('edge_context_dockerignore_policy_invalid');
  }
  const files = ['.dockerignore', ...patterns.filter(value => !value.endsWith('/'))];
  if (!files.includes('apps/chatgpt-edge/Dockerfile') ||
      !files.includes('package-lock.json') || !files.includes('package.json') ||
      files.some(value => /(?:^|\/)(?:\.env|logs?|tmp|cache)(?:[./]|$)/u.test(value))) {
    fail('edge_context_dockerignore_policy_invalid');
  }
  return Object.freeze({ bytes, files: Object.freeze(files.sort()) });
}

function generateEdgeBuildContext({ repository, commit, outputDirectory,
  dockerVersion, buildxVersion }) {
  assertCleanExactRepository(repository, commit, 'edge_codex_memory');
  if (fs.existsSync(outputDirectory)) fail('edge_context_output_exists');
  const parent = path.dirname(outputDirectory);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const staging = fs.mkdtempSync(path.join(parent, '.edge-context-'));
  fs.chmodSync(staging, 0o700);
  const contextRoot = path.join(staging, 'root');
  let publication = null;
  try {
    const allowlist = edgeAllowlist(repository, commit);
    materializeGitArchive(repository, commit, allowlist.files, contextRoot, 'edge');
    const fileManifest = visitFiles(contextRoot);
    const sourceDateEpoch = Number(git(repository, ['show', '-s', '--format=%ct', commit]));
    const tree = git(repository, ['rev-parse', `${commit}^{tree}`]);
    if (!Number.isSafeInteger(sourceDateEpoch) || sourceDateEpoch < 1 ||
        !/^[a-f0-9]{40}$/u.test(tree)) fail('edge_context_git_identity_invalid');
    const lockfile = fileManifest.find(entry => entry.path === 'package-lock.json');
    const dockerignore = fileManifest.find(entry => entry.path === '.dockerignore');
    if (!lockfile || !dockerignore || dockerignore.sha256 !== sha256(allowlist.bytes)) {
      fail('edge_context_inventory_invalid');
    }
    const manifest = validateEdgeBuildManifest({
      baseImageIndexDigest: BASE_INDEX_DIGEST,
      baseImagePlatformDigest: BASE_PLATFORM_DIGEST,
      buildToolVersions: { buildx: String(buildxVersion || ''), docker: String(dockerVersion || '') },
      dockerignoreSha256: dockerignore.sha256,
      edgeBuildContextFileManifestDigest: digest(fileManifest),
      fileManifest,
      lockfileSha256: lockfile.sha256,
      nodeVersion: '22.23.1',
      schemaVersion: EDGE_BUILD_MANIFEST_SCHEMA,
      sourceCommit: commit,
      sourceDateEpoch,
      sourceTree: sha256(Buffer.from(tree, 'utf8'))
    });
    fs.writeFileSync(path.join(contextRoot, EDGE_BUILD_MANIFEST_PATH), canonicalJson(manifest), {
      encoding: 'utf8', flag: 'wx', mode: 0o600
    });
    publication = fs.mkdtempSync(path.join(parent, '.edge-context-publication-'));
    const archive = path.join(publication, 'edge-context.tar');
    const topLevel = fs.readdirSync(contextRoot).sort();
    execFileSync('tar', [
      '--create', '--format=ustar', '--sort=name', `--mtime=@${sourceDateEpoch}`,
      '--owner=0', '--group=0', '--numeric-owner', '--mode=u+rwX,go+rX,go-w',
      '--file', archive, '--directory', contextRoot, ...topLevel
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    fs.chmodSync(archive, 0o600);
    const descriptor = fs.openSync(archive, fs.constants.O_RDONLY);
    try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
    const buffer = fs.readFileSync(archive);
    const evidence = verifyEdgeBuildContextBuffer(buffer);
    fs.copyFileSync(path.join(contextRoot, EDGE_BUILD_MANIFEST_PATH),
      path.join(publication, EDGE_BUILD_MANIFEST_PATH), fs.constants.COPYFILE_EXCL);
    fs.chmodSync(path.join(publication, EDGE_BUILD_MANIFEST_PATH), 0o600);
    fs.renameSync(publication, outputDirectory);
    publication = null;
    return Object.freeze({ ...evidence, outputDirectory });
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
    if (publication) fs.rmSync(publication, { recursive: true, force: true });
  }
}

function parseArguments(argv) {
  const values = {};
  for (const argument of argv) {
    const match = /^--([a-z-]+)=(.+)$/u.exec(argument);
    if (!match) fail('edge_context_argument_invalid');
    values[match[1]] = match[2];
  }
  if (!values.repository || !values.commit || !values.output) {
    fail('edge_context_argument_invalid');
  }
  return values;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  const result = generateEdgeBuildContext({
    buildxVersion: execFileSync('docker', ['buildx', 'version'], { encoding: 'utf8' }).trim(),
    commit: args.commit,
    dockerVersion: execFileSync('docker', ['version', '--format', '{{.Client.Version}}'], {
      encoding: 'utf8'
    }).trim(),
    outputDirectory: path.resolve(args.output),
    repository: path.resolve(args.repository)
  });
  process.stdout.write(canonicalJson({
    accepted: true,
    contextArtifactSha256: result.artifactSha256,
    edgeBuildContextFileManifestDigest: result.edgeBuildContextFileManifestDigest,
    outputDirectory: result.outputDirectory,
    secretValuesReturned: false
  }));
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error?.code || error?.message || 'edge_context_failed'}\n`);
    process.exitCode = 1;
  }
}

module.exports = { edgeAllowlist, generateEdgeBuildContext, main, parseArguments };
