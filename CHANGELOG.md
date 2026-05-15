# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **AI agent architecture reorganization**: Clearer project structure for AI components
  - Agents now organized in `src/agents/{agent-name}/` with service + prompt + README
  - Knowledge base organized in `src/knowledge/{costs|rules|mapping}/` (shared across agents)
  - Each agent has dedicated documentation explaining purpose, workflow, and development
- **Multi-model comparison test script**: `scripts/test-multi-model-comparison.js`
  - Tests Sonnet 4.5, Opus 4.7, Haiku 4.5 side-by-side
  - Compares CAPEX/OPEX, token usage, cost, latency, validation issues
  - Provides recommendation based on variance and cost/performance tradeoff
- **Architecture documentation**: `ai-estimation-service/ARCHITECTURE.md`
  - Complete guide to agent-based architecture pattern
  - Knowledge base organization and updating procedures
  - Multi-model support and performance optimization strategies

### Changed
- **Knowledge loader refactored**: New structured interface for organized knowledge access
  - `getKnowledgeAsString()` method for backward compatibility
  - Automatic loading from organized directory structure
- **Agent services relocated**: Moved from `src/agents/*.service.ts` to `src/agents/{agent}/agent.service.ts`
  - `estimation-agent.service.ts` → `agents/estimation/estimation.service.ts`
  - `validation-agent.service.ts` → `agents/validation/validation.service.ts`
- **Prompts collocated**: Moved from `prompts/*.md` to `agents/{agent}/*.prompt.md`

## [1.1.4] - 2026-05-15

### Fixed
- **CRITICAL: Em-dash bug in form options**: Replaced Unicode em-dash (–, char 8211) with ASCII hyphen (-, char 45)
  - **Pipeline options**: `"5–15"` → `"5-15"`, `"15–40"` → `"15-40"` (frontend + backend)
  - **Duration options**: `"1–6 months"` → `"1-6 months"`, `"7–12 months"` → `"7-12 months"`
  - **Budget options**: `"500–1,000"` → `"500-1,000"`, `"1,000–5,000"` → `"1,000-5,000"`
  - **Impact**: AI couldn't parse em-dash values, causing €0 CAPEX instead of €7,320 for MEDIO pipeline
  - **Root cause**: Copy-paste from Word/Docs auto-converted hyphens to typographic em-dashes
- **QA validation false positive**: Fixed validation agent incorrectly flagging `qa = "NO"` as governance violation
  - **Rule**: QA must be ≥10% of total project cost (governance requirement)
  - **Exception**: If `qa = "NO"`, rule does NOT apply (explicit exemption)
  - **Impact**: PRJ0123456 flagged "Missing QA Costs - Governance Violation" despite valid `qa = "NO"`
- **OPEX multi-year projection for short projects**: Fixed Year 2-5 calculated on prorated Year 1 instead of annualized cost
  - **Wrong**: 3-month project Year 1 €10k → Year 2 €10k × 0.91 = €9.1k
  - **Correct**: 3-month project Year 1 €10k (prorated) → Year 2 €40k × 0.91 = €36.4k (annualized)
  - **Impact**: PRJ0123456 showed Year 2 €35,755 but validation flagged "364% increase" as error

### Added
- **Detailed JSON logging in AI service**: Log full `estimation_data` and `validation_data` JSON for debugging
  - Enables log-based troubleshooting without database queries
  - Logged after estimation generation and validation completion
- **Governance exemptions section** in validation prompt: Clear instructions for when to skip validation rules

### Changed
- **Dynatrace pricing in knowledge base**: Removed obsolete generic pricing (€0.08/hour) from software-licenses.md
  - Now points to CA real pricing in field-to-cost-mapping.md (€39.79/GB RAM, €14.86/POD, etc.)
  - Prevents AI from using incorrect AWS/Azure pricing

### Documentation
- **BUGFIX_EM_DASH_PIPELINE_2026-05-15.md**: Complete analysis of em-dash bug and fix

## [1.1.3] - 2026-05-15

### Added
- **Database technology fields**: Added granular database selection for accurate cost estimation
  - `hasPostgresDatabase`: PostgreSQL on-premise (10 VM critical, 5 VM standard)
  - `hasMongoDatabase`: MongoDB on-premise (10 VM replica set)
  - `dedicatedSqlCluster`: SQL Server dedicated vs shared cluster (4 VM vs €0)
