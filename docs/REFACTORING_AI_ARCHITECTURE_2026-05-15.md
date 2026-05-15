# AI Architecture Refactoring - 2026-05-15

## Overview

Reorganized the AI estimation service to follow industry-standard agent architecture patterns (LangChain, CrewAI, AutoGen). The new structure provides clear separation between AI logic (prompts), orchestration (services), and domain knowledge.

## Motivation

### Problems with Old Structure

```
ai-estimation-service/
├── prompts/                           # ❌ Prompts separated from services
│   ├── estimation-agent-prompt.md
│   └── validation-agent-prompt.md
├── knowledge/                         # ❌ Flat structure, hard to navigate
│   ├── devops-pipeline-costs.md
│   ├── qa-quality-assurance-costs.md
│   ├── ...12 files...
│   └── software-licenses.md
└── src/
    └── agents/                        # ❌ Services without collocated docs
        ├── estimation-agent.service.ts
        └── validation-agent.service.ts
```

**Issues:**
- Prompt and service files physically separated (hard to maintain together)
- Knowledge base flat structure (12+ files without categorization)
- No agent-specific documentation
- Unclear which knowledge files relate to which agent concerns
- Adding new agent required touching multiple directories

### Solution: Collocated Agent Architecture

```
ai-estimation-service/
└── src/
    ├── agents/                        # ✅ Agents self-contained
    │   ├── estimation/
    │   │   ├── estimation.service.ts  # Orchestration
    │   │   ├── estimation.prompt.md   # AI instructions
    │   │   └── README.md              # Documentation
    │   └── validation/
    │       ├── validation.service.ts
    │       ├── validation.prompt.md
    │       └── README.md
    │
    └── knowledge/                     # ✅ Organized by category
        ├── costs/                     # 8 cost component files
        ├── rules/                     # 2 governance/pricing files
        └── mapping/                   # 1 field-to-cost mapping
```

**Benefits:**
- ✅ Agent = service + prompt + docs in one place
- ✅ Knowledge organized by concern (costs, rules, mapping)
- ✅ Clear ownership (each agent has README explaining purpose)
- ✅ Easy to add agents (create new folder, copy pattern)
- ✅ Follows industry standards (LangChain, CrewAI, AutoGen)

## Changes Made

### 1. Agent Reorganization

#### Before
```
src/agents/estimation-agent.service.ts
prompts/estimation-agent-prompt.md
(no documentation)
```

#### After
```
src/agents/estimation/
├── estimation.service.ts     # Service orchestrator
├── estimation.prompt.md       # AI instructions (was in prompts/)
└── README.md                  # Agent documentation (NEW)
```

**Each agent now contains:**
- **Service** (`.service.ts`): TypeScript orchestration, multi-turn conversation, error handling
- **Prompt** (`.prompt.md`): AI instructions, reasoning steps, output format
- **Documentation** (`README.md`): Purpose, workflow, usage, development guide

### 2. Knowledge Base Categorization

#### Before (Flat)
```
knowledge/
├── devops-pipeline-costs.md
├── qa-quality-assurance-costs.md
├── load-testing-costs.md
├── dynatrace-dashboard-costs.md
├── professional-services.md
├── professional-services-costs.md
├── infrastructure-costs.md
├── software-licenses.md
├── pricing-rules.md
├── project-classification-bands.md
├── field-to-cost-mapping.md
└── README.md
```

#### After (Categorized)
```
src/knowledge/
├── costs/                                    # Cost components (8 files)
│   ├── devops-pipeline-costs.md
│   ├── qa-quality-assurance-costs.md
│   ├── load-testing-costs.md
│   ├── dynatrace-dashboard-costs.md
│   ├── professional-services.md
│   ├── professional-services-costs.md
│   ├── infrastructure-costs.md
│   └── software-licenses.md
│
├── rules/                                    # Business rules (2 files)
│   ├── pricing-rules.md
│   └── project-classification-bands.md
│
├── mapping/                                  # Field mappings (1 file)
│   └── field-to-cost-mapping.md
│
└── README.md
```

**Benefits:**
- Clear categorization: costs, rules, mapping
- Easy to find relevant knowledge
- Scalable (add new categories as needed)
- Shared across all agents (single source of truth)

### 3. Knowledge Loader Refactoring

#### Before (Hardcoded File List)
```typescript
private async loadKnowledgeBase(): Promise<void> {
  const files = {
    infrastructureCosts: 'infrastructure-costs.md',
    softwareLicenses: 'software-licenses.md',
    professionalServices: 'professional-services.md',
    pricingRules: 'pricing-rules.md',
    validationThresholds: 'validation-thresholds.md',
  };
  // Load each file...
}
```

