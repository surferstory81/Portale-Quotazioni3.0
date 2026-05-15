# AI Estimation Service - Architecture

## Overview

This service provides AI-powered cost estimation for IT infrastructure projects using AWS Bedrock (Claude AI). It consists of **agents** (prompt-based AI), **knowledge** (domain expertise), and **services** (orchestration).

## Directory Structure

```
ai-estimation-service/
├── src/
│   ├── agents/                    # 🤖 AI Agent Implementations
│   │   ├── estimation/
│   │   │   ├── estimation.service.ts    # Service orchestrator
│   │   │   ├── estimation.prompt.md     # AI instructions
│   │   │   └── README.md                # Agent documentation
│   │   │
│   │   ├── validation/
│   │   │   ├── validation.service.ts
│   │   │   ├── validation.prompt.md
│   │   │   └── README.md
│   │   │
│   │   └── agents.module.ts       # NestJS module
│   │
│   ├── knowledge/                 # 📚 Domain Knowledge (Shared)
│   │   ├── costs/                 # Cost component knowledge
│   │   │   ├── devops-pipeline-costs.md
│   │   │   ├── qa-quality-assurance-costs.md
│   │   │   ├── load-testing-costs.md
│   │   │   ├── dynatrace-dashboard-costs.md
│   │   │   ├── professional-services.md
│   │   │   ├── professional-services-costs.md
│   │   │   ├── infrastructure-costs.md
│   │   │   └── software-licenses.md
│   │   │
│   │   ├── rules/                 # Business rules and governance
│   │   │   ├── pricing-rules.md
│   │   │   └── project-classification-bands.md
│   │   │
│   │   ├── mapping/               # Form field → cost mapping
│   │   │   └── field-to-cost-mapping.md
│   │   │
│   │   ├── knowledge-loader.service.ts
│   │   ├── knowledge-loader.module.ts
│   │   └── README.md
│   │
│   ├── tools/                     # 🔧 Tool Use (for future use)
│   │   ├── pricing-tools.service.ts
│   │   └── tools.module.ts
│   │
│   ├── bedrock/                   # ☁️ AWS Bedrock Integration
│   │   ├── bedrock.service.ts
│   │   └── bedrock.module.ts
│   │
│   ├── api/                       # 🌐 REST API Controllers
│   │   ├── estimation.controller.ts
│   │   ├── export.service.ts
│   │   └── quotation-data-transformer.ts
│   │
│   ├── config/                    # ⚙️ Configuration
│   │   ├── models.config.ts       # AI model definitions
│   │   └── configuration.ts
│   │
│   └── ...
│
├── logs/                          # 📝 Application logs
├── docs/                          # 📖 Documentation
└── package.json
```

## Architecture Patterns

### 1. Prompt-Based Agents

Each agent is defined by:
- **Prompt file** (`.prompt.md`): AI instructions, reasoning steps, output format
- **Service file** (`.service.ts`): Orchestration, multi-turn conversation, error handling
- **README** (`.md`): Documentation, usage, development guide

**Why this pattern?**
- ✅ **Separation of concerns**: AI logic (prompt) separate from orchestration (TypeScript)
- ✅ **Version control**: Git tracks prompt changes like code
- ✅ **Hot-reload**: Change prompt without recompiling TypeScript
- ✅ **Testability**: Test prompts in isolation

### 2. Shared Knowledge Base

Knowledge files are **shared** across all agents to avoid duplication:

```
estimation agent ─┐
                  ├─> knowledge/costs/devops-pipeline-costs.md
validation agent ─┘

correction agent (future) ─> knowledge/rules/pricing-rules.md
```

**Why shared?**
- ✅ **Single source of truth**: Update pricing once, all agents see it
- ✅ **Consistency**: All agents work with same data
- ✅ **Maintainability**: No duplicate files to keep in sync

### 3. Agent Service Pattern

```typescript
@Injectable()
export class EstimationAgentService {
  private readonly agentSkill: string; // Loaded from .prompt.md

  constructor(
    private bedrockService: BedrockService,
    private knowledgeLoader: KnowledgeLoaderService
  ) {
    // Load prompt from file
    this.agentSkill = fs.readFileSync(__dirname + '/estimation.prompt.md');
  }

  async generateEstimation(quotationData) {
    // 1. Load knowledge
    const knowledge = this.knowledgeLoader.getKnowledgeAsString();

    // 2. Build system prompt = agent skill + knowledge
    const systemPrompt = `${this.agentSkill}\n\n## Knowledge Base\n\n${knowledge}`;

    // 3. Multi-turn conversation with AI
    const response = await this.bedrockService.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: JSON.stringify(quotationData) }],
      tools: availableTools, // Optional tool use
    });

    // 4. Parse and return
    return this.parseResponse(response);
  }
}
```

### 4. Multi-Model Support

The service supports multiple Claude models:

| Model | Use Case | Cost | Latency |
|-------|----------|------|---------|
| **Claude Sonnet 4.5** | Default, balanced cost/performance | $3/MTok in, $15/MTok out | ~75s |
| **Claude Opus 4.7** | Maximum accuracy | $15/MTok in, $75/MTok out | ~90s |
| **Claude Haiku 4.5** | Fast, budget estimations | $0.25/MTok in, $1.25/MTok out | ~30s |

Model selection:
```typescript
// Default (Sonnet 4.5)
await estimationAgent.generateEstimation(quotation);

// Specific model
await estimationAgent.generateEstimation(quotation, 'claude-opus-4-7');
await estimationAgent.generateEstimation(quotation, 'claude-haiku-4-5');
```

## Data Flow

```
Backend Service
    │
    ├─ POST /api/estimation/process
    │
    ↓
EstimationController
    │
    ├─ Transform quotation data
    │
    ↓