- **Knowledge base rewrite**: Replaced generic AWS/Azure pricing with real CA architecture
  - Complete `field-to-cost-mapping.md` v2.0 with ACN vendor pricing
  - OpenShift cost model (pod management, worker nodes, licenses, namespaces)
  - Database architectures (SQL shared/dedicated, PostgreSQL critical/standard, MongoDB replica set)
  - Storage with environment ponderations (Prod 1.0, DR 1.0, Parallelo 0.5, Collaudo 0.3)
  - Monitoring (Dynatrace Full Stack/Infrastructure, K8s, Logs)
  - VMware licensing (vCPU/3 × €89 × 1.22)

### Fixed
- **Professional services costs corrected**: Fixed pricing inconsistencies in knowledge base
  - QA COMPLESSO: €45,750 → **€27,450** (50 days × €450 × 1.22)
  - DevOps Pipeline COMPLESSO: €16,470 → **€12,200** (LVL3)
  - Observability COMPLESSO: €21,960 → **€24,400** (LVL3 for 2 environments)
- **Load testing percentages verified**: 4%, 7%, 11% midpoints confirmed from knowledge files

### Changed
- **Oracle Exadata warning**: Added strategic deprecation warning when Oracle database selected
- **Database labels updated**: Clarified SQL Server vs generic SQL in form labels
- **Cost calculation accuracy**: Database-heavy projects now ±10% accuracy (was ±20%)

### Documentation
- **KNOWLEDGE_BASE_ALIGNMENT_2026-05-15.md**: Complete verification of costs vs source files
- **NEW_DATABASE_FIELDS_2026-05-15.md**: Database field additions with cost examples
- **field-to-cost-mapping.md v2.0**: 800-line rewrite with CA real architecture

## [1.1.2] - 2026-05-14

### Fixed
- **CRITICAL: OPEX double-counting bug**: AI was creating separate line items for "Project Duration Adjustment" and "Risk Contingency" instead of including them in base costs
  - Example: €401k line items + €234k duration + €127k risk = €762k (wrong)
  - Now: Line items already include duration proration and risk contingency
  - Added explicit validation rules in estimation prompt to prevent recurrence
- **Mathematical validation**: Added self-check rules before AI submits estimation to ensure line items sum to totals
- **OPEX projection validation**: Validation agent was incorrectly flagging decreasing OPEX as error for on-premise infrastructure
  - On-premise: decreasing costs over time (depreciation) is CORRECT ✅
  - Cloud: increasing costs over time (inflation) is CORRECT ✅
  - Validator now checks infrastructure type before flagging projection issues

### Changed
- **Estimation prompt clarity**: Made explicit that duration and risk adjustments are NOT separate line items
- **Line item descriptions**: Now include mention of duration and contingency (e.g., "Infrastructure Mgmt - 18 months prorated, 15% contingency")
- **Knowledge base cleanup**: Removed all testMagnitude references (application testing is outside CTO scope)
  - Removed Test Magnitude criterion from classification (now 14 criteria instead of 16)
  - Removed test environment cost calculations from field-to-cost-mapping
  - Updated data transformer to not pass testMagnitude to AI

### Documentation
- **BUGFIX_OPEX_DOUBLE_COUNTING.md**: Complete analysis of OPEX double-counting issue and fix
- **BUGFIX_OPEX_PROJECTION_VALIDATION.md**: Multi-year OPEX projection validation logic (on-premise vs cloud)
- **CLEANUP_TESTMAGNITUDE_REMOVAL.md**: Documentation of testMagnitude field removal from knowledge base

## [1.1.1] - 2026-05-13

### Added
- **Professional services form fields**: Added `requiresFeasibilityStudy` and `requiresRfcSupport` checkboxes for CTO services
- **CAPEX knowledge base**: Complete documentation for all CAPEX components with CA tariffario 2026 pricing
  - Dynatrace dashboard costs (3 levels: €0, €14,640, €24,400)
  - DevOps pipeline costs (3 levels: €0, €7,320, €12,200)
  - QA infrastructure services (3 levels: €0, €10,980, €27,450)
  - Load testing percentage-based calculation (0%, 4%, 7%, 11% of CAPEX)
  - Professional services: Feasibility Study (€8,674-€32,232) and RFC Support (€4,880-€29,646)

### Changed
- **Form structure rationalized**: Reorganized into 5 logical sections aligned with cost calculation needs
- **Pipeline thresholds updated**: Changed to market standards (< 5, 5-15, 15-40, > 40 pipelines)
- **Project classification bands**: Budget ranges marked as indicative guidelines, not rigid limits
- **Test magnitude deprecated**: Removed application testing references (out of CTO scope)

