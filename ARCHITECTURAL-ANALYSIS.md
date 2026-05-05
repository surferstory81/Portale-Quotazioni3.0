# Architectural Analysis - Portale Quotazioni 3.0

**Data**: 2026-05-05  
**Contesto**: Revisione critica architettura HTTP dopo problematiche RabbitMQ in locale

---

## Executive Summary

L'architettura attuale presenta **contraddizioni fondamentali** tra principi dichiarati (microservizi distribuiti) e implementazione reale (monolite distribuito con coupling sincrono forte).

**Criticità principale**: Siamo passati da un problema locale (RabbitMQ non funzionante) a una soluzione strutturale (HTTP sincrono) che **viola i principi dei sistemi distribuiti** documentati nelle skill.

---

## Problemi Architetturali Identificati

### 1. **Violazione dei Principi Microservizi**

**Skill `microservice-interaction-auditor.md` dichiara**:
- "Never assume service-to-service communication is cheap or reliable"
- Mandatory evaluation: timeouts, retries, circuit breakers, idempotency
- Explicit acceptance of eventual consistency

**Implementazione attuale**:
```typescript
// Backend → AI Service (fire-and-forget)
async requestQuotationProcessing(request: QuotationProcessRequest): Promise<void> {
  firstValueFrom(
    this.httpService.post(`${this.aiServiceUrl}/api/estimation/process`, request, {
      timeout: 60000, // ✅ timeout presente
    }),
  ).catch((error) => {
    this.logger.error(`Failed to request AI processing: ${error.message}`);
  });
  // ❌ Fire-and-forget: nessuna garanzia di consegna
  // ❌ Nessuna retry logic
  // ❌ Nessuna deduplication
  // ❌ Silenzioso failure - l'errore viene loggato ma non gestito
}
```

**Problema**: Fire-and-forget HTTP non è un sostituto valido per message queue. Perdiamo:
- Persistenza del messaggio
- Retry automatico
- Dead letter queue
- Ordinamento garantito
- Backpressure

### 2. **Database Come Comunicazione Tra Servizi**

**Pattern attuale**:
```
Backend → AI Service → Backend (HTTP GET /quotations/:id) → Database
                    ↓
         Backend (HTTP POST /ai-estimation/generate) → Database
```

**Problema**: AI Service chiama il backend per leggere i dati della quotation, poi il backend per salvare il risultato. Questo è un **anti-pattern distribuito**:
- AI Service è **temporalmente accoppiato** al backend (deve essere up)
- Se backend è down, AI Service fallisce anche se AWS Bedrock è up
- Database diventa punto di coupling invece di boundary

**Alternative migliori**:
1. **Event-driven con outbox pattern**: Backend pubblica evento `QuotationCreated` con payload completo
2. **Saga orchestrata**: Backend orchestra il workflow, AI Service è stateless
3. **CQRS**: AI Service ha read model dedicato (eventual consistency acceptable)

### 3. **Endpoints @Public() Come Security Risk**

**Implementazione**:
```typescript
@Public()
@Get('/quotations/:id')
async getQuotationById(@Param('id') id: string) { ... }
```

**Problema**: Bypass JWT per service-to-service = **zero trust violato**
- Nessuna autenticazione tra servizi
- Chiunque può chiamare `/quotations/:id` senza credenziali
- Service token in header ignorato dal guard

**Skill `microservice-interaction-auditor.md` requirement**:
- "Identity-based trust (not network-based)"
- "Zero Trust assumptions inside the cluster"

**Soluzione corretta**: Service-to-service authentication con:
- Mutual TLS (mTLS)
- Service tokens validati (JWT con audience specifica)
- API Gateway con service mesh (Istio/Linkerd)

### 4. **Mancanza di Idempotency**

```typescript
async generateEstimation(quotationId: string, estimationData: EstimationData) {
  const existingEstimation = await this.aiEstimationRepo.findOne({ where: { quotationId } });
  
  if (existingEstimation) {
    return this.aiEstimationRepo.update(existingEstimation.id, { estimationData, ... });
  }
  
  return this.aiEstimationRepo.save(new AIEstimation({ quotationId, estimationData, ... }));
}
```

**Problema**: 
- Nessun idempotency key
- Race condition possibile se due chiamate arrivano simultaneamente
- Update sovrascrive dati senza merge logic

**Skill requirement**: "Idempotent operations where side effects exist"

### 5. **Export Feature in Wrong Service**

**Decisione presa**: Export vive in `ai-estimation-service` perché "owner dei dati"

**Analisi critica**:
- ✅ **Pro**: Separazione responsabilità, data ownership
- ❌ **Contro**: Export è **presentazione**, non business logic
  - PDF/Excel generation = UI concern, non domain logic
  - AI Service dovrebbe essere stateless computation engine
  - Export accoppia AI Service a frontend requirements (layout, styling)

