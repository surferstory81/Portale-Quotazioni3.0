# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
