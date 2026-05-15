const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');

const fixturePath = path.join(__dirname, 'fixtures', 'tagmemo-targeted-semantic-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function formatDateParts(date) {
  return {
    datePart: date.toISOString().slice(0, 10),
    timePart: date.toISOString().slice(11, 19).replace(/:/g, '_')
  };
}

async function writeDiaryEntry({ tempBasePath, target = 'process', date, title, memoryId, content, evidence, tags = [] }) {
  const folder = target === 'knowledge' ? 'Codex的知识' : 'Codex';
  const { datePart, timePart } = formatDateParts(new Date(date));
  const directory = path.join(tempBasePath, 'dailynote', folder);
  await fsp.mkdir(directory, { recursive: true });
  const filePath = path.join(directory, `${datePart}-${timePart}-${title.replace(/\s+/g, '-')}.txt`);
  const fileText = [
    `[${datePart}] - Codex`,
    `Title: ${title}`,
    `Memory-ID: ${memoryId}`,
    `Record-Type: ${target}`,
    'Validated: yes',
    target === 'knowledge' ? 'Reusable: yes' : 'Reusable: no',
    '',
    'Content:',
    content,
    '',
    'Evidence:',
    evidence,
    '',
    `Tag: ${tags.join(', ')}`
  ].join('\n');

  await fsp.writeFile(filePath, fileText, 'utf8');
}

async function withApp(handler) {
  const tempBasePath = await fsp.mkdtemp(path.join(os.tmpdir(), 'codex-memory-p16-targeted-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data')
  });

  await app.initialize();

  try {
    await handler({ app, tempBasePath });
  } finally {
    await app.close();
    await fsp.rm(tempBasePath, { recursive: true, force: true });
  }
}

function assertNoForbiddenKeys(object, forbiddenKeys) {
  const encoded = JSON.stringify(object);
  for (const key of forbiddenKeys) {
    assert.equal(encoded.includes(`"${key}"`), false, key);
  }
}

function assertAuditSubset(actual, expected, forbiddenKeys) {
  for (const [key, value] of Object.entries(expected)) {
    if (Array.isArray(value)) {
      assert.deepEqual(actual[key], value, key);
      continue;
    }
    assert.equal(actual[key], value, key);
  }

  assert.ok(Array.isArray(actual.queryAxes));
  assert.ok(actual.queryAxes.length >= 1);
  assert.equal(Number.isFinite(actual.metaThinkingScore), true);
  assert.equal(Array.isArray(actual.metaThinkingReasons), true);
  assertNoForbiddenKeys(actual, forbiddenKeys);
}

function assertOrderContract(actualIds, expected, caseId) {
  const contract = expected.orderContract || null;
  if (!contract) {
    assert.deepEqual(actualIds, expected.memoryIds, caseId);
    return;
  }

  const expectedSet = contract.containsExactly || expected.memoryIds;
  assert.deepEqual(
    [...actualIds].sort(),
    [...expectedSet].sort(),
    `${caseId}:containsExactly`
  );

  if (Array.isArray(contract.topPrefix)) {
    assert.deepEqual(
      actualIds.slice(0, contract.topPrefix.length),
      contract.topPrefix,
      `${caseId}:topPrefix`
    );
  }

  if (Array.isArray(contract.remainingSetAfterPrefix)) {
    const prefixLength = Array.isArray(contract.topPrefix) ? contract.topPrefix.length : 0;
    assert.deepEqual(
      actualIds.slice(prefixLength).sort(),
      [...contract.remainingSetAfterPrefix].sort(),
      `${caseId}:remainingSetAfterPrefix`
    );
  }
}

test('P16.3 targeted semantic fixture declares no-side-effect safety boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tagmemo-targeted-semantic-v1');
  assert.equal(fixture.phase, 'P16.3-TagMemo-targeted-semantic-fixtures');
  assert.equal(fixture.source.kind, 'fixture-only');
  assert.equal(fixture.source.synthetic, true);
  assert.equal(fixture.safety.mutated, false);
  assert.equal(fixture.safety.providerCalls, 0);
  assert.equal(fixture.safety.durableMemoryTouched, false);
  assert.equal(fixture.safety.runtimeTuning, false);
  assert.deepEqual(fixture.safety.publicMcpTools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
  assert.equal(fixture.safety.validateMemoryPublicTool, false);
});

test('P16.3 targeted semantic fixtures lock TagMemo ordering and audit shape', async () => {
  const fixture = loadFixture();

  for (const caseDefinition of fixture.cases) {
    await withApp(async ({ app, tempBasePath }) => {
      for (const record of caseDefinition.records) {
        await writeDiaryEntry({
          tempBasePath,
          target: caseDefinition.target,
          ...record
        });
      }

      const response = await app.adapters.vcpPassiveMemoryAdapter.search(caseDefinition.query, {
        target: caseDefinition.target,
        limit: caseDefinition.limit
      });

      assertOrderContract(
        response.results.map(result => result.memoryId),
        caseDefinition.expected,
        caseDefinition.id
      );

      for (const result of response.results) {
        assert.deepEqual(
          result.matchedTags,
          caseDefinition.expected.matchedTagsByMemoryId[result.memoryId],
          `${caseDefinition.id}:${result.memoryId}`
        );
      }

      if (caseDefinition.expected.firstTwoMatchedTagsMustDiffer) {
        assert.notDeepEqual(
          response.results[0].matchedTags,
          response.results[1].matchedTags,
          caseDefinition.id
        );
      }

      const audits = await app.stores.auditLogStore.readRecentRecallAudit(10);
      const latest = audits.at(-1);
      assertAuditSubset(latest, caseDefinition.expected.audit, fixture.forbiddenAuditKeys);
    });
  }
});

test('P16.3 targeted semantic fixture test does not rewrite its fixture file', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');
  loadFixture();
  const after = fs.readFileSync(fixturePath, 'utf8');

  assert.equal(after, before);
});
