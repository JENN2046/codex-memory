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

test('R4-C import fences accept only the loopback reference runtime without activating it', () => {
  const result = validateImportFences();
  assert.equal(result.accepted, true);
  assert.equal(result.stage, 'R4-C');
  assert.equal(result.candidateActivated, false);
  assert.equal(result.loopbackReferenceRuntimeImplemented, true);
  assert.equal(result.externalRuntimeUsed, false);
  assert.equal(result.durableRemoteStateAllowed, false);
  const packageEntrypoints = discoverPackageRuntimeEntrypoints();
  assert.equal(result.activationEntrypointCount, packageEntrypoints.length);
  assert.equal(packageEntrypoints.some(file => file.endsWith('/src/cli/provider-smoke.js')), true);
  assert.equal(packageEntrypoints.some(file => file.endsWith('/scripts/verify-frozen-evidence-manifest.js')), true);
  assert.deepEqual(result.components.map(component => component.component), [
    'contracts', 'edge', 'relay', 'widget', 'governance'
  ]);

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
    file: path.join(ROOTS.edge, 'copied-loopback-runtime.js'),
    source: edgeSource
  }), /service_listener|builtin_import_forbidden/);
  assert.throws(() => validateComponentSource('relay', {
    file: path.join(ROOTS.relay, 'unexpected-http-client.js'),
    source: "require('node:http')"
  }), /builtin_import_forbidden/);
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