### Fixed
- **Knip pre-commit hook**: Changed to non-blocking warnings to avoid false positives on framework dependencies
- **ESLint 10 migration**: Migrated to flat config format (eslint.config.mjs) with SonarJS integration

### Development
- **Knip integration**: Added unused code detection across monorepo with workspace-specific configs
- **ESLint + SonarJS**: Code quality enforcement with cognitive complexity limits and duplicate detection
- **Husky pre-commit hooks**: Automated code quality checks (non-blocking workflow)

### Documentation
- **CAPEX component docs**: 5 comprehensive knowledge files with decision trees and tariff tables
- **Code quality setup guides**: Knip, ESLint, SonarJS configuration and troubleshooting

## [1.1.0] - 2026-05-11

### Added
- **Multi-model AI support**: Generate estimations with Claude Sonnet 4.5, Opus 4, or Haiku 4
- **Model comparison UI**: Admin dashboard with dropdown to select specific AI model for estimation
- **Model comparison modal**: Side-by-side comparison of estimations from different models
- **Quotation reassignment**: Admin can reassign quotations to other admins via "↻" button
- **Auto-assignment on status change**: Changing status to "IN VALUTAZIONE" automatically assigns quotation to acting admin
- **Build script**: `scripts/build-all.sh` for clean builds without cache
- **Multi-model test script**: `scripts/test-multi-model.sh` for testing different models via API

### Changed
- **Email operations async**: All email sends are now fire-and-forget to prevent blocking API responses
- **Response time improvement**: Quotation creation now responds in <500ms (was 5-15s)
- **SMTP timeouts**: Reduced connection timeout to 10s, socket timeout to 15s
- **Email retry policy**: Reduced max attempts from 3 to 2, retry delay from 5s to 2s
- **Model cost calculation**: AI service now uses correct pricing for each model instead of hardcoded Sonnet pricing

### Fixed
- **Missing "Take in charge" button**: Button no longer disappears when status is changed before taking in charge
- **Admin assignment workflow**: Status changes to "IN VALUTAZIONE" now properly assign admin and trigger AI estimation
- **Frontend test failures**: Updated test signatures to match new method parameters
- **TypeScript compilation**: Fixed AdminQuotation mock objects missing required properties

### Performance
- **API response time**: 20-40x improvement for quotation creation (8-12s → <500ms)
- **P95 latency**: 18x improvement (15s → 800ms)
- **Email resilience**: System continues working even if SMTP is down or slow

### Documentation
- **Multi-model feature guide**: Complete documentation of model selection and comparison
- **Performance optimization guide**: Email async patterns and best practices
- **Assignment bugfix documentation**: Detailed explanation of auto-assignment logic
- **IDE diagnostics workflow**: Process for checking TypeScript errors before completion

## [3.0.2] - 2026-05-06

### Added
- **Token consumption tracking**: Display input/output tokens and cost (USD) for AI estimations
- **Token statistics dashboard**: Admin section showing total tokens, costs, and averages
- **AI validation issues UI**: Display validation problems with severity badges (HIGH/MEDIUM/LOW) in admin interface
- **Comprehensive validation prompt**: Strict AI validation rules with CAPEX=0 detection
- **Draft quotations system**: Auto-save drafts every 5 seconds with manual save option
- **Login with matricola**: Allow authentication using matricola in addition to email
- **AI estimation approval workflow**: Admin can approve/reject AI_VALIDATED, AI_NEEDS_REVIEW, and AI_REJECTED states
- **Auto-refresh UI**: Admin dashboard refreshes AI estimations every 10s, user dashboard every 15s
- **Estimation progress dialog**: Visual feedback during 70-90s AI estimation generation

### Changed
- **Token accumulation on retry**: Tokens now sum across multiple AI estimation attempts instead of replacing
- **PDF/Excel download**: Fixed Unauthorized error by using fetch with Authorization header
- **Field labels**: Fixed "Stato Quotazioni" detail showing readable labels instead of variable names
- **Test Magnitude field**: Added "N/A" option to form dropdown

### Fixed
- **Draft not populating fields**: Project Code and Project Name now correctly populate when reopening drafts
- **Overlapping text in dashboard**: Removed redundant subtitle causing text overlap
- **AI estimation refresh**: Admin UI now properly reloads AI estimations after operations