**Pattern corretto**: Export in **BFF (Backend For Frontend)** separato o in **API Gateway layer**
- AI Service espone solo dati grezzi (JSON)
- Export service consuma API AI Service e genera formati visuali
- Permette versioning indipendente di formati export senza deploy AI Service

### 6. **Coupling Circolare Backend ↔ AI Service**

```
Backend → AI Service (POST /api/estimation/process)
   ↑           ↓
   └───────────┘ (GET /quotations/:id)
                 (POST /ai-estimation/generate)
```

**Problema**: Circular dependency
- AI Service dipende da backend per input/output
- Backend dipende da AI Service per processing
- Impossibile deployare/testare servizi indipendentemente

**Anti-pattern distribuito**: Nessun servizio può evolversi autonomamente

### 7. **Mancanza di Compensating Actions**

**Scenario fallimento**:
1. Backend chiama AI Service → 200 OK
2. AI Service processa quotation → genera stima
3. AI Service chiama backend `/ai-estimation/generate` → **500 Error** (DB down)
4. **Risultato**: Stima persa, nessuna retry, nessun rollback

**Skill requirement**: "Saga or compensating actions when needed"

**Implementazione attuale**: ❌ Nessuna saga, nessun compensazione

---

## Problemi Con Gli Hook

**Hook attuali** (`.claude/settings.local.json`):
```json
{
  "permissions": {
    "allow": [
      "Bash(kubectl get *)",
      "Bash(git checkout *)",
      "Bash(npm install *)"
    ]
  }
}
```

**Analisi**:
- ❌ **Nessun hook pre-commit** per validare architettura
- ❌ **Nessun hook per applicare skill `microservice-interaction-auditor.md`** automaticamente
- ❌ **Permissions-based, non validation-based**: Approvo comandi, non verifico qualità

**Problema concettuale**: Hook pensati per workflow developer (git, npm), non per governance architetturale.

**Skill dichiara**: "This skill MUST be applied implicitly in every session, hook, and response"

**Realtà**: Nessun hook implementa questa policy.

---

## Architettura Ideale vs Implementata

### Ideale (da skill `backend.md`, `microservice-interaction-auditor.md`)

```
┌──────────────┐
│   Frontend   │
└──────┬───────┘
       │ HTTPS/JWT
       ↓
┌──────────────┐     Event Bus (RabbitMQ/Kafka)
│   Backend    │────────────┐
│   (API GW)   │            │
└──────────────┘            ↓
                    ┌───────────────────┐
                    │  AI Service       │
                    │  (Event Consumer) │
                    └───────────────────┘
                            │
                            ↓ (writes results)
                    ┌───────────────────┐
                    │   Database        │
                    └───────────────────┘

Caratteristiche:
- Async communication (event-driven)
- Temporal decoupling
- Independent scalability
- Retry/DLQ built-in
- Service autonomy
```

### Implementata (versione 3.0 HTTP)

```
┌──────────────┐
│   Frontend   │
└──────┬───────┘
       │ HTTPS/JWT
       ↓
┌──────────────┐    HTTP fire-and-forget
│   Backend    │────────────┐
└──────┬───────┘            │
       │                    ↓
       │            ┌───────────────────┐
       │            │  AI Service       │
       │            └────┬──────────────┘
       │                 │
       │ @Public()       │ @Public()
       └─────────────────┘
                         │
                         ↓
                 ┌───────────────────┐
                 │   Database        │
                 │   (shared access) │
                 └───────────────────┘

Problemi:
- Sync coupling (fire-and-forget non risolve)
- Circular dependency
- @Public() bypassa security
- Database = communication channel
- Nessuna saga/compensation
```

---

## Giustificazione Storica vs Debito Tecnico

**Motivazione originale** (CLAUDE.md):
> "Questa è la versione 3.0 con architettura HTTP. La versione 2.0 con RabbitMQ è mantenuta separatamente per compatibilità con ambienti che richiedono message broker."

**Analisi**:
- ✅ **Valido per sviluppo locale**: RabbitMQ complesso in ambiente Windows/WSL
- ❌ **NON valido per produzione**: Kubernetes ha operator RabbitMQ/Kafka nativi
- ❌ **Confonde ambiente di sviluppo con architettura target**

**Debito tecnico accumulato**:
1. Fire-and-forget HTTP mascherato da "async" (non lo è)
2. Security bypassed con @Public()
3. Export logic in servizio sbagliato
4. Circular dependency non risolvibile senza refactor

---

## Rischio Production

**Scenario reale di fallimento**:

1. **AI Service down per deploy**
   - Backend chiama POST /api/estimation/process → timeout 60s
   - Fire-and-forget "succeeds" (catch ignora errore)
   - **Utente vede quotation "In valutazione" ma nessuna stima mai generata**
   - Nessun retry, nessuna notifica admin

2. **Backend database spike latency**
   - AI Service chiama GET /quotations/:id → timeout
   - AWS Bedrock già consumato (costo addebitato)
   - **Stima generata ma non salvata**
   - Nessuna compensazione

