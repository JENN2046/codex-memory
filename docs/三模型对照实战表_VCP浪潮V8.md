# Qwen3-Embedding-4B / BGE-M3 / gte-Qwen2-7B-instruct 三模型对照实战表

## 1. 适用背景

这份表不是普通 embedding 模型排行。  
它专门站在 VCPToolBox 的实际结构里判断：

- `KnowledgeBaseManager`
- `TagMemoEngine`
- `EPAModule`
- `ResidualPyramid`
- `RAGDiaryPlugin`
- `MetaThinkingManager`

也就是说，判断标准不是单纯“榜单分数”，而是：

> 这个模型作为 VCP 浪潮 V8 的语义地形底座，是否稳、是否强、是否好迁移、是否适合长期本地部署。

---

## 2. 总结结论

| 结论场景 | 推荐模型 | 原因 |
|---|---|---|
| 最适合做本地主力试验线 | Qwen3-Embedding-4B | 上限高，32K，上至 2560 维，可自定义维度，支持 instruction-aware，适合长期深挖 |
| 最适合做稳健工程对照线 | BGE-M3 | 轻很多，1024 维，8192 tokens，支持 dense / sparse / multi-vector，知识库工程味最浓 |
| 最适合资源充足时压中文 / 英文效果 | gte-Qwen2-7B-instruct | 7B 级，3584 维，32K，中文和英文 benchmark 强，但部署成本最高 |
| 最不建议的做法 | 直接替换旧 Gemini 并复用旧缓存 | VCP 的 EPA / Residual / TagMemo / MetaThinking 都会被旧向量分布污染 |

---

## 3. 三模型核心规格对照

| 项目 | Qwen3-Embedding-4B | BGE-M3 | gte-Qwen2-7B-instruct |
|---|---:|---:|---:|
| 模型体量 | 4B | 约 569M | 7B 级 |
| 默认 / 最高维度 | 最高 2560，可自定义 32~2560 | 1024 dense vector | 3584 |
| 上下文长度 | 32K | 8192 | 32K |
| 多语言 | 100+ 语言 | 100+ 语言 | 多语言 |
| 本地部署难度 | 中高 | 低到中 | 高 |
| 长文档适配 | 很强 | 强 | 很强 |
| 中文潜力 | 很强 | 强 | 很强 |
| 代码 / 跨语种检索 | 强 | 中强 | 强 |
| 是否 instruction-aware | 是 | 常规 embedding 风格 | 是，query 侧 instruction tuning |
| 检索模式 | dense embedding | dense + sparse + multi-vector | dense embedding |
| 与 VCP 当前 3072 维默认的迁移摩擦 | 中 | 中 | 高 |
| 资源成本 | 中高 | 低 | 高 |
| 推荐角色 | 主力候选 | 稳健对照 / 低成本主力 | 高资源高质量候选 |

---

## 4. 站在 VCP 浪潮 V8 里的适配判断

### 4.1 Qwen3-Embedding-4B

#### 适合作为
**第一主试验线。**

#### 为什么
Qwen3-Embedding-4B 的优势不是“轻”，而是“适合长期做主力地形”：

- 维度最高 2560，并支持自定义输出维度
- 32K 上下文
- 支持 instruction-aware query
- 多语言和中文能力强
- 可用 vLLM / TEI / Sentence Transformers 等路线部署

#### 对 VCP 的好处
它适合承接：

- `EPAModule` 的语义主轴分析
- `ResidualPyramid` 的残差能量解释
- `TagMemoEngine` 的标签拓扑扩散
- `MetaThinkingManager` 的主题链自动选择

它的语义表达能力足够强，适合作为 VCP 的长期本地底座。

#### 主要风险
它不是轻量模型。  
如果你没有足够显存或本地推理服务吞吐不够，它会让全库重建和在线 embedding 慢下来。

#### 初始调参建议

```json
{
  "RAGDiaryPlugin": {
    "noise_penalty": 0.08,
    "tagWeightRange": [0.03, 0.22],
    "tagTruncationBase": 0.55,
    "tagTruncationRange": [0.45, 0.75],
    "mainSearchWeights": [0.78, 0.22],
    "refreshWeights": [0.58, 0.27, 0.15],
    "metaThinkingWeights": [0.86, 0.14]
  },
  "KnowledgeBaseManager": {
    "geodesicRerank": {
      "alpha": 0.18,
      "minGeoSamples": 5
    },
    "activationMultiplier": [0.5, 1.1],
    "dynamicBoostRange": [0.3, 1.25],
    "coreBoostRange": [1.15, 1.28],
    "deduplicationThreshold": 0.90,
    "techTagThreshold": 0.10,
    "normalTagThreshold": 0.02
  },
  "MetaThinkingManager": {
    "autoThreshold": 0.75
  }
}
```

