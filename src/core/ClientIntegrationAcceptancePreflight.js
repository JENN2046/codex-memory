'use strict';

const {
  firstAliasBoolean,
  firstNonEmptyAliasString,
  isPlainObject,
  normalizeString,
  sideEffectAliasFlagged,
  sideEffectValueFlagged
} = require('./FieldAliasNormalizer');

const CLIENT_INTEGRATION_ACCEPTANCE_PREFLIGHT_VERSION =
  'phase-h-client-integration-acceptance-preflight-v1';

const EXPECTED_MCP_URL = 'http://127.0.0.1:7605/mcp/codex-memory';
const EXPECTED_HEALTH_URL = 'http://127.0.0.1:7605/health';
const EXPECTED_PUBLIC_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
const REQUIRED_CLIENTS = Object.freeze(['codex', 'claude']);

const SENSITIVE_VALUE_PATTERNS = Object.freeze([
  /authorization\s*[:=]/i,
  /bearer\s+[a-z0-9._-]{6,}/i,
  /api[_ -]?key\s*[:=]/i,
  /secret\s*[:=]/i,
  /token\s*[:=]/i,
  /password\s*[:=]/i,
  /set-cookie\s*[:=]/i
]);

function normalizeLower(value) {
  return normalizeString(value).toLowerCase().replace(/-/g, '_');
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map(item => normalizeString(item)).filter(Boolean)
    : [];
}

function sameStringSet(left = [], right = []) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return left.length === right.length &&
    leftSet.size === rightSet.size &&
    [...leftSet].every(item => rightSet.has(item));
}

function firstTrue(source = {}, aliases = []) {
  return firstAliasBoolean(source, aliases) === true;
}

function anyTrue(sources = [], aliases = []) {
  return sources.some(source => firstTrue(source, aliases));
}

function anySideEffectFlagged(sources = [], aliases = []) {
  return sources.some(source => sideEffectAliasFlagged(source, aliases));
}

function numericValue(source = {}, aliases = []) {
  const safeSource = isPlainObject(source) ? source : {};
  for (const alias of aliases) {
    const value = safeSource[alias];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const numeric = Number(value.trim());
      if (Number.isFinite(numeric)) return numeric;
    }
  }
  return 0;
}

function stringValuesContainSensitiveMaterial(value) {
  if (typeof value === 'string') {
    return SENSITIVE_VALUE_PATTERNS.some(pattern => pattern.test(value));
  }
  if (Array.isArray(value)) {
    return value.some(stringValuesContainSensitiveMaterial);
  }
  if (!isPlainObject(value)) {
    return false;
  }
  return Object.values(value).some(stringValuesContainSensitiveMaterial);
}

function normalizeNestedObject(source = {}, key) {
  const safeSource = isPlainObject(source) ? source : {};
  return isPlainObject(safeSource[key]) ? safeSource[key] : {};
}

