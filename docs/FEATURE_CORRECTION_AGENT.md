# Feature: AI Correction Agent

**Date:** 2026-05-15  
**Version:** 1.2.0 (planned)  
**Priority:** HIGH  
**Status:** 📋 Design Complete - Ready for Implementation

---

## 🎯 Objective

Implement an **automatic correction agent** that:
1. Runs after every AI estimation + validation
2. Compares estimation with knowledge base rules
3. Identifies discrepancies and proposes corrections
4. Waits for admin approval before applying changes

---

## 🏗️ Architecture Overview

### Workflow

```
User Submits Quotation
         ↓
  Estimation Agent (60s)
         ↓
  Validation Agent (60s)
         ↓
  Correction Agent (30s) ← NEW
         ↓
   Admin Dashboard
         ↓
   Approve/Reject Corrections
         ↓
   Apply Corrections → Updated Estimation
```

### Components

1. **correction-agent.service.ts** - Core correction logic
2. **correction-rules.json** - Mathematical/formula rules
3. **correction-agent-prompt.md** - AI reasoning prompt
4. **correction_proposals** table - Database storage
5. **Admin UI** - Approval interface

---

## 📋 Knowledge Base Strategy: Hybrid Approach

### Why Hybrid?

**AI-Powered (existing .md files):**
- ✅ Flexible, handles complex logic
- ✅ Understands context and nuances
- ✅ No code changes needed for knowledge updates
- ❌ Slower, requires LLM call
- ❌ Less predictable

**Rule-Based (new correction-rules.json):**
- ✅ Fast, instant validation
- ✅ 100% deterministic
- ✅ Easy to test
- ❌ Requires manual rule definition
- ❌ Limited to mathematical checks

**Solution: Use both!**
- Rule-based for **mathematical formulas** (exact calculations)
- AI-powered for **logical reasoning** (missing components, inconsistencies)

---

## 📐 File Structure

```
ai-estimation-service/
├── src/
│   ├── agents/
│   │   ├── estimation-agent.service.ts (existing)
│   │   ├── validation-agent.service.ts (existing)
│   │   └── correction-agent.service.ts (NEW)
│   ├── correction/
│   │   ├── correction.module.ts
│   │   ├── correction.service.ts
│   │   ├── rule-engine.service.ts
│   │   └── correction-rules.json
│   └── prompts/
│       └── correction-agent-prompt.md (NEW)

backend/
├── src/
│   ├── entities/
│   │   └── correction-proposal.entity.ts (NEW)
│   ├── modules/
│   │   └── corrections/
│   │       ├── corrections.module.ts
│   │       ├── corrections.controller.ts
│   │       └── corrections.service.ts

frontend/
└── src/app/features/admin/
    └── components/
        └── correction-approval/
            ├── correction-approval.component.ts
            ├── correction-approval.component.html
            └── correction-approval.component.scss
```

---

## 💾 Database Schema

### New Table: `correction_proposals`

