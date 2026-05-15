# Validation Agent

## Purpose
Validates estimation results for accuracy, completeness, and governance compliance. Flags issues requiring human review.

## Components

- **`validation.service.ts`**: Service orchestrator for validation process
- **`validation.prompt.md`**: AI agent instructions defining validation rules and thresholds
- **Knowledge Base**: Located in `../../knowledge/` (shared across agents)

## Process Flow

1. **Receive estimation result** from estimation agent
2. **Load knowledge base** (pricing rules, governance rules)
3. **Build system prompt** (validation rules + knowledge)
4. **Single-turn AI validation** via AWS Bedrock
5. **Parse validation response** (decision, issues, metrics)
6. **Return validation result** with recommended next steps

## Validation Categories

### 1. Completeness Checks
- All required cost components present
- No €0 values for expected costs
- Line items sum to totals

### 2. Accuracy Checks
- Costs within expected ranges (per vCPU, per TB, etc.)
- OPEX/CAPEX ratio reasonable for infrastructure type
- Multi-year projections follow depreciation patterns

### 3. Governance Checks
- QA budget ≥10% (unless qa="NO")
- Project classification matches cost range
- Professional services pricing matches tariffario

### 4. Mathematical Validation
- Line items sum equals summary total
- 5-year projection consistent
- Prorated costs calculated correctly

## Output Structure

```typescript
{
  estimation_id: string;
  validation_data: {
    decision: "APPROVE" | "REVIEW" | "SENIOR_REVIEW" | "REJECT";
    confidence: number;
    summary: {
      total_checks: number;
      passed: number;
      warnings: number;
      errors: number;
    };
    issues: Array<{
      severity: "HIGH" | "MEDIUM" | "LOW";
      category: string;
      message: string;
      recommendation?: string;
    }>;
    metrics: {
      cost_per_vcpu: number;
      cost_per_tb: number;
      opex_capex_ratio: number;
    };
    next_steps: string[];
  };
}
```

## Decision Logic

| Decision | Condition | Admin Action |
|----------|-----------|--------------|
| **APPROVE** | 0 HIGH issues, 0-2 MEDIUM issues | Auto-approve (future feature) |
| **REVIEW** | 1-2 HIGH issues OR 3+ MEDIUM issues | Admin review required |
| **SENIOR_REVIEW** | 3+ HIGH issues OR critical governance violations | Senior admin review |
| **REJECT** | Estimation clearly incorrect (e.g., CAPEX=0 for major project) | Reject and re-estimate |

## Performance

- **Average latency**: 10-15 seconds
- **Token usage**: ~150k input (cached), ~2k output
- **Cost per validation**: $0.10-$0.15 (with prompt caching ~90% cost reduction)
- **Prompt caching**: Knowledge base cached, saves ~$0.40 per validation

## Logging

The validation agent uses structured logging:

```
[VALIDATION-AGENT] Starting Validation Agent
[VALIDATION-AGENT] Estimation ID: {id}
[VALIDATION-AGENT] Quotation ID: {quotation_id}
[VALIDATION-AGENT] Invoking AI model for validation...
[VALIDATION-AGENT] Response received in 12000ms (12.0s)
[VALIDATION-AGENT] Tokens: input=152000, output=2100 [CACHE HIT: 148000 tokens, ~90% cost savings]
[VALIDATION-AGENT] Decision: AI_VALIDATED
[VALIDATION-AGENT] Issues found: 2
[VALIDATION-AGENT] Issues breakdown: HIGH=0, MEDIUM=1, LOW=1
```

**Log prefixes:**
- `[VALIDATION-AGENT]` - All validation workflow events

**What is logged:**
- Estimation/Quotation IDs being validated
- Response timing and token usage
- Cache hit/miss information
- Validation decision (APPROVE/REVIEW/SENIOR_REVIEW/REJECT)
- Issue count and severity breakdown

## Governance Exemptions

Some validation rules have explicit exemptions:

### QA Budget Rule
- **Rule**: QA ≥10% of total project cost
- **Exemption**: When `qa="NO"` in form data
- **Rationale**: Explicit governance exemption for projects with no QA requirements

### OPEX Projection Pattern
- **On-Premise**: Decreasing OPEX (depreciation) is CORRECT
- **Cloud**: Increasing OPEX (inflation) is CORRECT
- **Don't flag**: OPEX changes that match infrastructure type

## Development

### Testing locally
```bash
npm run start:dev
# Validation is automatically triggered after estimation
# Or test directly via API:
curl -X POST http://localhost:3001/api/estimation/validate \
  -H "Authorization: Bearer <SERVICE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"estimation_id": "test", "estimation": {...}}'
```

### Modifying validation rules
1. Edit `validation.prompt.md` to change rules/thresholds
2. Add new governance rules in knowledge base
3. Test with historical quotations showing edge cases

### Adding new validation checks
1. Define check in `validation.prompt.md` under relevant section
2. Specify severity level (HIGH/MEDIUM/LOW)
3. Include recommendation for admin (how to fix)
