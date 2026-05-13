#!/usr/bin/env node
const { parseSuiteArgs, runSuiteReport } = require('./real-query-suite-core');

async function main() {
  const options = parseSuiteArgs(process.argv.slice(2));
  const report = runSuiteReport(options.suiteFile);

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
    process.stdout.write(`assertedCount: ${report.assertedCount}\n`);
    process.stdout.write(`passedCount: ${report.passedCount}\n`);
    process.stdout.write(`failedCount: ${report.failedCount}\n`);
  }

  process.exitCode = report.status === 'error' || report.status === 'failed' ? 1 : 0;
}

main();
