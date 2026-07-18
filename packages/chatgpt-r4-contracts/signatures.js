'use strict';

const crypto = require('node:crypto');
const { canonicalJson, isPlainObject } = require('./canonical');
const { reject } = require('./errors');

function unsignedProjection(value) {
  if (!isPlainObject(value)) reject('signed_value_not_object');
  const { signature, ...payload } = value;
  return payload;
}

function validateSigningInputs({ privateKey, keyId }) {
  if (!privateKey) reject('signing_key_missing');
  if (typeof keyId !== 'string' || keyId.length < 1 || keyId.length > 80) {
    reject('signing_key_id_invalid');
  }
}

function signObject(value, { privateKey, keyId }) {
  validateSigningInputs({ privateKey, keyId });
  if (!isPlainObject(value) || Object.hasOwn(value, 'signature')) {
    reject('signing_payload_invalid');
  }
  const payload = Buffer.from(canonicalJson(value), 'utf8');
  const signature = crypto.sign(null, payload, privateKey).toString('base64url');
  return {
    ...value,
    signature: {
      algorithm: 'Ed25519',
      key_id: keyId,
      value: signature
    }
  };
}

function verifySignedObject(value, { resolvePublicKey, expectedKeyId } = {}) {
  if (!isPlainObject(value) || !isPlainObject(value.signature)) reject('signature_missing');
  const signature = value.signature;
  if (signature.algorithm !== 'Ed25519') reject('signature_algorithm_invalid');
  if (typeof signature.key_id !== 'string' || signature.key_id.length < 1 || signature.key_id.length > 80) {
    reject('signature_key_id_invalid');
  }
  if (expectedKeyId && signature.key_id !== expectedKeyId) reject('signature_key_id_mismatch');
  if (typeof signature.value !== 'string' || !/^[A-Za-z0-9_-]+$/u.test(signature.value)) {
    reject('signature_value_invalid');
  }
  if (typeof resolvePublicKey !== 'function') reject('signature_key_resolver_missing');
  const publicKey = resolvePublicKey(signature.key_id);
  if (!publicKey) reject('signature_public_key_missing');

  let accepted = false;
  try {
    accepted = crypto.verify(
      null,
      Buffer.from(canonicalJson(unsignedProjection(value)), 'utf8'),
      publicKey,
      Buffer.from(signature.value, 'base64url')
    );
  } catch {
    reject('signature_verification_failed');
  }
  if (!accepted) reject('signature_verification_failed');
  return true;
}

module.exports = {
  unsignedProjection,
  signObject,
  verifySignedObject
};
