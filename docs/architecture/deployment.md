# Production Architecture Options - Enterprise VDI Constraints

**Data**: 2026-05-05  
**Context**: Produzione reale con constraint infrastrutturali enterprise

---

## Constraint Reali Identificati

### 1. **VDI Environment** (Virtual Desktop Infrastructure)
- ❌ Niente Docker/Kubernetes locale
- ❌ Probabilmente niente admin rights
- ⚠️ Firewall/proxy aziendale con whitelist restrittiva
- ✅ HTTPS outbound possibile (se whitelisted)

### 2. **Macchina Separata Disponibile**
- ✅ Potrebbe hostare servizi custom
- ❓ Connectivity AWS Bedrock incerta (fuori rete aziendale?)
- ❓ Raggiungibilità da VDI (stesso datacenter? VPN?)

### 3. **AWS Bedrock Requirements**
- Richiede HTTPS outbound a `bedrock-runtime.eu-central-1.amazonaws.com`
- Richiede IAM credentials valide
- Timeout 120s per richiesta
- ~€0.003 per 1K input token, ~€0.015 per 1K output token

---

## Domande Critiche da Verificare

Prima di scegliere architettura, verificare:

### A. Connectivity Test - VDI → AWS
```bash
# Da VDI, testare:
curl -v https://bedrock-runtime.eu-central-1.amazonaws.com
# Possibili risultati:
# ✅ 403 Forbidden = connectivity OK, manca solo auth
# ❌ Timeout/Connection refused = firewall blocca
# ⚠️ 407 Proxy Authentication Required = serve proxy config
```

### B. Connectivity Test - Macchina Separata → AWS
```bash
# Da macchina separata:
curl -v https://bedrock-runtime.eu-central-1.amazonaws.com
# Se funziona qui ma non da VDI = posizionare AI Service qui
```

### C. Connectivity Test - VDI → Macchina Separata
```bash
# Da VDI:
curl -v http://<ip-macchina-separata>:3001/health
# Verificare se firewall interno permette
```

### D. Database Access - Da Macchina Separata
```bash
# Verificare se macchina separata può raggiungere PostgreSQL in VDI
psql -h <vdi-postgres-ip> -U user -d dbname
```

---

## Opzioni Architetturali Pragmatiche

### Opzione 1: **Backend Monolitico in VDI** (Più Semplice)

```
┌─────────────────────── VDI ───────────────────────┐
│                                                    │
│  ┌──────────┐         ┌──────────────┐           │
│  │ Frontend │────────→│   Backend    │           │
│  └──────────┘         │ (NestJS)     │           │
│                       │   +          │           │
│                       │ AI Service   │───────┐   │
│                       │  (merged)    │       │   │
│                       └──────┬───────┘       │   │
│                              │               │   │
│                              ↓               │   │
│                       ┌──────────────┐       │   │
│                       │  PostgreSQL  │       │   │
│                       └──────────────┘       │   │
└────────────────────────────────────────────────┘
                                                │
                                                │ HTTPS
                                                ↓
                                        ┌────────────────┐
                                        │  AWS Bedrock   │
                                        │ (eu-central-1) │
                                        └────────────────┘
```

**Implementazione**:
- Merge `ai-estimation-service` in `backend` come modulo NestJS
- Backend chiama AWS Bedrock direttamente
- Nessun microservice separato

**Pro**:
- ✅ Deployment semplice (un solo servizio)
- ✅ Nessun problema di network tra servizi
- ✅ Transazioni ACID (tutto stesso database)
- ✅ Latency minima (no network hop)
- ✅ Debugging più facile

**Contro**:
- ❌ Dipende da VDI → AWS connectivity
- ❌ Coupling tra backend logic e AI processing
- ❌ Scaling: se AI processa molto, backend rallenta
- ❌ Non aderisce a "microservices" principle

**Quando scegliere**:
- ✅ Se VDI può raggiungere AWS Bedrock
- ✅ Se volume estimations è basso (<100/giorno)
- ✅ Se deployment speed è prioritario

**Effort**: ~2 giorni merge + testing

---

### Opzione 2: **Polling Outbox Pattern** (Message Queue Simulata)

