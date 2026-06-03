#!/usr/bin/env node
'use strict';

const {
  runQueryQualityTempDbGate
} = require('../core/QueryQualityTempDbGate');

function parseArgs(argv = []) {
  const options = { json: false };
  for (const arg of argv) {
    if (arg === '--json') {
      options.json = true;
    }
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await runQueryQualityTempDbGate();

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`status: ${report.status}\n`);
    process.stdout.write(`ok: ${report.ok}\n`);
    process.stdout.write(`caseCount: ${report.caseCount}\n`);
    process.stdout.write(`passedCount: ${report.passedCount}\n`);
    process.stdout.write(`failedCount: ${report.failedCount}\n`);
    process.stdout.write(`syntheticRecordsWritten: ${report.syntheticRecordsWritten}\n`);
    process.stdout.write(`tempDbCreated: ${report.tempDb.created}\n`);
    process.stdout.write(`providerCalls: ${report.sideEffects.providerCalls}\n`);
    process.stdout.write(`durableAuditWrites: ${report.sideEffects.durableAuditWrites}\n`);
  }

  process.exitCode = report.ok ? 0 : 1;
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
