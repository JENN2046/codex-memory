const SCHEMA_VERSION_POLICY_DECISIONS = Object.freeze({
  ALLOW: 'allow',
  ALLOW_WITH_FALLBACK: 'allow_with_fallback',
  REJECT: 'reject',
  WARN_AND_SKIP_UNSAFE_FIELDS: 'warn_and_skip_unsafe_fields',
  WARN_REPORT_NOT_READY: 'warn_report_not_ready',
  FAIL_SAFE_HIDDEN: 'fail_safe_hidden'
});

const SCHEMA_VERSION_POLICY_ERRORS = Object.freeze({
  SCHEMA_VERSION_REQUIRED: 'schema_version_required',
  UNSUPPORTED_SCHEMA_VERSION: 'unsupported_schema_version',
  UNKNOWN_SCHEMA_FAMILY: 'unknown_schema_family'
});

const WRITE_OPERATIONS = new Set([
  'write',
  'export',
  'gate_write',
  'policy_write',
  'migration_write'
]);

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview'
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function isMissingVersion(value) {
  return value === null || value === undefined || normalizeString(value) === '';
}

function isWriteOperation(operation) {
  const normalized = normalizeString(operation);
  return WRITE_OPERATIONS.has(normalized) || normalized.endsWith('_write');
}

function normalizeFamily(family = {}) {
  return {
    name: normalizeString(family.name),
    currentVersion: normalizeString(family.currentVersion),
    acceptedVersions: cloneArray(family.acceptedVersions)
      .map(normalizeString)
      .filter(Boolean),
    missingVersionReadPolicy: normalizeString(family.missingVersionReadPolicy),
    missingVersionWritePolicy: normalizeString(family.missingVersionWritePolicy),
    unknownVersionReadPolicy: normalizeString(family.unknownVersionReadPolicy),
    unknownVersionWritePolicy: normalizeString(family.unknownVersionWritePolicy),
    fallbackSafe: family.fallbackSafe === true,
    requiresMigrationApply: family.requiresMigrationApply === true
  };
}

function createPolicyResult(overrides = {}) {
  return {
    schemaFamily: overrides.schemaFamily || null,
    operation: overrides.operation || null,
    inputVersion: overrides.inputVersion ?? null,
    decision: overrides.decision || SCHEMA_VERSION_POLICY_DECISIONS.REJECT,
    accepted: overrides.accepted === true,
    errorCode: overrides.errorCode || null,
    fallbackVersion: overrides.fallbackVersion || null,
    warning: overrides.warning || null,
    mutated: false,
    requiresMigrationApply: false,
    runtimeEnforcementImplemented: false,
    runtimeEnforcementChanged: false,
    durableMemoryTouched: false,
    realMemoryScanned: false,
    providerCalls: 0
  };
}

function evaluateMissingVersion({ family, operation, schemaFamily, inputVersion }) {
  const write = isWriteOperation(operation);
  const policy = write ? family.missingVersionWritePolicy : family.missingVersionReadPolicy;

  if (write || policy.startsWith('reject')) {
    return createPolicyResult({
      schemaFamily,
      operation,
      inputVersion,
      decision: SCHEMA_VERSION_POLICY_DECISIONS.REJECT,
      errorCode: SCHEMA_VERSION_POLICY_ERRORS.SCHEMA_VERSION_REQUIRED
    });
  }

  if (policy.startsWith('allow')) {
    return createPolicyResult({
      schemaFamily,
      operation,
      inputVersion,
      decision: SCHEMA_VERSION_POLICY_DECISIONS.ALLOW_WITH_FALLBACK,
      accepted: true,
      fallbackVersion: family.currentVersion
    });
  }

  if (policy.startsWith('warn')) {
    return createPolicyResult({
      schemaFamily,
      operation,
      inputVersion,
      decision: SCHEMA_VERSION_POLICY_DECISIONS.WARN_REPORT_NOT_READY,
      warning: policy
    });
  }

  return createPolicyResult({
    schemaFamily,
    operation,
    inputVersion,
    decision: SCHEMA_VERSION_POLICY_DECISIONS.REJECT,
    errorCode: SCHEMA_VERSION_POLICY_ERRORS.SCHEMA_VERSION_REQUIRED
  });
}

