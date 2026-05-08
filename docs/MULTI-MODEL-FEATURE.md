# Multi-Model AI Estimation Feature

## Panoramica

Implementazione completa della funzionalità di selezione e comparazione modelli AI per le quotazioni.

### Obiettivo
- **Modello di default**: Claude Sonnet 4.5 per tutte le nuove quotazioni
- **Test con modelli alternativi**: Possibilità per admin di rigenerare con Opus 4 o Haiku 4
- **Comparazione side-by-side**: Visualizzazione comparativa dei risultati

## Modelli Disponibili

| Modello | Input ($/1M) | Output ($/1M) | Use Case |
|---------|--------------|---------------|----------|
| **Sonnet 4.5** (default) | $3.00 | $15.00 | Bilanciamento qualità/costo |
| **Opus 4** | $15.00 | $75.00 | Massima accuratezza, progetti complessi |
| **Haiku 4** | $0.80 | $4.00 | Velocità, progetti semplici |

## Implementazione Backend

### 1. Database Migration
**File**: `backend/src/migrations/1746731000000-AddModelFieldsToAiEstimations.ts`

Aggiunge due campi alla tabella `ai_estimations`:
- `model_id VARCHAR(100)` - ID Bedrock del modello (es. `eu.anthropic.claude-sonnet-4-5-20250929-v1:0`)
- `model_name VARCHAR(50)` - Nome visualizzato (es. `Claude Sonnet 4.5`)

**Esecuzione manuale**:
```sql
ALTER TABLE ai_estimations 
ADD COLUMN model_id VARCHAR(100) DEFAULT 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
ADD COLUMN model_name VARCHAR(50) DEFAULT 'Claude Sonnet 4.5';

CREATE INDEX idx_ai_estimations_model_id ON ai_estimations(model_id);
CREATE INDEX idx_ai_estimations_quotation_created ON ai_estimations(quotation_id, created_at DESC);
```

### 2. Entity Update
**File**: `backend/src/entities/ai-estimation.entity.ts`

```typescript
@Column({ type: 'varchar', length: 100, name: 'model_id', nullable: true })
modelId: string | null;

@Column({ type: 'varchar', length: 50, name: 'model_name', nullable: true })
modelName: string | null;
```

### 3. Nuovi Endpoint

#### GET `/ai-estimation/quotation/:quotationId/all`
Ritorna tutte le stime generate per una quotazione (per comparazione).

**Response**:
```json
[
  {
    "id": "uuid",
    "quotationId": "uuid",
    "modelId": "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
    "modelName": "Claude Sonnet 4.5",
    "estimationData": { ... },
    "confidence": 87,
    "inputTokens": 42150,
    "outputTokens": 8340,
    "estimatedCostUsd": 0.252,
    "createdAt": "2026-05-08T..."
  },
  { ... }
]
```

#### POST `/ai-estimation/retry/:quotationId/model/:modelId`
Genera una nuova stima con il modello specificato.

**Request**: No body (modelId in URL)
**Response**:
```json
{
  "message": "Stima AI generata con modello eu.anthropic.claude-opus-4-...",
  "quotationId": "uuid"
}
```

## Implementazione AI Service

### 1. Model Configuration
**File**: `ai-estimation-service/src/config/models.config.ts`

Definisce i 3 modelli disponibili con metadata (costi, descrizioni, use cases).

**Funzioni helper**:
- `getModelConfig(name)` - Config by short name
- `getModelConfigById(id)` - Config by Bedrock ID
- `calculateCost(name, inputTokens, outputTokens)` - Calcolo costo
- `getAllModels()` - Lista completa modelli

### 2. Bedrock Service Update
**File**: `ai-estimation-service/src/bedrock/bedrock.service.ts`

Aggiunge parametro `modelId?: string` a `BedrockRequest` per override del modello default.

```typescript
const modelIdToUse = request.modelId || this.modelId;
const input: ConverseCommandInput = {
  modelId: modelIdToUse,
  // ...
};
```

### 3. Estimation Agent Update
**File**: `ai-estimation-service/src/agents/estimation-agent.service.ts`

Accetta `modelId?: string` come parametro e lo passa a Bedrock:

```typescript
async generateEstimation(quotationData: QuotationData, modelId?: string) {
  // ...
  const response = await this.bedrockService.invoke({
    // ...
    modelId, // Pass override
  });
  
  return {
    // ...
    model_id: modelId,
    model_name: modelId ? getModelConfigById(modelId)?.displayName : undefined,
  };
}
```

### 4. Controller Update
**File**: `ai-estimation-service/src/api/estimation.controller.ts`

```typescript
interface ProcessQuotationRequest {
  quotation_id: string;
  user_id: string;
  project_code: string;
  status: string;
  model_id?: string; // NEW
}

async processQuotation(@Body() request: ProcessQuotationRequest) {
  const { model_id } = request;
  const estimation = await this.estimationAgent.generateEstimation(
    quotationData,
    model_id
  );
}
```

## Implementazione Frontend

### 1. Model Configuration
**File**: `frontend/src/app/features/admin/models/ai-model.model.ts`

Definisce interfaccia `AIModel` e array `AVAILABLE_MODELS`.

### 2. Admin Service Update
**File**: `frontend/src/app/features/admin/services/admin.service.ts`

```typescript
retryAiEstimationWithModel(quotationId: string, modelId: string): Observable<...> {
  return this.apiService.post(`/ai-estimation/retry/${quotationId}/model/${modelId}`, {});
}

getAllEstimationsForQuotation(quotationId: string): Observable<any[]> {
  return this.apiService.get(`/ai-estimation/quotation/${quotationId}/all`);
}
```

