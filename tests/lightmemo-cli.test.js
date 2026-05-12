const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

function runLightMemo(stdin, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/lightmemo.js', ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); });
    child.on('error', reject);
    child.on('close', code => { resolve({ code, stdout, stderr }); });
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
