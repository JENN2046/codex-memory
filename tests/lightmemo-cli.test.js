const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function runLightMemo(stdin, args = []) {
  return new Promise((resolve, reject) => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-lightmemo-test-'));
    const child = spawn(process.execPath, ['src/cli/lightmemo.js', ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CODEX_MEMORY_DATA_DIR: path.join(tempRoot, 'data'),
        CODEX_MEMORY_LOGS_DIR: path.join(tempRoot, 'logs'),
        CODEX_MEMORY_DIARY_PATH: path.join(tempRoot, 'dailynote'),
        NODE_NO_WARNINGS: '1'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); });
    child.on('error', reject);
    child.on('close', code => {
      fs.rm(tempRoot, { recursive: true, force: true }, () => {
        resolve({ code, stdout, stderr });
      });
    });
    child.stdin.write(stdin);
    child.stdin.end();
  });
}

function parseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

test('LightMemo CLI should return success with JSON output', async () => {
  const result = await runLightMemo(JSON.stringify({ maid: 'Keke', keyword: 'checkpoint' }));
  assert.equal(result.code, 0, result.stderr || 'non-zero exit');
  const payload = parseJson(result.stdout);
  assert.ok(payload, 'should parse as JSON');
  assert.equal(payload.status, 'success');
  assert.ok(typeof payload.result === 'string');
  assert.ok(payload.result.includes('LightMemo Recall'));
});

test('LightMemo CLI should support --full for extended payload', async () => {
  const result = await runLightMemo(
    JSON.stringify({ maid: 'Keke', keyword: 'test' }),
    ['--full']
  );
  assert.equal(result.code, 0, result.stderr || 'non-zero exit');
  const payload = parseJson(result.stdout);
  assert.equal(payload.query, 'test');
  assert.ok(payload.meta, 'should have meta in full mode');
});

test('LightMemo CLI should handle invalid JSON gracefully', async () => {
  const result = await runLightMemo('not-json');
  assert.equal(result.code, 1, 'should exit non-zero');
  // Error JSON is on stderr, but may be mixed with SQLite warnings
  const jsonLine = result.stderr.split('\n').find(l => l.startsWith('{'));
  const payload = parseJson(jsonLine);
  assert.ok(payload, 'should have error payload on stderr');
  assert.equal(payload.status, 'error');
  assert.equal(payload.meta.code, 'invalid-json');
});
