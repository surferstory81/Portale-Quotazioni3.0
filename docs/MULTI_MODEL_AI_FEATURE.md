# Funzionalità Multi-Model AI per Stime di Quotazioni

## Panoramica

Il sistema supporta la generazione di stime AI utilizzando **tre diversi modelli Claude**, permettendo agli amministratori di confrontare i risultati e scegliere il modello più adatto in base alla complessità della quotazione e al budget disponibile.

## Modelli Disponibili

### 1. **Claude Sonnet 4.5** (Default)
- **ID**: `eu.anthropic.claude-sonnet-4-5-20250929-v1:0`
- **Descrizione**: Bilanciamento ottimale tra qualità e costo
- **Pricing**:
  - Input: $3.00 per 1M tokens
  - Output: $15.00 per 1M tokens
- **Consigliato per**:
  - Quotazioni standard
  - Uso quotidiano
  - Miglior rapporto qualità/prezzo

### 2. **Claude Opus 4**
- **ID**: `eu.anthropic.claude-opus-4-20250514-v1:0`
- **Descrizione**: Massima qualità e capacità di ragionamento
- **Pricing**:
  - Input: $15.00 per 1M tokens
  - Output: $75.00 per 1M tokens
- **Consigliato per**:
  - Quotazioni complesse
  - Architetture multi-layer
  - Massima accuratezza

### 3. **Claude Haiku 4**
- **ID**: `eu.anthropic.claude-haiku-4-20250514-v1:0`
- **Descrizione**: Velocità e costo ridotto
- **Pricing**:
  - Input: $0.80 per 1M tokens
  - Output: $4.00 per 1M tokens
- **Consigliato per**:
  - Quotazioni semplici
  - Test rapidi
  - Costo minimo

## Architettura della Funzionalità

### Backend (`backend/`)

#### Endpoints API

1. **Retry con modello specifico** (POST)
   ```
   POST /ai-estimation/retry/:quotationId/model/:modelId
   ```
   - Richiesto ruolo: `ADMIN`
   - Genera una nuova stima utilizzando il modello specificato
   - Parametri:
     - `quotationId`: UUID della quotazione
     - `modelId`: ID del modello (es. `eu.anthropic.claude-opus-4-20250514-v1:0`)

2. **Ottieni tutte le stime per una quotazione** (GET)
   ```
   GET /ai-estimation/quotation/:quotationId/all
   ```
   - Richiesto ruolo: `ADMIN`
   - Restituisce tutte le stime generate per la quotazione (anche con modelli diversi)
   - Permette il confronto tra modelli

#### Database Schema

La tabella `ai_estimations` include i seguenti campi per il tracking dei modelli:

```sql
-- Aggiunti dalla migration 1746731000000-AddModelFieldsToAiEstimations
model_id VARCHAR(100) NULL        -- ID completo del modello AWS Bedrock
model_name VARCHAR(50) NULL       -- Nome visualizzato (es. "Claude Sonnet 4.5")
```

**Indici creati**:
- `idx_ai_estimations_model_id`: Ricerca efficiente per modello
- `idx_ai_estimations_quotation_created`: Ordinamento per comparazione

#### Logica di Creazione Stime

Il metodo `generateEstimation()` in `ai-estimation.service.ts`:
- Controlla se esiste già una stima **per lo stesso modello**
- Se esiste → aggiorna e accumula token/costi
- Se non esiste → crea nuova stima
- Permette **multiple stime per quotazione con modelli diversi**

### AI Service (`ai-estimation-service/`)

#### Configurazione Modelli

File: `src/config/models.config.ts`

```typescript
export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  'claude-sonnet-4.5': { ... },
  'claude-opus-4': { ... },
  'claude-haiku-4': { ... },
};
```

**Funzioni disponibili**:
- `getModelConfig(modelName)`: Ottiene config per nome breve
- `getModelConfigById(modelId)`: Ottiene config per ID Bedrock completo
- `calculateCost(modelName, inputTokens, outputTokens)`: Calcola costo preciso

#### Estimation Agent

File: `src/agents/estimation-agent.service.ts`

**Metodo principale**:
```typescript
async generateEstimation(quotationData: QuotationData, modelId?: string)
```

