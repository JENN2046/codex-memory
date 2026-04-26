function splitOversizedSegment(text, maxChars, overlapChars) {
  const segments = [];
  let start = 0;
  const safeOverlap = Math.min(Math.max(0, overlapChars), Math.max(0, maxChars - 1));

  while (start < text.length) {
    const end = Math.min(text.length, start + maxChars);
    segments.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = Math.max(start + 1, end - safeOverlap);
  }

  return segments.filter(Boolean);
}

function chunkText(text, options = {}) {
  const maxChars = options.maxChars || 900;
  const overlapChars = options.overlapChars || 120;
  const source = String(text || '').trim();
  if (!source) return [];

  const paragraphs = source
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return splitOversizedSegment(source, maxChars, overlapChars);
  }

  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }

    const candidate = `${current}\n\n${paragraph}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    if (paragraph.length > maxChars) {
      chunks.push(...splitOversizedSegment(paragraph, maxChars, overlapChars));
      current = '';
      continue;
    }

    const overlap = current.slice(Math.max(0, current.length - overlapChars)).trim();
    current = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.filter(Boolean);
}

module.exports = {
  chunkText
};
