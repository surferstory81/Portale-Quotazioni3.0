# Prompt Caching Implementation

**Feature**: AWS Bedrock Prompt Caching  
**Date**: 2026-05-04  
**Version**: 1.1.0

## Overview

Implemented **prompt caching** to reduce AI inference costs by ~90% on cached content. The knowledge base (~10K tokens) is now cached and reused across multiple requests.

---

## How It Works

### Cache Lifecycle

1. **First Request**: System prompt (with knowledge base) is sent to Bedrock
   - Cache is **created** automatically
   - Full input tokens charged (100% cost)
   - `cacheCreationInputTokens` tracked in usage

2. **Subsequent Requests** (within 5 minutes):
   - Same system prompt is **read from cache**
   - Cached tokens charged at **10% cost** (90% savings)
   - `cacheReadInputTokens` tracked in usage

3. **Cache Expiration**: After 5 minutes of inactivity
   - Next request creates new cache
   - Cycle repeats

### Cache Key

The cache is keyed by:
- System prompt content (exact string match)
- `cacheControl: { type: 'ephemeral' }` marker

**Important**: Changing even one character in the system prompt invalidates the cache.

---

## Implementation Details

### 1. BedrockService Changes

**New Interface Fields**:
```typescript
export interface BedrockRequest {
  systemCacheable?: boolean; // Enable caching for system prompt
  // ...
}

export interface BedrockResponse {
  usage: {
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
    // ...
  };
}
```

**System Prompt with Caching**:
```typescript
const system: SystemContentBlock[] = request.system
  ? [
      {
        text: request.system,
        ...(request.systemCacheable && { cacheControl: { type: 'ephemeral' } }),
      },
    ]
  : undefined;
```

### 2. Agent Changes

Both agents now enable caching:

**Estimation Agent**:
```typescript
const response = await this.bedrockService.invoke({
  system: systemPrompt, // Contains knowledge base (~10K tokens)
  systemCacheable: true, // Enable caching
  messages: [{ role: 'user', content: userMessage }],
  // ...
});
```

**Validation Agent**:
```typescript
const response = await this.bedrockService.invoke({
  system: systemPrompt, // Contains validation rules (~3K tokens)
  systemCacheable: true, // Enable caching
  messages: [{ role: 'user', content: userMessage }],
  // ...
});
```

### 3. Logging

Enhanced logs show cache activity:

```
Estimation generated in 2345ms (input: 1234, output: 5678) [CACHE HIT: 10234 tokens, ~90% cost savings]
```

Or on first request:
```
Estimation generated in 2567ms (input: 1234, output: 5678) [CACHE CREATED: 10234 tokens]
```

---

## Cost Impact

### Before Caching

| Request Type | Input Tokens | Cost (approx) |
|---|---|---|
| Estimation | ~12,000 | €0.036 |
| Validation | ~5,000 | €0.015 |
| **Total per quotation** | **17,000** | **€0.051** |

### After Caching (2nd+ requests within 5min)

| Request Type | Input Tokens | Cached Tokens | Cost (approx) |
|---|---|---|---|
| Estimation | ~2,000 | ~10,000 (90% off) | €0.009 |
| Validation | ~2,000 | ~3,000 (90% off) | €0.007 |
| **Total per quotation** | **4,000** | **13,000** | **€0.016** |

**Savings**: ~68% per quotation (after first request)

### Real-world Scenario

Batch processing 100 quotations:
- **Without caching**: 100 × €0.051 = **€5.10**
- **With caching**: €0.051 + (99 × €0.016) = **€1.63**
- **Total savings**: **€3.47 (68%)**

---

## Cache Behavior

### Cache Duration

- **Time-to-live**: 5 minutes of inactivity
- **Refresh**: Each cache hit extends TTL by 5 minutes
- **Maximum**: No hard limit, but typically expires after extended inactivity

### Cache Scope

- **Per-session**: Cache is specific to the request session
- **Not shared**: Different users/sessions have separate caches
- **Model-specific**: Cache is tied to the exact model ID