```sql
CREATE TABLE correction_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  estimation_id UUID NOT NULL REFERENCES ai_estimations(id) ON DELETE CASCADE,
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  
  -- Correction data
  corrections JSONB NOT NULL, -- Array of correction objects
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  
  -- Metadata
  rule_corrections INTEGER DEFAULT 0, -- Count of rule-based corrections
  ai_corrections INTEGER DEFAULT 0,   -- Count of AI-powered corrections
  
  -- Status workflow
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
    -- PENDING_APPROVAL, APPROVED, REJECTED, APPLIED
  
  -- Audit trail
  proposed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  applied_at TIMESTAMP,
  
  -- Indexes
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_correction_proposals_estimation ON correction_proposals(estimation_id);
CREATE INDEX idx_correction_proposals_status ON correction_proposals(status);
CREATE INDEX idx_correction_proposals_quotation ON correction_proposals(quotation_id);

-- Trigger for updated_at
CREATE TRIGGER update_correction_proposals_updated_at
  BEFORE UPDATE ON correction_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 📝 Correction Rules Format

### File: `correction-rules.json`

```json
{
  "version": "1.0.0",
  "rules": [
    {
      "id": "pipeline_semplice_cost",
      "name": "Pipeline SEMPLICE Cost",
      "condition": {
        "field": "formData.pipeline",
        "operator": "===",
        "value": "< 5"
      },
      "check": {
        "field": "estimationData.capex.devops_pipeline",
        "expected": 0,
        "tolerance": 0
      },
      "correction": {
        "field": "capex.devops_pipeline",
        "value": 0,
        "reason": "Pipeline < 5 classified as SEMPLICE requires €0 CAPEX (no new pipeline infrastructure)"
      },
      "metadata": {
        "source": "devops-pipeline-costs.md",
        "source_line": 32,
        "severity": "HIGH",
        "category": "MISSING_COST"
      }
    },
    {
      "id": "pipeline_medio_cost",
      "name": "Pipeline MEDIO Cost",
      "condition": {
        "field": "formData.pipeline",
        "operator": "===",
        "value": "5-15"
      },
      "check": {
        "field": "estimationData.capex.devops_pipeline",
        "expected": 7320,
        "tolerance": 0
      },
      "correction": {
        "field": "capex.devops_pipeline",
        "value": 7320,
        "reason": "Pipeline '5-15' classified as MEDIO requires €7,320 CAPEX"
      },
      "metadata": {
        "source": "devops-pipeline-costs.md",
        "source_line": 45,
        "severity": "HIGH",
        "category": "MISSING_COST"
      }
    },
    {
      "id": "pipeline_complesso_cost",
      "name": "Pipeline COMPLESSO Cost",
      "condition": {
        "field": "formData.pipeline",
        "operator": "===",
        "value": "15-40"
      },
      "check": {
        "field": "estimationData.capex.devops_pipeline",
        "expected": 12200,
        "tolerance": 0
      },
      "correction": {
        "field": "capex.devops_pipeline",
        "value": 12200,
        "reason": "Pipeline '15-40' classified as COMPLESSO requires €12,200 CAPEX"
      },
      "metadata": {
        "source": "devops-pipeline-costs.md",
        "source_line": 58,
        "severity": "HIGH",
        "category": "MISSING_COST"
      }
    },
    {
      "id": "pods_cost_formula",
      "name": "OpenShift Pods Cost Calculation",
      "condition": {
        "field": "formData.infraMicroservices",
        "operator": "===",
        "value": true
      },
      "check": {
        "field": "estimationData.opex.container_orchestration",
        "expected_formula": "formData.microservicesCount * 7 * 210.72",
        "tolerance": 100
      },
      "correction": {
        "field": "opex.container_orchestration",
        "formula": "formData.microservicesCount * 7 * 210.72",
        "reason": "OpenShift pods cost: {microservicesCount} × 7 pods × €210.72/pod"
      },
      "metadata": {
        "source": "field-to-cost-mapping.md",
        "source_section": "Section 1: Microservices Architecture",
        "severity": "HIGH",
        "category": "FORMULA_ERROR"
      }
    },
    {
      "id": "qa_complesso_cost",
      "name": "QA COMPLESSO Cost",
      "condition": {
        "field": "formData.qa",
        "operator": "===",
        "value": "YES"
      },
      "additional_conditions": [
        {
          "field": "estimationData.summary.project_classification",
          "operator": "IN",
          "value": ["COMPLESSO", "SPECIALE"]
        }
      ],
      "check": {
        "field": "estimationData.capex.qa_services",
        "expected": 27450,
        "tolerance": 0
      },
      "correction": {
        "field": "capex.qa_services",
        "value": 27450,
        "reason": "QA for COMPLESSO/SPECIALE projects: 50 days × €450 × 1.22 = €27,450"
      },
      "metadata": {
        "source": "qa-quality-assurance-costs.md",
        "source_line": 87,
        "severity": "HIGH",
        "category": "MISSING_COST"
      }
    }
  ]
}
```

---

## 🤖 AI Correction Prompt

### File: `correction-agent-prompt.md`

```markdown
# AI Correction Agent - Cost Estimation Corrector

