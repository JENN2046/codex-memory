const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  redactSensitiveFragments
} = require('../src/core/SensitiveFragmentRedaction');

const workspaceRoot = path.join(__dirname, '..');

const centralizedRedactionTargets = [
  'src/core/MemoryGovernanceLifecycleContract.js',
  'src/core/MemoryGovernanceApprovalPacketContract.js',
  'src/core/MemoryGovernanceAuditEvidenceContract.js',
  'src/core/MemoryGovernanceReviewSurfaceContract.js',
  'src/core/EvidenceManifestContract.js',
  'src/core/EvidenceRuntimeTraceContract.js',
  'src/core/GovernanceLoopBoundaryContract.js',
  'src/core/RecallIsolationRuntimeProofContract.js',
  'src/core/MigrationImportExportBackupRestoreApprovalContract.js',
  'src/core/HttpRuntimeObservabilityOperationContract.js',
  'src/core/RcEvidenceReportContract.js',
  'src/core/FinalRcMatrixEvaluator.js',
  'src/core/FinalRcRunnerCommandResultContract.js',
  'src/core/FinalRcRunnerExecutionPreflight.js',
  'src/core/FinalRcRunnerAllowlistedExecutionAdapter.js',
  'src/core/RuntimeSchemaVersionEnforcementContract.js',
  'src/core/RecallMigrationIsolationContract.js'
];

const noTouchPatterns = [
  /\brequire\(['"](?:node:fs|fs|node:child_process|child_process|node:http|http|node:https|https|node:net|net|node:tls|tls|node:dgram|dgram|node:sqlite|sqlite3|better-sqlite3)['"]\)/,
  /\bfrom\s+['"](?:node:fs|fs|node:child_process|child_process|node:http|http|node:https|https|node:net|net|node:tls|tls|node:dgram|dgram|node:sqlite|sqlite3|better-sqlite3)['"]/,
  /\bimport\s*\(\s*['"](?:node:fs|fs|node:child_process|child_process|node:http|http|node:https|https|node:net|net|node:tls|tls|node:dgram|dgram|node:sqlite|sqlite3|better-sqlite3)['"]\s*\)/,
  /\brequire\(['"](?:\.\.?\/)+(?:storage|recall|adapters)\//,
  /\bfrom\s+['"](?:\.\.?\/)+(?:storage|recall|adapters)\//,
  /\bimport\s*\(\s*['"](?:\.\.?\/)+(?:storage|recall|adapters)\//,
  /\breadFileSync\s*\(/,
  /\breaddirSync\s*\(/,
  /\bwriteFileSync\s*\(/,
  /\bappendFileSync\s*\(/,
  /\bspawn(?:Sync)?\s*\(/,
  /\bexec(?:File)?(?:Sync)?\s*\(/,
  /\bfetch\s*\(/,
  /\brequest\s*\(/,
  /\bconnect\s*\(/
];

const sensitiveCorpus = [
  'authorization: Bearer AUTHORIZATION_TOKEN_1234567890',
  'bearer BARE_BEARER_TOKEN_1234567890',
  'api_key=API_KEY_1234567890',
  'providerapikey=PROVIDER_API_KEY_1234567890',
  'workspace_id=workspace-raw-secret',
  'raw_workspace_id=raw-workspace-secret',
  'set-cookie=session_id=COOKIE_SECRET_1234567890',
  'token=SUMMARY_TOKEN_1234567890',
  'password=PASSWORD_SECRET_1234567890',
  'https://example.test/path?token=URL_TOKEN_1234567890',
  'A:\\secret\\.env.local',
  'C:\\Users\\owner\\project\\config.env',
  '/home/owner/project/.env',
  '\\\\server\\share\\secret\\.env'
];

const forbiddenFragments = [
  'authorization:',
  'bearer ',
  'api_key',
  'providerapikey',
  'workspace_id',
  'raw_workspace_id',
  'set-cookie',
  'token=',
  'password=',
  'https://example.test',
  '.env',
  'a:\\',
  'c:\\',
  '/home/owner',
  '\\\\server\\share'
];

function readSource(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

test('P60 redaction corpus covers headers tokens workspace ids urls env files and paths', () => {
  const redacted = redactSensitiveFragments(sensitiveCorpus.join('\n')).toLowerCase();

  assert.equal(redacted.includes('<redacted>'), true);
  for (const fragment of forbiddenFragments) {
    assert.equal(redacted.includes(fragment), false, fragment);
  }
});

test('P60 helper redaction remains centralized in SensitiveFragmentRedaction', () => {
  for (const target of centralizedRedactionTargets) {
    const source = readSource(target);

    assert.equal(
      source.includes("require('./SensitiveFragmentRedaction')"),
      true,
      `${target} must use SensitiveFragmentRedaction`
    );
    assert.equal(
      /SENSITIVE_FRAGMENT_PATTERNS\s*=/.test(source),
      false,
      `${target} must not define private redaction patterns`
    );
  }
});

test('P60 helper targets remain no-touch and do not import runtime stores or execution APIs', () => {
  for (const target of centralizedRedactionTargets) {
    const source = readSource(target);

    for (const pattern of noTouchPatterns) {
      assert.equal(pattern.test(source), false, `${target} matches ${pattern}`);
    }
  }
});
