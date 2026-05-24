function normalizeInternalRuntimeEntryString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getInternalRuntimeEntryArgumentValue(safeArgs, candidateKeys = []) {
  for (const key of candidateKeys) {
    const normalized = normalizeInternalRuntimeEntryString(safeArgs[key]);
    if (normalized) {
      return normalized;
    }
  }
  return '';
}

function buildInternalRuntimeEntryPayload(
  args = {},
  requestContext = {},
  {
    enabled = false,
    requestSource = '',
    contextFlag = '',
    entryLabel = 'runtime',
    requiredStringFields = [],
    fallbackActorClientId = ''
  } = {}
) {
  const safeArgs = args && typeof args === 'object' ? args : {};
  const executionContext = requestContext.executionContext || {};
  const payload = {
    request_source: normalizeInternalRuntimeEntryString(executionContext.requestSource),
    dry_run: safeArgs.dry_run !== false,
    ...(safeArgs.confirm === true ? { confirm: true } : {})
  };

  for (const field of requiredStringFields) {
    payload[field.name] = getInternalRuntimeEntryArgumentValue(safeArgs, field.keys);
  }

  payload.actor_client_id = normalizeInternalRuntimeEntryString(
    safeArgs.actor_client_id
    || safeArgs.actorClientId
    || executionContext.clientId
    || executionContext.client_id
    || fallbackActorClientId
  );

  if (!enabled) {
    return {
      ok: false,
      reason: `internal ${entryLabel} runtime entry is disabled.`,
      payload
    };
  }

  if (
    executionContext[contextFlag] !== true
    || executionContext.requestSource !== requestSource
  ) {
    return {
      ok: false,
      reason: `internal ${entryLabel} runtime entry requires the approved internal execution context.`,
      payload
    };
  }

  return {
    ok: true,
    payload
  };
}

module.exports = {
  normalizeInternalRuntimeEntryString,
  getInternalRuntimeEntryArgumentValue,
  buildInternalRuntimeEntryPayload
};
