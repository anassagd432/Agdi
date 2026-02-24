#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${AGDI_INSTALL_E2E_IMAGE:-${AGDI_INSTALL_E2E_IMAGE:-agdi-install-e2e:local}}"
INSTALL_URL="${AGDI_INSTALL_URL:-https://agdi.bot/install.sh}"

OPENAI_API_KEY="${OPENAI_API_KEY:-}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
ANTHROPIC_API_TOKEN="${ANTHROPIC_API_TOKEN:-}"
AGDI_E2E_MODELS="${AGDI_E2E_MODELS:-${AGDI_E2E_MODELS:-}}"

echo "==> Build image: $IMAGE_NAME"
docker build \
  -t "$IMAGE_NAME" \
  -f "$ROOT_DIR/scripts/docker/install-sh-e2e/Dockerfile" \
  "$ROOT_DIR/scripts/docker/install-sh-e2e"

echo "==> Run E2E installer test"
docker run --rm \
  -e AGDI_INSTALL_URL="$INSTALL_URL" \
  -e AGDI_INSTALL_TAG="${AGDI_INSTALL_TAG:-latest}" \
  -e AGDI_E2E_MODELS="$AGDI_E2E_MODELS" \
  -e AGDI_INSTALL_E2E_PREVIOUS="${AGDI_INSTALL_E2E_PREVIOUS:-${AGDI_INSTALL_E2E_PREVIOUS:-}}" \
  -e AGDI_INSTALL_E2E_SKIP_PREVIOUS="${AGDI_INSTALL_E2E_SKIP_PREVIOUS:-${AGDI_INSTALL_E2E_SKIP_PREVIOUS:-0}}" \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e ANTHROPIC_API_TOKEN="$ANTHROPIC_API_TOKEN" \
  "$IMAGE_NAME"
