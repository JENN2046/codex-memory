'use strict';

const {
  VcpToolBridgeClientError,
  isPlainObject
} = require('./VcpToolBridgeClient');

const MAX_OUTPUT_PROJECTION_DEPTH = 64;
const MAX_OUTPUT_PROJECTION_NODES = 10_000;
const REDACTION_MARKER = '[REDACTED]';
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/gu;

const PROJECTION_MODE = Object.freeze({
  EXACT: 'exact',
  PAYLOAD: 'payload',
  SCHEMA: 'schema',
  SCHEMA_MAP: 'schema_map'
});

const SCHEMA_TEXT_FIELDS = new Set([
  '$comment',
  'description',
  'title',
  'example',
  'examples',
  'default'
]);

const SCHEMA_MAP_FIELDS = new Set([
  '$defs',
  'definitions',
  'dependentSchemas',
  'patternProperties',
  'properties'
]);

const SCHEMA_FIELDS = new Set([
  'additionalProperties',
  'allOf',
  'anyOf',
  'contains',
  'contentSchema',
  'else',
  'if',
  'items',
  'not',
  'oneOf',
  'prefixItems',
  'propertyNames',
  'then',
  'unevaluatedItems',
  'unevaluatedProperties'
]);

const SCHEMA_STRUCTURAL_FIELDS = new Set([
  '$anchor',
  '$dynamicAnchor',
  '$dynamicRef',
  '$id',
  '$ref',
  '$schema',
  'const',
  'contentEncoding',
  'contentMediaType',
  'dependentRequired',
  'deprecated',
  'discriminator',
  'enum',
  'exclusiveMaximum',
  'exclusiveMinimum',
  'format',
  'maxContains',
  'maximum',
  'maxItems',
  'maxLength',
  'maxProperties',
  'minContains',
  'minimum',
  'minItems',
  'minLength',
  'minProperties',
  'multipleOf',
  'pattern',
  'readOnly',
  'required',
  'type',
  'uniqueItems',
  'writeOnly'
]);

function projectionError() {
  const error = new VcpToolBridgeClientError(
    'VCP response exceeds safe output projection limits',
    'VCP_RESPONSE_TOO_COMPLEX'
  );
  error.jsonRpcCode = -32603;
  error.jsonRpcMessage = 'Internal error';
  error.jsonRpcData = {
    code: 'VCP_RESPONSE_TOO_COMPLEX',
    status: 'failed'
  };
  return error;
}

function credentialCandidates(credential) {
  if (typeof credential !== 'string' || !credential) return [];
  const candidates = [credential];
  try {
    candidates.push(encodeURIComponent(credential));
  } catch {
    // The literal credential is still safe to redact when URI encoding fails.
  }
  return [...new Set(candidates.filter(Boolean))];
}

function redactCredentialText(value, credential) {
  return credentialCandidates(credential).reduce(
    (output, candidate) => output.split(candidate).join(REDACTION_MARKER),
    String(value)
  );
}

function escapedControlCharacter(character) {
  if (character === '\r') return '\\r';
  if (character === '\n') return '\\n';
  if (character === '\t') return '\\t';
  return `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`;
}

class ProjectionContext {
  constructor({
    credential,
    maxDepth = MAX_OUTPUT_PROJECTION_DEPTH,
    maxNodes = MAX_OUTPUT_PROJECTION_NODES
  } = {}) {
    this.credential = credential;
    this.maxDepth = maxDepth;
    this.maxNodes = maxNodes;
    this.nodes = 0;
  }

  claim(depth) {
    if (depth > this.maxDepth || this.nodes >= this.maxNodes) {
      throw projectionError();
    }
    this.nodes += 1;
  }

  redact(value) {
    return redactCredentialText(value, this.credential);
  }
}

function defineValue(target, key, value) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  });
}

function enumerableDataEntries(value) {
  let descriptors;
  try {
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    throw projectionError();
  }

  const entries = [];
  const included = new Set();
  if (value instanceof Error) {
    for (const [key, fieldValue] of [
      ['name', value.name],
      ['message', value.message],
      ['stack', typeof value.stack === 'string' ? value.stack : null]
    ]) {
      entries.push([key, fieldValue]);
      included.add(key);
    }
  }

  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string' || included.has(key)) continue;
    const descriptor = descriptors[key];
    if (!descriptor.enumerable) continue;
    if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      throw projectionError();
    }
    entries.push([key, descriptor.value]);
  }
  return entries;
}

function schemaChildMode(key) {
  if (SCHEMA_TEXT_FIELDS.has(key)) return PROJECTION_MODE.PAYLOAD;
  if (SCHEMA_MAP_FIELDS.has(key)) return PROJECTION_MODE.SCHEMA_MAP;
  if (SCHEMA_FIELDS.has(key)) return PROJECTION_MODE.SCHEMA;
  if (SCHEMA_STRUCTURAL_FIELDS.has(key)) return PROJECTION_MODE.EXACT;
  return PROJECTION_MODE.PAYLOAD;
}