```
┌─────────────────────── VDI ───────────────────────┐
│                                                    │
│  ┌──────────┐         ┌──────────────┐           │
│  │ Frontend │────────→│   Backend    │           │
│  └──────────┘         └──────┬───────┘           │
│                              │                    │
│                              ↓                    │
│                       ┌──────────────┐           │
│                       │  PostgreSQL  │           │
│                       │              │           │
│                       │ outbox_events│←──┐       │
│                       └──────────────┘   │       │
│                                          │       │
└──────────────────────────────────────────┼───────┘
                                           │
                          5s polling       │
                                           │
┌─────── Macchina Separata ────────┐      │
│                                   │      │
│   ┌──────────────────┐           │      │
│   │  AI Service      │───────────┘      │
│   │  (Poller)        │                  │
│   └────────┬─────────┘                  │
│            │                             │
│            ↓ write result                │
│   ┌──────────────────┐                  │
│   │  PostgreSQL      │                  │
│   │  (same DB)       │                  │
│   └──────────────────┘                  │
│                                          │
└──────────────────┬───────────────────────┘
                   │ HTTPS
                   ↓
            ┌────────────────┐
            │  AWS Bedrock   │
            └────────────────┘
```

**Implementazione**:
1. Backend scrive in `outbox_events` table quando quotation creata:
   ```typescript
   await this.db.transaction(async (tx) => {
     await tx.quotation.create(quotationData);
     await tx.outboxEvent.create({
       eventType: 'QuotationCreated',
       aggregateId: quotation.id,
       payload: quotationData,
       status: 'PENDING'
     });
   });
   ```

2. AI Service (macchina separata) polling ogni 5s:
   ```typescript
   setInterval(async () => {
     const events = await db.outboxEvent.findMany({
       where: { status: 'PENDING', eventType: 'QuotationCreated' },
       orderBy: { createdAt: 'asc' },
       take: 10
     });
     
     for (const event of events) {
       await db.outboxEvent.update(event.id, { status: 'PROCESSING' });
       try {
         const result = await processWithBedrock(event.payload);
         await db.aiEstimation.create(result);
         await db.outboxEvent.update(event.id, { status: 'COMPLETED' });
       } catch (error) {
         await db.outboxEvent.update(event.id, { 
           status: 'FAILED',
           retryCount: event.retryCount + 1,
           error: error.message
         });
       }
     }
   }, 5000);
   ```

**Pro**:
- ✅ Backend e AI Service decoupled (temporal decoupling)
- ✅ Retry logic implementabile (contatore retry in outbox)
- ✅ Audit trail completo (outbox events table)
- ✅ Dead letter handling (status FAILED dopo N retry)
- ✅ No RabbitMQ/Kafka dependency
- ✅ Transactional consistency (outbox in stessa transaction)

**Contro**:
- ⚠️ Polling latency (5s ritardo minimo)
- ⚠️ Database diventa message transport (load aggiuntivo)
- ⚠️ Richiede cleanup job per eventi vecchi
- ❌ Macchina separata deve accedere DB VDI (network/security?)

**Quando scegliere**:
- ✅ Se macchina separata può raggiungere PostgreSQL in VDI
- ✅ Se macchina separata può raggiungere AWS Bedrock
- ✅ Se latency 5-10s è accettabile
- ✅ Se vuoi temporal decoupling senza message queue

**Effort**: ~3 giorni implementazione + 1 giorno monitoring/cleanup

---

### Opzione 3: **AWS Lambda + API Gateway** (Cloud-Native)

```
┌─────────────────────── VDI ───────────────────────┐
│                                                    │
│  ┌──────────┐         ┌──────────────┐           │
│  │ Frontend │────────→│   Backend    │           │
│  └──────────┘         └──────┬───────┘           │
│                              │                    │
│                              ↓                    │
│                       ┌──────────────┐           │
│                       │  PostgreSQL  │           │
│                       └──────────────┘           │
│                                                    │
└────────────────────────┼──────────────────────────┘
                         │ HTTPS (whitelisted)
                         ↓
              ┌──────────────────────┐
              │   AWS API Gateway    │
              │  (REST API)          │
              └──────────┬───────────┘
                         │
                         ↓ triggers
              ┌──────────────────────┐
              │   AWS Lambda         │
              │  (AI Processing)     │
              └──────────┬───────────┘
                         │
              ┌──────────┴───────────┐
              │                      │
              ↓                      ↓
    ┌─────────────────┐   ┌─────────────────┐
    │  AWS Bedrock    │   │   Webhook       │
    │  (same region)  │   │   (Backend VDI) │
    └─────────────────┘   └─────────────────┘
```

**Implementazione**:

1. **Backend** pubblica task ad API Gateway:
   ```typescript
   const response = await axios.post(
     'https://<api-id>.execute-api.eu-central-1.amazonaws.com/prod/estimate',
     {
       quotationId: quotation.id,
       quotationData: transformForAI(quotation),
       callbackUrl: 'https://<backend-public-url>/webhooks/ai-estimation'
     },
     {
       headers: { 'x-api-key': process.env.AWS_API_GATEWAY_KEY }
     }
   );
   // Ritorna subito 202 Accepted
   ```

