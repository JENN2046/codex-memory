'use strict';

const {
  VcpToolBridgeClientError,
  isPlainObject
} = require('./VcpToolBridgeClient');
const { TextDecoder } = require('node:util');

const MAX_OUTPUT_PROJECTION_DEPTH = 64;
const MAX_OUTPUT_PROJECTION_NODES = 10_000;
const MAX_OUTPUT_PROJECTION_STRING_BYTES = 256 * 1024;
const MAX_OUTPUT_PROJECTION_TOTAL_BYTES = 4 * 1024 * 1024;
const REDACTION_MARKER = '[REDACTED]';
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/gu;

const PROJECTION_MODE = Object.freeze({
  PAYLOAD: 'payload',
  MANIFEST: 'manifest',
  MANIFEST_CAPABILITIES: 'manifest_capabilities',
  OPAQUE_CONTRACT: 'opaque_contract',
  SCHEMA: 'schema',
  SCHEMA_MAP: 'schema_map',
  SCHEMA_CONTRACT_MAP: 'schema_contract_map'
});

const SCHEMA_DESCRIPTIVE_FIELDS = new Set([
  'description',
  'title'
]);

const MANIFEST_DESCRIPTIVE_FIELDS = new Set([
  'description',
  'displayName',
  'display_name',
  'title'
]);

const MANIFEST_SCHEMA_FIELDS = new Set([
  'inputSchema',
  'input_schema',
  'parameterSchema',
  'parameters'
]);

const MANIFEST_SCHEMA_MAP_FIELDS = new Set([
  'configSchema'
]);

const SCHEMA_MAP_FIELDS = new Set([
  'dependentSchemas',
  'properties'
]);

const SCHEMA_CONTRACT_MAP_FIELDS = new Set([
  '$defs',
  'definitions',
  'patternProperties'
]);

