# Estimation Agent

## Purpose
Generates detailed cost estimations (CAPEX/OPEX) for IT infrastructure projects at Crédit Agricole Italia.

## Components

- **`estimation.service.ts`**: Service orchestrator that manages multi-turn conversations with AWS Bedrock
- **`estimation.prompt.md`**: AI agent instructions defining the 8-step estimation process
- **Knowledge Base**: Located in `../../knowledge/` (shared across agents)

## Process Flow

1. **Receive quotation data** from backend service
2. **Load knowledge base** (costs, rules, mappings)
3. **Build system prompt** (agent skill + knowledge)
4. **Multi-turn conversation** with Claude AI via AWS Bedrock
5. **Parse JSON response** (summary, breakdown, line items, assumptions)
6. **Return estimation result** with token usage and cost

## Supported Models

- **Claude Sonnet 4.5** (default): Balanced cost/performance
- **Claude Opus 4.7**: Maximum accuracy, higher cost
- **Claude Haiku 4.5**: Fast, lower cost

## Output Structure

```typescript
{
  quotation_id: string;
  estimation_data: {
    summary: {
      total_capex: number;
      total_opex_year_1: number;
      total_first_year: number;
      total_5_years: number;
      project_classification: "LIGHT" | "MEDIO" | "COMPLESSO" | "SPECIALE";
    };
    breakdown: {
      capex: { devops_pipeline, qa_infrastructure, ... };
      opex: { infrastructure_mgmt, licenses, ... };
      opex_projection: { year_1, year_2, ..., year_5 };
    };
    line_items: Array<{ category, description, capex, opex, notes }>;
    assumptions: string[];
    confidence_score: number;
  };
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  model_id?: string;
  model_name?: string;
}
```

## Performance

- **Average latency**: 70-90 seconds
- **Token usage**: ~150k input, ~8k output (with prompt caching)
- **Cost per estimation**: $0.50-$0.80 (Sonnet 4.5)

## Logging

The agent uses structured logging to track the estimation workflow:

```
[AGENT-WORKFLOW] Starting Estimation Agent for quotation {id}
[AGENT-TURN-1] Invoking AI model...
[AGENT-TURN-1] Response received in 45000ms
[AGENT-TURN-1] Tokens: input=152000, output=8500
[AGENT-TURN-1] Stop reason: end_turn
[AGENT-WORKFLOW] Conversation completed after 1 turn(s)
[AGENT-WORKFLOW] Total time: 45200ms (45.2s)
[AGENT-WORKFLOW] Total tokens: input=152000, output=8500
[AGENT-WORKFLOW] Estimated cost: $0.5850
```

**Log prefixes:**
- `[AGENT-WORKFLOW]` - Overall workflow events (start, end, summary)
- `[AGENT-TURN-N]` - Individual AI invocation turns
- `[AGENT-TOOL]` - Tool execution events (when AI uses tools)

**What is logged per turn:**
- Turn number and timing
- Token usage (input/output)
- Stop reason (end_turn, tool_use, max_tokens)
- Tool requests and execution times

## Development

### Testing locally
```bash
npm run start:dev
curl -X POST http://localhost:3001/api/estimation/process \
  -H "Authorization: Bearer <SERVICE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"quotation_id": "test", "model_id": "claude-sonnet-4-5"}'
```

### Modifying the agent
1. Edit `estimation.prompt.md` to change AI behavior
2. Reload service (auto-reload in dev mode)
3. Test with a sample quotation

### Adding new cost components
1. Add knowledge file to `../../knowledge/costs/`
2. Update `../../knowledge/knowledge-loader.service.ts`
3. Reference new knowledge in `estimation.prompt.md`
