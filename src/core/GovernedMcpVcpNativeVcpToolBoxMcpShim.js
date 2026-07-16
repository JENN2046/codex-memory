'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');

const {
  REQUIRED_ACCESS_PATH,
  REQUIRED_PRIMARY_RUNTIME,
  validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal
} = require('./CurrentProductGoalContract');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');
const {
  GOVERNED_NATIVE_VISIBILITIES,
  canonicalGovernedNativeClient
} = require('./MemoryAccessContract');
const {
  buildMemoryContextLowDisclosureProjection
} = require('./MemoryContextPackageService');

const GOVERNANCE_METADATA_PATH = 'params._meta.codexMemoryGovernance';
const PUBLIC_TOOL_TO_NATIVE_TOOLS = Object.freeze({
  search_memory: Object.freeze(['knowledge_base.search']),
  memory_overview: Object.freeze(['memory_overview']),
  audit_memory: Object.freeze(['audit_memory']),
  record_memory: Object.freeze(['knowledge_base.record', 'knowledge_base.write']),
  tombstone_memory: Object.freeze(['knowledge_base.tombstone']),
  supersede_memory: Object.freeze(['knowledge_base.supersede'])
});
const GOVERNANCE_ARGUMENT_KEYS = Object.freeze(new Set([
  'accesspath',
  'auditreceipt',
  'clientid',
  'exactapprovalresult',
  'governedbridge',
  'governancemeta',
  'invocationprofile',
  'localmemoryrole',
  'outputdisclosurebudget',
  'primaryruntime',
  'readwriteauthority',
  'rollbackposture',
  'runtimetarget',
  'scope',
  'visibility'
]));
const SHIM_SERVER_NAME = 'codex-memory-governed-vcp-toolbox-native-shim';
const SHIM_PROTOCOL_VERSION = '2024-11-05';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function jsonRpcError(id, code, message, data = undefined) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data })
    }
  };
}

function nativeRuntimeReceipt(overrides = {}) {
  return {
    nativeRuntimeCalled: overrides.nativeRuntimeCalled === true,
    nativeRuntimeInitialized: overrides.nativeRuntimeInitialized === true,
    providerApiCalled: overrides.providerApiCalled === true,
    memoryReadPerformed: overrides.memoryReadPerformed === true,
    memoryWritePerformed: overrides.memoryWritePerformed === true,
    durableWritePerformed: overrides.durableWritePerformed === true,
    durableWriteScope: typeof overrides.durableWriteScope === 'string'
      ? overrides.durableWriteScope
      : null,
    isolatedRuntimeStoreUsed: overrides.isolatedRuntimeStoreUsed === true,
    primaryMemoryStoreWritePerformed: overrides.primaryMemoryStoreWritePerformed === true,
    derivedIndexWritePerformed: overrides.derivedIndexWritePerformed === true,
    rawRuntimeOutputDisclosed: false,
    rawMemoryContentDisclosed: false,
    runtimeLocatorDisclosed: false,
    tokenMaterialDisclosed: false,
    readinessClaimed: false
  };
}

function jsonRpcResult(id, structuredContent, runtimeReceipt = null) {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      structuredContent,
      ...(runtimeReceipt ? {
        _meta: {
          codexMemoryNativeRuntimeReceipt: runtimeReceipt
        }
      } : {})
    }
  };
}

function lowDisclosureShimMeta(enableWrite = false) {
  return {
    bridge: 'codex-memory-governed-vcp-toolbox-native-memory',
    primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
    accessPath: REQUIRED_ACCESS_PATH,
    governanceMetadataPath: GOVERNANCE_METADATA_PATH,
    publicTools: Object.keys(PUBLIC_TOOL_TO_NATIVE_TOOLS),
    writeEnabled: enableWrite === true,
    lowDisclosure: true,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    locatorDisclosed: false,
    configEnvRead: false,
    providerApiCalled: false,
    nativeRuntimeCalled: false,
    readinessClaimed: false
  };
}