function evaluateUnknownVersion({ family, operation, schemaFamily, inputVersion }) {
  const write = isWriteOperation(operation);
  const policy = write ? family.unknownVersionWritePolicy : family.unknownVersionReadPolicy;

  if (write || policy.startsWith('reject')) {
    return createPolicyResult({
      schemaFamily,
      operation,
      inputVersion,
      decision: SCHEMA_VERSION_POLICY_DECISIONS.REJECT,
      errorCode: SCHEMA_VERSION_POLICY_ERRORS.UNSUPPORTED_SCHEMA_VERSION
    });
  }

  if (policy.startsWith('warn_and_skip')) {
    return createPolicyResult({
      schemaFamily,
      operation,
      inputVersion,
      decision: SCHEMA_VERSION_POLICY_DECISIONS.WARN_AND_SKIP_UNSAFE_FIELDS,
      warning: policy
    });
  }

  if (policy.startsWith('warn')) {
    return createPolicyResult({
      schemaFamily,
      operation,
      inputVersion,
      decision: SCHEMA_VERSION_POLICY_DECISIONS.WARN_REPORT_NOT_READY,
      warning: policy
    });
  }

  if (policy.startsWith('fail_safe')) {
    return createPolicyResult({
      schemaFamily,
      operation,
      inputVersion,
      decision: SCHEMA_VERSION_POLICY_DECISIONS.FAIL_SAFE_HIDDEN,
      warning: policy
    });
  }

  return createPolicyResult({
    schemaFamily,
    operation,
    inputVersion,
    decision: SCHEMA_VERSION_POLICY_DECISIONS.REJECT,
    errorCode: SCHEMA_VERSION_POLICY_ERRORS.UNSUPPORTED_SCHEMA_VERSION
  });
}

function normalizeSchemaVersionPolicy(policy = {}) {
  return {
    schemaVersion: normalizeString(policy.schemaVersion),
    version: normalizeString(policy.version),
    runtimeEnforcementImplemented: policy.runtimeEnforcementImplemented === true,
    publicToolsFrozen: policy.publicToolsFrozen === true,
    publicTools: cloneArray(policy.publicTools),
    schemaFamilies: cloneArray(policy.schemaFamilies).map(normalizeFamily)
  };
}

function createSchemaVersionPolicy(policy = {}) {
  const normalizedPolicy = normalizeSchemaVersionPolicy(policy);
  const familyByName = new Map();
  for (const family of normalizedPolicy.schemaFamilies) {
    if (family.name) {
      familyByName.set(family.name, family);
    }
  }

  function getFamily(name) {
    return familyByName.get(normalizeString(name)) || null;
  }

  function evaluate(input = {}) {
    const schemaFamily = normalizeString(input.schemaFamily);
    const operation = normalizeString(input.operation) || 'read';
    const inputVersion = input.inputVersion ?? null;
    const family = getFamily(schemaFamily);

    if (!family) {
      return createPolicyResult({
        schemaFamily,
        operation,
        inputVersion,
        decision: SCHEMA_VERSION_POLICY_DECISIONS.REJECT,
        errorCode: SCHEMA_VERSION_POLICY_ERRORS.UNKNOWN_SCHEMA_FAMILY
      });
    }

    if (isMissingVersion(inputVersion)) {
      return evaluateMissingVersion({ family, operation, schemaFamily, inputVersion });
    }

    const version = normalizeString(inputVersion);
    if (family.acceptedVersions.includes(version)) {
      return createPolicyResult({
        schemaFamily,
        operation,
        inputVersion: version,
        decision: SCHEMA_VERSION_POLICY_DECISIONS.ALLOW,
        accepted: true
      });
    }

    return evaluateUnknownVersion({
      family,
      operation,
      schemaFamily,
      inputVersion: version
    });
  }

  function summarize() {
    const families = Array.from(familyByName.values()).map(family => ({
      name: family.name,
      currentVersion: family.currentVersion,
      acceptedVersions: cloneArray(family.acceptedVersions),
      fallbackSafe: family.fallbackSafe,
      requiresMigrationApply: family.requiresMigrationApply
    }));

    return {
      sourceMode: 'explicit_input',
      runtimeEnforcementImplemented: false,
      policyRuntimeEnforcementImplemented: normalizedPolicy.runtimeEnforcementImplemented,
      familyCount: families.length,
      families,
      publicMcpTools: {
        frozen: normalizedPolicy.publicToolsFrozen,
        tools: cloneArray(normalizedPolicy.publicTools)
      },
      mutated: false,
      runtimeEnforcementChanged: false,
      durableMemoryTouched: false,
      realMemoryScanned: false,
      providerCalls: 0,
      publicMcpExpanded: false
    };
  }

  return {
    evaluate,
    getFamily,
    summarize
  };
}

function evaluateSchemaVersionPolicyCase(policy, policyCase = {}) {
  return createSchemaVersionPolicy(policy).evaluate(policyCase);
}

function summarizeSchemaVersionPolicy(policy) {
  return createSchemaVersionPolicy(policy).summarize();
}

module.exports = {
  PUBLIC_MCP_TOOLS,
  SCHEMA_VERSION_POLICY_DECISIONS,
  SCHEMA_VERSION_POLICY_ERRORS,
  createSchemaVersionPolicy,
  evaluateSchemaVersionPolicyCase,
  isMissingVersion,
  isWriteOperation,
  normalizeSchemaVersionPolicy,
  summarizeSchemaVersionPolicy
};
