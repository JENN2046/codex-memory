'use strict';

const crypto = require('node:crypto');
const { reject } = require('./errors');

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalize(value, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) reject('non_finite_number');
    return value;
  }
  if (typeof value !== 'object') reject('unsupported_canonical_value');
  if (seen.has(value)) reject('cyclic_canonical_value');
  seen.add(value);

  let output;
  if (Array.isArray(value)) {
    output = value.map(item => canonicalize(item, seen));
  } else {
    if (!isPlainObject(value)) reject('non_plain_canonical_object');
    output = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) reject('undefined_canonical_value');
      output[key] = canonicalize(value[key], seen);
    }
  }
  seen.delete(value);
  return output;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'utf8');
  return `sha256:${crypto.createHash('sha256').update(input).digest('hex')}`;
}

function digestObject(value) {
  return sha256(canonicalJson(value));
}

function utf8ByteLength(value) {
  return Buffer.byteLength(typeof value === 'string' ? value : canonicalJson(value), 'utf8');
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function normalizeKey(key) {
  return String(key).replace(/[^a-z0-9]/giu, '').toLowerCase();
}

module.exports = {
  isPlainObject,
  canonicalize,
  canonicalJson,
  sha256,
  digestObject,
  utf8ByteLength,
  deepFreeze,
  normalizeKey
};