function toolInputSchema(nativeToolName, publicToolNames = []) {
  const writeTool = publicToolNames.some(toolName => [
    'record_memory',
    'tombstone_memory',
    'supersede_memory'
  ].includes(toolName));
  const overviewTool = publicToolNames.includes('memory_overview') || nativeToolName === 'memory_overview';
  const auditTool = publicToolNames.includes('audit_memory') || nativeToolName === 'audit_memory';
  return {
    type: 'object',
    additionalProperties: true,
    properties: {
      ...(writeTool ? {
        title: { type: 'string' },
        content: { type: 'string' },
        evidence: { type: 'string' },
        memory_id: { type: 'string' },
        old_memory_id: { type: 'string' },
        new_memory_id: { type: 'string' }
      } : overviewTool ? {
        limit: { type: 'number' }
      } : auditTool ? {
        audit_family: { type: 'string' },
        window: { type: 'number' },
        include_raw: { type: 'boolean' }
      } : {
        query: { type: 'string' },
        limit: { type: 'number' },
        max_results: { type: 'number' }
      })
    },
    _meta: {
      codexMemoryGovernanceRequired: true,
      governanceMetadataPath: GOVERNANCE_METADATA_PATH,
      publicToolNames,
      nativeToolName,
      toolArgumentsMayCarryGovernance: false,
      rawOutputAllowed: false,
      lowDisclosure: true
    }
  };
}

function nativeToolDescriptors(enableWrite = false) {
  const descriptors = [{
    name: 'knowledge_base.search',
    description: 'Governed VCPToolBox native memory search surface for Codex search_memory.',
    inputSchema: toolInputSchema('knowledge_base.search', ['search_memory']),
    _meta: {
      publicToolNames: ['search_memory'],
      readAllowed: true,
      writeAllowed: false,
      exactApprovalRequired: false,
      lowDisclosure: true,
      rawOutputAllowed: false,
      readinessClaimed: false
    }
  }, {
    name: 'memory_overview',
    description: 'Governed VCPToolBox native memory overview surface for Codex memory_overview.',
    inputSchema: toolInputSchema('memory_overview', ['memory_overview']),
    _meta: {
      publicToolNames: ['memory_overview'],
      readAllowed: true,
      writeAllowed: false,
      exactApprovalRequired: false,
      lowDisclosure: true,
      rawOutputAllowed: false,
      readinessClaimed: false
    }
  }, {
    name: 'audit_memory',
    description: 'Governed VCPToolBox native memory audit surface for Codex audit_memory.',
    inputSchema: toolInputSchema('audit_memory', ['audit_memory']),
    _meta: {
      publicToolNames: ['audit_memory'],
      readAllowed: true,
      writeAllowed: false,
      exactApprovalRequired: false,
      lowDisclosure: true,
      rawOutputAllowed: false,
      readinessClaimed: false
    }
  }];

  if (enableWrite === true) {
    for (const [nativeToolName, publicToolNames] of [
      ['knowledge_base.record', ['record_memory']],
      ['knowledge_base.write', ['record_memory']],
      ['knowledge_base.tombstone', ['tombstone_memory']],
      ['knowledge_base.supersede', ['supersede_memory']]
    ]) {
      descriptors.push({
        name: nativeToolName,
        description: 'Governed VCPToolBox native memory write surface requiring exact approval.',
        inputSchema: toolInputSchema(nativeToolName, publicToolNames),
        _meta: {
          publicToolNames,
          readAllowed: false,
          writeAllowed: true,
          exactApprovalRequired: true,
          lowDisclosure: true,
          rawOutputAllowed: false,
          readinessClaimed: false
        }
      });
    }
  }

  return descriptors;
}

function initializeResult(enableWrite = false) {
  return {
    protocolVersion: SHIM_PROTOCOL_VERSION,
    serverInfo: {
      name: SHIM_SERVER_NAME,
      version: '0.0.0'
    },
    capabilities: {
      tools: {
        listChanged: false
      }
    },
    _meta: lowDisclosureShimMeta(enableWrite)
  };
}

function toolsListResult(enableWrite = false) {
  return {
    tools: nativeToolDescriptors(enableWrite),
    _meta: lowDisclosureShimMeta(enableWrite)
  };
}

function readRequestBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('request_body_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function validateGovernanceForNativeTool(nativeToolName, governanceMeta) {
  if (!isPlainObject(governanceMeta)) {
    return {
      accepted: false,
      publicToolName: null,
      reasonCode: 'invalid_governance_metadata'
    };
  }
  const publicToolName = typeof governanceMeta?.invocationProfile?.toolName === 'string'
    ? governanceMeta.invocationProfile.toolName
    : null;
  const allowedNativeTools = publicToolName ? PUBLIC_TOOL_TO_NATIVE_TOOLS[publicToolName] : null;
  if (!allowedNativeTools || !allowedNativeTools.includes(nativeToolName)) {
    return {
      accepted: false,
      publicToolName,
      reasonCode: allowedNativeTools ? 'native_tool_public_binding_mismatch' : 'unsupported_native_tool'
    };
  }
  const coverage = validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(
    governanceMeta,
    { toolName: publicToolName }
  );
  return {
    accepted: coverage.accepted === true,
    publicToolName,
    reasonCode: coverage.accepted === true
      ? null
      : 'invalid_governance_metadata',
    blockers: coverage.blockers || []
  };
}

function boundedString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function normalizedArgumentKey(value) {
  return typeof value === 'string'
    ? value.toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';
}

function isGovernanceArgumentKey(key) {
  return GOVERNANCE_ARGUMENT_KEYS.has(normalizedArgumentKey(key));
}

function sanitizeNativeBusinessArguments(value, depth = 0) {
  if (depth > 6) return null;
  if (Array.isArray(value)) {
    return value.map(item => sanitizeNativeBusinessArguments(item, depth + 1));
  }
  if (!isPlainObject(value)) {
    if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'undefined') return null;
    return value;
  }

  const output = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (isGovernanceArgumentKey(key)) continue;
    output[key] = sanitizeNativeBusinessArguments(nestedValue, depth + 1);
  }
  return output;
}

function canonicalScopeFromGovernanceMeta(governanceMeta = {}) {
  const executionContext = governanceMeta?.trustedExecutionContext?.executionContext || {};
  const scope = {};
  const clientId = canonicalGovernedNativeClient(executionContext.clientId);
  if (isSafeReferenceName(executionContext.projectId)) scope.project_id = executionContext.projectId;
  if (isSafeReferenceName(executionContext.workspaceId)) scope.workspace_id = executionContext.workspaceId;
  if (isSafeReferenceName(executionContext.scopeId)) scope.scope_id = executionContext.scopeId;
  if (clientId) scope.client_id = clientId;
  if (GOVERNED_NATIVE_VISIBILITIES.includes(executionContext.visibility)) {
    scope.visibility = executionContext.visibility;
  }
  return Object.keys(scope).length > 0 ? scope : null;
}

function canonicalGovernedBridgeFromGovernanceMeta(nativeToolName, publicToolName, governanceMeta = {}) {
  const scope = canonicalScopeFromGovernanceMeta(governanceMeta);
  const clientId = canonicalGovernedNativeClient(
    governanceMeta?.trustedExecutionContext?.executionContext?.clientId
  );
  const readAllowed = governanceMeta?.readWriteAuthority?.readAllowed === true;
  const writeAllowed = governanceMeta?.readWriteAuthority?.writeAllowed === true;
  const targetReferenceName = isSafeReferenceName(governanceMeta?.runtimeTarget?.targetReferenceName)
    ? governanceMeta.runtimeTarget.targetReferenceName
    : null;
  return {
    primary_runtime: REQUIRED_PRIMARY_RUNTIME,
    access_path: REQUIRED_ACCESS_PATH,
    client_id: clientId,
    scope,
    visibility: scope?.visibility || null,
    runtime_target: {
      primary_runtime: REQUIRED_PRIMARY_RUNTIME,
      target_reference_name: targetReferenceName,
      target_kind: governanceMeta?.runtimeTarget?.targetKind === 'mcp_server' ? 'mcp_server' : null,
      bound: governanceMeta?.runtimeTarget?.bound === true,
      endpoint_included: false,
      token_material_included: false
    },
    invocation_profile: typeof governanceMeta?.invocationProfile?.profile === 'string'
      ? governanceMeta.invocationProfile.profile
      : null,
    invocation_tool_name: publicToolName,
    native_tool_name: nativeToolName,
    read_allowed: readAllowed,
    write_allowed: writeAllowed,
    raw_output_allowed: governanceMeta?.outputDisclosureBudget?.rawOutput === true,
    disclosure_level: typeof governanceMeta?.outputDisclosureBudget?.level === 'string'
      ? governanceMeta.outputDisclosureBudget.level
      : null,
    audit_receipt_required: governanceMeta?.auditReceipt?.required === true,
    rollback_posture: typeof governanceMeta?.rollbackPosture?.mode === 'string'
      ? governanceMeta.rollbackPosture.mode
      : null,
    tool_arguments_may_override_governance: false,
    governance_metadata_may_override_transport_context: false,
    raw_scope_value_returned: false,
    raw_request_body_disclosed: false,
    raw_response_body_disclosed: false,
    endpoint_disclosed: false,
    token_material_disclosed: false,
    low_disclosure: true,
    readiness_claimed: false
  };
}