#### After (Structured Interface)
```typescript
export interface KnowledgeBase {
  costs: {
    devopsPipeline: string;
    qaInfrastructure: string;
    loadTesting: string;
    dynatraceMonitoring: string;
    professionalServices: string;
    professionalServicesCosts: string;
    infrastructure: string;
    softwareLicenses: string;
  };
  rules: {
    pricing: string;
    projectClassification: string;
  };
  mapping: {
    fieldToCost: string;
  };
}

// Backward compatibility method
getKnowledgeAsString(): string {
  return [
    '# COSTS',
    this.costs.devopsPipeline,
    // ... all costs
    '# RULES',
    this.rules.pricing,
    // ... all rules
    '# MAPPING',
    this.mapping.fieldToCost,
  ].join('\n\n');
}
```

**Benefits:**
- Type-safe knowledge access
- Clear structure visible in interface
- Backward compatible (getKnowledgeAsString())
- Auto-loads from organized directory structure

### 4. Documentation Added

#### Agent READMEs

**`src/agents/estimation/README.md`** (400+ lines)
- Purpose and process flow
- Supported models (Sonnet 4.5, Opus 4.7, Haiku 4.5)
- Output structure
- Performance metrics
- Development guide

**`src/agents/validation/README.md`** (350+ lines)
- Validation categories (completeness, accuracy, governance, mathematical)
- Decision logic (APPROVE, REVIEW, SENIOR_REVIEW, REJECT)
- Governance exemptions
- Development guide

#### Architecture Documentation

**`ai-estimation-service/ARCHITECTURE.md`** (800+ lines)
- Directory structure explanation
- Architecture patterns (prompt-based agents, shared knowledge)
- Agent service pattern
- Multi-model support
- Data flow diagrams
- Adding new agents guide
- Knowledge base update procedures

### 5. Multi-Model Support Enhanced

#### Test Script Created

**`scripts/test-multi-model-comparison.js`**
- Creates one quotation
- Generates 3 estimations (Sonnet 4.5, Opus 4.7, Haiku 4.5)
- Compares:
  - Total CAPEX/OPEX
  - Token usage
  - Cost (USD)
  - Latency (seconds)
  - Validation issues
- Provides recommendation based on variance

**Usage:**
```bash
ADMIN_EMAIL=admin@ca.it ADMIN_PASSWORD=pass node scripts/test-multi-model-comparison.js
```

**Output Example:**
```
                              Sonnet 4.5        Opus 4.7          Haiku 4.5
Total CAPEX                   €45,320           €46,100           €44,800
Total OPEX Year 1             €12,450           €12,680           €12,200
Cost (USD)                    $0.5234           $2.1456           $0.1823
Latency (seconds)             73s               91s               28s

ANALYSIS:
   CAPEX variance: €1,300 (2.9%)
   Opus 4.7 costs 4.1x more than Sonnet 4.5
   Haiku 4.5 is 2.6x faster than Sonnet 4.5

RECOMMENDATION:
   All models agree (< 5% variance) → Use Haiku 4.5 for speed
```

## File Movements

### Moved Files

| Old Path | New Path | Reason |
|----------|----------|--------|
| `prompts/estimation-agent-prompt.md` | `src/agents/estimation/estimation.prompt.md` | Collocate with service |
| `prompts/validation-agent-prompt.md` | `src/agents/validation/validation.prompt.md` | Collocate with service |
| `src/agents/estimation-agent.service.ts` | `src/agents/estimation/estimation.service.ts` | Group by agent |
| `src/agents/validation-agent.service.ts` | `src/agents/validation/validation.service.ts` | Group by agent |
| `knowledge/*.md` (12 files) | `src/knowledge/{costs,rules,mapping}/*.md` | Categorize by concern |

### New Files

| File | Purpose |
|------|---------|
| `src/agents/estimation/README.md` | Estimation agent documentation |
| `src/agents/validation/README.md` | Validation agent documentation |
| `ai-estimation-service/ARCHITECTURE.md` | Complete architecture guide |
| `scripts/test-multi-model-comparison.js` | Multi-model test script |
| `docs/REFACTORING_AI_ARCHITECTURE_2026-05-15.md` | This document |

### Updated Files

| File | Changes |
|------|---------|
| `src/agents/agents.module.ts` | Updated imports to new agent paths |
| `src/api/estimation.controller.ts` | Updated imports to new agent paths |
| `src/queue/backend-api.service.ts` | Updated imports to new agent paths |
| `src/knowledge/knowledge-loader.service.ts` | Complete rewrite with structured interface |
| `CHANGELOG.md` | Added [Unreleased] section with refactoring details |

