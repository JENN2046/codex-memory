const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'phase-f-readiness-boundary-wording-guard-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const workspaceRoot = path.resolve(__dirname, '..');

function readWorkspaceFile(workspaceRelativePath) {
  const fullPath = path.resolve(workspaceRoot, workspaceRelativePath);
  assert.ok(fullPath.startsWith(workspaceRoot), `${workspaceRelativePath} escapes workspace`);
  return fs.readFileSync(fullPath, 'utf8');
}

function contextWindows(text, term, radius = 420) {
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const windows = [];
  let start = lowerText.indexOf(lowerTerm);
  while (start !== -1) {
    const from = Math.max(0, start - radius);
    const to = Math.min(text.length, start + term.length + radius);
    windows.push(text.slice(from, to));
    start = lowerText.indexOf(lowerTerm, start + lowerTerm.length);
  }
  return windows;
}

test('phase f readiness boundary wording guard keeps docs-only boundary', () => {
  assert.equal(fixture.version, 'phase-f-readiness-boundary-wording-guard-v1');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.evidenceClass, 'docs_fixture_only');
  assert.equal(fixture.runtimeExecuted, false);
  assert.equal(fixture.providerCalled, false);
  assert.equal(fixture.realMemoryStoreRead, false);
  assert.equal(fixture.durableStateMutated, false);
  assert.deepEqual(fixture.publicMcpTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
});

test('phase f readiness boundary wording guard watches existing phase f docs', () => {
  assert.ok(fixture.watchedDocs.length >= 8);
  for (const docPath of fixture.watchedDocs) {
    const fullPath = path.resolve(workspaceRoot, docPath);
    assert.ok(fs.existsSync(fullPath), `${docPath} missing`);
    assert.ok(docPath.startsWith('docs/PHASE_F_'), `${docPath} is not a Phase F doc`);
  }
});

test('phase f readiness-sensitive terms only appear in denial or blocked context', () => {
  const denialMarkers = fixture.allowedDenialMarkers.map((marker) => marker.toLowerCase());
  const failures = [];

  for (const docPath of fixture.watchedDocs) {
    const text = readWorkspaceFile(docPath);
    for (const term of fixture.sensitiveTerms) {
      for (const window of contextWindows(text, term)) {
        const lowerWindow = window.toLowerCase();
        const hasDenial = denialMarkers.some((marker) => lowerWindow.includes(marker));
        if (!hasDenial) {
          failures.push({ docPath, term, window: window.replace(/\s+/g, ' ').trim() });
        }
      }
    }
  }

  assert.deepEqual(failures, []);
});

test('phase f readiness boundary wording guard rejects positive readiness markers', () => {
  const positiveMarkers = fixture.forbiddenPositiveMarkers.map((marker) => marker.toLowerCase());
  const failures = [];

  for (const docPath of fixture.watchedDocs) {
    const text = readWorkspaceFile(docPath).toLowerCase();
    for (const marker of positiveMarkers) {
      if (text.includes(marker)) {
        failures.push({ docPath, marker });
      }
    }
  }

  assert.deepEqual(failures, []);
});