function projectNativeArguments(nativeToolName, publicToolName, args = {}, governanceMeta = {}) {
  const projected = sanitizeNativeBusinessArguments(isPlainObject(args) ? args : {});
  const canonicalScope = canonicalScopeFromGovernanceMeta(governanceMeta);
  if (canonicalScope) projected.scope = canonicalScope;
  projected.governed_bridge = canonicalGovernedBridgeFromGovernanceMeta(
    nativeToolName,
    publicToolName,
    governanceMeta
  );
  return projected;
}

function normalizeLimit(value, fallback = 1) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(0, Math.min(parsed, 5));
}

function bucketCount(value) {
  const count = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(count) || count <= 0) return 'zero';
  if (count <= 5) return 'bounded';
  return 'over_budget';
}

function defaultReadRuntimeReceipt({
  providerApiCalled = false,
  memoryReadPerformed = true,
  isolatedRuntimeStoreUsed = false
} = {}) {
  return nativeRuntimeReceipt({
    nativeRuntimeCalled: true,
    nativeRuntimeInitialized: true,
    providerApiCalled,
    memoryReadPerformed,
    memoryWritePerformed: false,
    durableWritePerformed: providerApiCalled === true && memoryReadPerformed === true,
    durableWriteScope: providerApiCalled === true && memoryReadPerformed === true
      ? isolatedRuntimeStoreUsed
        ? 'isolated_derived_index'
        : 'native_runtime_store'
      : null,
    isolatedRuntimeStoreUsed,
    primaryMemoryStoreWritePerformed: false,
    derivedIndexWritePerformed: providerApiCalled === true && memoryReadPerformed === true
  });
}

function projectReadResults(results = []) {
  if (!Array.isArray(results)) return [];
  return results.slice(0, 5).map((item, index) => ({
    sourceFilePresent: typeof item?.sourceFile === 'string' && item.sourceFile.length > 0,
    scorePresent: typeof item?.score === 'number',
    tagCountBucket: Array.isArray(item?.matchedTags)
      ? item.matchedTags.length === 0
        ? 'zero'
        : item.matchedTags.length <= 5
          ? 'bounded'
          : 'over_budget'
      : 'unknown',
    sourceKinds: ['vcp_native'],
    memoryContextProjection: buildMemoryContextLowDisclosureProjection(item, index)
  }));
}

function safeFilenamePart(value) {
  return String(value || 'memory')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'memory';
}

function createRecordMarkdown(args = {}) {
  const title = boundedString(args.title, 200) || 'codex-memory governed native record';
  const content = boundedString(args.content, 20_000);
  const evidence = boundedString(args.evidence, 8_000);
  const sensitivity = boundedString(args.sensitivity, 80) || 'internal';
  return [
    '---',
    'source: codex-memory-governed-native-mcp-shim',
    `sensitivity: ${JSON.stringify(sensitivity)}`,
    '---',
    '',
    `# ${title}`,
    '',
    content,
    '',
    '## Evidence',
    '',
    evidence,
    ''
  ].join('\n');
}

