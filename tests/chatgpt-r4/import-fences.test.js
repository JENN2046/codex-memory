'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  ROOTS,
  discoverPackageRuntimeEntrypoints,
  extractImports,
  validateComponentSource,
  validateNotActivated,
  validateImportFences
} = require('../../scripts/validate_chatgpt_r4_import_fences');

test('R4-D D2B import fences accept external Edge and outbound Relay without activating local defaults', () => {
  const result = validateImportFences();
  assert.equal(result.accepted, true);
  assert.equal(result.stage, 'R4-D-D2B');
  assert.equal(result.candidateActivated, false);
  assert.equal(result.loopbackReferenceRuntimeImplemented, true);
  assert.equal(result.externalRuntimeImplemented, true);
  assert.equal(result.outboundRelayImplemented, true);
  assert.equal(result.externalRuntimeActivated, false);
  assert.equal(result.externalRuntimeUsed, false);
  assert.equal(result.durableRemoteStateAllowed, false);
  const packageEntrypoints = discoverPackageRuntimeEntrypoints();
  assert.equal(result.activationEntrypointCount, packageEntrypoints.length);
  assert.equal(result.passiveContractBindingCount, 2);
  assert.equal(packageEntrypoints.some(file => file.endsWith('/src/cli/provider-smoke.js')), true);
  assert.equal(packageEntrypoints.some(file => file.endsWith('/scripts/verify-frozen-evidence-manifest.js')), true);
  assert.deepEqual(result.components.map(component => component.component), [
    'contracts', 'edge', 'relay', 'widget', 'governance'
  ]);

  const passiveRoot = path.join('/synthetic-passive-runtime');
  const passiveRuntimeRoot = path.join(passiveRoot, 'src');
  const passiveHydrator = path.join(
    passiveRuntimeRoot,
    'runtime',
    'vcp-native',
    'production-selected-diary-hydrator.js'
  );
  const passiveCanonical = path.join(
    passiveRoot,
    'packages',
    'chatgpt-r4-contracts',
    'canonical.js'
  );
  const passiveAttempt = path.join(
    passiveRoot,
    'packages',
    'chatgpt-r4-contracts',
    'governed-read-attempt.js'
  );
  const passiveSources = new Map([
    [passiveHydrator, [
      "require('../../../packages/chatgpt-r4-contracts/canonical');",
      "require('../../../packages/chatgpt-r4-contracts/governed-read-attempt');"
    ].join('\n')],
    [passiveCanonical, ''],
    [passiveAttempt, '']
  ]);
  const passive = validateNotActivated({
    runtimeRoot: passiveRuntimeRoot,
    entrypoints: [passiveHydrator],
    readFileSync: file => passiveSources.get(file),
    fileExists: file => passiveSources.has(file)
  });
  assert.equal(passive.passiveContractBindingCount, 2);
  passiveSources.set(
    passiveHydrator,
    "require('../../../packages/chatgpt-r4-contracts')"
  );
  assert.throws(() => validateNotActivated({
    runtimeRoot: passiveRuntimeRoot,
    entrypoints: [passiveHydrator],
    readFileSync: file => passiveSources.get(file),
    fileExists: file => passiveSources.has(file)
  }), /candidate_runtime_activated/);
  passiveSources.set(
    path.join(passiveRuntimeRoot, 'core', 'unexpected.js'),
    "require('../../packages/chatgpt-r4-contracts/canonical')"
  );
  assert.throws(() => validateNotActivated({
    runtimeRoot: passiveRuntimeRoot,
    entrypoints: [path.join(passiveRuntimeRoot, 'core', 'unexpected.js')],
    readFileSync: file => passiveSources.get(file),
    fileExists: file => passiveSources.has(file)
  }), /candidate_runtime_activated/);

  const runtimeRoot = path.join('/synthetic-runtime', 'src');
  const sources = new Map([
    [path.join(runtimeRoot, 'index.js'), "require('./app')"],
    [path.join(runtimeRoot, 'app.js'), "require('./core/runtime')"],
    [path.join(runtimeRoot, 'core', 'runtime.js'), "require('../../../apps/chatgpt-edge')"]
  ]);
  assert.throws(() => validateNotActivated({
    runtimeRoot,
    entrypoints: [path.join(runtimeRoot, 'index.js')],
    readFileSync: file => sources.get(file),
    fileExists: file => sources.has(file)
  }), /candidate_runtime_activated:src\/core\/runtime\.js/);

  sources.set(path.join(runtimeRoot, 'core', 'runtime.js'), [
    "const target = '../../../apps/chatgpt-edge';",
    'require(target);'
  ].join('\n'));
  assert.throws(() => validateNotActivated({
    runtimeRoot,
    entrypoints: [path.join(runtimeRoot, 'index.js')],
    readFileSync: file => sources.get(file),
    fileExists: file => sources.has(file)
  }), /dynamic_import_forbidden:src\/core\/runtime\.js/);
  sources.set(path.join(runtimeRoot, 'core', 'runtime.js'), [
    "const target = '../../../apps/chatgpt-edge';",
    'import(target);'
  ].join('\n'));
  assert.throws(() => validateNotActivated({
    runtimeRoot,
    entrypoints: [path.join(runtimeRoot, 'index.js')],
    readFileSync: file => sources.get(file),
    fileExists: file => sources.has(file)
  }), /dynamic_import_forbidden:src\/core\/runtime\.js/);
  sources.set(path.join(runtimeRoot, 'core', 'runtime.js'), [
    "const target = '../../../apps/chatgpt-edge';",
    'const rendered = `${require(target)}`;'
  ].join('\n'));
  assert.throws(() => validateNotActivated({
    runtimeRoot,
    entrypoints: [path.join(runtimeRoot, 'index.js')],
    readFileSync: file => sources.get(file),
    fileExists: file => sources.has(file)
  }), /dynamic_import_forbidden:src\/core\/runtime\.js/);
  for (const source of [
    "module['require']('../../../apps/chatgpt-edge');",
    "module['require'].call(module, '../../../apps/chatgpt-edge');",
    "module['require'].apply(module, ['../../../apps/chatgpt-edge']);",
    "require['call'](null, '../../../apps/chatgpt-edge');",
    "require?.['call'](null, '../../../apps/chatgpt-edge');",
    "const load = require; load('../../../apps/chatgpt-edge');"
  ]) {
    sources.set(path.join(runtimeRoot, 'core', 'runtime.js'), source);
    assert.throws(() => validateNotActivated({
      runtimeRoot,
      entrypoints: [path.join(runtimeRoot, 'index.js')],
      readFileSync: file => sources.get(file),
      fileExists: file => sources.has(file)
    }), /dynamic_import_forbidden:src\/core\/runtime\.js/);
  }
});

