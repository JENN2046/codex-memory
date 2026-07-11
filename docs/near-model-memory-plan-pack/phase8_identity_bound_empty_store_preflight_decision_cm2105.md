# CM-2105 Identity-bound Empty-store Preflight 自主决定

```yaml
emptyStorePreflightAuthorized: true
maxIdentityReadOperations: 1
maxDirectoryEnumerationOperations: 1
maxRecordContentReadOperations: 0
maxNativeReadCalls: 0
maxNativeWrites: 0
```

本决定只允许读取精确 store identity 并枚举一次目录结构，以证明 store 在首次 synthetic
record write 前为空。禁止读取 record 正文、调用 native memory、provider 或 fallback，
也不授权后续 `record_memory`。
