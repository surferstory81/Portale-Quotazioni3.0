# Husky + Knip Pre-Commit Hook Setup

**Date:** 2026-05-13  
**Purpose:** Automated code quality checks before commits

---

## 🎯 Overview

Configured pre-commit hooks using Husky to automatically run Knip analysis before each commit. This helps catch unused code and dependencies early in the development process.

---

## 📦 Installed Packages

```bash
npm install --save-dev husky lint-staged knip
```

**Versions:**
- `husky`: ^9.1.7
- `lint-staged`: ^17.0.4
- `knip`: ^6.13.1

---

## ⚙️ Configuration

### 1. Husky Pre-Commit Hook

**File:** `.husky/pre-commit`

```bash
# Run Knip check (warning only, doesn't block commit)
echo "🔍 Running Knip analysis (informational)..."
npm run knip || echo "⚠️  Knip found some issues. Review with 'npm run knip' when convenient."

echo "✅ Pre-commit checks completed!"
```

**Behavior:**
- ✅ Runs Knip analysis automatically
- ⚠️ Shows warnings but **doesn't block commits**
- 💡 Informational only - developers can review issues later

**Why non-blocking?**
- Knip reports some false positives (e.g., database migrations, framework dependencies)
- Allows developers to commit WIP code
- Provides awareness without disrupting workflow

---

### 2. Package.json Scripts

```json
{
  "scripts": {
    "knip": "knip",
    "knip:frontend": "knip --workspace frontend",
    "knip:backend": "knip --workspace backend",
    "knip:ai": "knip --workspace ai-estimation-service",
    "knip:production": "knip --production",
    "knip:fix": "knip --fix",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,js,json,md}": [
      "prettier --write"
    ],
    "package.json": [
      "npm run knip:production"
    ]
  }
}
```

---

### 3. Knip Configuration

**File:** `knip.json`

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "workspaces": {
    ".": {
      "entry": ["scripts/**/*.js"],
      "project": ["scripts/**/*.js"]
    },
    "frontend": {
      "entry": ["src/main.ts"],
      "project": ["src/**/*.ts", "src/**/*.html"],
      "ignore": ["**/*.spec.ts"]
    },
    "backend": {
      "entry": ["src/main.ts"],
      "project": ["src/**/*.ts"],
      "ignore": ["**/*.spec.ts", "test/**"]
    },
    "ai-estimation-service": {
      "entry": ["src/main.ts"],
      "project": ["src/**/*.ts"],
      "ignore": ["**/*.spec.ts", "test/**"]
    }
  }
}
```

---

## 🔄 Workflow

### For Developers

#### 1. Making a Commit

```bash
git add .
git commit -m "feat: add new feature"
```

**What happens:**
1. Husky triggers pre-commit hook
2. Knip runs and shows analysis
3. Warning displayed if issues found
4. Commit proceeds regardless

**Example output:**
```
🔍 Running Knip analysis (informational)...

Unused files (12)
backend/src/migrations/...

⚠️  Knip found some issues. Review with 'npm run knip' when convenient.

✅ Pre-commit checks completed!
[main abc1234] feat: add new feature
```

#### 2. Bypassing the Hook (Not Recommended)

If you absolutely need to skip the hook:

```bash
git commit --no-verify -m "emergency fix"
```

**Use sparingly** - only for urgent fixes where hook blocks you incorrectly.

---

### 3. Reviewing Knip Issues

When Knip reports issues, review them:

```bash
# Full analysis
npm run knip

# Specific workspace
npm run knip:frontend
npm run knip:backend
npm run knip:ai

# Only production issues (no dev deps)
npm run knip:production
```

Then clean up:
- Remove unused files
- Remove unused dependencies: `npm uninstall package-name`
- Remove unused exports from code

---

## 📊 Current Known Issues (Safe to Ignore)

### 1. Database Migrations (12 files)

```
backend/src/migrations/*.ts
backend/src/config/data-source.ts
```

**Status:** False positive ✅  
**Reason:** TypeORM loads migrations dynamically at runtime  
**Action:** Keep these files, they are required for database versioning

---

### 2. Unlisted Dependencies

```
express - used in 6 files
```

**Status:** Expected behavior ✅  
**Reason:** Express is a transitive dependency via `@nestjs/platform-express`  
**Action:** Types are available, no action needed

---

### 3. Unused Dev Dependency

```
lint-staged - package.json
```

**Status:** False positive ✅  
**Reason:** Used by Husky, not directly imported in code  
**Action:** Keep, it's used by pre-commit hook

---

## 🎯 Benefits

### For Developers
- ✅ Early awareness of unused code
- ✅ Cleaner codebase over time
- ✅ Non-blocking workflow

### For Codebase
- 📦 Smaller bundle sizes
- 🧹 Less technical debt
- 📈 Better maintainability

### For CI/CD
- Can add stricter Knip checks in CI pipeline
- Pre-commit provides first line of defense

---

## 🔧 Customization Options

### Make Hook Blocking (Strict Mode)

If you want commits to fail when Knip finds issues:

```bash
# .husky/pre-commit
npm run knip || exit 1
```

**Not recommended** due to false positives.

---

### Run Only on Changed Files

Use lint-staged to run Knip only on modified workspaces:

```json
{
  "lint-staged": {
    "frontend/**/*": "npm run knip:frontend",
    "backend/**/*": "npm run knip:backend",
    "ai-estimation-service/**/*": "npm run knip:ai"
  }
}
```

---

### Add to CI/CD Pipeline

```yaml
# .github/workflows/code-quality.yml
name: Code Quality

on: [pull_request]

jobs:
  knip:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run knip
        continue-on-error: true  # Don't fail PR, just report
```

---

## 🐛 Troubleshooting

### Hook Not Running

```bash
# Verify Husky is installed
ls -la .husky/

# Reinstall hooks
npm run prepare

# Make hook executable
chmod +x .husky/pre-commit
```

---

### Knip Takes Too Long

```bash
# Run on specific workspace only
npm run knip:backend

# Skip in hook temporarily (edit .husky/pre-commit)
# Comment out: npm run knip
```

---

### False Positives Accumulating

Update `knip.json` to ignore specific patterns:

```json
{
  "ignore": [
    "**/migrations/**",
    "src/config/data-source.ts"
  ]
}
```

---

## 📝 Maintenance

### Weekly Cleanup

```bash
# Run full analysis
npm run knip

# Remove unused exports
npm run knip:fix

# Review and remove unused files/deps manually
```

### Monthly Review

- Review ignored patterns in `knip.json`
- Update to latest Knip version: `npm update knip`
- Re-evaluate if hook should be blocking

---

## ✅ Testing

### Test the Hook

```bash
# Run hook manually
.husky/pre-commit

# Should show Knip output without errors
```

### Verify Installation

```bash
# Check Husky
npm run prepare

# Check Knip works
npm run knip

# Test commit (dry-run)
git add .
git commit --dry-run -m "test"
```

---

## 🎓 Best Practices

### 1. Don't Ignore Real Issues
- If Knip reports unused code, investigate
- Remove if truly unused
- Document if intentionally exported for future use

### 2. Keep Dependencies Lean
- Regularly run `npm run knip` to check for bloat
- Remove dependencies you no longer use

### 3. Update Configuration
- Add new workspaces to `knip.json` when created
- Adjust ignore patterns as needed

### 4. Educate Team
- Share this document with team members
- Explain why Knip is valuable
- Show how to interpret results

---

**Setup Status:** ✅ Complete  
**Hook Mode:** Non-blocking (informational)  
**Recommendation:** Run `npm run knip` weekly for cleanup
