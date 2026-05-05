# 浪潮 V8 / TagMemo 技术文档

版本：v1.0  
整理日期：2026-04-26  
适用范围：VCPToolBox 的 TagMemo / RAG / 元思考链相关代码与迁移调参讨论

---

## 1. 文档定位

这份文档专门整理 VCPToolBox 中“浪潮 V8”的代码形态、数据流、触发方式、调参逻辑、向量模型迁移风险，以及后续工程化建议。

它不是概念介绍，而是围绕当前代码中已经能看到的核心文件来写：

- `KnowledgeBaseManager.js`
- `TagMemoEngine.js`
- `EPAModule.js`
- `ResidualPyramid.js`
- `Plugin/RAGDiaryPlugin/RAGDiaryPlugin.js`
- `Plugin/RAGDiaryPlugin/MetaThinkingManager.js`
- `rag_params.json`
- `docs/V8_GEODESIC_RERANK_DEVPLAN.md`
- `TAGMEMO_TUNING_GUIDE.md`

一句话概括：

> 浪潮 V8 不是单一算法，而是一条由向量检索、标签拓扑、语义投影、残差分解、脉冲传播、测地线重排和元思考链共同组成的记忆检索系统。

---

## 2. 关键结论

### 2.1 浪潮 V8 已经进入主搜索链

当前代码里，V8 不是只写在 README 或开发计划里。它已经在 `KnowledgeBaseManager.search()`、`TagMemoEngine.applyTagBoost()`、`TagMemoEngine.geodesicRerank()` 等路径中形成实际逻辑。

核心代码事实：

- `KnowledgeBaseManager` 初始化 `TagMemoEngine`
- `TagMemoEngine.applyTagBoost()` 生成 `lastEnergyField`
- `KnowledgeBaseManager._searchSpecificIndex()` / `_searchAllIndices()` 可在 KNN 结果之后调用 `geodesicRerank()`
- `RAGDiaryPlugin` 业务层会读取 EPA / Context width 指标，动态决定 `K`、`tagWeight`、`tagTruncationRatio`
- `MetaThinkingManager` 会递归调用 `vectorDBManager.search()`，把元思考簇也接进检索链

### 2.2 它不是 Google-only，但默认主配方围绕 Gemini

`KnowledgeBaseManager` 默认：

```js
model = 'google/gemini-embedding-001'
dimension = 3072
```

但 `EmbeddingUtils.js` 使用的是兼容式 `/v1/embeddings` 接口，不是 Google SDK 专属调用。

因此更准确的表述是：

> 当前 V8 浪潮系统默认围绕 Google / Gemini embedding 调优，但架构上并未硬锁为 Google-only。

### 2.3 更换向量模型时，必须重建地形

V8 系统依赖向量空间的“地形”。一旦 embedding 模型更换，以下内容都不能继续混用：

- `chunks.vector`
- `tags.vector`
- Vexus / `.usearch` 索引
- EPA basis cache
- `RAGDiaryPlugin` 的 `vector_cache.json`
- `MetaThinkingManager` 的 `meta_chain_vector_cache.json`
- 对应的 `rag_params.json` profile

只改模型名，不重建缓存与索引，会造成“旧地形上起新浪”的错乱。

---

## 3. 整体架构图

### 3.1 主链概览

```text
用户问题 / 对话上下文
        │
        ▼
RAGDiaryPlugin
  - 解析占位符 / 修饰符
  - 计算 query vector
  - 计算 L/R/S 动态参数
  - 决定 K、tagWeight、truncation
        │
        ▼
KnowledgeBaseManager.search()
  - 选择 diary index / global index
  - 调用 TagMemoEngine.applyTagBoost()
        │
        ▼
TagMemoEngine
  - EPA 投影
  - Residual Pyramid 分析
  - Core tag / ghost anchor 注入
  - Spike Propagation / LIF-Router
  - accumulatedEnergy → lastEnergyField
        │
        ▼
Vexus KNN Search
        │
        ▼
Geodesic Rerank
  - 复用 lastEnergyField
  - 按 chunk 的 tag 能量场重排
        │
        ▼
Hydrate Results
  - chunk → text / sourceFile
  - per-chunk tag attribution
        │
        ▼
可选后处理
  - Dedup
  - TimeDecay
  - Rerank / Rerank+
        │
        ▼
格式化输出 / 注入上下文
```