function normalizeClientPreflight(rawClient = {}) {
  const safeClient = isPlainObject(rawClient) ? rawClient : {};
  const runbook = normalizeNestedObject(safeClient, 'runbook');
  const sideEffects = normalizeNestedObject(safeClient, 'sideEffects');
  const evidence = normalizeNestedObject(safeClient, 'evidence');
  const policy = normalizeNestedObject(safeClient, 'policy');
  const sources = [safeClient, runbook, evidence, policy, sideEffects];

  const clientId = normalizeLower(firstNonEmptyAliasString(safeClient, [
    'clientId',
    'client_id',
    'client',
    'name'
  ]));
  const transport = normalizeLower(firstNonEmptyAliasString(safeClient, [
    'transport',
    'mcpTransport',
    'mcp_transport'
  ]) || 'http');
  const mcpUrl = firstNonEmptyAliasString(safeClient, [
    'mcpUrl',
    'mcp_url',
    'endpoint',
    'url'
  ]) || EXPECTED_MCP_URL;

  const codexConfigTemplateDocumented = anyTrue(sources, [
    'codexConfigTemplateDocumented',
    'configTemplateDocumented',
    'config_template_documented'
  ]);
  const claudeCommandTemplateDocumented = anyTrue(sources, [
    'claudeCommandTemplateDocumented',
    'commandTemplateDocumented',
    'command_template_documented'
  ]);
  const healthProbeDocumented = anyTrue(sources, [
    'healthProbeDocumented',
    'health_probe_documented'
  ]);
  const rollbackDocumented = anyTrue(sources, [
    'rollbackDocumented',
    'rollback_documented'
  ]);
  const noConfigMutationWarningDocumented = anyTrue(sources, [
    'noConfigMutationWarningDocumented',
    'no_config_mutation_warning_documented'
  ]);
  const noTokenPolicyDocumented = anyTrue(sources, [
    'noTokenPolicyDocumented',
    'no_token_policy_documented'
  ]);
  const noMemoryToolPolicyDocumented = anyTrue(sources, [
    'noMemoryToolPolicyDocumented',
    'no_memory_tool_policy_documented'
  ]);

  const configChanged = anySideEffectFlagged(sources, [
    'configChanged',
    'config_changed',
    'realConfigChanged',
    'real_config_changed',
    'clientConfigChanged',
    'client_config_changed'
  ]);
  const watchdogStartupChanged = anySideEffectFlagged(sources, [
    'watchdogStartupChanged',
    'watchdog_startup_changed',
    'startupChanged',
    'startup_changed'
  ]);
  const tokenUsed = anySideEffectFlagged(sources, [
    'tokenUsed',
    'token_used',
    'bearerTokenUsed',
    'bearer_token_used'
  ]);
  const liveClientExecuted = anySideEffectFlagged(sources, [
    'liveClientExecuted',
    'live_client_executed',
    'clientCommandExecuted',
    'client_command_executed',
    'mcpAddExecuted',
    'mcp_add_executed',
    'mcpListExecuted',
    'mcp_list_executed',
    'interactiveMcpExecuted',
    'interactive_mcp_executed'
  ]);
  const memoryToolsExecuted = anySideEffectFlagged(sources, [
    'memoryToolsExecuted',
    'memory_tools_executed',
    'toolsCallExecuted',
    'tools_call_executed',
    'mcpToolsCallExecuted',
    'mcp_tools_call_executed',
    'recordMemoryCalled',
    'record_memory_called',
    'searchMemoryCalled',
    'search_memory_called',
    'memoryOverviewCalled',
    'memory_overview_called'
  ]);
  const providerCalls = sources.reduce((total, source) => total + numericValue(source, [
    'providerCalls',
    'provider_calls'
  ]), 0);
  const providerCallsExecuted = anySideEffectFlagged(sources, [
    'providerCalls',
    'provider_calls',
    'providerCallsExecuted',
    'provider_calls_executed'
  ]);
  const durableMutationExecuted = anySideEffectFlagged(sources, [
    'durableMutationExecuted',
    'durable_mutation_executed',
    'durableMemoryWritten',
    'durable_memory_written',
    'durableAuditWritten',
    'durable_audit_written'
  ]);
  const readinessClaimed = anySideEffectFlagged(sources, [
    'readinessClaimed',
    'readiness_claimed',
    'rcReadyClaimed',
    'rc_ready_claimed'
  ]);

  const requiredTemplateDocumented =
    clientId === 'codex'
      ? codexConfigTemplateDocumented
      : clientId === 'claude'
        ? claudeCommandTemplateDocumented
        : false;
  const runbookComplete =
    requiredTemplateDocumented &&
    healthProbeDocumented &&
    rollbackDocumented &&
    noConfigMutationWarningDocumented &&
    noTokenPolicyDocumented &&
    noMemoryToolPolicyDocumented;
  const noApplyInvariant =
    configChanged === false &&
    watchdogStartupChanged === false &&
    tokenUsed === false &&
    liveClientExecuted === false &&
    memoryToolsExecuted === false &&
    providerCalls === 0 &&
    providerCallsExecuted === false &&
    durableMutationExecuted === false &&
    readinessClaimed === false;
  const acceptedNoApply =
    REQUIRED_CLIENTS.includes(clientId) &&
    transport === 'http' &&
    mcpUrl === EXPECTED_MCP_URL &&
    runbookComplete === true &&
    noApplyInvariant === true;

  const blockers = [
    !REQUIRED_CLIENTS.includes(clientId) ? 'unknown_client' : null,
    transport !== 'http' ? 'transport_not_http' : null,
    mcpUrl !== EXPECTED_MCP_URL ? 'mcp_url_not_loopback_http_mainline' : null,
    !requiredTemplateDocumented ? 'client_template_not_documented' : null,
    !healthProbeDocumented ? 'health_probe_not_documented' : null,
    !rollbackDocumented ? 'rollback_not_documented' : null,
    !noConfigMutationWarningDocumented ? 'no_config_mutation_warning_missing' : null,
    !noTokenPolicyDocumented ? 'no_token_policy_missing' : null,
    !noMemoryToolPolicyDocumented ? 'no_memory_tool_policy_missing' : null,
    configChanged ? 'real_config_mutation_detected' : null,
    watchdogStartupChanged ? 'watchdog_startup_change_detected' : null,
    tokenUsed ? 'token_use_detected' : null,
    liveClientExecuted ? 'live_client_acceptance_executed' : null,
    memoryToolsExecuted ? 'memory_tools_executed' : null,
    providerCalls !== 0 || providerCallsExecuted ? 'provider_calls_detected' : null,
    durableMutationExecuted ? 'durable_mutation_detected' : null,
    readinessClaimed ? 'readiness_claimed' : null
  ].filter(Boolean);

  return {
    clientId,
    transport,
    mcpUrl,
    acceptedNoApply,
    runbookComplete,
    noApplyInvariant,
    blockers,
    documented: {
      codexConfigTemplateDocumented,
      claudeCommandTemplateDocumented,
      healthProbeDocumented,
      rollbackDocumented,
      noConfigMutationWarningDocumented,
      noTokenPolicyDocumented,
      noMemoryToolPolicyDocumented
    },
    sideEffects: {
      configChanged,
      watchdogStartupChanged,
      tokenUsed,
      liveClientExecuted,
      memoryToolsExecuted,
      providerCalls,
      providerCallsExecuted,
      durableMutationExecuted,
      readinessClaimed
    }
  };
}

