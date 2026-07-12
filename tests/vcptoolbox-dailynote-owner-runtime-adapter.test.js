'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_STORE_IDENTITY_FILENAME,
  RUNTIME_IDENTITY_FILENAME,
  createExpectedDailyNoteMarkdown,
  createVcpToolBoxDailyNoteOwnerRuntimeAdapter,
  sha256,
  sha256Canonical
} = require('../src/core/VcpToolBoxDailyNoteOwnerRuntimeAdapter');

const fixturePlugin = String.raw`'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', async () => {
  const args = JSON.parse(input);
  if (process.env.CM2113_PRIVATE_INPUT) {
    process.stdout.write(JSON.stringify({ status: 'error', error: 'unexpected inherited environment' }));
    return;
  }
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const folderPath = path.join(process.env.KNOWLEDGEBASE_ROOT_PATH, args.folder);
  const fileName = args.Date + '-' + hh + '_' + mm + '_' + ss + '-' + args.fileName + '.md';
  const markdown = '[' + args.Date + '] - ' + args.maid + '\n[' + hh + ':' + mm + ']\n' + args.Content + '\nTag: ' + args.Tag;
  await fs.mkdir(folderPath, { recursive: true });
  await fs.writeFile(path.join(folderPath, fileName), markdown, { flag: 'wx' });
  process.stdout.write(JSON.stringify({ status: 'success', result: { folder: args.folder, fileName } }));
});
`;

async function setup() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2113-owner-runtime-'));
  const runtimeRoot = path.join(root, 'runtime');
  const pluginDirectory = path.join(runtimeRoot, 'Plugin', 'DailyNote');
  const storeRoot = path.join(root, 'store');
  const dependencyRoot = path.join(root, 'node_modules');
  const dotenvRoot = path.join(dependencyRoot, 'dotenv');
  await fs.mkdir(pluginDirectory, { recursive: true });
  await fs.mkdir(storeRoot, { recursive: true });
  await fs.mkdir(path.join(dotenvRoot, 'lib'), { recursive: true });

  const manifest = {
    name: 'DailyNote',
    pluginType: 'synchronous',
    entryPoint: { type: 'nodejs', command: 'node dailynote.js' },
    communication: { protocol: 'stdio', timeout: 30000 }
  };
  const preload = await fs.readFile(path.join(__dirname, '../src/runtime/cm2113-frozen-clock-preload.js'));
  const pluginBytes = Buffer.from(fixturePlugin);
  const manifestBytes = Buffer.from(JSON.stringify(manifest));
  await fs.writeFile(path.join(pluginDirectory, 'dailynote.js'), pluginBytes);
  await fs.writeFile(path.join(pluginDirectory, 'plugin-manifest.json'), manifestBytes);
  await fs.writeFile(path.join(runtimeRoot, 'cm2113-frozen-clock-preload.js'), preload);
  const dotenvPackageBytes = Buffer.from(JSON.stringify({ name: 'dotenv', version: '16.6.1', main: 'lib/main.js' }));
  const dotenvMainBytes = Buffer.from("module.exports={config(){return {parsed:{}}}};\n");
  await fs.writeFile(path.join(dotenvRoot, 'package.json'), dotenvPackageBytes);
  await fs.writeFile(path.join(dotenvRoot, 'lib', 'main.js'), dotenvMainBytes);

  const runtimeBinding = {
    memoryIntelligenceOwner: 'VCPToolBox',
    ownerRuntimeComponent: 'DailyNote',
    ownerRuntimeCommunication: 'stdio',
    runtimeSourceCommit: '1'.repeat(40),
    runtimeSourceTree: '2'.repeat(40),
    pluginBlobOid: '3'.repeat(40),
    manifestBlobOid: '4'.repeat(40),
    pluginSha256: sha256(pluginBytes),
    manifestSha256: sha256(manifestBytes),
    preloadSha256: sha256(preload),
    dependencyLockBlobOid: '5'.repeat(40),
    dependencyLockSha256: '6'.repeat(64),
    dotenvVersion: '16.6.1',
    dotenvPackageSha256: sha256(dotenvPackageBytes),
    dotenvMainSha256: sha256(dotenvMainBytes)
  };
  const runtimeIdentityBytes = Buffer.from(JSON.stringify(runtimeBinding));
  await fs.writeFile(path.join(runtimeRoot, RUNTIME_IDENTITY_FILENAME), runtimeIdentityBytes);

  const storeIdentity = {
    lifecycleReference: 'phase8-vcptoolbox-owner-native-proof-lifecycle-001',
    storeReference: 'phase8-vcptoolbox-owner-native-proof-store-001',
    storeInstanceId: 'phase8-vcptoolbox-owner-native-proof-store-instance-001',
    syntheticOnly: true,
    identityPresentBeforeFirstNativeWrite: true,
    replacementAllowed: false,
    reinitializationAllowed: false,
    realMemoryAllowed: false
  };
  const storeIdentityBytes = Buffer.from(JSON.stringify(storeIdentity));
  await fs.writeFile(path.join(storeRoot, DEFAULT_STORE_IDENTITY_FILENAME), storeIdentityBytes);

  const fixedRecord = {
    folder: 'cm2113-proof',
    maid: 'codex-memory-phase8-proof',
    date: '2026-07-12',
    fileName: 'cm2113-vcptoolbox-owner-runtime-proof',
    localTime: '08:00',
    tag: 'codex-memory, phase8, synthetic-proof, vcptoolbox-owner-runtime'
  };
  const args = {
    target: 'knowledge',
    title: 'CM-2113 VCPToolBox owner runtime proof',
    content: 'Synthetic governance proof record.\nNo user memory.\nNon-production.\nNot RC_READY.',
    evidence: 'CM-2113 exact owner runtime, actual transport, and stable store identity proof.',
    validated: true,
    reusable: false,
    sensitivity: 'internal'
  };
  const durableMarkdown = createExpectedDailyNoteMarkdown(args, fixedRecord);
  const expected = {
    ...runtimeBinding,
    runtimeIdentitySha256: sha256(runtimeIdentityBytes),
    storeIdentitySha256: sha256(storeIdentityBytes),
    storeReference: storeIdentity.storeReference,
    storeInstanceId: storeIdentity.storeInstanceId,
    lifecycleReference: storeIdentity.lifecycleReference,
    recordArgumentsCanonicalSha256: sha256Canonical(args),
    durableMarkdownSha256: sha256(Buffer.from(durableMarkdown))
  };
  return { root, runtimeRoot, storeRoot, dependencyRoot, fixedRecord, args, expected, durableMarkdown };
}