#### 解释
迁移初期，Qwen3-Embedding-4B 本体很强，所以不要一开始让 TagMemo 和 Geodesic 起浪过猛。  
先让 KNN 主导，TagMemo 轻推，等 `L / R / S` 分布稳定后再放大。

---

### 4.2 BGE-M3

#### 适合作为
**稳健工程对照线，或低资源主力。**

#### 为什么
BGE-M3 的强项不是最高榜单分，而是工程味：

- 1024 维，迁移和存储成本低
- 8192 tokens
- 支持 dense / sparse / multi-vector
- 知识库场景成熟度高
- 本地部署压力明显小于 4B / 7B 级模型

#### 对 VCP 的好处
BGE-M3 很适合先做“稳定地形”：

- 重建速度更可控
- SQLite 向量体积更低
- Vexus / usearch 索引更轻
- 适合做旧 Gemini 的低风险替代试验

如果未来 VCP 想扩展 hybrid retrieval，BGE-M3 的 sparse / multi-vector 能力可以成为下一阶段升级方向。

#### 主要风险
VCP 当前的 `KnowledgeBaseManager` / `TagMemoEngine` 主体还是 dense embedding 逻辑。  
BGE-M3 的 sparse / multi-vector 能力如果不改系统结构，第一阶段只能先当 dense 模型使用。

#### 初始调参建议

```json
{
  "RAGDiaryPlugin": {
    "noise_penalty": 0.06,
    "tagWeightRange": [0.04, 0.30],
    "tagTruncationBase": 0.60,
    "tagTruncationRange": [0.50, 0.85],
    "mainSearchWeights": [0.74, 0.26],
    "refreshWeights": [0.55, 0.30, 0.15],
    "metaThinkingWeights": [0.84, 0.16]
  },
  "KnowledgeBaseManager": {
    "geodesicRerank": {
      "alpha": 0.24,
      "minGeoSamples": 4
    },
    "activationMultiplier": [0.5, 1.3],
    "dynamicBoostRange": [0.3, 1.6],
    "coreBoostRange": [1.18, 1.32],
    "deduplicationThreshold": 0.89,
    "techTagThreshold": 0.08,
    "normalTagThreshold": 0.018
  },
  "MetaThinkingManager": {
    "autoThreshold": 0.70
  }
}
```

#### 解释
BGE-M3 更轻、更工程化。  
它可以允许 TagMemo 比 Qwen3-Embedding-4B 稍微多参与一点，但仍然不建议一开始把 `alpha` 开太高。

---

### 4.3 gte-Qwen2-7B-instruct

#### 适合作为
**高资源、高质量、中文/英文强效果候选。**

#### 为什么
gte-Qwen2-7B-instruct 是很强的 embedding 模型：

- 7B 级
- 3584 维
- 32K max input tokens
- 中文 / 英文 benchmark 强
- query 侧 instruction tuning

#### 对 VCP 的好处
它适合用于：

- 对中文召回质量要求极高
- 资源不是核心限制
- 希望语义本体足够强，让 TagMemo 更像“辅助地形波”而不是“主拉力”

#### 主要风险
它对 VCP 的迁移摩擦最大：

- 3584 维不同于当前 3072
- SQLite 向量体积更大
- 索引更重
- EPA basis / ResidualPyramid / MetaThinking 全部要重新建图
- 本地部署成本高

#### 初始调参建议

```json
{
  "RAGDiaryPlugin": {
    "noise_penalty": 0.08,
    "tagWeightRange": [0.025, 0.20],
    "tagTruncationBase": 0.52,
    "tagTruncationRange": [0.42, 0.72],
    "mainSearchWeights": [0.82, 0.18],
    "refreshWeights": [0.62, 0.23, 0.15],
    "metaThinkingWeights": [0.88, 0.12]
  },
  "KnowledgeBaseManager": {
    "geodesicRerank": {
      "alpha": 0.14,
      "minGeoSamples": 6
    },
    "activationMultiplier": [0.5, 1.0],
    "dynamicBoostRange": [0.3, 1.15],
    "coreBoostRange": [1.10, 1.22],
    "deduplicationThreshold": 0.90,
    "techTagThreshold": 0.11,
    "normalTagThreshold": 0.025
  },
  "MetaThinkingManager": {
    "autoThreshold": 0.78
  }
}
```

#### 解释
gte-Qwen2-7B-instruct 本体语义强，且资源重。  
第一轮迁移时应该让它自己说话，先压住 TagMemo / Geodesic / MetaThinking 的递归牵引。

---

## 5. 三模型 VCP 适配评分

满分 5 分。  
这是工程判断，不是官方 benchmark。

