#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {
  EXPECTED_ROUTED_OUTCOME_DECISION,
  REQUIRED_STILL_OUT_OF_SCOPE_ACTIONS,
  evaluateAuthorizedWritePathWideningReview
} = require('../core/AuthorizedWritePathWideningReview');
const {
  applyAutoAuthorizationEscalationToWideningReviewInput
} = require('../core/AutoAuthorizationEscalationToWideningReviewAdapter');
const {
  applyRoutingOutcomeRecordToWideningReviewInput,
  buildRoutingOutcomeRecordInputTrace,
  loadRoutingOutcomeRecordFile
} = require('../core/RoutingOutcomeRecordAdapter');
const {
  ALLOWED_LATEST_REBOUND_OUTCOME_CLASSES,
  applyAssertionRecordToPreflightInput,
  buildAssertionRecordInputTrace,
  loadAssertionRecordFile
} = require('../core/ExternalTokenMaterialAssertionRecordAdapter');

const DEFAULT_FIXTURE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'authorized-write-path-widening-review-v1.json'
);
const AUTO_AUTHORIZATION_FIXTURE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'authorized-write-path-auto-authorization-preflight-v1.json'
);

const REJECTED_FLAGS = new Set([
  '--execute',
  '--record-memory',
  '--search-memory',
  '--provider',
  '--start-service',
  '--write',
  '--apply',
  '--cm0595'
]);

