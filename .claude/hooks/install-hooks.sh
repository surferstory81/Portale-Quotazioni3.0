#!/usr/bin/env bash
#
# Hook Installation Script
#
# Installa git hooks nel repository per enforcement automatico di:
# - Architecture validation (pre-commit)
# - Service coupling check (pre-push)
# - Code quality check (pre-commit)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_HOOKS_DIR="$(git rev-parse --git-dir)/hooks"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   INSTALLING GIT HOOKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create hooks directory if it doesn't exist
mkdir -p "$GIT_HOOKS_DIR"

# Make hooks executable
chmod +x "$SCRIPT_DIR/validate-architecture.js"
chmod +x "$SCRIPT_DIR/check-service-coupling.js"
chmod +x "$SCRIPT_DIR/code-quality-check.js"

# Install pre-commit hook
cat > "$GIT_HOOKS_DIR/pre-commit" << 'EOF'
#!/usr/bin/env bash
# Pre-commit hook: Architecture + Code Quality validation

HOOKS_DIR="$(git rev-parse --show-toplevel)/.claude/hooks"

echo ""
echo "Running pre-commit hooks..."

# Architecture validation
node "$HOOKS_DIR/validate-architecture.js"
ARCH_EXIT=$?

if [ $ARCH_EXIT -ne 0 ]; then
  exit $ARCH_EXIT
fi

# Code quality check
node "$HOOKS_DIR/code-quality-check.js"
QUALITY_EXIT=$?

if [ $QUALITY_EXIT -ne 0 ]; then
  exit $QUALITY_EXIT
fi

exit 0
EOF

chmod +x "$GIT_HOOKS_DIR/pre-commit"
echo "✅ Installed pre-commit hook (architecture + code quality)"

# Install pre-push hook
cat > "$GIT_HOOKS_DIR/pre-push" << 'EOF'
#!/usr/bin/env bash
# Pre-push hook: Service coupling analysis

HOOKS_DIR="$(git rev-parse --show-toplevel)/.claude/hooks"

echo ""
echo "Running pre-push hooks..."

node "$HOOKS_DIR/check-service-coupling.js"
COUPLING_EXIT=$?

# This hook warns but doesn't block
exit 0
EOF

chmod +x "$GIT_HOOKS_DIR/pre-push"
echo "✅ Installed pre-push hook (service coupling check)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   INSTALLATION COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Git hooks installed in: $GIT_HOOKS_DIR"
echo ""
echo "📋 Active hooks:"
echo "  - pre-commit: Architecture validation + Code quality"
echo "  - pre-push:   Service coupling analysis (warning only)"
echo ""
echo "To bypass hooks (NOT RECOMMENDED):"
echo "  git commit --no-verify"
echo "  git push --no-verify"
echo ""
echo "To uninstall:"
echo "  rm $GIT_HOOKS_DIR/pre-commit"
echo "  rm $GIT_HOOKS_DIR/pre-push"
echo ""
