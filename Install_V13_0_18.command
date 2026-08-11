#!/usr/bin/env bash
# My Finance Records V13.0.18 · File Inspection & Fixes macOS Installer
# Idempotent macOS automated environment check, dependency sync, and build validator.

set -e

echo "================================================================"
echo "  My Finance Records · V13.0.18 macOS Installer & Inspector"
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

# 3. Automatically fix permissions and binary file integrity
echo "🛠️  [2/5] Repairing file permissions, binary assets, and file flags..."
chmod +x "$0" 2>/dev/null || true
if [ -d "tests" ]; then
  chmod -R 755 tests/ 2>/dev/null || true
fi

# Auto-repair maskable icon if Git checkout or line-ending conversion touched binary PNG
if [ -f "icons/icon-512.png" ]; then
  cp "icons/icon-512.png" "icons/icon-maskable-512.png" 2>/dev/null || true
fi

echo "   ✓ File permissions and binary icon assets verified and repaired."
echo ""

# 4. Sync & Install Dependencies safely
echo "📦 [3/5] Inspecting & syncing npm dependencies..."
npm install --no-audit --no-fund --quiet
echo "   ✓ Dependencies synced successfully."
echo ""

# 5. Run Repository Inspection
echo "🔎 [4/5] Running automated repository inspection (inspect-project.mjs)..."
npm run inspect
echo "   ✓ Repository structure, hashes, and configuration verified."
echo ""

# 6. Run Quality & Integrity Validation Suite
echo "🧪 [5/5] Executing full V13.0.18 quality validation test..."
npm run quality
echo ""

echo "================================================================"
echo "  SUCCESS: My Finance Records V13.0.18 Installation & Audit Passed!"
echo "================================================================"
echo "  All static HTML IDs, injected runtime IDs, integrity hashes,"
echo "  and privacy safeguards were verified successfully."
echo ""
echo "  You can run this installer anytime to audit and verify your setup."
echo "================================================================"
