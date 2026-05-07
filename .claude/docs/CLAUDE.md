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
- **Draft system**: Save incomplete quotations with auto-save functionality
- Tracking of quotation status: **Bozza**, **Inviata**, **In valutazione**, **Respinta**, **Completata**
- Modification and resubmission of rejected quotations
- **AI-assisted cost estimation** with token tracking and validation insights
- **Token consumption monitoring**: Track input/output tokens and cost in USD
- **Validation issue visualization**: Display AI validation problems with severity levels
- Administrator validation and approval (can override AI decisions)
- Auditability and traceability of all actions

Detailed functional specifications are maintained in dedicated skill files under `.claude/skills/`.

---

## Repository Structure

```
Portale-Quotazioni3.0/
├── README.md                      ← Entry point for developers
├── CHANGELOG.md                   ← Version history
├── SECURITY.md                    ← Security policy
├── docs/                          ← Technical documentation
│   ├── architecture/              ← System architecture and design
│   │   ├── overview.md           ← Complete architecture (diagrams, DB, API)
│   │   ├── microservices.md      ← Service coupling analysis
│   │   └── deployment.md         ← Production deployment options
│   └── development/               ← Development guidelines
│       ├── hooks.md              ← Git hooks system
│       └── quality.md            ← Code quality standards
├── .claude/                       ← Claude Code configuration
│   ├── docs/
│   │   └── CLAUDE.md             ← This file (AI instructions)
│   ├── skills/                   ← Domain-specific knowledge
│   │   ├── quotation-workflow.md
│   │   ├── frontend.md
│   │   ├── backend.md
│   │   ├── cost-model.md
│   │   ├── ai-estimation.md
│   │   └── admin-portal.md
│   ├── hooks/                    ← Git quality enforcement
│   │   ├── check-service-coupling.js
│   │   ├── code-quality-check.js
│   │   └── validate-architecture.js
│   └── memory/                   ← Persistent memory
├── backend/                       ← NestJS API (src/, test/)
├── frontend/                      ← Angular 17 SPA (src/)
├── ai-estimation-service/        ← AI microservice (AWS Bedrock)
├── k8s/                          ← Kubernetes manifests
└── scripts/                      ← Deployment and test scripts
```

**Note**: This is version 3.0 with HTTP-based architecture. Version 2.0 with RabbitMQ is maintained separately for compatibility.

---

## Architecture Overview

- **Frontend**: Angular 17 SPA — design system Credit Agricole, topbar navigation unica (no sidebar), SSR disabilitato
- **Backend**: NestJS — REST APIs, JWT auth + refresh token, TypeORM + PostgreSQL 16+
- **AI Estimation Service**: NestJS microservice — AWS Bedrock Converse API, HTTP endpoints, circuit breaker pattern
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
- **Pagination**: 10/20/50/All quotations in dashboard and quotations management
- **Retry AI estimation**: Button for failed/incomplete estimations
- **Token tracking**: Dashboard showing total tokens consumed, cost in USD, averages
- **Validation insights**: View AI validation issues with severity badges (HIGH/MEDIUM/LOW)
- **Manual override**: Approve/reject AI estimations in any state (AI_VALIDATED, AI_NEEDS_REVIEW, AI_REJECTED)
- **Manual CAPEX/OPEX**: Override AI estimations with custom values
- **Auto-refresh**: Real-time updates every 10s for quotations in evaluation
- **Delete quotations**: Soft delete with confirmation

**User Features**:
- **Draft system**: Save incomplete quotations without submitting
- **Auto-save**: Automatic draft save every 5 seconds after first manual save
- **Draft management**: Edit, delete, and submit drafts from dashboard
- **Login options**: Authenticate with email or matricola
- **Auto-refresh**: Dashboard updates every 15s

**Token Tracking**:
- Input tokens tracked (Claude Sonnet 4.5: $3/MTok)
- Output tokens tracked ($15/MTok)
- Cost accumulation across retry attempts
- Statistics dashboard for admin visibility

**AI Validation**:
- Comprehensive validation rules in `ai-estimation-service/prompts/validation-agent-prompt.md`
- CAPEX=0 detection as HIGH severity error
- QA budget ≥10% enforcement
- Threshold compliance checks (cost/vCPU, cost/TB, OPEX/CAPEX ratio)
- Validation issues displayed in admin UI with actionable recommendations

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
- **API**: Converse API (second generation, supports tool use and multi-turn)
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
- `BACKEND_SERVICE_TOKEN=dev-service-token-change-in-production`

**Validation Prompt**:
- File: `ai-estimation-service/prompts/validation-agent-prompt.md`
- Auto-loaded if present; falls back to embedded default prompt
- Contains comprehensive validation rules:
  - CAPEX=0 detection (HIGH severity → auto-reject)
  - QA budget ≥10% enforcement
  - Mathematical accuracy checks
  - Threshold compliance (cost/vCPU, cost/TB)
  - Completeness validation

**Token Tracking**:
- AI service reports token usage to backend after each estimation
- Backend stores in `ai_estimations` table: `input_tokens`, `output_tokens`, `estimated_cost_usd`
- Tokens accumulate across retries (sum, not replace)
- Cost calculation: (input/1M × $3) + (output/1M × $15)

Details about AI skills, prompts, and constraints are defined in `.claude/skills/ai-estimation.md`.

---

## Development & Governance Rules

- Follow company coding, security, and architectural standards
- Financial logic must be explicit and testable
- No hidden defaults or silent fallbacks
- Every quotation must be traceable (who / when / why)
- Maintain clean repository: no IDE files, build artifacts, or logs in version control
- Verify `.gitignore` coverage before committing new services or directories

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
| `.claude/skills/repository-management.md` | Git hygiene, .gitignore rules, cleanup procedures - applied before commits and when verifying repository state |
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