### 3.2 元思考链路径

```text
MetaThinkingManager
        │
        ├─ 加载 meta_thinking_chains.json
        ├─ 为每个 chain 主题生成向量
        ├─ Auto 模式下选择最相近主题
        │
        ▼
阶段 1：vectorDBManager.search(clusterName, currentQueryVector, k)
        │
        ▼
取召回结果向量平均
        │
        ▼
与原 query vector 按 metaThinkingWeights 融合
        │
        ▼
阶段 2 / 阶段 3 / ...
        │
        ▼
输出元思考链结果
```

这意味着 V8 不只影响普通 RAG，它也影响“AI 如何选择思考路径”。

---

## 4. 关键模块详解

## 4.1 `KnowledgeBaseManager`

### 4.1.1 职责

`KnowledgeBaseManager` 是知识库主入口。它负责：

- 初始化 SQLite
- 管理 `files / chunks / tags / file_tags`
- 加载或恢复 Vexus 索引
- 初始化全局 tag index
- 初始化 `TagMemoEngine`
- 初始化 `ResultDeduplicator`
- 读取并监听 `rag_params.json`
- 提供 `search()` 主搜索接口

### 4.1.2 默认模型配置

当前默认配置为：

```js
model: process.env.WhitelistEmbeddingModel || 'google/gemini-embedding-001'
dimension: parseInt(process.env.VECTORDB_DIMENSION) || 3072
```

这说明当前系统的默认向量空间是 Gemini 3072 维。

### 4.1.3 搜索入口

`search()` 支持多种调用方式：

- 指定 diaryName + queryVec
- 全局 queryVec
- tagBoost
- coreTags
- coreBoostFactor
- options

V8 中一个非常重要的触发方式是：

```text
tagBoost = "0.6+"
```

当 tagBoost 是带 `+` 的字符串时，会自动启用：

```js
options.geodesicRerank = true
```

这说明 `+` 是 V8 增强模式的重要信号。

### 4.1.4 搜索后的重排

在 KNN 搜索后，如果满足：

```js
options?.geodesicRerank && this.tagMemoEngine?.lastEnergyField
```

就会调用：

```js
this.tagMemoEngine.geodesicRerank(results, {
  alpha: options.geoAlpha,
  minGeoSamples: options.minGeoSamples
});
```

这一点很关键：

> 测地线重排不是替代 KNN，而是在 KNN 之后做二次排序。

---

## 4.2 `TagMemoEngine`

### 4.2.1 职责

`TagMemoEngine` 是浪潮算法核心。它处理：

- TagMemo 增强向量
- EPA 投影结果接入
- Residual Pyramid 特征接入
- 标签共现矩阵
- Spike Propagation / LIF-Router
- 语言补偿
- core tag boost
- ghost anchor
- 语义去重
- geodesic rerank

### 4.2.2 `applyTagBoost()` 的阶段

`applyTagBoost()` 大致分为：

1. 清空旧 `lastEnergyField`
2. 对原始 query vector 做 EPA 分析
3. 对 query vector 做 Residual Pyramid 分析
4. 根据 `logicDepth / entropy / resonance / coverage / novelty` 计算动态增强因子
5. 从残差金字塔收集 tags
6. 进行语言置信度补偿
7. 进行世界观门控
8. 对 coreTags 做额外聚光灯增强
9. 启动 Spike Propagation / LIF-Router
10. 得到 `accumulatedEnergy`
11. 写入 `this.lastEnergyField`
12. 注入 ghost anchors
13. 对 tag 做语义去重
14. 构建 context vector
15. 与原始 query vector 按 alpha 融合
16. 返回增强后的 query vector 与 tagInfo

