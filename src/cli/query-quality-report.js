#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SUITE = path.join('benchmarks', 'real-query-suite', 'v1.json');

function parseArgs(argv = []) {
  const options = { json: false, dryRun: false, suiteFile: DEFAULT_SUITE };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') { options.json = true; continue; }
    if (argv[i] === '--dry-run') { options.dryRun = true; continue; }
    if (argv[i] === '--suite') { options.suiteFile = argv[i + 1] || options.suiteFile; i += 1; continue; }
  }
  return options;
}

function loadSuite(suitePath) {
  const fullPath = path.resolve(suitePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch {
    return null;
  }
}

function validateCase(caseItem) {
  const issues = [];
  if (!caseItem.id) issues.push('missing id');
  if (!caseItem.area) issues.push('missing area');
  if (!caseItem.query) issues.push('missing query');
  if (!caseItem.target) issues.push('missing target');
  if (!caseItem.expected || typeof caseItem.expected !== 'object') issues.push('missing expected');
  if (caseItem.expected && caseItem.expected.mustContain && !Array.isArray(caseItem.expected.mustContain)) {
    issues.push('expected.mustContain must be an array');
  }
  if (caseItem.expected && caseItem.expected.mustNotContain && !Array.isArray(caseItem.expected.mustNotContain)) {
    issues.push('expected.mustNotContain must be an array');
  }
  return issues;
}

function runReport(options) {
  const suite = loadSuite(options.suiteFile);
  if (!suite) {
    return {
      status: 'error',
      caseCount: 0,
      runnableCount: 0,
      placeholderCount: 0,
      invalidCount: 0,
      mutated: false,
      reason: `suite not found or unparseable: ${options.suiteFile}`
    };
  }

  const cases = Array.isArray(suite.cases) ? suite.cases : [];
  let invalidCount = 0;
  let placeholderCount = 0;
  let fixtureOnlyCount = 0;

  for (const caseItem of cases) {
    const issues = validateCase(caseItem);
    if (issues.length > 0) {
      invalidCount += 1;
      continue;
    }
    if ((caseItem.notes || '').toLowerCase().includes('placeholder')) {
      placeholderCount += 1;
    }
    if ((caseItem.notes || '').toLowerCase().includes('fixture-only')) {
      fixtureOnlyCount += 1;
    }
  }

  const runnableCount = cases.length - invalidCount;
  const realCount = runnableCount - placeholderCount;

  return {
    status: 'ok',
    caseCount: cases.length,
    runnableCount,
    placeholderCount,
    fixtureOnlyCount,
    invalidCount,
    realCount: realCount > 0 ? realCount : 0,
    mutated: false
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = runReport(options);

  if (options.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write(`status: ${report.status}\n`);
    process.stdout.write(`caseCount: ${report.caseCount}\n`);
    process.stdout.write(`runnableCount: ${report.runnableCount}\n`);
    process.stdout.write(`placeholderCount: ${report.placeholderCount}\n`);
    process.stdout.write(`fixtureOnlyCount: ${report.fixtureOnlyCount}\n`);
    process.stdout.write(`realCount: ${report.realCount}\n`);
    process.stdout.write(`invalidCount: ${report.invalidCount}\n`);
    process.stdout.write(`mutated: ${report.mutated}\n`);
  }

  process.exitCode = report.status === 'error' ? 1 : 0;
}

main();