You are an expert correction agent responsible for identifying and proposing fixes to AI-generated cost estimations.

## Your Mission

Analyze the estimation and validation results to identify:
1. **Missing costs**: Required components not included
2. **Incorrect calculations**: Formulas applied wrongly
3. **Logical inconsistencies**: Contradictions in reasoning
4. **Knowledge base violations**: Rules not followed

## Input Data

You will receive:
- **Form Data**: Original quotation form fields
- **Estimation Data**: AI-generated cost estimation
- **Validation Issues**: Problems identified by validation agent
- **Knowledge Base**: Relevant sections from knowledge files

## Correction Categories

### 1. MISSING_COST
Component required by form data but not included in estimation.

Example:
- Form: `pipeline = "5-15"`
- Estimation: `capex.devops_pipeline = 0`
- Correction: Should be €7,320 (MEDIO level)

### 2. FORMULA_ERROR
Calculation doesn't match expected formula.

Example:
- Form: `microservicesCount = 5`
- Estimation: `opex.container_orchestration = €5,200`
- Expected: `5 × 7 × €210.72 = €7,375`

### 3. LOGICAL_INCONSISTENCY
Contradictory assumptions or reasoning.

Example:
- Estimation says: "No new infrastructure needed"
- But form has: `needNewInfrastructure = true`

### 4. CLASSIFICATION_MISMATCH
Project classified incorrectly based on criteria.

Example:
- Technical criteria suggest MEDIUM
- But classified as LIGHT
- Costs don't align with classification

## Output Format

```json
{
  "corrections": [
    {
      "type": "MISSING_COST",
      "field": "capex.devops_pipeline",
      "current_value": 0,
      "proposed_value": 7320,
      "reason": "Pipeline '5-15' classified as MEDIO requires €7,320 CAPEX per devops-pipeline-costs.md line 45",
      "source": "devops-pipeline-costs.md",
      "confidence": 100,
      "severity": "HIGH"
    }
  ],
  "summary": {
    "total_corrections": 1,
    "capex_delta": 7320,
    "opex_delta": 0,
    "confidence": 95
  }
}
```

## Critical Rules

1. **Only propose corrections backed by knowledge base**
   - Always cite source file and line/section
   - Don't guess or assume

2. **Confidence scoring**
   - 100%: Rule-based (exact formula match)
   - 80-99%: Strong knowledge base reference
   - 50-79%: Logical inference
   - < 50%: Don't propose (too uncertain)

3. **Severity levels**
   - HIGH: Significantly impacts cost (>10% of total)
   - MEDIUM: Moderate impact (5-10%)
   - LOW: Minor adjustment (<5%)

4. **Respect exemptions**
   - If `qa = "NO"`, don't flag missing QA costs
   - If `observability = "Existing"`, don't flag missing dashboard costs

## Examples

[Include 5-10 detailed examples of corrections]
```

---

## 🔧 Implementation Files

### 1. `correction-agent.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { BedrockService } from '../bedrock/bedrock.service';
import { KnowledgeLoaderService } from '../knowledge/knowledge-loader.service';
import { RuleEngineService } from '../correction/rule-engine.service';

export interface CorrectionProposal {
  estimation_id: string;
  corrections: Correction[];
  confidence: number;
  summary: {
    total_corrections: number;
    rule_based: number;
    ai_powered: number;
    capex_delta: number;
    opex_delta: number;
  };
}

export interface Correction {
  type: 'MISSING_COST' | 'FORMULA_ERROR' | 'LOGICAL_INCONSISTENCY' | 'CLASSIFICATION_MISMATCH';
  field: string;
  current_value: any;
  proposed_value: any;
  reason: string;
  source: string;
  confidence: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  formula?: string;
}