### 4.2.3 Spike Propagation / LIF-Router

核心对象：

```js
activeSpikes
accumulatedEnergy
```

传播参数来自 `rag_params.json`：

- `maxSafeHops`
- `baseMomentum`
- `firingThreshold`
- `baseDecay`
- `wormholeDecay`
- `tensionThreshold`
- `maxEmergentNodes`
- `maxNeighborsPerNode`

传播过程会沿着 tag 共现矩阵扩散。每个 tag 节点可以把能量传播到相关 tag。能量会衰减，但如果触发“虫洞”条件，动量消耗会减轻。

最终所有传播结果累计在：

```js
accumulatedEnergy
```

然后缓存为：

```js
this.lastEnergyField = accumulatedEnergy
```

这就是 V8 测地线重排使用的“地形场”。

---

## 4.3 `geodesicRerank()`

### 4.3.1 核心公式

V8 开发计划里的核心公式：

```text
finalScore = (1 - alpha) * knnScore + alpha * normalizedGeoScore
```

含义：

- `knnScore`：原始向量相似度
- `normalizedGeoScore`：chunk 在标签能量场上的贴地得分
- `alpha`：测地线重排权重

### 4.3.2 数据路径

```text
KNN candidates
    │
    ├─ chunk_id → file_id
    │
    ├─ file_id → tag_id[]
    │
    ├─ tag_id 在 lastEnergyField 中查 energy
    │
    ├─ geoScore = totalEnergy / hitCount
    │
    ├─ normalizedGeoScore = geoScore / maxGeo
    │
    └─ finalScore 混合排序
```

### 4.3.3 三层防御

V8 的安全退化链：

| 层级 | 条件 | 行为 |
|---|---|---|
| L0 | `lastEnergyField` 为空 | 返回原 KNN 顺序 |
| L1 | 某 chunk 的 `hitCount < minGeoSamples` | 该 chunk 的 geoScore = 0 |
| L2 | 所有 chunk 的 maxGeo = 0 | 跳过归一化，回退纯 KNN |

这意味着最坏情况是“不增强”，不是崩坏。

---

## 4.4 `EPAModule`

### 4.4.1 职责

EPA 是“语义坐标系”模块。它把大量 tag vector 投影到一组语义主轴上，判断当前 query 落在哪个“世界”。

### 4.4.2 算法特点

它不是简单 PCA，而是：

- K-Means 提取语义簇
- 加权平均向量
- 中心化
- 加权 Gram Matrix
- Power Iteration 提取特征向量
- 可走 Rust 高性能投影

### 4.4.3 输出指标

EPA 主要输出：

- `entropy`
- `logicDepth = 1 - normalizedEntropy`
- `dominantAxes`
- `resonance`

在业务层中，`logicDepth` 和 `resonance` 直接影响 tag 权重和检索 K 值。

---

## 4.5 `ResidualPyramid`

### 4.5.1 职责

Residual Pyramid 是“语义剩余能量分析器”。它回答：

> 当前 query 能被现有 tag 解释多少？还有多少是新东西？

### 4.5.2 核心过程

1. 用当前残差向量检索 topK tags
2. 获取 tag vectors
3. 对 tag vectors 做 Gram-Schmidt 正交投影
4. 计算本层解释的能量
5. 更新 residual
6. 多层重复，直到残差能量足够低

### 4.5.3 输出特征

- `coverage`：现有 tags 解释了多少
- `novelty`：新颖度
- `coherence`：召回 tags 是否相干
- `tagMemoActivation`：是否值得激活 TagMemo

这些特征会进入 `TagMemoEngine.applyTagBoost()`，影响增强强度。

---

## 4.6 `RAGDiaryPlugin`

### 4.6.1 职责

`RAGDiaryPlugin` 是业务层入口。

它负责：

- 加载 RAG 配置
- 加载 `rag_params.json`
- 管理 query cache / embedding cache / aimemo cache
- 接入 `AIMemoHandler`
- 接入 `MetaThinkingManager`
- 接入 `SemanticGroupManager`
- 接入 `ContextVectorManager`
- 接入 `FoldingStore`
- 根据 query 动态计算检索参数