const SCHEMA_CONTAINER_FIELDS = new Set([
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

function isSchemaContractValueMode(mode) {
  return mode === PROJECTION_MODE.MANIFEST ||
    mode === PROJECTION_MODE.MANIFEST_CAPABILITIES ||
    mode === PROJECTION_MODE.OPAQUE_CONTRACT ||
    mode === PROJECTION_MODE.SCHEMA ||
    mode === PROJECTION_MODE.SCHEMA_MAP ||
    mode === PROJECTION_MODE.SCHEMA_CONTRACT_MAP;
}

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

function unsafeManifestProjectionError() {
  const error = new VcpToolBridgeClientError(
    'VCP manifest cannot be projected without changing its invocation contract',
    'VCP_MANIFEST_UNSAFE_TO_PROJECT'
  );
  error.jsonRpcCode = -32603;
  error.jsonRpcMessage = 'Internal error';
  error.jsonRpcData = {
    code: 'VCP_MANIFEST_UNSAFE_TO_PROJECT',
    status: 'failed'
  };
  return error;
}

function unsafeResponseProjectionError() {
  const error = new VcpToolBridgeClientError(
    'VCP response cannot be projected without exposing the configured credential',
    'VCP_RESPONSE_UNSAFE_TO_PROJECT'
  );
  error.jsonRpcCode = -32603;
  error.jsonRpcMessage = 'Internal error';
  error.jsonRpcData = {
    code: 'VCP_RESPONSE_UNSAFE_TO_PROJECT',
    status: 'failed'
  };
  return error;
}

function nativeManifestSurfaceError() {
  const error = new VcpToolBridgeClientError(
    'vcp_native_manifest_surface_unavailable',
    'VCP_NATIVE_MANIFEST_SURFACE_UNAVAILABLE'
  );
  error.jsonRpcCode = -32603;
  error.jsonRpcMessage = 'Internal error';
  error.jsonRpcData = {
    code: 'VCP_NATIVE_MANIFEST_SURFACE_UNAVAILABLE',
    status: 'failed'
  };
  return error;
}

const FATAL_UTF8_DECODER = new TextDecoder('utf-8', {
  fatal: true,
  ignoreBOM: true
});

function isPercentByteAt(value, index) {
  return value[index] === '%' &&
    index + 2 < value.length &&
    /^[0-9a-f]{2}$/iu.test(value.slice(index + 1, index + 3));
}

function appendDecodedSegment(state, text, sourceStart, sourceEnd, linear = false) {
  if (!text) return;
  const decodedStart = state.decoded.length;
  state.decoded += text;
  for (let offset = 0; offset < text.length; offset += 1) {
    state.sourceStarts[decodedStart + offset] = linear
      ? sourceStart + offset
      : sourceStart;
    state.sourceEnds[decodedStart + offset] = linear
      ? sourceStart + offset + 1
      : sourceEnd;
  }
}

function decodePercentOnceWithSpans(value) {
  const source = String(value);
  const state = {
    decoded: '',
    sourceStarts: new Uint32Array(Math.max(1, source.length)),
    sourceEnds: new Uint32Array(Math.max(1, source.length))
  };
  let index = 0;

  while (index < source.length) {
    if (!isPercentByteAt(source, index)) {
      const start = index;
      index += 1;
      while (index < source.length && !isPercentByteAt(source, index)) index += 1;
      appendDecodedSegment(state, source.slice(start, index), start, index, true);
      continue;
    }

    const runStart = index;
    const bytes = [];
    while (isPercentByteAt(source, index)) {
      bytes.push(Number.parseInt(source.slice(index + 1, index + 3), 16));
      index += 3;
    }

    let offset = 0;
    while (offset < bytes.length) {
      const tokenStart = runStart + (offset * 3);
      const byte = bytes[offset];
      if (byte <= 0x7f) {
        appendDecodedSegment(
          state,
          String.fromCharCode(byte),
          tokenStart,
          tokenStart + 3
        );
        offset += 1;
        continue;
      }

      const sequenceLength = byte >= 0xc2 && byte <= 0xdf
        ? 2
        : byte >= 0xe0 && byte <= 0xef
          ? 3
          : byte >= 0xf0 && byte <= 0xf4
            ? 4
            : 0;
      if (sequenceLength > 0 && offset + sequenceLength <= bytes.length) {
        try {
          const decoded = FATAL_UTF8_DECODER.decode(
            Uint8Array.from(bytes.slice(offset, offset + sequenceLength))
          );
          appendDecodedSegment(
            state,
            decoded,
            tokenStart,
            tokenStart + (sequenceLength * 3)
          );
          offset += sequenceLength;
          continue;
        } catch {
          // Preserve only the malformed unit and continue scanning later spans.
        }
      }

      appendDecodedSegment(
        state,
        source.slice(tokenStart, tokenStart + 3),
        tokenStart,
        tokenStart + 3,
        true
      );
      offset += 1;
    }
  }

  return state;
}

function *occurrenceSpans(value, needle) {
  if (!needle) return;
  let searchFrom = 0;
  while (searchFrom <= value.length - needle.length) {
    const index = value.indexOf(needle, searchFrom);
    if (index < 0) break;
    yield [index, index + needle.length];
    searchFrom = index + needle.length;
  }
}

function *decodedCredentialSourceSpans(decoded, credential) {
  for (const [decodedStart, decodedEnd] of occurrenceSpans(decoded.decoded, credential)) {
    yield [
      decoded.sourceStarts[decodedStart],
      decoded.sourceEnds[decodedEnd - 1]
    ];
  }
}

function nextIteratorValue(iterator) {
  const next = iterator.next();
  return next.done ? null : next.value;
}

function *credentialSourceSpans(value, credential) {
  const source = String(value);
  if (typeof credential !== 'string' || !credential) return;

  const rawIterator = occurrenceSpans(source, credential);
  const decoded = source.includes('%')
    ? decodePercentOnceWithSpans(source)
    : null;
  const decodedIterator = decoded && decoded.decoded !== source
    ? decodedCredentialSourceSpans(decoded, credential)
    : null;
  let rawSpan = nextIteratorValue(rawIterator);
  let decodedSpan = decodedIterator ? nextIteratorValue(decodedIterator) : null;
  let pending = null;

  while (rawSpan || decodedSpan) {
    let span;
    if (!decodedSpan || (
      rawSpan && (
        rawSpan[0] < decodedSpan[0] ||
        (rawSpan[0] === decodedSpan[0] && rawSpan[1] <= decodedSpan[1])
      )
    )) {
      span = rawSpan;
      rawSpan = nextIteratorValue(rawIterator);
    } else {
      span = decodedSpan;
      decodedSpan = nextIteratorValue(decodedIterator);
    }

    if (!pending) {
      pending = [...span];
    } else if (span[0] <= pending[1]) {
      if (span[1] > pending[1]) pending[1] = span[1];
    } else {
      yield pending;
      pending = [...span];
    }
  }
  if (pending) yield pending;
}

function containsSupportedCredential(value, credential) {
  if (typeof credential !== 'string' || !credential) return false;
  const source = String(value);
  if (source.includes(credential)) return true;
  return decodePercentOnceWithSpans(source).decoded.includes(credential);
}

function containsCredentialInJsonStringToken(value, credential) {
  const serialized = JSON.stringify(String(value));
  return containsSupportedCredential(serialized.slice(1, -1), credential);
}

function applyCredentialRedaction(
  value,
  credential,
  marker = REDACTION_MARKER,
  maxOutputBytes = Number.MAX_SAFE_INTEGER
) {
  const source = String(value);
  let output = '';
  let outputBytes = 0;
  let cursor = 0;

  const append = chunk => {
    const chunkBytes = Buffer.byteLength(chunk, 'utf8');
    if (chunkBytes > maxOutputBytes - outputBytes) throw projectionError();
    output += chunk;
    outputBytes += chunkBytes;
  };

  for (const [start, end] of credentialSourceSpans(source, credential)) {
    append(source.slice(cursor, start));
    append(marker);
    cursor = end;
  }
  if (cursor === 0) return source;
  append(source.slice(cursor));
  return output;
}

function redactCredentialText(value, credential) {
  const marker = containsSupportedCredential(REDACTION_MARKER, credential)
    ? ''
    : REDACTION_MARKER;
  const output = applyCredentialRedaction(value, credential, marker);
  return containsSupportedCredential(output, credential) ? '' : output;
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
    manifestProjection = false,
    maxDepth = MAX_OUTPUT_PROJECTION_DEPTH,
    maxNodes = MAX_OUTPUT_PROJECTION_NODES,
    maxStringBytes = MAX_OUTPUT_PROJECTION_STRING_BYTES,
    maxTotalBytes = MAX_OUTPUT_PROJECTION_TOTAL_BYTES
  } = {}) {
    this.credential = credential;
    this.manifestProjection = manifestProjection;
    this.maxDepth = maxDepth;
    this.maxNodes = maxNodes;
    this.maxStringBytes = maxStringBytes;
    this.maxTotalBytes = maxTotalBytes;
    this.nodes = 0;
    this.sourceTotalBytes = 0;
    this.outputTotalBytes = 0;
  }

  claim(depth) {
    if (depth > this.maxDepth || this.nodes >= this.maxNodes) {
      throw projectionError();
    }
    this.nodes += 1;
  }

  claimTotalBytes(bytes, counter) {
    if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > this.maxTotalBytes - this[counter]) {
      throw projectionError();
    }
    this[counter] += bytes;
  }

  claimContainerBytes(counter) {
    this.claimTotalBytes(2, counter);
  }

  claimNextCollectionEntryBytes(entriesSeen, objectEntries, counter) {
    const bytes = (entriesSeen > 0 ? 1 : 0) + (objectEntries ? 1 : 0);
    this.claimTotalBytes(bytes, counter);
  }

  claimScalarBytes(value, counter) {
    let serialized;
    try {
      serialized = JSON.stringify(value);
    } catch {
      throw projectionError();
    }
    const bytes = typeof serialized === 'string'
      ? Buffer.byteLength(serialized, 'utf8')
      : 4;
    this.claimTotalBytes(bytes, counter);
  }

  redact(value) {
    if (!this.containsCredential(value)) return String(value);
    if (
      this.manifestProjection &&
      this.containsCredential(REDACTION_MARKER)
    ) {
      throw unsafeManifestProjectionError();
    }
    const marker = this.containsCredential(REDACTION_MARKER) ? '' : REDACTION_MARKER;
    return applyCredentialRedaction(
      value,
      this.credential,
      marker,
      this.maxStringBytes
    );
  }

  containsCredential(value) {
    return containsSupportedCredential(value, this.credential);
  }

  claimStringBytes(value, counter) {
    const contentBytes = Buffer.byteLength(value, 'utf8');
    if (contentBytes > this.maxStringBytes) throw projectionError();
    this.claimTotalBytes(Buffer.byteLength(JSON.stringify(value), 'utf8'), counter);
  }

  claimSourceStringBytes(value) {
    this.claimStringBytes(value, 'sourceTotalBytes');
  }

  claimOutputStringBytes(value) {
    this.claimStringBytes(value, 'outputTotalBytes');
  }

  projectString(value, mode, transform = output => output) {
    this.claimSourceStringBytes(value);
    if (isSchemaContractValueMode(mode) && this.containsCredential(value)) {
      throw unsafeManifestProjectionError();
    }
    const projected = mode === PROJECTION_MODE.PAYLOAD ? this.redact(value) : value;
    let transformed = transform(projected);
    if (mode === PROJECTION_MODE.PAYLOAD && this.containsCredential(transformed)) {
      if (this.manifestProjection) throw unsafeManifestProjectionError();
      transformed = '';
    }
    if (containsCredentialInJsonStringToken(transformed, this.credential)) {
      if (isSchemaContractValueMode(mode)) throw unsafeManifestProjectionError();
      transformed = '';
    }
    this.claimOutputStringBytes(transformed);
    return transformed;
  }

  claimKey(key, mode) {
    this.claimSourceStringBytes(key);
    if (
      this.containsCredential(key) ||
      containsCredentialInJsonStringToken(key, this.credential)
    ) {
      if (isSchemaContractValueMode(mode)) throw unsafeManifestProjectionError();
      throw unsafeResponseProjectionError();
    }
    this.claimOutputStringBytes(key);
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

function ownDataProperty(value, key) {
  let descriptor;
  try {
    descriptor = Object.getOwnPropertyDescriptor(value, key);
  } catch {
    return { present: false, value: undefined };
  }
  if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
    return { present: false, value: undefined };
  }
  return { present: true, value: descriptor.value };
}

