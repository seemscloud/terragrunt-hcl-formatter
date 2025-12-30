#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

case "${1:-}" in
  test|tests|"")
    node tests/tests.js
    ;;
  build)
    npm version patch --no-git-tag-version
    VERSION=$(node -p "require('./package.json').version")
    mkdir -p "$SCRIPT_DIR/build"
    vsce package --out "$SCRIPT_DIR/build/terragrunt-hcl-formatter-${VERSION}.vsix"
    cursor --install-extension "$SCRIPT_DIR/build/terragrunt-hcl-formatter-${VERSION}.vsix" --force
    ;;
  import)
    VERSION=$(node -p "require('./package.json').version")
    FILE="$SCRIPT_DIR/build/terragrunt-hcl-formatter-${VERSION}.vsix"
    mkdir -p "$SCRIPT_DIR/build"
    if [ ! -f "$FILE" ]; then
      vsce package --out "$FILE"
    fi
    cursor --install-extension "$FILE" --force
    ;;
  clean)
    rm -rf "$SCRIPT_DIR/build"
    ;;
  dev)
    rm -rf "$SCRIPT_DIR/build"
    npm version patch --no-git-tag-version
    node tests/tests.js
    VERSION=$(node -p "require('./package.json').version")
    mkdir -p "$SCRIPT_DIR/build"
    FILE="$SCRIPT_DIR/build/terragrunt-hcl-formatter-${VERSION}.vsix"
    vsce package --out "$FILE"
    cursor --install-extension "$FILE" --force
    ;;
  *)
    echo "Usage: $0 [tests|build|import|clean|dev]"
    exit 1
    ;;
esac

