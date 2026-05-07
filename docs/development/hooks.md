# Git Hooks - User Guide

Git hooks automatically enforce code quality and architectural principles before commits and pushes.

---

## 🚀 Quick Start

### Installation

```bash
cd .claude/hooks
bash install-hooks.sh
```

This installs hooks in `.git/hooks/` that Git executes automatically:
- **pre-commit**: Architecture validation + Code quality (blocks commit on errors)
- **pre-push**: Service coupling analysis (warns only, doesn't block)

### Verification

```bash
ls -la .git/hooks/pre-commit .git/hooks/pre-push
# Both files should exist and be executable
```

---

## 🛡️ What Gets Checked

### Pre-Commit Hook (BLOCKING ⛔)

Runs before every commit. **Blocks commit** if critical errors are found.

| Check                                          | Why It Matters                            | Severity   |
|------------------------------------------------|-------------------------------------------|------------|
| **HTTP calls without timeout**                 | Can hang indefinitely on network issues   | 🔴 ERROR   |
| **Hardcoded secrets**                          | Credentials leak if repo is compromised   | 🔴 ERROR   |
| **@Public() without auth**                     | Security breach - endpoint open to anyone | 🔴 ERROR   |
| **Multiple DB operations without transaction** | Data inconsistency on partial failures    | 🔴 ERROR   |
| **SQL injection vulnerability**                | Allows database attacks                   | 🔴 ERROR   |
| **Logging sensitive data**                     | PII/credentials exposed in logs           | 🔴 ERROR   |
| External calls without retry                   | Increases failure rate                    | 🟡 WARNING |
| Side-effects without idempotency               | Retry causes duplicates                   | 🟡 WARNING |
| Functions >50 lines                            | Hard to understand/test                   | 🟡 WARNING |
| Magic numbers                                  | Maintenance issues                        | 🟡 WARNING |
| `console.log()` instead of Logger              | Unstructured logs                         | 🟡 WARNING |

**Example Output:**

```
Running pre-commit hooks...

❌ [backend/src/services/api.service.ts:45] HTTP Timeout Required
   HTTP call without explicit timeout - risk of infinite hang
   💡 Add { timeout: 60000 } to HTTP call options

⚠️  [backend/src/services/user.service.ts:89] Retry Logic for External Calls
   External HTTP call without retry logic
   💡 Implement retry with exponential backoff

✅ Code quality checks passed

❌ COMMIT BLOCKED - Fix errors above
```

### Pre-Push Hook (WARNING ONLY ⚠️)

Runs before every push. **Does not block** - shows warnings only.

| Check | What It Looks For |
|-------|-------------------|
| **Circular dependencies** | Service A → Service B → Service A |
| **Shared database access** | Multiple services writing same table |
| **High fanout** | One service calling >3 other services |
| **Tight coupling patterns** | Direct entity imports between services |

**Example Output:**

```
Running pre-push hooks...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SERVICE COUPLING ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ No circular dependencies detected
⚠️  High coupling detected:
    - backend → ai-service (HTTP calls)
    - backend → database (direct access)
    - ai-service → backend (HTTP calls)

⚠️  Issues detected - review recommended before push
These do NOT block push but indicate architectural debt.
Refer to docs/architecture/microservices.md for mitigation strategies.
```

---

## 🔧 Common Workflows

### Normal Commit (No Issues)

```bash
git add .
git commit -m "feat: add new feature"
# ✅ Hooks pass
# ✅ Commit created
```

### Commit with Errors

```bash
git add .
git commit -m "fix: update API"
# ❌ Hooks fail with errors
# ❌ Commit blocked
# → Fix errors
# → Try again
```

### Bypass Hooks (Emergency Only)

```bash
git commit --no-verify -m "hotfix: critical bug"
git push --no-verify
```

⚠️ **Use sparingly!** Bypassing hooks should only be done for:
- Production hotfixes that need immediate deployment
- Fixing hook bugs themselves
- Emergency situations approved by tech lead

**Always create a follow-up ticket to fix violations properly.**

---

## 🐛 Troubleshooting

### Hook Not Running

**Problem**: Hook doesn't execute on commit/push.

**Solutions**:
1. Verify installation:
   ```bash
   ls -la .git/hooks/pre-commit .git/hooks/pre-push
   ```
2. Check file permissions (should be executable):
   ```bash
   chmod +x .git/hooks/pre-commit
   chmod +x .git/hooks/pre-push
   ```
3. Reinstall hooks:
   ```bash
   cd .claude/hooks && bash install-hooks.sh
   ```

### Hook Fails with "node: command not found"

**Problem**: Node.js not in PATH.

**Solution**: Install Node.js 20+ or add to PATH:
```bash
# Check Node version
node --version  # Should be v20+

# If not installed, download from https://nodejs.org
```

### False Positive Error

**Problem**: Hook reports error but code is correct.

**Solutions**:
1. Check if pattern is genuinely problematic (usually it is)
2. Add inline comment to explain why it's safe:
   ```typescript
   // SAFETY: Timeout not needed here because local service call
   const result = await axios.get('http://localhost:3001/health');
   ```
3. If hook is wrong, report bug and bypass temporarily:
   ```bash
   git commit --no-verify
   # Then file issue: "Hook false positive for X pattern"
   ```

### Slow Hook Execution

**Problem**: Hook takes >5 seconds.

**Causes**:
- Staging too many files at once
- Running on very large files

**Solutions**:
- Commit smaller batches of files
- Hooks only analyze staged files, not entire repo

---

## 📖 Additional Resources

### For Users
- [Quality Standards](quality.md) - Code quality best practices enforced by hooks
- [Troubleshooting](../README.md#troubleshooting) - General troubleshooting guide

### For Developers (Hook Implementation)
- [`.claude/hooks/README.md`](../../.claude/hooks/README.md) - Technical implementation details
- [`.claude/hooks/HOOK-DESIGN.md`](../../.claude/hooks/HOOK-DESIGN.md) - Design philosophy and rationale

### For Architects
- [Microservices Analysis](../architecture/microservices.md) - Service coupling patterns and mitigation
- [Architecture Overview](../architecture/overview.md) - System design principles

---

## 🤝 Contributing

### Modifying Hook Behavior

If you need to add/modify checks:

1. **Propose change** - Discuss with team (avoid personal preferences)
2. **Update implementation** - Modify `.claude/hooks/*.js` files
3. **Update documentation** - Update both this file and `.claude/hooks/README.md`
4. **Test thoroughly** - Test on multiple scenarios
5. **Announce to team** - Ensure everyone reinstalls hooks

### Adding New Checks

Follow the existing pattern in hook scripts:

```javascript
// In .claude/hooks/validate-architecture.js or code-quality-check.js

function checkNewPattern(line, filePath) {
  const pattern = /your-pattern-here/;
  if (pattern.test(line)) {
    return {
      severity: 'ERROR',  // ERROR (blocks) or WARNING
      message: 'Clear description of what is wrong',
      suggestion: 'Actionable fix: do X instead of Y'
    };
  }
  return null;
}
```

---

## 📝 Summary

**What You Need to Know:**

1. ✅ Hooks run automatically on commit/push
2. ⛔ Pre-commit blocks on errors, warns on issues
3. ⚠️ Pre-push only warns, never blocks
4. 🚫 Use `--no-verify` only for emergencies
5. 📖 Read error messages - they contain fix suggestions
6. 🐛 Report false positives, don't just bypass
7. 🔄 Reinstall hooks after pulling updates

**Benefits:**

- 🛡️ Prevents common architectural mistakes
- 🔒 Enforces security best practices
- 📊 Maintains code quality standards
- 🚀 Catches issues before code review
- 📚 Educates team on best practices