| 维度 | Qwen3-Embedding-4B | BGE-M3 | gte-Qwen2-7B-instruct |
|---|---:|---:|---:|
| 本地部署现实性 | 3.5 | 5.0 | 2.5 |
| 中文 / 多语潜力 | 5.0 | 4.0 | 4.8 |
| 长文档适配 | 5.0 | 4.0 | 5.0 |
| VCP 浪潮适配潜力 | 4.8 | 4.2 | 4.3 |
| 迁移阻力 | 3.5 | 4.0 | 2.5 |
| 资源成本友好度 | 3.0 | 5.0 | 2.0 |
| 未来扩展性 | 4.8 | 4.5 | 3.8 |
| 推荐优先级 | 1 | 2 | 3 |

---

## 6. 实战推荐路线

### 路线 A：稳健工程路线

适合你想先迁出 Gemini，但不想被资源成本拖住。

1. 先上 BGE-M3
2. 建立多 profile / fingerprint / cache 隔离
3. 跑一轮回归测试
4. 再上 Qwen3-Embedding-4B 做强模型对照

推荐人群：

- 想先稳住系统
- 本地硬件一般
- 想把迁移工程做好

---

### 路线 B：主力上限路线

适合你想一步到位找长期主力。

1. 先上 Qwen3-Embedding-4B
2. 用保守 profile
3. 观察 `L / R / S`
4. 对比 `::TagMemo` 和 `::TagMemo+`
5. 再慢慢放大 `alpha` 和 `dynamicBoostRange`

推荐人群：

- 硬件资源够
- 中文 / 多语言 / 长文本都很重要
- 想让 VCP 的浪潮地形有更高上限

---

### 路线 C：高资源压榨路线

适合你愿意为质量付出高资源成本。

1. 上 gte-Qwen2-7B-instruct
2. 极保守开启 TagMemo
3. 先验证本体召回
4. 再逐步恢复 Geodesic
5. 最后才恢复 MetaThinking 递归牵引

推荐人群：

- 本地资源强
- 中文检索质量第一
- 对速度和体积不敏感

---

## 7. 我给你的最终建议

如果你现在要做一次真正负责任的选择，我建议：

### 第一阶段
同时准备两个 profile：

- `qwen3-embedding-4b__2560`
- `bge-m3__1024`

### 第二阶段
同一批问题做 A/B：

- 普通语义检索
- `::TagMemo`
- `::TagMemo+`
- MetaThinking auto 模式

### 第三阶段
如果 Qwen3-Embedding-4B 效果明显更好，且资源能接受，就定它为主力。  
如果 BGE-M3 效果接近，但速度和稳定性更好，就先定 BGE-M3 为主力。

### gte-Qwen2-7B-instruct 的位置
不要第一轮就上它当主线。  
它更适合做“高资源质量验证线”。

---

## 8. 针对 VCP 的回归测试清单

### 8.1 普通 RAG
- 中文短问
- 中文长问
- 技术问题
- 项目管理问题
- 多主题混合问题

### 8.2 TagMemo
对每个问题分别测：

- 无 TagMemo
- `::TagMemo`
- `::TagMemo+`

观察：

- 召回是否跑偏
- `matchedTags` 是否过长
- `coreTagsMatched` 是否过强
- 结果是否比普通 KNN 更贴近真实意图

### 8.3 EPA / Residual
记录：

- `L`
- `R`
- `S`
- `coverage`
- `novelty`
- `tagMemoActivation`

观察是否出现：

- `L` 普遍异常高
- `R` 到处共振
- `S` 总是偏大
- `coverage` 一直很低
- `tagMemoActivation` 总是满或总是空

### 8.4 MetaThinking
测试：

- auto 模式是否选错链
- 阶段递归是否把问题越带越偏
- 同一个问题在不同模型下是否走出完全不同的思维路径

---

## 9. 最后判断

如果只能选一个：

> Qwen3-Embedding-4B 是最值得优先试的本地主力候选。

如果要最稳：

> BGE-M3 是最适合先打底的工程候选。

如果要极限质量：

> gte-Qwen2-7B-instruct 是高资源验证线，不建议第一步当默认主线。

---

## 10. 来源参考

- Qwen3-Embedding-4B Hugging Face model card
- BGE-M3 Hugging Face model card
- BGE-M3 官方文档
- Alibaba-NLP/gte-Qwen2-7B-instruct Hugging Face model card
- VCPToolBox 源码审查记录：
  - `KnowledgeBaseManager.js`
  - `TagMemoEngine.js`
  - `EPAModule.js`
  - `ResidualPyramid.js`
  - `RAGDiaryPlugin.js`
  - `MetaThinkingManager.js`
  - `rag_params.json`
