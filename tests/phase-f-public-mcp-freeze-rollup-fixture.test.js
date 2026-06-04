const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'phase-f-public-mcp-freeze-rollup-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const REQUIRED_PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory'];
const FORBIDDEN_READY_CLAIMS = ['RC_READY', 'runtimeReady=true', 'public MCP expansion approved'];

test('phase f public mcp freeze rollup keeps synthetic green-lane boundary', () => {
  assert.equal(fixture.version, 'phase-f-public-mcp-freeze-rollup-v1');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.evidenceClass, 'synthetic_fixture_only');
  assert.equal(fixture.runtimeExecuted, false);
  assert.equal(fixture.providerCalled, false);
  assert.equal(fixture.realMemoryStoreRead, false);
  assert.equal(fixture.durableStateMutated, false);
  assert.equal(fixture.v3Trial.taskId, 'CM-0673');
  assert.equal(fixture.v3Trial.lane, 'Green');
  assert.equal(fixture.v3Trial.receiptRequired, false);
});

test('phase f public mcp freeze rollup protects the exact three public tools', () => {
  assert.deepEqual(fixture.publicMcpTools, REQUIRED_PUBLIC_MCP_TOOLS);

  const protectedNames = fixture.protectedPublicMcpTools.map((tool) => tool.name);
  assert.deepEqual(protectedNames, REQUIRED_PUBLIC_MCP_TOOLS);
  assert.equal(new Set(protectedNames).size, protectedNames.length);
});

test('phase f public mcp freeze rollup rejects expansion and schema drift by default', () => {
  for (const tool of fixture.protectedPublicMcpTools) {
    assert.equal(tool.expectedPublic, true, `${tool.name} expectedPublic`);
    assert.equal(tool.expansionAllowed, false, `${tool.name} expansionAllowed`);
    assert.equal(tool.schemaChangeAllowed, false, `${tool.name} schemaChangeAllowed`);
    assert.ok(tool.requiredBoundary, `${tool.name} requiredBoundary missing`);
  }
});

test('phase f public mcp freeze rollup blocks common public mcp overreach cases', () => {
  assert.ok(fixture.blockedPublicMcpChanges.includes('add validate_memory as public MCP'));
  assert.ok(fixture.blockedPublicMcpChanges.includes('add admin_review as public MCP'));
  assert.ok(fixture.blockedPublicMcpChanges.includes('expose raw private memory content'));
  assert.ok(fixture.blockedPublicMcpChanges.includes('treat docs-only fixture evidence as runtime MCP proof'));
});

test('phase f public mcp freeze rollup records v3 no-amber budget usage', () => {
  assert.equal(fixture.v3Trial.meaningfulAmberExternalOrWriteAction, false);
  assert.equal(fixture.v3Trial.redConditionsEncountered.length, 0);

  for (const [key, value] of Object.entries(fixture.v3Trial.budgetUsed)) {
    assert.equal(value, 0, `${key} should be unused`);
  }
});

test('phase f public mcp freeze rollup rejects readiness and runtime overclaims', () => {
  for (const claim of FORBIDDEN_READY_CLAIMS) {
    assert.ok(fixture.forbiddenDefaults.includes(claim), `${claim} missing from forbiddenDefaults`);
  }

  assert.ok(fixture.nonClaims.includes('live MCP schema inspected'));
  assert.ok(fixture.nonClaims.includes('runtime public tool list verified'));
  assert.ok(fixture.nonClaims.includes('RC readiness'));
});
