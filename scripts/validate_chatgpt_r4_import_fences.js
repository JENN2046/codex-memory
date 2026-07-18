#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ROOTS = Object.freeze({
  contracts: path.join(ROOT, 'packages', 'chatgpt-r4-contracts'),
  edge: path.join(ROOT, 'apps', 'chatgpt-edge'),
  relay: path.join(ROOT, 'apps', 'local-recall-relay'),
  widget: path.join(ROOT, 'apps', 'chatgpt-memory-scope-widget'),
  governance: path.join(ROOT, 'src', 'adapters', 'chatgpt-r4')
});

const COMPONENT_POLICIES = Object.freeze({
  contracts: {
    allowedRoots: [ROOTS.contracts],
    allowedBuiltins: ['node:crypto']
  },
  edge: {
    allowedRoots: [ROOTS.edge, ROOTS.contracts],
    allowedBuiltins: []
  },
  relay: {
    allowedRoots: [ROOTS.relay, ROOTS.contracts],
    allowedBuiltins: []
  },
  widget: {
    allowedRoots: [ROOTS.widget, ROOTS.contracts],
    allowedBuiltins: []
  },
  governance: {
    allowedRoots: [ROOTS.governance, ROOTS.contracts],
    allowedBuiltins: []
  }
});

const JS_GAP = String.raw`(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r?\n|$))*`;
const CANDIDATE_RUNTIME_PATTERN = /(?:^|\/)(?:chatgpt-r4(?:-contracts)?|chatgpt-edge|local-recall-relay|(?:chatgpt-)?memory-scope-widget)(?:\/|$)/u;

const FORBIDDEN_RUNTIME_PATTERNS = Object.freeze([
  { pattern: /\bprocess\b/u, code: 'runtime_process_access' },
  { pattern: /\b(?:globalThis|global|window|self)\b/u, code: 'runtime_global_access' },
  { pattern: /\b(?:eval|Function)\b/u, code: 'runtime_code_generation' },
  { pattern: /\\u(?:\{[0-9a-fA-F]+\}|[0-9a-fA-F]{4})/u, code: 'escaped_source_identifier' },
  {
    pattern: /\b(?:writeFile|appendFile|createWriteStream|mkdir|rm|unlink)\b/u,
    code: 'durable_file_mutation'
  },
  { pattern: /\b(?:createServer|listen)\b/u, code: 'service_listener' },
  { pattern: /\b(?:fetch|XMLHttpRequest)\b/u, code: 'network_invocation' },
  { pattern: /\bconsole\b/u, code: 'body_log_risk' }
]);

function isWithin(file, directory) {
  const relative = path.relative(directory, file);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function walkFiles(directory, suffix = '.js') {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(fullPath, suffix));
    if (entry.isFile() && entry.name.endsWith(suffix)) output.push(fullPath);
  }
  return output.sort();
}

function extractImports(source, relativeFile) {
  const imports = [];
  const literalRequireSource = String.raw`\brequire${JS_GAP}\(${JS_GAP}['"]([^'"]+)['"]${JS_GAP}\)`;
  const literalRequirePattern = new RegExp(literalRequireSource, 'gu');
  const literalDynamicImportSource = String.raw`\bimport${JS_GAP}\(${JS_GAP}['"]([^'"]+)['"]${JS_GAP}\)`;
  const literalPatterns = [
    literalRequirePattern,
    /\bfrom\s+['"]([^'"]+)['"]/gu,
    /\bimport\s+['"]([^'"]+)['"]/gu,
    new RegExp(literalDynamicImportSource, 'gu')
  ];
  for (const pattern of literalPatterns) {
    for (const match of source.matchAll(pattern)) imports.push(match[1]);
  }
  const requireReferenceCount = [...source.matchAll(/\brequire\b/gu)].length;
  const literalRequireCount = [...source.matchAll(new RegExp(literalRequireSource, 'gu'))].length;
  const memberRequireUsed = new RegExp(
    String.raw`(?<!\.)\.${JS_GAP}require${JS_GAP}\(`,
    'u'
  ).test(source) || new RegExp(
    String.raw`\[${JS_GAP}['"]require['"]${JS_GAP}\]${JS_GAP}\(`,
    'u'
  ).test(source);
  if (requireReferenceCount !== literalRequireCount || memberRequireUsed) {
    throw new Error(`dynamic_import_forbidden:${relativeFile}`);
  }
  const dynamicImportCount = [...source.matchAll(new RegExp(
    String.raw`\bimport${JS_GAP}\(`,
    'gu'
  ))].length;
  const literalDynamicCount = [...source.matchAll(new RegExp(literalDynamicImportSource, 'gu'))].length;
  if (dynamicImportCount !== literalDynamicCount) {
    throw new Error(`dynamic_import_forbidden:${relativeFile}`);
  }
  return [...new Set(imports)].sort();
}

function resolveImport(file, specifier) {
  if (specifier.startsWith('node:')) return { builtin: specifier };
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    return { package: specifier };
  }
  return { file: path.resolve(path.dirname(file), specifier) };
}

