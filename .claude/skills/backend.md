# Backend Skill

This document defines the backend architecture, responsibilities, and
non-functional constraints for the **Quotazioni Infrastrutturali** application.

The backend acts as the authoritative layer for:
- Data persistence
- Workflow enforcement
- Security and authorization
- State management
- Integration with AI agents and notification systems

---

## Purpose

The backend supports the full quotation lifecycle by providing:
- Secure APIs consumed by the micro front-end
- Centralized governance of quotation state transitions
- Persistence of quotation, user, and audit data
- Controlled integration with AI estimation services
- Notifications to users and administrators

All business rules are enforced at backend level.

---

## Architecture

- **Style**: Microservices
- **Communication**: REST APIs over HTTPS
- **Deployment**: Containerized services on Kubernetes / OpenShift
- **Stateless Services**: Yes
- **Configuration**: Externalized (environment variables / config maps)

Each service must have a clear and limited responsibility.

---

## Backend Responsibilities

The backend is responsible for:
- Enforcing quotation lifecycle rules
- Validating all incoming data
- Managing user roles and permissions
- Guaranteeing data consistency
- Logging and auditing all relevant actions

The backend is the single source of truth for system state.

---

## Core Domain Entities

At minimum, the backend manages the following logical entities:

- **User**
  - Identity data
  - Role (standard / administrator)
  - Activation status

- **QuotationRequest**
  - Questionnaire data
  - Current state
  - Requesting user
  - Timestamps
  - Versioning (for resubmissions)

- **QuotationEvaluation**
  - Capex items
  - Opex items
  - Assumptions and notes
  - Final validated values

- **AuditLog**
  - User or administrator action
  - Timestamp
  - Target entity
  - Action type

These entities must be persisted in a relational database.

---

## Database

- **Technology**: PostgreSQL 16+
- **Deployment**:
  - Initially a dedicated instance per microservice is acceptable
  - Persistent volumes managed by Kubernetes
- **Requirements**:
  - Schema versioning
  - Referential integrity
  - Explicit constraints for mandatory fields

No business logic must reside exclusively in database triggers.

---

## API Design

- REST-style APIs
- OpenAPI (Swagger) documentation required
- Versioned endpoints
- Clear separation between:
  - User APIs
  - Administrator APIs

All endpoints must:
- Enforce authentication
- Enforce authorization
- Validate input data
- Return meaningful error responses

---

## State Management

Quotation state transitions must respect the rules defined in
`quotation-workflow.md`.

Principles:
- State transitions allowed only via backend APIs
- Only administrators can change quotation states
- Invalid transitions must be rejected explicitly
- All transitions must generate audit log entries

---

## Security & Authorization

- Integration with corporate authentication systems
- Role-based access control (RBAC)
- Backend must independently verify:
  - User identity
  - User role
  - Resource ownership

No security decision must rely solely on frontend checks.

---

## Notifications

The backend must trigger notifications on key events:

- Quotation submission
- State changes
- Quotation completion

Notification channels:
- Email (corporate mail infrastructure)

Email contents must be:
- Informative
- Deterministic
- Free of sensitive data not required by recipients

---

## AI Integration

- Backend integrates with the internal AI agent framework
- AI services are invoked explicitly and on demand
- AI outputs are treated as advisory data
- AI responses must be:
  - Persisted
  - Labeled as AI-generated
  - Reviewable by administrators

The backend must never automatically apply AI outputs.

AI behavior constraints are defined in `ai-estimation.md`.

---

## Logging & Auditing

- All relevant actions must be logged
- Logs must include:
  - Actor
  - Action
  - Target
  - Timestamp
- Logs must be searchable and filterable
- Audit data must comply with company retention policies

---

## Error Handling

- Fail fast on invalid data
- Explicit error responses
- No silent fallbacks
- Financial and state-related errors must be treated as blocking

---

## Non-Functional Requirements

- Availability aligned with corporate standards
- Horizontal scalability
- Observability (logging, metrics, tracing)
- Secure handling of secrets
- Zero hardcoded credentials or endpoints

---

## Out of Scope

- Frontend UI logic
- Cost calculation formulas
- AI estimation models
- CI/CD pipeline definition

These concerns are covered in other skills or documentation.

---
---

## Implementation Notes (aggiornato)

### Struttura cartelle

Il backend si trova nella cartella `backend/` nella root del repository (non nella root stessa).

```
backend/
├── src/              ← sorgenti NestJS
├── test/             ← test E2E (jest-e2e.json, auth.e2e-spec.ts, quotations.e2e-spec.ts)
├── reporters/        ← jest-loki-reporter.js (scrive NDJSON in scripts/logs/)
├── Dockerfile        ← build context: backend/
├── package.json      ← include Jest config e scripts test
├── nest-cli.json
└── tsconfig.json
```

### ValidationPipe

La `ValidationPipe` globale è configurata in `main.ts` con:
```typescript
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
})
```

`enableImplicitConversion: true` è **obbligatorio** per garantire che i decoratori `@IsIn()` su campi stringa funzionino correttamente dopo la trasformazione del body. Senza questa opzione, alcuni campi risultano `undefined` dopo `class-transformer` e `@IsIn` fallisce.

### Regola DTO: @IsString prima di @IsIn

Per tutti i campi stringa con `@IsIn()`, occorre sempre anteporre `@IsString()`:
```typescript
@IsString()
@IsIn(OPTION_ARRAY, { message: '...' })
fieldName: string;
```

Questo garantisce validazione corretta indipendentemente dall'ordine di esecuzione dei decoratori.

### Docker build

Il Dockerfile del backend si trova in `backend/Dockerfile`. Il build context è `backend/`:
```bash
docker build backend/            # corretto
docker build -f Dockerfile.backend .  # OBSOLETO
```

### Test

- Framework: **Jest** (`npm test` dalla cartella `backend/`)
- Reporter custom: `backend/reporters/jest-loki-reporter.js` → scrive `scripts/logs/test-backend-*.ndjson`
- 3 suite: `quotations.service.spec.ts`, `auth.service.spec.ts`, `dto/quotations.dto.spec.ts`
- 123 test unitari
- Test E2E in `backend/test/` (richiedono backend e DB attivi)

### Observability

I log dell'applicazione in produzione vengono raccolti da Promtail (namespace `observability`) che scrapa `/var/log/pods/portale-quotazioni_*/*/*.log`. I log dei test vengono inviati direttamente a Loki via HTTP con `node scripts/push-to-loki.js`.