- Accetta `modelId` opzionale
- Passa il `modelId` al Bedrock Service
- Calcola il costo basandosi sul pricing specifico del modello
- Restituisce `model_id` e `model_name` nel risultato

#### Bedrock Service

File: `src/bedrock/bedrock.service.ts`

**Metodo invoke**:
```typescript
async invoke(request: BedrockRequest): Promise<BedrockResponse>
```

- Supporta `request.modelId` come override del modello default
- Se `modelId` non specificato → usa il modello configurato in `.env`
- Logging dettagliato del modello utilizzato

### Frontend (`frontend/`)

#### Modelli e Costanti

File: `src/app/features/admin/models/ai-model.model.ts`

```typescript
export const AVAILABLE_MODELS: AIModel[] = [
  // Definizione dei tre modelli con tutte le info
];
```

#### Servizi

**AI Estimation Service** (`core/services/ai-estimation.service.ts`):
- `getAllEstimationsByQuotationId(quotationId)`: Ottiene tutte le stime
- `retryEstimationWithModel(quotationId, modelId)`: Genera con modello specifico

**Admin Service** (`features/admin/services/admin.service.ts`):
- `retryAiEstimationWithModel(quotationId, modelId)`: Wrapper per endpoint
- `getAllEstimationsForQuotation(quotationId)`: Ottiene tutte le stime

#### UI - Admin Dashboard

File: `features/admin/pages/admin-dashboard/admin-dashboard.component.*`

**Funzionalità UI**:

1. **Dropdown per selezione modello**
   - Pulsante "🔄 Retry AI ▼"
   - Menu a tendina con lista modelli
   - Mostra nome, descrizione e costo per MTok
   - Click su modello → genera nuova stima

2. **Modal di comparazione**
   - Pulsante "📊 Confronta" (visibile se esistono multiple stime)
   - Tabella comparativa con:
     - Total 1° Anno, CAPEX, OPEX
     - Confidence Score
     - Token utilizzati
     - Costo AI in USD
   - Insights automatici

**Metodi principali**:
```typescript
toggleModelDropdown(quotationId: string)   // Mostra/nascondi dropdown
retryWithModel(quotationId, modelId)       // Genera con modello specifico
loadComparison(quotationId)                // Carica tutte le stime
getModelDisplayName(modelId)               // Nome visualizzato
```

## Workflow Utente Amministratore

### 1. Generazione Stima con Modello Specifico

1. Admin accede alla dashboard `/admin`
2. Trova la quotazione di interesse nella tabella
3. Click su "🔄 Retry AI ▼" → si apre dropdown con 3 modelli
4. Seleziona il modello desiderato (es. "Claude Opus 4" per quotazione complessa)
5. Sistema genera nuova stima con quel modello
6. Messaggio di successo: "Stima AI generata con modello Claude Opus 4."

### 2. Comparazione tra Modelli

1. Admin genera stime con più modelli (es. Sonnet + Opus)
2. Appare pulsante "📊 Confronta" nella riga della quotazione
3. Click su "📊 Confronta" → si apre modal
4. Tabella mostra side-by-side:
   - Costi stimati (CAPEX, OPEX, Totali)
   - Confidence score di ciascuna stima
   - Token utilizzati e costo AI
5. Admin può valutare quale stima approvare basandosi su:
   - Confidence più alto
   - Convergenza dei risultati
   - Costo AI vs accuratezza

### 3. Approvazione Stima

Dopo la comparazione, l'admin può approvare la stima migliore tramite il workflow standard di revisione.

## Vantaggi della Funzionalità

### Per Amministratori
- **Flessibilità**: Scegliere il modello in base a complessità e budget
- **Validazione**: Confrontare output di modelli diversi per maggiore sicurezza
- **Trasparenza**: Vedere esattamente quanto costa ogni stima AI

### Per il Business
- **Ottimizzazione costi**: Usare Haiku per quotazioni semplici (5x più economico)
- **Qualità controllata**: Usare Opus per quotazioni critiche
- **Dati per analisi**: Raccogliere metriche su performance dei modelli

## Metriche e Monitoring

### Statistiche Token

La dashboard mostra:
- Token totali consumati (input + output)
- Costo totale in USD
- Media token per stima
- Costo medio per stima