@Injectable()
export class CorrectionAgentService {
  private readonly logger = new Logger(CorrectionAgentService.name);

  constructor(
    private readonly bedrock: BedrockService,
    private readonly knowledge: KnowledgeLoaderService,
    private readonly ruleEngine: RuleEngineService,
  ) {}

  async proposeCorrections(
    estimationId: string,
    estimationData: any,
    validationData: any,
    formData: any,
  ): Promise<CorrectionProposal> {
    this.logger.log(`Proposing corrections for estimation ${estimationId}`);

    // Step 1: Rule-based corrections (fast, deterministic)
    const ruleCorrections = await this.ruleEngine.evaluateRules(
      formData,
      estimationData,
    );

    this.logger.log(`Rule-based corrections: ${ruleCorrections.length}`);

    // Step 2: AI-powered corrections (slow, reasoning)
    const aiCorrections = await this.aiReasoningCorrections(
      estimationData,
      validationData,
      formData,
    );

    this.logger.log(`AI-powered corrections: ${aiCorrections.length}`);

    // Step 3: Merge and deduplicate
    const allCorrections = this.mergeCorrections(ruleCorrections, aiCorrections);

    // Step 4: Calculate deltas
    const summary = this.calculateSummary(allCorrections);

    return {
      estimation_id: estimationId,
      corrections: allCorrections,
      confidence: this.calculateOverallConfidence(allCorrections),
      summary,
    };
  }

  private async aiReasoningCorrections(
    estimationData: any,
    validationData: any,
    formData: any,
  ): Promise<Correction[]> {
    // Load correction prompt
    const prompt = await this.knowledge.loadPrompt('correction-agent-prompt.md');

    // Prepare context
    const context = {
      form_data: formData,
      estimation_data: estimationData,
      validation_issues: validationData.issues,
      knowledge_base: await this.knowledge.getRelevantSections(formData),
    };

    // Call Bedrock
    const response = await this.bedrock.converseWithContext(prompt, context);

    // Parse JSON response
    return this.parseCorrections(response);
  }