## Code Changes

### Import Updates

**Before:**
```typescript
import { EstimationAgentService } from '../agents/estimation-agent.service';
import { ValidationAgentService } from '../agents/validation-agent.service';
```

**After:**
```typescript
import { EstimationAgentService } from '../agents/estimation/estimation.service';
import { ValidationAgentService } from '../agents/validation/validation.service';
```

### Prompt Loading

**Before:**
```typescript
const skillPath = path.join(__dirname, '../../prompts/estimation-agent-prompt.md');
```

**After:**
```typescript
const skillPath = path.join(__dirname, 'estimation.prompt.md');
```

**Benefit:** Relative path to collocated prompt (simpler, clearer)

### Knowledge Access

**Before (Unstructured):**
```typescript
const knowledgeBase = this.knowledgeLoader.getKnowledgeBase();
const systemPrompt = `${this.agentSkill}

### Infrastructure Costs
${knowledgeBase.infrastructureCosts}

### Software Licenses
${knowledgeBase.softwareLicenses}
...`;
```

**After (Structured + Backward Compatible):**
```typescript
const knowledgeBase = this.knowledgeLoader.getKnowledgeAsString();
const systemPrompt = `${this.agentSkill}

## Knowledge Base

${knowledgeBase}`;
```

**Benefit:** Simpler, knowledge loader handles formatting

## Testing

### Build Verification

All services build successfully:

```bash
# AI Estimation Service
cd ai-estimation-service && npm run build
# ✅ Build successful

# Backend
cd backend && npm run build
# ✅ Build successful

# Frontend
cd frontend && npm run build
# ✅ Build successful (1 warning on CSS bundle size, non-blocking)
```

### Runtime Testing

To test the new structure:

```bash
# 1. Start services
npm run start:dev  # In ai-estimation-service/

# 2. Test single model
curl -X POST http://localhost:3001/api/estimation/process \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"quotation_id": "test", "model_id": "claude-sonnet-4-5"}'

# 3. Test multi-model comparison
ADMIN_EMAIL=admin@ca.it ADMIN_PASSWORD=pass \
  node scripts/test-multi-model-comparison.js
```

## Migration Guide

If you're working on a branch with the old structure:

### 1. Update Imports

**Search & Replace:**
- `'../agents/estimation-agent.service'` → `'../agents/estimation/estimation.service'`
- `'../agents/validation-agent.service'` → `'../agents/validation/validation.service'`

### 2. Update Knowledge Loader Usage

**If you were using structured access:**
```typescript
// OLD (no longer works)
const infra = knowledgeLoader.getFile('infrastructureCosts');

// NEW
const kb = knowledgeLoader.getKnowledgeBase();
const infra = kb.costs.infrastructure;
```

**If you were concatenating knowledge:**
```typescript
// OLD
const knowledgeBase = this.knowledgeLoader.getKnowledgeBase();
const combined = Object.values(knowledgeBase).join('\n\n');

// NEW (simpler)
const combined = this.knowledgeLoader.getKnowledgeAsString();
```

### 3. Rebuild

```bash
npm run build
```

## Future Agents

Adding a new agent is now straightforward:

### Example: Correction Agent

```bash
# 1. Create agent directory
mkdir -p src/agents/correction

# 2. Create service (copy estimation.service.ts pattern)
cat > src/agents/correction/correction.service.ts << 'EOF'
import { Injectable, Logger } from '@nestjs/common';
import { BedrockService } from '../../bedrock/bedrock.service';
import { KnowledgeLoaderService } from '../../knowledge/knowledge-loader.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CorrectionAgentService {
  private readonly logger = new Logger(CorrectionAgentService.name);
  private readonly agentSkill: string;

  constructor(
    private readonly bedrockService: BedrockService,
    private readonly knowledgeLoader: KnowledgeLoaderService,
  ) {
    const skillPath = path.join(__dirname, 'correction.prompt.md');
    this.agentSkill = fs.readFileSync(skillPath, 'utf-8');
  }

  async proposeCorrections(estimation: any): Promise<any> {
    const knowledgeBase = this.knowledgeLoader.getKnowledgeAsString();
    const systemPrompt = `${this.agentSkill}\n\n## Knowledge Base\n\n${knowledgeBase}`;

    const response = await this.bedrockService.invoke({
      system: systemPrompt,
      messages: [{ role: 'user', content: JSON.stringify(estimation) }],
    });

    return this.parseResponse(response);
  }
}
EOF

