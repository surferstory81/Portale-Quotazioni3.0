# ESLint + SonarJS Integration

**Date:** 2026-05-13  
**Purpose:** Static code analysis with SonarJS rules for code quality

---

## 🎯 Overview

Integrated **ESLint** with **SonarJS** plugin to enforce code quality rules automatically. ESLint runs in the pre-commit hook alongside Knip to catch issues before they reach the repository.

**SonarJS Benefits:**
- 🐛 Detects code smells and bugs
- 🧠 Enforces cognitive complexity limits
- 🔄 Finds duplicate code
- 🎯 Improves maintainability

---

## 📦 Installed Packages

```bash
npm install --save-dev @eslint/js eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-sonarjs
```

**Versions:**
- `eslint`: ^10.3.0
- `@eslint/js`: ^10.3.1
- `@typescript-eslint/eslint-plugin`: ^8.59.3
- `@typescript-eslint/parser`: ^8.59.3
- `eslint-plugin-sonarjs`: ^4.0.3

---

## ⚙️ Configuration

### Flat Config (eslint.config.mjs)

ESLint 10+ uses the new "flat config" format:

```javascript
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import sonarjs from 'eslint-plugin-sonarjs';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.spec.ts',
      '**/.angular/**'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.js'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      'sonarjs': sonarjs
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...sonarjs.configs.recommended.rules,
      
      // Custom rules
      'sonarjs/cognitive-complexity': ['error', 20],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  }
];
```

---

## 🔍 Key SonarJS Rules Enabled

### 1. Cognitive Complexity

**Rule:** `sonarjs/cognitive-complexity`  
**Level:** Error  
**Threshold:** 20

Limits function complexity to improve readability.

**Example violation:**
```typescript
// ❌ Too complex (>20)
function processOrder(order) {
  if (order.type === 'new') {
    if (order.priority === 'high') {
      if (order.customer.vip) {
        if (order.items.length > 10) {
          // ... many nested conditions
        }
      }
    }
  }
}

// ✅ Refactored
function processOrder(order) {
  if (!isValidOrder(order)) return;
  const handler = getOrderHandler(order);
  handler.process(order);
}
```

---

### 2. No Duplicate Strings

**Rule:** `sonarjs/no-duplicate-string`  
**Level:** Warning

Detects magic strings used multiple times.

**Example:**
```typescript
// ❌ Duplicate string
function getUser() {
  const type = "admin";
  if (user.role === "admin") {
    log("admin user accessed");
  }
}

// ✅ Use constants
const USER_TYPE_ADMIN = "admin";
function getUser() {
  const type = USER_TYPE_ADMIN;
  if (user.role === USER_TYPE_ADMIN) {
    log(`${USER_TYPE_ADMIN} user accessed`);
  }
}
```

---

### 3. No Identical Functions

**Rule:** `sonarjs/no-identical-functions`  
**Level:** Error

Finds duplicated function implementations.

**Example:**
```typescript
// ❌ Identical functions
function formatUserName(user) {
  return `${user.firstName} ${user.lastName}`;
}

function formatAdminName(admin) {
  return `${admin.firstName} ${admin.lastName}`;
}

// ✅ Extract common function
function formatFullName(person) {
  return `${person.firstName} ${person.lastName}`;
}
```

---

### 4. No Collapsible If

**Rule:** `sonarjs/no-collapsible-if`  
**Level:** Warning

Suggests collapsing nested ifs.

**Example:**
```typescript
// ❌ Collapsible
if (condition1) {
  if (condition2) {
    doSomething();
  }
}

// ✅ Collapsed
if (condition1 && condition2) {
  doSomething();
}
```

---

### 5. No Small Switch

**Rule:** `sonarjs/no-small-switch`  
**Level:** Warning

Switch with only 2 cases should be if/else.

**Example:**
```typescript
// ❌ Unnecessary switch
switch (status) {
  case 'active':
    return true;
  case 'inactive':
    return false;
}

// ✅ Use if/else
return status === 'active';
```

---

## 📜 NPM Scripts

### Root Package.json

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.js",
    "lint:fix": "eslint . --ext .ts,.js --fix",
    "lint:frontend": "cd frontend && npm run lint",
    "lint:backend": "cd backend && npm run lint",
    "lint:ai": "cd ai-estimation-service && npm run lint",
    "lint:all": "npm run lint:frontend && npm run lint:backend && npm run lint:ai"
  }
}
```

### Usage

```bash
# Lint entire monorepo
npm run lint

# Auto-fix issues
npm run lint:fix

# Lint specific workspace
npm run lint:frontend
npm run lint:backend
npm run lint:ai

# Lint all workspaces
npm run lint:all
```

---

## 🪝 Pre-Commit Hook Integration

### Updated `.husky/pre-commit`

```bash
# Run ESLint + SonarJS check
echo "🔍 Running ESLint + SonarJS analysis..."
npm run lint:fix || {
  echo "❌ ESLint found issues. Some were auto-fixed, please review changes."
  echo "💡 Run 'npm run lint' to see remaining issues."
}

# Run Knip check
echo ""
echo "🔍 Running Knip analysis (informational)..."
npm run knip || echo "⚠️  Knip found some issues..."

