# Portale Quotazioni Infrastrutturali 2.0

Applicazione web interna per la gestione e valutazione delle richieste di costo per progetti IT e infrastrutturali. Permette alle Business Unit di sottomettere proposte di investimento al Comitato degli Investimenti tramite il processo di valutazione dell'area CTO.

---

## Struttura repository

```
Portale-Quotazioni2.0/
├── backend/              ← API NestJS + PostgreSQL
│   ├── src/              ← sorgenti applicazione
│   ├── test/             ← test E2E (Supertest)
│   ├── reporters/        ← reporter Jest → Loki
│   ├── Dockerfile
│   └── package.json
├── frontend/             ← SPA Angular 17
│   ├── src/              ← sorgenti applicazione
│   ├── reporters/        ← reporter Karma → Loki
│   ├── karma.conf.js
│   ├── Dockerfile
│   └── package.json
├── k8s/
│   ├── all-in-one.yaml   ← manifest Kubernetes (namespace, secrets, deployments, ingress)
│   └── grafana/
│       └── dashboard-test-results.json
├── scripts/
│   ├── kind-deploy.sh    ← deploy locale su kind
│   ├── build-push.sh     ← build Docker + push GHCR (tag SHA)
│   ├── run-tests.sh      ← esegue tutti i test e invia log a Loki
│   ├── push-to-loki.js   ← invia NDJSON a Loki via HTTP
│   └── logs/             ← log test e deploy (gitignored)
└── _archive/             ← materiale non attivo
```

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

## Documentazione tecnica

Le specifiche funzionali e tecniche dettagliate si trovano in `.claude/skills/`:

| File | Contenuto |
|---|---|
| `quotation-workflow.md` | Lifecycle, stati, form, attori |
| `frontend.md` | Struttura Angular, UX, layout, test |
| `backend.md` | API, database, sicurezza, test |
| `cost-model.md` | Struttura Capex/Opex |
| `ai-estimation.md` | Scope e vincoli AI |
| `admin-portal.md` | Sezioni admin, transizioni stato |
