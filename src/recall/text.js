const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into', 'is', 'it', 'of', 'on',
  'or', 'that', 'the', 'this', 'to', 'with', '我们', '你们', '他们', '以及', '一个', '一种', '这个', '那个',
  '进行', '需要', '通过', '相关', '当前', '就是', '已经', '可以', '然后', '因为', '如果', '并且', '以及', '还是',
  '关于', '一下', '最近', '今天', '昨天', '本周', '上周', '本月', '上月'
]);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .match(/[a-z0-9_\u4e00-\u9fff]+/g) || [];
}

function contentTokens(text) {
  return tokenize(text)
    .map(token => token.trim())
    .filter(Boolean)
    .filter(token => {
      if (STOP_WORDS.has(token)) return false;
      if (/^[a-z]$/.test(token)) return false;
      if (/^\d+$/.test(token)) return false;
      return token.length >= 2 || /[\u4e00-\u9fff]/.test(token);
    });
}

function uniqueTokens(tokens) {
  return [...new Set((Array.isArray(tokens) ? tokens : []).filter(Boolean))];
}

function tokenFrequency(tokens) {
  const buckets = new Map();
  for (const token of tokens) {
    buckets.set(token, (buckets.get(token) || 0) + 1);
  }
  return buckets;
}

function pickCoreTokens(tokens, limit = 8) {
  const frequencies = tokenFrequency(tokens);
  return [...frequencies.entries()]
    .map(([token, count]) => ({
      token,
      weight: count * (token.length >= 4 ? 1.15 : 1)
    }))
    .sort((left, right) => right.weight - left.weight || right.token.length - left.token.length)
    .slice(0, limit)
    .map(entry => entry.token);
}

function compactText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function jaccardSimilarity(leftTokens, rightTokens) {
  const left = new Set(leftTokens || []);
  const right = new Set(rightTokens || []);
  if (left.size === 0 || right.size === 0) return 0;

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }

  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

module.exports = {
  compactText,
  contentTokens,
  jaccardSimilarity,
  pickCoreTokens,
  tokenize,
  tokenFrequency,
  uniqueTokens
};