test('R4-C listener and transport builtin exceptions are exact-file and exact-loopback only', () => {
  const edgeRuntimeFile = path.join(ROOTS.edge, 'loopback-runtime.js');
  const edgeSource = require('node:fs').readFileSync(edgeRuntimeFile, 'utf8');
  assert.doesNotThrow(() => validateComponentSource('edge', {
    file: edgeRuntimeFile,
    source: edgeSource
  }));
  assert.throws(() => validateComponentSource('edge', {
    file: edgeRuntimeFile,
    source: edgeSource.replace("server.listen(0, '127.0.0.1')", "server.listen(8080, '0.0.0.0')")
  }), /loopback_listener_contract_invalid/);
  assert.throws(() => validateComponentSource('edge', {
    file: edgeRuntimeFile,
    source: edgeSource.replace(
      "server.listen(0, '127.0.0.1')",
      "const listen = server.listen.bind(server); listen(0, '127.0.0.1'); server.listen(0, '127.0.0.1')"
    )
  }), /service_listener/);
  assert.throws(() => validateComponentSource('edge', {
    file: edgeRuntimeFile,
    source: edgeSource.replace(
      "server.listen(0, '127.0.0.1')",
      "const listen = server['listen'].bind(server); listen(0, '127.0.0.1'); server.listen(0, '127.0.0.1')"
    )
  }), /service_listener/);
  assert.throws(() => validateComponentSource('edge', {
    file: path.join(ROOTS.edge, 'copied-loopback-runtime.js'),
    source: edgeSource
  }), /service_listener|builtin_import_forbidden/);
  assert.throws(() => validateComponentSource('relay', {
    file: path.join(ROOTS.relay, 'unexpected-http-client.js'),
    source: "require('node:http')"
  }), /builtin_import_forbidden/);

  const relayObserverFile = path.join(ROOTS.relay, 'observer-snapshot-uds.js');
  const relayObserverSource = require('node:fs').readFileSync(relayObserverFile, 'utf8');
  assert.doesNotThrow(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource
  }));
  assert.throws(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource.replace(
      'server.listen(socketPath)',
      "server.listen(8080, '0.0.0.0')"
    )
  }), /loopback_listener_contract_invalid|service_listener/);
  assert.throws(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource.replace(
      'chmodSync(socketPath, 0o600)',
      'chmodSync(socketPath, 0o666)'
    )
  }), /owner_only_snapshot_listener_contract_invalid/);
  assert.throws(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource.replace(
      `socket.end(encoded, () => {
          clearRequestDeadline();
          socket.destroy();
        })`,
      'socket.end(encoded)'
    )
  }), /owner_only_snapshot_listener_contract_invalid/);
  assert.throws(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource.replace(
      'requestDeadline = setTimeout(',
      'socket.setTimeout('
    )
  }), /owner_only_snapshot_listener_contract_invalid/);
  assert.throws(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource.replace(
      'const SNAPSHOT_REQUEST_DEADLINE_MS = 5000;',
      'const SNAPSHOT_REQUEST_DEADLINE_MS = 5001;'
    )
  }), /owner_only_snapshot_listener_contract_invalid/);
  assert.throws(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource.replace(
      'const SNAPSHOT_REQUEST_DEADLINE_MS = 5000;',
      `const SNAPSHOT_REQUEST_DEADLINE_MS = 6000;
/* const SNAPSHOT_REQUEST_DEADLINE_MS = 5000; */`
    )
  }), /owner_only_snapshot_listener_contract_invalid/);
  assert.throws(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource.replace(
      'clearTimeout(requestDeadline);',
      'true;'
    )
  }), /owner_only_snapshot_listener_contract_invalid/);
  assert.throws(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource.replace(
      'resolvedParent !== parentPath',
      'resolvedParent === parentPath'
    )
  }), /owner_only_snapshot_listener_contract_invalid/);
  assert.throws(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource.replaceAll(
      'parentStat.uid !== authority.ownerUid',
      'parentStat.uid === authority.ownerUid'
    )
  }), /owner_only_snapshot_listener_contract_invalid/);
  assert.throws(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource.replace(
      'unlinkSync(authority.socketPath)',
      "unlinkSync('/tmp/unsafe-observer.sock')"
    )
  }), /stale_socket_cleanup_contract_invalid|durable_file_mutation/);
  assert.throws(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource.replace(
      "probeStatus !== 'stale'",
      "probeStatus === 'stale'"
    )
  }), /stale_socket_cleanup_contract_invalid/);
  assert.throws(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource.replace(
      'revalidateParentAuthority(authority, { realpathSync, statSync });',
      'true;'
    )
  }), /stale_socket_cleanup_contract_invalid/);
  assert.throws(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource.replace(
      'stat.uid !== authority.ownerUid) {',
      'stat.uid !== authority.ownerUid ||\n      (stat.mode & 0o777) !== 0o600) {'
    )
  }), /stale_socket_cleanup_contract_invalid/);
  assert.throws(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource.replace(
      'lockServer.listen(lockAddress)',
      "lockServer.listen(8080, '0.0.0.0')"
    )
  }), /loopback_listener_contract_invalid|service_listener/);
  assert.throws(() => validateComponentSource('relay', {
    file: relayObserverFile,
    source: relayObserverSource.replace(
      'startupLock.assertHeld();',
      'startupLock.wasHeld();'
    )
  }), /owner_only_snapshot_listener_contract_invalid/);
  assert.throws(() => validateComponentSource('relay', {
    file: path.join(ROOTS.relay, 'copied-observer-snapshot-uds.js'),
    source: relayObserverSource
  }), /runtime_process_access|service_listener|builtin_import_forbidden/);
});