# 3. Create prompt
cat > src/agents/correction/correction.prompt.md << 'EOF'
# Role: Correction Agent

You analyze AI estimations and propose corrections based on knowledge base rules.

## Process

### Step 1: Load Estimation
Review the estimation data provided.

### Step 2: Compare with Rules
Check each cost component against knowledge base rules.

### Step 3: Identify Discrepancies
Flag any values that don't match expected patterns.

### Step 4: Propose Corrections
Suggest specific changes with justification.

## Output Format

Return JSON:
{
  "corrections": [
    {
      "component": "DevOps Pipeline",
      "current_value": 0,
      "proposed_value": 7320,
      "justification": "Project has pipeline=5-15, should be MEDIO (€7,320)"
    }
  ]
}
EOF

# 4. Create README
cat > src/agents/correction/README.md << 'EOF'
# Correction Agent

## Purpose
Proposes corrections to AI estimations by comparing with knowledge base rules.

## Workflow
1. Receive estimation result
2. Compare each component with knowledge rules
3. Identify discrepancies
4. Propose corrections with justification
5. Wait for admin approval
EOF

# 5. Add to module
# Edit src/agents/agents.module.ts:
# - Add import: import { CorrectionAgentService } from './correction/correction.service';
# - Add to providers: [EstimationAgentService, ValidationAgentService, CorrectionAgentService]
# - Add to exports: [EstimationAgentService, ValidationAgentService, CorrectionAgentService]
```

## Benefits Achieved

### 1. Developer Experience

- ✅ **Easier navigation**: Agent = one folder with everything
- ✅ **Faster onboarding**: README explains each agent's purpose
- ✅ **Less context switching**: Service + prompt + docs together
- ✅ **Clear patterns**: Copy existing agent to create new one

### 2. Maintainability

- ✅ **Single source of truth**: Knowledge shared across agents
- ✅ **Version control**: Git tracks prompt changes with context
- ✅ **Hot-reload friendly**: Change prompt without recompiling
- ✅ **Testability**: Each agent tested in isolation

### 3. Scalability

- ✅ **Add agents easily**: Create folder, follow pattern
- ✅ **Knowledge grows**: Add files to categories
- ✅ **Documentation scales**: Each agent documents itself
- ✅ **Industry-aligned**: Follows LangChain/CrewAI/AutoGen patterns

### 4. Multi-Model Support

- ✅ **Model selection**: Pass `model_id` to any agent
- ✅ **Cost comparison**: Test script compares models
- ✅ **Performance metrics**: Track tokens, cost, latency per model
- ✅ **Flexibility**: Switch models based on accuracy/cost tradeoff

## Alignment with Industry Standards

This architecture follows patterns from leading AI agent frameworks:

### LangChain
- **Agent = Tool + Prompt + Memory**
- Our pattern: **Agent = Service + Prompt + Knowledge**

### CrewAI
- **Crew of specialized agents with shared knowledge**
- Our pattern: **Multiple agents (estimation, validation, correction) with shared knowledge base**

### AutoGen
- **Multi-agent conversation with tool use**
- Our pattern: **Multi-turn conversation, tool use support, agent chaining**

## Next Steps

### Immediate (Done)
- ✅ Reorganize agent structure
- ✅ Categorize knowledge base
- ✅ Add comprehensive documentation
- ✅ Create multi-model test script
- ✅ Update all imports and build verification

### Future Enhancements
1. **Correction Agent** (documented in `FEATURE_CORRECTION_AGENT.md`)
   - Auto-detect estimation discrepancies
   - Propose corrections for admin approval
   - Learn from admin corrections over time

2. **Optimization Agent**
   - Suggest cost-saving alternatives
   - Identify over-provisioning
   - Recommend architecture improvements

3. **Explanation Agent**
   - Generate natural language explanations of estimations
   - Answer "why" questions about costs
   - Create presentation slides for stakeholders

4. **Tool Use Integration**
   - Dynamic pricing lookups from external APIs
   - Real-time resource availability checks
   - Integration with CA internal pricing systems

## Related Documentation

- **`ai-estimation-service/ARCHITECTURE.md`**: Complete architecture guide
- **`src/agents/estimation/README.md`**: Estimation agent documentation
- **`src/agents/validation/README.md`**: Validation agent documentation
- **`docs/FEATURE_CORRECTION_AGENT.md`**: Future correction agent design
- **`CHANGELOG.md`**: Version history and changes

---

**Author**: Claude Code (AI Assistant)  
**Date**: 2026-05-15  
**Commit**: `refactor: reorganize AI agent architecture for clarity`  
**Branch**: `dev`