function childMode(parentMode, key) {
  if (parentMode === PROJECTION_MODE.SCHEMA_MAP) return PROJECTION_MODE.SCHEMA;
  if (parentMode === PROJECTION_MODE.SCHEMA) return schemaChildMode(key);
  return parentMode;
}

function createProjectedNode(source, mode, depth, context, seen) {
  context.claim(depth);
  if (typeof source === 'string') {
    return {
      output: mode === PROJECTION_MODE.PAYLOAD ? context.redact(source) : source,
      frame: null
    };
  }
  if (!source || typeof source !== 'object') {
    return { output: source, frame: null };
  }
  if (seen.has(source)) throw projectionError();
  seen.add(source);

  const output = Array.isArray(source) ? [] : {};
  return {
    output,
    frame: { source, output, mode, depth }
  };
}

function projectStructuredValue(source, context, mode, rootDepth) {
  const seen = new WeakSet();
  const root = createProjectedNode(source, mode, rootDepth, context, seen);
  const stack = root.frame ? [root.frame] : [];

  while (stack.length > 0) {
    const frame = stack.pop();
    if (Array.isArray(frame.source)) {
      if (frame.source.length > context.maxNodes - context.nodes) {
        throw projectionError();
      }
      for (let index = 0; index < frame.source.length; index += 1) {
        let item = null;
        if (Object.prototype.hasOwnProperty.call(frame.source, index)) {
          const descriptor = Object.getOwnPropertyDescriptor(frame.source, String(index));
          if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
            throw projectionError();
          }
          item = descriptor.value;
        }
        const itemMode = frame.mode === PROJECTION_MODE.SCHEMA
          ? PROJECTION_MODE.SCHEMA
          : frame.mode;
        const child = createProjectedNode(
          item,
          itemMode,
          frame.depth + 1,
          context,
          seen
        );
        frame.output.push(child.output);
        if (child.frame) stack.push(child.frame);
      }
      continue;
    }

    const entries = enumerableDataEntries(frame.source);
    if (entries.length > context.maxNodes - context.nodes) {
      throw projectionError();
    }
    for (const [key, value] of entries) {
      const modeForChild = childMode(frame.mode, key);
      const child = createProjectedNode(
        value,
        modeForChild,
        frame.depth + 1,
        context,
        seen
      );
      defineValue(frame.output, key, child.output);
      if (child.frame) stack.push(child.frame);
    }
  }

  return root.output;
}

function projectPayload(value, context, depth) {
  return projectStructuredValue(value, context, PROJECTION_MODE.PAYLOAD, depth);
}

function projectErrorPayload(value, context, depth) {
  return projectPayload(value, context, depth);
}

function projectErrorText(value, context, depth) {
  context.claim(depth);
  if (value === null || value === undefined) return null;
  const text = value instanceof Error ? value.message : String(value);
  return context.redact(text).replace(CONTROL_CHARACTER_PATTERN, escapedControlCharacter);
}

function projectSchema(value, context, depth) {
  return projectStructuredValue(value, context, PROJECTION_MODE.SCHEMA, depth);
}

function projectExact(value, context, depth) {
  return projectStructuredValue(value, context, PROJECTION_MODE.EXACT, depth);
}

function projectInvocationCommands(value, context, depth) {
  return projectPayload(Array.isArray(value) ? value : [], context, depth);
}

function projectSafeCapabilities(value, context, depth) {
  const source = isPlainObject(value) ? value : {};
  context.claim(depth);
  const output = {};
  const entries = enumerableDataEntries(source);
  if (entries.length > context.maxNodes - context.nodes) throw projectionError();

  for (const [key, nestedValue] of entries) {
    let projected;
    if (key === 'invocationCommands' || key === 'invocation_commands') {
      projected = projectInvocationCommands(nestedValue, context, depth + 1);
    } else if (key === 'parameters' || key === 'inputSchema' || key === 'input_schema') {
      projected = projectSchema(nestedValue, context, depth + 1);
    } else {
      projected = projectPayload(nestedValue, context, depth + 1);
    }
    defineValue(output, key, projected);
  }
  return output;
}

function projectSafeToolManifest(value, context, depth) {
  const source = isPlainObject(value) ? value : {};
  context.claim(depth);
  const output = {};
  const entries = enumerableDataEntries(source);
  if (entries.length > context.maxNodes - context.nodes) throw projectionError();

  for (const [key, nestedValue] of entries) {
    let projected;
    if (key === 'name' || key === 'version') {
      projected = projectExact(nestedValue, context, depth + 1);
    } else if (key === 'displayName' || key === 'display_name' || key === 'description') {
      projected = projectPayload(nestedValue, context, depth + 1);
    } else if (key === 'capabilities') {
      projected = projectSafeCapabilities(nestedValue, context, depth + 1);
    } else if (key === 'invocationCommands' || key === 'invocation_commands') {
      projected = projectInvocationCommands(nestedValue, context, depth + 1);
    } else if (key === 'parameters' || key === 'inputSchema' || key === 'input_schema') {
      projected = projectSchema(nestedValue, context, depth + 1);
    } else {
      projected = projectPayload(nestedValue, context, depth + 1);
    }
    defineValue(output, key, projected);
  }
  return output;
}

