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
    allowedRoots: [ROOTS.edge, ROOTS.contracts, ROOTS.widget],
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

const R4C_RUNTIME_FILE_POLICIES = Object.freeze({
  'apps/chatgpt-edge/loopback-runtime.js': Object.freeze({
    allowedBuiltins: Object.freeze(['node:http']),
    allowedRuntimeRules: Object.freeze(['service_listener'])
  }),
  'apps/local-recall-relay/loopback-http-client.js': Object.freeze({
    allowedBuiltins: Object.freeze(['node:http']),
    allowedRuntimeRules: Object.freeze([])
  }),
  'apps/local-recall-relay/uds-transport.js': Object.freeze({
    allowedBuiltins: Object.freeze(['node:net']),
    allowedRuntimeRules: Object.freeze([])
  }),
  'apps/chatgpt-edge/auth0-token-verifier.js': Object.freeze({
    allowedBuiltins: Object.freeze([]),
    allowedPackages: Object.freeze(['jose']),
    allowedRuntimeRules: Object.freeze([])
  }),
  'apps/chatgpt-edge/external-mcp.js': Object.freeze({
    allowedBuiltins: Object.freeze([]),
    allowedPackages: Object.freeze([
      '@modelcontextprotocol/sdk/server/index.js',
      '@modelcontextprotocol/sdk/server/streamableHttp.js',
      '@modelcontextprotocol/sdk/types.js'
    ]),
    allowedRuntimeRules: Object.freeze([])
  }),
  'apps/chatgpt-edge/external-http-runtime.js': Object.freeze({
    allowedBuiltins: Object.freeze(['node:crypto', 'node:http']),
    allowedPackages: Object.freeze([]),
    allowedRuntimeRules: Object.freeze(['service_listener'])
  }),
  'apps/chatgpt-edge/external-main.js': Object.freeze({
    allowedBuiltins: Object.freeze(['node:crypto', 'node:fs', 'node:path']),
    allowedPackages: Object.freeze([]),
    allowedRuntimeRules: Object.freeze(['runtime_process_access'])
  })
});

const JS_GAP = String.raw`(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r?\n|$))*`;
const CANDIDATE_RUNTIME_PATTERN = /(?:^|\/)(?:chatgpt-r4(?:-contracts)?|chatgpt-edge|local-recall-relay|(?:chatgpt-)?memory-scope-widget)(?:\/|$)/u;
const ACTIVE_RUNTIME_DYNAMIC_REQUIRE_ALLOWLIST = Object.freeze({
  'src/core/GovernedMcpVcpNativeVcpToolBoxMcpShim.js': Object.freeze({
    knowledgeBaseManagerPath: 'KnowledgeBaseManager.js',
    embeddingUtilsPath: 'EmbeddingUtils.js'
  })
});

