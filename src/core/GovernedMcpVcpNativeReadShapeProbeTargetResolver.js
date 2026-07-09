'use strict';

const {
  TARGET_KINDS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  ZERO_COUNTER_FIELDS,
  buildVcpToolBoxRuntimeTargetLocatorPreflight
} = require('./VcpToolBoxRuntimeTargetLocatorPreflight');
const {
  ALLOWED_TRANSPORT_CATEGORIES
} = require('./VcpNativeDisposableTargetRequestReadShapeProbeExecutor');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'GovernedMcpVcpNativeReadShapeProbeTargetResolver';
const CONTRACT_MODE = 'safe_reference_bound_registered_vcp_native_read_shape_probe_invoker_resolver';

const ALLOWED_ENTRY_FIELDS = Object.freeze([
  'invokeComponentAction',
  'transportCategory',
  'targetKind'
]);

const FORBIDDEN_ENTRY_FIELDS = Object.freeze([
  'endpoint',
  'url',
  'baseUrl',
  'runtimeEndpoint',
  'runtimeUrl',
  'locatorValue',
  'path',
  'absolutePath',
  'configEnv',
  'configEnvPath',
  'env',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'secret',
  'secrets',
  'credential',
  'credentials',
  'password',
  'privateKey',
  'requestBody',
  'responseBody',
  'rawResponseBody',
  'rawPayload'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

function collectForbiddenFields(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenFields(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = pathJoin(prefix, key);
    if (FORBIDDEN_ENTRY_FIELDS.includes(key)) {
      found.push(path);
      continue;
    }
    if (typeof nested !== 'function') {
      found.push(...collectForbiddenFields(nested, path));
    }
  }
  return found;
}

function zeroLocatorCounters() {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, 0]));
}

function normalizeEntry(referenceName, entry) {
  if (typeof entry === 'function') {
    return {
      accepted: true,
      referenceName,
      targetKind: 'mcp_server',
      transportCategory: 'local_direct_component_action_invoker',
      invokeComponentAction: entry,
      invalidFields: [],
      forbiddenFields: []
    };
  }

  if (!isPlainObject(entry)) {
    return {
      accepted: false,
      referenceName,
      invalidFields: ['entry'],
      forbiddenFields: []
    };
  }

  const forbiddenFields = collectForbiddenFields(entry, 'entry');
  const unknownFields = Object.keys(entry)
    .filter(field => !ALLOWED_ENTRY_FIELDS.includes(field))
    .map(field => `entry.${field}`);
  const invalidFields = [...unknownFields];

  if (typeof entry.invokeComponentAction !== 'function') {
    invalidFields.push('entry.invokeComponentAction');
  }
  const targetKind = TARGET_KINDS.includes(entry.targetKind) ? entry.targetKind : 'mcp_server';
  if (!ALLOWED_TRANSPORT_CATEGORIES.includes(entry.transportCategory || 'local_direct_component_action_invoker')) {
    invalidFields.push('entry.transportCategory');
  }

  return {
    accepted: invalidFields.length === 0 && forbiddenFields.length === 0,
    referenceName,
    targetKind,
    transportCategory: entry.transportCategory || 'local_direct_component_action_invoker',
    invokeComponentAction: entry.invokeComponentAction,
    invalidFields,
    forbiddenFields
  };
}

function normalizeInvokerRegistry(registry) {
  const entries = [];
  const invalidFields = [];
  const forbiddenFields = [];

  if (registry === undefined || registry === null) {
    return {
      accepted: true,
      entries,
      invalidFields,
      forbiddenFields
    };
  }

  const iterable = registry instanceof Map
    ? [...registry.entries()]
    : isPlainObject(registry)
      ? Object.entries(registry)
      : null;

  if (!iterable) {
    return {
      accepted: false,
      entries,
      invalidFields: ['registry'],
      forbiddenFields
    };
  }

  iterable.forEach(([rawReferenceName, entry], index) => {
    const referenceName = String(rawReferenceName || '').trim();
    if (!isSafeReferenceName(referenceName)) {
      invalidFields.push(`registry[${index}].referenceName`);
      return;
    }

    const normalized = normalizeEntry(referenceName, entry);
    invalidFields.push(...normalized.invalidFields.map(field => `registry[${index}].${field}`));
    forbiddenFields.push(...normalized.forbiddenFields.map(field => `registry[${index}].${field}`));
    if (normalized.accepted) entries.push(normalized);
  });

  return {
    accepted: invalidFields.length === 0 && forbiddenFields.length === 0,
    entries,
    invalidFields,
    forbiddenFields
  };
}

function normalizeRequest(gateResult) {
  return isPlainObject(gateResult?.normalizedBridgeRequest)
    ? gateResult.normalizedBridgeRequest
    : {};
}

function lowDisclosureProjection({ gateResult, config } = {}) {
  const request = normalizeRequest(gateResult);
  const configuredTarget = isPlainObject(config?.governedMcpVcpNativeRuntimeTarget)
    ? config.governedMcpVcpNativeRuntimeTarget
    : {};

  return {
    targetReferenceName: isSafeReferenceName(request.runtime_target_reference_name)
      ? request.runtime_target_reference_name
      : null,
    configuredTargetReferenceName: isSafeReferenceName(configuredTarget.targetReferenceName)
      ? configuredTarget.targetReferenceName
      : null,
    targetKind: TARGET_KINDS.includes(request.runtime_target_kind) ? request.runtime_target_kind : null
  };
}