function createMutationMarkdown(toolName, args = {}) {
  const titleByTool = {
    tombstone_memory: 'codex-memory governed native tombstone marker',
    supersede_memory: 'codex-memory governed native supersede marker'
  };
  const markerFields = toolName === 'supersede_memory'
    ? [
        ['old_memory_id', 200],
        ['new_memory_id', 200],
        ['reason', 1000],
        ['evidence', 4000],
        ['supersedes_link', 200],
        ['superseded_by_link', 200]
      ]
    : [
        ['memory_id', 200],
        ['reason', 1000],
        ['evidence', 4000],
        ['tombstone_reason', 1000]
      ];
  const lines = [
    '---',
    'source: codex-memory-governed-native-mcp-shim',
    `governed_mutation_tool: ${JSON.stringify(toolName)}`,
    'mutation_marker_only: true',
    '---',
    '',
    `# ${titleByTool[toolName] || 'codex-memory governed native mutation marker'}`,
    ''
  ];
  for (const [field, limit] of markerFields) {
    const value = boundedString(args[field], limit);
    if (value) {
      lines.push(`## ${field}`, '', value, '');
    }
  }
  return lines.join('\n');
}

function createVcpToolBoxNativeMemoryAdapter(options = {}) {
  const vcpToolBoxRoot = path.resolve(options.vcpToolBoxRoot || process.env.VCPTOOLBOX_ROOT || process.cwd());
  const knowledgeBaseManagerPath = path.join(vcpToolBoxRoot, 'KnowledgeBaseManager.js');
  const embeddingUtilsPath = path.join(vcpToolBoxRoot, 'EmbeddingUtils.js');
  const knowledgeBaseRootPath = path.resolve(
    options.knowledgeBaseRootPath ||
    process.env.KNOWLEDGEBASE_ROOT_PATH ||
    path.join(vcpToolBoxRoot, 'dailynote')
  );
  const knowledgeBaseStorePath = options.knowledgeBaseStorePath
    ? path.resolve(options.knowledgeBaseStorePath)
    : process.env.KNOWLEDGEBASE_STORE_PATH
      ? path.resolve(process.env.KNOWLEDGEBASE_STORE_PATH)
      : '';
  const isolatedRuntimeStoreConfigured = Boolean(knowledgeBaseStorePath);
  const primaryWriteOnly = options.primaryWriteOnly === true;
  const primaryWritePreflight = typeof options.primaryWritePreflight === 'function'
    ? options.primaryWritePreflight
    : null;
  const writeSubdir = safeFilenamePart(options.writeSubdir || 'codex-memory-governed');
  let knowledgeBaseManager = null;
  let embeddingUtils = null;

  function loadRuntime() {
    process.env.KNOWLEDGEBASE_ROOT_PATH = knowledgeBaseRootPath;
    if (knowledgeBaseStorePath) {
      process.env.KNOWLEDGEBASE_STORE_PATH = knowledgeBaseStorePath;
    }
    if (!knowledgeBaseManager) {
      knowledgeBaseManager = require(knowledgeBaseManagerPath);
    }
    if (!embeddingUtils) {
      embeddingUtils = require(embeddingUtilsPath);
    }
  }

  async function ensureReady() {
    loadRuntime();
    if (knowledgeBaseManager && typeof knowledgeBaseManager.initialize === 'function') {
      await knowledgeBaseManager.initialize();
    }
  }

  async function ensurePrimaryWriteReady(toolName) {
    if (!primaryWriteOnly) {
      await ensureReady();
      return;
    }
    const rootStat = await fs.lstat(knowledgeBaseRootPath);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
      throw new Error('primary_write_root_invalid');
    }
    if (primaryWritePreflight) {
      const projection = await primaryWritePreflight({
        toolName,
        knowledgeBaseRootPath
      });
      if (projection?.accepted !== true) {
        throw new Error('primary_write_preflight_rejected');
      }
    }
  }

  async function runNativeReadProbe(args = {}, fallbackQuery = 'codex memory governed native read proof') {
    await ensureReady();
    const query = boundedString(args.query, 1000) || fallbackQuery;
    const limit = normalizeLimit(args.limit ?? args.max_results, 1);
    const embeddings = await embeddingUtils.getEmbeddingsBatch([query], {
      apiUrl: process.env.API_URL,
      apiKey: process.env.API_Key,
      model: process.env.WhitelistEmbeddingModel
    });
    const vector = embeddings && embeddings[0];
    if (!vector) {
      throw new Error('native_query_vector_unavailable');
    }
    const results = await knowledgeBaseManager.search(vector, limit, 0);
    return {
      results: projectReadResults(results),
      rawResultCount: Array.isArray(results) ? results.length : 0,
      runtimeReceipt: defaultReadRuntimeReceipt({
        providerApiCalled: true,
        memoryReadPerformed: true,
        isolatedRuntimeStoreUsed: isolatedRuntimeStoreConfigured
      })
    };
  }

  async function search(args = {}) {
    const query = boundedString(args.query, 1000);
    if (!query.trim()) return { results: [] };
    const readProbe = await runNativeReadProbe(args, 'codex memory governed native search proof');
    return {
      results: readProbe.results,
      _nativeRuntimeReceipt: readProbe.runtimeReceipt
    };
  }

  async function overview(args = {}) {
    const readProbe = await runNativeReadProbe(
      { ...args, limit: normalizeLimit(args.limit ?? args.max_results, 1) },
      'codex memory governed native overview proof'
    );
    return {
      overview: {
        status: 'available',
        resultCountBucket: bucketCount(readProbe.rawResultCount),
        rawMemoryContentDisclosed: false,
        readinessClaimed: false
      },
      _nativeRuntimeReceipt: readProbe.runtimeReceipt
    };
  }

  async function audit(args = {}) {
    const readProbe = await runNativeReadProbe(
      {
        ...args,
        limit: normalizeLimit(args.window ?? args.limit ?? args.max_results, 1)
      },
      'codex memory governed native audit proof'
    );
    return {
      audit: {
        status: 'available',
        findingCountBucket: 'zero',
        sampledReadResultCountBucket: bucketCount(readProbe.rawResultCount),
        includeRawHonored: args.include_raw !== true,
        rawMemoryContentDisclosed: false,
        readinessClaimed: false
      },
      _nativeRuntimeReceipt: readProbe.runtimeReceipt
    };
  }

  async function record(args = {}) {
    const title = boundedString(args.title, 200) || 'codex-memory governed native record';
    const markdown = createRecordMarkdown(args);
    const digest = crypto
      .createHash('sha256')
      .update(markdown)
      .digest('hex')
      .slice(0, 16);
    const dir = path.join(knowledgeBaseRootPath, writeSubdir);
    const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}-${safeFilenamePart(title)}-${digest}.md`;
    const filePath = path.join(dir, filename);
    await ensurePrimaryWriteReady('record_memory');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, markdown, { encoding: 'utf8', flag: 'wx' });
    return {
      recorded: true,
      memory_id_ref: `vcp-kb-${digest}`,
      write_shape: 'markdown_dailynote_file',
      raw_path_disclosed: false,
      _nativeRuntimeReceipt: nativeRuntimeReceipt({
        nativeRuntimeCalled: !primaryWriteOnly,
        nativeRuntimeInitialized: !primaryWriteOnly,
        providerApiCalled: false,
        memoryReadPerformed: false,
        memoryWritePerformed: true,
        durableWritePerformed: true,
        durableWriteScope: 'primary_memory_write',
        isolatedRuntimeStoreUsed: isolatedRuntimeStoreConfigured && !primaryWriteOnly,
        primaryMemoryStoreWritePerformed: true,
        derivedIndexWritePerformed: false
      })
    };
  }

  async function mutationMarker(toolName, args = {}) {
    const markdown = createMutationMarkdown(toolName, args);
    const digest = crypto
      .createHash('sha256')
      .update(markdown)
      .digest('hex')
      .slice(0, 16);
    const dir = path.join(knowledgeBaseRootPath, writeSubdir);
    const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}-${safeFilenamePart(toolName)}-${digest}.md`;
    const filePath = path.join(dir, filename);
    await ensurePrimaryWriteReady(toolName);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, markdown, { encoding: 'utf8', flag: 'wx' });
    return {
      recorded: true,
      memory_id_ref: `vcp-kb-${digest}`,
      write_shape: 'markdown_dailynote_mutation_marker',
      mutation_tool: toolName,
      raw_path_disclosed: false,
      _nativeRuntimeReceipt: nativeRuntimeReceipt({
        nativeRuntimeCalled: !primaryWriteOnly,
        nativeRuntimeInitialized: !primaryWriteOnly,
        providerApiCalled: false,
        memoryReadPerformed: false,
        memoryWritePerformed: true,
        durableWritePerformed: true,
        durableWriteScope: 'primary_memory_mutation_marker',
        isolatedRuntimeStoreUsed: isolatedRuntimeStoreConfigured && !primaryWriteOnly,
        primaryMemoryStoreWritePerformed: true,
        derivedIndexWritePerformed: false
      })
    };
  }

  return {
    search,
    overview,
    audit,
    record,
    tombstone: args => mutationMarker('tombstone_memory', args),
    supersede: args => mutationMarker('supersede_memory', args),
    async shutdown() {
      if (knowledgeBaseManager && typeof knowledgeBaseManager.shutdown === 'function') {
        await knowledgeBaseManager.shutdown();
      }
      knowledgeBaseManager = null;
      embeddingUtils = null;
    }
  };
}