const ERROR_PAYLOAD_KEYS = Object.freeze(['name', 'message', 'stack']);
const ERROR_PAYLOAD_KEY_SET = new Set(ERROR_PAYLOAD_KEYS);

function traversalError(mode) {
  return isSchemaContractValueMode(mode)
    ? unsafeManifestProjectionError()
    : projectionError();
}

function *ownEnumerableKeyIterator(value, excludedKeys = null) {
  // `for...in` provides a resumable cursor without materializing the full
  // attacker-controlled key set. Inherited keys are always excluded.
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    if (excludedKeys?.has(key)) continue;
    yield key;
  }
}

function readOwnEnumerableDataValue(value, key, mode) {
  let descriptor;
  try {
    descriptor = Object.getOwnPropertyDescriptor(value, key);
  } catch {
    throw traversalError(mode);
  }
  if (
    !descriptor ||
    !descriptor.enumerable ||
    !Object.prototype.hasOwnProperty.call(descriptor, 'value')
  ) {
    throw traversalError(mode);
  }
  return descriptor.value;
}

function readArrayLength(value, mode) {
  let descriptor;
  try {
    descriptor = Object.getOwnPropertyDescriptor(value, 'length');
  } catch {
    throw traversalError(mode);
  }
  if (
    !descriptor ||
    !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
    !Number.isSafeInteger(descriptor.value) ||
    descriptor.value < 0
  ) {
    throw traversalError(mode);
  }
  return descriptor.value;
}

