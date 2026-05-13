#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SUITE = path.join('benchmarks', 'real-query-suite', 'v1.json');

function parseArgs(argv = []) {
  const options = { json: false, suiteFile: DEFAULT_SUITE };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') { options.json = true; continue; }
    if (argv[i] === '--suite') { options.suiteFile = argv[i + 1] || options.suiteFile; i += 1; continue; }
  }
  return options;
}

function validateCase(caseItem) {
  const issues = [];
  if (!caseItem.id || typeof caseItem.id !== 'string') issues.push('missing or invalid id');
  if (!caseItem.area || typeof caseItem.area !== 'string') issues.push('missing or invalid area');
  if (!caseItem.query || typeof caseItem.query !== 'string') issues.push('missing or invalid query');
  if (!caseItem.target || typeof caseItem.target !== 'string') issues.push('missing or invalid target');
  if (!caseItem.expected || typeof caseItem.expected !== 'object') issues.push('missing or invalid expected');
  if (caseItem.expected && caseItem.expected.mustContain && !Array.isArray(caseItem.expected.mustContain)) {
    issues.push('expected.mustContain must be an array');
  }
  if (caseItem.expected && caseItem.expected.mustNotContain && !Array.isArray(caseItem.expected.mustNotContain)) {
    issues.push('expected.mustNotContain must be an array');
  }
  return issues;
}

function runSuite(suitePath) {
  const fullPath = path.resolve(suitePath);
  if (!fs.existsSync(fullPath)) {
    return {
      status: 'error',
      suiteFile: suitePath,
      caseCount: 0,
      invalidCount: 0,
      placeholderCount: 0,
      reason: `suite file not found: ${fullPath}`
    };
  }

  let suite;
  try {
    suite = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (error) {
    return {
      status: 'error',
      suiteFile: suitePath,
      caseCount: 0,
      invalidCount: 0,
      placeholderCount: 0,
      reason: `failed to parse suite JSON: ${error.message}`
    };
  }

  const cases = Array.isArray(suite.cases) ? suite.cases : [];
  let invalidCount = 0;
  let placeholderCount = 0;
  let fixtureOnlyCount = 0;
  const invalidReasons = [];

  for (const caseItem of cases) {
    const issues = validateCase(caseItem);
    if (issues.length > 0) {
      invalidCount += 1;
      invalidReasons.push({ id: caseItem.id || 'unknown', issues });
      continue;
    }
    if ((caseItem.notes || '').toLowerCase().includes('placeholder')) {
      placeholderCount += 1;
    }
    if ((caseItem.notes || '').toLowerCase().includes('fixture-only')) {
      fixtureOnlyCount += 1;
    }
  }

  const validCount = cases.length - invalidCount;
  const realCount = validCount - placeholderCount;
  return {
    status: 'ok',
    suiteFile: suitePath,
    version: suite.version || 'unknown',
    caseCount: cases.length,
    invalidCount,
    placeholderCount,
    fixtureOnlyCount,
    validCount,
    realCount: realCount > 0 ? realCount : 0,
    ...(invalidReasons.length > 0 ? { invalidReasons } : {})
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = runSuite(options.suiteFile);

  if (options.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write(`status: ${report.status}\n`);
    process.stdout.write(`suiteFile: ${report.suiteFile}\n`);
    process.stdout.write(`version: ${report.version}\n`);
    process.stdout.write(`caseCount: ${report.caseCount}\n`);
    process.stdout.write(`invalidCount: ${report.invalidCount}\n`);
    process.stdout.write(`placeholderCount: ${report.placeholderCount}\n`);
    process.stdout.write(`fixtureOnlyCount: ${report.fixtureOnlyCount}\n`);
    process.stdout.write(`realCount: ${report.realCount}\n`);
  }

  process.exitCode = report.status === 'error' ? 1 : 0;
}

main();