function createGovernedMcpVcpNativeVcpToolBoxMcpShimHandler(options = {}) {
  const adapter = options.adapter || createVcpToolBoxNativeMemoryAdapter(options);
  const enableWrite = options.enableWrite === true;

  return async function handleJsonRpc(body = {}) {
    if (!isPlainObject(body) || body.jsonrpc !== '2.0') {
      return jsonRpcError(body?.id, -32600, 'Invalid Request');
    }
    if (body.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id: body.id,
        result: initializeResult(enableWrite)
      };
    }
    if (body.method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id: body.id,
        result: toolsListResult(enableWrite)
      };
    }
    if (body.method !== 'tools/call') {
      return jsonRpcError(body.id, -32601, 'Method not found');
    }
    const params = isPlainObject(body.params) ? body.params : {};
    const nativeToolName = typeof params.name === 'string' ? params.name : '';
    const governanceMeta = params._meta?.codexMemoryGovernance;
    const governance = validateGovernanceForNativeTool(nativeToolName, governanceMeta);
    if (governance.accepted !== true) {
      return jsonRpcError(body.id, -32602, 'Governance metadata rejected', {
        reasonCode: governance.reasonCode,
        lowDisclosure: true,
        rawRequestBodyDisclosed: false,
        rawResponseBodyDisclosed: false
      });
    }

    const args = projectNativeArguments(
      nativeToolName,
      governance.publicToolName,
      params.arguments,
      governanceMeta
    );
    try {
      if (['knowledge_base.search', 'memory_overview', 'audit_memory'].includes(nativeToolName)) {
        const methodName = nativeToolName === 'knowledge_base.search'
          ? 'search'
          : nativeToolName === 'memory_overview'
            ? 'overview'
            : 'audit';
        if (typeof adapter[methodName] !== 'function') {
          return jsonRpcError(body.id, -32602, 'Native read tool unavailable', {
            reasonCode: 'native_read_tool_unavailable',
            lowDisclosure: true
          });
        }
        const nativeResult = await adapter[methodName](args, {
          publicToolName: governance.publicToolName
        });
        const runtimeReceipt = nativeResult?._nativeRuntimeReceipt || defaultReadRuntimeReceipt();
        const { _nativeRuntimeReceipt, ...structuredContent } = isPlainObject(nativeResult) ? nativeResult : {};
        return jsonRpcResult(body.id, structuredContent, runtimeReceipt);
      }
      if (nativeToolName === 'knowledge_base.record' || nativeToolName === 'knowledge_base.write') {
        if (enableWrite !== true) {
          return jsonRpcError(body.id, -32602, 'Native write disabled', {
            reasonCode: 'native_write_disabled',
            lowDisclosure: true
          });
        }
        const nativeResult = await adapter.record(args, {
          publicToolName: governance.publicToolName
        });
        const runtimeReceipt = nativeResult?._nativeRuntimeReceipt || nativeRuntimeReceipt({
          nativeRuntimeCalled: true,
          nativeRuntimeInitialized: true,
          providerApiCalled: false,
          memoryReadPerformed: false,
          memoryWritePerformed: true,
          durableWritePerformed: true,
          durableWriteScope: 'primary_memory_write',
          isolatedRuntimeStoreUsed: false,
          primaryMemoryStoreWritePerformed: true,
          derivedIndexWritePerformed: false
        });
        const { _nativeRuntimeReceipt, ...structuredContent } = isPlainObject(nativeResult) ? nativeResult : {};
        return jsonRpcResult(body.id, structuredContent, runtimeReceipt);
      }
      if (nativeToolName === 'knowledge_base.tombstone' || nativeToolName === 'knowledge_base.supersede') {
        if (enableWrite !== true) {
          return jsonRpcError(body.id, -32602, 'Native write disabled', {
            reasonCode: 'native_write_disabled',
            lowDisclosure: true
          });
        }
        const methodName = nativeToolName === 'knowledge_base.tombstone' ? 'tombstone' : 'supersede';
        if (typeof adapter[methodName] !== 'function') {
          return jsonRpcError(body.id, -32602, 'Native mutation tool unavailable', {
            reasonCode: 'native_mutation_tool_unavailable',
            lowDisclosure: true
          });
        }
        const nativeResult = await adapter[methodName](args, {
          publicToolName: governance.publicToolName
        });
        const runtimeReceipt = nativeResult?._nativeRuntimeReceipt || nativeRuntimeReceipt({
          nativeRuntimeCalled: true,
          nativeRuntimeInitialized: true,
          providerApiCalled: false,
          memoryReadPerformed: false,
          memoryWritePerformed: true,
          durableWritePerformed: true,
          durableWriteScope: 'primary_memory_mutation_marker',
          isolatedRuntimeStoreUsed: false,
          primaryMemoryStoreWritePerformed: true,
          derivedIndexWritePerformed: false
        });
        const { _nativeRuntimeReceipt, ...structuredContent } = isPlainObject(nativeResult) ? nativeResult : {};
        return jsonRpcResult(body.id, structuredContent, runtimeReceipt);
      }
      return jsonRpcError(body.id, -32602, 'Unsupported native tool');
    } catch {
      return jsonRpcError(body.id, -32000, 'Native runtime call failed', {
        reasonCode: 'native_runtime_call_failed',
        lowDisclosure: true,
        rawErrorDisclosed: false
      });
    }
  };
}