function normalizeRunbook(runbook = {}) {
  const safeRunbook = isPlainObject(runbook) ? runbook : {};
  return {
    codexHttpTemplateDocumented: firstTrue(safeRunbook, [
      'codexHttpTemplateDocumented',
      'codex_http_template_documented'
    ]),
    claudeHttpTemplateDocumented: firstTrue(safeRunbook, [
      'claudeHttpTemplateDocumented',
      'claude_http_template_documented'
    ]),
    noApplyBoundaryDocumented: firstTrue(safeRunbook, [
      'noApplyBoundaryDocumented',
      'no_apply_boundary_documented'
    ]),
    noTokenBoundaryDocumented: firstTrue(safeRunbook, [
      'noTokenBoundaryDocumented',
      'no_token_boundary_documented'
    ]),
    noMemoryToolsBoundaryDocumented: firstTrue(safeRunbook, [
      'noMemoryToolsBoundaryDocumented',
      'no_memory_tools_boundary_documented'
    ]),
    rollbackPathDocumented: firstTrue(safeRunbook, [
      'rollbackPathDocumented',
      'rollback_path_documented'
    ]),
    failureCriteriaDocumented: firstTrue(safeRunbook, [
      'failureCriteriaDocumented',
      'failure_criteria_documented'
    ]),
    readinessNonClaimDocumented: firstTrue(safeRunbook, [
      'readinessNonClaimDocumented',
      'readiness_non_claim_documented'
    ])
  };
}