### 3. Admin Dashboard Component (TODO)
**File**: `frontend/src/app/features/admin/pages/admin-dashboard/admin-dashboard.component.ts`

**Funzionalità da aggiungere**:
1. Dropdown "Testa con modello" accanto al pulsante "Riprova AI"
2. Modale "Comparazione Modelli" che mostra tabella side-by-side
3. Visualizzazione badge modello usato per ogni quotazione

**UI Mockup**:
```
┌────────────────────────────────────────────┐
│ Quotazione PRJ-001                         │
│ [Riprova AI ▼]                             │
│   • Sonnet 4.5 (default)                   │
│   • Opus 4                                 │
│   • Haiku 4                                │
│ [📊 Confronta stime] (se > 1 stima)        │
└────────────────────────────────────────────┘
```

**Tabella comparazione**:
```
Metrica          | Sonnet 4.5 | Opus 4    | Haiku 4
─────────────────┼────────────┼───────────┼────────
Total 1° anno    | €285k ✓    | €292k     | €278k
CAPEX            | €180k      | €185k     | €175k
OPEX anno 1      | €105k      | €107k     | €103k
Confidence       | 87% ⭐     | 92% ⭐⭐  | 78%
Processing time  | 73s        | 89s       | 45s ⚡
Cost USD         | $0.252     | $1.318    | $0.061 💰
```

## Workflow Utente

### Scenario 1: Nuova quotazione
1. Utente crea quotazione
2. Backend triggera AI service con **modello default (Sonnet 4.5)**
3. Stima generata e salvata con `modelId` = Sonnet
4. Admin vede la stima con badge "Sonnet 4.5"

### Scenario 2: Test modello alternativo
1. Admin apre quotazione esistente
2. Click su "Riprova AI" → dropdown modelli
3. Seleziona "Opus 4"
4. Backend chiama `/retry/:id/model/eu.anthropic.claude-opus-4-...`
5. AI service genera **NUOVA stima** (non sovrascrive)
6. Ora esistono 2 stime per la stessa quotazione
7. Admin può confrontarle con "📊 Confronta stime"

### Scenario 3: Comparazione
1. Admin click su "Confronta stime"
2. Frontend chiama `/ai-estimation/quotation/:id/all`
3. Modale mostra tabella side-by-side
4. Admin può approvare una delle stime o rigenerare

## Testing

### 1. Test API Backend
```bash
# Get all estimations for quotation
curl http://localhost:3000/ai-estimation/quotation/{ID}/all \
  -H "Authorization: Bearer {TOKEN}"

# Generate with Opus 4
curl -X POST http://localhost:3000/ai-estimation/retry/{ID}/model/eu.anthropic.claude-opus-4-20250514-v1:0 \
  -H "Authorization: Bearer {TOKEN}"
```

### 2. Test AI Service
```bash
# Process with specific model
curl -X POST http://localhost:3001/api/estimation/process \
  -H "Authorization: Bearer {SERVICE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "quotation_id": "uuid",
    "user_id": "uuid",
    "project_code": "PRJ-001",
    "status": "INVIATA",
    "model_id": "eu.anthropic.claude-haiku-4-20250514-v1:0"
  }'
```

## Database Query Utility

### Get all estimations for a quotation
```sql
SELECT 
  id,
  model_name,
  ai_status,
  confidence,
  input_tokens,
  output_tokens,
  estimated_cost_usd,
  estimation_data->'summary'->>'total_first_year' as total,
  created_at
FROM ai_estimations
WHERE quotation_id = 'your-quotation-id-here'
ORDER BY created_at DESC;
```

### Get comparison stats
```sql
SELECT 
  model_name,
  COUNT(*) as estimations_count,
  AVG(confidence) as avg_confidence,
  AVG((estimation_data->'summary'->>'total_first_year')::numeric) as avg_total,
  SUM(estimated_cost_usd) as total_cost_usd
FROM ai_estimations
WHERE ai_status IN ('AI_VALIDATED', 'HUMAN_APPROVED')
GROUP BY model_name;
```

## Prossimi Passi

### Completare (in ordine):

1. ✅ Backend entity + migration
2. ✅ Backend service logic
3. ✅ Backend controller endpoints
4. ✅ AI service config modelli
5. ✅ AI service Bedrock override
6. ✅ AI service agent modelId
7. ✅ Frontend service methods
8. ⏳ **Eseguire migration database manualmente**
9. ⏳ **Frontend UI dropdown modelli**
10. ⏳ **Frontend modale comparazione**
11. ⏳ **Frontend badge modello usato**
12. ⏳ **Test end-to-end completo**

### Note Implementazione

- **Relazione 1:N**: Una quotazione può avere multiple stime (una per modello testato)
- **Logica di check**: `generateEstimation()` verifica se esiste già una stima con lo stesso `modelId` prima di creare/aggiornare
- **Backward compatibility**: Stime esistenti senza `modelId` vengono trattate come Sonnet 4.5
- **Cost tracking**: Ogni modello ha il proprio tracking di costo per analytics

## Benefici

1. **A/B Testing**: Verifica empirica quale modello è più accurato per tipo di quotazione
2. **Cost Optimization**: Usa Haiku per quote semplici, Opus per complesse
3. **Quality Assurance**: Convergenza multi-modello aumenta fiducia
4. **Audit Trail**: Storico completo di quale modello ha generato cosa
5. **Flexibility**: Admin può sempre rifare con modello diverso senza perdere storico
