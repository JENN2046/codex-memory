#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const {
  buildPhaseF1SyncApprovalPacket
} = require('../core/PhaseF1SyncApprovalPacket');

function parseArgs(argv = []) {
  const options = {
    cwd: process.cwd(),
    branch: 'main',
    remoteRef: 'origin/main',
    json: false,
    pretty: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') { options.json = true; continue; }
    if (token === '--pretty') { options.pretty = true; continue; }
    if (token === '--help' || token === '-h') { options.help = true; continue; }
    if (token === '--cwd') {
      options.cwd = argv[index + 1] || options.cwd;
      index += 1;
      continue;
    }
    if (token === '--branch') {
      options.branch = argv[index + 1] || options.branch;
      index += 1;
      continue;
    }
    if (token === '--remote-ref') {
      options.remoteRef = argv[index + 1] || options.remoteRef;
      index += 1;
    }
  }

  return options;
}

function usage() {
  return [
    'Usage: node src/cli/phase-f1-sync-approval-packet.js [--cwd PATH] [--branch main] [--remote-ref origin/main] [--json] [--pretty]',
    '',
    'Reads local Git facts and renders a non-authorizing normal non-force push approval packet.',
    'This command does not push, pull, merge, rebase, call MCP, or touch runtime/memory state.'
  ].join('\n');
}

function runGit(args, cwd) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true
  });
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim();
    throw new Error(`git ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`);
  }
  return String(result.stdout || '').trim();
}

function readGitFacts({ cwd, branch, remoteRef }) {
  const currentBranch = runGit(['branch', '--show-current'], cwd);
  const currentHead = runGit(['rev-parse', 'HEAD'], cwd);
  const originHead = runGit(['rev-parse', remoteRef], cwd);
  const aheadBehindRaw = runGit(['rev-list', '--left-right', '--count', `${branch}...${remoteRef}`], cwd);
  const [aheadRaw, behindRaw] = aheadBehindRaw.split(/\s+/);
  const statusShort = runGit(['status', '--short'], cwd);
  const commitsRaw = runGit(['log', '--oneline', `${remoteRef}..${branch}`], cwd);
  const commits = commitsRaw ? commitsRaw.split(/\r?\n/).filter(Boolean) : [];

  return {
    workspace: cwd,
    branch: currentBranch || branch,
    remoteRef,
    currentHead,
    originHead,
    ahead: Number(aheadRaw || 0),
    behind: Number(behindRaw || 0),
    worktreeClean: statusShort.length === 0,
    commits
  };
}

function renderText(packet) {
  return [
    `status: ${packet.status}`,
    `decision: ${packet.decision}`,
    `branch: ${packet.branch}`,
    `HEAD: ${packet.currentHead}`,
    `${packet.remoteRef}: ${packet.originHead}`,
    `ahead/behind: ${packet.ahead}/${packet.behind}`,
    `worktreeClean: ${packet.worktreeClean}`,
    `pushCommand: ${packet.pushCommand}`,
    '',
    'localCommits:',
    ...(packet.commits.length ? packet.commits.map(commit => `- ${commit}`) : ['- none']),
    '',
    'approvalTemplate:',
    packet.approvalTemplate,
    '',
    `nextRequiredAction: ${packet.nextRequiredAction}`,
    `failClosedReasons: ${(packet.failClosedReasons || []).join(',') || 'none'}`
  ].join('\n') + '\n';
}

function run(argv = process.argv.slice(2), stdout = process.stdout) {
  const options = parseArgs(argv);
  if (options.help) {
    stdout.write(`${usage()}\n`);
    return 0;
  }

  const facts = readGitFacts(options);
  const packet = buildPhaseF1SyncApprovalPacket(facts);

  if (options.json) {
    stdout.write(`${JSON.stringify(packet, null, options.pretty ? 2 : 0)}\n`);
  } else {
    stdout.write(renderText(packet));
  }

  return packet.status === 'PHASE_F1_SYNC_APPROVAL_PACKET_READY_NOT_EXECUTED' ? 0 : 1;
}

if (require.main === module) {
  try {
    process.exitCode = run();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  parseArgs,
  readGitFacts,
  renderText,
  run
};