const FORBIDDEN_RUNTIME_PATTERNS = Object.freeze([
  { pattern: /\bprocess\b/u, code: 'runtime_process_access' },
  { pattern: /\b(?:globalThis|global|window|self)\b/u, code: 'runtime_global_access' },
  { pattern: /\b(?:eval|Function)\b/u, code: 'runtime_code_generation' },
  { pattern: /\\u(?:\{[0-9a-fA-F]+\}|[0-9a-fA-F]{4})/u, code: 'escaped_source_identifier' },
  {
    pattern: /\b(?:writeFile|appendFile|createWriteStream|mkdir|rm|unlink)\b/u,
    code: 'durable_file_mutation'
  },
  {
    pattern: /\b(?:localStorage|sessionStorage|indexedDB|caches|CacheStorage|cookieStore)\b|\bdocument\s*\.\s*cookie\b/u,
    bracketPattern: /\bdocument\s*\[\s*['"]cookie['"]\s*\]/u,
    code: 'durable_browser_storage'
  },
  {
    pattern: /\b(?:createServer|listen)\b/u,
    bracketPattern: /\[\s*['"](?:createServer|listen)['"]\s*\]/u,
    code: 'service_listener'
  },
  {
    pattern: /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|WebTransport|RTCPeerConnection|navigator|sendBeacon|importScripts)\b/u,
    code: 'network_invocation'
  },
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
  const requireMainCount = [...source.matchAll(/\brequire\s*\.\s*main\b/gu)].length;
  const memberRequireUsed = new RegExp(
    String.raw`(?<!\.)\.${JS_GAP}require${JS_GAP}\(`,
    'u'
  ).test(source) || new RegExp(
    String.raw`\[${JS_GAP}['"]require['"]${JS_GAP}\]${JS_GAP}\(`,
    'u'
  ).test(source);
  if (requireReferenceCount !== literalRequireCount + requireMainCount || memberRequireUsed) {
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
  const requireMainReferences = [...masked.matchAll(/\brequire\s*\.\s*main\b/gu)].length;
  const allowedDynamicRequireCalls = countAllowedRuntimeDynamicRequireCalls({
    source,
    masked,
    relativeFile
  });
  const memberRequireUsed = /\.\s*require\b/u.test(masked) ||
    /\[\s*['"]require['"]\s*\]/u.test(bracketMasked);
  const importCalls = [...masked.matchAll(/\bimport\s*\(/gu)].length;
  const literalImportCalls = [...masked.matchAll(/\bimport\s*\(\s*['"]\s*['"]\s*\)/gu)].length;
  if (requireReferenceCount !== literalRequireCalls + requireMainReferences + allowedDynamicRequireCalls ||
      memberRequireUsed ||
      importCalls !== literalImportCalls) {
    throw new Error(`dynamic_import_forbidden:${relativeFile}`);
  }
}

function countAllowedRuntimeDynamicRequireCalls({ source, masked, relativeFile }) {
  const bindings = ACTIVE_RUNTIME_DYNAMIC_REQUIRE_ALLOWLIST[relativeFile];
  if (!bindings) return 0;
  let allowedCalls = 0;
  for (const [identifier, fixedFilename] of Object.entries(bindings)) {
    const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const escapedFilename = fixedFilename.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const identifierReferences = [...masked.matchAll(new RegExp(
      String.raw`\b${escapedIdentifier}\b`,
      'gu'
    ))].length;
    const bindingMatches = [...source.matchAll(new RegExp(
      String.raw`\bconst\s+${escapedIdentifier}\s*=\s*path\.join\([^;]{0,240}['"]${escapedFilename}['"]\s*\);`,
      'gu'
    ))].length;
    const requireCalls = [...masked.matchAll(new RegExp(
      String.raw`\brequire\s*\(\s*${escapedIdentifier}\s*\)`,
      'gu'
    ))].length;
    if (bindingMatches !== 1 || requireCalls !== 1 || identifierReferences !== 2) {
      throw new Error(`dynamic_import_forbidden:${relativeFile}`);
    }
    allowedCalls += requireCalls;
  }
  return allowedCalls;
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
  const bracketMaskedSource = maskCommentsAndStringContents(source, {
    preserveBracketStringContents: true
  });
  const runtimeFilePolicy = R4C_RUNTIME_FILE_POLICIES[relativeFile];
  let listenerCheckedSource = maskedSource;
  if (runtimeFilePolicy?.allowedRuntimeRules.includes('service_listener')) {
    const exactLoopbackListen = /\bserver\s*\.\s*listen\s*\(\s*0\s*,\s*['"]127\.0\.0\.1['"]\s*\)/u;
    const exactExternalListen = /\bserver\s*\.\s*listen\s*\(\s*config\.bindPort\s*,\s*config\.bindHost\s*\)/u;
    const exactServerCreation = /\bhttp\s*\.\s*createServer\s*\(/u;
    const listenerCalls = [...maskedSource.matchAll(/\bserver\s*\.\s*listen\s*\(/gu)].length;
    const serverCreations = [...maskedSource.matchAll(/\bhttp\s*\.\s*createServer\s*\(/gu)].length;
    const listenPattern = relativeFile === 'apps/chatgpt-edge/loopback-runtime.js'
      ? exactLoopbackListen
      : exactExternalListen;
    if (!listenPattern.test(source) || listenerCalls !== 1 || serverCreations !== 1) {
      throw new Error(`loopback_listener_contract_invalid:${relativeFile}`);
    }
    const withoutAllowedListeners = source
      .replace(exactServerCreation, match => ' '.repeat(match.length))
      .replace(listenPattern, match => ' '.repeat(match.length));
    listenerCheckedSource = maskCommentsAndStringContents(withoutAllowedListeners);
  }
  for (const rule of FORBIDDEN_RUNTIME_PATTERNS) {
    if (rule.code !== 'service_listener' && runtimeFilePolicy?.allowedRuntimeRules.includes(rule.code)) {
      continue;
    }
    const ruleSource = rule.code === 'service_listener' ? listenerCheckedSource : maskedSource;
    if (rule.pattern.test(ruleSource) || rule.bracketPattern?.test(bracketMaskedSource)) {
      throw new Error(`${rule.code}:${relativeFile}`);
    }
  }
  if (/\.\s*constructor\b/u.test(maskedSource) ||
      /\[\s*['"]constructor['"]\s*\]/u.test(bracketMaskedSource)) {
    throw new Error(`runtime_code_generation:${relativeFile}`);
  }
  const imports = [];
  for (const specifier of extractImports(source, relativeFile)) {
    const resolved = resolveImport(file, specifier);
    imports.push({ relativeFile, specifier });
    const allowedBuiltins = [
      ...policy.allowedBuiltins,
      ...(runtimeFilePolicy?.allowedBuiltins || [])
    ];
    if (resolved.builtin && !allowedBuiltins.includes(resolved.builtin)) {
      throw new Error(`builtin_import_forbidden:${component}:${relativeFile}:${specifier}`);
    }
    if (resolved.package) {
      if (!runtimeFilePolicy?.allowedPackages?.includes(specifier)) {
        throw new Error(`package_import_forbidden:${component}:${relativeFile}:${specifier}`);
      }
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
  const expectedStage = component === 'edge'
    ? 'R4-D-D2A'
    : (component === 'relay' ? 'R4-C' : 'R4-B');
  if (value.stage !== expectedStage || value.activated !== false) {
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
  if (edge.loopbackReferenceListenerImplemented !== true || edge.bindHost !== '127.0.0.1' ||
      edge.bindPort !== 0 || edge.boundedInMemoryState !== true || edge.durableStateImplemented !== false) {
    throw new Error('edge_loopback_boundary_invalid');
  }
  if (edge.externalRuntimeImplemented !== true || edge.externalRuntimeActivated !== false ||
      edge.oauthRequired !== true || edge.relayAuthenticationRequired !== true ||
      edge.zeroMemoryCountersRequired !== true || edge.externalMcpPath !== '/mcp' ||
      edge.protectedResourceMetadataPath !== '/.well-known/oauth-protected-resource') {
    throw new Error('edge_external_boundary_invalid');
  }
  for (const capability of ['diary_mapping_load', 'provider_invocation', 'memory_storage', 'scope_authorization']) {
    if (!relay.forbiddenCapabilities.includes(capability)) throw new Error(`relay_capability_not_forbidden:${capability}`);
  }
  if (relay.loopbackHttpClientImplemented !== true || relay.temporaryUdsClientImplemented !== true ||
      relay.serviceListenerImplemented !== false || relay.durableStateImplemented !== false) {
    throw new Error('relay_loopback_boundary_invalid');
  }
  if (widget.authorizationAuthority !== false || widget.rawMemoryDisplayAllowed !== false) {
    throw new Error('widget_boundary_invalid');
  }
  if (governance.directCoreImportAllowed !== false || governance.injectedGovernanceOnly !== true) {
    throw new Error('governance_boundary_invalid');
  }
}

function discoverPackageRuntimeEntrypoints({
  packageFile = path.join(ROOT, 'package.json'),
  fileExists = isFile
} = {}) {
  const manifest = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  const relativeEntrypoints = [];
  if (typeof manifest.main === 'string') relativeEntrypoints.push(manifest.main);
  if (typeof manifest.bin === 'string') relativeEntrypoints.push(manifest.bin);
  if (manifest.bin && typeof manifest.bin === 'object') {
    relativeEntrypoints.push(...Object.values(manifest.bin).filter(value => typeof value === 'string'));
  }
  for (const command of Object.values(manifest.scripts || {})) {
    if (typeof command !== 'string') continue;
    const pattern = /\bnode(?:\s+--[A-Za-z0-9=._:-]+)*\s+((?:\.\/)?(?:src|scripts)\/[A-Za-z0-9._/-]+\.js)\b/gu;
    for (const match of command.matchAll(pattern)) relativeEntrypoints.push(match[1]);
  }
  const packageRoot = path.dirname(packageFile);
  return [...new Set(relativeEntrypoints.map(relative => path.resolve(packageRoot, relative)))]
    .filter(fileExists)
    .sort();
}

function validateNotActivated({
  runtimeRoot = path.join(ROOT, 'src'),
  entrypoints,
  readFileSync = file => fs.readFileSync(file, 'utf8'),
  fileExists = isFile,
  moduleRoot = path.dirname(runtimeRoot)
} = {}) {
  const activeEntrypoints = (entrypoints || discoverPackageRuntimeEntrypoints({ fileExists }))
    .filter(fileExists);
  const queue = [...activeEntrypoints];
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
      if (resolved && isWithin(resolved, moduleRoot) && !visited.has(resolved)) queue.push(resolved);
    }
  }
  return { entrypointCount: activeEntrypoints.length, moduleCount: visited.size };
}

function validateImportFences() {
  validateBoundaryManifests();
  const activation = validateNotActivated();
  const components = ['contracts', 'edge', 'relay', 'widget', 'governance'].map(component => validateComponent(component));
  return {
    accepted: true,
    stage: 'R4-D-D2A',
    components,
    candidateActivated: false,
    loopbackReferenceRuntimeImplemented: true,
    externalRuntimeImplemented: true,
    externalRuntimeActivated: false,
    activationEntrypointCount: activation.entrypointCount,
    activationModuleCount: activation.moduleCount,
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
  R4C_RUNTIME_FILE_POLICIES,
  extractImports,
  extractStaticRuntimeImports,
  maskCommentsAndStringContents,
  assertNoDynamicRuntimeImports,
  resolveRuntimeModuleFile,
  discoverPackageRuntimeEntrypoints,
  validateComponentSource,
  validateComponent,
  validateBoundaryManifests,
  validateNotActivated,
  validateImportFences
};