2. **Lambda** processa async:
   ```typescript
   export const handler = async (event) => {
     const { quotationId, quotationData, callbackUrl } = JSON.parse(event.body);
     
     // Process with Bedrock (same region, no network issues)
     const estimation = await bedrockClient.converse({
       modelId: 'eu.anthropic.claude-sonnet-4-5',
       messages: [{ role: 'user', content: generatePrompt(quotationData) }]
     });
     
     // Callback to backend
     await axios.post(callbackUrl, {
       quotationId,
       estimationData: parseResponse(estimation)
     }, {
       headers: { 'x-webhook-secret': process.env.WEBHOOK_SECRET }
     });
     
     return { statusCode: 200 };
   };
   ```

3. **Backend** webhook riceve risultato:
   ```typescript
   @Post('webhooks/ai-estimation')
   async receiveAIEstimation(
     @Body() payload: { quotationId: string; estimationData: any },
     @Headers('x-webhook-secret') secret: string
   ) {
     if (secret !== process.env.WEBHOOK_SECRET) throw new UnauthorizedException();
     
     await this.aiEstimationService.saveEstimation(payload.quotationId, payload.estimationData);
     return { received: true };
   }
   ```

**Pro**:
- ✅ **AWS → AWS connectivity garantita** (Bedrock sempre raggiungibile)
- ✅ Scaling automatico (Lambda scale to zero)
- ✅ Retry built-in (Lambda retry policy + DLQ)
- ✅ Nessuna infra da mantenere (serverless)
- ✅ Pay-per-use (costo solo quando processa)
- ✅ Timeout gestiti da AWS (max 15min Lambda)

**Contro**:
- ❌ Richiede backend pubblicamente raggiungibile (webhook)
- ❌ Cold start Lambda (~1-3s primo invocazione)
- ❌ Costo AWS aggiuntivo (Lambda + API Gateway)
- ⚠️ Complexity: deploy Lambda, IAM roles, API Gateway config

**Quando scegliere**:
- ✅ Se VDI non può raggiungere AWS Bedrock direttamente
- ✅ Se backend può esporre webhook pubblico (o via API Gateway ingress)
- ✅ Se scalabilità è importante (spike di quotations)
- ✅ Se budget permette costo cloud aggiuntivo

**Effort**: ~4 giorni (setup AWS infra + Lambda + webhook) + 1 giorno monitoring

**Costo stimato**:
- API Gateway: $3.50 per 1M requests
- Lambda: $0.20 per 1M requests + $0.0000166667 per GB-second
- Per 1000 estimations/mese con 120s processing: ~$5/mese
- Bedrock costa molto di più (~$50-100/mese per 1000 estimations)

---

### Opzione 4: **Hybrid - AI Service su Macchina + HTTP Resiliente**

**Mantieni architettura attuale MA**:
- Implementa circuit breaker (Hystrix pattern)
- Implementa retry exponential backoff
- Implementa idempotency keys
- Implementa compensation saga

```typescript
// Backend con resilienza
class ResilientAIClient {
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000
  });
  
  async requestEstimation(quotation: Quotation): Promise<void> {
    const idempotencyKey = `estimation-${quotation.id}-${Date.now()}`;
    
    await retry(async () => {
      if (this.circuitBreaker.isOpen()) {
        throw new ServiceUnavailableException('AI Service circuit breaker open');
      }
      
      try {
        await this.httpService.post('/api/estimation/process', {
          quotationId: quotation.id,
          idempotencyKey,
          quotationData: transform(quotation)
        }, {
          timeout: 60000,
          headers: { 'x-idempotency-key': idempotencyKey }
        });
        
        this.circuitBreaker.recordSuccess();
      } catch (error) {
        this.circuitBreaker.recordFailure();
        throw error;
      }
    }, {
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 10000
    });
  }
}
```

**Pro**:
- ✅ Minimo refactor (architettura attuale rimane)
- ✅ Resilienza migliorata
- ✅ Production-ready se connectivity stabile

**Contro**:
- ⚠️ Still dipende da connectivity VDI → Macchina → AWS
- ⚠️ Non risolve problema se connectivity è instabile
- ⚠️ Circuit breaker aperto = nessuna stima generata

**Quando scegliere**:
- ✅ Se connectivity test sono OK
- ✅ Se vuoi minimal disruption
- ✅ Come step intermedio verso altra opzione

**Effort**: ~2 giorni

---

## Decision Matrix

