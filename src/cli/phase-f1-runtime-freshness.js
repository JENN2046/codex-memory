#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const {
  evaluatePhaseF1RuntimeFreshness
} = require('../core/PhaseF1RuntimeFreshnessDiagnostic');

function parseArgs(argv = []) {
  const options = {
    cwd: process.cwd(),
    branch: 'main',
    remoteRef: 'origin/main',
    port: '7605',
    endpoint: 'http://127.0.0.1:7605',
    expectedScriptPath: 'A:\\codex-memory\\scripts\\serve-codex-memory-http.js',
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
      continue;
    }
    if (token === '--port') {
      options.port = argv[index + 1] || options.port;
      index += 1;
      continue;
    }
    if (token === '--endpoint') {
      options.endpoint = argv[index + 1] || options.endpoint;
      index += 1;
      continue;
    }
    if (token === '--expected-script-path') {
      options.expectedScriptPath = argv[index + 1] || options.expectedScriptPath;
      index += 1;
    }
  }

  return options;
}

function usage() {
  return [
    'Usage: node src/cli/phase-f1-runtime-freshness.js [--cwd PATH] [--branch main] [--remote-ref origin/main] [--port 7605] [--json] [--pretty]',
    '',
    'Read-only diagnostic for Phase F1 live endpoint freshness.',
    'It compares current Git HEAD commit time with the listening HTTP process start time.',
    'It does not restart services, read tokens, call MCP tools, or touch memory state.'
  ].join('\n');
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    windowsHide: true
  });
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim();
    throw new Error(`${command} ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`);
  }
  return String(result.stdout || '').trim();
}

function readGitFacts({ cwd, branch, remoteRef }) {
  const currentHead = runCommand('git', ['rev-parse', 'HEAD'], { cwd });
  const originHead = runCommand('git', ['rev-parse', remoteRef], { cwd });
  const aheadBehindRaw = runCommand('git', ['rev-list', '--left-right', '--count', `${branch}...${remoteRef}`], { cwd });
  const [aheadRaw, behindRaw] = aheadBehindRaw.split(/\s+/);
  const statusShort = runCommand('git', ['status', '--short'], { cwd });
  const headCommitTime = runCommand('git', ['show', '-s', '--format=%cI', 'HEAD'], { cwd });

  return {
    currentHead,
    originHead,
    ahead: Number(aheadRaw || 0),
    behind: Number(behindRaw || 0),
    worktreeClean: statusShort.length === 0,
    headCommitTime
  };
}

function readListener({ port }) {
  const script = [
    `$connection = Get-NetTCPConnection -LocalPort ${Number.parseInt(String(port), 10)} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1`,
    'if (-not $connection) { "{}"; exit 0 }',
    '$process = Get-CimInstance Win32_Process -Filter "ProcessId=$($connection.OwningProcess)"',
    '$payload = [pscustomobject]@{ processId = $connection.OwningProcess; creationDate = $process.CreationDate; commandLine = $process.CommandLine }',
    '$payload | ConvertTo-Json -Compress'
  ].join('; ');

  const output = runCommand('powershell', [
    '-NoProfile',
    '-Command',
    script
  ]);
  if (!output || output === '{}') return null;
  return JSON.parse(output);
}

function renderText(report) {
  return [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `currentHead: ${report.currentHead}`,
    `originHead: ${report.originHead}`,
    `ahead/behind: ${report.ahead}/${report.behind}`,
    `worktreeClean: ${report.worktreeClean}`,
    `headCommitTime: ${report.headCommitTime}`,
    `listenerProcessId: ${report.listener?.processId || ''}`,
    `listenerCreationDate: ${report.listener?.creationDate || ''}`,
    `commandLineMatchesExpectedScript: ${report.listener?.commandLineMatchesExpectedScript ?? ''}`,
    `runtimeFresh: ${report.runtimeFresh}`,
    `failClosedReasons: ${report.failClosedReasons.join(',') || 'none'}`,
    `nextRequiredAction: ${report.nextRequiredAction}`
  ].join('\n') + '\n';
}

function run(argv = process.argv.slice(2), stdout = process.stdout) {
  const options = parseArgs(argv);
  if (options.help) {
    stdout.write(`${usage()}\n`);
    return 0;
  }

  const gitFacts = readGitFacts(options);
  const listener = readListener(options);
  const report = evaluatePhaseF1RuntimeFreshness({
    ...gitFacts,
    endpoint: options.endpoint,
    expectedScriptPath: options.expectedScriptPath,
    listener
  });

  if (options.json) {
    stdout.write(`${JSON.stringify(report, null, options.pretty ? 2 : 0)}\n`);
  } else {
    stdout.write(renderText(report));
  }

  return report.runtimeFresh ? 0 : 1;
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
