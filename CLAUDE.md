# Project Overview

This project implements an internal corporate web application that allows Business Units to autonomously submit infrastructure and IT project cost requests for evaluation by the CTO organization.

The application supports the preparation of investment proposals to be presented to the internal Investment Committee.

Initial cost estimations may be generated with the support of internal AI agents, but all results must be validated by authorized CTO administrators.

---

## Project Principles

- Corporate, production-grade application
- Internal use only
- Strong governance over financial and AI-generated data
- Human validation is mandatory for all quotations

---

## High-Level Functional Scope

- Public landing page with Credit Agricole branding, login via modal overlay
- Submission of IT project cost requests by internal users
- Tracking of quotation status: **Inviata**, **In valutazione**, **Respinta**, **Completata**
- Modification and resubmission of rejected quotations
- Manual and AI-assisted cost estimation
- Administrator validation and approval
- Auditability and traceability of all actions

Detailed functional specifications are maintained in dedicated skill files under `.claude/skills/`.

---

## Repository Structure

```
Portale-Quotazioni3.0/
├── backend/          ← NestJS (src/, migrations/, reporters/, test/)
├── frontend/         ← Angular 17 SPA (src/, reporters/, karma.conf.js)
├── ai-estimation-service/ ← NestJS microservice per stime AI (AWS Bedrock)
├── k8s/              ← Manifest Kubernetes (all-in-one.yaml, grafana/)
├── CLAUDE.md
└── README.md
```

**Note**: Questa è la versione 3.0 con architettura HTTP. La versione 2.0 con RabbitMQ è mantenuta separatamente per compatibilità con ambienti che richiedono message broker.

---

## Architecture Overview

- **Frontend**: Angular 17 SPA — design system Credit Agricole, topbar navigation unica (no sidebar), SSR disabilitato
- **Backend**: NestJS — REST APIs, JWT auth + refresh token, TypeORM + PostgreSQL 16+
- **AI Estimation Service**: NestJS microservice — AWS Bedrock integration, HTTP endpoints, circuit breaker pattern
- **Service Communication**: HTTP-based (fire-and-forget pattern for async operations)
- **Public Endpoints**: @Public() decorator for service-to-service calls bypassing JWT auth
- **Deployment locale**: kind con ingress-nginx, namespace `portale-quotazioni`
- **Deployment produzione**: Kubernetes / OpenShift
- **Images**: build con `docker build --no-cache`, push a GHCR taggato con git SHA + `latest`
- **imagePullPolicy**: `Never` per i deployment kind (le immagini vanno caricate con `kind load`)

### Microservices Communication

**Backend → AI Service** (HTTP):
1. Backend calls `POST /api/estimation/process` (fire-and-forget)
2. AI Service fetches quotation data via `GET /quotations/:id` (public endpoint)
3. AI Service processes estimation with AWS Bedrock
4. Results stored in `ai_estimations` table

**Public Endpoints**:
- `GET /quotations/:id` - accessible without JWT for service-to-service calls
- Uses `@Public()` decorator with Reflector pattern in JwtAuthGuard

**Admin Features**:
- Pagination (10/20/50/All quotations) in dashboard and quotations management
- Retry AI estimation button for failed/incomplete estimations
- View all quotations with flexible pagination controls

---

## Testing Infrastructure

| Tipo | Stack | Comando | Risultato |
|---|---|---|---|
| Backend unit | Jest | `cd backend && npm test` | 123 test, 3 suite |
| Backend E2E | Jest + Supertest | `cd backend && npm run test:e2e` | richiede backend attivo |
| Frontend | Jasmine + Karma | `cd frontend && ng test --watch=false --browsers=ChromeHeadless` | 130 test, 11 suite |
| Tutti + push Loki | run-tests.sh | `./scripts/run-tests.sh` | esegue e invia a Loki |

I risultati vengono scritti in `scripts/logs/test-*.ndjson` e inviati a Loki tramite `push-to-loki.js`.

