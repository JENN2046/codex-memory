#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_FIXTURE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'vcp-memory-migration-readiness-v1.json'
);

const REJECTED_FLAGS = new Set(['--apply', '--migrate', '--confirm']);

function parseArgs(argv = []) {
  const options = {
    json: false,
    fixturePath: DEFAULT_FIXTURE_PATH,
    rejectedFlag: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--fixture') {
      options.fixturePath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
      continue;
    }
  }

  return options;
}

function loadFixture(fixturePath = DEFAULT_FIXTURE_PATH) {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function buildReport({ fixture, rejectedFlag = null } = {}) {
  if (rejectedFlag) {
    return {
      status: 'error',
      mutated: false,
      migrationBlocked: true,
      rejectedFlag,
      error: `${rejectedFlag} is not supported by VCP memory migration readiness.`,
      nextStep: 'Re-run without apply/migrate/confirm flags.'
    };
  }

  return {
    status: fixture.migrationBlocked ? 'blocked' : 'ready',
    phase: fixture.phase,
    schemaVersion: fixture.schemaVersion,
    fixtureOnly: fixture.fixtureOnly === true,
    mutated: false,
    objectModelFixtureReady: fixture.readiness.objectModelFixtureReady === true,
    roundTripFixtureReady: fixture.readiness.roundTripFixtureReady === true,
    mappingFixtureReady: fixture.readiness.mappingFixtureReady === true,
    mappingDryRunCliReady: fixture.readiness.mappingDryRunCliReady === true,
    importExportShapeReady: fixture.readiness.importExportShapeReady === true,
    missingPrerequisites: fixture.missingPrerequisites || [],
    migrationBlocked: fixture.migrationBlocked === true,
    migrationBlockers: fixture.migrationBlockers || [],
    requiredApprovals: fixture.requiredApprovals || [],
    riskLevel: fixture.riskLevel,
    nextStep: fixture.nextStep,
    noMigration: fixture.noMigration === true,
    noSQLiteWrite: fixture.noSQLiteWrite === true,
    noDiaryWrite: fixture.noDiaryWrite === true,
    noImportExportApply: fixture.noImportExportApply === true,
    noRealDbMemoryWrite: fixture.noRealDbMemoryWrite === true,
    noMcpPublicToolExpansion: fixture.noMcpPublicToolExpansion === true,
    publicTools: fixture.publicTools,
    rawWorkspaceIdExposed: false,
    rawSecretExposed: false
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `mutated: ${report.mutated}`,
    `migrationBlocked: ${report.migrationBlocked}`
  ];

  if (report.status === 'error') {
    lines.push(`rejectedFlag: ${report.rejectedFlag}`);
    lines.push(`error: ${report.error}`);
    lines.push(`nextStep: ${report.nextStep}`);
    return `${lines.join('\n')}\n`;
  }

  lines.push(`objectModelFixtureReady: ${report.objectModelFixtureReady}`);
  lines.push(`roundTripFixtureReady: ${report.roundTripFixtureReady}`);
  lines.push(`mappingFixtureReady: ${report.mappingFixtureReady}`);
  lines.push(`mappingDryRunCliReady: ${report.mappingDryRunCliReady}`);
  lines.push(`importExportShapeReady: ${report.importExportShapeReady}`);
  lines.push(`missingPrerequisites: ${report.missingPrerequisites.join(',')}`);
  lines.push(`migrationBlockers: ${report.migrationBlockers.join('; ')}`);
  lines.push(`requiredApprovals: ${report.requiredApprovals.join('; ')}`);
  lines.push(`riskLevel: ${report.riskLevel}`);
  lines.push(`nextStep: ${report.nextStep}`);
  return `${lines.join('\n')}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  let report;
  try {
    const fixture = loadFixture(options.fixturePath);
    report = buildReport({ fixture, rejectedFlag: options.rejectedFlag });
  } catch (error) {
    report = {
      status: 'error',
      mutated: false,
      migrationBlocked: true,
      error: error.message || 'failed to load VCP memory migration readiness fixture',
      nextStep: 'Check the fixture path and rerun.'
    };
  }

  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : renderText(report));
  process.exitCode = report.status === 'error' ? 1 : 0;
}

if (require.main === module) {
  main();
}

module.exports = {
  DEFAULT_FIXTURE_PATH,
  parseArgs,
  loadFixture,
  buildReport,
  renderText
};
