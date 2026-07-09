#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { TOOL_DEFINITIONS } = require('../core/constants');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_FIXTURE_PATH = path.join(
  WORKSPACE_ROOT,
  'tests',
  'fixtures',
  'migration-import-export-dry-run-gate-v1.json'
);

const PUBLIC_MCP_TOOLS = TOOL_DEFINITIONS.map(tool => tool.name);

const REJECTED_FLAGS = new Set([
  '--apply',
  '--confirm',
  '--migrate',
  '--import',
  '--export',
  '--backup',
  '--restore',
  '--real-memory',
  '--provider',
  '--push',
  '--tag',
  '--release',
  '--deploy'
]);

function parseArgs(argv = []) {
  const options = {
    json: false,
    help: false,
    sourceMode: 'fixture',
    rejectedFlag: null,
    invalidInput: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--json') {
      options.json = true;
      continue;
    }

    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }

    if (token === '--source-mode') {
      options.sourceMode = argv[index + 1] || '';
      index += 1;
      continue;
    }

    if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
      continue;
    }

    options.invalidInput = `Unsupported argument: ${token}`;
  }

  if (options.sourceMode !== 'fixture') {
    options.invalidInput = `Unsupported source mode: ${options.sourceMode}`;
  }

  return options;
}

function buildUsageText() {
  return [
    'Usage: node src/cli/migration-import-export-dry-run-gate.js [--json] [--source-mode fixture]',
    '',
    'Modes:',
    '  --json                  Emit the fixture-only migration/import-export dry-run gate report as JSON.',
    '  --source-mode fixture   Use the committed synthetic fixture only.',
    '  --help                  Show this usage text.',
    '',
    'This CLI reads only tests/fixtures/migration-import-export-dry-run-gate-v1.json and never scans real memory, mutates durable state, calls providers, expands public MCP tools, pushes, tags, releases, or deploys.'
  ].join('\n');
}

function loadFixture() {
  return JSON.parse(fs.readFileSync(DEFAULT_FIXTURE_PATH, 'utf8'));
}

function cloneReport(report) {
  return JSON.parse(JSON.stringify(report));
}

function buildFallbackReport() {
  return {
    schema: 'codex-memory.migration-import-export-dry-run-gate.v1',
    phase: 'P26.3-migration-import-export-dry-run-gate-implementation',
    fixtureOnly: true,
    synthetic: true,
    status: 'blocked',
    decision: 'DRY_RUN_INVALID_INPUT',
    mutated: false,
    providerCalls: 0,
    publicMcpTools: PUBLIC_MCP_TOOLS,
    checks: {},
    requiredApprovals: [],
    safetyFlags: {
      realMemoryScan: false,
      realMemoryExport: false,
      realMemoryImport: false,
      migrationApply: false,
      importExportApply: false,
      backupRestore: false,
      durableWrites: false,
      providerCalls: false,
      publicMcpExpansion: false,
      push: false,
      tag: false,
      release: false,
      deploy: false
    },
    evidence: {
      secretWorkspaceExposure: {
        rawSecretExposed: false,
        rawWorkspaceExposed: false
      }
    },
    nextStep: 'rerun-without-unsafe-flags'
  };
}

function normalizeSafety(report) {
  return {
    ...report,
    mutated: false,
    providerCalls: 0,
    publicMcpTools: Array.isArray(report.publicMcpTools) ? report.publicMcpTools : PUBLIC_MCP_TOOLS,
    safetyFlags: {
      ...report.safetyFlags,
      realMemoryScan: false,
      realMemoryExport: false,
      realMemoryImport: false,
      migrationApply: false,
      importExportApply: false,
      backupRestore: false,
      durableWrites: false,
      providerCalls: false,
      publicMcpExpansion: false,
      push: false,
      tag: false,
      release: false,
      deploy: false
    }
  };
}

function buildReport({ fixture, rejectedFlag = null, invalidInput = null } = {}) {
  const report = normalizeSafety(cloneReport(fixture));
  const reason = rejectedFlag
    ? `${rejectedFlag} is outside the fixture-only migration/import-export dry-run gate boundary.`
    : invalidInput;

  if (!reason) {
    return report;
  }

  return {
    ...report,
    status: 'blocked',
    decision: 'DRY_RUN_INVALID_INPUT',
    error: {
      code: rejectedFlag ? 'UNSAFE_FLAG_REJECTED' : 'INVALID_INPUT',
      message: reason,
      rejectedFlag,
      failClosed: true
    },
    nextStep: 'rerun-without-unsafe-flags'
  };
}

function renderText(report) {
  return [
    `schema: ${report.schema}`,
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `fixtureOnly: ${report.fixtureOnly}`,
    `mutated: ${report.mutated}`,
    `providerCalls: ${report.providerCalls}`,
    `publicMcpTools: ${report.publicMcpTools.join(',')}`
  ].join('\n') + '\n';
}

function getExitCode(report) {
  return report.decision === 'DRY_RUN_INVALID_INPUT' ? 1 : 0;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(`${buildUsageText()}\n`);
    process.exitCode = 0;
    return;
  }

  let fixture;
  try {
    fixture = loadFixture();
  } catch (error) {
    fixture = buildFallbackReport();
    options.invalidInput = error.message || 'failed to load fixture-only migration/import-export dry-run gate report';
  }

  const report = buildReport({
    fixture,
    rejectedFlag: options.rejectedFlag,
    invalidInput: options.invalidInput
  });

  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : renderText(report));
  process.exitCode = getExitCode(report);
}

if (require.main === module) {
  main();
}

module.exports = {
  DEFAULT_FIXTURE_PATH,
  PUBLIC_MCP_TOOLS,
  REJECTED_FLAGS,
  parseArgs,
  buildUsageText,
  loadFixture,
  buildReport,
  renderText,
  getExitCode
};
