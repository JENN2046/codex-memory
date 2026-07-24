'use strict';

const crypto = require('node:crypto');

const BINDING_FINGERPRINT_DOMAIN =
  'codex-memory-diary-scope-runtime-binding-v1';

function diaryScopeMappingBindingFingerprint(mappingReference, mappingDigest) {
  if (typeof mappingReference !== 'string' ||
      mappingReference.length < 1 ||
      mappingReference.length > 240 ||
      /[\u0000-\u001f\u007f]/u.test(mappingReference) ||
      !/^sha256:[a-f0-9]{64}$/u.test(mappingDigest || '')) {
    return null;
  }
  const referenceBytes = Buffer.from(mappingReference, 'utf8');
  const payload = Buffer.concat([
    Buffer.from(`${BINDING_FINGERPRINT_DOMAIN}\0${referenceBytes.length}:`, 'utf8'),
    referenceBytes,
    Buffer.from(`\0${mappingDigest}`, 'utf8')
  ]);
  return `sha256:${crypto.createHash('sha256').update(payload).digest('hex')}`;
}

module.exports = {
  BINDING_FINGERPRINT_DOMAIN,
  diaryScopeMappingBindingFingerprint
};