function readArrayDataValue(value, index, mode) {
  let descriptor;
  try {
    descriptor = Object.getOwnPropertyDescriptor(value, String(index));
  } catch {
    throw traversalError(mode);
  }
  if (!descriptor) {
    if (isSchemaContractValueMode(mode)) throw unsafeManifestProjectionError();
    return null;
  }
  if (
    (isSchemaContractValueMode(mode) && !descriptor.enumerable) ||
    !Object.prototype.hasOwnProperty.call(descriptor, 'value')
  ) {
    throw traversalError(mode);
  }
  return descriptor.value;
}

function isCanonicalArrayIndex(key, length) {
  if (!/^(0|[1-9][0-9]*)$/u.test(key)) return false;
  const index = Number(key);
  return Number.isSafeInteger(index) && index >= 0 && index < length;
}

function createObjectKeyCursor(value) {
  return {
    errorIndex: value instanceof Error ? 0 : ERROR_PAYLOAD_KEYS.length,
    iterator: ownEnumerableKeyIterator(
      value,
      value instanceof Error ? ERROR_PAYLOAD_KEY_SET : null
    )
  };
}

function nextObjectKey(frame) {
  if (frame.keyCursor.errorIndex < ERROR_PAYLOAD_KEYS.length) {
    const key = ERROR_PAYLOAD_KEYS[frame.keyCursor.errorIndex];
    frame.keyCursor.errorIndex += 1;
    return { done: false, key, syntheticErrorField: true };
  }
  const next = frame.keyCursor.iterator.next();
  return next.done
    ? { done: true, key: null, syntheticErrorField: false }
    : { done: false, key: next.value, syntheticErrorField: false };
}