function extractStaticRuntimeImports(source) {
  const imports = [];
  const patterns = [
    new RegExp(String.raw`\brequire${JS_GAP}\(${JS_GAP}['"]([^'"]+)['"]${JS_GAP}\)`, 'gu'),
    /\bfrom\s+['"]([^'"]+)['"]/gu,
    /\bimport\s+['"]([^'"]+)['"]/gu,
    new RegExp(String.raw`\bimport${JS_GAP}\(${JS_GAP}['"]([^'"]+)['"]${JS_GAP}\)`, 'gu')
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) imports.push(match[1]);
  }
  return [...new Set(imports)].sort();
}

function maskCommentsAndStringContents(source, { preserveBracketStringContents = false } = {}) {
  const output = source.split('');

  function maskCharacter(index) {
    if (output[index] !== '\n' && output[index] !== '\r') output[index] = ' ';
  }

  function previousCodeCharacter(index) {
    while (index >= 0 && /\s/u.test(output[index])) index -= 1;
    return output[index];
  }

  function maskQuoted(index, quote) {
    const preserveContents = preserveBracketStringContents &&
      previousCodeCharacter(index - 1) === '[';
    index += 1;
    while (index < output.length) {
      if (output[index] === '\\') {
        if (!preserveContents) {
          maskCharacter(index);
          if (index + 1 < output.length) maskCharacter(index + 1);
        }
        index += 2;
        continue;
      }
      if (output[index] === quote) return index + 1;
      if (!preserveContents) maskCharacter(index);
      index += 1;
    }
    return index;
  }

  function maskLineComment(index) {
    output[index] = ' ';
    output[index + 1] = ' ';
    index += 2;
    while (index < output.length && output[index] !== '\n' && output[index] !== '\r') {
      output[index] = ' ';
      index += 1;
    }
    return index;
  }

  function maskBlockComment(index) {
    output[index] = ' ';
    output[index + 1] = ' ';
    index += 2;
    while (index < output.length) {
      if (output[index] === '*' && output[index + 1] === '/') {
        output[index] = ' ';
        output[index + 1] = ' ';
        return index + 2;
      }
      maskCharacter(index);
      index += 1;
    }
    return index;
  }

  function maskTemplate(index) {
    index += 1;
    while (index < output.length) {
      if (output[index] === '\\') {
        maskCharacter(index);
        if (index + 1 < output.length) maskCharacter(index + 1);
        index += 2;
        continue;
      }
      if (output[index] === '`') return index + 1;
      if (output[index] === '$' && output[index + 1] === '{') {
        index = scanCode(index + 2, true);
        continue;
      }
      maskCharacter(index);
      index += 1;
    }
    return index;
  }

  function scanCode(index, stopAtTemplateBrace = false) {
    let braceDepth = stopAtTemplateBrace ? 1 : 0;
    while (index < output.length) {
      const current = output[index];
      const next = output[index + 1];
      if (current === '/' && next === '/') {
        index = maskLineComment(index);
        continue;
      }
      if (current === '/' && next === '*') {
        index = maskBlockComment(index);
        continue;
      }
      if (current === "'" || current === '"') {
        index = maskQuoted(index, current);
        continue;
      }
      if (current === '`') {
        index = maskTemplate(index);
        continue;
      }
      if (stopAtTemplateBrace && current === '{') braceDepth += 1;
      if (stopAtTemplateBrace && current === '}') {
        braceDepth -= 1;
        if (braceDepth === 0) return index + 1;
      }
      index += 1;
    }
    return index;
  }

  scanCode(0);
  return output.join('');
}

