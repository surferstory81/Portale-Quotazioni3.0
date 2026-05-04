# AI Estimation Service

Microservizio per la generazione automatica di stime di costo tramite AWS Bedrock (Claude).

## Architettura

```
Quotation Created → RabbitMQ → AI Service → Estimation → Validation → Backend API
```

Il servizio:
1. Consuma eventi `quotation.created` da RabbitMQ
2. Genera una stima usando Bedrock (Estimation Agent)
3. Valida la stima (Validation Agent)
4. Salva i risultati tramite API del backend

## Dipendenze

- **AWS Bedrock**: Claude Sonnet 4.5 per generazione stime (Converse API)
- **Backend API**: per salvare estimation e validation via HTTP
- **Knowledge Base**: 5 file markdown con dati di costo

**Note**: Usa Converse API (seconda generazione) invece di InvokeModel per supporto nativo di tool use e multi-turn conversations.

## Struttura

```
ai-estimation-service/
├── src/
│   ├── agents/              # Estimation e Validation agents
│   ├── bedrock/             # Client AWS Bedrock con circuit breaker
│   ├── knowledge/           # Loader per knowledge base
│   ├── queue/               # Consumer RabbitMQ + Backend API client
│   ├── config/              # Configurazione
│   └── main.ts
├── prompts/                 # Prompt files per agenti (optional)
├── Dockerfile
├── package.json
└── README.md
```

## Configurazione

### Environment Variables

Vedere `.env.example` per tutte le variabili disponibili.

**Essenziali**:
- `AWS_REGION`: regione AWS (es. eu-west-1)
- `AWS_BEDROCK_MODEL_ID`: ID modello Claude
- `BACKEND_API_URL`: URL backend core
- `BACKEND_SERVICE_TOKEN`: token autenticazione
- `RABBITMQ_URL`: connessione RabbitMQ
- `KNOWLEDGE_BASE_PATH`: path ai file markdown

**AWS Credentials**:
- Metodo 1 (raccomandato): IAM Role (EKS ServiceAccount annotation)
- Metodo 2: `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`

### Knowledge Base

I file devono essere montati in `/app/knowledge` (ConfigMap su Kubernetes):

- `infrastructure-costs.md`
- `software-licenses.md`
- `professional-services.md`
- `pricing-rules.md`
- `validation-thresholds.md`

Source: `.claude/knowledge/` nel repository principale.

## Build

### Local Development

```bash
npm install
npm run start:dev
```

Health check: http://localhost:3001/health

### Docker

```bash
docker build -t ai-estimation-service:latest .
docker run -p 3001:3001 \
  -e AWS_REGION=eu-west-1 \
  -e RABBITMQ_URL=amqp://user:pass@rabbitmq:5672 \
  -e BACKEND_API_URL=http://backend:3000 \
  -v $(pwd)/.claude/knowledge:/app/knowledge \
  ai-estimation-service:latest
```

### Kubernetes

```bash
# Build e push
docker build -t ghcr.io/surferstory81/portale-quotazioni/ai-estimation-service:latest .
docker push ghcr.io/surferstory81/portale-quotazioni/ai-estimation-service:latest

# Deploy (include RabbitMQ)
kubectl apply -f k8s/ai-estimation-all-in-one.yaml
```

## Deployment

### Prerequisites

1. **RabbitMQ running**:
   ```bash
   kubectl get pods -n portale-quotazioni -l app=rabbitmq
   ```

2. **Backend API accessible**:
   ```bash
   kubectl get svc -n portale-quotazioni backend
   ```

3. **AWS credentials configured**:
   - Secret `aws-credentials` creato
   - O ServiceAccount con IAM role annotation

4. **Knowledge Base ConfigMap**:
   ```bash
   kubectl get configmap ai-knowledge-base -n portale-quotazioni
   ```

### Step-by-Step

1. **Crea secrets**:
   ```bash
   # AWS credentials
   kubectl create secret generic aws-credentials \
     --from-literal=AWS_ACCESS_KEY_ID=xxx \
     --from-literal=AWS_SECRET_ACCESS_KEY=yyy \
     -n portale-quotazioni

   # Backend service token
   kubectl create secret generic ai-estimation-secrets \
     --from-literal=BACKEND_SERVICE_TOKEN=change-me \
     -n portale-quotazioni

   # RabbitMQ credentials
   kubectl create secret generic rabbitmq-credentials \
     --from-literal=username=portale-quotazioni \
     --from-literal=password=change-me \
     -n portale-quotazioni
   ```

2. **Crea ConfigMap knowledge base**:
   ```bash
   kubectl create configmap ai-knowledge-base \
     --from-file=infrastructure-costs.md=.claude/knowledge/infrastructure-costs.md \
     --from-file=software-licenses.md=.claude/knowledge/software-licenses.md \
     --from-file=professional-services.md=.claude/knowledge/professional-services.md \
     --from-file=pricing-rules.md=.claude/knowledge/pricing-rules.md \
     --from-file=validation-thresholds.md=.claude/knowledge/validation-thresholds.md \
     -n portale-quotazioni
   ```

3. **Deploy tutto**:
   ```bash
   kubectl apply -f k8s/ai-estimation-all-in-one.yaml
   ```

4. **Verifica deployment**:
   ```bash
   kubectl get pods -n portale-quotazioni -l app=ai-estimation-service
   kubectl logs -n portale-quotazioni -l app=ai-estimation-service -f
   ```

## Monitoring

### Health Checks

- **Liveness**: `GET /health`
- **Readiness**: `GET /health/ready` (fails se circuit breaker aperto)

### Metrics