EstimationAgentService
    │
    ├─ Load knowledge base
    ├─ Build system prompt (skill + knowledge)
    ├─ Multi-turn conversation with AWS Bedrock
    │
    ↓
BedrockService (AWS SDK)
    │
    ├─ Call Claude AI via Converse API
    ├─ Handle tool use (future)
    │
    ↓
EstimationAgentService
    │
    ├─ Parse JSON response
    ├─ Calculate token cost
    │
    ↓
ValidationAgentService
    │
    ├─ Validate estimation result
    ├─ Check governance rules
    ├─ Flag issues
    │
    ↓
BackendApiService
    │
    ├─ Send result to backend
    │
    ↓
Backend Database (PostgreSQL)
```

## Agent Workflow

### Estimation Agent (8-Step Process)

1. **Analyze Form Data**: Extract key dimensions (duration, microservices, etc.)
2. **Classify Project**: LIGHT/MEDIO/COMPLESSO/SPECIALE
3. **Calculate CAPEX**: DevOps, QA, Load Testing, Professional Services
4. **Calculate Infrastructure OPEX**: OpenShift, VM, Storage, Dynatrace
5. **Calculate License OPEX**: Software licenses
6. **Calculate Services OPEX**: Infrastructure management, support
7. **Prorate for Project Duration**: Adjust Year 1 for < 12 month projects
8. **Multi-Year Projection**: Year 2-5 with depreciation (on-premise) or inflation (cloud)

### Validation Agent (4 Categories)

1. **Completeness**: All required costs present, no unexpected €0 values
2. **Accuracy**: Costs within expected ranges, ratios reasonable
3. **Governance**: QA budget compliance, classification matches cost
4. **Mathematical**: Line items sum correctly, projections consistent

## Adding New Agents

Example: Adding a "Correction Agent"

```bash
# 1. Create agent directory
mkdir -p src/agents/correction

# 2. Create files
touch src/agents/correction/correction.service.ts
touch src/agents/correction/correction.prompt.md
touch src/agents/correction/README.md

# 3. Implement service (follow EstimationAgentService pattern)

# 4. Write prompt (define agent role, process, output format)

# 5. Add to agents.module.ts
# imports: [...]
# providers: [..., CorrectionAgentService]
# exports: [..., CorrectionAgentService]

# 6. Use in controller
# constructor(private correctionAgent: CorrectionAgentService) {}
```

## Knowledge Base Updates

### Adding new cost component

```bash
# 1. Create knowledge file
echo "# New Component Costs" > src/knowledge/costs/new-component-costs.md

# 2. Document cost calculation
# Include:
# - Decision trees (IF condition THEN cost)
# - Pricing tables
# - Examples

# 3. Update knowledge-loader.service.ts
# Add to files.costs: { newComponent: 'costs/new-component-costs.md' }

# 4. Restart service (auto-loaded on init)
```

### Updating existing knowledge

```bash
# 1. Edit markdown file directly
vim src/knowledge/costs/devops-pipeline-costs.md

# 2. Commit changes (Git tracks history)
git add src/knowledge/costs/devops-pipeline-costs.md
git commit -m "Update DevOps pipeline pricing for 2026"

# 3. Reload service (hot-reload in dev, restart in prod)
curl -X POST http://localhost:3001/api/knowledge/reload
```

## Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:e2e
```

### Manual Testing (with specific model)
```bash
# Start service
npm run start:dev

# Test Sonnet 4.5 (default)
curl -X POST http://localhost:3001/api/estimation/process \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"quotation_id": "test", "model_id": "claude-sonnet-4-5"}'

# Test Opus 4.7 (higher accuracy)
curl -X POST http://localhost:3001/api/estimation/process \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"quotation_id": "test", "model_id": "claude-opus-4-7"}'

# Test Haiku 4.5 (faster, cheaper)
curl -X POST http://localhost:3001/api/estimation/process \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"quotation_id": "test", "model_id": "claude-haiku-4-5"}'
```

## Performance Optimization

### Prompt Caching (AWS Bedrock)

Knowledge base is marked as **cacheable** to reduce costs:

```typescript
await bedrockService.invoke({
  system: systemPrompt,
  systemCacheable: true, // ← Cache this for 5 minutes
  messages: [...]
});
```

**Savings:**
- First call: ~150k input tokens = $0.45
- Cached calls: ~150k cached tokens = $0.04 (90% reduction)
- Validation agent benefits most (same knowledge, different estimations)

### Multi-Turn Optimization

Estimation agent supports tool use for dynamic pricing lookups (future feature):

```typescript
while (turnCount < maxTurns) {
  const response = await bedrock.invoke({ tools: availableTools });

  if (response.stopReason === 'tool_use') {
    // Execute tool, add result to conversation
    const toolResult = await executeTool(response.toolUse);
    messages.push({ role: 'user', content: toolResult });
    continue; // Next turn
  }

  // Final answer received
  break;
}
```

## Monitoring

### Logs
```bash
# Application logs
tail -f logs/app-2026-05-15.log

# Full estimation JSON logged for debugging
grep "ESTIMATION DATA" logs/app-2026-05-15.log

# Validation results
grep "VALIDATION DATA" logs/app-2026-05-15.log
```

### Metrics
- Token usage per estimation (input/output)
- Cost per estimation (USD)
- Latency (ms)
- Prompt cache hit rate (%)

## Related Documentation

- **Frontend UI**: `../frontend/README.md`
- **Backend Service**: `../backend/README.md`
- **Knowledge Base**: `src/knowledge/README.md`
- **Estimation Agent**: `src/agents/estimation/README.md`
- **Validation Agent**: `src/agents/validation/README.md`

---

**Last Updated**: 2026-05-15  
**Version**: 1.1.4