function readObjectFrameValue(frame, key, syntheticErrorField) {
  if (syntheticErrorField) {
    if (key === 'stack') {
      return typeof frame.source.stack === 'string' ? frame.source.stack : null;
    }
    return frame.source[key];
  }
  return readOwnEnumerableDataValue(frame.source, key, frame.mode);
}

function schemaChildMode(key, value) {
  if (SCHEMA_DESCRIPTIVE_FIELDS.has(key)) {
    return typeof value === 'string'
      ? PROJECTION_MODE.PAYLOAD
      : PROJECTION_MODE.OPAQUE_CONTRACT;
  }
  if (SCHEMA_MAP_FIELDS.has(key)) return PROJECTION_MODE.SCHEMA_MAP;
  if (SCHEMA_CONTRACT_MAP_FIELDS.has(key)) return PROJECTION_MODE.SCHEMA_CONTRACT_MAP;
  if (SCHEMA_CONTAINER_FIELDS.has(key)) return PROJECTION_MODE.SCHEMA;

  // Known contract values and unknown extension values are both opaque. If
  // they contain the configured credential, rewriting them would falsify the
  // invocation contract, so their bounded projection must fail closed.
  return PROJECTION_MODE.OPAQUE_CONTRACT;
}

function manifestChildMode(key, value) {
  if (MANIFEST_DESCRIPTIVE_FIELDS.has(key)) {
    return typeof value === 'string'
      ? PROJECTION_MODE.PAYLOAD
      : PROJECTION_MODE.OPAQUE_CONTRACT;
  }
  if (MANIFEST_SCHEMA_FIELDS.has(key)) return PROJECTION_MODE.SCHEMA;
  if (MANIFEST_SCHEMA_MAP_FIELDS.has(key)) return PROJECTION_MODE.SCHEMA_MAP;
  if (key === 'capabilities') return PROJECTION_MODE.MANIFEST_CAPABILITIES;
  return PROJECTION_MODE.OPAQUE_CONTRACT;
}

function manifestCapabilitiesChildMode(key) {
  if (MANIFEST_SCHEMA_FIELDS.has(key)) return PROJECTION_MODE.SCHEMA;
  if (MANIFEST_SCHEMA_MAP_FIELDS.has(key)) return PROJECTION_MODE.SCHEMA_MAP;
  return PROJECTION_MODE.OPAQUE_CONTRACT;
}

function childMode(parentMode, key, value) {
  if (
    parentMode === PROJECTION_MODE.SCHEMA_MAP ||
    parentMode === PROJECTION_MODE.SCHEMA_CONTRACT_MAP
  ) {
    return PROJECTION_MODE.SCHEMA;
  }
  if (parentMode === PROJECTION_MODE.SCHEMA) return schemaChildMode(key, value);
  if (parentMode === PROJECTION_MODE.MANIFEST) return manifestChildMode(key, value);
  if (parentMode === PROJECTION_MODE.MANIFEST_CAPABILITIES) {
    return manifestCapabilitiesChildMode(key);
  }
  if (parentMode === PROJECTION_MODE.OPAQUE_CONTRACT) {
    return PROJECTION_MODE.OPAQUE_CONTRACT;
  }
  return parentMode;
}

