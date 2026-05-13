const SECRET_PATTERNS = [
  { type: 'private_key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i },
  { type: 'bearer_token', pattern: /\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/i },
  { type: 'api_key', pattern: /\b(api[-_ ]?key|access[-_ ]?key|secret[-_ ]?key)\b\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{8,}/i },
  { type: 'password', pattern: /\b(pass(word)?|passwd|pwd)\b\s*[:=]\s*["']?[^"'\s]{6,}/i },
  { type: 'token', pattern: /\b(token|auth[-_ ]?token|refresh[-_ ]?token)\b\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{8,}/i },
  { type: 'cookie', pattern: /\b(cookie|set-cookie)\b\s*[:=]\s*[^;\s]+/i }
];

function normalizeScanItem(field, value) {
  if (Array.isArray(value)) {
    return value.map((item, index) => ({
      field: `${field}[${index}]`,
      text: String(item || '')
    }));
  }

  return [{
    field,
    text: String(value || '')
  }];
}

function scanText(field, text) {
  const findings = [];
  for (const rule of SECRET_PATTERNS) {
    if (rule.pattern.test(text)) {
      findings.push({ field, type: rule.type });
    }
  }
  return findings;
}

function scanMemoryWritePayload(payload = {}) {
  const scanItems = [
    ...normalizeScanItem('title', payload.title),
    ...normalizeScanItem('content', payload.content),
    ...normalizeScanItem('evidence', payload.evidence),
    ...normalizeScanItem('tags', payload.tags)
  ];

  const findings = [];
  for (const item of scanItems) {
    findings.push(...scanText(item.field, item.text));
  }

  return {
    ok: findings.length === 0,
    findings
  };
}

function formatSecretRejectionReason(scanResult) {
  const types = [...new Set((scanResult?.findings || []).map(item => item.type))].sort();
  const suffix = types.length > 0 ? ` Detected categories: ${types.join(', ')}.` : '';
  return `high-risk secret-like content will not be written to Codex memory.${suffix}`;
}

module.exports = {
  formatSecretRejectionReason,
  scanMemoryWritePayload
};
