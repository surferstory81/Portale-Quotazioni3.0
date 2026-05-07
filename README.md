# Portale Quotazioni Infrastrutturali

[![Version](https://img.shields.io/badge/version-3.0.2-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E.svg)](https://nestjs.com/)
[![Angular](https://img.shields.io/badge/Angular-17.x-DD0031.svg)](https://angular.io/)
[![AWS Bedrock](https://img.shields.io/badge/AWS%20Bedrock-Claude%204.5-FF9900.svg)](https://aws.amazon.com/bedrock/)

Applicazione web interna per la gestione e valutazione delle richieste di costo per progetti IT e infrastrutturali. Permette alle Business Unit di sottomettere proposte di investimento al Comitato degli Investimenti tramite il processo di valutazione dell'area CTO.

**Versione corrente**: 3.0.2 — Architettura HTTP-based con AI cost estimation

---

## 🚀 Quick Start

```bash
# 1. Clone repository
git clone <repo-url>
cd Portale-Quotazioni3.0

# 2. Setup local Kubernetes cluster
./scripts/kind-deploy.sh

# 3. Configure /etc/hosts
echo "127.0.0.1  portale-quotazioni.local" | sudo tee -a /etc/hosts

# 4. Access application
open http://portale-quotazioni.local
# Login: admin@quotazioni.local / Admin@2024!
```

---

## ✨ Features

### User Features
- **Quotation submission**: Submit IT/infrastructure project cost requests via web form
- **Draft system**: Save incomplete quotations with auto-save every 5 seconds
- **Status tracking**: Real-time visibility of quotation evaluation progress
- **Resubmission**: Modify and resubmit rejected quotations
- **Login options**: Authenticate with email or matricola

### Admin Features
- **AI-powered estimations**: Automatic cost estimation via AWS Bedrock Claude Sonnet 4.5
- **Token tracking**: Monitor AI consumption (input/output tokens, cost in USD)
- **Validation insights**: View AI validation issues with severity levels (HIGH/MEDIUM/LOW)
- **Manual override**: Approve/reject AI estimations or set manual CAPEX/OPEX values
- **Flexible pagination**: View 10/20/50 or all quotations
- **Retry AI estimations**: Manually retry failed AI generations
- **PDF/Excel export**: Export detailed cost breakdowns

### Technical Features
- **HTTP microservices**: Direct communication between backend and AI service (no message broker)
- **Circuit breaker**: Auto-recovery after AWS Bedrock failures
- **Auto-refresh UI**: Real-time updates without manual page refresh
- **Observability**: Integrated Loki + Grafana for log analysis
- **Comprehensive testing**: 253 tests across backend and frontend

---

## Struttura repository

```
Portale-Quotazioni3.0/
├── backend/              ← API NestJS + PostgreSQL
│   ├── src/              ← sorgenti applicazione
│   ├── test/             ← test E2E (Supertest)
│   ├── Dockerfile
│   └── package.json
├── frontend/             ← SPA Angular 17
│   ├── src/              ← sorgenti applicazione
│   ├── karma.conf.js
│   ├── Dockerfile
│   └── package.json
├── ai-estimation-service/ ← Microservice NestJS per AI (AWS Bedrock)
│   ├── src/              ← sorgenti applicazione
│   ├── knowledge/        ← base di conoscenza per AI
│   ├── Dockerfile
│   └── package.json
├── k8s/
│   └── all-in-one.yaml   ← manifest Kubernetes (namespace, secrets, deployments, ingress)
├── CLAUDE.md             ← documentazione tecnica per Claude
└── README.md
```

**Differenze rispetto alla 2.0**:
- ❌ Rimosso RabbitMQ e message broker
- ✅ Comunicazione HTTP diretta Backend ↔ AI Service
- ✅ Fire-and-forget pattern per operazioni asincrone
- ✅ Endpoint pubblici con @Public() decorator per service-to-service calls
- ✅ Admin pagination (10/20/50/All quotations)
- ✅ Retry AI estimation button

---

## Prerequisiti

- **Docker Desktop** con kind installato
- **kubectl** configurato
- **Node.js** 20+
- **npm** 9+

---

## Setup locale con kind

### 1. Prima installazione

```bash
# Crea cluster kind + deploy completo
./scripts/kind-deploy.sh

# Aggiungi a /etc/hosts (o C:\Windows\System32\drivers\etc\hosts su Windows):
127.0.0.1  portale-quotazioni.local
127.0.0.1  grafana.portale-quotazioni.local
```

### 2. Aggiornamento dopo modifiche al codice

```bash
# Rebuild immagini e redeploy
./scripts/kind-deploy.sh

# Oppure, solo push senza rebuild:
./scripts/kind-deploy.sh --skip-build
```

### 3. Build e push su GHCR

```bash
# Build con tag SHA automatico + push a GHCR
./scripts/build-push.sh

# Oppure con tag manuale:
./scripts/build-push.sh v1.2.0
```

---

## Accesso all'applicazione

| Risorsa | URL |
|---|---|
| Portale | `http://portale-quotazioni.local` |
| Grafana | `http://grafana.portale-quotazioni.local` |

Credenziali admin di default (da cambiare in produzione):
- Matricola: `ADMIN001`
- Email: `admin@quotazioni.local`
- Password: `Admin@2024!`

---

## Sviluppo locale (senza kind)

### Backend

```bash
cd backend
cp .env.example .env   # configura DB e JWT
npm install
npm run start:dev      # avvia su http://localhost:3000
```

### AI Estimation Service

```bash
cd ai-estimation-service
cp .env.example .env   # configura AWS Bedrock
npm install
npm run start:dev      # avvia su http://localhost:3001
```

**Configurazione AWS Bedrock richiesta** in `.env`:
```bash
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
BEDROCK_MODEL_ID=eu.anthropic.claude-sonnet-4-5-20250929-v1:0
BEDROCK_TIMEOUT_MS=120000
BACKEND_URL=http://localhost:3000
```

**IAM Policy richiesta**: L'utente/role AWS deve avere il permesso `bedrock:InvokeModel` per il modello specificato.

### Frontend

```bash
cd frontend
npm install
ng serve               # avvia su http://localhost:4200
```

---

## Test

### Esecuzione completa (test + push a Loki)

```bash
./scripts/run-tests.sh                 # backend + frontend + push Loki
./scripts/run-tests.sh --backend-only  # solo backend
./scripts/run-tests.sh --no-push       # senza invio a Loki
```

### Singoli framework

```bash
# Backend (Jest)
cd backend
npm test                               # unit test
npm run test:cov                       # con coverage
npm run test:e2e                       # E2E (richiede backend attivo)

# Frontend (Karma + ChromeHeadless)
cd frontend
ng test --watch=false --browsers=ChromeHeadless
```

### Copertura attuale

| Suite | Test | Cosa copre |
|---|---|---|
| `quotations.service.spec.ts` | 17 | Creazione, filtri, aggiornamento, errori business |
| `auth.service.spec.ts` | 15 | Registrazione, login, errori sicurezza |
| `quotations.dto.spec.ts` | 91 | Validazione tutti i campi del questionario |
| Frontend (11 suite) | 130 | Servizi, componenti, form, routing |

---

## Invio log test a Grafana/Loki

```bash
# Avvia port-forward Loki (in background)
kubectl port-forward -n observability svc/loki 13100:3100 &

# Invia tutti i log NDJSON
node scripts/push-to-loki.js

# Oppure con URL custom:
node scripts/push-to-loki.js --url http://localhost:13100
```

**Dashboard Grafana**: importa `k8s/grafana/dashboard-test-results.json` da Grafana → Dashboards → Import.

**Query LogQL utili:**
```logql
{job="test-results"} | json
{job="test-results", status="failed"} | json
{job="test-results", type="summary"} | json | line_format "{{.app}} — {{.status}}"
```

---

## Quotation Lifecycle

| Stato | Chi lo imposta | Descrizione |
|---|---|---|
| `BOZZA` | Utente (save draft) | Salvataggio temporaneo, non ancora inviata |
| `INVIATA` | Utente (submit form) | In attesa di valutazione |
| `IN VALUTAZIONE` | Admin | Presa in carico, AI estimation in corso |
| `RESPINTA` | Admin | Rifiutata, utente può modificare e reinviare |
| `COMPLETATA` | Admin | Valutazione economica completata |

**Workflow**:
```
BOZZA → [submit] → INVIATA → [take in charge] → IN VALUTAZIONE → [evaluate] → COMPLETATA
                                                                              ↘ RESPINTA → [resubmit] → INVIATA
```

---

## Architettura Microservizi

### Comunicazione HTTP

**Backend → AI Service**:
1. Backend crea quotazione e chiama `POST http://localhost:3001/api/estimation/process` (fire-and-forget)
2. AI Service riceve richiesta e fetcha dati via `GET http://localhost:3000/quotations/:id` (endpoint pubblico)
3. AI Service elabora con AWS Bedrock Claude Sonnet 4.5
4. Risultati salvati in tabella `ai_estimations`

**Endpoint pubblici** (senza autenticazione JWT):
- `GET /quotations/:id` - usato da AI Service per recuperare dati quotazione
- Utilizza `@Public()` decorator e Reflector pattern in `JwtAuthGuard`

**Circuit Breaker**: Dopo 5 fallimenti consecutivi AWS Bedrock, il circuito si apre per 60 secondi.

### Token Tracking & Cost Monitoring

The system tracks AI consumption for cost transparency:

| Metric | Description |
|---|---|
| **Input Tokens** | Tokens sent to Claude Sonnet 4.5 ($3/MTok) |
| **Output Tokens** | Tokens generated by AI ($15/MTok) |
| **Estimated Cost** | Total cost in USD per estimation |
| **Accumulation** | Costs sum across multiple retry attempts |

Admin dashboard displays:
- Total tokens consumed across all estimations
- Total cost in USD
- Average tokens/cost per estimation
- Real-time cost tracking

### AI Validation Insights

AI estimations undergo automatic validation with visible results:

**Validation Checks**:
- Mathematical accuracy (formulas, totals, projections)
- Completeness (CAPEX/OPEX presence, mandatory components)
- Threshold compliance (cost/vCPU, cost/TB, ratios)
- QA budget ≥10% governance requirement

**Severity Levels**:
- 🔴 **HIGH**: Critical errors (e.g., CAPEX=0 when required) → Auto-reject
- 🟡 **MEDIUM**: Warnings (e.g., QA budget <10%) → Needs review
- 🔵 **LOW**: Optimization suggestions → Can approve

**Decision Flow**:
- Confidence >85% + no errors → `AI_VALIDATED` (ready for approval)
- Confidence 70-85% or warnings → `AI_NEEDS_REVIEW` (manual review required)
- Confidence <70% or HIGH errors → `AI_REJECTED` (must fix or retry)

Admin can override any decision with manual approval/rejection.

---

## 🔧 Troubleshooting

### AI Service Connection Error

**Symptom**: "Impossibile contattare l'AI service"

**Solutions**:
1. Verify AI service is running: `kubectl get pods -n portale-quotazioni | grep ai-estimation`
2. Check service URL in backend `.env`: `AI_SERVICE_URL=http://localhost:3001`
3. Verify backend can reach AI service: `curl http://localhost:3001/health`
4. Check logs: `kubectl logs -n portale-quotazioni deployment/ai-estimation-service`

### AWS Bedrock Timeout

**Symptom**: AI estimation stuck or timeout after 120s

**Solutions**:
1. Verify AWS credentials in AI service `.env`
2. Check IAM permissions: `bedrock:InvokeModel` required
3. Verify region: Must use `eu-central-1` for Claude Sonnet 4.5
4. Check proxy settings if behind corporate firewall
5. Review circuit breaker status in AI service logs

### PDF/Excel Download Returns 401 Unauthorized

**Symptom**: Export buttons fail with Unauthorized error

**Fixed in v3.0.2**: Download now uses fetch with Authorization header. Update to latest version.

### Draft Not Populating Fields

**Symptom**: Project Code and Project Name empty when reopening draft

**Fixed in v3.0.2**: Fields now correctly stored in formData. Update to latest version.

### Database Migration Failed

**Symptom**: Token tracking columns missing

**Solution**: Run manual SQL script in pgAdmin:
```sql
ALTER TABLE ai_estimations 
ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10,6) DEFAULT 0;
```

### Kind Cluster Issues

**Symptom**: Pods not starting or ImagePullBackOff

**Solutions**:
1. Verify images loaded: `docker exec -it kind-control-plane crictl images`
2. Reload images: `kind load docker-image <image-name> --name kind`
3. Check imagePullPolicy: Should be `Never` for local development
4. Rebuild and redeploy: `./scripts/kind-deploy.sh`

### Port Already in Use

**Symptom**: Backend/Frontend won't start - port 3000/4200 in use

**Solution**:
```bash
# Find process using port
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows
```

---

## 📚 Documentation

Complete documentation is organized in the [`/docs`](docs/) directory. Quick links:

### Essential Documents

| File | Audience | Content |
|---|---|---|
| [`README.md`](README.md) | Developers | **You are here** - Setup, features, quick start, troubleshooting |
| [`CHANGELOG.md`](CHANGELOG.md) | All | Version history, migration notes, breaking changes |
| [`SECURITY.md`](SECURITY.md) | Security Team | Security policy, vulnerability reporting |
| [`docs/`](docs/) | Technical | **📖 Full documentation index** - Architecture, development guides |

### Architecture Documentation

Located in [`docs/architecture/`](docs/architecture/):

| Document | Content |
|---|---|
| [`overview.md`](docs/architecture/overview.md) | System architecture, diagrams, database schema, API design |
| [`microservices.md`](docs/architecture/microservices.md) | Service coupling analysis, communication patterns |
| [`deployment.md`](docs/architecture/deployment.md) | Production deployment strategies, Kubernetes/OpenShift |

### Development Documentation

Located in [`docs/development/`](docs/development/):

| Document | Content |
|---|---|
| [`hooks.md`](docs/development/hooks.md) | Git hooks system, quality enforcement, pre-commit checks |
| [`quality.md`](docs/development/quality.md) | Code quality standards, best practices, testing guidelines |

### AI Assistant Documentation

Located in [`.claude/`](.claude/):

| Document | Content |
|---|---|
| [`.claude/docs/CLAUDE.md`](.claude/docs/CLAUDE.md) | Instructions for Claude AI - principles, constraints, skills |
| [`.claude/skills/`](.claude/skills/) | Domain-specific behavior: quotations, frontend, backend, cost model |
| [`.claude/hooks/`](.claude/hooks/) | Quality enforcement hooks and validation scripts |

---

## 🤝 Contributing

This is an internal corporate project. For contribution guidelines, see:
- Code quality standards: [`.claude/skills/code-quality-best-practices.md`](.claude/skills/code-quality-best-practices.md)
- Repository management: [`.claude/skills/repository-management.md`](.claude/skills/repository-management.md)
- Git hooks: [`HOOK-SYSTEM-SUMMARY.md`](HOOK-SYSTEM-SUMMARY.md)

Before committing:
1. Run tests: `./scripts/run-tests.sh`
2. Verify hooks pass: Pre-commit hooks check coupling, patterns, security
3. Update documentation if adding features
4. Add entry to `CHANGELOG.md` for notable changes

---

## 📄 License

Proprietary - Credit Agricole Italia - Internal Use Only