| Criterio | Opt1: Monolith | Opt2: Outbox | Opt3: Lambda | Opt4: Hybrid |
|----------|---------------|--------------|--------------|--------------|
| **VDI→AWS required** | ✅ Sì | ❌ No | ⚠️ Solo HTTPS | ✅ Sì |
| **Macchina separata→AWS** | ❌ No | ✅ Sì | ❌ No | ✅ Sì |
| **Backend pubblico** | ❌ No | ❌ No | ✅ Sì (webhook) | ❌ No |
| **DB access da ext** | ❌ No | ✅ Sì | ❌ No | ❌ No |
| **Complexity** | 🟢 Bassa | 🟡 Media | 🔴 Alta | 🟡 Media |
| **Scalability** | 🔴 Bassa | 🟡 Media | 🟢 Alta | 🟡 Media |
| **Cost** | 🟢 $0 | 🟢 $0 | 🟡 ~$5/mese | 🟢 $0 |
| **Resilience** | 🔴 Bassa | 🟢 Alta | 🟢 Alta | 🟡 Media |
| **Effort** | 🟢 2d | 🟡 4d | 🔴 5d | 🟢 2d |

---

## Raccomandazione per Tuo Scenario

### Step 1: **Verifica Connectivity**

```bash
# Script di test da eseguire
cd "C:/Users/J18331-CyberArk/IdeaProjects/Portale-Quotazioni3.0"

# Test 1: VDI → AWS Bedrock
node test-connectivity-vdi-aws.js

# Test 2: Macchina separata → AWS Bedrock
# (copiare script su macchina separata e eseguire)

# Test 3: VDI → Macchina separata
node test-connectivity-vdi-machine.js

# Test 4: Macchina separata → PostgreSQL VDI
# (da macchina separata)
```

### Step 2: **Decision Tree**

```
VDI può raggiungere AWS Bedrock?
│
├─ ✅ SÌ
│   └─→ Opzione 1 (Monolith) - più semplice, nessun microservice
│       └─ Upgrade futuro: Opzione 4 (Hybrid) se serve scaling
│
└─ ❌ NO
    │
    ├─ Macchina separata può raggiungere AWS?
    │   │
    │   ├─ ✅ SÌ
    │   │   │
    │   │   └─ Macchina può accedere DB VDI?
    │   │       │
    │   │       ├─ ✅ SÌ → Opzione 2 (Outbox Polling)
    │   │       │
    │   │       └─ ❌ NO → Opzione 3 (Lambda) se backend può esporre webhook
    │   │
    │   └─ ❌ NO
    │       └─→ Opzione 3 (Lambda) - unica soluzione
    │           └─ Richiede: backend webhook pubblico
    │               (API Gateway ingress + authentication)
```

### Step 3: **Quick Win per Produzione**

**Implementazione rapida** (indipendente da decision finale):

1. ✅ Aggiungi idempotency a `/ai-estimation/generate`:
   ```typescript
   @Post('generate')
   async generateEstimation(
     @Body() dto: GenerateEstimationDto,
     @Headers('x-idempotency-key') idempotencyKey: string
   ) {
     if (!idempotencyKey) throw new BadRequestException('x-idempotency-key required');
     
     const existing = await this.redis.get(`idempotency:${idempotencyKey}`);
     if (existing) return JSON.parse(existing);
     
     const result = await this.doGenerateEstimation(dto);
     await this.redis.setex(`idempotency:${idempotencyKey}`, 86400, JSON.stringify(result));
     return result;
   }
   ```

2. ✅ Rimuovi @Public(), aggiungi service authentication:
   ```typescript
   @UseGuards(ServiceAuthGuard)
   @Post('generate')
   ```

3. ✅ Aggiungi timeout/retry al fire-and-forget:
   ```typescript
   await retry(
     () => this.httpService.post(url, data, { timeout: 60000 }).toPromise(),
     { retries: 3, factor: 2 }
   );
   ```

4. ✅ Aggiungi monitoring/alerting per failed estimations:
   ```typescript
   if (estimationFailed) {
     await this.notificationService.alertAdmin({
       type: 'AI_ESTIMATION_FAILED',
       quotationId,
       reason: error.message
     });
   }
   ```

**Questi fix proteggono produzione indipendentemente da scelta architetturale finale.**

---

## Prossimi Passi Concreti

1. **Oggi**: Esegui connectivity tests (fornisco script)
2. **Domani**: Decision su architettura basata su risultati test
3. **Settimana 1**: Implementa quick wins (idempotency, auth, retry)
4. **Settimana 2-3**: Refactor verso architettura scelta
5. **Settimana 4**: Load testing e deployment produzione

Vuoi che prepari gli script di connectivity test?
