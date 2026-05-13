const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SUITE = path.join('benchmarks', 'real-query-suite', 'v1.json');

function parseSuiteArgs(argv = [], defaults = {}) {
  const options = { json: false, suiteFile: DEFAULT_SUITE, fixtureRecallDryRun: false, ...defaults };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') { options.json = true; continue; }
    if (argv[i] === '--dry-run') { options.dryRun = true; continue; }
    if (argv[i] === '--fixture-recall-dry-run') { options.fixtureRecallDryRun = true; continue; }
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

function loadJsonFile(filePath) {
  try {
    return { data: JSON.parse(fs.readFileSync(filePath, 'utf8')) };
  } catch (error) {
    return { error };
  }
}

function resolveFixturePath(suite, suiteFullPath) {
  if (!suite.fixture || typeof suite.fixture !== 'string') {
    return null;
  }
  return path.resolve(path.dirname(suiteFullPath), suite.fixture);
}

function buildDocumentMap(fixture) {
  const documents = Array.isArray(fixture?.documents) ? fixture.documents : [];
  return new Map(documents.map((doc) => [doc.id, doc]));
}

function includesText(haystack, needle) {
  return haystack.toLowerCase().includes(String(needle).toLowerCase());
}

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/u)
    .map(item => item.trim())
    .filter(item => item.length >= 2);
}

function runFixtureRecallCase(caseItem, documents = []) {
  const queryTokens = new Set(tokenize(caseItem.query));
  const ranked = documents.map(document => {
    const documentTokens = new Set(tokenize(`${document.id || ''} ${document.text || ''}`));
    let score = 0;
    for (const token of queryTokens) {
      if (documentTokens.has(token)) {
        score += 1;
      }
    }
    return {
      id: document.id,
      score
    };
  }).sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return String(left.id || '').localeCompare(String(right.id || ''));
  });

  const top = ranked[0] || null;
  return {
    id: caseItem.id,
    expectedTarget: caseItem.target,
    topTarget: top?.id || null,
    score: top?.score || 0,
    passed: top?.id === caseItem.target
  };
}

function buildFixtureRecallDryRun(cases, fixture) {
  const documents = Array.isArray(fixture?.documents) ? fixture.documents : [];
  const validCases = cases.filter(caseItem => validateCase(caseItem).length === 0);
  const results = validCases.map(caseItem => runFixtureRecallCase(caseItem, documents));
  const failures = results.filter(result => !result.passed);
  return {
    enabled: true,
    mutated: false,
    providerCalls: 0,
    durableMemoryTouched: false,
    caseCount: validCases.length,
    passedCount: results.length - failures.length,
    failedCount: failures.length,
    ...(failures.length > 0 ? { failures } : {})
  };
}

function assertCaseAgainstFixture(caseItem, documentMap) {
  const targetDocument = documentMap.get(caseItem.target);
  if (!targetDocument || typeof targetDocument.text !== 'string') {
    return {
      id: caseItem.id,
      target: caseItem.target,
      issues: [`target document not found: ${caseItem.target}`]
    };
  }

  const text = targetDocument.text;
  const mustContain = caseItem.expected.mustContain || [];
  const mustNotContain = caseItem.expected.mustNotContain || [];
  const missing = mustContain.filter((phrase) => !includesText(text, phrase));
  const forbidden = mustNotContain.filter((phrase) => includesText(text, phrase));
  const issues = [
    ...missing.map((phrase) => `missing expected phrase: ${phrase}`),
    ...forbidden.map((phrase) => `found forbidden phrase: ${phrase}`)
  ];

  return issues.length > 0
    ? { id: caseItem.id, target: caseItem.target, issues }
    : null;
}

function runSuiteReport(suitePath, options = {}) {
  const fullPath = path.resolve(suitePath);
  if (!fs.existsSync(fullPath)) {
    return {
      status: 'error',
      suiteFile: suitePath,
      caseCount: 0,
      invalidCount: 0,
      placeholderCount: 0,
      fixtureOnlyCount: 0,
      validCount: 0,
      realCount: 0,
      assertedCount: 0,
      passedCount: 0,
      failedCount: 0,
      reason: `suite file not found: ${fullPath}`
    };
  }

  const loadedSuite = loadJsonFile(fullPath);
  if (loadedSuite.error) {
    return {
      status: 'error',
      suiteFile: suitePath,
      caseCount: 0,
      invalidCount: 0,
      placeholderCount: 0,
      fixtureOnlyCount: 0,
      validCount: 0,
      realCount: 0,
      assertedCount: 0,
      passedCount: 0,
      failedCount: 0,
      reason: `failed to parse suite JSON: ${loadedSuite.error.message}`
    };
  }

  const suite = loadedSuite.data;
  const cases = Array.isArray(suite.cases) ? suite.cases : [];
  let invalidCount = 0;
  let placeholderCount = 0;
  let fixtureOnlyCount = 0;
  const invalidReasons = [];
  const assertionFailures = [];
  const fixturePath = resolveFixturePath(suite, fullPath);
  let documentMap = new Map();
  let fixtureData = null;
  let fixtureError = null;

  if (fixturePath) {
    const loadedFixture = fs.existsSync(fixturePath)
      ? loadJsonFile(fixturePath)
      : { error: new Error(`fixture file not found: ${fixturePath}`) };
    if (loadedFixture.error) {
      fixtureError = loadedFixture.error.message;
    } else {
      fixtureData = loadedFixture.data;
      documentMap = buildDocumentMap(fixtureData);
    }
  }

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
    if (fixturePath && !fixtureError) {
      const assertionFailure = assertCaseAgainstFixture(caseItem, documentMap);
      if (assertionFailure) {
        assertionFailures.push(assertionFailure);
      }
    }
  }

  if (fixtureError) {
    assertionFailures.push({ id: 'fixture', target: suite.fixture, issues: [fixtureError] });
  }

  const validCount = cases.length - invalidCount;
  const realCount = validCount - placeholderCount;
  const assertedCount = fixturePath ? validCount : 0;
  const failedCount = assertionFailures.length;
  const passedCount = Math.max(assertedCount - failedCount, 0);
  const fixtureRecallDryRun = options.fixtureRecallDryRun && fixtureData && !fixtureError
    ? buildFixtureRecallDryRun(cases, fixtureData)
    : null;
  const fixtureRecallFailed = fixtureRecallDryRun?.failedCount > 0;

  return {
    status: failedCount > 0 || fixtureRecallFailed ? 'failed' : 'ok',
    suiteFile: suitePath,
    version: suite.version || 'unknown',
    caseCount: cases.length,
    invalidCount,
    placeholderCount,
    fixtureOnlyCount,
    validCount,
    realCount: realCount > 0 ? realCount : 0,
    assertedCount,
    passedCount,
    failedCount,
    ...(fixturePath ? { fixtureFile: path.relative(process.cwd(), fixturePath) } : {}),
    ...(fixtureRecallDryRun ? { fixtureRecallDryRun } : {}),
    ...(invalidReasons.length > 0 ? { invalidReasons } : {}),
    ...(assertionFailures.length > 0 ? { assertionFailures } : {})
  };
}

module.exports = {
  DEFAULT_SUITE,
  parseSuiteArgs,
  runSuiteReport,
  validateCase
};
