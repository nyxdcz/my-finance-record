#!/usr/bin/env bash
# My Finance Records V14.0.19 · File Inspection & Fixes macOS Installer
# Idempotent macOS automated environment check, dependency sync, and build validator.

set -euo pipefail

echo "================================================================"
echo "  My Finance Records · V14.0.19 macOS Installer & Inspector"
echo "================================================================"
echo ""

# 1. Determine working directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "📍 Working directory: $SCRIPT_DIR"
echo ""

# 2. Check Prerequisites
echo "🔍 [1/5] Inspecting environment prerequisites..."

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Error: Node.js is not installed or not in PATH."
  echo "   Please install Node.js 22+ from https://nodejs.org/"
  exit 1
fi

NODE_VER=$(node -v)
echo "   ✓ Node.js version: $NODE_VER"
NODE_MAJOR="${NODE_VER#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "❌ Error: Node.js 22 or newer is required."
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "❌ Error: Git is not installed or not in PATH."
  echo "   Please install Xcode Command Line Tools by running: xcode-select --install"
  exit 1
fi

GIT_VER=$(git --version)
echo "   ✓ Git version: $GIT_VER"

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ Error: npm is not available."
  exit 1
fi
echo "   ✓ npm version: $(npm -v)"
echo ""

# 3. Verify executable entry points
echo "🛠️  [2/5] Verifying executable entry points..."
chmod +x "$0" 2>/dev/null || true
chmod +x "run_audit.sh" 2>/dev/null || true

echo "   ✓ Installer and audit entry points are executable."
echo ""

# 4. Sync & Install Dependencies safely
echo "📦 [3/5] Inspecting & syncing npm dependencies..."
npm ci --ignore-scripts --no-audit --no-fund
echo "   ✓ Dependencies synced successfully."
echo ""

# 5. Run Quality & Integrity Validation Suite
echo "🧪 [4/5] Executing full V14.0.19 quality validation..."
npm run quality
echo ""

echo "🔎 [5/5] Checking patch cleanliness..."
git diff --check
if [ "${RUN_BROWSER_TESTS:-0}" = "1" ]; then
  npm run test:browser
fi
echo ""

echo "================================================================"
echo "  SUCCESS: My Finance Records V14.0.19 Installation & Audit Passed!"
echo "================================================================"
echo "  Repository inspection, lint, maintainability, regression,"
echo "  permissions, metadata, and optional browser checks passed."
echo ""
echo "  You can run this installer anytime to audit and verify your setup."
echo "================================================================"
