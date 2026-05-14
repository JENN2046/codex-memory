#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { DEFAULT_SUITE, runSuiteReport } = require('./real-query-suite-core');

function parseArgs(argv = []) {
  const options = { json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') { options.json = true; continue; }
  }
  return options;
}

function spawnJson(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      timeout: 120000
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('close', code => {
      try { resolve({ code, data: JSON.parse(stdout || stderr || 'null') }); }
      catch { resolve({ code, data: null }); }
    });
    child.on('error', () => resolve({ code: -1, data: null }));
  });
}

function resolveSuitePath() {
  return path.join('benchmarks', 'active-memory-suite', 'standard-suite.json');
}

async function runCompare() {
  const suitePath = resolveSuitePath();
  const { code, data } = await spawnJson([
    path.join(process.cwd(), 'src', 'cli', 'compare-vcp-active-memory.js'),
    '--suite', suitePath, '--json', '--require-match'
  ]);
  if (!data || !data.summary) {
    return { status: 'error', message: 'Compare failed to produce output', detail: {} };
  }
  const s = data.summary;
  const ok = s.matchedAll === true && s.coreMismatchCountTotal === 0;
  return {
    status: ok ? 'ok' : 'error',
    message: s.message || '',
    detail: {
      totalCaseCount: s.totalCaseCount || 0,
      matchedCaseCount: s.matchedCaseCount || 0,
      coreMismatchCountTotal: s.coreMismatchCountTotal ?? -1,
      extendedMismatchCountTotal: s.extendedMismatchCountTotal ?? -1
    }
  };
}

async function runRollback() {
  const suitePath = resolveSuitePath();
  const { code, data } = await spawnJson([
    path.join(process.cwd(), 'src', 'cli', 'rollback-active-memory.js'),
    '--suite', suitePath, '--json', '--require-ready'
  ]);
  if (!data || !data.summary) {
    return { status: 'error', message: 'Rollback failed to produce output', detail: {} };
  }
  const s = data.summary;
  const ok = s.rollbackReady === true && s.coreMismatchCountTotal === 0;
  return {
    status: ok ? 'ok' : 'error',
    message: s.message || '',
    detail: {
      totalCaseCount: s.totalCaseCount || 0,
      readyCaseCount: s.readyCaseCount || 0,
      coreMismatchCountTotal: s.coreMismatchCountTotal ?? -1,
      extendedMismatchCountTotal: s.extendedMismatchCountTotal ?? -1
    }
  };
}

function runQueries() {
  const report = runSuiteReport(DEFAULT_SUITE, { fixtureRecallDryRun: true });
  const fixtureRecall = report.fixtureRecallDryRun || {
    enabled: false,
    mutated: false,
    providerCalls: 0,
    durableMemoryTouched: false,
    caseCount: 0,
    passedCount: 0,
    failedCount: 0
  };
  const ok = report.status === 'ok'
    && report.failedCount === 0
    && fixtureRecall.enabled === true
    && fixtureRecall.failedCount === 0
    && fixtureRecall.mutated === false
    && fixtureRecall.providerCalls === 0
    && fixtureRecall.durableMemoryTouched === false;
  return {
    status: ok ? 'ok' : 'error',
    message: ok
      ? `${report.passedCount}/${report.assertedCount} query assertions passed; fixture recall ${fixtureRecall.passedCount}/${fixtureRecall.caseCount}`
      : `${report.failedCount || 0}/${report.assertedCount || report.caseCount || 0} query assertions failed; fixture recall ${fixtureRecall.failedCount}/${fixtureRecall.caseCount} failed`,
    detail: {
      caseCount: report.caseCount || 0,
      validCount: report.validCount || 0,
      placeholderCount: report.placeholderCount || 0,
      fixtureOnlyCount: report.fixtureOnlyCount || 0,
      realCount: report.realCount || 0,
      assertedCount: report.assertedCount || 0,
      passedCount: report.passedCount || 0,
      failedCount: report.failedCount || 0,
      fixtureRecallDryRun: fixtureRecall
    }
  };
}

function applyFixtureSoftReadPolicy(records, { requestClientId = 'codex' } = {}) {
  return records.filter(record => {
    const status = String(record.status || 'active').toLowerCase();
    if (!['active', 'stale'].includes(status)) {
      return false;
    }

    const visibility = String(record.visibility || 'project').toLowerCase();
    const clientId = String(record.clientId || '').toLowerCase();
    if (visibility === 'private' && clientId && clientId !== requestClientId) {
      return false;
    }

    return true;
  });
}