### 4.6.2 动态参数计算

`_calculateDynamicParams()` 取：

- `L = EPA.logicDepth`
- `R = EPA.resonance`
- `S = ContextVectorManager.computeSemanticWidth()`

然后计算：

- `finalK`
- `finalTagWeight`
- `tagTruncationRatio`

也就是说，V8 的语义分析不是只在后端运行，它会直接影响业务层如何召回。

---

## 4.7 `MetaThinkingManager`

### 4.7.1 职责

`MetaThinkingManager` 是元思考链编排器。

它负责：

- 加载 `meta_thinking_chains.json`
- 为每个 chain 主题生成向量
- Auto 模式下根据 query 选择最合适的思维链
- 分阶段检索各个思维簇
- 每阶段把检索结果向量平均后，和原 query 融合，作为下一阶段 query

### 4.7.2 为什么它对换模型敏感

因为它依赖：

- query vector
- meta chain theme vectors
- 每阶段召回结果 vectors

所以换 embedding 模型后，不重建 `meta_chain_vector_cache.json`，会直接导致自动选链错误。

---

## 5. 触发方式

## 5.1 `::TagMemo`

普通 TagMemo 模式。它启用标签增强，但不一定启用 V8 测地线重排。

## 5.2 `::TagMemo+`

V8 增强模式。根据开发计划，它是 `::TagMemo` 的超集：

- tagWeight 仍然生效
- 额外启用 geodesic rerank

## 5.3 `tagBoost = "0.6+"`

`KnowledgeBaseManager.search()` 里也支持这种增强语法：

- `0.6` 表示 tagBoost
- `+` 表示打开 geodesic rerank

## 5.4 options 显式触发

也可以通过 options 传入：

```js
{
  geodesicRerank: true,
  geoAlpha: 0.3,
  minGeoSamples: 4
}
```

---

## 6. 参数词典

## 6.1 `RAGDiaryPlugin`

### `noise_penalty`

语义宽度惩罚。用于抑制发散 query 中的标签增强。

- 调高：更谨慎，少误触发
- 调低：更宽容，更容易拉记忆

### `tagWeightRange`

标签权重映射范围。

- 上限高：TagMemo 更强，容易惊艳，也容易跑偏
- 上限低：更依赖原始 KNN，稳定但不够“浪”

### `tagTruncationBase`

保留标签比例的基准值。

- 高：保留更多长尾标签
- 低：只保留核心标签

### `mainSearchWeights`

主检索中原始语义与标签语义的权重关系。

### `refreshWeights`

刷新或补充检索路径中的权重关系。

### `metaThinkingWeights`

元思考链中，原始 query vector 与上阶段结果向量的融合权重。

例如：

```json
[0.86, 0.14]
```

表示更信原始 query，少被前一阶段召回牵引。

---

## 6.2 `KnowledgeBaseManager`

### `geodesicRerank.alpha`

测地线重排权重。

- 0：纯 KNN
- 1：纯 geodesic
- 推荐初始范围：0.12 ~ 0.30

### `geodesicRerank.minGeoSamples`

chunk 至少命中多少个能量场 tags 才参与 geoScore。

- 高：更稳，更少误拉
- 低：更敏感，更容易起浪

### `activationMultiplier`

残差金字塔激活增益。

影响新颖特征对最终 TagMemo 的增强程度。

### `dynamicBoostRange`

EPA / Residual 对 tagBoost 的二次修正范围。

- 上限高：系统更敢增强
- 上限低：系统更保守

### `coreBoostRange`

核心标签聚光灯。

- 高：coreTags 非常强
- 低：coreTags 只轻微引导

### `deduplicationThreshold`

语义去重阈值。

- 高：少去重，保留细节
- 低：强去重，标签云更干净

### `techTagThreshold`

技术词在非技术语境下的生存门槛。

### `normalTagThreshold`

普通标签进入输出或参与判断的最低权重门槛。

### `languageCompensator`