function assertNoDynamicRuntimeImports(source, relativeFile) {
  const masked = maskCommentsAndStringContents(source);
  const bracketMasked = maskCommentsAndStringContents(source, {
    preserveBracketStringContents: true
  });
  const requireReferenceCount = [...masked.matchAll(/\brequire\b/gu)].length;
  const literalRequireCalls = [...masked.matchAll(/\brequire\s*\(\s*['"]\s*['"]\s*\)/gu)].length;
  const memberRequireUsed = /\.\s*require\s*(?:\?\s*\.\s*)?\(/u.test(masked) ||
    /\[\s*['"]require['"]\s*\]\s*(?:\?\s*\.\s*)?\(/u.test(bracketMasked);
  const importCalls = [...masked.matchAll(/\bimport\s*\(/gu)].length;
  const literalImportCalls = [...masked.matchAll(/\bimport\s*\(\s*['"]\s*['"]\s*\)/gu)].length;
  if (requireReferenceCount !== literalRequireCalls || memberRequireUsed ||
      importCalls !== literalImportCalls) {
    throw new Error(`dynamic_import_forbidden:${relativeFile}`);
  }
}

function isFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function resolveRuntimeModuleFile(file, specifier, { fileExists = isFile } = {}) {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return null;
  const base = path.resolve(path.dirname(file), specifier);
  const candidates = [base];
  if (!/\.(?:cjs|js|mjs)$/u.test(base)) {
    candidates.push(`${base}.js`, `${base}.cjs`, `${base}.mjs`);
    candidates.push(path.join(base, 'index.js'), path.join(base, 'index.cjs'), path.join(base, 'index.mjs'));
  }
  return candidates.find(candidate => fileExists(candidate)) || null;
}

function validateComponent(component, root = ROOTS[component]) {
  const files = walkFiles(root);
  const imports = [];
  for (const file of files) {
    const relativeFile = path.relative(ROOT, file).split(path.sep).join('/');
    const source = fs.readFileSync(file, 'utf8');
    imports.push(...validateComponentSource(component, { file, source }));
  }
  return { component, fileCount: files.length, importCount: imports.length };
}

function validateComponentSource(component, { file, source }) {
  const policy = COMPONENT_POLICIES[component];
  if (!policy) throw new Error(`component_policy_missing:${component}`);
  const relativeFile = path.relative(ROOT, file).split(path.sep).join('/');
  const maskedSource = maskCommentsAndStringContents(source);
  for (const rule of FORBIDDEN_RUNTIME_PATTERNS) {
    if (rule.pattern.test(maskedSource)) throw new Error(`${rule.code}:${relativeFile}`);
  }
  const imports = [];
  for (const specifier of extractImports(source, relativeFile)) {
    const resolved = resolveImport(file, specifier);
    imports.push({ relativeFile, specifier });
    if (resolved.builtin && !policy.allowedBuiltins.includes(resolved.builtin)) {
      throw new Error(`builtin_import_forbidden:${component}:${relativeFile}:${specifier}`);
    }
    if (resolved.package) {
      throw new Error(`package_import_forbidden:${component}:${relativeFile}:${specifier}`);
    }
    if (resolved.file && !policy.allowedRoots.some(allowedRoot => isWithin(resolved.file, allowedRoot))) {
      throw new Error(`project_import_forbidden:${component}:${relativeFile}:${specifier}`);
    }
  }
  return imports;
}

function readBoundary(component) {
  const file = path.join(ROOTS[component], 'package-boundary.json');
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (value.stage !== 'R4-B' || value.activated !== false) {
    throw new Error(`boundary_activation_invalid:${component}`);
  }
  return value;
}

function validateBoundaryManifests() {
  const edge = readBoundary('edge');
  const relay = readBoundary('relay');
  const widget = readBoundary('widget');
  const governance = readBoundary('governance');
  if (edge.defaultProfile !== false || !edge.forbiddenCapabilities.includes('durable_memory')) {
    throw new Error('edge_boundary_invalid');
  }
  for (const capability of ['diary_mapping_load', 'provider_invocation', 'memory_storage', 'scope_authorization']) {
    if (!relay.forbiddenCapabilities.includes(capability)) throw new Error(`relay_capability_not_forbidden:${capability}`);
  }
  if (widget.authorizationAuthority !== false || widget.rawMemoryDisplayAllowed !== false) {
    throw new Error('widget_boundary_invalid');
  }
  if (governance.directCoreImportAllowed !== false || governance.injectedGovernanceOnly !== true) {
    throw new Error('governance_boundary_invalid');
  }
}

function validateNotActivated({
  runtimeRoot = path.join(ROOT, 'src'),
  entrypoints = [path.join(runtimeRoot, 'index.js'), path.join(runtimeRoot, 'http-index.js')],
  readFileSync = file => fs.readFileSync(file, 'utf8'),
  fileExists = isFile
} = {}) {
  const queue = entrypoints.filter(fileExists);
  const visited = new Set();
  while (queue.length > 0) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    const source = readFileSync(file);
    const relativeFile = path.relative(path.dirname(runtimeRoot), file).split(path.sep).join('/');
    assertNoDynamicRuntimeImports(source, relativeFile);
    for (const specifier of extractStaticRuntimeImports(source)) {
      const resolved = resolveRuntimeModuleFile(file, specifier, { fileExists });
      if (CANDIDATE_RUNTIME_PATTERN.test(specifier) ||
          (resolved && CANDIDATE_RUNTIME_PATTERN.test(resolved.split(path.sep).join('/')))) {
        throw new Error(`candidate_runtime_activated:${relativeFile}:${specifier}`);
      }
      if (resolved && isWithin(resolved, runtimeRoot) && !visited.has(resolved)) queue.push(resolved);
    }
  }
  return { entrypointCount: entrypoints.length, moduleCount: visited.size };
}

function validateImportFences() {
  validateBoundaryManifests();
  validateNotActivated();
  const components = ['contracts', 'edge', 'relay', 'widget', 'governance'].map(component => validateComponent(component));
  return {
    accepted: true,
    stage: 'R4-B',
    components,
    candidateActivated: false,
    externalRuntimeUsed: false,
    durableRemoteStateAllowed: false,
    publicToolSurfaceExpanded: false
  };
}

function main() {
  try {
    process.stdout.write(`${JSON.stringify(validateImportFences())}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  ROOT,
  ROOTS,
  COMPONENT_POLICIES,
  extractImports,
  extractStaticRuntimeImports,
  maskCommentsAndStringContents,
  assertNoDynamicRuntimeImports,
  resolveRuntimeModuleFile,
  validateComponentSource,
  validateComponent,
  validateBoundaryManifests,
  validateNotActivated,
  validateImportFences
};
