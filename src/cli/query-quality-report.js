#!/usr/bin/env node
const { parseSuiteArgs, runSuiteReport } = require('./real-query-suite-core');

function runReport(options) {
  const report = runSuiteReport(options.suiteFile, {
    fixtureRecallDryRun: options.fixtureRecallDryRun
  });
  if (report.status === 'error') {
    return {
      status: 'error',
      caseCount: 0,
      runnableCount: 0,
      placeholderCount: 0,
      fixtureOnlyCount: 0,
      invalidCount: 0,
      realCount: 0,
      assertedCount: 0,
      passedCount: 0,
      failedCount: 0,
      mutated: false,
      reason: report.reason
    };
  }

  return {
    status: report.status,
    caseCount: report.caseCount,
    runnableCount: report.validCount,
    placeholderCount: report.placeholderCount,
    fixtureOnlyCount: report.fixtureOnlyCount,
    invalidCount: report.invalidCount,
    realCount: report.realCount,
    assertedCount: report.assertedCount,
    passedCount: report.passedCount,
    failedCount: report.failedCount,
    mutated: false,
    ...(report.fixtureRecallDryRun ? { fixtureRecallDryRun: report.fixtureRecallDryRun } : {}),
    ...(report.assertionFailures ? { assertionFailures: report.assertionFailures } : {}),
    ...(report.invalidReasons ? { invalidReasons: report.invalidReasons } : {})
  };
}

async function main() {
  const options = parseSuiteArgs(process.argv.slice(2), { dryRun: false });
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
    process.stdout.write(`assertedCount: ${report.assertedCount}\n`);
    process.stdout.write(`passedCount: ${report.passedCount}\n`);
    process.stdout.write(`failedCount: ${report.failedCount}\n`);
    process.stdout.write(`invalidCount: ${report.invalidCount}\n`);
    process.stdout.write(`mutated: ${report.mutated}\n`);
    if (report.fixtureRecallDryRun) {
      process.stdout.write(`fixtureRecallDryRun: ${report.fixtureRecallDryRun.passedCount}/${report.fixtureRecallDryRun.caseCount}\n`);
    }
  }

  process.exitCode = report.status === 'error' || report.status === 'failed' ? 1 : 0;
}

main();