语言补偿参数。用于处理英文技术噪音、跨语境实体等问题。

---

## 6.3 `spikeRouting`

### `maxSafeHops`

最多传播几跳。

### `baseMomentum`

初始脉冲动量。

### `firingThreshold`

低于该能量的节点不再传播。

### `baseDecay`

普通边上的传播衰减。

### `wormholeDecay`

虫洞边上的传播衰减。

### `tensionThreshold`

是否触发虫洞的张力门槛。

### `maxEmergentNodes`

最多允许多少个涌现 tag 节点加入。

### `maxNeighborsPerNode`

每个节点最多传播给多少邻居。

---

## 7. 推荐调参策略

## 7.1 保守模式

适合：刚换模型、刚重建索引、还不知道新模型分布。

```json
{
  "RAGDiaryPlugin": {
    "noise_penalty": 0.08,
    "tagWeightRange": [0.03, 0.22],
    "tagTruncationBase": 0.55,
    "tagTruncationRange": [0.45, 0.75],
    "metaThinkingWeights": [0.86, 0.14]
  },
  "KnowledgeBaseManager": {
    "geodesicRerank": {
      "alpha": 0.18,
      "minGeoSamples": 5
    },
    "activationMultiplier": [0.5, 1.1],
    "dynamicBoostRange": [0.3, 1.25],
    "coreBoostRange": [1.15, 1.28]
  }
}
```

特点：

- KNN 主导
- TagMemo 轻推
- geodesic 谨慎
- MetaThinking 不被阶段结果过度牵引

## 7.2 平衡模式

适合：新模型已经跑稳，TagMemo 效果正常。

```json
{
  "RAGDiaryPlugin": {
    "noise_penalty": 0.06,
    "tagWeightRange": [0.04, 0.32],
    "tagTruncationBase": 0.60,
    "tagTruncationRange": [0.50, 0.85],
    "metaThinkingWeights": [0.82, 0.18]
  },
  "KnowledgeBaseManager": {
    "geodesicRerank": {
      "alpha": 0.25,
      "minGeoSamples": 4
    },
    "activationMultiplier": [0.5, 1.35],
    "dynamicBoostRange": [0.3, 1.65],
    "coreBoostRange": [1.18, 1.35]
  }
}
```

## 7.3 激进模式

适合：旧记忆召回不足，想让浪潮更主动。

```json
{
  "RAGDiaryPlugin": {
    "noise_penalty": 0.04,
    "tagWeightRange": [0.05, 0.42],
    "tagTruncationBase": 0.68,
    "tagTruncationRange": [0.55, 0.90],
    "metaThinkingWeights": [0.78, 0.22]
  },
  "KnowledgeBaseManager": {
    "geodesicRerank": {
      "alpha": 0.35,
      "minGeoSamples": 3
    },
    "activationMultiplier": [0.5, 1.6],
    "dynamicBoostRange": [0.3, 2.0],
    "coreBoostRange": [1.22, 1.45]
  }
}
```

风险：容易把旧记忆、万能标签和弱相关标签拉得太高。

---

## 8. 换向量模型后的适配

## 8.1 为什么需要模型指纹

V8 的很多缓存都与 embedding 模型强相关。

必须区分：

```text
model + dimension + apiUrl + version
```

建议生成：

```text
embeddingFingerprint = <modelName>__<dimension>__<version>
```

例子：

```text
google_gemini_embedding_001__3072__v1
qwen3_embedding_4b__2560__v1
bge_m3__1024__v1
```

## 8.2 必须隔离的产物

- `VectorStore/<fingerprint>/`
- `epa_basis_cache::<fingerprint>`
- `vector_cache.json` 加 fingerprint
- `meta_chain_vector_cache.json` 加 fingerprint
- `rag_params.json` 用 profile 管理

## 8.3 换模型后必须重建

- SQLite 向量字段
- Vexus 索引
- EPA basis
- RAG tag 向量缓存
- meta chain 主题向量缓存

---

## 9. 本地部署模型建议