  private mergeCorrections(
    ruleCorrections: Correction[],
    aiCorrections: Correction[],
  ): Correction[] {
    // Deduplicate: rule-based takes precedence
    const merged = [...ruleCorrections];
    const ruleFields = new Set(ruleCorrections.map(c => c.field));

    for (const aiCorrection of aiCorrections) {
      if (!ruleFields.has(aiCorrection.field)) {
        merged.push(aiCorrection);
      }
    }

    // Sort by severity
    return merged.sort((a, b) => {
      const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private calculateSummary(corrections: Correction[]) {
    let capex_delta = 0;
    let opex_delta = 0;

    for (const correction of corrections) {
      const delta = correction.proposed_value - correction.current_value;
      if (correction.field.startsWith('capex.')) {
        capex_delta += delta;
      } else if (correction.field.startsWith('opex.')) {
        opex_delta += delta;
      }
    }

    return {
      total_corrections: corrections.length,
      rule_based: corrections.filter(c => c.confidence === 100).length,
      ai_powered: corrections.filter(c => c.confidence < 100).length,
      capex_delta,
      opex_delta,
    };
  }

  private calculateOverallConfidence(corrections: Correction[]): number {
    if (corrections.length === 0) return 100;
    
    const avgConfidence = corrections.reduce((sum, c) => sum + c.confidence, 0) / corrections.length;
    return Math.round(avgConfidence);
  }
}
```

---

### 2. `rule-engine.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import * as correctionRules from './correction-rules.json';

@Injectable()
export class RuleEngineService {
  async evaluateRules(formData: any, estimationData: any): Promise<Correction[]> {
    const corrections: Correction[] = [];

    for (const rule of correctionRules.rules) {
      // Check condition
      if (!this.evaluateCondition(rule.condition, formData)) {
        continue;
      }

      // Check additional conditions
      if (rule.additional_conditions) {
        const allMet = rule.additional_conditions.every(cond =>
          this.evaluateCondition(cond, { formData, estimationData })
        );
        if (!allMet) continue;
      }

      // Evaluate check
      const currentValue = this.getValue(rule.check.field, { formData, estimationData });
      const expectedValue = rule.check.expected_formula
        ? this.evaluateFormula(rule.check.expected_formula, formData)
        : rule.check.expected;

      const tolerance = rule.check.tolerance || 0;

      if (Math.abs(currentValue - expectedValue) > tolerance) {
        corrections.push({
          type: rule.metadata.category,
          field: rule.correction.field,
          current_value: currentValue,
          proposed_value: expectedValue,
          reason: rule.correction.reason.replace('{microservicesCount}', formData.microservicesCount),
          source: rule.metadata.source,
          confidence: 100, // Rule-based = 100% confidence
          severity: rule.metadata.severity,
          formula: rule.correction.formula,
        });
      }
    }

    return corrections;
  }

  private evaluateCondition(condition: any, data: any): boolean {
    const value = this.getValue(condition.field, data);
    
    switch (condition.operator) {
      case '===':
        return value === condition.value;
      case '!==':
        return value !== condition.value;
      case 'IN':
        return condition.value.includes(value);
      default:
        return false;
    }
  }

  private getValue(path: string, data: any): any {
    const parts = path.split('.');
    let current = data;
    
    for (const part of parts) {
      current = current?.[part];
    }
    
    return current;
  }

  private evaluateFormula(formula: string, data: any): number {
    // Simple formula evaluation
    // Replace variables with actual values
    let evalFormula = formula;
    
    for (const [key, value] of Object.entries(data)) {
      evalFormula = evalFormula.replace(
        new RegExp(`formData\\.${key}`, 'g'),
        String(value)
      );
    }

    // Evaluate safely
    return eval(evalFormula);
  }
}
```

---

## 🎨 Admin UI Mockup

### Correction Approval Component

**Location:** Admin Dashboard → Quotation Detail → "Corrections" Tab

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  📋 Correction Proposal #1234                              │
│  Estimation ID: abc-123  |  Confidence: 95%                │
│  Proposed: 2026-05-15 14:30  |  Status: PENDING_APPROVAL  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Summary                                                    │
│  • Total Corrections: 3                                     │
│  • CAPEX Delta: +€7,320                                    │
│  • OPEX Delta: +€2,175                                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Corrections                                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🔴 HIGH • MISSING_COST                              │  │
│  │                                                      │  │
│  │ Field: capex.devops_pipeline                        │  │
│  │ Current: €0                                          │  │
│  │ Proposed: €7,320                                    │  │
│  │                                                      │  │
│  │ Reason: Pipeline '5-15' classified as MEDIO         │  │
│  │         requires €7,320 CAPEX                       │  │
│  │                                                      │  │
│  │ Source: devops-pipeline-costs.md (line 45)         │  │
│  │ Confidence: 100% (rule-based)                       │  │
│  │                                                      │  │
│  │ [✓ Approve] [✗ Reject]                             │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🔴 HIGH • FORMULA_ERROR                             │  │
│  │                                                      │  │
│  │ Field: opex.container_orchestration                 │  │
│  │ Current: €5,200                                      │  │
│  │ Proposed: €7,375                                    │  │
│  │                                                      │  │
│  │ Reason: 5 microservices × 7 pods × €210.72         │  │
│  │                                                      │  │
│  │ Formula: microservicesCount * 7 * 210.72           │  │
│  │ Source: field-to-cost-mapping.md (Section 1)       │  │
│  │ Confidence: 100% (rule-based)                       │  │
│  │                                                      │  │
│  │ [✓ Approve] [✗ Reject]                             │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [✓ Approve All (3)]  [✗ Reject All]  [Review Later]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### Backend: `corrections.controller.ts`

```typescript
@Controller('admin/corrections')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CorrectionsController {
  
  @Get(':estimationId')
  async getCorrections(@Param('estimationId') estimationId: string) {
    // Get correction proposal for estimation
  }

  @Post(':proposalId/approve')
  async approveCorrections(
    @Param('proposalId') proposalId: string,
    @Body() { correctionIds }: { correctionIds: string[] },
    @Req() req,
  ) {
    // Approve selected corrections
    // Apply to estimation
    // Update status
  }

  @Post(':proposalId/reject')
  async rejectCorrections(
    @Param('proposalId') proposalId: string,
    @Body() { reason }: { reason: string },
    @Req() req,
  ) {
    // Reject proposal
    // Log reason
  }
}
```

---

## 📊 Implementation Steps

### Phase 1: Core Infrastructure (2-3 days)
- [ ] Create correction-rules.json with 10 basic rules
- [ ] Implement rule-engine.service.ts
- [ ] Create correction_proposals table
- [ ] Backend entity + service + controller

### Phase 2: AI Integration (2-3 days)
- [ ] Create correction-agent-prompt.md
- [ ] Implement correction-agent.service.ts
- [ ] Integrate with estimation workflow
- [ ] Testing with real quotations

### Phase 3: Admin UI (2-3 days)
- [ ] Correction approval component
- [ ] Side-by-side diff view
- [ ] Approve/Reject workflow
- [ ] Status tracking

### Phase 4: Testing & Refinement (2 days)
- [ ] Unit tests for rule engine
- [ ] E2E tests for workflow
- [ ] Fine-tune correction logic
- [ ] Documentation

**Total Estimate: 8-11 days**

---

## 🧪 Testing Strategy

### Test Cases

1. **Pipeline MEDIO Missing Cost**
   - Form: `pipeline = "5-15"`
   - Estimation: `capex.devops_pipeline = 0`
   - Expected: Correction proposed for €7,320

2. **Pods Formula Error**
   - Form: `microservicesCount = 5`
   - Estimation: Wrong formula used
   - Expected: Correction with formula

3. **QA with Exemption**
   - Form: `qa = "NO"`
   - Estimation: `capex.qa = 0`
   - Expected: NO correction (valid exemption)

4. **Multiple Corrections**
   - Multiple errors in same estimation
   - Expected: All identified, prioritized by severity

5. **Approval Workflow**
   - Admin approves subset of corrections
   - Expected: Only approved corrections applied

---

## 📈 Success Metrics

- **Correction Accuracy**: % of proposed corrections that are correct
- **False Positive Rate**: % of incorrect corrections proposed
- **Admin Approval Rate**: % of corrections approved by admins
- **Time Saved**: Average time saved per quotation review
- **Estimation Quality**: % of estimations that pass without corrections

**Target:**
- Accuracy: >95%
- False Positive: <5%
- Approval Rate: >90%
- Time Saved: 10-15 min per quotation

---

## 🔄 Future Enhancements

### v1.3.0+
- [ ] Machine learning: Learn from admin approvals/rejections
- [ ] Confidence threshold: Auto-apply corrections above X% confidence
- [ ] Correction patterns: Identify systematic AI errors
- [ ] Knowledge base auto-update: Suggest knowledge base improvements
- [ ] Batch corrections: Apply same correction across multiple quotations

---

## 📚 References

- **Knowledge Base**: `ai-estimation-service/knowledge/*.md`
- **Validation Agent**: `ai-estimation-service/src/agents/validation-agent.service.ts`
- **Estimation Agent**: `ai-estimation-service/src/agents/estimation-agent.service.ts`

---

**Document Status:** ✅ Complete - Ready for Implementation  
**Next Action:** Review with team, prioritize, assign developer  
**Estimated Effort:** 8-11 developer days