function createProjectedNode(source, mode, depth, context, seen, nodeClaimed = false) {
  if (!nodeClaimed) context.claim(depth);
  if (typeof source === 'string') {
    return {
      output: context.projectString(source, mode),
      frame: null
    };
  }
  if (
    source === null ||
    typeof source === 'boolean' ||
    (typeof source === 'number' && Number.isFinite(source))
  ) {
    context.claimScalarBytes(source, 'sourceTotalBytes');
    context.claimScalarBytes(source, 'outputTotalBytes');
    return { output: source, frame: null };
  }
  if (typeof source !== 'object') {
    if (isSchemaContractValueMode(mode)) throw unsafeManifestProjectionError();
    return { output: source, frame: null };
  }
  if (isSchemaContractValueMode(mode) && !Array.isArray(source)) {
    let prototype;
    try {
      prototype = Object.getPrototypeOf(source);
    } catch {
      throw unsafeManifestProjectionError();
    }
    if (prototype !== Object.prototype && prototype !== null) {
      throw unsafeManifestProjectionError();
    }
  }
  if (seen.has(source)) throw projectionError();
  seen.add(source);

  context.claimContainerBytes('sourceTotalBytes');
  context.claimContainerBytes('outputTotalBytes');

  const isArray = Array.isArray(source);
  const output = isArray ? [] : {};
  return {
    output,
    frame: isArray
      ? {
          kind: 'array',
          source,
          output,
          mode,
          depth,
          index: 0,
          length: readArrayLength(source, mode),
          extraKeyIterator: null,
          entriesSeen: 0
        }
      : {
          kind: 'object',
          source,
          output,
          mode,
          depth,
          keyCursor: createObjectKeyCursor(source),
          entriesSeen: 0
        }
  };
}

function projectStructuredValue(source, context, mode, rootDepth) {
  const seen = new WeakSet();
  const root = createProjectedNode(source, mode, rootDepth, context, seen);
  const stack = root.frame ? [root.frame] : [];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame.kind === 'array') {
      if (frame.index < frame.length) {
        const index = frame.index;
        frame.index += 1;
        const childDepth = frame.depth + 1;
        // Reserve the child before reading its descriptor or allocating its
        // projected state. The first over-budget child fails immediately.
        context.claim(childDepth);
        context.claimNextCollectionEntryBytes(
          frame.entriesSeen,
          false,
          'sourceTotalBytes'
        );
        context.claimNextCollectionEntryBytes(
          frame.entriesSeen,
          false,
          'outputTotalBytes'
        );
        frame.entriesSeen += 1;

        const item = readArrayDataValue(frame.source, index, frame.mode);
        const itemMode = (
          frame.mode === PROJECTION_MODE.SCHEMA ||
          frame.mode === PROJECTION_MODE.SCHEMA_MAP ||
          frame.mode === PROJECTION_MODE.SCHEMA_CONTRACT_MAP
        )
          ? PROJECTION_MODE.SCHEMA
          : frame.mode;
        const child = createProjectedNode(
          item,
          itemMode,
          childDepth,
          context,
          seen,
          true
        );
        frame.output.push(child.output);
        if (child.frame) stack.push(child.frame);
        continue;
      }

      if (isSchemaContractValueMode(frame.mode)) {
        if (!frame.extraKeyIterator) {
          frame.extraKeyIterator = ownEnumerableKeyIterator(frame.source);
        }
        const next = frame.extraKeyIterator.next();
        if (!next.done) {
          if (!isCanonicalArrayIndex(next.value, frame.length)) {
            throw unsafeManifestProjectionError();
          }
          continue;
        }
      }
      stack.pop();
      continue;
    }

    const next = nextObjectKey(frame);
    if (next.done) {
      stack.pop();
      continue;
    }
    const childDepth = frame.depth + 1;
    // Key discovery is incremental; reserve the child before descriptor read.
    context.claim(childDepth);
    context.claimNextCollectionEntryBytes(
      frame.entriesSeen,
      true,
      'sourceTotalBytes'
    );
    context.claimNextCollectionEntryBytes(
      frame.entriesSeen,
      true,
      'outputTotalBytes'
    );
    frame.entriesSeen += 1;
    context.claimKey(next.key, frame.mode);

    const value = readObjectFrameValue(
      frame,
      next.key,
      next.syntheticErrorField
    );
    const modeForChild = childMode(frame.mode, next.key, value);
    const child = createProjectedNode(
      value,
      modeForChild,
      childDepth,
      context,
      seen,
      true
    );
    defineValue(frame.output, next.key, child.output);
    if (child.frame) stack.push(child.frame);
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
  return context.projectString(
    text,
    PROJECTION_MODE.PAYLOAD,
    output => output.replace(CONTROL_CHARACTER_PATTERN, escapedControlCharacter)
  );
}