test('CM-2113 adapter binds an exact VCPToolBox DailyNote stdio runtime and stable store identity', async t => {
  const fixture = await setup();
  t.after(() => fs.rm(fixture.root, { recursive: true, force: true }));
  const adapter = createVcpToolBoxDailyNoteOwnerRuntimeAdapter({
    runtimeRoot: fixture.runtimeRoot,
    storeRoot: fixture.storeRoot,
    dependencyRoot: fixture.dependencyRoot,
    fixedRecord: fixture.fixedRecord,
    expected: fixture.expected
  });
  const preflight = await adapter.preflight();
  assert.equal(preflight.accepted, true);
  assert.equal(preflight.memoryIntelligenceOwner, 'VCPToolBox');
  assert.equal(preflight.ownerRuntimeComponent, 'DailyNote');
  assert.equal(preflight.ownerRuntimeCommunication, 'stdio');
  assert.equal(preflight.stableStoreIdentityMatched, true);

  const previousPrivateInput = process.env.CM2113_PRIVATE_INPUT;
  process.env.CM2113_PRIVATE_INPUT = 'must-not-cross-owner-runtime-boundary';
  t.after(() => {
    if (previousPrivateInput === undefined) delete process.env.CM2113_PRIVATE_INPUT;
    else process.env.CM2113_PRIVATE_INPUT = previousPrivateInput;
  });
  const result = await adapter.record(fixture.args);
  assert.equal(result.recorded, true);
  assert.equal(result.write_shape, 'vcptoolbox_daily_note_markdown');
  assert.equal(result.durable_bytes, Buffer.byteLength(fixture.durableMarkdown));
  assert.equal(result.durable_sha256, fixture.expected.durableMarkdownSha256);
  assert.equal(result._nativeRuntimeReceipt.memoryIntelligenceOwner, 'VCPToolBox');
  assert.equal(result._nativeRuntimeReceipt.ownerRuntimeComponent, 'DailyNote');
  assert.equal(result._nativeRuntimeReceipt.ownerRuntimeCommunication, 'stdio');
  assert.equal(result._nativeRuntimeReceipt.ownerRuntimePluginBlobMatched, true);
  assert.equal(result._nativeRuntimeReceipt.stableStoreIdentityMatched, true);
  assert.equal(result._nativeRuntimeReceipt.providerApiCalled, false);
  assert.equal(result._nativeRuntimeReceipt.primaryMemoryStoreWritePerformed, true);
  assert.equal(result._nativeRuntimeReceipt.rawMemoryContentDisclosed, false);
});

test('CM-2113 adapter fails closed on runtime, store, payload, or empty-store drift', async t => {
  const cases = [
    async fixture => { await fs.appendFile(path.join(fixture.runtimeRoot, 'Plugin/DailyNote/dailynote.js'), '\n'); },
    async fixture => { await fs.appendFile(path.join(fixture.storeRoot, DEFAULT_STORE_IDENTITY_FILENAME), '\n'); },
    async fixture => { await fs.writeFile(path.join(fixture.storeRoot, 'unexpected.md'), 'unexpected'); },
    async fixture => { await fs.appendFile(path.join(fixture.dependencyRoot, 'dotenv/lib/main.js'), '\n'); }
  ];
  for (const mutate of cases) {
    const fixture = await setup();
    t.after(() => fs.rm(fixture.root, { recursive: true, force: true }));
    await mutate(fixture);
    const adapter = createVcpToolBoxDailyNoteOwnerRuntimeAdapter({
      runtimeRoot: fixture.runtimeRoot,
      storeRoot: fixture.storeRoot,
      dependencyRoot: fixture.dependencyRoot,
      fixedRecord: fixture.fixedRecord,
      expected: fixture.expected
    });
    await assert.rejects(adapter.preflight());
  }

  const fixture = await setup();
  t.after(() => fs.rm(fixture.root, { recursive: true, force: true }));
  const adapter = createVcpToolBoxDailyNoteOwnerRuntimeAdapter({
    runtimeRoot: fixture.runtimeRoot,
    storeRoot: fixture.storeRoot,
    dependencyRoot: fixture.dependencyRoot,
    fixedRecord: fixture.fixedRecord,
    expected: fixture.expected
  });
  await adapter.preflight();
  await assert.rejects(adapter.record({ ...fixture.args, title: 'drift' }), /record_arguments_binding_mismatch/);
});
