#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  EXACT_APPROVAL_TOKEN,
  OPERATOR_EXECUTION_TOKEN,
  buildPersistentTagMemoEnrichmentProofCommand
} = require('../src/tagmemo/persistent-enrichment-proof-command');

const FIXTURE_FILE = 'tagmemo-persistent-enrichment-proof-command-sprint-e-v1.json';
const DEFAULT_FIXTURE = path.join(__dirname, '..', 'tests', 'fixtures', FIXTURE_FILE);

function parseArgs(argv) {
  const parsed = {
    mode: 'dry-run',
    fixture: DEFAULT_FIXTURE,
    caseId: 'valid-active-dry-run-plan',
    maxWriteCount: 1,
    approvalToken: null,
    operatorExecutionToken: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--mode') {
      parsed.mode = next;
      index += 1;
    } else if (arg === '--fixture') {
      parsed.fixture = next;
      index += 1;
    } else if (arg === '--case') {
      parsed.caseId = next;
      index += 1;
    } else if (arg === '--max-write-count') {
      parsed.maxWriteCount = Number(next);
      index += 1;
    } else if (arg === '--approval') {
      parsed.approvalToken = next;
      index += 1;
    } else if (arg === '--operator-approval') {
      parsed.operatorExecutionToken = next;
      index += 1;
    } else if (arg === '--approval-placeholder') {
      parsed.approvalToken = EXACT_APPROVAL_TOKEN;
    } else if (arg === '--operator-approval-placeholder') {
      parsed.operatorExecutionToken = OPERATOR_EXECUTION_TOKEN;
    } else {
      throw new Error(`unsupported argument: ${arg}`);
    }
  }

  return parsed;
}

function loadFixtureCase(fixturePath, caseId) {
  const resolved = path.resolve(fixturePath || DEFAULT_FIXTURE);
  if (path.basename(resolved) !== FIXTURE_FILE) {
    throw new Error('unsupported fixture path');
  }

  const fixture = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  const testCase = fixture.cases.find(item => item.id === caseId);
  if (!testCase) throw new Error('fixture case not found');
  return testCase.input;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const input = loadFixtureCase(args.fixture, args.caseId);
  const output = buildPersistentTagMemoEnrichmentProofCommand(input, {
    mode: args.mode,
    maxWriteCount: args.maxWriteCount,
    approvalToken: args.approvalToken,
    operatorExecutionToken: args.operatorExecutionToken
  });
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  return output;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      status: 'rejected',
      reason: error.message,
      lowDisclosure: true
    })}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_FIXTURE,
  FIXTURE_FILE,
  loadFixtureCase,
  main,
  parseArgs
};