echo ""
echo "✅ Pre-commit checks completed!"
```

**Behavior:**
1. Runs `lint:fix` to auto-fix simple issues
2. Shows warnings for remaining problems
3. Doesn't block commit (informational only)
4. Developer should review and fix manually

---

## 🔄 Workflow Examples

### Making a Commit

```bash
git add .
git commit -m "feat: add feature"
```

**Output:**
```
🔍 Running ESLint + SonarJS analysis...

C:\path\to\file.ts
  10:5  error  This function has a complexity of 22  sonarjs/cognitive-complexity
  
❌ ESLint found issues. Some were auto-fixed, please review changes.
💡 Run 'npm run lint' to see remaining issues.

🔍 Running Knip analysis (informational)...
...

✅ Pre-commit checks completed!
```

Commit proceeds, but developer knows to fix the complexity issue.

---

### Fixing ESLint Issues

```bash
# See all issues
npm run lint

# Auto-fix what can be fixed
npm run lint:fix

# Review remaining issues manually
# Refactor code to fix cognitive-complexity, etc.

# Commit again
git commit -m "refactor: reduce function complexity"
```

---

## 🎯 Common Issues & Fixes

### 1. Cognitive Complexity Too High

**Error:**
```
error  This function has a complexity of 25  sonarjs/cognitive-complexity
```

**Fixes:**
- Extract nested logic into separate functions
- Use early returns to reduce nesting
- Replace nested ifs with guard clauses
- Use strategy pattern for complex conditionals

---

### 2. Duplicate Strings

**Warning:**
```
warning  Define a constant instead of duplicating this literal  sonarjs/no-duplicate-string
```

**Fix:**
```typescript
// Before
if (user.role === "admin") { /* ... */ }
if (type === "admin") { /* ... */ }

// After
const ROLE_ADMIN = "admin";
if (user.role === ROLE_ADMIN) { /* ... */ }
if (type === ROLE_ADMIN) { /* ... */ }
```

---

### 3. Identical Functions

**Error:**
```
error  Functions have identical implementation  sonarjs/no-identical-functions
```

**Fix:**
- Extract common logic to shared utility function
- Use generic function with parameters
- Consider if duplication is acceptable (e.g., separate domains)

---

## 📊 Integration with CI/CD

### GitHub Actions (Optional)

Add ESLint check to CI:

```yaml
# .github/workflows/lint.yml
name: Lint

on: [pull_request]

jobs:
  eslint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
```

---

## 🛠️ Configuration per Workspace

Each workspace (frontend, backend, ai-service) can have different thresholds:

### Backend / AI Service
```javascript
// Higher complexity allowed (business logic)
'sonarjs/cognitive-complexity': ['error', 20]
```

### Frontend
```javascript
// Lower complexity preferred (components should be simple)
'sonarjs/cognitive-complexity': ['error', 15]
```

---

## 🚫 Disabling Rules

### Disable for specific line

```typescript
// eslint-disable-next-line sonarjs/cognitive-complexity
function complexLegacyFunction() {
  // ...
}
```

### Disable for entire file

```typescript
/* eslint-disable sonarjs/cognitive-complexity */
// Legacy file with complex logic
```

**Use sparingly** - prefer fixing the issue over disabling the rule.

---

## 📈 Benefits Achieved

### Code Quality
- ✅ Consistent code style across monorepo
- ✅ Early detection of code smells
- ✅ Reduced cognitive load for reviewers
- ✅ Improved maintainability

### Developer Experience
- ✅ Auto-fix on commit saves time
- ✅ Clear error messages with context
- ✅ IDE integration shows issues live
- ✅ Non-blocking workflow (doesn't disrupt development)

### Codebase Health
- 📉 Reduced complexity over time
- 🔄 Less duplicate code
- 🐛 Fewer potential bugs
- 📚 Better documented patterns (via constants)

---

## 🔧 Troubleshooting

### ESLint Not Running

```bash
# Verify installation
npm list eslint

# Reinstall if needed
npm install --save-dev eslint eslint-plugin-sonarjs

# Test manually
npx eslint scripts/update-version.js
```

---

### Performance Issues

ESLint might be slow on large codebases:

```bash
# Lint only changed files (in pre-commit)
# Use lint-staged to run ESLint only on staged files
```

Update `.husky/pre-commit`:
```bash
npx lint-staged
```

And `package.json`:
```json
{
  "lint-staged": {
    "*.{ts,js}": ["eslint --fix"]
  }
}
```

---

### Config Not Found

If ESLint can't find config:

```bash
# Verify eslint.config.mjs exists in root
ls eslint.config.mjs

# Check it's valid JavaScript
node eslint.config.mjs
```

---

## 📝 Next Steps

### Recommended

1. **Run initial lint and fix**:
   ```bash
   npm run lint:fix
   ```

2. **Review remaining issues**:
   ```bash
   npm run lint
   ```

3. **Gradually fix high-priority issues**:
   - Cognitive complexity > 30
   - Identical functions
   - Major code smells

4. **Update thresholds as codebase improves**:
   - Lower cognitive complexity limit over time
   - Add stricter rules incrementally

---

### Optional Enhancements

1. **Add ESLint to CI/CD** (GitHub Actions)
2. **Configure IDE integration** (VSCode, IntelliJ)
3. **Add more SonarJS rules** as team matures
4. **Set up SonarQube** for comprehensive analysis

---

**Setup Status:** ✅ Complete  
**Integration:** Pre-commit hook + manual scripts  
**Recommendation:** Run `npm run lint:fix` before each PR