function projectNativeManifest(value, context, depth) {
  if (!isPlainObject(value)) throw unsafeManifestProjectionError();
  return projectStructuredValue(value, context, PROJECTION_MODE.MANIFEST, depth);
}

function assertNoSupportedCredential(value, credential) {
  if (typeof credential !== 'string' || !credential) return;
  const active = new WeakSet();
  const stack = [];

  function inspectNode(node) {
    if (typeof node === 'string') {
      if (containsSupportedCredential(node, credential)) {
        throw unsafeManifestProjectionError();
      }
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (active.has(node)) throw projectionError();
    active.add(node);
    stack.push(Array.isArray(node)
      ? {
          kind: 'array',
          source: node,
          mode: PROJECTION_MODE.PAYLOAD,
          index: 0,
          length: readArrayLength(node, PROJECTION_MODE.PAYLOAD)
        }
      : {
          kind: 'object',
          source: node,
          mode: PROJECTION_MODE.PAYLOAD,
          keyCursor: createObjectKeyCursor(node)
        });
  }

  inspectNode(value);
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame.kind === 'array') {
      if (frame.index >= frame.length) {
        active.delete(frame.source);
        stack.pop();
        continue;
      }
      const child = readArrayDataValue(
        frame.source,
        frame.index,
        PROJECTION_MODE.PAYLOAD
      );
      frame.index += 1;
      inspectNode(child);
      continue;
    }

    const next = nextObjectKey(frame);
    if (next.done) {
      active.delete(frame.source);
      stack.pop();
      continue;
    }
    if (containsSupportedCredential(next.key, credential)) {
      throw unsafeManifestProjectionError();
    }
    inspectNode(readObjectFrameValue(frame, next.key, next.syntheticErrorField));
  }
}

function assertOutputBudget(value, {
  maxDepth,
  maxNodes,
  maxStringBytes,
  maxTotalBytes
}) {
  let nodes = 0;
  let totalBytes = 0;
  const active = new WeakSet();
  const stack = [];

  function claimBytes(bytes) {
    if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > maxTotalBytes - totalBytes) {
      throw projectionError();
    }
    totalBytes += bytes;
  }

  function claimString(valueToClaim) {
    if (Buffer.byteLength(valueToClaim, 'utf8') > maxStringBytes) {
      throw projectionError();
    }
    claimBytes(Buffer.byteLength(JSON.stringify(valueToClaim), 'utf8'));
  }

  function claimScalar(valueToClaim) {
    let serialized;
    try {
      serialized = JSON.stringify(valueToClaim);
    } catch {
      throw projectionError();
    }
    claimBytes(typeof serialized === 'string'
      ? Buffer.byteLength(serialized, 'utf8')
      : 4);
  }

  function reserveNode(depth) {
    if (depth > maxDepth || nodes >= maxNodes) throw projectionError();
    nodes += 1;
  }

  function inspectReservedNode(node, depth) {
    if (typeof node === 'string') {
      claimString(node);
      return;
    }
    if (!node || typeof node !== 'object') {
      claimScalar(node);
      return;
    }
    if (active.has(node)) throw projectionError();
    active.add(node);
    claimBytes(2);
    stack.push(Array.isArray(node)
      ? {
          kind: 'array',
          source: node,
          mode: PROJECTION_MODE.PAYLOAD,
          depth,
          index: 0,
          length: readArrayLength(node, PROJECTION_MODE.PAYLOAD),
          entriesSeen: 0
        }
      : {
          kind: 'object',
          source: node,
          mode: PROJECTION_MODE.PAYLOAD,
          depth,
          keyCursor: createObjectKeyCursor(node),
          entriesSeen: 0
        });
  }

  reserveNode(0);
  inspectReservedNode(value, 0);
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame.kind === 'array') {
      if (frame.index >= frame.length) {
        active.delete(frame.source);
        stack.pop();
        continue;
      }
      const index = frame.index;
      frame.index += 1;
      const childDepth = frame.depth + 1;
      reserveNode(childDepth);
      if (frame.entriesSeen > 0) claimBytes(1);
      frame.entriesSeen += 1;
      inspectReservedNode(
        readArrayDataValue(frame.source, index, PROJECTION_MODE.PAYLOAD),
        childDepth
      );
      continue;
    }

    const next = nextObjectKey(frame);
    if (next.done) {
      active.delete(frame.source);
      stack.pop();
      continue;
    }
    const childDepth = frame.depth + 1;
    reserveNode(childDepth);
    claimString(next.key);
    claimBytes(frame.entriesSeen > 0 ? 2 : 1);
    frame.entriesSeen += 1;
    inspectReservedNode(
      readObjectFrameValue(frame, next.key, next.syntheticErrorField),
      childDepth
    );
  }
}

