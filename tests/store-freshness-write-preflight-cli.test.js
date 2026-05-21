const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const cliPath = path.join('src', 'cli', 'store-freshness-write-preflight.js');

async function withTempDb(handler) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-freshness-'));
  const dbPath = path.join(tempDir, 'codex-memory.sqlite');
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`
      CREATE TABLE memory_records (
        memory_id TEXT PRIMARY KEY,
        target TEXT,
        title TEXT,
        content TEXT,
        updated_at TEXT
      );
      CREATE TABLE memory_chunks (
        chunk_id TEXT PRIMARY KEY,
        memory_id TEXT,
        content TEXT
      );
    `);
    await handler({ db, dbPath });
  } finally {
    db.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function runCli(args = [], env = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, ...env },
    encoding: 'utf8'
  });
}

test('store freshness write preflight prepares exact-only payload when no records exist in 24h', async () => {
  await withTempDb(async ({ db, dbPath }) => {
    const updatedAt = new Date(Date.now() - 2 * 86400000).toISOString();
    db.prepare('INSERT INTO memory_records (memory_id, target, title, content, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('mem-1', 'process', 'Older checkpoint', 'No fresh write', updatedAt);

    const result = runCli(['--json', '--db', dbPath]);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);

    assert.equal(report.status, 'warn');
    assert.equal(report.decision, 'STORE_FRESHNESS_EVIDENCE_PREPARED_EXACT_ONLY');
    assert.equal(report.dryRun, true);
    assert.equal(report.mutated, false);
    assert.equal(report.memoryWrites, 0);
    assert.equal(report.proposedMemoryWrites, 1);
    assert.equal(report.proposedTool, 'record_memory');
    assert.equal(report.proposedArguments.target, 'process');
    assert.equal(report.proposedArguments.sensitivity, 'none');
    assert.equal(report.proposedArguments.client_id, 'codex');
    assert.equal(report.approvalPacket.packetId, 'CM-0732-store-freshness-write-evidence-approval-packet-v0');
    assert.equal(report.approvalPacket.approvalState, 'NOT_APPROVED');
    assert.equal(report.approvalPacket.budget.maxMemoryWrites, 1);
    assert.equal(report.approvalPacket.budget.maxProviderCalls, 0);
    assert.equal(report.approvalPacket.proposedArguments.title, report.proposedArguments.title);
    assert.ok(report.approvalPacket.forbiddenActions.includes('readiness claim'));
    assert.match(report.approvalPacket.operatorApprovalLine, /exactly one sanitized record_memory write/);
    assert.equal(report.readinessClaimAllowed, false);
    assert.equal(report.safety.noMcpToolCall, true);
    assert.equal(report.safety.noDurableMemoryWrite, true);
  });
});

test('store freshness write preflight does not propose a write when freshness is already current', async () => {
  await withTempDb(async ({ db, dbPath }) => {
    const updatedAt = new Date().toISOString();
    db.prepare('INSERT INTO memory_records (memory_id, target, title, content, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('mem-2', 'process', 'Fresh checkpoint', 'Fresh write exists', updatedAt);

    const result = runCli(['--json', '--db', dbPath]);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);

    assert.equal(report.status, 'ok');
    assert.equal(report.decision, 'STORE_FRESHNESS_EVIDENCE_NOT_REQUIRED');
    assert.equal(report.memoryWrites, 0);
    assert.equal(report.proposedMemoryWrites, 0);
    assert.equal(report.proposedTool, null);
    assert.equal(report.proposedArguments, null);
    assert.equal(report.approvalPacket, null);
    assert.equal(report.readinessClaimAllowed, false);
  });
});

test('store freshness write preflight text renders approval packet without authorizing execution', async () => {
  await withTempDb(async ({ db, dbPath }) => {
    const updatedAt = new Date(Date.now() - 2 * 86400000).toISOString();
    db.prepare('INSERT INTO memory_records (memory_id, target, title, content, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('mem-3', 'process', 'Older checkpoint', 'No fresh write', updatedAt);

    const result = runCli(['--db', dbPath]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /approvalPacket: CM-0732-store-freshness-write-evidence-approval-packet-v0\/NOT_APPROVED/);
    assert.match(result.stdout, /operatorApprovalLine: Approve exactly one sanitized record_memory write/);
    assert.match(result.stdout, /memoryWrites: 0/);
  });
});

test('store freshness write preflight rejects mutation flags', () => {
  const result = runCli(['--json', '--execute']);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);

  assert.equal(report.status, 'error');
  assert.equal(report.decision, 'REJECTED_MUTATION_FLAG');
  assert.equal(report.rejectedFlag, '--execute');
  assert.equal(report.mutated, false);
  assert.equal(report.memoryWrites, 0);
  assert.equal(report.readinessClaimAllowed, false);
});