## 9.1 Qwen3-Embedding-4B

适合：作为本地主力候选。

优点：

- 中文 / 多语强
- 长文本能力强
- 上限高
- 适合长期本地系统

建议初期：保守 profile。

## 9.2 BGE-M3

适合：稳健知识库工程底座。

优点：

- 多语
- dense / sparse / multi-vector 思路成熟
- 更工程化

建议：作为 Qwen3 的对照线。

## 9.3 gte-Qwen2-7B-instruct

适合：资源充足时追求更强中文/英文检索。

缺点：更重，维护成本更高。

---

## 10. 评估 protocol

## 10.1 基础 A/B

对同一组问题跑：

1. 普通 KNN
2. `::TagMemo`
3. `::TagMemo+`

观察：

- 命中是否更准
- 是否引入旧记忆噪音
- 是否过度拉 tag
- topK 是否多样
- 结果是否更能解释用户真实意图

## 10.2 关键指标

建议记录：

- Top1 / Top3 / Top5 命中率
- matchedTags 长度
- coreTagsMatched 是否过强
- `L / R / S` 分布
- geodesic 重排前后排序变化
- 延迟
- 用户主观质量评分

## 10.3 影子模式

推荐：

- 旧模型继续服务
- 新模型只后台 shadow 检索
- 对比 topK 和 tag 分布
- 稳定后再切主 profile

---

## 11. 风险清单

### 11.1 旧向量污染

只删索引不够，因为 SQLite 中仍有旧向量。

### 11.2 EPA 旧 basis 污染

如果 `epa_basis_cache` 不带 fingerprint，新模型会被旧语义主轴解释。

### 11.3 MetaThinking 旧主题向量污染

`meta_chain_vector_cache.json` 不重建，会导致 Auto 模式选错思维链。

### 11.4 geodesic 过拉

`alpha` 太高或 `minGeoSamples` 太低，会让弱相关 tag 拖动排序。

### 11.5 core tag 绑架

`coreBoostRange` 太高时，用户指定标签可能压过真实语义。

### 11.6 万能 tag 问题

高频泛化 tag 可能在能量场里长期占优，需要靠：

- blacklist
- threshold
- deduplication
- minGeoSamples
- languageCompensator

共同压制。

---

## 12. 最小工程改造建议

### 12.1 新增 embedding fingerprint

统一函数：

```js
function getEmbeddingFingerprint({ model, dimension, apiUrl, version }) {
  return `${model}__${dimension}__${version || 'v1'}`;
}
```

### 12.2 `KnowledgeBaseManager`

- storePath 按 fingerprint 分目录
- 提供 `getEmbeddingFingerprint()`
- 初始化 EPA 时传 fingerprint

### 12.3 `EPAModule`

- cache key 改为 `epa_basis_cache::<fingerprint>`
- 缓存内容加入 fingerprint
- 加载时校验 fingerprint

### 12.4 `RAGDiaryPlugin`

- `vector_cache.json` 加 fingerprint
- `loadRagParams()` 支持 profiles

### 12.5 `MetaThinkingManager`

- `meta_chain_vector_cache.json` 加 fingerprint
- autoThreshold 从 profile 读取

---

## 13. 推荐后续文档

下一步可以继续补：

1. `rag_params.json` 多 profile 正式版
2. V8 回归测试题库
3. `::TagMemo` vs `::TagMemo+` 对照模板
4. `embeddingFingerprint` 代码补丁
5. 本地向量服务部署方案

---

## 14. 最后一段判断

浪潮 V8 的本质不是“更复杂的向量检索”。

它更像一套记忆物理学：

- EPA 看地势
- Residual Pyramid 看剩余能量
- TagMemo 起浪
- LIF-Router 让记忆沿拓扑传播
- Geodesic Rerank 贴地重排
- MetaThinkingManager 决定下一步怎么想

所以，任何向量模型替换，都不是简单换芯片，而是给整套系统换一块语义大陆。

真正优雅的做法是：

> 单独立档，单独建图，单独调参，影子对比，稳定后切主。