function assertOutputBudget(value, { maxDepth, maxNodes }) {
  let nodes = 0;
  const active = new WeakSet();
  const stack = [{ value, depth: 0, exit: false }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current.exit) {
      active.delete(current.value);
      continue;
    }
    if (current.depth > maxDepth || nodes >= maxNodes) throw projectionError();
    nodes += 1;
    if (!current.value || typeof current.value !== 'object') continue;
    if (active.has(current.value)) throw projectionError();
    active.add(current.value);
    stack.push({ value: current.value, depth: current.depth, exit: true });

    const children = Array.isArray(current.value)
      ? current.value
      : enumerableDataEntries(current.value).map(([, child]) => child);
    if (children.length > maxNodes - nodes) throw projectionError();
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({ value: children[index], depth: current.depth + 1, exit: false });
    }
  }
}

function finalizeProjection(output, context) {
  assertOutputBudget(output, {
    maxDepth: context.maxDepth,
    maxNodes: context.maxNodes
  });
  return output;
}

function createContext(options) {
  return new ProjectionContext(options);
}

function projectAdapterStatus(clientStatus = {}, {
  credential,
  toolsDiscovered,
  maxDepth,
  maxNodes
} = {}) {
  const context = createContext({ credential, maxDepth, maxNodes });
  const output = {
    connected: clientStatus.connected,
    bridge_enabled: clientStatus.bridge_enabled,
    protocol_ready: clientStatus.protocol_ready,
    tools_discovered: toolsDiscovered,
    pending_requests: clientStatus.pending_requests,
    last_error: projectErrorText(clientStatus.last_error ?? null, context, 1)
  };
  return finalizeProjection(output, context);
}

function projectToolList(manifests, {
  credential,
  allowedTools,
  maxDepth,
  maxNodes
} = {}) {
  const context = createContext({ credential, maxDepth, maxNodes });
  const tools = [];
  for (const manifest of Array.isArray(manifests) ? manifests : []) {
    if (!isPlainObject(manifest) || typeof manifest.name !== 'string') continue;
    if (!allowedTools?.has(manifest.name)) continue;

    const safeManifest = projectSafeToolManifest(manifest, context, 2);
    const capabilities = isPlainObject(safeManifest.capabilities)
      ? safeManifest.capabilities
      : {};
    const invocationCommands = Array.isArray(capabilities.invocationCommands)
      ? capabilities.invocationCommands
      : Array.isArray(capabilities.invocation_commands)
        ? capabilities.invocation_commands
        : Array.isArray(safeManifest.invocationCommands)
          ? safeManifest.invocationCommands
          : Array.isArray(safeManifest.invocation_commands)
            ? safeManifest.invocation_commands
            : [];
    const parameters = isPlainObject(safeManifest.parameters)
      ? safeManifest.parameters
      : isPlainObject(safeManifest.inputSchema)
        ? safeManifest.inputSchema
        : isPlainObject(safeManifest.input_schema)
          ? safeManifest.input_schema
          : isPlainObject(capabilities.parameters)
            ? capabilities.parameters
            : isPlainObject(capabilities.inputSchema)
              ? capabilities.inputSchema
              : isPlainObject(capabilities.input_schema)
                ? capabilities.input_schema
                : {};

    tools.push({
      name: safeManifest.name,
      display_name: typeof safeManifest.displayName === 'string'
        ? safeManifest.displayName
        : typeof safeManifest.display_name === 'string'
          ? safeManifest.display_name
          : safeManifest.name,
      description: typeof safeManifest.description === 'string'
        ? safeManifest.description
        : '',
      invocation_commands: invocationCommands,
      parameters,
      raw_manifest: safeManifest
    });
  }
  return finalizeProjection({ tools }, context);
}

function projectToolExecution(state = {}, toolName, {
  credential,
  maxDepth,
  maxNodes
} = {}) {
  const context = createContext({ credential, maxDepth, maxNodes });
  return finalizeProjection({
    request_id: state.request_id,
    tool_name: toolName,
    status: state.status,
    result: projectPayload(state.result ?? null, context, 1),
    error: projectErrorPayload(state.error ?? null, context, 1)
  }, context);
}

function projectToolStatus(state = {}, {
  credential,
  maxDepth,
  maxNodes
} = {}) {
  const context = createContext({ credential, maxDepth, maxNodes });
  return finalizeProjection({
    request_id: state.request_id,
    status: state.status,
    progress: projectPayload(state.progress ?? null, context, 1),
    result: projectPayload(state.result ?? null, context, 1),
    error: projectErrorPayload(state.error ?? null, context, 1)
  }, context);
}

module.exports = {
  MAX_OUTPUT_PROJECTION_DEPTH,
  MAX_OUTPUT_PROJECTION_NODES,
  projectAdapterStatus,
  projectToolExecution,
  projectToolList,
  projectToolStatus,
  redactCredentialText
};
