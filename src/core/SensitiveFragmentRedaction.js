const SENSITIVE_FRAGMENT_PATTERNS = Object.freeze([
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*/gi,
  /[A-Za-z][A-Za-z0-9+.-]*:\/\/[^"',;\s)]+/gi,
  /\b[A-Z]:[\\/][^"',;\s)]+/gi,
  /\\\\[A-Za-z0-9._$-]+[\\/][^"',;\s)]+/g,
  /(?:^|[\s"'(])\/(?:Users|home|var|tmp|etc|opt|mnt|Volumes)\/[^"',;\s)]+/gi,
  /(?:^|[\s"'(])\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+/gi,
  /\.env(?:\.[A-Za-z0-9_.-]+)?/gi,
  /\bauthorization\s*[:=]\s*(?:bearer\s+)?["']?[^"',;\s]+["']?/gi,
  /\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /\b(provider[-_ ]?api[-_ ]?key|providerapikey|api[-_ ]?key|access[-_ ]?key|secret[-_ ]?key)\b\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{8,}["']?/gi,
  /\bproviderapikey\b/gi,
  /\bapi[_-]?key\b/gi,
  /\b(pass(word)?|passwd|pwd)\b\s*[:=]\s*["']?[^"',;\s]{6,}["']?/gi,
  /\b(token|auth[-_ ]?token|refresh[-_ ]?token)\b\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{8,}["']?/gi,
  /\b(cookie|set-cookie)\b\s*[:=]\s*[^;\s]+/gi,
  /\bworkspace_id\s*[:=]\s*["']?[^"',;\s]+["']?/gi,
  /\bworkspace_id\b/gi,
  /\braw_workspace_id\s*[:=]\s*["']?[^"',;\s]+["']?/gi,
  /\braw_workspace_id\b/gi
]);

function redactSensitiveFragments(value) {
  let redacted = typeof value === 'string' ? value : String(value ?? '');

  for (const pattern of SENSITIVE_FRAGMENT_PATTERNS) {
    redacted = redacted.replace(pattern, '<redacted>');
  }

  return redacted;
}

module.exports = {
  SENSITIVE_FRAGMENT_PATTERNS,
  redactSensitiveFragments
};