function finalizeProjection(output, context) {
  assertOutputBudget(output, {
    maxDepth: context.maxDepth,
    maxNodes: context.maxNodes,
    maxStringBytes: context.maxStringBytes,
    maxTotalBytes: context.maxTotalBytes
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
  maxNodes,
  maxStringBytes,
  maxTotalBytes
} = {}) {
  const context = createContext({
    credential,
    maxDepth,
    maxNodes,
    maxStringBytes,
    maxTotalBytes
  });
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
  maxNodes,
  maxStringBytes,
  maxTotalBytes
} = {}) {
  const context = createContext({
    credential,
    manifestProjection: true,
    maxDepth,
    maxNodes,
    maxStringBytes,
    maxTotalBytes
  });
  const tools = [];
  for (const plugin of Array.isArray(manifests) ? manifests : []) {
    const wrapperName = isPlainObject(plugin)
      ? ownDataProperty(plugin, 'name')
      : { present: false, value: undefined };
    const nativeManifest = isPlainObject(plugin)
      ? ownDataProperty(plugin, 'nativeManifest')
      : { present: false, value: undefined };
    const nativeName = isPlainObject(nativeManifest.value)
      ? ownDataProperty(nativeManifest.value, 'name')
      : { present: false, value: undefined };
    if (
      !isPlainObject(plugin) ||
      !wrapperName.present ||
      typeof wrapperName.value !== 'string' ||
      !nativeManifest.present ||
      !isPlainObject(nativeManifest.value) ||
      !nativeName.present ||
      nativeName.value !== wrapperName.value
    ) {
      throw nativeManifestSurfaceError();
    }
    if (!allowedTools?.has(nativeName.value)) continue;

    const safeManifest = projectNativeManifest(nativeManifest.value, context, 2);
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
    let parameters = {};
    let parametersFound = false;
    for (const [source, key] of [
      [safeManifest, 'parameters'],
      [safeManifest, 'parameterSchema'],
      [safeManifest, 'inputSchema'],
      [safeManifest, 'input_schema'],
      [capabilities, 'parameters'],
      [capabilities, 'parameterSchema'],
      [capabilities, 'inputSchema'],
      [capabilities, 'input_schema']
    ]) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      parameters = source[key];
      parametersFound = true;
      break;
    }
    if (!parametersFound) parameters = {};

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
  const output = finalizeProjection({ tools }, context);
  assertNoSupportedCredential(output, credential);
  return output;
}

function projectToolExecution(state = {}, toolName, {
  credential,
  maxDepth,
  maxNodes,
  maxStringBytes,
  maxTotalBytes
} = {}) {
  const context = createContext({
    credential,
    maxDepth,
    maxNodes,
    maxStringBytes,
    maxTotalBytes
  });
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
  maxNodes,
  maxStringBytes,
  maxTotalBytes
} = {}) {
  const context = createContext({
    credential,
    maxDepth,
    maxNodes,
    maxStringBytes,
    maxTotalBytes
  });
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
  MAX_OUTPUT_PROJECTION_STRING_BYTES,
  MAX_OUTPUT_PROJECTION_TOTAL_BYTES,
  projectAdapterStatus,
  projectToolExecution,
  projectToolList,
  projectToolStatus,
  redactCredentialText
};
