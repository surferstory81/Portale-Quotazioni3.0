# Documentation Index

This directory contains comprehensive technical documentation for the Portale Quotazioni 3.0 project.

---

## 📚 Documentation Structure

```
docs/
├── README.md                    ← You are here
├── architecture/                ← System architecture and design
│   ├── overview.md             ← High-level architecture, diagrams, tech stack
│   ├── microservices.md        ← Service coupling analysis, communication patterns
│   └── deployment.md           ← Production deployment options, scaling strategies
└── development/                 ← Development guidelines and tools
    ├── hooks.md                ← Git hooks system and quality enforcement
    └── quality.md              ← Code quality standards and best practices
```

---

## 🎯 Quick Navigation

### For Developers Getting Started
Start with the project [README](../README.md) in the root directory, which covers:
- Quick start guide
- Local development setup
- Features overview
- Basic troubleshooting

### For Understanding the Architecture

| Document | Purpose | Audience |
|---|---|---|
| [Architecture Overview](architecture/overview.md) | Complete system architecture with diagrams, database schema, API design, security | Architects, Senior Devs |
| [Microservices Analysis](architecture/microservices.md) | Service coupling patterns, communication flows, anti-patterns | Backend Developers |
| [Deployment Options](architecture/deployment.md) | Production deployment strategies, Kubernetes/OpenShift setup, scaling | DevOps, SRE |

### For Development Workflow

| Document | Purpose | Audience |
|---|---|---|
| [Git Hooks System](development/hooks.md) | Automated quality checks, pre-commit/pre-push hooks, hook configuration | All Developers |
| [Quality Standards](development/quality.md) | Code quality best practices, patterns, anti-patterns, testing requirements | All Developers |

### For AI Assistant (Claude Code)

Claude-specific documentation is located in [`.claude/docs/CLAUDE.md`](../.claude/docs/CLAUDE.md), which contains:
- Project principles and constraints
- AI usage policy
- Skills reference
- How Claude should help (and not help)

---

## 📖 Additional Resources

### Root-Level Documentation

| File | Content |
|---|---|
| [`README.md`](../README.md) | Project overview, quick start, features, setup instructions |
| [`CHANGELOG.md`](../CHANGELOG.md) | Version history, migration notes, breaking changes |
| [`SECURITY.md`](../SECURITY.md) | Security policy, vulnerability reporting |

### Domain-Specific Skills

Located in [`.claude/skills/`](../.claude/skills/), these files define domain behavior for Claude AI:

| Skill | Domain |
|---|---|
| `quotation-workflow.md` | Quotation lifecycle, states, form definition |
| `frontend.md` | Angular 17 structure, UX patterns, components |
| `backend.md` | NestJS API design, database, security |
| `cost-model.md` | CAPEX/OPEX structure, formulas, thresholds |
| `ai-estimation.md` | AI scope, constraints, validation rules |
| `admin-portal.md` | Admin workflows, state transitions |

### Git Hooks Implementation

Located in [`.claude/hooks/`](../.claude/hooks/), these files implement quality enforcement:
- `check-service-coupling.js` - Prevents tight coupling between services
- `code-quality-check.js` - Enforces coding standards and patterns
- `validate-architecture.js` - Validates architectural decisions
- `install-hooks.sh` - Installs hooks in local repository

---

## 🔄 Document Maintenance

### When to Update

- **Architecture docs**: When making architectural decisions or changes
- **Development docs**: When updating development workflows or standards
- **Skills**: When clarifying business rules or domain behavior
- **Root README**: When adding major features or changing setup process
- **CHANGELOG**: For every release and notable change

### Documentation Principles

1. **DRY (Don't Repeat Yourself)**: Link to other docs instead of duplicating
2. **Audience-Specific**: Write for the intended reader (dev vs. architect vs. AI)
3. **Keep Updated**: Update docs in the same PR as code changes
4. **Examples First**: Show examples before explaining theory
5. **Link Liberally**: Cross-reference related documentation

---

## 🤝 Contributing to Documentation

When adding new documentation:

1. **Choose the right location**:
   - User-facing → Root README
   - Technical deep-dive → `docs/architecture/` or `docs/development/`
   - AI instructions → `.claude/docs/` or `.claude/skills/`
   - Version changes → `CHANGELOG.md`

2. **Follow the structure**:
   - Use clear headings and sections
   - Add table of contents for long documents
   - Include code examples where relevant
   - Add diagrams for complex concepts

3. **Update this index**:
   - Add new documents to the navigation tables above
   - Keep the structure diagram up to date

4. **Review checklist**:
   - [ ] Is the document in the correct directory?
   - [ ] Does it have a clear purpose and audience?
   - [ ] Are there any duplications with existing docs?
   - [ ] Are all links working?
   - [ ] Is it referenced in this index?

---

## 📧 Questions?

If you can't find what you're looking for:
1. Check the [README](../README.md) for quick answers
2. Search the repository for keywords
3. Check `.claude/skills/` for domain-specific details
4. Consult with the team lead or architect

For issues or improvements to documentation:
- Open an issue describing what's unclear
- Submit a PR with corrections or additions
