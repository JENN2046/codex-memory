'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function gitText(args, { cwd = process.cwd() } = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024
  }).trim();
}

function gitBuffer(args, { cwd = process.cwd() } = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: null,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024
  });
}

function resolveCommitTree(commit, options) {
  return gitText(['rev-parse', `${commit}^{tree}`], options);
}

function resolveParentCommit(commit, options) {
  const fields = gitText(['rev-list', '--parents', '-n', '1', commit], options).split(/\s+/);
  if (fields.length !== 2) throw new Error('cm2115_r2_single_parent_commit_required');
  return fields[1];
}

function resolveGitFile(sourceCommit, sourcePath, options) {
  const sourceTree = resolveCommitTree(sourceCommit, options);
  const treeLine = gitBuffer(['ls-tree', '-z', sourceCommit, '--', sourcePath], options).toString('utf8');
  const match = treeLine.match(/^(\d{6}) (\w+) ([a-f0-9]{40})\t([^\0]+)\0$/);
  if (!match || match[4] !== sourcePath || match[2] !== 'blob') {
    throw new Error(`cm2115_r2_git_file_missing:${sourcePath}`);
  }
  const content = gitBuffer(['cat-file', 'blob', match[3]], options);
  return {
    sourceCommit,
    sourceTree,
    sourcePath,
    gitMode: match[1],
    gitObjectType: match[2],
    blobOid: match[3],
    bytes: content.length,
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
    content
  };
}

function resolveDiffPaths(parentCommit, commit, options) {
  const output = gitText(['diff-tree', '--no-commit-id', '--name-only', '-r', parentCommit, commit], options);
  return output ? output.split('\n').filter(Boolean).sort() : [];
}

function resolveGitCommonDir(options) {
  return path.resolve(gitText(['rev-parse', '--git-common-dir'], options));
}

function resolveGovernanceRegistryRoot(options) {
  return path.join(resolveGitCommonDir(options), 'codex-memory-governance', 'phase8-one-shot-authorization-registries');
}

function ensureCleanWorktree(options) {
  if (gitText(['status', '--porcelain'], options) !== '') throw new Error('cm2115_r2_clean_worktree_required');
}

module.exports = {
  ensureCleanWorktree,
  gitBuffer,
  gitText,
  resolveCommitTree,
  resolveDiffPaths,
  resolveGitCommonDir,
  resolveGitFile,
  resolveGovernanceRegistryRoot,
  resolveParentCommit
};