### Per-Model Analytics

Possibili analisi future:
- Confronto accuracy tra modelli
- Correlation tra confidence e correttezza
- ROI per modello (costo vs valore generato)

## Estensibilità

### Aggiungere Nuovi Modelli

1. **Backend**: Aggiornare `ai-estimation-service/src/config/models.config.ts`
   ```typescript
   'claude-new-model': {
     id: 'eu.anthropic.claude-new-model-v1:0',
     name: 'claude-new-model',
     displayName: 'Claude New Model',
     // ...
   }
   ```

2. **Frontend**: Aggiornare `frontend/src/app/features/admin/models/ai-model.model.ts`
   ```typescript
   {
     id: 'eu.anthropic.claude-new-model-v1:0',
     name: 'claude-new-model',
     displayName: 'Claude New Model',
     // ...
   }
   ```

3. Nessuna modifica al database necessaria (schema già supporta tutti i modelli)

### Feature Future

- **Auto-selezione modello**: ML per suggerire modello ottimale in base a caratteristiche quotazione
- **A/B testing automatico**: Generare con 2 modelli simultaneamente e confrontare
- **Cost limits**: Bloccare modelli costosi se budget superato
- **Performance tracking**: Dashboard con success rate per modello

## Riferimenti Codice

### File Chiave

**Backend**:
- `backend/src/modules/ai-estimation/ai-estimation.controller.ts` (linee 260-276)
- `backend/src/modules/ai-estimation/ai-estimation.service.ts` (linee 399-456)
- `backend/src/modules/ai-estimation/ai-service-client.service.ts` (linee 165-201)
- `backend/src/migrations/1746731000000-AddModelFieldsToAiEstimations.ts`

**AI Service**:
- `ai-estimation-service/src/config/models.config.ts` (configurazione completa)
- `ai-estimation-service/src/agents/estimation-agent.service.ts` (linee 66, 93, 136-162)
- `ai-estimation-service/src/bedrock/bedrock.service.ts` (linee 161-162)

**Frontend**:
- `frontend/src/app/features/admin/models/ai-model.model.ts`
- `frontend/src/app/features/admin/pages/admin-dashboard/admin-dashboard.component.ts` (linee 25-27, 149-192, 205-209)
- `frontend/src/app/features/admin/pages/admin-dashboard/admin-dashboard.component.html` (linee 95-126, 164-277)
- `frontend/src/app/core/services/ai-estimation.service.ts` (linee 58-74)

## Test

### Test Manuali

1. **Test selezione modello**:
   ```bash
   # Via API
   curl -X POST http://localhost:3000/api/ai-estimation/retry/{quotationId}/model/eu.anthropic.claude-opus-4-20250514-v1:0 \
     -H "Authorization: Bearer {admin-token}"
   ```

2. **Test comparazione**:
   ```bash
   # Genera con Sonnet
   curl -X POST .../retry/{quotationId}/model/...claude-sonnet...
   
   # Genera con Opus
   curl -X POST .../retry/{quotationId}/model/...claude-opus...
   
   # Ottieni tutte le stime
   curl -X GET .../quotation/{quotationId}/all
   ```

3. **Test UI**:
   - Login come admin
   - Seleziona quotazione
   - Genera con Sonnet, poi con Opus
   - Click "📊 Confronta"
   - Verificare tabella comparativa

### Test Automatizzati

Possibili unit test:
- `getModelConfigById()` restituisce config corretto
- `calculateCost()` calcola costo accurato
- `retryEstimationWithModel()` crea nuova stima con modello specificato
- Frontend dropdown mostra tutti i modelli disponibili

## Documentazione Correlata

- [Testing Guide](./TESTING_GUIDE.md) - Test E2E per multi-model feature
- [Architecture](../README.md) - Architettura generale del sistema
- [AI Estimation Flow](./AI_ESTIMATION_FLOW.md) - Workflow completo AI

## Change Log

- **2025-01-XX**: Implementazione iniziale funzionalità multi-model
  - Aggiunta configurazione 3 modelli Claude
  - Migration database per campi `model_id` e `model_name`
  - UI admin dashboard con dropdown e comparazione
  - Correzione calcolo costo basato su modello utilizzato
