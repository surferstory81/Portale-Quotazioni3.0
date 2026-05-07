# Repository Management Skill

## Purpose

This skill defines rules and best practices for maintaining a clean, professional repository structure. It ensures that only source code and essential configuration files are tracked, while excluding IDE-specific, build artifacts, and temporary files.

---

## Files That Should NEVER Be Committed

### IDE and Editor Files
- `.vs/` - Visual Studio solution cache and state
- `.vscode/` - VS Code workspace settings (unless project-specific and documented)
- `.idea/` - JetBrains IDE settings
- `*.swp`, `*.swo` - Vim swap files
- `.DS_Store` - macOS Finder metadata

### Build Artifacts and Cache
- `dist/`, `build/` - Compiled/bundled output
- `*.tsbuildinfo` - TypeScript incremental build cache
- `*.js.map` - Source maps (unless explicitly needed for production debugging)
- `*.d.ts` - Generated type definitions (unless hand-written)
- `node_modules/` - Dependencies (always install from package.json)

### Logs and Temporary Files
- `*.log` - Application logs
- `*.ndjson` - Test result logs
- `*.tmp`, `*.temp` - Temporary files
- `logs/` directories containing runtime logs

### Sensitive Data
- `.env` - Environment variables with secrets
- `*.key`, `*.pem`, `*.crt` - Certificates and keys
- `credentials.json` - API keys and tokens
- Any file containing passwords, tokens, or API keys

---

## .gitignore Structure

The `.gitignore` file must be comprehensive and organized by category:

```gitignore
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment variables
.env
.env.local
.env.*.local

# Type definitions and maps
*.js.map
*.d.ts

# Log files
*.log
*.ndjson
logs/

# IDE files
.vs/
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Build artifacts
*.tsbuildinfo
```

---

## Repository Health Checks

### When to Verify Repository Cleanliness

1. **Before initial push** - Review all tracked files
2. **After adding new services/modules** - Ensure no artifacts were accidentally staged
3. **Periodically during development** - Run health checks every few weeks
4. **Before major releases** - Clean audit before tagging versions

### Verification Commands

```bash
# Check for accidentally tracked files
git ls-files | grep -E '\.(log|tsbuildinfo|ndjson)$'
git ls-files | grep -E '^\.vs/|^\.vscode/|^\.idea/'

# Check working tree status
git status

# Compare local with remote
git fetch origin
git diff origin/dev
git log --oneline --branches --not --remotes

# List untracked files
git status --porcelain | grep '^??'
```

---

## Cleanup Procedure

If accidentally committed files are found:

1. **Remove from tracking** (keep local copy):
   ```bash
   git rm --cached <file-or-directory>
   ```

2. **Update .gitignore**:
   Add patterns to prevent re-tracking

3. **Commit the cleanup**:
   ```bash
   git commit -m "chore: remove [IDE files|build artifacts|logs] from repository"
   ```

4. **Push to remote**:
   ```bash
   git push origin <branch>
   ```

5. **Verify**:
   ```bash
   git status  # Should show "working tree clean"
   git diff origin/<branch>  # Should show no differences
   ```

---

## Pre-Commit Checklist

Before committing, verify:

- [ ] No `.env` files staged
- [ ] No `node_modules/` directories
- [ ] No IDE-specific files (`.vs/`, `.vscode/`, `.idea/`)
- [ ] No build artifacts (`dist/`, `*.tsbuildinfo`)
- [ ] No log files (`*.log`, `*.ndjson`)
- [ ] Only source code and configuration files staged
- [ ] `.gitignore` is up-to-date

---

## Directory Structure Expectations

A clean repository should have:

```
project-root/
├── .github/              ← CI/CD workflows, issue templates
├── .claude/              ← Claude Code skills and settings
├── backend/              ← Backend service source code
├── frontend/             ← Frontend application source code
├── ai-estimation-service/ ← Microservice source code
├── docs/                 ← Technical documentation
│   ├── architecture/     ← System architecture and design
│   └── development/      ← Development guidelines
├── k8s/                  ← Kubernetes manifests
├── scripts/              ← Build and deployment scripts
├── .claude/              ← Claude Code configuration
│   ├── docs/             ← AI assistant instructions
│   ├── skills/           ← Domain-specific knowledge
│   ├── hooks/            ← Quality enforcement scripts
│   └── memory/           ← Persistent memory
├── .dockerignore         ← Docker build exclusions
├── .env.example          ← Template for environment variables
├── .gitignore            ← Git exclusions
├── CHANGELOG.md          ← Version history
├── README.md             ← Project documentation
├── SECURITY.md           ← Security policy
└── package.json          ← Root dependencies (if workspace)
```

### What Should NOT Appear at Root Level

- `node_modules/` - Should be in each service directory and ignored
- `.vs/`, `.vscode/` - IDE files should be ignored
- `dist/`, `build/` - Build output should be ignored
- `*.log` - Logs should be ignored
- Individual `.env` files - Only `.env.example` should be tracked

---

## Integration with Development Workflow

### During Active Development

Claude should proactively check repository cleanliness when:
- Adding new files or directories
- After running builds or tests
- Before creating commits
- When user mentions "push" or "remote"

### Automated Checks

Consider adding pre-commit hooks:

```bash
# .husky/pre-commit or git hooks
#!/bin/bash
# Check for accidentally staged sensitive files
if git diff --cached --name-only | grep -qE '\.env$|\.log$|\.tsbuildinfo$'; then
  echo "Error: Attempting to commit files that should be ignored"
  exit 1
fi
```

---

## Repository Hygiene Principles

1. **Only track source code** - Not generated artifacts
2. **Keep secrets out** - Use `.env.example` templates
3. **Platform-agnostic** - No OS or IDE-specific files
4. **Reproducible builds** - Everything needed should be in package.json
5. **Clean history** - Remove mistakes promptly, don't let them accumulate

---

## When Claude Should Flag Issues

Claude must alert the user when:
- Files matching ignore patterns are staged for commit
- `.env` files are about to be committed
- Large binary files (>1MB) are being added
- IDE directories appear in `git status`
- Build artifacts are in the staging area

## How to Apply This Skill

1. **Before any commit** - Run verification checks
2. **After adding new services** - Review `.gitignore` coverage
3. **On user request** - When asked to verify repository state
4. **Proactively** - If `git status` shows suspicious files

---

## Related Files

- `.gitignore` - Primary exclusion rules
- `.dockerignore` - Exclusions for Docker builds
- `.env.example` - Template for environment variables
- `.claude/docs/CLAUDE.md` - References this skill in governance rules
- `docs/development/quality.md` - Code quality standards and best practices