function parseArgs(argv = []) {
  const options = {
    json: false,
    pretty: false,
    help: false,
    showRenderedReviewText: false,
    fixturePath: DEFAULT_FIXTURE_PATH,
    routingOutcomeRecordPath: '',
    autoAuthorizationAssertionRecordPath: '',
    autoAuthorizationLatestReboundOutcomeClass: '',
    rejectedFlag: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--pretty') {
      options.pretty = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (token === '--rendered-review-text') {
      options.showRenderedReviewText = true;
      continue;
    }
    if (token === '--fixture') {
      options.fixturePath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--routing-outcome-record') {
      options.routingOutcomeRecordPath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--auto-auth-assertion-record') {
      options.autoAuthorizationAssertionRecordPath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--auto-auth-latest-rebound-outcome-class') {
      options.autoAuthorizationLatestReboundOutcomeClass = String(argv[index + 1] || '').trim();
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

function loadAutoAuthorizationFixture() {
  return JSON.parse(fs.readFileSync(AUTO_AUTHORIZATION_FIXTURE_PATH, 'utf8'));
}

function prepareInput(options = {}) {
  const fixture = loadFixture(options.fixturePath);
  if (options.routingOutcomeRecordPath) {
    const loadResult = loadRoutingOutcomeRecordFile(options.routingOutcomeRecordPath);
    const adapted = applyRoutingOutcomeRecordToWideningReviewInput(fixture, loadResult.record);
    if (adapted.ok !== true) {
      const error = new Error(adapted.failClosedReasons?.[0] || 'routing_outcome_record_apply_failed');
      error.failClosedReason = adapted.failClosedReasons?.[0] || 'routing_outcome_record_apply_failed';
      throw error;
    }

    return {
      input: adapted.mergedInput,
      source: 'cm0645_explicit_input_fixture_plus_routing_outcome_record_v1',
      routingOutcomeRecordInputTrace: buildRoutingOutcomeRecordInputTrace({
        loadResult,
        normalizedRoutingOutcomeRecord: adapted.normalizedRoutingOutcomeRecord
      })
    };
  }

  if (options.autoAuthorizationAssertionRecordPath || options.autoAuthorizationLatestReboundOutcomeClass) {
    const autoAuthorizationFixture = loadAutoAuthorizationFixture();
    let autoAuthorizationInput = autoAuthorizationFixture;
    let assertionRecordInputTrace = null;

    if (options.autoAuthorizationAssertionRecordPath) {
      const loadResult = loadAssertionRecordFile(options.autoAuthorizationAssertionRecordPath);
      const adaptedAssertion = applyAssertionRecordToPreflightInput(autoAuthorizationFixture, loadResult.record, {
        latestReboundOutcomeClass: options.autoAuthorizationLatestReboundOutcomeClass
      });
      if (adaptedAssertion.ok !== true) {
        const error = new Error(adaptedAssertion.failClosedReasons?.[0] || 'assertion_record_apply_failed');
        error.failClosedReason = adaptedAssertion.failClosedReasons?.[0] || 'assertion_record_apply_failed';
        throw error;
      }
      autoAuthorizationInput = adaptedAssertion.mergedInput;
      assertionRecordInputTrace = buildAssertionRecordInputTrace({
        loadResult,
        normalizedAssertionRecord: adaptedAssertion.normalizedAssertionRecord,
        assertionAcceptedForC6: adaptedAssertion.assertionAcceptedForC6 === true,
        latestReboundOutcomeClass: options.autoAuthorizationLatestReboundOutcomeClass
      });
    } else if (options.autoAuthorizationLatestReboundOutcomeClass) {
      if (!ALLOWED_LATEST_REBOUND_OUTCOME_CLASSES.includes(options.autoAuthorizationLatestReboundOutcomeClass)) {
        const error = new Error('unsupported_latest_rebound_outcome_override');
        error.failClosedReason = 'unsupported_latest_rebound_outcome_override';
        throw error;
      }
      autoAuthorizationInput = {
        ...autoAuthorizationFixture,
        latestReboundOutcomeClass: options.autoAuthorizationLatestReboundOutcomeClass
      };
    }

    const bridged = applyAutoAuthorizationEscalationToWideningReviewInput(
      fixture,
      autoAuthorizationInput,
      { assertionRecordInputTrace }
    );
    if (bridged.ok === true) {
      return {
        input: bridged.mergedInput,
        source: bridged.source,
        routingOutcomeRecordInputTrace: bridged.routingOutcomeRecordInputTrace || null
      };
    }
  }

  return {
    input: fixture,
    source: 'cm0643_explicit_input_fixture_v1',
    routingOutcomeRecordInputTrace: null
  };
}

function buildUsageText() {
  return [
    'Usage: node src/cli/authorized-write-path-widening-review.js [--json] [--pretty] [--rendered-review-text] [--fixture PATH] [--routing-outcome-record PATH] [--auto-auth-assertion-record PATH] [--auto-auth-latest-rebound-outcome-class token_present]',
    '',
    'This governance-only CLI evaluates whether a routed token-present result may pass CM-0604 widening review,',
    'but it never issues approval, never executes CM-0601, and never auto-authorizes CM-0595.',
    '',
    `Expected routed outcome decision: ${EXPECTED_ROUTED_OUTCOME_DECISION}`,
    `Required still-out-of-scope actions: ${REQUIRED_STILL_OUT_OF_SCOPE_ACTIONS.join(', ')}`
  ].join('\n');
}

function buildRejectedReport(rejectedFlag) {
  return {
    status: 'error',
    rejectedFlag,
    mutated: false,
    error: `${rejectedFlag} is outside the authorized write-path widening-review CLI boundary.`,
    nextStep: 'Re-run without execute/write/provider/start-service/CM-0595 flags.'
  };
}

function buildReport(options = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }
  const preparedInput = prepareInput(options);
  return {
    ...evaluateAuthorizedWritePathWideningReview(preparedInput.input),
    source: preparedInput.source,
    routingOutcomeRecordInputTrace: preparedInput.routingOutcomeRecordInputTrace || null
  };
}

function renderText(report, options = {}) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `controllingState: ${report.controllingState}`,
    `cm0604Satisfied: ${report.cm0604Satisfied}`,
    `cm0606BridgeActivated: ${report.cm0606BridgeActivated}`,
    `proceedToCm0607AdoptionRecord: ${report.proceedToCm0607AdoptionRecord}`,
    `renderedReviewTextSurfaceAvailable: ${report.renderedReviewTextSurface?.previewAvailable === true}`,
    `renderedReviewTextSurfaceUsableNow: ${report.renderedReviewTextSurface?.previewUsableNow === true}`,
    `canAutoAuthorizeCm0595: ${report.canAutoAuthorizeCm0595}`,
    `canExecuteRuntimeNow: ${report.canExecuteRuntimeNow}`
  ];

  if (Array.isArray(report.reviewChecklistFailures) && report.reviewChecklistFailures.length > 0) {
    lines.push(`reviewChecklistFailures: ${report.reviewChecklistFailures.join(', ')}`);
  }
  if (Array.isArray(report.failClosedReasons) && report.failClosedReasons.length > 0) {
    lines.push(`failClosedReasons: ${report.failClosedReasons.join(', ')}`);
  }
  if (report.routingOutcomeRecordInputTrace?.sourceWorkspaceRelativePath) {
    lines.push(`routingOutcomeRecord: ${report.routingOutcomeRecordInputTrace.sourceWorkspaceRelativePath}`);
  }
  if (report.reviewRecordDraft?.nextBoundary) {
    lines.push(`nextBoundary: ${report.reviewRecordDraft.nextBoundary}`);
  }
  lines.push(`nextStep: ${report.nextStep}`);

  if (options.showRenderedReviewText === true && report.renderedReviewTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-review-text]');
    lines.push(report.renderedReviewTextSurface.markdown.trimEnd());
  }

  return `${lines.join('\n')}\n`;
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
    report = buildReport(options);
  } catch (error) {
    report = {
      status: 'error',
      mutated: false,
      failClosedReason: error.failClosedReason || '',
      error: error.message || 'failed to evaluate authorized write-path widening review',
      nextStep: 'Check the fixture path and re-run.'
    };
  }

  const asJson = options.json || options.pretty || report.status === 'error';
  process.stdout.write(asJson
    ? `${JSON.stringify(report, null, options.pretty ? 2 : 0)}\n`
    : renderText(report, options));
  process.exitCode = report.status === 'error' ? 1 : 0;
}

if (require.main === module) {
  main();
}

module.exports = {
  DEFAULT_FIXTURE_PATH,
  REJECTED_FLAGS,
  buildRejectedReport,
  buildReport,
  buildUsageText,
  loadFixture,
  parseArgs,
  renderText
};
