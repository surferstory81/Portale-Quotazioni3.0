# Architecture Documentation

This document provides detailed technical architecture information for the Portale Quotazioni 3.0 system.

---

## Table of Contents

- [System Overview](#system-overview)
- [Microservices Architecture](#microservices-architecture)
- [Database Schema](#database-schema)
- [API Design](#api-design)
- [Authentication & Authorization](#authentication--authorization)
- [AI Integration](#ai-integration)
- [Deployment Architecture](#deployment-architecture)
- [Observability](#observability)

---

## System Overview

### Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend** | Angular | 17.x | SPA with Credit Agricole design system |
| **Backend API** | NestJS | 10.x | REST API, business logic, orchestration |
| **AI Service** | NestJS | 10.x | AWS Bedrock integration, cost estimation |
| **Database** | PostgreSQL | 16+ | Persistent storage |
| **ORM** | TypeORM | 0.3.x | Database abstraction |
| **Authentication** | JWT | - | Access + refresh tokens |
| **Logging** | Loki | 2.x | Centralized log aggregation |
| **Monitoring** | Grafana | 9.x | Dashboards and visualization |
| **Container** | Docker | 20.x | Application packaging |
| **Orchestration** | Kubernetes | 1.27+ | Container orchestration |
| **Local K8s** | kind | 0.20+ | Local Kubernetes for development |

### Architecture Principles

1. **Microservices**: Loosely coupled services with clear boundaries
2. **HTTP-first**: Direct HTTP communication without message brokers
3. **Fire-and-forget**: Async operations for non-critical paths
4. **Public endpoints**: Service-to-service calls without JWT overhead
5. **Circuit breaker**: Resilience against external service failures
6. **Stateless backend**: All state in database, enable horizontal scaling
7. **Token tracking**: Full visibility into AI consumption and costs
8. **Validation-first**: AI outputs validated before human review

---

## Microservices Architecture

### Service Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (User)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Ingress Controller                         │
│                  (nginx-ingress / OpenShift)                    │
└─────────────────────┬───────────────────────┬───────────────────┘
                      │                       │
                      │ HTTP                  │ HTTP
                      ▼                       ▼
         ┌────────────────────┐   ┌──────────────────────┐
         │   Frontend (SPA)   │   │   Grafana Dashboard  │
         │   Angular 17       │   │   (Observability)    │
         │   Port: 80         │   │   Port: 3000         │
         └──────────┬─────────┘   └──────────────────────┘
                    │ HTTP API
                    ▼
         ┌─────────────────────────────────────┐
         │      Backend (NestJS)               │
         │      REST API + Business Logic      │
         │      Port: 3000                     │
         │  ┌─────────────────────────────┐   │
         │  │ • JWT Authentication        │   │
         │  │ • Quotation Management      │   │
         │  │ • User Management           │   │
         │  │ • Admin Operations          │   │
         │  │ • Email Notifications       │   │
         │  └─────────────────────────────┘   │
         └─────┬───────────────────┬───────────┘
               │                   │
               │ TypeORM           │ HTTP (fire-and-forget)
               ▼                   ▼
    ┌──────────────────┐  ┌────────────────────────────┐
    │   PostgreSQL     │  │  AI Estimation Service     │
    │   Database       │  │  (NestJS + AWS Bedrock)    │
    │   Port: 5432     │◄─┤  Port: 3001                │
    └──────────────────┘  │  ┌──────────────────────┐  │
                          │  │ • Estimation Agent   │  │
                          │  │ • Validation Agent   │  │
                          │  │ • Circuit Breaker    │  │
                          │  │ • Token Tracking     │  │
                          │  └──────────────────────┘  │
                          └────────────┬───────────────┘
                                       │ HTTPS
                                       ▼
                          ┌─────────────────────────────┐
                          │     AWS Bedrock             │
                          │     Claude Sonnet 4.5       │
                          │     (eu-central-1)          │
                          └─────────────────────────────┘
```

### Communication Patterns

#### 1. User Request Flow (Synchronous)

```
User → Frontend → Backend → Database → Backend → Frontend → User
```

Example: List quotations, view details, login

#### 2. AI Estimation Flow (Asynchronous)

```
Admin (take in charge) 
  → Backend: POST /quotations/:id/take-in-charge
    → Update status to IN_VALUTAZIONE
    → Fire-and-forget: POST http://ai-service:3001/api/estimation/process
    → Return immediately
    
AI Service (async):
  → Fetch quotation: GET http://backend:3000/quotations/:id (public endpoint)
  → Generate estimation (AWS Bedrock Claude Sonnet 4.5) [60-90s]
  → Validate estimation (AWS Bedrock validation agent) [20-30s]
  → Save result: POST http://backend:3000/ai-estimation
  → Backend stores in ai_estimations table
  
Admin UI (polling):
  → Auto-refresh every 10s
  → Display updated AI estimation when ready
```

#### 3. Public Endpoints Pattern

**Problem**: AI service needs to fetch quotation data but doesn't have user JWT token.

**Solution**: Public endpoints with service token authentication.

```typescript
// Backend: quotations.controller.ts
@Public()  // Decorator bypasses JWT guard
@Get(':id')
async getById(@Param('id') id: string) {
  return this.quotationsService.getById(id);
}

// AI Service: backend-api.service.ts
const response = await fetch(`${backendUrl}/quotations/${id}`, {
  headers: {
    'Authorization': `Bearer ${serviceToken}`,  // Service-to-service token
  }
});
```

---

## Database Schema

### Core Tables

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricola VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'USER',  -- USER, ADMIN
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `quotations`
```sql
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code VARCHAR(20) NOT NULL,
  project_name VARCHAR(240) NOT NULL,
  title VARCHAR(240) NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL,  -- BOZZA, INVIATA, IN VALUTAZIONE, COMPLETATA, RESPINTA
  total_amount NUMERIC(12,2) DEFAULT 0,
  manual_capex NUMERIC(12,2),
  manual_opex NUMERIC(12,2),
  form_data JSONB,  -- All questionnaire fields
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_created_by ON quotations(created_by_id);
```

#### `ai_estimations`
```sql
CREATE TABLE ai_estimations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID UNIQUE REFERENCES quotations(id) ON DELETE CASCADE,
  estimation_data JSONB NOT NULL,  -- Full cost breakdown
  validation_data JSONB,  -- Validation results with issues
  ai_status VARCHAR(30) NOT NULL,  -- AI_GENERATED, AI_VALIDATED, AI_NEEDS_REVIEW, AI_REJECTED, HUMAN_APPROVED, HUMAN_REJECTED
  generated_by VARCHAR(100),
  generated_at TIMESTAMP,
  validated_by VARCHAR(100),
  validated_at TIMESTAMP,
  confidence NUMERIC(5,2),  -- 0-100
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10,6) DEFAULT 0,
  admin_notes TEXT,
  human_reviewer_id UUID REFERENCES users(id),
  human_reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_estimations_quotation ON ai_estimations(quotation_id);
CREATE INDEX idx_ai_estimations_status ON ai_estimations(ai_status);
```

### JSONB Structures

#### `quotations.form_data`
```json
{
  "projectCode": "PRJ1234567",
  "projectName": "Cloud Migration Project",
  "projectStartDate": "2026-06-01",
  "projectEndDate": "2026-12-31",
  "projectDuration": "7–12 months",
  "projectBudget": "1,000–5,000",
  "architecturalImpact": "YES",
  "cloudSaas": true,
  "needNewInfrastructure": true,
  "impactEntity": "Considerable",
  "serviceConsumer": "Central Directorate Users, Customers",
  "serviceVolumesPerDay": 5000,
  "technologicalImpact": "Technological evolution",
  "expectedReleases": 4,
  "microservicesCount": 12,
  "storageGb": 500,
  "computeCores": 32,
  "scheduledBatches": 5,
  "monitoringSystems": "YES",
  "observability": "YES",
  "testMagnitude": "1,000–10,000",
  "qa": "YES"
}
```

#### `ai_estimations.estimation_data`
```json
{
  "summary": {
    "total_capex": 125000.00,
    "total_opex_year_1": 48000.00,
    "total_first_year": 173000.00,
    "total_5_years": 365000.00,
    "vat_rate": 0.22
  },
  "breakdown": {
    "capex": {
      "professional_services": {...},
      "software_licenses": {...},
      "total_capex": 125000.00
    },
    "opex": {
      "infrastructure": {...},
      "software_subscriptions": {...},
      "support_maintenance": {...},
      "total_opex_year_1": 48000.00,
      "total_opex_5_years": 240000.00
    }
  },
  "line_items": [
    {
      "category": "CAPEX",
      "subcategory": "Professional Services",
      "description": "Initial setup and configuration",
      "quantity": 80,
      "unit": "hours",
      "unit_price": 850.00,
      "total": 68000.00,
      "justification": "..."
    }
  ],
  "assumptions": ["...", "..."],
  "recommendations": [...],
  "risks_and_notes": [...],
  "confidence_score": 88,
  "currency": "EUR"
}
```

#### `ai_estimations.validation_data`
```json
{
  "decision": "APPROVE",
  "confidence": 88,
  "summary": {
    "total_checks": 15,
    "passed": 14,
    "warnings": 1,
    "errors": 0
  },
  "issues": [
    {
      "severity": "MEDIUM",
      "category": "QA Budget",
      "message": "QA costs are 9.5% of total budget. Governance requires 10%.",
      "recommendation": "Increase QA budget by €5,000 to meet 10% requirement."
    }
  ],
  "metrics": {
    "cost_per_vcpu": 125.00,
    "cost_per_tb": 45.00,
    "opex_capex_ratio": 0.38
  },
  "next_steps": [
    "Review QA budget allocation",
    "Verify infrastructure sizing"
  ]
}
```

---

## API Design

### Backend Endpoints

#### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - Login (email or matricola)
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout

#### Quotations (User)
- `GET /quotations` - List user's quotations (with optional filters)
- `GET /quotations/:id` - Get quotation details
- `POST /quotations` - Create quotation (status: INVIATA)
- `POST /quotations/draft` - Save draft (status: BOZZA)
- `PATCH /quotations/draft/:id` - Update draft
- `POST /quotations/draft/:id/submit` - Submit draft
- `DELETE /quotations/draft/:id` - Delete draft

#### Quotations (Admin)
- `GET /admin/quotations` - List all quotations with pagination
- `POST /admin/quotations/:id/take-in-charge` - Take in charge (→ IN_VALUTAZIONE)
- `PATCH /admin/quotations/:id/status` - Update status (COMPLETATA, RESPINTA)
- `PATCH /admin/quotations/:id/economic` - Set economic quotation
- `PATCH /admin/quotations/:id/capex-opex` - Set manual CAPEX/OPEX
- `DELETE /admin/quotations/:id` - Delete quotation (any status)

#### AI Estimations
- `GET /ai-estimation/quotation/:quotationId` - Get AI estimation for quotation
- `GET /ai-estimation/needs-review` - List estimations needing review
- `GET /ai-estimation/statistics` - Get AI statistics
- `POST /ai-estimation/retry/:quotationId` - Retry AI estimation (admin)
- `PATCH /ai-estimation/:id/approve` - Approve AI estimation (admin)
- `PATCH /ai-estimation/:id/reject` - Reject AI estimation (admin)
- `GET /ai-estimation/export/pdf/:quotationId` - Export PDF
- `GET /ai-estimation/export/excel/:quotationId` - Export Excel

#### Admin Dashboard
- `GET /admin/statistics` - Dashboard statistics
- `GET /admin/token-stats` - Token consumption statistics

### AI Service Endpoints

#### Estimation
- `POST /api/estimation/process` - Process quotation (generate + validate)
- `POST /api/estimation/save` - Save estimation result (called by agent)

#### Export (Proxied through backend)
- `GET /api/estimation/export/pdf/:quotationId` - Generate PDF
- `GET /api/estimation/export/excel/:quotationId` - Generate Excel

#### Health
- `GET /health` - Health check (includes circuit breaker status)

---

## Authentication & Authorization

### JWT Token Flow

```
1. Login:
   POST /auth/login { email, password }
   ↓
   Response: {
     access_token: "eyJhbG...",  // 15 min expiry
     refresh_token: "eyJhbG...",  // 7 days expiry
     user: { id, email, role }
   }

2. API Requests:
   GET /quotations
   Headers: { Authorization: "Bearer <access_token>" }

3. Token Refresh:
   POST /auth/refresh
   Headers: { Authorization: "Bearer <refresh_token>" }
   ↓
   Response: { access_token: "new_token..." }
```

### Role-Based Access Control

| Endpoint | USER | ADMIN |
|---|---|---|
| POST /quotations | ✅ | ✅ |
| GET /quotations (own) | ✅ | ✅ |
| GET /quotations (all) | ❌ | ✅ |
| POST /quotations/draft | ✅ | ✅ |
| DELETE /quotations/draft/:id (own) | ✅ | ✅ |
| POST /admin/quotations/:id/take-in-charge | ❌ | ✅ |
| PATCH /admin/quotations/:id/status | ❌ | ✅ |
| POST /ai-estimation/retry/:id | ❌ | ✅ |
| PATCH /ai-estimation/:id/approve | ❌ | ✅ |

### Public Endpoints (No Authentication)

These endpoints bypass JWT authentication for service-to-service communication:

- `GET /quotations/:id` - Used by AI service to fetch quotation data
- Requires `BACKEND_SERVICE_TOKEN` in Authorization header
- Uses `@Public()` decorator in NestJS

---

## AI Integration

### AWS Bedrock Configuration

**Model**: `eu.anthropic.claude-sonnet-4-5-20250929-v1:0`

**API**: Converse API (second generation)

**Region**: `eu-central-1`

**IAM Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "bedrock:InvokeModel",
    "Resource": "arn:aws:bedrock:eu-central-1::foundation-model/eu.anthropic.claude-sonnet-4-5-20250929-v1:0"
  }]
}
```

### Estimation Agent Flow

```
1. AI Service receives request: POST /api/estimation/process
   { quotation_id, user_id, project_code, status }

2. Fetch quotation data:
   GET http://backend:3000/quotations/:id (public endpoint)

3. Load knowledge base:
   - Pricing rules
   - Cost formulas (VMware, OpenShift, Dynatrace, etc.)
   - Thresholds and constraints

4. Generate estimation (Claude Sonnet 4.5):
   - System prompt: estimation-agent instructions
   - User message: quotation data + knowledge base
   - Temperature: 0.2 (deterministic)
   - Max tokens: 16,000
   - Timeout: 120s
   - Track input/output tokens

5. Parse and validate output:
   - Extract JSON from ```json blocks
   - Validate structure (summary, breakdown, line_items)

6. Save estimation result:
   POST http://backend:3000/ai-estimation
   { estimation_data, input_tokens, output_tokens, estimated_cost_usd }

7. Trigger validation agent (see next section)
```

### Validation Agent Flow

```
1. Receive estimation to validate

2. Load validation rules:
   - File: prompts/validation-agent-prompt.md
   - Fallback: embedded default rules

3. Validate (Claude Sonnet 4.5):
   - Check CAPEX=0 (HIGH severity if infrastructure project)
   - Check QA ≥10% (MEDIUM severity)
   - Verify mathematical accuracy
   - Check thresholds (cost/vCPU, cost/TB, ratios)
   - Temperature: 1.0 (allow reasoning variability)
   - Prompt caching enabled (90% cost savings on repeated rules)

4. Parse validation output:
   {
     decision: "APPROVE|REVIEW|SENIOR_REVIEW|REJECT",
     confidence: 0-100,
     summary: { total_checks, passed, warnings, errors },
     issues: [{ severity, category, message, recommendation }],
     metrics: { cost_per_vcpu, cost_per_tb, opex_capex_ratio },
     next_steps: [...]
   }

5. Determine AI status:
   - REJECT decision → AI_REJECTED
   - APPROVE + confidence >85% → AI_VALIDATED
   - APPROVE + confidence 70-85% → AI_NEEDS_REVIEW
   - REVIEW/SENIOR_REVIEW → AI_NEEDS_REVIEW

6. Save validation result:
   Update ai_estimations set validation_data, ai_status
```

### Circuit Breaker Pattern

**Configuration**:
- Threshold: 5 consecutive failures
- Recovery timeout: 60 seconds
- Half-open after timeout: Allow 1 test request

**States**:
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Circuit open, requests fail immediately
- **HALF_OPEN**: Testing with 1 request, then close or re-open

**Metrics**:
- Consecutive failures counter
- Last failure timestamp
- Circuit state (available via `/health` endpoint)

### Token Tracking & Cost Calculation

**Token Sources**:
- Input tokens: Prompt sent to Claude (estimation + validation)
- Output tokens: Response generated by Claude

**Cost Formula**:
```typescript
const inputCostPerMillion = 3.0;   // $3/MTok
const outputCostPerMillion = 15.0; // $15/MTok

const estimatedCost = 
  (inputTokens / 1_000_000 * inputCostPerMillion) +
  (outputTokens / 1_000_000 * outputCostPerMillion);
```

**Accumulation**:
- First estimation: Store tokens and cost
- Retry: Add to existing tokens and cost (sum, not replace)
- Admin dashboard: Aggregate across all estimations

---

## Deployment Architecture

### Local Development (kind)

```
kind cluster
├── namespace: portale-quotazioni
│   ├── deployment: backend (3 replicas)
│   ├── deployment: frontend (2 replicas)
│   ├── deployment: ai-estimation-service (1 replica)
│   └── deployment: postgres (1 replica)
├── namespace: observability
│   ├── deployment: loki (1 replica)
│   ├── daemonset: promtail (1 per node)
│   └── deployment: grafana (1 replica)
└── ingress-nginx (controller)
    ├── portale-quotazioni.local → frontend:80
    └── grafana.portale-quotazioni.local → grafana:3000
```

**Image Strategy**:
- Build: `docker build --no-cache`
- Tag: `<service>:latest` + `<service>:<git-sha>`
- Load: `kind load docker-image <image>`
- ImagePullPolicy: `Never` (local images only)

### Production (Kubernetes/OpenShift)

**Recommendations**:
- Backend: 3+ replicas, HPA (CPU >70%)
- Frontend: 2+ replicas, HPA (CPU >60%)
- AI Service: 2 replicas (no HPA due to long-running requests)
- PostgreSQL: Managed service (RDS, Cloud SQL, etc.) or StatefulSet with PVC

**Image Strategy**:
- Registry: GHCR (GitHub Container Registry)
- Tag: `ghcr.io/<org>/<service>:<git-sha>`
- ImagePullPolicy: `Always` or `IfNotPresent`
- Secrets: Pull credentials via imagePullSecrets

**Environment Variables**:
- ConfigMap: Non-sensitive config
- Secret: Database credentials, JWT secrets, AWS keys, SMTP password

---

## Observability

### Logging (Loki)

**Log Collection**:
- Promtail DaemonSet scrapes `/var/log/pods/`
- Logs pushed to Loki (port 3100)
- Retention: 7 days (configurable)

**Log Labels**:
```
{
  job="portale-quotazioni",
  namespace="portale-quotazioni",
  app="backend|frontend|ai-estimation-service",
  pod="<pod-name>"
}
```

**LogQL Queries**:
```logql
# All backend logs
{namespace="portale-quotazioni", app="backend"}

# AI estimation errors
{app="ai-estimation-service"} |= "error" | json

# Token tracking
{app="backend"} | json | message =~ ".*token.*"
```

### Monitoring (Grafana)

**Dashboards**:
- Test Results: `k8s/grafana/dashboard-test-results.json`
- Application Metrics: (to be implemented)
- Infrastructure: (to be implemented)

**Access**:
- URL: `http://grafana.portale-quotazioni.local`
- Default credentials: admin/admin

**Data Sources**:
- Loki: http://loki:3100

---

## Security Considerations

See [`SECURITY.md`](SECURITY.md) for detailed security policy.

**Key Points**:
- HTTPS in production (TLS termination at ingress)
- JWT tokens with short expiry (15 min access, 7 days refresh)
- Password hashing with bcrypt (cost factor 10)
- Rate limiting on auth endpoints
- Input validation on all endpoints
- SQL injection prevention via TypeORM parameterized queries
- XSS prevention via Angular sanitization
- CORS configuration (whitelist frontend origin)
- Secrets management via Kubernetes Secrets
- No sensitive data in logs or version control

---

## Performance Considerations

**Backend**:
- Connection pooling (PostgreSQL max 20 connections)
- Query optimization (indexes on frequently queried fields)
- Pagination for list endpoints

**AI Service**:
- Circuit breaker to prevent cascading failures
- Timeout 120s to prevent hanging requests
- Prompt caching for validation rules (90% cost savings)

**Frontend**:
- Lazy loading of modules
- OnPush change detection strategy
- Auto-refresh with debouncing (10s/15s intervals)

**Database**:
- Indexes on: status, created_by_id, quotation_id
- JSONB GIN indexes for form_data queries (if needed)
- Regular VACUUM for query performance

---

## Future Enhancements

See [`CHANGELOG.md`](CHANGELOG.md) for planned features.

**Under Consideration**:
- Real-time notifications via WebSockets
- Advanced analytics dashboard
- Export to other formats (Word, CSV)
- Quotation templates
- Bulk operations
- Audit log viewer
- Multi-language support (Italian + English)
- SSO integration (OIDC)