function runPolicyPreflight() {
  const records = [
    { title: 'Active Shared', status: 'active', visibility: 'shared', clientId: 'codex' },
    { title: 'Stale Shared', status: 'stale', visibility: 'shared', clientId: 'codex' },
    { title: 'Proposal Shared', status: 'proposal', visibility: 'shared', clientId: 'codex' },
    { title: 'Rejected Shared', status: 'rejected', visibility: 'shared', clientId: 'codex' },
    { title: 'Tombstoned Shared', status: 'tombstoned', visibility: 'shared', clientId: 'codex' },
    { title: 'Private Claude', status: 'active', visibility: 'private', clientId: 'claude' },
    { title: 'Private Codex', status: 'active', visibility: 'private', clientId: 'codex' }
  ];

  const kept = applyFixtureSoftReadPolicy(records, { requestClientId: 'codex' });
  const lifecycleFilteredCount = records
    .filter(record => !['active', 'stale'].includes(String(record.status || 'active').toLowerCase()))
    .length;
  const crossClientPrivateFilteredCount = records
    .filter(record => {
      const visibility = String(record.visibility || 'project').toLowerCase();
      const clientId = String(record.clientId || '').toLowerCase();
      return visibility === 'private' && clientId && clientId !== 'codex';
    })
    .length;

  return {
    status: 'ok',
    message: `${kept.length}/${records.length} records would remain under soft read policy`,
    detail: {
      fixtureOnly: true,
      noNetwork: true,
      noDaemon: true,
      noProvider: true,
      mutated: false,
      defaultPolicyEnabled: false,
      inputCount: records.length,
      keptCount: kept.length,
      filteredCount: records.length - kept.length,
      lifecycleFilteredCount,
      crossClientPrivateFilteredCount
    }
  };
}

