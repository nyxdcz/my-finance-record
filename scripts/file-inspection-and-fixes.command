#!/usr/bin/env bash
# macOS installer for a checked-out My Finance Records repository.
# It only restores missing tracked files and rebuilds ignored npm metadata.

set -euo pipefail

readonly REPOSITORY_URL="https://github.com/nyxdcz/my-finance-record.git"
readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly SCRIPT_REPOSITORY="$(cd "$SCRIPT_DIR/.." && pwd)"

info() { printf '==> %s\n' "$*"; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
usage() {
  cat <<'EOF'
Usage: file-inspection-and-fixes.command [--repo-dir PATH]

Installs or verifies My Finance Records in PATH. If PATH is omitted, the
checked-out repository containing this script is used. When the script was
downloaded on its own, ~/Documents/My_Finance_Records is used instead.
EOF
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  fail "This installer supports macOS only. Run npm run inspect and npm run quality on other systems."
fi

repo_dir=""
while (($#)); do
  case "$1" in
    --repo-dir)
      (($# >= 2)) || fail "--repo-dir requires a path"
      repo_dir="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *) fail "Unknown option: $1" ;;
  esac
done

if [[ -z "$repo_dir" ]]; then
  if [[ -f "$SCRIPT_REPOSITORY/package.json" ]]; then
    repo_dir="$SCRIPT_REPOSITORY"
  else
    repo_dir="$HOME/Documents/My_Finance_Records"
  fi
fi

command -v git >/dev/null 2>&1 || fail "Git is required. Install Xcode Command Line Tools with: xcode-select --install"
command -v node >/dev/null 2>&1 || fail "Node.js 22 or newer is required. Install it from https://nodejs.org/"
command -v npm >/dev/null 2>&1 || fail "npm is required with Node.js 22 or newer."

node_major="$(node -p 'process.versions.node.split(".")[0]')"
[[ "$node_major" =~ ^[0-9]+$ ]] || fail "Could not determine the installed Node.js version."
((node_major >= 22)) || fail "Node.js 22 or newer is required; found $(node --version)."

if [[ ! -e "$repo_dir" ]]; then
  info "Cloning My Finance Records into $repo_dir"
  mkdir -p "$(dirname "$repo_dir")"
  git clone "$REPOSITORY_URL" "$repo_dir"
fi

[[ -d "$repo_dir" ]] || fail "Repository path is not a directory: $repo_dir"
cd "$repo_dir"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Repository path is not a Git working tree: $repo_dir"
[[ -f package.json && -f package-lock.json ]] || fail "package.json and package-lock.json are required in $repo_dir"

# Restoring a deleted tracked file is safe: its contents exactly match HEAD and
# no existing user content is replaced. Modified files are deliberately left alone.
readonly REQUIRED_TRACKED_FILES=(
  index.html offline.html manifest.webmanifest version.json sw.js
  privacy-lock.js security-profiles.js security-profiles.css cloud-sync.js
  account-ledger.js account-ledger.css budget-planning.js budget-planning.css
  reports-insights.js reports-insights.css productivity-tools.js productivity-tools.css
  reminders-alerts.js reminders-alerts.css sync-config.js sync-config.example.js
  vendor/supabase.min.js tests/inspect-project.mjs tests/validate-v13-0-18.mjs
  .github/workflows/quality-pages.yml
)

fixed_files=0
for file in "${REQUIRED_TRACKED_FILES[@]}"; do
  if [[ ! -e "$file" ]]; then
    git cat-file -e "HEAD:$file" 2>/dev/null || fail "Required file is missing and cannot be restored from HEAD: $file"
    git restore --source=HEAD -- "$file"
    info "Restored missing tracked file: $file"
    ((fixed_files += 1))
  fi
done

if [[ "$0" == "$SCRIPT_DIR"/* && -f "$0" && ! -x "$0" ]]; then
  chmod u+x "$0"
  info "Restored execute permission on the installer."
fi

info "Installing locked npm metadata"
npm ci --ignore-scripts --no-audit --no-fund

info "Inspecting files, paths, permissions, dependencies, and configuration"
npm run inspect

info "Running project quality validation"
npm run quality

info "Checking whitespace errors in tracked changes"
git diff --check

if ((fixed_files)); then
  info "SUCCESS: repaired $fixed_files missing tracked file(s) and verified the project."
else
  info "SUCCESS: no safe file repairs were needed; dependencies and project checks are verified."
fi
info "Review any existing work with: git status --short"
