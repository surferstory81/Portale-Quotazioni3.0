# Project Guidelines

## Code Style
- Use TypeScript with NestJS patterns: controller -> service -> repository.
- Keep validation in DTO classes with class-validator decorators.
- Keep user-facing/API messages in Italian to match existing codebase language.
- For entities, prefer explicit column names in snake_case where DB naming differs from TypeScript naming (example: password_hash, created_at).
- Prefer UUID primary keys for business entities, consistent with existing entities.

## Architecture
- Backend is a modular NestJS monolith centered in src/modules.
- Main modules:
  - auth: JWT authentication, refresh token flow, password recovery, SSO integration.
  - users: user lookup and profile-related logic.
  - quotations: quotation domain logic and related details.
  - logs: audit log persistence.
  - security: throttling, IP blocking, security event logging, middleware protections.
- Data access is done via TypeORM repositories injected in services.
- App bootstrapping runs migrations on startup via BootstrapService.

## Build and Test
- Install dependencies: npm install
- Development server: npm run start:dev
- Production build: npm run build
- Lint and auto-fix: npm run lint
- Format code: npm run format
- Run DB migrations manually: npm run migration:run
- Revert latest migration: npm run migration:revert

## Conventions
- Keep controllers thin; put business rules in services.
- Enforce authorization with guards and decorators (JwtAuthGuard, RolesGuard, @Roles).
- User data isolation is mandatory: queries for domain data must always be scoped to the authenticated user unless endpoint is explicitly admin-only.
- Keep security logging non-blocking: logging failures must not break request handling.
- Use config namespaces via registerAs and access nested keys with ConfigService.
- Avoid TypeORM synchronize; use migrations for schema changes.

## Gotchas
- Migrations are expected in this project. If entities change, add/update migrations and verify startup behavior.
- Default .env.example values are placeholders; use strong JWT secrets and real environment values in non-local environments.
- IP blocking is currently in-memory and not shared across instances.

## References
- Setup and database bootstrap flow: README.md
- Environment variables and defaults: .env.example