function createGovernedMcpVcpNativeVcpToolBoxMcpShimServer(options = {}) {
  const handler = createGovernedMcpVcpNativeVcpToolBoxMcpShimHandler(options);
  const expectedBearerToken = typeof options.expectedBearerToken === 'string'
    ? options.expectedBearerToken
    : '';
  let authorizedRequestCount = 0;
  let rejectedAuthorizationCount = 0;
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json' });
      res.end(JSON.stringify(jsonRpcError(null, -32601, 'Method not found')));
      return;
    }
    if (expectedBearerToken) {
      const actualHeader = typeof req.headers.authorization === 'string'
        ? req.headers.authorization
        : '';
      const actualBytes = Buffer.from(actualHeader, 'utf8');
      const expectedBytes = Buffer.from(`Bearer ${expectedBearerToken}`, 'utf8');
      const matched = actualBytes.length === expectedBytes.length &&
        crypto.timingSafeEqual(actualBytes, expectedBytes);
      if (!matched) {
        rejectedAuthorizationCount += 1;
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify(jsonRpcError(null, -32001, 'Unauthorized', {
          reasonCode: 'transport_authorization_rejected',
          lowDisclosure: true
        })));
        return;
      }
      authorizedRequestCount += 1;
    }
    try {
      const rawBody = await readRequestBody(req, options.maxRequestBytes || 1024 * 1024);
      const body = JSON.parse(rawBody || '{}');
      const response = await handler(body);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(jsonRpcError(null, -32700, 'Parse error')));
    }
  });
  server.getLowDisclosureAuthorizationProjection = () => ({
    authorizationRequired: Boolean(expectedBearerToken),
    authorizedRequestCount,
    rejectedAuthorizationCount,
    tokenMaterialDisclosed: false
  });
  return server;
}

module.exports = {
  GOVERNANCE_METADATA_PATH,
  PUBLIC_TOOL_TO_NATIVE_TOOLS,
  createMutationMarkdown,
  createRecordMarkdown,
  createGovernedMcpVcpNativeVcpToolBoxMcpShimHandler,
  createGovernedMcpVcpNativeVcpToolBoxMcpShimServer,
  createVcpToolBoxNativeMemoryAdapter,
  initializeResult,
  toolsListResult,
  validateGovernanceForNativeTool
};