Check logs per:
- Bedrock request latency
- Circuit breaker status
- RabbitMQ message processing
- Estimation generation time

### Circuit Breaker

Il servizio implementa un circuit breaker per Bedrock:
- Threshold: 5 fallimenti consecutivi
- Timeout: 60 secondi
- Status: `GET /health` mostra stato circuito

Se il circuito è aperto, le stime non vengono generate e le quotazioni vanno in stato AI_NEEDS_REVIEW.

## Testing

### Unit Tests

```bash
npm test
```

### Integration Test (con mocked Bedrock)

TODO: Implementare mock di Bedrock per test end-to-end.

### Manual Test

1. Crea quotazione via backend API
2. Verifica evento pubblicato su RabbitMQ:
   ```bash
   kubectl exec -it rabbitmq-0 -n portale-quotazioni -- \
     rabbitmqadmin get queue=ai-estimation-queue
   ```
3. Check logs AI service:
   ```bash
   kubectl logs -n portale-quotazioni -l app=ai-estimation-service -f
   ```
4. Verifica stima salvata:
   ```bash
   curl http://backend:3000/ai-estimation/quotation/<id>
   ```

## Troubleshooting

### Servizio non parte

```bash
kubectl describe pod -n portale-quotazioni -l app=ai-estimation-service
kubectl logs -n portale-quotazioni -l app=ai-estimation-service
```

Problemi comuni:
- Secret AWS mancanti o errati
- ConfigMap knowledge base non montato
- RabbitMQ non raggiungibile
- Backend API non risponde

### Bedrock non risponde

Check circuit breaker:
```bash
curl http://ai-estimation-service:3001/health
```

Se `circuitBreaker.open = true`, attendere 60s per reset automatico.

### RabbitMQ queue depth in crescita

```bash
kubectl exec -it rabbitmq-0 -n portale-quotazioni -- \
  rabbitmqctl list_queues -p / name messages
```

Possibili cause:
- AI service crashato o lento
- Bedrock throttling
- Backend API non raggiungibile

## Scaling

### Horizontal Pod Autoscaler

HPA configurato automaticamente:
- Min replicas: 1
- Max replicas: 3
- Target CPU: 70%
- Target Memory: 80%

### Manual Scaling

```bash
kubectl scale deployment ai-estimation-service -n portale-quotazioni --replicas=3
```

## Security

### Service Token

Il servizio usa un token JWT per autenticarsi con il backend:
```
Authorization: Bearer <BACKEND_SERVICE_TOKEN>
X-Service-Name: ai-estimation-service
```

Il backend deve validare il token e verificare che venga da un servizio autorizzato.

### IAM Role (AWS EKS)

Metodo raccomandato per accesso Bedrock:

1. Crea IAM role con policy Bedrock:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": "bedrock:InvokeModel",
       "Resource": "arn:aws:bedrock:eu-west-1::foundation-model/anthropic.claude-*"
     }]
   }
   ```

2. Annota ServiceAccount:
   ```yaml
   metadata:
     annotations:
       eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/ai-estimation-bedrock-role
   ```

3. Pod assume automaticamente il ruolo (no secret credentials).

## Cost Optimization

### Bedrock Costs

- Model: Claude Sonnet 4.5
- Input: ~10K tokens per estimation (knowledge base + quotation data)
- Output: ~5K tokens per estimation + validation
- **Prompt Caching**: Knowledge base (~10K tokens) cached at 90% discount
- Costo stimato: 
  - First quotation: ~€0.05
  - Subsequent (within 5min): ~€0.016 (~68% savings)

Con 100 quotazioni/mese in batch: ~€2/mese di costi Bedrock (vs €5 senza cache).

### Resource Requests

- CPU: 500m (scalabile a 1000m)
- Memory: 512Mi (scalabile a 1Gi)
- Costo compute (EKS): ~€40/mese con 1 replica

**Totale**: ~€45/mese per gestire 100 quotazioni.

## Maintenance

### Knowledge Base Updates

Quando i costi cambiano:

1. Aggiorna file in `.claude/knowledge/`
2. Ricarica ConfigMap:
   ```bash
   kubectl create configmap ai-knowledge-base \
     --from-file=... \
     --dry-run=client -o yaml | kubectl apply -f -
   ```
3. Restart pod per ricaricare:
   ```bash
   kubectl rollout restart deployment/ai-estimation-service -n portale-quotazioni
   ```

### Prompt Updates

Se serve modificare il comportamento degli agenti:

1. Crea file prompt:
   - `prompts/estimation-agent-prompt.md`
   - `prompts/validation-agent-prompt.md`

2. Mount come ConfigMap o rebuild immagine

3. Agents caricano prompt da file al boot

## Roadmap

### v1.1
- [x] ✅ Migrato a Converse API (supporto nativo tool use + multi-turn)
- [x] ✅ Implementato prompt caching (riduce costi 90% su knowledge base)
- [ ] Aggiungere retry logic con exponential backoff
- [ ] Metrics export (Prometheus)
- [ ] Cache hit rate tracking

### v1.2
- [ ] Support per modelli alternativi (Haiku per stime veloci)
- [ ] Batch processing per quotazioni multiple
- [ ] Feedback loop per migliorare confidence scoring
- [ ] Tool use: integrare API vendor per prezzi live (AWS, Azure pricing APIs)

### v2.0
- [ ] Agent autonomo che richiede chiarimenti all'utente (multi-turn via Converse)
- [ ] Integration con vendor APIs per prezzi live
- [ ] ML model per cost prediction
- [ ] Streaming responses (ConverseStream) per UX real-time

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-28  
**Maintainer**: CTO Team
