const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const readme = fs.readFileSync('README.md', 'utf8');
const wslNewApiServiceScript = fs.readFileSync(
  'scripts/codex-mcp-vcp-native-wsl-newapi-service.sh',
  'utf8'
);

test('package exposes governed VCP native shim and acceptance operator entries', () => {
  assert.equal(
    pkg.scripts['vcp-native:shim'],
    'node ./src/cli/vcp-toolbox-native-mcp-shim.js'
  );
  assert.equal(
    pkg.scripts['vcp-native:acceptance'],
    'node ./src/cli/governed-vcp-native-acceptance.js'
  );
  assert.equal(
    pkg.bin['codex-memory-vcp-toolbox-native-mcp-shim'],
    './src/cli/vcp-toolbox-native-mcp-shim.js'
  );
  assert.equal(
    pkg.bin['codex-memory-governed-vcp-native-acceptance'],
    './src/cli/governed-vcp-native-acceptance.js'
  );
});

test('README documents low-disclosure governed VCP native live proof path', () => {
  assert.equal(readme.includes('npm run vcp-native:shim'), true);
  assert.equal(readme.includes('npm run vcp-native:acceptance'), true);
  assert.equal(readme.includes('--include-read-suite'), true);
  assert.equal(readme.includes('search_memory` / `memory_overview` / `audit_memory'), true);
  assert.equal(readme.includes('--enable-write'), true);
  assert.equal(readme.includes('accepted=true'), true);
  assert.equal(readme.includes('governanceEvidenceMatrix'), true);
  assert.equal(readme.includes('localMemoryAuxiliaryEvidence'), true);
  assert.equal(readme.includes('--verify-evidence'), true);
  assert.equal(readme.includes('validateGovernedVcpNativeAcceptanceEvidenceArtifact'), true);
  assert.equal(readme.includes('native memory performed'), true);
  assert.equal(readme.includes('writeRollbackEvidence'), true);
  assert.equal(readme.includes('不会返回 rollback plan reference 或 raw rollback plan'), true);
  assert.equal(readme.includes('不写 endpoint、token、raw request/response、raw memory、raw audit 或 output path'), true);
});

test('managed WSL NewAPI service exports shim endpoint under createConfig key', () => {
  assert.equal(
    wslNewApiServiceScript.includes(
      'CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_ENDPOINT="http://$shim_host:$shim_port/mcp/vcp-native"'
    ),
    true
  );
  assert.equal(
    wslNewApiServiceScript.includes('CODEX_MEMORY_GOVERNED_MCP_VCP_NATIVE_HTTP_MCP_ENDPOINT='),
    false
  );
});
