# Migration: InvokeModel → Converse API

**Date**: 2026-05-04  
**Version**: 1.1.0

## Overview

Migrated from AWS Bedrock **InvokeModel** (first generation) to **Converse API** (second generation) for improved developer experience and future-proof architecture.

---

## Why Migrate?

| Reason | Benefit |
|---|---|
| **AWS Recommendation** | Converse is the recommended API for new projects |
| **Simpler Code** | No manual JSON encoding/decoding |
| **Native Tool Use** | Built-in support for function calling |
| **Multi-turn Ready** | Conversation state management included |
| **Cross-model** | Works with non-Claude models (future flexibility) |

---

## Changes Made

### 1. **bedrock.service.ts**

**Before (InvokeModel)**:
```typescript
import { InvokeModelCommand, InvokeModelCommandInput } from '@aws-sdk/client-bedrock-runtime';

const body = {
  anthropic_version: 'bedrock-2023-05-31',
  max_tokens: maxTokens,
  temperature,
  messages: request.messages,
};

const input: InvokeModelCommandInput = {
  modelId: this.modelId,
  body: JSON.stringify(body),
};

const command = new InvokeModelCommand(input);
const response = await this.client.send(command);
const responseBody = JSON.parse(new TextDecoder().decode(response.body));
```

**After (Converse)**:
```typescript
import { ConverseCommand, ConverseCommandInput } from '@aws-sdk/client-bedrock-runtime';

const messages: Message[] = request.messages.map(msg => ({
  role: msg.role,
  content: [{ text: msg.content }],
}));

const input: ConverseCommandInput = {
  modelId: this.modelId,
  messages,
  inferenceConfig: { maxTokens, temperature, topP },
};

const command = new ConverseCommand(input);
const response = await this.client.send(command);
// response.output.message.content already parsed!
```

**Key differences**:
- ✅ No manual JSON.stringify/parse
- ✅ Content is array of blocks (supports mixed text/images)
- ✅ `inferenceConfig` instead of root-level params
- ✅ Added `topP` parameter support (default 0.999)

### 2. **Response Handling**

Added helper method to extract text from ContentBlock[]:

```typescript
private extractTextContent(content: ContentBlock[] | undefined): string {
  if (!content || content.length === 0) return '';
  
  return content
    .filter(block => block.text !== undefined)
    .map(block => block.text)
    .join('\n');
}
```

This handles multi-block responses (e.g., when using tool use in the future).

### 3. **Test Scripts**

Updated all test files:
- `test-bedrock.js` - EU region with Converse
- `test-bedrock-us.js` - US region with Converse

### 4. **Documentation**

Updated:
- `README.md` - Added Converse API note
- `CLAUDE.md` - Updated API references
- Roadmap - Marked migration complete

---

## Backward Compatibility

✅ **No breaking changes** for the rest of the application.

The `BedrockService.invoke()` signature remains identical:
```typescript
async invoke(request: BedrockRequest): Promise<BedrockResponse>
```

Agents (`estimation-agent.service.ts`, `validation-agent.service.ts`) work without modification.

---

## Testing

### Manual Test

```bash
cd ai-estimation-service
node test-bedrock.js
```

Expected output:
```
Testing AWS Bedrock Converse API...
Region: eu-central-1
Model: eu.anthropic.claude-sonnet-4-5-20250929-v1:0

✅ SUCCESS!
Stop reason: end_turn
Usage: { inputTokens: X, outputTokens: Y }
Response: Hello
```

### Integration Test

1. Start AI service: `npm run start:dev`
2. Trigger estimation via backend retry endpoint
3. Check logs for: `Bedrock Converse request successful`

---

## IAM Permissions

**No changes required**. Still needs:
```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "arn:aws:bedrock:*::foundation-model/*"
}
```

---

## Future Enhancements (Now Possible)

### 1. Tool Use (Function Calling)

```typescript
const input: ConverseCommandInput = {
  modelId: this.modelId,
  messages,
  toolConfig: {
    tools: [{
      toolSpec: {
        name: 'get_aws_pricing',
        description: 'Fetch current AWS pricing',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              region: { type: 'string' },
              instanceType: { type: 'string' },
            },
          },
        },
      },
    }],
  },
};
```

### 2. Multi-turn Conversations

```typescript
// Turn 1: Ask user for clarification
const response1 = await converseCommand1;
messages.push({ role: 'assistant', content: response1.output.message.content });
messages.push({ role: 'user', content: [{ text: userAnswer }] });

// Turn 2: Continue with user's answer
const response2 = await converseCommand2;
```

### 3. Streaming (ConverseStream)

For real-time estimation display:
```typescript
import { ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

const command = new ConverseStreamCommand(input);
const response = await this.client.send(command);

for await (const chunk of response.stream) {
  // Send chunk to frontend via WebSocket
}
```

---

## Rollback (if needed)

If issues arise, revert to InvokeModel:

```bash
git revert <commit-hash>
npm install
npm run build
```

---

## Performance Impact

**None expected**. Both APIs use the same underlying model invocation.

Latency remains: ~2-5 seconds per estimation (depending on complexity).

---

## Next Steps

- [ ] Monitor production logs for any Converse-specific errors
- [ ] Consider implementing prompt caching (available in both APIs)
- [ ] Evaluate tool use for live pricing API integration
- [ ] Plan multi-turn conversation feature (roadmap v2.0)

---

**Migration completed successfully** ✅