3. **Network partition temporaneo**
   - AI Service isolato, continua a processare
   - Backend risponde 503 a tutte le richieste
   - **Fire-and-forget fallisce silenziosamente**
   - Quotations rimangono in "Inviata" indefinitamente

**Skill `microservice-interaction-auditor.md`**:
> "All systems are: distributed, partially failing, affected by latency, retries, and data inconsistency"

**Implementazione attuale**: ❌ Nessuna protezione contro questi scenari

---

## Raccomandazioni Architetturali

### Opzione A: Tornare a Message Queue (Consigliata)

**Implementazione**:
1. **Docker Compose per sviluppo locale**: RabbitMQ + PostgreSQL
2. **Kubernetes operator per produzione**: RabbitMQ Cluster Operator
3. **Pattern**: Transactional Outbox + Consumer con retry

**Vantaggi**:
- ✅ Allineato con skill microservizi
- ✅ Retry/DLQ nativi
- ✅ Temporal decoupling
- ✅ Scalabilità indipendente
- ✅ Audit trail built-in (message log)

**Sforzo**: ~3 giorni refactor

### Opzione B: Hybrid con Saga Orchestration

**Implementazione**:
1. Backend mantiene HTTP sincrono
2. Implementa Saga orchestrator per workflow AI
3. Compensation actions per rollback

**Vantaggi**:
- ✅ Gestione fallimenti esplicita
- ✅ No message queue dependency
- ✅ Transaction management chiaro

**Svantaggi**:
- ⚠️ Complessità orchestrazione custom
- ⚠️ Still sync coupling

**Sforzo**: ~2 giorni

### Opzione C: Service Mesh + Retry Logic

**Implementazione**:
1. Deploy Istio/Linkerd
2. Retry policy a livello mesh
3. Circuit breaker automatico
4. mTLS per security

**Vantaggi**:
- ✅ Infrastruttura gestisce resilienza
- ✅ Security risolta (mTLS)
- ✅ Observability built-in

**Svantaggi**:
- ⚠️ Operational complexity
- ⚠️ Non risolve idempotency/saga

**Sforzo**: ~4 giorni (learning curve)

---

## Raccomandazioni Skill & Hook

### Skill Updates

1. **`microservice-interaction-auditor.md`**:
   - ❌ Attualmente IGNORED in implementazione
   - ✅ Dovrebbe essere **blocking pre-commit hook**
   - Aggiungere checklist automatica per ogni service interaction

2. **`backend.md`**:
   - Rimuovere ambiguità "microservices" vs implementazione monolitica distribuita
   - Esplicitare: "Communication: Event-driven via message queue" (non "REST APIs")
   - REST APIs solo per Frontend → Backend

3. **Nuova skill necessaria**: `service-communication-patterns.md`
   - Definire quando usare sync vs async
   - Pattern saga/outbox/CQRS
   - Security service-to-service

### Hook Proposal

```json
{
  "hooks": {
    "pre-commit": {
      "command": "node .claude/hooks/validate-architecture.js",
      "description": "Valida che modifiche rispettino principi microservizi"
    },
    "pre-push": {
      "command": "node .claude/hooks/check-service-coupling.js",
      "description": "Verifica assenza circular dependencies"
    }
  }
}
```

**Script hook esempio** (`validate-architecture.js`):
- Parse git diff per file modificati
- Se tocca `src/modules/*service.ts`, verifica:
  - ✅ Timeout esplicito su HTTP calls
  - ✅ Retry logic presente
  - ✅ Idempotency key per side effects
  - ❌ Blocca commit se mancanti

---

## Conclusioni

### Domande da Risolvere

1. **Priorità**: Questo è un progetto didattico o production-ready?
   - Se didattico: HTTP sincrono accettabile (con disclaimer)
   - Se production: **MUST** tornare a message queue

2. **Ambiente target**: Kubernetes production o solo local dev?
   - Se Kubernetes: message queue operator è triviale
   - Se local-only: Docker Compose risolve problema RabbitMQ

3. **Risk appetite**: Accettiamo silent failures?
   - Se no: message queue mandatory
   - Se sì: documentare esplicitamente limitazioni

### Raccomandazione Finale

**Per un progetto production-grade con governance finanziaria**:

1. ✅ **Opzione A (Message Queue)** è l'unica architetturalmente corretta
2. ✅ Implementare hook validation per enforcement skill
3. ✅ Refactor export fuori da AI Service
4. ✅ Rimuovere @Public(), implementare service authentication
5. ✅ Aggiungere saga pattern o compensation actions

**Effort totale stimato**: ~5 giorni refactor + 2 giorni testing

**ROI**: Evita incident production, allinea con skill dichiarate, permette scaling reale.

---

**Nota**: Questa analisi applica rigorosamente `microservice-interaction-auditor.md` come richiesto dalla skill stessa. Non è "purismo architetturale" ma **risk mitigation** per sistemi distribuiti.