function rejected(reasonCode, input = {}, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    invalidFields: details.invalidFields || [],
    forbiddenFields: details.forbiddenFields || [],
    locatorPreflight: details.locatorPreflight || null,
    resolverCategory: null,
    transportCategory: null,
    targetResolved: false,
    invokeComponentAction: null,
    runtimeCalled: false,
    networkCalled: false,
    mcpCalled: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    rawLocatorDisclosed: false,
    tokenMaterialDisclosed: false,
    readinessClaimed: false
  };
}

function buildLocatorPreflight({ referenceName, targetKind, observedPresent }) {
  const discoverySource = targetKind === 'mcp_server'
    ? 'mcp_server_name'
    : 'service_registry_reference';

  return buildVcpToolBoxRuntimeTargetLocatorPreflight({
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    discoverySources: [discoverySource],
    candidateTargets: [{
      kind: targetKind,
      referenceName,
      discoverySource,
      locatorHashPresent: true,
      locatorValueIncluded: false,
      secretMaterialIncluded: false,
      configEnvRead: false,
      runtimeCalled: false,
      observedPresent,
      runtimeEntrypointKnown: observedPresent
    }],
    policy: {
      allowLocatorValues: false,
      allowSecretMaterial: false,
      allowConfigEnvRead: false,
      allowRuntimeCall: false,
      allowBroadFilesystemScan: false,
      allowProviderCall: false
    },
    counters: zeroLocatorCounters()
  });
}

function wrapInvoker({ entry, targetReferenceName }) {
  return async function invokeGovernedTarget(payload = {}) {
    if (payload.targetReferenceName !== targetReferenceName) {
      const error = new Error('target_reference_mismatch');
      error.statusClass = 'client_error';
      throw error;
    }
    return entry.invokeComponentAction(payload);
  };
}

function resolveGovernedMcpVcpNativeReadShapeProbeTarget(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const request = normalizeRequest(input.gateResult);
  const configuredTarget = isPlainObject(input.config?.governedMcpVcpNativeRuntimeTarget)
    ? input.config.governedMcpVcpNativeRuntimeTarget
    : {};
  const invalidFields = [];

  if (!isPlainObject(input.gateResult) || input.gateResult.accepted !== true) invalidFields.push('gateResult.accepted');
  if (!isSafeReferenceName(request.runtime_target_reference_name)) {
    invalidFields.push('gateResult.normalizedBridgeRequest.runtime_target_reference_name');
  }
  if (!TARGET_KINDS.includes(request.runtime_target_kind)) {
    invalidFields.push('gateResult.normalizedBridgeRequest.runtime_target_kind');
  }
  if (request.runtime_target_forbidden_field_count !== 0) {
    invalidFields.push('gateResult.normalizedBridgeRequest.runtime_target_forbidden_field_count');
  }
  if (configuredTarget.accepted !== true) invalidFields.push('config.governedMcpVcpNativeRuntimeTarget.accepted');
  if (configuredTarget.targetReferenceName !== request.runtime_target_reference_name) {
    invalidFields.push('config.governedMcpVcpNativeRuntimeTarget.targetReferenceName');
  }

  const registry = normalizeInvokerRegistry(input.invokerRegistry);
  invalidFields.push(...registry.invalidFields);
  if (registry.forbiddenFields.length > 0) {
    return rejected('registered_invoker_contains_forbidden_locator_or_secret_fields', input, {
      invalidFields,
      forbiddenFields: registry.forbiddenFields
    });
  }
  if (!registry.accepted) {
    return rejected('invalid_registered_invoker_registry', input, { invalidFields });
  }
  if (invalidFields.length > 0) {
    return rejected('invalid_governed_read_shape_probe_target_resolution_boundary', input, { invalidFields });
  }

  const entry = registry.entries.find(item => item.referenceName === request.runtime_target_reference_name);
  const locatorPreflight = buildLocatorPreflight({
    referenceName: request.runtime_target_reference_name,
    targetKind: entry?.targetKind || request.runtime_target_kind,
    observedPresent: Boolean(entry)
  });

  if (locatorPreflight.accepted !== true) {
    return rejected('runtime_target_locator_preflight_rejected', input, { locatorPreflight });
  }
  if (!entry) {
    return rejected('no_registered_invoker_for_governed_runtime_target_reference', input, { locatorPreflight });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    locatorPreflight,
    resolverCategory: 'target_reference_to_disposable_component_action_invoker',
    transportCategory: entry.transportCategory,
    targetResolved: true,
    invokeComponentAction: wrapInvoker({
      entry,
      targetReferenceName: request.runtime_target_reference_name
    }),
    runtimeCalled: false,
    networkCalled: false,
    mcpCalled: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    rawLocatorDisclosed: false,
    tokenMaterialDisclosed: false,
    readinessClaimed: false
  };
}

module.exports = {
  ALLOWED_ENTRY_FIELDS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_ENTRY_FIELDS,
  normalizeInvokerRegistry,
  resolveGovernedMcpVcpNativeReadShapeProbeTarget
};