function loadLifecyclePolicyFixture() {
  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'lifecycle-read-policy-runtime-v1.json');
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function runLifecyclePolicySummary() {
  try {
    const fixture = loadLifecyclePolicyFixture();
    const examples = Array.isArray(fixture.runtimeExamples) ? fixture.runtimeExamples : [];
    const requiredFields = Array.isArray(fixture.auditSummary?.requiredFields)
      ? fixture.auditSummary.requiredFields
      : [];
    const expectedAuditFields = [
      'readPolicyApplied',
      'lifecyclePolicyApplied',
      'lifecycleIncludedStatuses',
      'lifecycleExcludedStatuses',
      'hiddenByLifecycleCount',
      'staleResultCount',
      'lifecycleColumnAvailable',
      'scopeWorkspacePresent'
    ];
    const auditSummaryShapePresent = expectedAuditFields.every(field => requiredFields.includes(field));
    const hiddenByLifecycleCount = examples
      .filter(record => record.lifecyclePolicyEnabled && record.expectedHiddenByLifecycle === true)
      .length;
    const staleResultCount = examples
      .filter(record => record.lifecyclePolicyEnabled && record.expectedStaleCounted === true)
      .length;
    const defaultEnabled = fixture.flags?.CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY === true;
    const included = Array.isArray(fixture.enabledLifecyclePolicy?.include)
      ? fixture.enabledLifecyclePolicy.include
      : [];
    const excluded = Array.isArray(fixture.enabledLifecyclePolicy?.exclude)
      ? fixture.enabledLifecyclePolicy.exclude
      : [];
    const rawWorkspaceIdExposed = fixture.auditSummary?.rawWorkspaceIdAllowed === true
      || requiredFields.includes('workspace_id')
      || requiredFields.includes('workspaceId');
    const missingColumnBehavior = fixture.missingColumnBehavior?.whenLifecyclePolicyEnabled || 'unknown';
    const status = (
      defaultEnabled === false
      && included.includes('active')
      && included.includes('stale')
      && excluded.includes('proposal')
      && excluded.includes('rejected')
      && excluded.includes('superseded')
      && excluded.includes('tombstoned')
      && fixture.missingColumnBehavior?.mustNotTreatUnknownAsActive === true
      && fixture.missingColumnBehavior?.automaticMigrationAllowed === false
      && auditSummaryShapePresent
      && rawWorkspaceIdExposed === false
    ) ? 'ok' : 'error';

    return {
      status,
      message: status === 'ok'
        ? `default off, ${included.length}/${included.length + excluded.length} statuses included, ${hiddenByLifecycleCount} lifecycle-hidden`
        : 'Lifecycle policy fixture summary failed',
      detail: {
        fixtureOnly: true,
        noNetwork: true,
        noDaemon: true,
        noProvider: true,
        mutated: false,
        defaultEnabled,
        defaultLifecyclePolicyEnabled: defaultEnabled,
        enabledIncludedStatuses: included,
        enabledExcludedStatuses: excluded,
        missingColumnBehavior,
        mustNotTreatUnknownAsActive: fixture.missingColumnBehavior?.mustNotTreatUnknownAsActive === true,
        automaticMigrationAllowed: fixture.missingColumnBehavior?.automaticMigrationAllowed === true,
        staleResultCount,
        hiddenByLifecycleCount,
        auditSummaryShapePresent,
        rawWorkspaceIdExposed
      }
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Lifecycle policy fixture summary failed: ${error.message}`,
      detail: {
        fixtureOnly: true,
        noNetwork: true,
        noDaemon: true,
        noProvider: true,
        mutated: false
      }
    };
  }
}

async function runTests() {
  // CI-safe tests: exclude network-dependent test files
  const testsDir = path.join(process.cwd(), 'tests');
  const allTestFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js'));
  const ciSafeFiles = allTestFiles.filter(f => {
    // These test files require a live HTTP MCP daemon on localhost
    const httpDependent = ['mcp-http.test.js'];
    // These test files may call real providers
    const providerDependent = ['provider-smoke-cli.test.js', 'provider-benchmark-cli.test.js'];
    // These test files call gate:ci/dashboard themselves (avoid self-referential runs)
    const selfReferential = ['gate-ci-cli.test.js', 'dashboard-cli.test.js'];
    const excluded = [...httpDependent, ...providerDependent, ...selfReferential];
    return !excluded.includes(f);
  });

  const testPatterns = ciSafeFiles.map(f => path.join('tests', f));
  const args = ['--test', ...testPatterns];

  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      timeout: 300000
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('close', code => {
      // Parse TAP output for pass/fail counts
      const output = stdout + stderr;
      const passMatch = output.match(/(?:#|ℹ)\s*pass\s+(\d+)/);
      const failMatch = output.match(/(?:#|ℹ)\s*fail\s+(\d+)/);
      const testMatch = output.match(/(?:#|ℹ)\s*tests\s+(\d+)/);
      const passed = passMatch ? Number(passMatch[1]) : 0;
      const failed = failMatch ? Number(failMatch[1]) : 0;
      const total = testMatch ? Number(testMatch[1]) : (passed + failed);
      resolve({
        status: failed === 0 ? 'ok' : 'error',
        message: `${passed}/${total} passed, ${failed} failed (${ciSafeFiles.length} CI-safe test files)`,
        detail: { total, passed, failed, skipped: allTestFiles.length - ciSafeFiles.length }
      });
    });
    child.on('error', () => resolve({
      status: 'error',
      message: 'Test runner failed to start',
      detail: { total: 0, passed: 0, failed: 0, skipped: allTestFiles.length - ciSafeFiles.length }
    }));
  });
}

function runDocsCheck() {
  const packagePath = path.join(process.cwd(), 'package.json');
  let packageOk = true;
  let scriptCount = 0;
  let missingCount = 0;
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const scripts = Object.keys(pkg.scripts || {});
    scriptCount = scripts.length;
    for (const [name, cmd] of Object.entries(pkg.scripts || {})) {
      const scriptFile = String(cmd).split(/\s+/).pop() || '';
      if (scriptFile.startsWith('./') || scriptFile.startsWith('.\\')) {
        if (scriptFile.includes('*')) continue; // glob pattern, skip literal check
        const resolved = path.join(process.cwd(), scriptFile);
        if (!fs.existsSync(resolved)) {
          packageOk = false;
          missingCount += 1;
        }
      }
    }
  } catch {
    return { status: 'error', message: 'Failed to read package.json', detail: {} };
  }
  return {
    status: packageOk ? 'ok' : 'error',
    message: packageOk
      ? `${scriptCount} scripts, all targets exist`
      : `${missingCount}/${scriptCount} script targets missing`,
    detail: { scriptCount, missingCount }
  };
}

function renderText(results) {
  const lines = [];
  lines.push(`gate:ci — ${results.generatedAt}`);
  lines.push('mode: fixture-only  |  no network  |  no daemon  |  no provider');
  lines.push('─'.repeat(56));
  lines.push('');
  for (const [name, r] of Object.entries(results.checks)) {
    const status = r.status === 'ok' ? 'ok ' : r.status === 'warn' ? 'warn' : 'ERR';
    lines.push(`  ${status.padEnd(4)} ${name.padEnd(12)} ${r.message}`);
  }
  lines.push('');
  const failedCount = Object.values(results.checks).filter(c => c.status === 'error').length;
  lines.push(`Result: ${results.summary.ok ? 'PASS' : 'FAIL'}  (${failedCount} checks failed)`);
  return lines.join('\n') + '\n';
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();

  const compare = await runCompare();
  const rollback = await runRollback();
  const queries = runQueries();
  const policyPreflight = runPolicyPreflight();
  const lifecyclePolicy = runLifecyclePolicySummary();
  const tests = await runTests();
  const docs = runDocsCheck();

  const checks = { compare, rollback, queries, policyPreflight, lifecyclePolicy, tests, docs };
  const failedChecks = Object.entries(checks)
    .filter(([, v]) => v.status === 'error')
    .map(([k]) => k);

  const results = {
    generatedAt,
    summary: {
      ok: failedChecks.length === 0,
      mode: 'ci',
      fixtureOnly: true,
      noNetwork: true,
      noDaemon: true,
      noProvider: true,
      failedChecks
    },
    checks
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(results)}\n`);
  } else {
    process.stdout.write(renderText(results));
  }

  if (failedChecks.length > 0) process.exitCode = 1;
}

main().catch(err => {
  process.stderr.write(`gate:ci: ${err.message}\n`);
  process.exit(1);
});