test('public Edge cannot import local config, storage, recall, or arbitrary packages', () => {
  const file = path.join(ROOTS.edge, 'synthetic-negative.js');
  for (const source of [
    "require('../../src/config')",
    "require('../../src/storage')",
    "require('../../src/recall')",
    "require('left-pad')",
    "require('node:fs')"
  ]) {
    assert.throws(() => validateComponentSource('edge', { file, source }));
  }
});

test('Relay and widget cannot import governance, mapping, provider, storage, or node I/O', () => {
  assert.throws(() => validateComponentSource('relay', {
    file: path.join(ROOTS.relay, 'synthetic-negative.js'),
    source: "require('../../src/core/DiaryScopeMapping')"
  }), /project_import_forbidden/);
  assert.throws(() => validateComponentSource('widget', {
    file: path.join(ROOTS.widget, 'synthetic-negative.js'),
    source: "require('node:http')"
  }), /builtin_import_forbidden/);
  assert.throws(() => validateComponentSource('governance', {
    file: path.join(ROOTS.governance, 'synthetic-negative.js'),
    source: "require('../../core/MemoryContextPackageService')"
  }), /project_import_forbidden/);
});

test('dynamic imports, runtime config, listeners, body logs, and durable writes fail static fences', () => {
  const file = path.join(ROOTS.edge, 'synthetic-negative.js');
  for (const source of [
    'const target = "node:fs"; require(target);',
    "require?.('node:fs');",
    "module.require('node:fs');",
    "globalThis['require']('node:fs');"
  ]) {
    assert.throws(() => extractImports(source, 'synthetic.js'), /dynamic_import_forbidden/);
  }
  assert.throws(() => validateComponentSource('edge', {
    file,
    source: "require /*comment*/('node:fs');"
  }), /builtin_import_forbidden/);
  for (const source of [
    'const value = process.env.SECRET_REFERENCE;',
    'const value = process/*comment*/.env.SECRET_REFERENCE;',
    'const value = process?.env.SECRET_REFERENCE;',
    "const value = process?.['env'].SECRET_REFERENCE;",
    "const value = globalThis['process'].env.SECRET_REFERENCE;",
    "const network = globalThis['fetch']; network('https://example.invalid');",
    "globalThis['XMLHttpRequest']();",
    "const network = fetch; network('https://example.invalid');",
    "new WebSocket('wss://example.invalid');",
    "new EventSource('https://example.invalid/events');",
    "navigator.sendBeacon('https://example.invalid', 'synthetic');",
    "({}).constructor.constructor('return 1')();",
    "({})['constructor']['constructor']('return 1')();",
    "eval('require')('node:fs');",
    String.raw`requ\u0069re('node:fs');`,
    'server.listen(8080);',
    'server.listen/*comment*/(8080);',
    'console.log(request.body);',
    'console/*comment*/.log/*comment*/(request.body);',
    'writeFile(target, body);',
    "localStorage.setItem('request', body);",
    "sessionStorage.setItem('response', body);",
    "indexedDB.open('memory');",
    "caches.open('memory');",
    "cookieStore.set('request', body);",
    "document.cookie = 'request=stored';",
    "document['cookie'] = 'request=stored';"
  ]) {
    assert.throws(() => validateComponentSource('edge', { file, source }));
  }
  for (const source of [
    "'globalThis[\\'fetch\\']';",
    '// process.env.SECRET_REFERENCE',
    'const message = "console.log(request.body)";',
    'const message = "localStorage.setItem(request, body)";'
  ]) {
    assert.doesNotThrow(() => validateComponentSource('edge', { file, source }));
  }
});
