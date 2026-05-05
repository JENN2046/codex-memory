# VCPToolBox_向量模型迁移_最小代码改造草案

## 目标

不是做大重构，而是先解决这四件事：

- 多向量模型并存
- 缓存不串档
- EPA / MetaThinking 不吃旧模型残留
- `rag_params.json` 可以按 profile 读取

---

## 1. 当前主要问题

### 1.1 `KnowledgeBaseManager`
- 默认是 `google/gemini-embedding-001` + `3072`
- `storePath` 默认没有按模型隔离

### 1.2 `EPAModule`
- `epa_basis_cache` 没有模型指纹
- 换模型后可能继续读旧 basis

### 1.3 `RAGDiaryPlugin`
- `vector_cache.json` 只看 `rag_tags.json` 哈希
- 换 embedding 后仍可能吃旧缓存

### 1.4 `MetaThinkingManager`
- `meta_chain_vector_cache.json` 没有模型指纹
- auto 主题切换可能用旧 embedding 的主题向量

---

## 2. 新增统一工具：embeddingFingerprint

### 新建文件建议
`modules/utils/embeddingFingerprint.js`

### 示例实现

```js
function getEmbeddingFingerprint({ model, dimension, apiUrl, version }) {
  const safeModel = String(model || 'unknown-model').replace(/[\\/:*?"<>|]/g, '_');
  const safeDim = String(dimension || 'unknown-dim');
  const safeVersion = String(version || process.env.EMBEDDING_PROFILE_VERSION || 'v1');
  return `${safeModel}__${safeDim}__${safeVersion}`;
}

module.exports = { getEmbeddingFingerprint };
```

---

## 3. 改造 `KnowledgeBaseManager.js`

### 3.1 目标
- `storePath` 按模型隔离
- 对外暴露 `embeddingFingerprint`
- 把 fingerprint 传给 `EPAModule`

### 3.2 建议改法

#### A. constructor 里引入 fingerprint

```js
const { getEmbeddingFingerprint } = require('./modules/utils/embeddingFingerprint');

this.embeddingFingerprint = getEmbeddingFingerprint({
  model: this.config.model,
  dimension: this.config.dimension,
  apiUrl: this.config.apiUrl,
  version: process.env.EMBEDDING_PROFILE_VERSION || 'v1'
});

if (!config.storePath && !process.env.KNOWLEDGEBASE_STORE_PATH) {
  this.config.storePath = path.join(__dirname, 'VectorStore', this.embeddingFingerprint);
}
```

#### B. 增加 getter

```js
getEmbeddingFingerprint() {
  return this.embeddingFingerprint;
}
```

#### C. 初始化 EPA 时传入指纹

```js
this.epa = new EPAModule(this.db, {
  dimension: this.config.dimension,
  vexusIndex: this.tagIndex,
  nodeResidual: this.ragParams.KnowledgeBaseManager?.nodeResidualGain || 0.05,
  embeddingFingerprint: this.embeddingFingerprint
});
```

---

## 4. 改造 `EPAModule.js`

### 4.1 目标
- basis cache 带模型指纹
- 指纹不一致则丢弃缓存重建

### 4.2 建议改法

#### A. constructor 增加 fingerprint

```js
this.config = {
  ...
  embeddingFingerprint: config.embeddingFingerprint || 'unknown-fingerprint',
  ...
};
```

#### B. 缓存 key 改造

把固定 key：

```js
'epa_basis_cache'
```

改成：

```js
`epa_basis_cache::${this.config.embeddingFingerprint}`
```

#### C. 保存缓存时补字段

```js
const data = {
  fingerprint: this.config.embeddingFingerprint,
  dimension: this.config.dimension,
  basis: ...,
  mean: ...,
  energies: ...,
  labels: ...,
  timestamp: Date.now(),
  tagCount: ...
};
```

#### D. 加载缓存时校验

```js
if (!data.fingerprint || data.fingerprint !== this.config.embeddingFingerprint) {
  return false;
}
```

---

## 5. 改造 `RAGDiaryPlugin.js`

### 5.1 目标
- `vector_cache.json` 加 embedding 指纹
- `rag_params.json` 支持多 profile

### 5.2 建议改法

#### A. 初始化时保存 fingerprint

```js
this.embeddingFingerprint =
  this.vectorDBManager?.getEmbeddingFingerprint?.() || 'unknown-fingerprint';
```

#### B. 写缓存时补字段