### Security
- **Removed exposed credentials**: Cleaned up SMTP credentials from version control

## [3.0.1] - 2026-05-05

### Added
- **Draft quotations**: Users can save incomplete quotations as drafts (status: BOZZA)
- **Draft auto-save**: Automatic save every 5 seconds after first manual save
- **Draft management**: Edit, delete, and submit drafts from dashboard
- **Admin manual CAPEX/OPEX**: Admin can override AI estimations with manual values
- **Admin delete quotations**: Soft delete with confirmation for quotations in any state
- **PDF/Excel export**: Export AI estimations in both formats
- **AI estimation visualization**: Detailed breakdown view with line items and assumptions
- **Comprehensive hook system**: Pre-commit, pre-push, post-merge hooks for quality enforcement
- **Code quality checks**: Automated validation of coupling, patterns, and architecture

### Changed
- **Admin UI improvements**: Better button styling, clearer action workflows
- **Credit Agricole logo**: Increased size to 120x120px for better visibility
- **Pagination options**: Admin can view 10/20/50/All quotations

### Fixed
- **AI estimation completion**: Quotations can now be completed with AI estimations as economic quotation

## [3.0.0] - 2026-05-04

### Added
- **HTTP-based microservices**: Direct HTTP communication between backend and AI service
- **Fire-and-forget pattern**: Async AI estimation requests without blocking
- **Public endpoints**: `@Public()` decorator for service-to-service calls without JWT
- **AWS Bedrock integration**: Claude Sonnet 4.5 for AI cost estimations
- **Converse API**: Second-generation API with tool use and multi-turn support
- **Circuit breaker pattern**: Auto-recovery after 5 consecutive AWS Bedrock failures
- **Retry AI estimation**: Admin button to manually retry failed estimations
- **Admin flexible pagination**: 10/20/50/All options in quotations management
- **Observability stack**: Loki + Promtail + Grafana for centralized logging
- **Test results dashboard**: Grafana dashboard for test execution visualization
- **Comprehensive test suite**: 123 backend tests, 130 frontend tests

### Changed
- **Removed RabbitMQ**: Simplified architecture without message broker dependency
- **Microservices communication**: HTTP-based instead of AMQP
- **Async operations**: Fire-and-forget for non-critical paths

### Removed
- **RabbitMQ**: No longer required for service communication
- **Message queues**: Replaced with HTTP fire-and-forget pattern

## [2.0.0] - 2026-04-XX

### Added
- Initial release with RabbitMQ-based architecture
- Basic quotation workflow (INVIATA → IN VALUTAZIONE → COMPLETATA/RESPINTA)
- Admin evaluation workflow
- User authentication (JWT + refresh tokens)
- PostgreSQL 16+ database
- Angular 17 frontend with Credit Agricole design system
- NestJS backend with TypeORM
- Email notifications for new quotations
- Role-based access control (USER, ADMIN)

---

## Versioning Strategy

- **Major version (X.0.0)**: Breaking changes in architecture or API
- **Minor version (X.Y.0)**: New features, backward-compatible
- **Patch version (X.Y.Z)**: Bug fixes, documentation updates

## Migration Notes

### From 2.0 to 3.0

**Breaking Changes:**
- RabbitMQ is no longer required
- AI service endpoints changed from AMQP to HTTP
- Environment variables: Added `AI_SERVICE_URL` and `BACKEND_SERVICE_TOKEN`

**Migration Steps:**
1. Remove RabbitMQ deployment
2. Update environment variables in backend and AI service
3. Deploy new HTTP-based AI service
4. Verify public endpoints are accessible without JWT

### From 3.0.0 to 3.0.1

**New Features:**
- Draft system requires no migration
- New `status` ENUM value 'BOZZA' added automatically
- AI estimations table unchanged

### From 3.0.1 to 3.0.2

**Database Changes:**
- Three new columns in `ai_estimations` table: `input_tokens`, `output_tokens`, `estimated_cost_usd`
- Run manual SQL script if TypeORM migrations fail:
  ```sql
  ALTER TABLE ai_estimations 
  ADD COLUMN input_tokens INTEGER DEFAULT 0,
  ADD COLUMN output_tokens INTEGER DEFAULT 0,
  ADD COLUMN estimated_cost_usd NUMERIC(10,6) DEFAULT 0;
  ```

**New Features:**
- Token tracking requires AWS Bedrock API access
- Validation prompt file added to AI service (auto-loaded if present)
