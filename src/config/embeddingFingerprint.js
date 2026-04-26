function sanitizeFingerprintPart(value, fallback) {
  const raw = String(value || fallback || '').trim();
  const sanitized = raw
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return sanitized || fallback;
}

function getEmbeddingFingerprint({ provider, model, dimension, dimensions, version } = {}) {
  const modelPart = sanitizeFingerprintPart(model || provider, 'local-hash');
  const dimensionPart = sanitizeFingerprintPart(dimension || dimensions, 'unknown-dim');
  const versionPart = sanitizeFingerprintPart(version, 'v1');
  return `${modelPart}__${dimensionPart}__${versionPart}`;
}

module.exports = {
  getEmbeddingFingerprint,
  sanitizeFingerprintPart
};