### Cache Invalidation

Cache is invalidated when:
- System prompt content changes
- 5 minutes pass without requests
- Different model ID is used
- Region changes

---

## Testing

### Manual Test

```bash
cd ai-estimation-service
node test-prompt-caching.js
```

Expected output:
```
📝 Request 1: Creating cache...
✅ Request 1 completed
   Cache created: 450 tokens

⏱️  Waiting 2 seconds...

📝 Request 2: Using cached system prompt...
✅ Request 2 completed
   Cache read: 450 tokens
   💰 Estimated savings: ~90% on cached portion
```

### Integration Test

1. Start AI service: `npm run start:dev`
2. Process 2 quotations within 5 minutes
3. Check logs:
   - First: `[CACHE CREATED: X tokens]`
   - Second: `[CACHE HIT: X tokens, ~90% cost savings]`

---

## Best Practices

### ✅ Do

- **Static content in system prompt**: Knowledge base, rules, schemas
- **Keep system prompt stable**: Don't change formatting unnecessarily
- **Batch processing**: Process multiple quotations in sequence
- **Monitor cache hits**: Track `cacheReadInputTokens` in logs

### ❌ Don't

- **Dynamic system prompts**: Don't include timestamps or request IDs
- **Frequent changes**: Avoid updating knowledge base during batch jobs
- **User-specific content in system**: Keep user data in messages only
- **Large message content**: Don't move cacheable content to messages

---

## Configuration

### Environment Variables

No new configuration needed. Caching is opt-in via `systemCacheable: true`.

### Disable Caching

To disable caching (e.g., for testing):

```typescript
const response = await this.bedrockService.invoke({
  system: systemPrompt,
  systemCacheable: false, // Disable caching
  // ...
});
```

---

## Monitoring

### Metrics to Track

1. **Cache Hit Rate**:
   ```
   (cacheReadInputTokens / totalInputTokens) * 100
   ```

2. **Cost Savings**:
   ```
   (cacheReadInputTokens * 0.9) / totalInputTokens * 100
   ```

3. **Cache Efficiency**:
   - First request: `CACHE CREATED`
   - Subsequent: `CACHE HIT`
   - Target: >80% cache hit rate in batch processing

### Log Analysis

Search logs for cache activity:
```bash
kubectl logs -n portale-quotazioni -l app=ai-estimation-service | grep "CACHE"
```

Expected patterns:
```
[CACHE CREATED: 10234 tokens]  ← First quotation
[CACHE HIT: 10234 tokens, ~90% cost savings]  ← Subsequent quotations
[CACHE HIT: 10234 tokens, ~90% cost savings]
...
```

---

## Troubleshooting

### Cache Not Created

**Symptoms**: No `cacheCreationInputTokens` in response

**Possible causes**:
- System prompt too small (<1024 tokens)
- `cacheControl` not set correctly
- Model doesn't support caching

**Solution**: Verify system prompt has `cacheControl: { type: 'ephemeral' }`

### Cache Not Hit

**Symptoms**: Every request shows `CACHE CREATED`, never `CACHE HIT`

**Possible causes**:
- System prompt changes between requests
- >5 minutes between requests
- Different model ID or region

**Solution**: Check system prompt is identical, process requests faster

### High Cache Miss Rate

**Symptoms**: <50% cache hit rate in batch processing

**Possible causes**:
- Knowledge base updates during processing
- Long delays between requests
- Dynamic content in system prompt

**Solution**: Freeze knowledge base during batch jobs, reduce request intervals

---

## Future Enhancements

- [ ] Track cache hit rate metrics in Prometheus
- [ ] Add cache statistics to health endpoint
- [ ] Implement cache warming on service startup
- [ ] Optimize system prompt for maximum cache efficiency

---

## References

- [AWS Bedrock Prompt Caching Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html)
- [Anthropic Prompt Caching Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)

---

**Implementation Status**: ✅ Complete  
**Cost Impact**: ~68% savings per quotation (after first)  
**Production Ready**: Yes