---

## Observability Stack

Namespace `observability` su kind:

| Componente | Funzione | Accesso |
|---|---|---|
| **Loki** | Storage log strutturati | ClusterIP :3100 |
| **Promtail** | Scraping pod logs da `/var/log/pods/` | DaemonSet |
| **Grafana** | Dashboard | `http://grafana.portale-quotazioni.local` |

Dashboard test results: `k8s/grafana/dashboard-test-results.json` (importabile via UI).
Label Loki per test: `{job="test-results", app="backend|frontend", status="passed|failed"}`.

---

## AI Usage Policy

- AI agents are used only for **first-pass estimations**
- AI outputs are non-authoritative
- AI behavior must be deterministic, constrained, and reproducible
- All AI-generated data must be identifiable and reviewable
- **AI Service**: AWS Bedrock with Claude Sonnet 4.5 model (`eu.anthropic.claude-sonnet-4-5-20250929-v1:0`)
- **Region**: eu-central-1
- **Timeout**: 120 seconds per request
- **Circuit Breaker**: Opens after 5 consecutive failures, 60s recovery window
- **IAM Requirements**: `bedrock:InvokeModel` permission required

### AI Service Configuration

Environment variables required in AI service:
- `AWS_REGION=eu-central-1`
- `AWS_ACCESS_KEY_ID=<your-key>`
- `AWS_SECRET_ACCESS_KEY=<your-secret>`
- `BEDROCK_MODEL_ID=eu.anthropic.claude-sonnet-4-5-20250929-v1:0`
- `BEDROCK_TIMEOUT_MS=120000`
- `BACKEND_URL=http://localhost:3000`

Details about AI skills, prompts, and constraints are defined in `.claude/skills/ai-estimation.md`.

---

## Development & Governance Rules

- Follow company coding, security, and architectural standards
- Financial logic must be explicit and testable
- No hidden defaults or silent fallbacks
- Every quotation must be traceable (who / when / why)

---

## Skills Reference

| File | Scope |
| --- | --- |
| `.claude/skills/quotation-workflow.md` | Quotation lifecycle, states, form definition, actors |
| `.claude/skills/frontend.md` | Angular 17 portal structure, UX, authentication |
| `.claude/skills/backend.md` | Microservices, API design, database, security |
| `.claude/skills/cost-model.md` | Capex/Opex structure, cost drivers, thresholds |
| `.claude/skills/ai-estimation.md` | AI scope, constraints, output format, auditability |
| `.claude/skills/admin-portal.md` | Admin sections, state transitions, evaluation workflow |
| `.claude/skills/microservice-interaction-auditor.md` | This skill MUST be applied implicitly in every session, hook, and response involving software architecture, backend systems, or microservices | 

These files are the authoritative source for domain-specific behavior. Claude must read the relevant skill file before working on any feature in its scope.

---

## How Claude Should Help

- Respect existing architecture and enterprise constraints
- Use domain terminology consistently
- Highlight risks, edge cases, and governance implications
- Never invent business rules or functional behavior

---

## How Claude Should NOT Help

- Do not introduce new requirements
- Do not assume approval or automation steps
- Do not bypass validation workflows
- Do not expand scope beyond documented skills

---

## Continuous Improvement

Claude must actively maintain the quality of this documentation during every work session.

### When to update skill files

Update the relevant file in `.claude/skills/` immediately when:
- A gap or ambiguity is discovered that blocked or slowed down implementation
- A business rule is clarified through conversation that was previously implicit
- A new constraint emerges from integration work
- An error in the existing documentation is identified

Updates must be minimal and surgical — do not rewrite, only add or correct.

### When to update CLAUDE.md

Update this file when:
- A project-level architectural decision changes the overview
- A development or governance rule is confirmed through experience

### Memory

Claude uses a persistent memory system in `.claude/memory/` to retain lessons learned across sessions.
