'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  ROOTS,
  extractImports,
  validateComponentSource,
  validateNotActivated,
  validateImportFences
} = require('../../scripts/validate_chatgpt_r4_import_fences');

test('R4-B import fences accept the candidate packages without activating them', () => {
  const result = validateImportFences();
  assert.equal(result.accepted, true);
  assert.equal(result.candidateActivated, false);
  assert.equal(result.externalRuntimeUsed, false);
  assert.equal(result.durableRemoteStateAllowed, false);
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
    "eval('require')('node:fs');",
    String.raw`requ\u0069re('node:fs');`,
    'server.listen(8080);',
    'server.listen/*comment*/(8080);',
    'console.log(request.body);',
    'console/*comment*/.log/*comment*/(request.body);',
    'writeFile(target, body);'
  ]) {
    assert.throws(() => validateComponentSource('edge', { file, source }));
  }
});
