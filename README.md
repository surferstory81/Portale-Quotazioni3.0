# Portale Quotazioni Infrastrutturali 3.0

Applicazione web interna per la gestione e valutazione delle richieste di costo per progetti IT e infrastrutturali. Permette alle Business Unit di sottomettere proposte di investimento al Comitato degli Investimenti tramite il processo di valutazione dell'area CTO.

**Versione 3.0**: Architettura HTTP-based per comunicazione tra microservizi (senza RabbitMQ).

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

## Stato quotazione

| Stato | Chi lo imposta | Descrizione |
|---|---|---|
| `INVIATA` | Utente (submit form) | In attesa di valutazione |
| `IN VALUTAZIONE` | Admin | Presa in carico |
| `RESPINTA` | Admin | Rifiutata, utente può modificare e reinviare |
| `COMPLETATA` | Admin | Valutazione economica completata |

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

### Admin Features

- **Pagination**: Opzioni 10/20/50/Tutte quotazioni in dashboard e quotations management
- **Retry AI**: Bottone per risottomettere quotazioni fallite al servizio AI
- **Public endpoint**: Permette al servizio AI di accedere ai dati senza autenticazione

---

## Documentazione tecnica

Le specifiche funzionali e tecniche dettagliate si trovano in `CLAUDE.md` e `.claude/skills/`:

| File | Contenuto |
|---|---|
| `CLAUDE.md` | Architettura completa, microservizi, configurazione |
| `.claude/skills/quotation-workflow.md` | Lifecycle, stati, form, attori |
| `.claude/skills/frontend.md` | Struttura Angular, UX, layout, test |
| `.claude/skills/backend.md` | API, database, sicurezza, test |
| `.claude/skills/cost-model.md` | Struttura Capex/Opex |
| `.claude/skills/ai-estimation.md` | Scope e vincoli AI |
| `.claude/skills/admin-portal.md` | Sezioni admin, transizioni stato |
| `.claude/skills/microservice-interaction-auditor.md` | Audit architettura microservizi |