function summarizeClientIntegrationAcceptancePreflight(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const sideEffects = normalizeNestedObject(safeInput, 'sideEffects');
  const sourceMode = normalizeLower(safeInput.sourceMode || 'explicit_input');
  const clients = Array.isArray(safeInput.clients)
    ? safeInput.clients.map(normalizeClientPreflight)
    : [];
  const observedPublicTools = normalizeStringArray(
    safeInput.publicTools || safeInput.public_tools || safeInput.observedPublicTools
  );
  const publicToolsFrozen = sameStringSet(observedPublicTools, EXPECTED_PUBLIC_TOOLS);
  const runbook = normalizeRunbook(safeInput.runbook);
  const runbookComplete =
    runbook.codexHttpTemplateDocumented &&
    runbook.claudeHttpTemplateDocumented &&
    runbook.noApplyBoundaryDocumented &&
    runbook.noTokenBoundaryDocumented &&
    runbook.noMemoryToolsBoundaryDocumented &&
    runbook.rollbackPathDocumented &&
    runbook.failureCriteriaDocumented &&
    runbook.readinessNonClaimDocumented;
  const scopeAcceptance = isPlainObject(safeInput.scopeAcceptance)
    ? safeInput.scopeAcceptance
    : {};
  const clientScopeAcceptanceAccepted = firstTrue(scopeAcceptance, [
    'acceptedForPrivateReadConsistency',
    'accepted_for_private_read_consistency'
  ]);

  const clientIds = new Set(clients.map(client => client.clientId));
  const missingClients = REQUIRED_CLIENTS.filter(clientId => !clientIds.has(clientId));
  const clientBlockers = clients.flatMap(client => {
    return client.blockers.map(blocker => `${client.clientId || 'unknown'}:${blocker}`);
  });
  const allClientsAccepted = missingClients.length === 0 &&
    clients.length >= REQUIRED_CLIENTS.length &&
    clients.every(client => client.acceptedNoApply === true);

  const tokenMaterialDetected = stringValuesContainSensitiveMaterial(safeInput);
  const topLevelNoApplyInvariant =
    anySideEffectFlagged([sideEffects], ['runtimeApplied', 'runtime_applied']) === false &&
    anySideEffectFlagged([sideEffects], ['configChanged', 'config_changed']) === false &&
    anySideEffectFlagged(
      [sideEffects],
      ['watchdogStartupChanged', 'watchdog_startup_changed']
    ) === false &&
    anySideEffectFlagged([sideEffects], [
      'memoryToolsExecuted',
      'memory_tools_executed',
      'toolsCallExecuted',
      'tools_call_executed',
      'mcpToolsCallExecuted',
      'mcp_tools_call_executed'
    ]) === false &&
    anySideEffectFlagged([sideEffects], [
      'providerCalls',
      'provider_calls',
      'providerCallsExecuted',
      'provider_calls_executed'
    ]) === false &&
    anySideEffectFlagged([sideEffects], [
      'durableMutationExecuted',
      'durable_mutation_executed',
      'durableAuditWritten',
      'durable_audit_written'
    ]) === false &&
    anySideEffectFlagged([sideEffects], ['realMemoryScanned', 'real_memory_scanned']) === false &&
    anySideEffectFlagged([sideEffects], ['readinessClaimed', 'readiness_claimed']) === false &&
    numericValue(sideEffects, ['providerCalls', 'provider_calls']) === 0;

  const blockingFindings = [
    sourceMode !== 'explicit_input' ? 'source_mode_not_explicit_input' : null,
    !runbookComplete ? 'runbook_incomplete' : null,
    !clientScopeAcceptanceAccepted ? 'client_scope_acceptance_missing' : null,
    !publicToolsFrozen ? 'public_tools_not_frozen' : null,
    !allClientsAccepted ? 'client_preflight_not_accepted' : null,
    missingClients.length > 0 ? `missing_clients:${missingClients.join(',')}` : null,
    tokenMaterialDetected ? 'sensitive_token_material_detected' : null,
    !topLevelNoApplyInvariant ? 'top_level_no_apply_invariant_failed' : null,
    ...clientBlockers
  ].filter(Boolean);
  const acceptedForClientIntegrationPreflight = blockingFindings.length === 0;

  return {
    preflightVersion: CLIENT_INTEGRATION_ACCEPTANCE_PREFLIGHT_VERSION,
    sourceMode,
    acceptedForClientIntegrationPreflight,
    decision: acceptedForClientIntegrationPreflight
      ? 'NO_APPLY_CLIENT_INTEGRATION_ACCEPTANCE_PREFLIGHT_ACCEPTED'
      : 'NOT_READY_BLOCKED',
    endpoint: {
      expectedMcpUrl: EXPECTED_MCP_URL,
      expectedHealthUrl: EXPECTED_HEALTH_URL
    },
    requiredClients: [...REQUIRED_CLIENTS],
    clients,
    runbook: {
      ...runbook,
      runbookComplete
    },
    publicTools: {
      expected: [...EXPECTED_PUBLIC_TOOLS],
      observed: observedPublicTools,
      frozen: publicToolsFrozen
    },
    clientScopeAcceptance: {
      acceptedForPrivateReadConsistency: clientScopeAcceptanceAccepted,
      sourceDecision: normalizeString(scopeAcceptance.decision) || null
    },
    noApplyInvariant: topLevelNoApplyInvariant && clients.every(client => client.noApplyInvariant),
    tokenMaterialDetected,
    runtimeApplied: false,
    realConfigChanged: false,
    watchdogStartupChanged: false,
    memoryToolsExecuted: false,
    providerCalls: 0,
    durableMutationExecuted: false,
    readinessClaimed: false,
    rcReadyClaimed: false,
    blockers: {
      blockingFindings
    },
    safety: {
      noSideEffects: true,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      usesBearerToken: false,
      callsMcpTools: false,
      callsMemoryTools: false,
      callsProviders: false,
      mutatesClientConfig: false,
      mutatesWatchdogStartup: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      readinessClaimed: false
    }
  };
}

module.exports = {
  CLIENT_INTEGRATION_ACCEPTANCE_PREFLIGHT_VERSION,
  EXPECTED_MCP_URL,
  EXPECTED_HEALTH_URL,
  EXPECTED_PUBLIC_TOOLS,
  REQUIRED_CLIENTS,
  summarizeClientIntegrationAcceptancePreflight
};