当前：

```js
const newCache = {
  sourceHash: configHash,
  createdAt: new Date().toISOString(),
  vectors: this.enhancedVectorCache,
};
```

改成：

```js
const newCache = {
  sourceHash: configHash,
  embeddingFingerprint: this.embeddingFingerprint,
  createdAt: new Date().toISOString(),
  vectors: this.enhancedVectorCache,
};
```

#### C. 读缓存时校验

```js
if (
  cache &&
  cache.sourceHash === currentConfigHash &&
  cache.embeddingFingerprint === this.embeddingFingerprint
) {
  ...
}
```

#### D. `loadRagParams()` 改成 profile 合并

```js
const rawParams = JSON.parse(data);
const fp = this.embeddingFingerprint;
const defaultParams = rawParams.default || {};
const profileParams = rawParams.profiles?.[fp] || {};

this.ragParams = {
  RAGDiaryPlugin: {
    ...(defaultParams.RAGDiaryPlugin || {}),
    ...(profileParams.RAGDiaryPlugin || {})
  },
  KnowledgeBaseManager: {
    ...(defaultParams.KnowledgeBaseManager || {}),
    ...(profileParams.KnowledgeBaseManager || {})
  },
  MetaThinkingManager: {
    ...(defaultParams.MetaThinkingManager || {}),
    ...(profileParams.MetaThinkingManager || {})
  }
};
```

---

## 6. 改造 `MetaThinkingManager.js`

### 6.1 目标
- `meta_chain_vector_cache.json` 带指纹
- autoThreshold 可读 profile

### 6.2 建议改法

#### A. 记录 fingerprint

```js
this.embeddingFingerprint =
  this.ragPlugin.embeddingFingerprint || 'unknown-fingerprint';
```

#### B. 写缓存时补字段

```js
const newCache = {
  sourceHash: configHash,
  embeddingFingerprint: this.embeddingFingerprint,
  createdAt: new Date().toISOString(),
  vectors: this.metaChainThemeVectors,
};
```

#### C. 读缓存时校验

```js
if (
  cache &&
  cache.sourceHash === currentMetaChainHash &&
  cache.embeddingFingerprint === this.embeddingFingerprint
) {
  ...
}
```

#### D. autoThreshold 走 profile

```js
const autoCfg = this.ragPlugin.ragParams?.MetaThinkingManager || {};
if (isAutoMode && autoCfg.autoThreshold !== undefined) {
  autoThreshold = autoCfg.autoThreshold;
}
```

---

## 7. 迁移脚本建议

### 新建脚本
`scripts/rebuild_embedding_profile.js`

### 最低要求
这个脚本至少要完成：

- 打印当前 `embeddingFingerprint`
- 打印当前 `storePath`
- 打印当前 `model` / `dimension`
- 删除当前 profile 对应的：
  - VectorStore
  - EPA cache
  - `vector_cache.json`
  - `meta_chain_vector_cache.json`
- 然后由运行时自动重建

---

## 8. 最小迁移流程

### Step 1
改环境变量：

```env
WhitelistEmbeddingModel=qwen-embedding-x
VECTORDB_DIMENSION=1536
EMBEDDING_PROFILE_VERSION=qwen-v1
```

### Step 2
让 `storePath` 按 fingerprint 独立

### Step 3
重建：

- `VectorStore/<fingerprint>`
- `epa_basis_cache::<fingerprint>`
- `Plugin/RAGDiaryPlugin/vector_cache.json`
- `Plugin/RAGDiaryPlugin/meta_chain_vector_cache.json`

### Step 4
切换到新的多 profile `rag_params`

### Step 5
观察：

- `L / R / S`
- `matchedTags`
- `coreTagsMatched`
- `::TagMemo` vs `::TagMemo+`
- MetaThinking auto 选链是否跑偏

---

## 9. 上线建议

### 先并轨，不要直接覆盖
保留旧 fingerprint，确保：

- 可以随时切回
- 可以做 A/B 对照
- 可以观察新 profile 是否真的更稳

### 第一轮参数要保守
尤其先收这些：

- `tagWeightRange`
- `geodesicRerank.alpha`
- `dynamicBoostRange`
- `metaThinkingWeights`
- `autoThreshold`

---

## 10. 一句话收口

这次改造不是为了“支持更多模型”。

而是为了让系统真正承认：

**不同 embedding 模型，是不同语义地形。必须单独立档、单独建图、单独校准。**
