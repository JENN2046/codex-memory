#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const FIXTURE_ROOT = path.join(WORKSPACE_ROOT, 'tests', 'fixtures');
const DEFAULT_FIXTURE_PATH = path.join(FIXTURE_ROOT, 'schema-compatibility-dry-run-v1.json');

const REJECTED_FLAGS = new Set([
  '--apply',
  '--confirm',
  '--migrate',
  '--write',
  '--mutate',
  '--import',
  '--export',
  '--real-memory',
  '--provider',
  '--start-service',
  '--deploy',
  '--release',
  '--push'
]);

function parseArgs(argv = []) {
  const options = {
    json: false,
    strict: false,
    help: false,
    fixturePath: DEFAULT_FIXTURE_PATH,
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
    if (token === '--strict') {
      options.strict = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (token === '--fixture') {
      options.fixturePath = path.resolve(argv[index + 1] || '');
      index += 1;
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
  }

  if (options.sourceMode !== 'fixture') {
    options.invalidInput = `Unsupported source mode: ${options.sourceMode}`;
  }

  return options;
}

function buildUsageText() {
  return [
    'Usage: node src/cli/schema-compatibility-dry-run.js --json [--strict] [--source-mode fixture] [--fixture PATH]',
    '',
    'Modes:',
    '  --json                  Emit the fixture-only schema compatibility dry-run report as JSON.',
    '  --strict                Exit non-zero when the dry-run decision is blocked.',
    '  --source-mode fixture   Use committed synthetic fixture data only.',
    '  --fixture PATH          Read a fixture from tests/fixtures.',
    '  --help                  Show this usage text without reading real memory or running live checks.',
    '',
    'This CLI never scans real memory, starts services, calls providers, applies migrations, writes durable state, changes MCP tools, pushes, tags, releases, or deploys.'
  ].join('\n');
}

function assertFixturePathAllowed(fixturePath) {
  const resolved = path.resolve(fixturePath);
  const relative = path.relative(FIXTURE_ROOT, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Fixture path must stay under tests/fixtures.');
  }
  return resolved;
}

function loadFixture(fixturePath = DEFAULT_FIXTURE_PATH) {
  const allowedPath = assertFixturePathAllowed(fixturePath);
  return JSON.parse(fs.readFileSync(allowedPath, 'utf8'));
}

function cloneReport(report) {
  return JSON.parse(JSON.stringify(report));
}

function buildSafetyOverride(report) {
  return {
    ...report.safety,
    dryRun: true,
    mutated: false,
    providerCalls: 0,
    durableMemoryTouched: false,
    realMemoryScanned: false,
    serviceStarted: false,
    migrationApplied: false,
    importExportApplied: false,
    backupCreated: false,
    runtimeEnforcementChanged: false,
    packageChanged: false,
    configChanged: false,
    publicMcpExpanded: false,
    pushed: false,
    tagged: false,
    released: false,
    deployed: false,
    credentialValuesExposed: false,
    rawWorkspaceIdsExposed: false
  };
}

function buildReport({ fixture, rejectedFlag = null, invalidInput = null } = {}) {
  const report = cloneReport(fixture.sampleReport);
  const blockerReason = rejectedFlag
    ? `${rejectedFlag} is outside the fixture-only schema compatibility dry-run boundary.`
    : invalidInput;

  const baseReport = {
    ...report,
    phase: 'P25.6-schema-compatibility-dry-run-cli-fixture-only',
    source: {
      ...report.source,
      mode: 'fixture',
      fixture: path.relative(WORKSPACE_ROOT, DEFAULT_FIXTURE_PATH).replace(/\\/g, '/'),
      realMemoryScanned: false,
      sandboxPathRequired: false
    },
    compatibility: {
      ...report.compatibility,
      runtimeEnforcementImplemented: false,
      migrationRequired: false,
      importExportApplyRequired: false
    },
    safety: buildSafetyOverride(report),
    next: {
      ...report.next,
      runtimeEnforcementStillBlocked: true,
      requiresApprovalForRealMemoryScan: true,
      requiresApprovalForMigrationApply: true,
      requiresApprovalForImportExportApply: true,
      requiresApprovalForPackageScript: true
    }
  };

  if (!rejectedFlag && !invalidInput) {
    return baseReport;
  }

  return {
    ...baseReport,
    decision: 'DRY_RUN_INVALID_INPUT',
    summary: {
      ...baseReport.summary,
      compatibleCount: 0,
      warningCount: 0,
      blockerCount: 1
    },
    blockers: [
      {
        id: rejectedFlag ? 'rejected-unsafe-flag' : 'invalid-source-mode',
        reason: blockerReason,
        rejectedFlag,
        mutated: false
      }
    ],
    warnings: [],
    safety: buildSafetyOverride(baseReport),
    next: {
      ...baseReport.next,
      rerunWithoutUnsafeFlags: Boolean(rejectedFlag),
      useFixtureSourceMode: true
    }
  };
}

function renderText(report) {
  return [
    `schema: ${report.schema}`,
    `phase: ${report.phase}`,
    `decision: ${report.decision}`,
    `source.mode: ${report.source.mode}`,
    `mutated: ${report.safety.mutated}`,
    `realMemoryScanned: ${report.safety.realMemoryScanned}`,
    `providerCalls: ${report.safety.providerCalls}`,
    `serviceStarted: ${report.safety.serviceStarted}`,
    `runtimeEnforcementImplemented: ${report.compatibility.runtimeEnforcementImplemented}`
  ].join('\n') + '\n';
}

function getExitCode(report, { strict = false } = {}) {
  if (report.decision === 'DRY_RUN_INVALID_INPUT') {
    return 1;
  }
  if (strict && report.decision === 'DRY_RUN_BLOCKED') {
    return 1;
  }
  return 0;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${buildUsageText()}\n`);
    process.exitCode = 0;
    return;
  }

  let report;
  try {
    const fixture = loadFixture(options.fixturePath);
    report = buildReport({
      fixture,
      rejectedFlag: options.rejectedFlag,
      invalidInput: options.invalidInput
    });
  } catch (error) {
    const fixture = {
      sampleReport: {
        schema: 'codex-memory.schema-compatibility-dry-run.v1',
        phase: 'P25.6-schema-compatibility-dry-run-cli-fixture-only',
        decision: 'DRY_RUN_INVALID_INPUT',
        source: {
          mode: 'fixture',
          fixture: 'tests/fixtures/schema-compatibility-dry-run-v1.json',
          realMemoryScanned: false,
          sandboxPathRequired: false
        },
        summary: {
          familiesChecked: 0,
          policyCaseCount: 0,
          acceptedPolicyCount: 0,
          missingPolicyCount: 0,
          unknownPolicyCount: 0,
          compatibleCount: 0,
          warningCount: 0,
          blockerCount: 1,
          rejectedFlagCount: REJECTED_FLAGS.size
        },
        compatibility: {
          missingVersionFallbackAccepted: false,
          unknownReadVersionPolicy: 'invalid_input',
          unknownWriteVersionPolicy: 'reject',
          runtimeEnforcementImplemented: false,
          migrationRequired: false,
          importExportApplyRequired: false
        },
        families: [],
        blockers: [],
        warnings: [],
        rejectedFlags: Array.from(REJECTED_FLAGS),
        publicMcpTools: {
          frozen: true,
          tools: [
            'record_memory',
            'search_memory',
            'memory_overview'
          ]
        },
        safety: {
          dryRun: true,
          mutated: false,
          providerCalls: 0,
          durableMemoryTouched: false,
          realMemoryScanned: false,
          serviceStarted: false,
          migrationApplied: false,
          importExportApplied: false,
          backupCreated: false,
          runtimeEnforcementChanged: false,
          packageChanged: false,
          configChanged: false,
          publicMcpExpanded: false,
          pushed: false,
          tagged: false,
          released: false,
          deployed: false,
          credentialValuesExposed: false,
          rawWorkspaceIdsExposed: false
        },
        next: {
          runtimeEnforcementStillBlocked: true,
          requiresApprovalForRealMemoryScan: true,
          requiresApprovalForMigrationApply: true,
          requiresApprovalForImportExportApply: true,
          requiresApprovalForPackageScript: true
        }
      }
    };
    report = buildReport({
      fixture,
      invalidInput: error.message || 'failed to load schema compatibility dry-run fixture'
    });
  }

  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : renderText(report));
  process.exitCode = getExitCode(report, { strict: options.strict });
}

if (require.main === module) {
  main();
}

module.exports = {
  DEFAULT_FIXTURE_PATH,
  FIXTURE_ROOT,
  REJECTED_FLAGS,
  parseArgs,
  buildUsageText,
  assertFixturePathAllowed,
  loadFixture,
  buildReport,
  renderText,
  getExitCode
};
