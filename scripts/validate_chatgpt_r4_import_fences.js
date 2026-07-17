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

const FORBIDDEN_RUNTIME_PATTERNS = Object.freeze([
  { pattern: /\bprocess\s*(?:\.|\[)/u, code: 'runtime_process_access' },
  { pattern: /\b(?:eval|Function)\s*(?:\?\.)?\s*\(/u, code: 'runtime_code_generation' },
  { pattern: /\\u(?:\{[0-9a-fA-F]+\}|[0-9a-fA-F]{4})/u, code: 'escaped_source_identifier' },
  { pattern: /\b(?:writeFile|appendFile|createWriteStream|mkdir|rm|unlink)\s*\(/u, code: 'durable_file_mutation' },
  { pattern: /\b(?:createServer|listen)\s*\(/u, code: 'service_listener' },
  { pattern: /\b(?:fetch|XMLHttpRequest)\s*\(/u, code: 'network_invocation' },
  { pattern: /\bconsole\.(?:log|info|warn|error|debug)\s*\(/u, code: 'body_log_risk' }
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
  const literalRequirePattern = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/gu;
  const literalPatterns = [
    literalRequirePattern,
    /\bfrom\s+['"]([^'"]+)['"]/gu,
    /\bimport\s+['"]([^'"]+)['"]/gu,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/gu
  ];
  for (const pattern of literalPatterns) {
    for (const match of source.matchAll(pattern)) imports.push(match[1]);
  }
  const requireReferenceCount = [...source.matchAll(/\brequire\b/gu)].length;
  const literalRequireCount = [...source.matchAll(
    /\brequire\s*\(\s*['"][^'"]+['"]\s*\)/gu
  )].length;
  const memberRequireUsed = /(?<!\.)\.\s*require\s*\(/u.test(source) ||
    /\[\s*['"]require['"]\s*\]\s*\(/u.test(source);
  if (requireReferenceCount !== literalRequireCount || memberRequireUsed) {
    throw new Error(`dynamic_import_forbidden:${relativeFile}`);
  }
  const dynamicImportCount = [...source.matchAll(/\bimport\s*\(/gu)].length;
  const literalDynamicCount = [...source.matchAll(/\bimport\(\s*['"][^'"]+['"]\s*\)/gu)].length;
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
  for (const rule of FORBIDDEN_RUNTIME_PATTERNS) {
    if (rule.pattern.test(source)) throw new Error(`${rule.code}:${relativeFile}`);
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

function validateNotActivated() {
  const activeEntrypoints = [
    path.join(ROOT, 'src', 'index.js'),
    path.join(ROOT, 'src', 'http-index.js'),
    path.join(ROOT, 'src', 'app.js')
  ].filter(fs.existsSync);
  for (const file of activeEntrypoints) {
    const source = fs.readFileSync(file, 'utf8');
    if (/chatgpt-r4|chatgpt-edge|local-recall-relay|memory-scope-widget/u.test(source)) {
      throw new Error(`candidate_runtime_activated:${path.relative(ROOT, file)}`);
    }
  }
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
  validateComponentSource,
  validateComponent,
  validateBoundaryManifests,
  validateNotActivated,
  validateImportFences
};
